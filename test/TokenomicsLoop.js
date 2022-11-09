/*global describe, context, beforeEach, it*/
const { ethers } = require("hardhat");
const { expect } = require("chai");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

describe("Tokenomics integration", async () => {
    const decimals = "0".repeat(18);
    const LARGE_APPROVAL = "1" + "0".repeat(6) + decimals;
    // Initial mint for olas and DAI (40,000)
    const initialMint = "1" + "0".repeat(5) + decimals;
    // Supply amount for the bonding product
    const supplyProductOLAS =  "2" + "0".repeat(3) + decimals;

    let erc20Token;
    let olaFactory;
    let depositoryFactory;
    let tokenomicsFactory;
    let genericBondCalculator;
    let veFactory;
    let dispenserFactory;
    let componentRegistry;
    let agentRegistry;
    let serviceRegistry;
    let gnosisSafeMultisig;

    let dai;
    let olas;
    let pairODAI;
    let depository;
    let treasury;
    let treasuryFactory;
    let tokenomics;
    let ve;
    let dispenser;
    let router;
    let epochLen = 10;
    let vesting = 60 * 60 * 24;

    const componentHash = "0x" + "9".repeat(64);
    const componentHash1 = "0x" + "1".repeat(64);
    const componentHash2 = "0x" + "2".repeat(64);
    const componentHash3 = "0x" + "2".repeat(62) + "11";
    const agentHash = "0x" + "3".repeat(64);
    const agentHash1 = "0x" + "4".repeat(64);
    const agentHash2 = "0x" + "5".repeat(64);
    const configHash = "0x" + "6".repeat(64);
    const configHash1 = "0x" + "7".repeat(64);
    const configHash2 = "0x" + "8".repeat(64);
    const AddressZero = "0x" + "0".repeat(40);
    const regBond = 1000;
    const regDeposit = 1000;
    const maxThreshold = 1;
    const hundredETHBalance = ethers.utils.parseEther("100");
    const twoHundredETHBalance = ethers.utils.parseEther("200");
    const threeHundredETHBalance = ethers.utils.parseEther("300");
    const regServiceRevenue = hundredETHBalance;
    const doubleRegServiceRevenue = twoHundredETHBalance;
    const tripleRegServiceRevenue = threeHundredETHBalance;
    const agentId = 1;
    const agentParams = [1, regBond];
    const serviceId = 1;
    const payload = "0x";
    const E18 = 10**18;
    const delta = 10**9;
    const gasDelta = 1.0 / 10**6;
    const oneWeek = 7 * 86400;

    let signers;
    let deployer;

    /**
     * Everything in this block is only run once before all tests.
     * This is the home for setup methods
     */
    beforeEach(async () => {
        signers = await ethers.getSigners();
        olaFactory = await ethers.getContractFactory("OLAS");
        // It does not matter what is the second ERC20 token, let's make it based on OLAS sa well
        erc20Token = await ethers.getContractFactory("OLAS");
        depositoryFactory = await ethers.getContractFactory("Depository");
        treasuryFactory = await ethers.getContractFactory("Treasury");
        tokenomicsFactory = await ethers.getContractFactory("Tokenomics");
        dispenserFactory = await ethers.getContractFactory("Dispenser");
        veFactory = await ethers.getContractFactory("veOLAS");

        const ComponentRegistry = await ethers.getContractFactory("ComponentRegistry");
        componentRegistry = await ComponentRegistry.deploy("agent components", "MECHCOMP",
            "https://localhost/component/");
        await componentRegistry.deployed();

        const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
        agentRegistry = await AgentRegistry.deploy("agent", "MECH", "https://localhost/agent/",
            componentRegistry.address);
        await agentRegistry.deployed();

        const ServiceRegistry = await ethers.getContractFactory("ServiceRegistry");
        serviceRegistry = await ServiceRegistry.deploy("service registry", "SERVICE", "https://localhost/service/",
            agentRegistry.address);
        await serviceRegistry.deployed();

        const GnosisSafe = await ethers.getContractFactory("GnosisSafe");
        const gnosisSafe = await GnosisSafe.deploy();
        await gnosisSafe.deployed();

        const GnosisSafeProxyFactory = await ethers.getContractFactory("GnosisSafeProxyFactory");
        const gnosisSafeProxyFactory = await GnosisSafeProxyFactory.deploy();
        await gnosisSafeProxyFactory.deployed();

        const GnosisSafeMultisig = await ethers.getContractFactory("GnosisSafeMultisig");
        gnosisSafeMultisig = await GnosisSafeMultisig.deploy(gnosisSafe.address, gnosisSafeProxyFactory.address);
        await gnosisSafeMultisig.deployed();

        deployer = signers[0];
        dai = await erc20Token.deploy();
        olas = await olaFactory.deploy();
        ve = await veFactory.deploy(olas.address, "Voting Escrow OLAS", "veOLAS");
        // Correct treasury address is missing here, it will be defined just one line below
        tokenomics = await tokenomicsFactory.deploy(olas.address, deployer.address, deployer.address, deployer.address,
            ve.address, epochLen, componentRegistry.address, agentRegistry.address, serviceRegistry.address);
        // Correct depository address is missing here, it will be defined just one line below
        treasury = await treasuryFactory.deploy(olas.address, deployer.address, tokenomics.address, deployer.address);
        // Deploy generic bond calculator contract
        const GenericBondCalculator = await ethers.getContractFactory("GenericBondCalculator");
        genericBondCalculator = await GenericBondCalculator.deploy(olas.address, tokenomics.address);
        await genericBondCalculator.deployed();
        // Deploy depository contract
        depository = await depositoryFactory.deploy(olas.address, treasury.address, tokenomics.address,
            genericBondCalculator.address);
        // Deploy dispenser contract
        dispenser = await dispenserFactory.deploy(olas.address, tokenomics.address);
        // Change to the correct addresses
        await tokenomics.changeManagers(AddressZero, treasury.address, depository.address, dispenser.address);
        await treasury.changeManagers(AddressZero, AddressZero, depository.address, dispenser.address);

        // Airdrop from the deployer :)
        await dai.mint(deployer.address, initialMint);
        await olas.mint(deployer.address, initialMint);
        // Change minter to the treasury address
        await olas.changeMinter(treasury.address);

        // WETH contract deployment
        const WETH = await ethers.getContractFactory("WETH9");
        const weth = await WETH.deploy();

        // Deploy Uniswap factory
        const Factory = await ethers.getContractFactory("UniswapV2Factory");
        const factory = await Factory.deploy(deployer.address);
        await factory.deployed();
        //console.log("Uniswap factory deployed to:", factory.address);

        // Deploy Router02
        const Router = await ethers.getContractFactory("UniswapV2Router02");
        router = await Router.deploy(factory.address, weth.address);
        await router.deployed();

        // Create OLAS-DAI pair
        await factory.createPair(olas.address, dai.address);
        const pairAddress = await factory.allPairs(0);
        pairODAI = await ethers.getContractAt("UniswapV2Pair", pairAddress);
    });

    context("Tokenomics numbers", async function () {
        it("Calculate tokenomics factors. One service is deployed", async () => {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            const operator = signers[6].address;
            const agentInstance = signers[7].address;

            // Create component and one agent
            await componentRegistry.changeManager(mechManager.address);
            await componentRegistry.connect(mechManager).create(owner, componentHash3, []);
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, agentHash, [1]);

            // Create one service
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).create(owner, configHash, [agentId],
                [agentParams], maxThreshold);

            // Register agent instances
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, {value: regDeposit});
            await serviceRegistry.connect(serviceManager).registerAgents(operator, serviceId, [agentInstance], [agentId], {value: regBond});

            // Deploy the service
            await serviceRegistry.changeMultisigPermission(gnosisSafeMultisig.address, true);
            await serviceRegistry.connect(serviceManager).deploy(owner, serviceId, gnosisSafeMultisig.address, payload);

            // Send deposits from a service
            await treasury.depositETHFromServices([1], [regServiceRevenue], {value: regServiceRevenue});

            // Calculate current epoch parameters
            await tokenomics.checkpoint();
        });

        it("Calculate tokenomics factors. Two services with one agent for each, 3 agents in total", async () => {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            const operator = signers[6].address;
            const agentInstances = [signers[7].address, signers[8].address];

            // Create one component and three agents
            await componentRegistry.changeManager(mechManager.address);
            await componentRegistry.connect(mechManager).create(owner, componentHash3, []);
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, agentHash, [1]);
            await agentRegistry.connect(mechManager).create(owner, agentHash1, [1]);
            await agentRegistry.connect(mechManager).create(owner, agentHash2, [1]);

            // Create services
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).create(owner, configHash, [agentId],
                [agentParams], maxThreshold);
            await serviceRegistry.connect(serviceManager).create(owner, configHash1, [2],
                [agentParams], maxThreshold);

            // Register agent instances
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, {value: regDeposit});
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, 2, {value: regDeposit});
            await serviceRegistry.connect(serviceManager).registerAgents(operator, serviceId, [agentInstances[0]], [agentId], {value: regBond});
            await serviceRegistry.connect(serviceManager).registerAgents(operator, 2, [agentInstances[1]], [2], {value: regBond});

            // Deploy services
            await serviceRegistry.changeMultisigPermission(gnosisSafeMultisig.address, true);
            await serviceRegistry.connect(serviceManager).deploy(owner, serviceId, gnosisSafeMultisig.address, payload);
            await serviceRegistry.connect(serviceManager).deploy(owner, 2, gnosisSafeMultisig.address, payload);

            // Fail if the sent amount and the sum of specified amount for each service do not match
            await expect(
                treasury.depositETHFromServices([1, 2], [regServiceRevenue, regServiceRevenue], {value: regServiceRevenue})
            ).to.be.revertedWithCustomError(treasury, "WrongAmount");
            // Fail if the service Ids / amounts array differ in length
            await expect(
                treasury.depositETHFromServices([1, 2], [regServiceRevenue], {value: regServiceRevenue})
            ).to.be.revertedWithCustomError(treasury, "WrongArrayLength");

            // Send deposits from services
            await treasury.depositETHFromServices([1, 2], [regServiceRevenue, regServiceRevenue], {value: doubleRegServiceRevenue});

            // Calculate current epoch parameters
            await tokenomics.checkpoint();
        });

        it("Calculate tokenomics factors. Two services with different set of agents are deployed", async () => {
            const mechManager = signers[1];
            const serviceManager = signers[2];
            const owner = signers[3].address;
            const operator = signers[4].address;
            const agentInstances = [signers[5].address, signers[6].address, signers[7].address, signers[8].address];

            // Create one component and three agents
            await componentRegistry.changeManager(mechManager.address);
            await componentRegistry.connect(mechManager).create(owner, componentHash3, []);
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, agentHash, [1]);
            await agentRegistry.connect(mechManager).create(owner, agentHash1, [1]);
            await agentRegistry.connect(mechManager).create(owner, agentHash2, [1]);

            // Create services
            const agentIds = [[1, 2], [2, 3]];
            const agentParams = [[1, regBond], [1, regBond]];
            const threshold = 2;
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).create(owner, configHash, agentIds[0],
                agentParams, threshold);
            await serviceRegistry.connect(serviceManager).create(owner, configHash1, agentIds[1],
                agentParams, threshold);

            // Register agent instances
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, {value: regDeposit});
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, 2, {value: regDeposit});
            await serviceRegistry.connect(serviceManager).registerAgents(operator, serviceId, [agentInstances[0], agentInstances[1]],
                agentIds[0], {value: 2 * regBond});
            await serviceRegistry.connect(serviceManager).registerAgents(operator, 2, [agentInstances[2], agentInstances[3]],
                agentIds[1], {value: 2 * regBond});

            // Deploy services
            await serviceRegistry.changeMultisigPermission(gnosisSafeMultisig.address, true);
            await serviceRegistry.connect(serviceManager).deploy(owner, serviceId, gnosisSafeMultisig.address, payload);
            await serviceRegistry.connect(serviceManager).deploy(owner, 2, gnosisSafeMultisig.address, payload);

            // Send deposits services
            await treasury.depositETHFromServices([1, 2], [regServiceRevenue, regServiceRevenue], {value: doubleRegServiceRevenue});

            // Calculate current epoch parameters
            await tokenomics.checkpoint();
        });

        it("Tokenomics factors. Two services with two agents and two components, one service is not profitable", async () => {
            const mechManager = signers[1];
            const serviceManager = signers[2];
            const owner = signers[3].address;
            const operator = signers[4].address;
            const agentInstances = [signers[5].address, signers[6].address, signers[7].address, signers[8].address];

            // Create 2 components and 2 agents based on them
            await componentRegistry.changeManager(mechManager.address);
            await componentRegistry.connect(mechManager).create(owner, componentHash, []);
            await componentRegistry.connect(mechManager).create(owner, componentHash1, []);
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, agentHash, [1, 2]);
            await agentRegistry.connect(mechManager).create(owner, agentHash1, [1, 2]);

            // Create 3 services
            const agentIds = [[1, 2], [1, 2]];
            const agentParams = [[1, regBond], [1, regBond]];
            const threshold = 2;
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).create(owner, configHash, agentIds[0],
                agentParams, threshold);
            await serviceRegistry.connect(serviceManager).create(owner, configHash1, agentIds[1],
                agentParams, threshold);
            await serviceRegistry.connect(serviceManager).create(owner, configHash2, agentIds[1],
                agentParams, threshold);

            // Register agent instances
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, {value: regDeposit});
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, 2, {value: regDeposit});
            await serviceRegistry.connect(serviceManager).registerAgents(operator, serviceId, [agentInstances[0], agentInstances[1]],
                agentIds[0], {value: 2 * regBond});
            await serviceRegistry.connect(serviceManager).registerAgents(operator, 2, [agentInstances[2], agentInstances[3]],
                agentIds[1], {value: 2 * regBond});

            // Deploy services
            await serviceRegistry.changeMultisigPermission(gnosisSafeMultisig.address, true);
            await serviceRegistry.connect(serviceManager).deploy(owner, serviceId, gnosisSafeMultisig.address, payload);
            await serviceRegistry.connect(serviceManager).deploy(owner, 2, gnosisSafeMultisig.address, payload);

            // Send deposits services
            await treasury.depositETHFromServices([1, 2], [regServiceRevenue, regServiceRevenue], {value: doubleRegServiceRevenue});

            // Calculate current epoch parameters
            await tokenomics.checkpoint();
        });

        it("Tokenomics factors. Two services with three agents and four components", async () => {
            const mechManager = signers[1];
            const serviceManager = signers[2];
            const owner = signers[3].address;
            const operator = signers[4].address;
            const agentInstances = [signers[5].address, signers[6].address, signers[7].address, signers[8].address,
                signers[9].address];

            // Create 4 components and 3 agents based on them
            await componentRegistry.changeManager(mechManager.address);
            await componentRegistry.connect(mechManager).create(owner, componentHash, []);
            await componentRegistry.connect(mechManager).create(owner, componentHash1, []);
            await componentRegistry.connect(mechManager).create(owner, componentHash2, []);
            await componentRegistry.connect(mechManager).create(owner, configHash2, []);
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, agentHash, [1, 2]);
            await agentRegistry.connect(mechManager).create(owner, agentHash1, [2, 3]);
            await agentRegistry.connect(mechManager).create(owner, agentHash2, [3, 4]);

            // Create 2 services
            const agentIds = [[1, 2, 3], [1, 3]];
            const agentParams1 = [[1, regBond], [1, regBond], [1, regBond]];
            const agentParams2 = [[1, regBond], [1, regBond]];
            const threshold1 = 3;
            const threshold2 = 2;
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).create(owner, configHash, agentIds[0],
                agentParams1, threshold1);
            await serviceRegistry.connect(serviceManager).create(owner, configHash1, agentIds[1],
                agentParams2, threshold2);

            // Register agent instances
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, {value: regDeposit});
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, 2, {value: regDeposit});
            await serviceRegistry.connect(serviceManager).registerAgents(operator, serviceId,
                [agentInstances[0], agentInstances[1], agentInstances[2]], agentIds[0], {value: 3 * regBond});
            await serviceRegistry.connect(serviceManager).registerAgents(operator, 2, [agentInstances[3], agentInstances[4]],
                agentIds[1], {value: 2 * regBond});

            // Deploy services
            await serviceRegistry.changeMultisigPermission(gnosisSafeMultisig.address, true);
            await serviceRegistry.connect(serviceManager).deploy(owner, serviceId, gnosisSafeMultisig.address, payload);
            await serviceRegistry.connect(serviceManager).deploy(owner, 2, gnosisSafeMultisig.address, payload);

            // Send deposits services
            await treasury.depositETHFromServices([1, 2], [doubleRegServiceRevenue, regServiceRevenue],
                {value: tripleRegServiceRevenue});

            // Calculate current epoch parameters
            await tokenomics.checkpoint();
        });

        it("Tokenomics factors. Two services with three agents and four components, one component is not utilized", async () => {
            const mechManager = signers[1];
            const serviceManager = signers[2];
            const owner = signers[3].address;
            const operator = signers[4].address;
            const agentInstances = [signers[5].address, signers[6].address, signers[7].address, signers[8].address,
                signers[9].address];

            // Create 4 components and 3 agents based on them
            await componentRegistry.changeManager(mechManager.address);
            await componentRegistry.connect(mechManager).create(owner, componentHash, []);
            await componentRegistry.connect(mechManager).create(owner, componentHash1, []);
            await componentRegistry.connect(mechManager).create(owner, componentHash2, []);
            await componentRegistry.connect(mechManager).create(owner, configHash2, []);
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, agentHash, [1, 2]);
            await agentRegistry.connect(mechManager).create(owner, agentHash1, [2]);
            await agentRegistry.connect(mechManager).create(owner, agentHash2, [3]);

            // Create 2 services
            const agentIds = [[1, 2], [1, 3]];
            const agentParams = [[1, regBond], [1, regBond]];
            const threshold = 2;
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).create(owner, configHash, agentIds[0],
                agentParams, threshold);
            await serviceRegistry.connect(serviceManager).create(owner, configHash1, agentIds[1],
                agentParams, threshold);

            // Register agent instances
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, {value: regDeposit});
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, 2, {value: regDeposit});
            await serviceRegistry.connect(serviceManager).registerAgents(operator, serviceId,
                [agentInstances[0], agentInstances[1]], agentIds[0], {value: 2 * regBond});
            await serviceRegistry.connect(serviceManager).registerAgents(operator, 2, [agentInstances[2], agentInstances[3]],
                agentIds[1], {value: 2 * regBond});

            // Deploy services
            await serviceRegistry.changeMultisigPermission(gnosisSafeMultisig.address, true);
            await serviceRegistry.connect(serviceManager).deploy(owner, serviceId, gnosisSafeMultisig.address, payload);
            await serviceRegistry.connect(serviceManager).deploy(owner, 2, gnosisSafeMultisig.address, payload);

            // Send deposits services
            await treasury.depositETHFromServices([1, 2], [regServiceRevenue, doubleRegServiceRevenue],
                {value: tripleRegServiceRevenue});

            // Calculate current epoch parameters
            await tokenomics.checkpoint();
        });
    });


    context("Dispenser", async function () {
        it("Dispenser for an agent owner", async () => {
            // Take a snapshot of the current state of the blockchain
            const snapshot = await helpers.takeSnapshot();

            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5];
            const ownerAddress = owner.address;
            const operator = signers[6].address;
            const agentInstance = signers[7].address;

            // Create one component and one agent
            await componentRegistry.changeManager(mechManager.address);
            await componentRegistry.connect(mechManager).create(ownerAddress, componentHash, []);
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(ownerAddress, agentHash, [1]);

            // Create one service
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).create(ownerAddress, configHash, [agentId],
                [agentParams], maxThreshold);

            // Register agent instances
            await serviceRegistry.connect(serviceManager).activateRegistration(ownerAddress, serviceId, {value: regDeposit});
            await serviceRegistry.connect(serviceManager).registerAgents(operator, serviceId, [agentInstance], [agentId], {value: regBond});

            // Deploy the service
            await serviceRegistry.changeMultisigPermission(gnosisSafeMultisig.address, true);
            await serviceRegistry.connect(serviceManager).deploy(ownerAddress, serviceId, gnosisSafeMultisig.address, payload);

            // In order to get OLAS top-ups, the service owner needs to lock enough veOLAS
            const minWeightedBalance = await tokenomics.veOLASThreshold();
            const balanceOLAS = minWeightedBalance.toString() + "1";
            // Transfer the needed amount of OLAS to the component / agent / service owner
            await olas.transfer(ownerAddress, balanceOLAS);
            await olas.connect(owner).approve(ve.address, balanceOLAS);
            // Set the lock duration to 4 years such that the amount of OLAS is almost the amount of veOLAS
            // veOLAS = OLAS * time_locked / MAXTIME (where MAXTIME is 4 years)
            const lockDuration = 126144000;
            await ve.connect(owner).createLock(balanceOLAS, lockDuration);

            // Increase the time to more than the length of the epoch
            await helpers.time.increase(epochLen + 3);
            // Send donations to service(s)
            await treasury.depositETHFromServices([1], [regServiceRevenue], {value: regServiceRevenue});
            // Record tokenomics results of this epoch and start the new one
            await tokenomics.checkpoint();

            // Get owner rewards
            const balanceETHBeforeReward = await ethers.provider.getBalance(ownerAddress);
            const balanceBeforeTopUps = BigInt(await olas.balanceOf(ownerAddress));
            // Claiming rewards for one component and one agent
            const tx = await dispenser.connect(owner).claimOwnerRewards([0, 1], [1, 1]);
            // Calculate gas cost
            const receipt = await tx.wait();
            const gasCost = Number(receipt.gasUsed) * Number(tx.gasPrice);
            const balanceAfterTopUps = BigInt(await olas.balanceOf(ownerAddress));
            const balanceETHAfterReward = await ethers.provider.getBalance(ownerAddress);
            //console.log("balanceETHBeforeReward", balanceETHBeforeReward);
            //console.log("gas used", receipt.gasUsed);
            //console.log("gas price", tx.gasPrice);
            //console.log("gas cost", gasCost);
            //console.log("balanceETHAfterReward", balanceETHAfterReward);

            // Get the last settled epoch counter
            let lastPoint = Number(await tokenomics.epochCounter()) - 1;
            // Get the epoch point of the last epoch
            let ep = await tokenomics.getEpochPoint(lastPoint);
            // Get the unit points of the last epoch
            let up = [await tokenomics.getUnitPoint(lastPoint, 0), await tokenomics.getUnitPoint(lastPoint, 1)];
            // Calculate rewards based on the points information
            let rewards = [
                (Number(ep.totalDonationsETH) * Number(ep.rewardStakerFraction)) / 100,
                (Number(ep.totalDonationsETH) * Number(up[0].rewardUnitFraction)) / 100,
                (Number(ep.totalDonationsETH) * Number(up[1].rewardUnitFraction)) / 100
            ];
            let accountRewards = rewards[0] + rewards[1] + rewards[2];
            // Calculate top-ups based on the points information
            let topUps = [
                (Number(ep.totalTopUpsOLAS) * Number(ep.maxBondFraction)) / 100,
                (Number(ep.totalTopUpsOLAS) * Number(up[0].topUpUnitFraction)) / 100,
                (Number(ep.totalTopUpsOLAS) * Number(up[1].topUpUnitFraction)) / 100,
                Number(ep.totalTopUpsOLAS)
            ];
            topUps[3] -= topUps[0] + topUps[1] + topUps[2];
            let accountTopUps = topUps[1] + topUps[2] + topUps[3];
            expect(accountRewards).to.greaterThan(0);
            expect(accountTopUps).to.greaterThan(0);

            // Get the overall incentive amounts for owners
            const expectedRewards = rewards[1] + rewards[2];
            const expectedTopUps = topUps[1] + topUps[2];

            // Check the received reward
            // Rewards without gas
            const rewardsNoGas = Number(balanceETHAfterReward) - Number(balanceETHBeforeReward);
            // Rewards with the gas spent for the tx
            const rewardsWithGas = rewardsNoGas + gasCost;
            // Get the absolute difference between expected and received rewards in ETH
            const rewardsDiffETH = Math.abs((expectedRewards - rewardsWithGas) / E18);
            expect(rewardsDiffETH).to.lessThan(gasDelta);
            // The balance after reward minus the balance before minus the gas must be less than expected reward
            expect(rewardsNoGas).to.lessThan(expectedRewards);

            // Check owner OLAS top-ups
            const balanceDiff = Number(balanceAfterTopUps - balanceBeforeTopUps);
            expect(Math.abs(expectedTopUps - balanceDiff)).to.lessThan(delta);

            // Restore to the state of the snapshot
            await snapshot.restore();
        });

        it("Dispenser for several agent owners", async () => {
            // Take a snapshot of the current state of the blockchain
            const snapshot = await helpers.takeSnapshot();

            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owners = [signers[5], signers[6]];
            const operator = signers[7].address;
            const agentInstances = [signers[8].address, signers[9].address, signers[10].address];
            const serviceOwner = signers[11].address;

            // Create one component and agent for one owner, and another agent for another owner
            await componentRegistry.changeManager(mechManager.address);
            await componentRegistry.connect(mechManager).create(owners[0].address, componentHash, []);
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owners[0].address, agentHash, [1]);
            await agentRegistry.connect(mechManager).create(owners[1].address, agentHash1, [1]);

            // Create two services
            const agentIds = [[1, 2], [1]];
            const agentParams1 = [[1, regBond], [1, regBond]];
            const agentParams2 = [[1, regBond]];
            const threshold1 = 2;
            const threshold2 = 1;
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).create(serviceOwner, configHash, agentIds[0],
                agentParams1, threshold1);
            await serviceRegistry.connect(serviceManager).create(serviceOwner, configHash, agentIds[1],
                agentParams2, threshold2);

            // Register agent instances
            await serviceRegistry.connect(serviceManager).activateRegistration(serviceOwner, serviceId, {value: regDeposit});
            await serviceRegistry.connect(serviceManager).activateRegistration(serviceOwner, 2, {value: regDeposit});
            await serviceRegistry.connect(serviceManager).registerAgents(operator, serviceId,
                [agentInstances[0], agentInstances[1]], agentIds[0], {value: 2 * regBond});
            await serviceRegistry.connect(serviceManager).registerAgents(operator, 2, [agentInstances[2]],
                agentIds[1], {value: regBond});

            // Deploy the service
            await serviceRegistry.changeMultisigPermission(gnosisSafeMultisig.address, true);
            await serviceRegistry.connect(serviceManager).deploy(serviceOwner, serviceId, gnosisSafeMultisig.address, payload);
            await serviceRegistry.connect(serviceManager).deploy(serviceOwner, 2, gnosisSafeMultisig.address, payload);

            // In order to get OLAS top-ups for owners of components / agents, service owner needs to lock enough veOLAS
            const minWeightedBalance = await tokenomics.veOLASThreshold();
            const balanceOLASToLock = minWeightedBalance.toString() + "1";
            // Transfer the needed amount of OLAS to the component / agent / service owner
            await olas.transfer(serviceOwner, balanceOLASToLock);
            // signers[11] is the EOA for the service owner address
            await olas.connect(signers[11]).approve(ve.address, balanceOLASToLock);
            // Set the lock duration to 4 years such that the amount of OLAS is almost the amount of veOLAS
            // veOLAS = OLAS * time_locked / MAXTIME (where MAXTIME is 4 years)
            const lockDuration = 126144000;
            await ve.connect(signers[11]).createLock(balanceOLASToLock, lockDuration);

            // Increase the time to more than the length of the epoch
            await helpers.time.increase(epochLen + 3);
            // Send deposits from a service
            await treasury.depositETHFromServices([1, 2], [regServiceRevenue, doubleRegServiceRevenue],
                {value: tripleRegServiceRevenue});
            // Record tokenomics results of this epoch and start the new one
            await tokenomics.checkpoint();

            // Get owners rewards in ETH
            const balanceETHBeforeReward = [await ethers.provider.getBalance(owners[0].address),
                await ethers.provider.getBalance(owners[1].address)];
            // owners[0] has one component and one agent with Ids=[1, 1], owners[1] has one agent with Id=2
            const tx = [await dispenser.connect(owners[0]).claimOwnerRewards([0, 1], [1, 1]),
                await dispenser.connect(owners[1]).claimOwnerRewards([1], [2])];
            // Calculate gas cost
            const receipt = [await tx[0].wait(), await tx[1].wait()];
            const gasCost = [Number(receipt[0].gasUsed) * Number(tx[0].gasPrice),
                Number(receipt[1].gasUsed) * Number(tx[1].gasPrice)];
            // Get OLAS balance: since service owner is not te same as owners[0] or owners[1],
            // owners[0] and owners[1] balances after the top-up will reflect OLAS top-ups in full
            const balanceOLAS = [await olas.balanceOf(owners[0].address), await olas.balanceOf(owners[1].address)];
            // Get ETH balance after rewards
            const balanceETHAfterReward = [await ethers.provider.getBalance(owners[0].address),
                await ethers.provider.getBalance(owners[1].address)];

            // Get the last settled epoch counter
            let lastPoint = Number(await tokenomics.epochCounter()) - 1;
            // Get the epoch point of the last epoch
            let ep = await tokenomics.getEpochPoint(lastPoint);
            // Get the unit points of the last epoch
            let up = [await tokenomics.getUnitPoint(lastPoint, 0), await tokenomics.getUnitPoint(lastPoint, 1)];
            // Calculate rewards based on the points information
            let rewards = [
                (Number(ep.totalDonationsETH) * Number(ep.rewardStakerFraction)) / 100,
                (Number(ep.totalDonationsETH) * Number(up[0].rewardUnitFraction)) / 100,
                (Number(ep.totalDonationsETH) * Number(up[1].rewardUnitFraction)) / 100
            ];
            let accountRewards = rewards[0] + rewards[1] + rewards[2];
            // Calculate top-ups based on the points information
            let topUps = [
                (Number(ep.totalTopUpsOLAS) * Number(ep.maxBondFraction)) / 100,
                (Number(ep.totalTopUpsOLAS) * Number(up[0].topUpUnitFraction)) / 100,
                (Number(ep.totalTopUpsOLAS) * Number(up[1].topUpUnitFraction)) / 100,
                Number(ep.totalTopUpsOLAS)
            ];
            topUps[3] -= topUps[0] + topUps[1] + topUps[2];
            let accountTopUps = topUps[1] + topUps[2] + topUps[3];
            expect(accountRewards).to.greaterThan(0);
            expect(accountTopUps).to.greaterThan(0);

            // Get the overall incentive amounts for owners
            const expectedRewards = rewards[1] + rewards[2];
            const expectedTopUps = topUps[1] + topUps[2];

            // Check the received reward in ETH
            // Rewards without gas
            const rewardsNoGas = [Number(balanceETHAfterReward[0]) - Number(balanceETHBeforeReward[0]),
                Number(balanceETHAfterReward[1]) - Number(balanceETHBeforeReward[1])];
            // Rewards with the gas spent for the tx
            const rewardsWithGas = [rewardsNoGas[0] + gasCost[0], rewardsNoGas[1] + gasCost[1]];
            // Get the absolute difference between expected and received rewards in ETH
            const rewardsDiffETH = Math.abs(expectedRewards - (rewardsWithGas[0] + rewardsWithGas[1])) / E18;
            expect(rewardsDiffETH).to.lessThan(gasDelta);
            // The balance after reward minus the balance before minus the gas must be less than expected reward
            expect(rewardsNoGas[0] + rewardsNoGas[1]).to.lessThan(expectedRewards);

            // Check the top-ups in OLAS
            expect(Math.abs(expectedTopUps - (Number(balanceOLAS[0]) + Number(balanceOLAS[1])))).to.lessThan(delta);

            // Restore to the state of the snapshot
            await snapshot.restore();
        });

        it.only("Dispenser for several agent owners and stakers", async () => {
            // Take a snapshot of the current state of the blockchain
            const snapshot = await helpers.takeSnapshot();

            const staker = signers[2];
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const componentOwners = [signers[15], signers[16]];
            const agentOwners = [signers[17], signers[18]];
            const operator = signers[7].address;
            const agentInstances = [signers[8].address, signers[9].address, signers[10].address];
            const serviceOwner = signers[11].address;

            // Create two components and two agents each for their owner
            await componentRegistry.changeManager(mechManager.address);
            await componentRegistry.connect(mechManager).create(componentOwners[0].address, componentHash, []);
            await componentRegistry.connect(mechManager).create(componentOwners[1].address, componentHash1, []);
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(agentOwners[0].address, agentHash, [1]);
            await agentRegistry.connect(mechManager).create(agentOwners[1].address, agentHash1, [2]);

            // Create two services
            const agentIds = [[1, 2], [1]];
            const agentParams1 = [[1, regBond], [1, regBond]];
            const agentParams2 = [[1, regBond]];
            const threshold1 = 2;
            const threshold2 = 1;
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).create(serviceOwner, configHash, agentIds[0],
                agentParams1, threshold1);
            await serviceRegistry.connect(serviceManager).create(serviceOwner, configHash, agentIds[1],
                agentParams2, threshold2);

            // Register agent instances
            await serviceRegistry.connect(serviceManager).activateRegistration(serviceOwner, serviceId, {value: regDeposit});
            await serviceRegistry.connect(serviceManager).activateRegistration(serviceOwner, 2, {value: regDeposit});
            await serviceRegistry.connect(serviceManager).registerAgents(operator, serviceId,
                [agentInstances[0], agentInstances[1]], agentIds[0], {value: 2 * regBond});
            await serviceRegistry.connect(serviceManager).registerAgents(operator, 2, [agentInstances[2]],
                agentIds[1], {value: regBond});

            // Deploy the service
            await serviceRegistry.changeMultisigPermission(gnosisSafeMultisig.address, true);
            await serviceRegistry.connect(serviceManager).deploy(serviceOwner, serviceId, gnosisSafeMultisig.address, payload);
            await serviceRegistry.connect(serviceManager).deploy(serviceOwner, 2, gnosisSafeMultisig.address, payload);

            // In order to get OLAS top-ups for owners of components / agents, service owner needs to lock enough veOLAS
            const minWeightedBalance = await tokenomics.veOLASThreshold();
            const balanceOLASToLock = minWeightedBalance.toString() + "1";
            // Transfer the needed amount of OLAS to the component / agent / service owner
            await olas.transfer(serviceOwner, balanceOLASToLock);
            // signers[11] is the EOA for the service owner address
            await olas.connect(signers[11]).approve(ve.address, balanceOLASToLock);
            // Set the lock duration to 4 years such that the amount of OLAS is almost the amount of veOLAS
            // veOLAS = OLAS * time_locked / MAXTIME (where MAXTIME is 4 years)
            let lockDuration = 126144000;
            await ve.connect(signers[11]).createLock(balanceOLASToLock, lockDuration);

            // Stake OLAS with 2 stakers: deployer and staker
            await olas.transfer(staker.address, twoHundredETHBalance);
            await olas.approve(ve.address, hundredETHBalance);
            await olas.connect(staker).approve(ve.address, twoHundredETHBalance);
            lockDuration = oneWeek;

            // Balance should be zero before the lock and specified amount after the lock
            expect(await ve.getVotes(deployer.address)).to.equal(0);
            await ve.createLock(hundredETHBalance, lockDuration);
            await ve.connect(staker).createLock(twoHundredETHBalance, lockDuration);
            const balanceDeployer = await ve.balanceOf(deployer.address);
            expect(balanceDeployer).to.equal(hundredETHBalance);
            const balanceStaker = await ve.balanceOf(staker.address);
            expect(balanceStaker).to.equal(twoHundredETHBalance);

            // Calculate the fraction of stakers vs the stakers with the service owner staking
            const userStakersFraction = 1.0 * Number(threeHundredETHBalance) / (Number(threeHundredETHBalance) + Number(balanceOLASToLock));

            // Allocate empty rewards during the first epoch
            await tokenomics.checkpoint();
            // Increase the time to more than one week for which lockers were staking
            await helpers.time.increase(oneWeek + 10000);

            // Send deposits from a service
            await treasury.depositETHFromServices([1, 2], [regServiceRevenue, doubleRegServiceRevenue],
                {value: tripleRegServiceRevenue});
            // Record tokenomics results of this epoch and start the new one
            await tokenomics.checkpoint();

            // Get the last settled epoch counter
            let lastPoint = Number(await tokenomics.epochCounter()) - 1;
            // Get the epoch point of the last epoch
            let ep = await tokenomics.getEpochPoint(lastPoint);
            // Get the unit points of the last epoch
            let up = [await tokenomics.getUnitPoint(lastPoint, 0), await tokenomics.getUnitPoint(lastPoint, 1)];
            // Calculate rewards based on the points information
            let rewards = [
                (Number(ep.totalDonationsETH) * Number(ep.rewardStakerFraction)) / 100,
                (Number(ep.totalDonationsETH) * Number(up[0].rewardUnitFraction)) / 100,
                (Number(ep.totalDonationsETH) * Number(up[1].rewardUnitFraction)) / 100
            ];
            let accountRewards = rewards[0] + rewards[1] + rewards[2];
            // Calculate top-ups based on the points information
            let topUps = [
                (Number(ep.totalTopUpsOLAS) * Number(ep.maxBondFraction)) / 100,
                (Number(ep.totalTopUpsOLAS) * Number(up[0].topUpUnitFraction)) / 100,
                (Number(ep.totalTopUpsOLAS) * Number(up[1].topUpUnitFraction)) / 100,
                Number(ep.totalTopUpsOLAS)
            ];
            topUps[3] -= topUps[0] + topUps[1] + topUps[2];
            let accountTopUps = topUps[1] + topUps[2] + topUps[3];
            expect(accountRewards).to.greaterThan(0);
            expect(accountTopUps).to.greaterThan(0);

            // Get owners rewards in ETH
            let balanceETHBeforeReward = [await ethers.provider.getBalance(componentOwners[0].address),
                await ethers.provider.getBalance(componentOwners[1].address)];
            // Each componentOwners has 1 component
            let tx = [await dispenser.connect(componentOwners[0]).claimOwnerRewards([0], [1]),
                await dispenser.connect(componentOwners[1]).claimOwnerRewards([0], [2])];
            // Calculate gas cost
            let receipt = [await tx[0].wait(), await tx[1].wait()];
            let gasCost = [Number(receipt[0].gasUsed) * Number(tx[0].gasPrice),
                Number(receipt[1].gasUsed) * Number(tx[1].gasPrice)];
            // Get OLAS balance: since service owner is different from unit owners,
            // componentOwners and agentOwners balances after the top-up will reflect OLAS top-ups in full
            let balanceOLAS = [await olas.balanceOf(componentOwners[0].address), await olas.balanceOf(componentOwners[1].address)];
            // Get ETH balance after rewards
            let balanceETHAfterReward = [await ethers.provider.getBalance(componentOwners[0].address),
                await ethers.provider.getBalance(componentOwners[1].address)];

            // Check the received reward in ETH for components
            const expectedComponentRewards = rewards[1];
            const expectedTopUpsComponents = topUps[1];
            // Rewards without gas
            let rewardsNoGas = [Number(balanceETHAfterReward[0]) - Number(balanceETHBeforeReward[0]),
                Number(balanceETHAfterReward[1]) - Number(balanceETHBeforeReward[1])];
            // Rewards with the gas spent for the tx
            let rewardsWithGas = [rewardsNoGas[0] + gasCost[0], rewardsNoGas[1] + gasCost[1]];
            // Get the absolute difference between expected and received rewards in ETH
            let rewardsDiffETH = Math.abs(expectedComponentRewards - (rewardsWithGas[0] + rewardsWithGas[1])) / E18;
            expect(rewardsDiffETH).to.lessThan(gasDelta);
            // The balance after reward minus the balance before minus the gas must be less than expected reward
            expect(rewardsNoGas[0] + rewardsNoGas[1]).to.lessThan(expectedComponentRewards);

            // Calculate component top-up sum in OLAS
            expect(Math.abs(expectedTopUpsComponents - (Number(balanceOLAS[0]) + Number(balanceOLAS[1])))).to.lessThan(delta);

            // Get owners rewards and top-ups for agents
            balanceETHBeforeReward = [await ethers.provider.getBalance(agentOwners[0].address),
                await ethers.provider.getBalance(agentOwners[1].address)];
            tx = [await dispenser.connect(agentOwners[0]).claimOwnerRewards([1], [1]),
                await dispenser.connect(agentOwners[1]).claimOwnerRewards([1], [2])];
            // Calculate gas cost
            receipt = [await tx[0].wait(), await tx[1].wait()];
            gasCost = [Number(receipt[0].gasUsed) * Number(tx[0].gasPrice),
                Number(receipt[1].gasUsed) * Number(tx[1].gasPrice)];
            // Get OLAS balance
            balanceOLAS = [await olas.balanceOf(agentOwners[0].address), await olas.balanceOf(agentOwners[1].address)];
            // Get ETH balance after rewards
            balanceETHAfterReward = [await ethers.provider.getBalance(agentOwners[0].address),
                await ethers.provider.getBalance(agentOwners[1].address)];

            // Check the received reward in ETH for agents
            const expectedAgentRewards = rewards[2];
            const expectedTopUpsAgents = topUps[2];
            // Rewards without gas
            rewardsNoGas = [Number(balanceETHAfterReward[0]) - Number(balanceETHBeforeReward[0]),
                Number(balanceETHAfterReward[1]) - Number(balanceETHBeforeReward[1])];
            // Rewards with the gas spent for the tx
            rewardsWithGas = [rewardsNoGas[0] + gasCost[0], rewardsNoGas[1] + gasCost[1]];
            // Get the absolute difference between expected and received rewards in ETH
            rewardsDiffETH = Math.abs(expectedAgentRewards - (rewardsWithGas[0] + rewardsWithGas[1])) / E18;
            expect(rewardsDiffETH).to.lessThan(gasDelta);
            // The balance after reward minus the balance before minus the gas must be less than expected reward
            expect(rewardsNoGas[0] + rewardsNoGas[1]).to.lessThan(expectedAgentRewards);

            // Calculate agent top-up difference in OLAS with the expected value
            expect(Math.abs(expectedTopUpsAgents - (Number(balanceOLAS[0]) + Number(balanceOLAS[1])))).to.lessThan(delta);

            // Withdraw locking and claim skating by the deployer (considered rewards and top-ups for 1 epoch) and a staker
            balanceETHBeforeReward = [await ethers.provider.getBalance(deployer.address),
                await ethers.provider.getBalance(staker.address)];
            // veOLAS withdraw
            tx = [await ve.withdraw(), await ve.connect(staker).withdraw()];
            // Calculate gas cost
            receipt = [await tx[0].wait(), await tx[1].wait()];
            gasCost = [Number(receipt[0].gasUsed) * Number(tx[0].gasPrice),
                Number(receipt[1].gasUsed) * Number(tx[1].gasPrice)];
            // Staking claim
            tx = [await dispenser.connect(deployer).claimStakingRewards(),
                await dispenser.connect(staker).claimStakingRewards()];
            // Add to the gas cost
            receipt = [await tx[0].wait(), await tx[1].wait()];
            gasCost = [Number(receipt[0].gasUsed) * Number(tx[0].gasPrice) + gasCost[0],
                Number(receipt[1].gasUsed) * Number(tx[1].gasPrice) + gasCost[1]];
            // Get OLAS balance
            balanceOLAS = [await olas.balanceOf(deployer.address),
                await olas.balanceOf(staker.address)];
            // Get ETH balance after rewards
            balanceETHAfterReward = [await ethers.provider.getBalance(deployer.address),
                await ethers.provider.getBalance(staker.address)];

            // Staker balance must increase on the stakerFraction amount of the received service revenue
            // We need to subtract service owner staking part
            const expectedStakerRewards = rewards[0] * userStakersFraction;
            // Rewards without gas
            rewardsNoGas = [Number(balanceETHAfterReward[0]) - Number(balanceETHBeforeReward[0]),
                Number(balanceETHAfterReward[1]) - Number(balanceETHBeforeReward[1])];
            // Rewards with the gas spent for the tx
            rewardsWithGas = [rewardsNoGas[0] + gasCost[0], rewardsNoGas[1] + gasCost[1]];
            // Get the absolute difference between expected and received rewards in ETH
            rewardsDiffETH = Math.abs(expectedStakerRewards - (rewardsWithGas[0] + rewardsWithGas[1])) / E18;
            expect(rewardsDiffETH).to.lessThan(gasDelta);
            // The balance after reward minus the balance before minus the gas must be less than expected reward
            expect(rewardsNoGas[0] + rewardsNoGas[1]).to.lessThan(expectedStakerRewards);


            // Calculate component top-up sum in OLAS
            // Here also we need to subtract service owner staking part
            const expectedTopUps = topUps[3] * userStakersFraction;
            const sumBalance = Number(balanceOLAS[0]) + Number(balanceOLAS[1]);
            // Calculate balance after staking was received minus the initial OLAS balance minus the expected top-up
            // plus the amount transferred to the service owner
            const balanceDiff = sumBalance - Number(initialMint) - expectedTopUps + Number(balanceOLASToLock);
            expect(Math.abs(balanceDiff)).to.lessThan(delta);

            // Restore to the state of the snapshot
            await snapshot.restore();
        });

        it("Claim staking rewards for several epochs", async () => {
            // Take a snapshot of the current state of the blockchain
            const snapshot = await helpers.takeSnapshot();

            // Stake OLAS by a deployer
            await olas.approve(ve.address, hundredETHBalance);
            // Set the lock duration to be the specified number of weeks
            const numWeeks = 100;
            const lockDuration = numWeeks * oneWeek;

            // Balance should be zero before the lock and a specified amount after the lock
            expect(await ve.getVotes(deployer.address)).to.equal(0);
            await ve.createLock(hundredETHBalance, lockDuration);
            const balanceDeployer = await ve.balanceOf(deployer.address);
            expect(balanceDeployer).to.equal(hundredETHBalance);

            // Allocate empty rewards during the first epoch
            await tokenomics.checkpoint();
            // Go through epochs and allocate rewards for OLAS with the inflation schedule
            for (let i = 0; i < numWeeks; i++) {
                await helpers.time.increase(oneWeek + 1);

                // Allocate rewards for the epoch
                await tokenomics.checkpoint();
            }

            // Claim rewards
            const tx = await dispenser.connect(deployer).claimStakingRewards();
            const receipt = await tx.wait();
            const gasCost = Number(receipt.gasUsed) * Number(tx.gasPrice);
            expect(gasCost).to.greaterThan(0);
            //console.log("gas cost", gasCost);

            // Restore to the state of the snapshot
            await snapshot.restore();
        });
    });

    context("Tokenomics full life cycle", async function () {
        it.only("Performance of two epochs, checks for OLAS top-ups only", async () => {
            const mechManager = signers[1];
            const serviceManager = signers[2];
            const owner = signers[3].address;
            const operator = signers[4].address;
            const agentInstances = [signers[5].address, signers[6].address, signers[7].address, signers[8].address,
                signers[9].address];
            const staker = signers[10];
            const componentOwners = [signers[11], signers[12], signers[13], signers[14]];
            const agentOwners = [signers[15], signers[16], signers[17]];

            // Add liquidity of OLAS-DAI (5000 OLAS, 1000 DAI)
            const amountLiquidityOLA = "5"  + "0".repeat(3) + decimals;
            const amountDAI = "5" + "0".repeat(3) + decimals;
            const minAmountOLA =  "5" + "0".repeat(2) + decimals;
            const minAmountDAI = "1" + "0".repeat(3) + decimals;
            const deadline = Date.now() + 1000;
            const toAddress = deployer.address;
            await olas.approve(router.address, LARGE_APPROVAL);
            await dai.approve(router.address, LARGE_APPROVAL);

            await router.connect(deployer).addLiquidity(
                dai.address,
                olas.address,
                amountDAI,
                amountLiquidityOLA,
                minAmountDAI,
                minAmountOLA,
                toAddress,
                deadline
            );

            // Create 4 components and 3 agents based on them
            await componentRegistry.changeManager(mechManager.address);
            await componentRegistry.connect(mechManager).create(componentOwners[0].address, componentHash, []);
            await componentRegistry.connect(mechManager).create(componentOwners[1].address, componentHash1, []);
            await componentRegistry.connect(mechManager).create(componentOwners[2].address, componentHash2, []);
            await componentRegistry.connect(mechManager).create(componentOwners[3].address, configHash2, []);
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(agentOwners[0].address, agentHash, [1, 2]);
            await agentRegistry.connect(mechManager).create(agentOwners[1].address, agentHash1, [2]);
            await agentRegistry.connect(mechManager).create(agentOwners[2].address, agentHash2, [3]);

            // Create 2 services
            const agentIds = [[1, 2], [1, 3]];
            const agentParams = [[1, regBond], [1, regBond]];
            const threshold = 2;
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).create(owner, configHash, agentIds[0],
                agentParams, threshold);
            await serviceRegistry.connect(serviceManager).create(owner, configHash1, agentIds[1],
                agentParams, threshold);

            // Register agent instances
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, {value: regDeposit});
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, 2, {value: regDeposit});
            await serviceRegistry.connect(serviceManager).registerAgents(operator, serviceId,
                [agentInstances[0], agentInstances[1]], agentIds[0], {value: 2 * regBond});
            await serviceRegistry.connect(serviceManager).registerAgents(operator, 2, [agentInstances[2], agentInstances[3]],
                agentIds[1], {value: 2 * regBond});

            // Deploy services
            await serviceRegistry.changeMultisigPermission(gnosisSafeMultisig.address, true);
            await serviceRegistry.connect(serviceManager).deploy(owner, serviceId, gnosisSafeMultisig.address, payload);
            await serviceRegistry.connect(serviceManager).deploy(owner, 2, gnosisSafeMultisig.address, payload);

            // Check the list of subcomponents
            let subComponents = await serviceRegistry.getUnitIdsOfService(0, 1);
            // subcomponents for service 1: agent1 => [1, 2] and agent2 => [2] |=> [1, 2]
            expect(subComponents.numUnitIds).to.equal(2);
            for (let i = 0; i < subComponents.numUnitIds; i++) {
                expect(subComponents.unitIds[i]).to.equal(i + 1);
            }
            subComponents = await serviceRegistry.getUnitIdsOfService(0, 2);
            // subcomponents for service 2: agent1 => [1, 2] and agent3 => [3] |=> [1, 2, 3]
            expect(subComponents.numUnitIds).to.equal(3);
            for (let i = 0; i < subComponents.numUnitIds; i++) {
                expect(subComponents.unitIds[i]).to.equal(i + 1);
            }

            // Stake OLAS with 2 stakers: deployer and staker
            await olas.transfer(staker.address, twoHundredETHBalance);
            await olas.approve(ve.address, hundredETHBalance);
            await olas.connect(staker).approve(ve.address, twoHundredETHBalance);
            const lockDuration = oneWeek;

            // Balance should be zero before the lock and specified amount after the lock
            expect(await ve.getVotes(deployer.address)).to.equal(0);
            await ve.createLock(hundredETHBalance, lockDuration);
            await ve.connect(staker).createLock(twoHundredETHBalance, lockDuration);
            const balanceDeployer = await ve.balanceOf(deployer.address);
            expect(balanceDeployer).to.equal(hundredETHBalance);
            const balanceStaker = await ve.balanceOf(staker.address);
            expect(balanceStaker).to.equal(twoHundredETHBalance);

            // Allocate empty rewards during the first epoch
            await tokenomics.checkpoint();
            let currentBlock = await ethers.provider.getBlock("latest");
            // Mine blocks until the next epoch
            for (let i = currentBlock.number; i < epochLen + currentBlock.number; i++) {
                await ethers.provider.send("evm_mine");
            }

            // Send deposits services
            await treasury.depositETHFromServices([1, 2], [regServiceRevenue, doubleRegServiceRevenue],
                {value: tripleRegServiceRevenue});

            // Enable LP token of OLAS-DAI pair
            await treasury.enableToken(pairODAI.address);

            // Create a depository bond product and checking that it's equal
            await depository.create(pairODAI.address, supplyProductOLAS, vesting);
            const productId = 0;
            expect(await depository.isActive(pairODAI.address, productId)).to.equal(true);

            // Get the top up per epoch before the mint happens, such that it correctly reflects the amount
            let topUpPerEpoch = await tokenomics.getTopUpPerEpoch();

            // Change epsilonRate to 0.4 to test the fKD parameter
            await tokenomics.changeTokenomicsParameters(1, 1, 1, 1, 1, "4" + "0".repeat(17), "15" + "0".repeat(22), 10, 12, false);

            // !!!!!!!!!!!!!!!!!!    EPOCH 1    !!!!!!!!!!!!!!!!!!!!
            await tokenomics.checkpoint();

            // Get the last epoch
            let lastEpoch = await tokenomics.epochCounter() - 1;

            // f(K(e), D(e)) = d * k * K(e) + d * D(e)
            // Default treasury reward is 0, so K(e) = 0
            // New components = 3, new agents = 3
            // d = 3 + 3 = 6
            // New agent and component owners = 6
            // D(e) = 6
            // f(K, D) = 6 * 6
            // (f(K, D) / 100) + 1 = 0.36 + 1 = 1.36
            // epsilonRate + 1 = 1.4
            // fKD = fKD > epsilonRate ? fkD : epsilonRate
            // fKD = 0.36
            // df = 1 + fKD = 1.36
            const df = Number(await tokenomics.getIDF(lastEpoch)) * 1.0 / E18;
            //console.log("df", df);
            expect(Math.abs(df - 1.36)).to.lessThan(delta);

            // Get owners top-ups
            // We have 4 components
            let balanceComponentOwner = new Array(4);
            for (let i = 0; i < 4; i++) {
                await dispenser.connect(componentOwners[i]).claimOwnerRewards();
                balanceComponentOwner[i] = await olas.balanceOf(componentOwners[i].address);
            }

            // 3 agents
            let balanceAgentOwner = new Array(3);
            for (let i = 0; i < 3; i++) {
                await dispenser.connect(agentOwners[i]).claimOwnerRewards();
                balanceAgentOwner[i] = Number(await olas.balanceOf(agentOwners[i].address));
            }

            // Check the received top-ups for components in OLAS
            // Calculate component top-up sum in OLAS
            let topUpOwnerFraction = await tokenomics.topUpOwnerFraction();
            let componentWeight = await tokenomics.componentWeight();
            let agentWeight = await tokenomics.agentWeight();
            let expectedComponentTopUp = topUpPerEpoch * topUpOwnerFraction * componentWeight;
            expectedComponentTopUp /=  100 * (Number(componentWeight) + Number(agentWeight));
            // Calculate component top-up sup
            let sumComponentOwnerTopUps = 0;
            for (let i = 0; i < 4; i++) {
                sumComponentOwnerTopUps += balanceComponentOwner[i];
            }

            // Check the received top-ups for agents
            let expectedAgentTopUp = topUpPerEpoch * topUpOwnerFraction * agentWeight;
            expectedAgentTopUp /=  100 * (Number(componentWeight) + Number(agentWeight));
            // Calculate agent top-up sum difference with the expected value
            let sumAgentOwnerTopUps = 0;
            for (let i = 0; i < 3; i++) {
                sumAgentOwnerTopUps += balanceAgentOwner[i];
            }
            // Get the overall sum and compare the difference with the expected value
            let diffTopUp = expectedComponentTopUp + expectedAgentTopUp - sumComponentOwnerTopUps - sumAgentOwnerTopUps;
            expect(diffTopUp / E18).to.lessThan(delta);

            // Staking rewards will be calculated after 2 epochs are completed

            // Bonding of tokens for OLAS
            // Bond third of current LP token amount
            const amountToBond = new ethers.BigNumber.from(await pairODAI.balanceOf(deployer.address)).div(4);
            await pairODAI.approve(depository.address, amountToBond);
            let [expectedPayout,,] = await depository.callStatic.deposit(pairODAI.address, productId,
                amountToBond, deployer.address);
            //console.log("[expectedPayout, expiry, index]:",[expectedPayout, expiry, index]);
            await depository.deposit(pairODAI.address, productId, amountToBond, deployer.address);

            await ethers.provider.send("evm_increaseTime", [vesting + 60]);
            const deployerBalanceBeforeBondRedeem = Number(await olas.balanceOf(deployer.address));
            await depository.redeemAll(deployer.address);
            const deployerBalanceAfterBondRedeem = Number(await olas.balanceOf(deployer.address));
            const diffBalance = deployerBalanceAfterBondRedeem - deployerBalanceBeforeBondRedeem;
            expect(Math.abs(Number(expectedPayout) - diffBalance) / E18).to.lessThan(delta);

            // Stakers reward for this epoch in OLAS
            const topUpStakerFraction = await tokenomics.topUpStakerFraction();
            const expectedStakerTopUpEpoch1 = topUpPerEpoch * topUpStakerFraction / 100;

            // Send service revenues for the next epoch
            await treasury.depositETHFromServices([1, 2], [doubleRegServiceRevenue, regServiceRevenue],
                {value: tripleRegServiceRevenue});

            currentBlock = await ethers.provider.getBlock("latest");
            // Mine blocks until the next epoch
            for (let i = currentBlock.number; i < epochLen + currentBlock.number; i++) {
                await ethers.provider.send("evm_mine");
            }

            // Get the top up per epoch before the mint happens, such that it correctly reflects the amount
            topUpPerEpoch = await tokenomics.getTopUpPerEpoch();

            // !!!!!!!!!!!!!!!!!!    EPOCH 2    !!!!!!!!!!!!!!!!!!!!
            await tokenomics.checkpoint();

            // Get owners rewards
            // We have 4 components
            balanceComponentOwner = new Array(4);
            for (let i = 0; i < 4; i++) {
                await dispenser.connect(componentOwners[i]).claimOwnerRewards();
                balanceComponentOwner[i] = Number(await olas.balanceOf(componentOwners[i].address));
            }

            // 3 agents
            balanceAgentOwner = new Array(3);
            for (let i = 0; i < 3; i++) {
                await dispenser.connect(agentOwners[i]).claimOwnerRewards();
                balanceAgentOwner[i] = Number(await olas.balanceOf(agentOwners[i].address));
            }

            // Check the received top-ups for components
            topUpOwnerFraction = await tokenomics.topUpOwnerFraction();
            componentWeight = await tokenomics.componentWeight();
            agentWeight = await tokenomics.agentWeight();
            expectedComponentTopUp = topUpPerEpoch * topUpOwnerFraction * componentWeight;
            expectedComponentTopUp /=  100 * (Number(componentWeight) + Number(agentWeight));
            // Calculate component reward difference with the expected value
            sumComponentOwnerTopUps = 0;
            for (let i = 0; i < 4; i++) {
                sumComponentOwnerTopUps += balanceComponentOwner[i];
            }

            // Check the received top-ups for agents
            expectedAgentTopUp = topUpPerEpoch * topUpOwnerFraction * agentWeight;
            expectedAgentTopUp /=  100 * (Number(componentWeight) + Number(agentWeight));
            // Calculate agent top-up sum difference with the expected value
            sumAgentOwnerTopUps = 0;
            for (let i = 0; i < 3; i++) {
                sumAgentOwnerTopUps += balanceAgentOwner[i];
            }
            // Get the overall sum and compare the difference with the expected value
            diffTopUp = expectedComponentTopUp + expectedAgentTopUp - sumComponentOwnerTopUps - sumAgentOwnerTopUps;
            expect(diffTopUp / E18).to.lessThan(delta);

            // Claim skating by the deployer (considered rewards for 1 epoch) and a staker
            ethers.provider.send("evm_increaseTime", [oneWeek + 10000]);
            currentBlock = await ethers.provider.getBlock("latest");
            // Mine one block to update the time
            await ethers.provider.send("evm_mine");
            await ve.withdraw();
            await ve.connect(staker).withdraw();
            await dispenser.connect(deployer).claimStakingRewards();
            await dispenser.connect(staker).claimStakingRewards();

            // Staker balance must increase on the topUpStakerFraction amount of the received service revenue
            // plus the previous epoch rewards
            const expectedTopUp = topUpPerEpoch * topUpStakerFraction / 100 + expectedStakerTopUpEpoch1;
            const deployerBalance = await olas.balanceOf(deployer.address);
            const stakerBalance = await olas.balanceOf(staker.address);
            const sumBalance = Number(deployerBalance) + Number(stakerBalance);

            // Calculate initial OLAS balance minus the initial liquidity amount of the deployer plus the reward after
            // staking was received plus the amount of OLAS from bonding minus the final amount balance of both accounts
            const balanceDiff = (Number(initialMint) - Number(amountLiquidityOLA) + Number(expectedTopUp) +
                Number(expectedPayout) - sumBalance) / E18;
            expect(Math.abs(balanceDiff)).to.lessThan(delta);

            //console.log("before", deployerBalanceBeforeBondRedeem / E18);
            //console.log("after", deployerBalanceAfterBondRedeem / E18);
            //console.log("expected reward epoch 1", Number(expectedStakerTopUpEpoch1) / E18);
            //console.log("expected total rewards", expectedStakerRewards / E18);
            //console.log("final deployer balance", Number(deployerBalance) / E18);
            //console.log("sumBalance", sumBalance / E18);
            //console.log("expected payout", Number(expectedPayout) / E18);
        });
    });
});
