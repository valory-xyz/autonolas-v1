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
    const supplyProductOLAS =  "20" + decimals;

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
    let gnosisSafe;
    let gnosisSafeProxyFactory;
    let defaultCallbackHandler;
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
    const regFine = 500;
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
    const delta = 10;
    const oneWeek = 7 * 86400;
    const oneYear = 365 * 24 * 3600;
    const fourYears = 4 * oneYear;

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
        gnosisSafe = await GnosisSafe.deploy();
        await gnosisSafe.deployed();

        const GnosisSafeProxyFactory = await ethers.getContractFactory("GnosisSafeProxyFactory");
        gnosisSafeProxyFactory = await GnosisSafeProxyFactory.deploy();
        await gnosisSafeProxyFactory.deployed();

        const GnosisSafeMultisig = await ethers.getContractFactory("GnosisSafeMultisig");
        gnosisSafeMultisig = await GnosisSafeMultisig.deploy(gnosisSafe.address, gnosisSafeProxyFactory.address);
        await gnosisSafeMultisig.deployed();

        const DefaultCallbackHandler = await ethers.getContractFactory("DefaultCallbackHandler");
        defaultCallbackHandler = await DefaultCallbackHandler.deploy();
        await defaultCallbackHandler.deployed();

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
        dispenser = await dispenserFactory.deploy(tokenomics.address, treasury.address);
        // Change to the correct addresses
        await tokenomics.changeManagers(AddressZero, treasury.address, depository.address, dispenser.address);
        await treasury.changeManagers(AddressZero, AddressZero, depository.address, dispenser.address);

        // Change the fractions such that top-ups for stakers are not zero
        await tokenomics.connect(deployer).changeIncentiveFractions(49, 34, 17, 40, 34, 17);

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
            const lockDuration = fourYears;
            await ve.connect(owner).createLock(balanceOLAS, lockDuration);

            // Increase the time to more than the length of the epoch
            await helpers.time.increase(epochLen + 3);
            // Send donations to service(s)
            await treasury.depositETHFromServices([1], [regServiceRevenue], {value: regServiceRevenue});
            // Record tokenomics results of this epoch and start the new one
            await tokenomics.checkpoint();

            // Get owner rewards
            const balanceETHBeforeReward = await ethers.provider.getBalance(ownerAddress);
            const balanceBeforeTopUps = ethers.BigNumber.from(await olas.balanceOf(ownerAddress));
            // Claiming rewards for one component and one agent
            const tx = await dispenser.connect(owner).claimOwnerIncentives([0, 1], [1, 1]);
            // Calculate gas cost
            const receipt = await tx.wait();
            const gasCost = ethers.BigNumber.from(receipt.gasUsed).mul(ethers.BigNumber.from(tx.gasPrice));
            const balanceAfterTopUps = ethers.BigNumber.from(await olas.balanceOf(ownerAddress));
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
            // Get the staker point
            let sp = await tokenomics.mapEpochStakerPoints(lastPoint);
            // Calculate rewards based on the points information
            const percentFraction = ethers.BigNumber.from(100);
            let rewards = [
                ethers.BigNumber.from(ep.totalDonationsETH).mul(ethers.BigNumber.from(sp.rewardStakerFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalDonationsETH).mul(ethers.BigNumber.from(up[0].rewardUnitFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalDonationsETH).mul(ethers.BigNumber.from(up[1].rewardUnitFraction)).div(percentFraction)
            ];
            let accountRewards = rewards[0].add(rewards[1]).add(rewards[2]);
            // Calculate top-ups based on the points information
            let topUps = [
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(ep.maxBondFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(up[0].topUpUnitFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(up[1].topUpUnitFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(sp.topUpStakerFraction)).div(percentFraction)
            ];
            let accountTopUps = topUps[1].add(topUps[2]).add(topUps[3]);
            expect(accountRewards).to.greaterThan(0);
            expect(accountTopUps).to.greaterThan(0);

            // Get the overall incentive amounts for owners
            const expectedRewards = rewards[1].add(rewards[2]);
            const expectedTopUps = topUps[1].add(topUps[2]);

            // Check the received reward
            // Rewards without gas
            const rewardsNoGas = balanceETHAfterReward.sub(balanceETHBeforeReward);
            // Rewards with the gas spent for the tx
            const rewardsWithGas = rewardsNoGas.add(gasCost);
            // Get the absolute difference between expected and received rewards in ETH
            const rewardsDiffETH = Math.abs(Number(expectedRewards.sub(rewardsWithGas)));
            expect(rewardsDiffETH).to.lessThan(delta);
            // The balance after reward minus the balance before minus the gas must be less than expected reward
            expect(rewardsNoGas).to.lessThanOrEqual(expectedRewards);

            // Check owner OLAS top-ups
            const balanceDiff = balanceAfterTopUps.sub(balanceBeforeTopUps);
            expect(Math.abs(Number(expectedTopUps.sub(balanceDiff)))).to.lessThan(delta);

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
            const lockDuration = fourYears;
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
            const tx = [await dispenser.connect(owners[0]).claimOwnerIncentives([0, 1], [1, 1]),
                await dispenser.connect(owners[1]).claimOwnerIncentives([1], [2])];
            // Calculate gas cost
            const receipt = [await tx[0].wait(), await tx[1].wait()];
            const gasCost = [ethers.BigNumber.from(receipt[0].gasUsed).mul(ethers.BigNumber.from(tx[0].gasPrice)),
                ethers.BigNumber.from(receipt[1].gasUsed).mul(ethers.BigNumber.from(tx[1].gasPrice))];
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
            // Get the staker point
            let sp = await tokenomics.mapEpochStakerPoints(lastPoint);
            // Calculate rewards based on the points information
            const percentFraction = ethers.BigNumber.from(100);
            let rewards = [
                ethers.BigNumber.from(ep.totalDonationsETH).mul(ethers.BigNumber.from(sp.rewardStakerFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalDonationsETH).mul(ethers.BigNumber.from(up[0].rewardUnitFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalDonationsETH).mul(ethers.BigNumber.from(up[1].rewardUnitFraction)).div(percentFraction)
            ];
            let accountRewards = rewards[0].add(rewards[1]).add(rewards[2]);
            // Calculate top-ups based on the points information
            let topUps = [
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(ep.maxBondFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(up[0].topUpUnitFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(up[1].topUpUnitFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(sp.topUpStakerFraction)).div(percentFraction)
            ];
            let accountTopUps = topUps[1].add(topUps[2]).add(topUps[3]);
            expect(accountRewards).to.greaterThan(0);
            expect(accountTopUps).to.greaterThan(0);

            // Get the overall incentive amounts for owners
            const expectedRewards = rewards[1].add(rewards[2]);
            const expectedTopUps = topUps[1].add(topUps[2]);

            // Check the received reward in ETH
            // Rewards without gas
            const rewardsNoGas = [ethers.BigNumber.from(balanceETHAfterReward[0]).sub(ethers.BigNumber.from(balanceETHBeforeReward[0])),
                ethers.BigNumber.from(balanceETHAfterReward[1]).sub(ethers.BigNumber.from(balanceETHBeforeReward[1]))];
            // Rewards with the gas spent for the tx
            const rewardsWithGas = [rewardsNoGas[0].add(gasCost[0]), rewardsNoGas[1].add(gasCost[1])];
            // Get the absolute difference between expected and received rewards in ETH
            const rewardsDiffETH = Math.abs(Number(expectedRewards.sub(rewardsWithGas[0].add(rewardsWithGas[1]))));
            expect(rewardsDiffETH).to.lessThan(delta);
            // The balance after reward minus the balance before minus the gas must be less than expected reward
            expect(rewardsNoGas[0].add(rewardsNoGas[1])).to.lessThanOrEqual(expectedRewards);

            // Check the top-ups in OLAS
            expect(Math.abs(Number(expectedTopUps.sub(ethers.BigNumber.from(balanceOLAS[0]).add(ethers.BigNumber.from(balanceOLAS[1])))))).to.lessThan(delta);

            // Restore to the state of the snapshot
            await snapshot.restore();
        });

        it("Dispenser for several component and agent owners and stakers", async () => {
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
            let lockDuration = fourYears;
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
            const userStakersFractionNumerator = ethers.BigNumber.from(threeHundredETHBalance);
            const userStakersFractionDenominator = ethers.BigNumber.from(threeHundredETHBalance).add(ethers.BigNumber.from(balanceOLASToLock));

            // Allocate empty rewards during the first epoch
            await tokenomics.checkpoint();
            // Increase the time to more than one epoch
            await helpers.time.increase(epochLen + 3);

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
            // Get the staker point
            let sp = await tokenomics.mapEpochStakerPoints(lastPoint);
            // Calculate rewards based on the points information
            const percentFraction = ethers.BigNumber.from(100);
            let rewards = [
                ethers.BigNumber.from(ep.totalDonationsETH).mul(ethers.BigNumber.from(sp.rewardStakerFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalDonationsETH).mul(ethers.BigNumber.from(up[0].rewardUnitFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalDonationsETH).mul(ethers.BigNumber.from(up[1].rewardUnitFraction)).div(percentFraction)
            ];
            let accountRewards = rewards[0].add(rewards[1]).add(rewards[2]);
            // Calculate top-ups based on the points information
            let topUps = [
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(ep.maxBondFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(up[0].topUpUnitFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(up[1].topUpUnitFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(sp.topUpStakerFraction)).div(percentFraction)
            ];
            let accountTopUps = topUps[1].add(topUps[2]).add(topUps[3]);
            expect(accountRewards).to.greaterThan(0);
            expect(accountTopUps).to.greaterThan(0);

            // Get owners rewards in ETH
            let balanceETHBeforeReward = [await ethers.provider.getBalance(componentOwners[0].address),
                await ethers.provider.getBalance(componentOwners[1].address)];
            // Each componentOwners has 1 component
            let tx = [await dispenser.connect(componentOwners[0]).claimOwnerIncentives([0], [1]),
                await dispenser.connect(componentOwners[1]).claimOwnerIncentives([0], [2])];
            // Calculate gas cost
            let receipt = [await tx[0].wait(), await tx[1].wait()];
            let gasCost = [ethers.BigNumber.from(receipt[0].gasUsed).mul(ethers.BigNumber.from(tx[0].gasPrice)),
                ethers.BigNumber.from(receipt[1].gasUsed).mul(ethers.BigNumber.from(tx[1].gasPrice))];
            // Get OLAS balance: since service owner is different from unit owners,
            // componentOwners and agentOwners balances after the top-up will reflect OLAS top-ups in full
            let balanceOLAS = [ethers.BigNumber.from(await olas.balanceOf(componentOwners[0].address)),
                ethers.BigNumber.from(await olas.balanceOf(componentOwners[1].address))];
            // Get ETH balance after rewards
            let balanceETHAfterReward = [await ethers.provider.getBalance(componentOwners[0].address),
                await ethers.provider.getBalance(componentOwners[1].address)];

            // Check the received reward in ETH for components
            const expectedComponentRewards = rewards[1];
            const expectedTopUpsComponents = topUps[1];
            // Rewards without gas
            let rewardsNoGas = [ethers.BigNumber.from(balanceETHAfterReward[0]).sub(ethers.BigNumber.from(balanceETHBeforeReward[0])),
                ethers.BigNumber.from(balanceETHAfterReward[1]).sub(ethers.BigNumber.from(balanceETHBeforeReward[1]))];
            // Rewards with the gas spent for the tx
            let rewardsWithGas = [rewardsNoGas[0].add(gasCost[0]), rewardsNoGas[1].add(gasCost[1])];
            // Get the absolute difference between expected and received rewards in ETH
            let sumRewardsWithGas = rewardsWithGas[0].add(rewardsWithGas[1]);
            let rewardsDiffETH = Math.abs(Number(expectedComponentRewards.sub(sumRewardsWithGas)));
            expect(rewardsDiffETH).to.lessThan(delta);
            // The balance after reward minus the balance before minus the gas must be less than expected reward
            expect(sumRewardsWithGas).to.lessThanOrEqual(expectedComponentRewards);

            // Calculate component top-up sum in OLAS
            let sumBalanceOLAS = balanceOLAS[0].add(balanceOLAS[1]);
            expect(Math.abs(Number(expectedTopUpsComponents.sub(sumBalanceOLAS)))).to.lessThan(delta);

            // Get owners rewards and top-ups for agents
            balanceETHBeforeReward = [await ethers.provider.getBalance(agentOwners[0].address),
                await ethers.provider.getBalance(agentOwners[1].address)];
            tx = [await dispenser.connect(agentOwners[0]).claimOwnerIncentives([1], [1]),
                await dispenser.connect(agentOwners[1]).claimOwnerIncentives([1], [2])];
            // Calculate gas cost
            receipt = [await tx[0].wait(), await tx[1].wait()];
            gasCost = [ethers.BigNumber.from(receipt[0].gasUsed).mul(ethers.BigNumber.from(tx[0].gasPrice)),
                ethers.BigNumber.from(receipt[1].gasUsed).mul(ethers.BigNumber.from(tx[1].gasPrice))];
            // Get OLAS balance
            balanceOLAS = [await olas.balanceOf(agentOwners[0].address), await olas.balanceOf(agentOwners[1].address)];
            // Get ETH balance after rewards
            balanceETHAfterReward = [await ethers.provider.getBalance(agentOwners[0].address),
                await ethers.provider.getBalance(agentOwners[1].address)];

            // Check the received reward in ETH for agents
            const expectedAgentRewards = rewards[2];
            const expectedTopUpsAgents = topUps[2];
            // Rewards without gas
            rewardsNoGas = [ethers.BigNumber.from(balanceETHAfterReward[0]).sub(ethers.BigNumber.from(balanceETHBeforeReward[0])),
                ethers.BigNumber.from(balanceETHAfterReward[1]).sub(ethers.BigNumber.from(balanceETHBeforeReward[1]))];
            // Rewards with the gas spent for the tx
            rewardsWithGas = [rewardsNoGas[0].add(gasCost[0]), rewardsNoGas[1].add(gasCost[1])];
            // Get the absolute difference between expected and received rewards in ETH
            sumRewardsWithGas = rewardsWithGas[0].add(rewardsWithGas[1]);
            rewardsDiffETH = Math.abs(Number(expectedAgentRewards.sub(sumRewardsWithGas)));
            expect(rewardsDiffETH).to.lessThan(delta);
            // The balance after reward minus the balance before minus the gas must be less than expected reward
            expect(sumRewardsWithGas).to.lessThanOrEqual(expectedAgentRewards);

            // Calculate component top-up sum in OLAS
            sumBalanceOLAS = balanceOLAS[0].add(balanceOLAS[1]);
            expect(Math.abs(Number(expectedTopUpsAgents.sub(sumBalanceOLAS)))).to.lessThan(delta);

            // Increase the time to more than one week for which lockers were staking
            await helpers.time.increase(oneWeek + 10000);
            // Withdraw locking and claim skating by the deployer (considered rewards and top-ups for 1 epoch) and a staker
            balanceETHBeforeReward = [await ethers.provider.getBalance(deployer.address),
                await ethers.provider.getBalance(staker.address)];
            // veOLAS withdraw
            tx = [await ve.withdraw(), await ve.connect(staker).withdraw()];
            // Calculate gas cost
            receipt = [await tx[0].wait(), await tx[1].wait()];
            gasCost = [ethers.BigNumber.from(receipt[0].gasUsed).mul(ethers.BigNumber.from(tx[0].gasPrice)),
                ethers.BigNumber.from(receipt[1].gasUsed).mul(ethers.BigNumber.from(tx[1].gasPrice))];
            // Staking claim
            tx = [await dispenser.connect(deployer).claimStakingIncentives(),
                await dispenser.connect(staker).claimStakingIncentives()];
            // Add to the gas cost
            receipt = [await tx[0].wait(), await tx[1].wait()];
            gasCost = [(ethers.BigNumber.from(receipt[0].gasUsed).mul(ethers.BigNumber.from(tx[0].gasPrice))).add(gasCost[0]),
                (ethers.BigNumber.from(receipt[1].gasUsed).mul(ethers.BigNumber.from(tx[1].gasPrice))).add(gasCost[1])];
            // Get OLAS balance
            balanceOLAS = [await olas.balanceOf(deployer.address),
                await olas.balanceOf(staker.address)];
            // Get ETH balance after rewards
            balanceETHAfterReward = [await ethers.provider.getBalance(deployer.address),
                await ethers.provider.getBalance(staker.address)];

            // Staker balance must increase on the stakerFraction amount of the received service revenue
            // We need to subtract service owner staking part
            const expectedStakerRewards = (rewards[0].mul(userStakersFractionNumerator)).div(userStakersFractionDenominator);
            // Rewards without gas
            rewardsNoGas = [ethers.BigNumber.from(balanceETHAfterReward[0]).sub(ethers.BigNumber.from(balanceETHBeforeReward[0])),
                ethers.BigNumber.from(balanceETHAfterReward[1]).sub(ethers.BigNumber.from(balanceETHBeforeReward[1]))];
            // Rewards with the gas spent for the tx
            rewardsWithGas = [rewardsNoGas[0].add(gasCost[0]), rewardsNoGas[1].add(gasCost[1])];
            // Get the absolute difference between expected and received rewards in ETH
            sumRewardsWithGas = rewardsWithGas[0].add(rewardsWithGas[1]);
            rewardsDiffETH = Math.abs(Number(expectedStakerRewards.sub(sumRewardsWithGas)));
            expect(rewardsDiffETH).to.lessThan(delta);
            // The balance after reward minus the balance before minus the gas must be less than expected reward
            expect(sumRewardsWithGas).to.lessThanOrEqual(expectedStakerRewards);

            // Calculate component top-up sum in OLAS
            // Here also we need to subtract service owner staking part
            const expectedTopUps = (topUps[3].mul(userStakersFractionNumerator)).div(userStakersFractionDenominator);
            sumBalanceOLAS = balanceOLAS[0].add(balanceOLAS[1]);
            // Calculate balance after staking was received minus the initial OLAS balance minus the expected top-up
            // plus the amount transferred to the service owner
            const balanceDiff = sumBalanceOLAS.add(ethers.BigNumber.from(balanceOLASToLock)).sub(ethers.BigNumber.from(initialMint)).sub(expectedTopUps);
            expect(Math.abs(Number(balanceDiff))).to.lessThan(delta);

            // Restore to the state of the snapshot
            await snapshot.restore();
        });

        it("Dispenser for several component and agent owners without stakers", async () => {
            // Take a snapshot of the current state of the blockchain
            const snapshot = await helpers.takeSnapshot();

            const mechManager = signers[2];
            const serviceManager = signers[3];
            const operator = signers[4].address;
            const serviceOwner = signers[5].address;
            const componentOwners = [signers[10], signers[11], signers[12], signers[13], signers[14], signers[15], signers[16]];
            const agentOwners = [signers[17], signers[18], signers[19], signers[20]];
            const agentInstances = [signers[21].address, signers[22].address, signers[23].address, signers[24].address,
                signers[25].address, signers[26].address];

            //s1= [a1, a1=[c1,c2,c3]], donation d1=2.3 ETH
            //s2= [a1, a2, a1=[c1,c2,c3], a2=[c1,c4,c5]]], donation d2=1.2 ETH
            //s3= [a3, a3=[c3,c4,c6]], donation d3=1.7 ETH
            //s4= [a3, a4, a3=[c3,c4,c6], a4=[c7]], donation d4=2 ETH

            // Create seven components and four agents each for their owner
            await componentRegistry.changeManager(mechManager.address);
            const numComponents = 7;
            for (let i = 0; i < numComponents; i++) {
                await componentRegistry.connect(mechManager).create(componentOwners[i].address, componentHash, []);
            }

            await agentRegistry.changeManager(mechManager.address);
            const numAgents = 4;
            await agentRegistry.connect(mechManager).create(agentOwners[0].address, agentHash, [1, 2, 3]);
            await agentRegistry.connect(mechManager).create(agentOwners[1].address, agentHash, [1, 4, 5]);
            await agentRegistry.connect(mechManager).create(agentOwners[2].address, agentHash, [3, 4, 6]);
            await agentRegistry.connect(mechManager).create(agentOwners[3].address, agentHash, [7]);

            // Create four services
            const agentIds = [[1], [1, 2], [3], [3, 4]];
            const agentParams1 = [[1, regBond]];
            const agentParams2 = [[1, regBond], [1, regBond]];
            const threshold1 = 1;
            const threshold2 = 2;
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).create(serviceOwner, configHash, agentIds[0],
                agentParams1, threshold1);
            await serviceRegistry.connect(serviceManager).create(serviceOwner, configHash, agentIds[1],
                agentParams2, threshold2);
            await serviceRegistry.connect(serviceManager).create(serviceOwner, configHash, agentIds[2],
                agentParams1, threshold1);
            await serviceRegistry.connect(serviceManager).create(serviceOwner, configHash, agentIds[3],
                agentParams2, threshold2);

            // Register agent instances
            const numServices = 4;
            for (let i = 1; i <= numServices; i++) {
                await serviceRegistry.connect(serviceManager).activateRegistration(serviceOwner, i, {value: regDeposit});
            }
            await serviceRegistry.connect(serviceManager).registerAgents(operator, 1, [agentInstances[0]],
                agentIds[0], {value: regBond});
            await serviceRegistry.connect(serviceManager).registerAgents(operator, 2,
                [agentInstances[1], agentInstances[2]], agentIds[1], {value: 2 * regBond});
            await serviceRegistry.connect(serviceManager).registerAgents(operator, 3, [agentInstances[3]],
                agentIds[2], {value: regBond});
            await serviceRegistry.connect(serviceManager).registerAgents(operator, 4,
                [agentInstances[4], agentInstances[5]], agentIds[3], {value: 2 * regBond});

            // Deploy the service
            await serviceRegistry.changeMultisigPermission(gnosisSafeMultisig.address, true);
            for (let i = 1; i <= numServices; i++) {
                await serviceRegistry.connect(serviceManager).deploy(serviceOwner, i, gnosisSafeMultisig.address, payload);
            }

            // In order to have stable results, we need to move to a deployment year pass the first one
            // Otherwise depending on our deployment time, the inflation per second will grow,
            // since there is less time left in a year, and the inflation per second is recalculated based on that
            // Get the current timestamp
            const timeNow = await helpers.time.latest();
            // Get the OLAS contract time launch
            const timeLaunch = 1656584807;
            // Get the current year
            const numYears = Math.floor((timeNow - timeLaunch) / oneYear);
            // If we are still in the year zero, we need to move in time to the next year
            if(numYears == 0) {
                await helpers.time.increaseTo(timeLaunch + oneYear + oneWeek);
            }

            // In order to get OLAS top-ups for owners of components / agents, service owner needs to lock enough veOLAS
            const minWeightedBalance = await tokenomics.veOLASThreshold();
            const balanceOLASToLock = minWeightedBalance.toString() + "1";
            // Transfer the needed amount of OLAS to the component / agent / service owner
            await olas.transfer(serviceOwner, balanceOLASToLock);
            // signers[11] is the EOA for the service owner address
            await olas.connect(signers[5]).approve(ve.address, balanceOLASToLock);
            // Set the lock duration to 4 years such that the amount of OLAS is almost the amount of veOLAS
            // veOLAS = OLAS * time_locked / MAXTIME (where MAXTIME is 4 years)
            let lockDuration = fourYears;
            await ve.connect(signers[5]).createLock(balanceOLASToLock, lockDuration);

            // Allocate empty rewards during the first epoch
            await tokenomics.checkpoint();
            // Increase the time to more than one epoch
            await helpers.time.increase(epochLen + 3);

            const donations = ["23" + "0".repeat(17), "12" + "0".repeat(17), "17" + "0".repeat(17), "2" + "0".repeat(18)];
            // Send deposits for services
            await treasury.depositETHFromServices([1, 2, 3, 4], donations, {value: "72" + "0".repeat(17)});
            // Record tokenomics results of this epoch and start the new one
            await tokenomics.checkpoint();

            // Get the last settled epoch counter
            let lastPoint = Number(await tokenomics.epochCounter()) - 1;
            // Get the epoch point of the last epoch
            let ep = await tokenomics.getEpochPoint(lastPoint);
            // Get the unit points of the last epoch
            let up = [await tokenomics.getUnitPoint(lastPoint, 0), await tokenomics.getUnitPoint(lastPoint, 1)];
            // Get the staker point
            let sp = await tokenomics.mapEpochStakerPoints(lastPoint);
            // Calculate rewards based on the points information
            const percentFraction = ethers.BigNumber.from(100);
            let rewards = [
                ethers.BigNumber.from(ep.totalDonationsETH).mul(ethers.BigNumber.from(sp.rewardStakerFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalDonationsETH).mul(ethers.BigNumber.from(up[0].rewardUnitFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalDonationsETH).mul(ethers.BigNumber.from(up[1].rewardUnitFraction)).div(percentFraction)
            ];
            let accountRewards = rewards[0].add(rewards[1]).add(rewards[2]);
            // Calculate top-ups based on the points information
            let topUps = [
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(ep.maxBondFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(up[0].topUpUnitFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(up[1].topUpUnitFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(sp.topUpStakerFraction)).div(percentFraction)
            ];
            let accountTopUps = topUps[1].add(topUps[2]).add(topUps[3]);
            expect(accountRewards).to.greaterThan(0);
            expect(accountTopUps).to.greaterThan(0);

            // Get owners rewards in ETH
            let balanceETHBeforeReward = new Array(numComponents);
            let tx = new Array(numComponents);
            let receipt = new Array(numComponents);
            let gasCost = new Array(numComponents);
            let balanceOLAS = new Array(numComponents);
            let balanceETHAfterReward = new Array(numComponents);
            for (let i = 0; i < numComponents; i++) {
                // Get the balance before the reward
                balanceETHBeforeReward[i] = ethers.BigNumber.from(await ethers.provider.getBalance(componentOwners[i].address));
                // Claim component owner incentives: each componentOwners has 1 component
                tx[i] = await dispenser.connect(componentOwners[i]).claimOwnerIncentives([0], [i + 1]);
                // Calculate gas cost
                receipt[i] = await tx[i].wait();
                gasCost[i] = ethers.BigNumber.from(receipt[i].gasUsed).mul(ethers.BigNumber.from(tx[i].gasPrice));
                // Get OLAS balance: since service owner is different from unit owners,
                // componentOwners and agentOwners balances after the top-up will reflect OLAS top-ups in full
                balanceOLAS[i] = ethers.BigNumber.from(await olas.balanceOf(componentOwners[i].address));
                // Get ETH balance after claiming rewards
                balanceETHAfterReward[i] = ethers.BigNumber.from(await ethers.provider.getBalance(componentOwners[i].address));
            }

            // Check the received reward in ETH for components
            const expectedComponentRewards = rewards[1];
            const expectedTopUpsComponents = topUps[1];
            let rewardsNoGas = new Array(numComponents);
            let rewardsWithGas = new Array(numComponents);
            let rewardsSumNoGas = ethers.BigNumber.from(0);
            let rewardsSumWithGas = ethers.BigNumber.from(0);
            let topUpsSum = ethers.BigNumber.from(0);
            for (let i = 0; i < numComponents; i++) {
                // Rewards without gas
                rewardsNoGas[i] = balanceETHAfterReward[i].sub(balanceETHBeforeReward[i]);
                // Rewards with the gas spent for the tx
                rewardsWithGas[i] = rewardsNoGas[i].add(gasCost[i]);
                // Accumulate all the rewards and top-ups
                rewardsSumNoGas = rewardsSumNoGas.add(rewardsNoGas[i]);
                rewardsSumWithGas = rewardsSumWithGas.add(rewardsWithGas[i]);
                topUpsSum = topUpsSum.add(balanceOLAS[i]);
            }
            // Get the absolute difference between expected and received rewards in ETH
            let rewardsDiffETH = Math.abs(Number(expectedComponentRewards.sub(rewardsSumWithGas)));
            expect(rewardsDiffETH).to.lessThan(delta);
            // The balance after reward minus the balance before minus the gas must be less than expected reward
            expect(rewardsSumNoGas).to.lessThan(expectedComponentRewards);
            // Calculated reward value must be less or equal the theoretical one
            expect(rewardsSumWithGas).to.lessThanOrEqual(expectedComponentRewards);

            // Calculate component top-up sum in OLAS
            expect(Math.abs(Number(expectedTopUpsComponents.sub(topUpsSum)))).to.lessThan(delta);
            // Calculated top-up value must be less or equal the theoretical one
            expect(topUpsSum).to.lessThanOrEqual(expectedTopUpsComponents);

            // Check that nothing is left in incentives
            for (let i = 0; i < numComponents; i++) {
                const incentives = await tokenomics.getOwnerIncentives(componentOwners[i].address, [0], [i + 1]);
                expect(incentives.reward).to.equal(0);
                expect(incentives.topUp).to.equal(0);
            }

            // Get owners rewards and top-ups for agents
            for (let i = 0; i < numAgents; i++) {
                // Get the balance before the reward
                balanceETHBeforeReward[i] = ethers.BigNumber.from(await ethers.provider.getBalance(agentOwners[i].address));
                // Claim component owner incentives: each componentOwners has 1 component
                tx[i] = await dispenser.connect(agentOwners[i]).claimOwnerIncentives([1], [i + 1]);
                // Calculate gas cost
                receipt[i] = await tx[i].wait();
                gasCost[i] = ethers.BigNumber.from(receipt[i].gasUsed).mul(ethers.BigNumber.from(tx[i].gasPrice));
                // Get OLAS balance: since service owner is different from unit owners,
                // componentOwners and agentOwners balances after the top-up will reflect OLAS top-ups in full
                balanceOLAS[i] = ethers.BigNumber.from(await olas.balanceOf(agentOwners[i].address));
                // Get ETH balance after claiming rewards
                balanceETHAfterReward[i] = ethers.BigNumber.from(await ethers.provider.getBalance(agentOwners[i].address));
            }

            // Check the received reward in ETH for agents
            const expectedAgentRewards = rewards[2];
            const expectedTopUpsAgents = topUps[2];
            rewardsSumNoGas = ethers.BigNumber.from(0);
            rewardsSumWithGas = ethers.BigNumber.from(0);
            topUpsSum = ethers.BigNumber.from(0);
            for (let i = 0; i < numAgents; i++) {
                // Rewards without gas
                rewardsNoGas[i] = balanceETHAfterReward[i].sub(balanceETHBeforeReward[i]);
                // Rewards with the gas spent for the tx
                rewardsWithGas[i] = rewardsNoGas[i].add(gasCost[i]);
                // Accumulate all the rewards and top-ups
                rewardsSumNoGas = rewardsSumNoGas.add(rewardsNoGas[i]);
                rewardsSumWithGas = rewardsSumWithGas.add(rewardsWithGas[i]);
                topUpsSum = topUpsSum.add(balanceOLAS[i]);
            }
            // Get the absolute difference between expected and received rewards in ETH
            rewardsDiffETH = Math.abs(Number(expectedAgentRewards.sub(rewardsSumWithGas)));
            expect(rewardsDiffETH).to.lessThan(delta);
            // The balance after reward minus the balance before minus the gas must be less than expected reward
            expect(rewardsSumNoGas).to.lessThan(expectedAgentRewards);
            // Calculated reward value must be less or equal the theoretical one
            expect(rewardsSumWithGas).to.lessThanOrEqual(expectedAgentRewards);

            // Calculate component top-up sum in OLAS
            expect(Math.abs(Number(expectedTopUpsAgents.sub(topUpsSum)))).to.lessThan(delta);
            // Calculated top-up value must be less or equal the theoretical one
            expect(topUpsSum).to.lessThanOrEqual(expectedTopUpsAgents);

            // Check that nothing is left in incentives
            for (let i = 0; i < numAgents; i++) {
                const incentives = await tokenomics.getOwnerIncentives(agentOwners[i].address, [1], [i + 1]);
                expect(incentives.reward).to.equal(0);
                expect(incentives.topUp).to.equal(0);
            }

            // Restore to the state of the snapshot
            await snapshot.restore();
        });

        it("Dispenser for several component and agent owners without stakers with atomic donations", async () => {
            // Take a snapshot of the current state of the blockchain
            const snapshot = await helpers.takeSnapshot();

            const mechManager = signers[2];
            const serviceManager = signers[3];
            const operator = signers[4].address;
            const serviceOwner = signers[5].address;
            const componentOwners = [signers[10], signers[11], signers[12], signers[13], signers[14], signers[15], signers[16]];
            const agentOwners = [signers[17], signers[18], signers[19], signers[20]];
            const agentInstances = [signers[21].address, signers[22].address, signers[23].address, signers[24].address,
                signers[25].address, signers[26].address];

            //s1= [a1, a1=[c1,c2,c3]], donation d1=2.3 ETH
            //s2= [a1, a2, a1=[c1,c2,c3], a2=[c1,c4,c5]]], donation d2=1.2 ETH
            //s3= [a3, a3=[c3,c4,c6]], donation d3=1.7 ETH
            //s4= [a3, a4, a3=[c3,c4,c6], a4=[c7]], donation d4=2 ETH

            // Create seven components and four agents each for their owner
            await componentRegistry.changeManager(mechManager.address);
            const numComponents = 7;
            for (let i = 0; i < numComponents; i++) {
                await componentRegistry.connect(mechManager).create(componentOwners[i].address, componentHash, []);
            }

            await agentRegistry.changeManager(mechManager.address);
            const numAgents = 4;
            await agentRegistry.connect(mechManager).create(agentOwners[0].address, agentHash, [1, 2, 3]);
            await agentRegistry.connect(mechManager).create(agentOwners[1].address, agentHash, [1, 4, 5]);
            await agentRegistry.connect(mechManager).create(agentOwners[2].address, agentHash, [3, 4, 6]);
            await agentRegistry.connect(mechManager).create(agentOwners[3].address, agentHash, [7]);

            // Create four services
            const agentIds = [[1], [1, 2], [3], [3, 4]];
            const agentParams1 = [[1, regBond]];
            const agentParams2 = [[1, regBond], [1, regBond]];
            const threshold1 = 1;
            const threshold2 = 2;
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).create(serviceOwner, configHash, agentIds[0],
                agentParams1, threshold1);
            await serviceRegistry.connect(serviceManager).create(serviceOwner, configHash, agentIds[1],
                agentParams2, threshold2);
            await serviceRegistry.connect(serviceManager).create(serviceOwner, configHash, agentIds[2],
                agentParams1, threshold1);
            await serviceRegistry.connect(serviceManager).create(serviceOwner, configHash, agentIds[3],
                agentParams2, threshold2);

            // Register agent instances
            const numServices = 4;
            for (let i = 1; i <= numServices; i++) {
                await serviceRegistry.connect(serviceManager).activateRegistration(serviceOwner, i, {value: regDeposit});
            }
            await serviceRegistry.connect(serviceManager).registerAgents(operator, 1, [agentInstances[0]],
                agentIds[0], {value: regBond});
            await serviceRegistry.connect(serviceManager).registerAgents(operator, 2,
                [agentInstances[1], agentInstances[2]], agentIds[1], {value: 2 * regBond});
            await serviceRegistry.connect(serviceManager).registerAgents(operator, 3, [agentInstances[3]],
                agentIds[2], {value: regBond});
            await serviceRegistry.connect(serviceManager).registerAgents(operator, 4,
                [agentInstances[4], agentInstances[5]], agentIds[3], {value: 2 * regBond});

            // Deploy the service
            await serviceRegistry.changeMultisigPermission(gnosisSafeMultisig.address, true);
            for (let i = 1; i <= numServices; i++) {
                await serviceRegistry.connect(serviceManager).deploy(serviceOwner, i, gnosisSafeMultisig.address, payload);
            }

            // In order to have stable results, we need to move to a deployment year pass the first one
            // Otherwise depending on our deployment time, the inflation per second will grow,
            // since there is less time left in a year, and the inflation per second is recalculated based on that
            // Get the current timestamp
            const timeNow = await helpers.time.latest();
            // Get the OLAS contract time launch
            const timeLaunch = 1656584807;
            // Get the current year
            const numYears = Math.floor((timeNow - timeLaunch) / oneYear);
            // If we are still in the year zero, we need to move in time to the next year
            if(numYears == 0) {
                await helpers.time.increaseTo(timeLaunch + oneYear + oneWeek);
            }

            // In order to get OLAS top-ups for owners of components / agents, service owner needs to lock enough veOLAS
            const minWeightedBalance = await tokenomics.veOLASThreshold();
            const balanceOLASToLock = minWeightedBalance.toString() + "1";
            // Transfer the needed amount of OLAS to the component / agent / service owner
            await olas.transfer(serviceOwner, balanceOLASToLock);
            // signers[11] is the EOA for the service owner address
            await olas.connect(signers[5]).approve(ve.address, balanceOLASToLock);
            // Set the lock duration to 4 years such that the amount of OLAS is almost the amount of veOLAS
            // veOLAS = OLAS * time_locked / MAXTIME (where MAXTIME is 4 years)
            let lockDuration = fourYears;
            await ve.connect(signers[5]).createLock(balanceOLASToLock, lockDuration);

            // Allocate empty rewards during the first epoch
            await tokenomics.checkpoint();
            // Increase the time to more than one epoch
            await helpers.time.increase(epochLen + 3);

            const donations = ["23" + "0".repeat(17), "12" + "0".repeat(17), "17" + "0".repeat(17), "2" + "0".repeat(18)];
            // Send deposits for services
            for (let i = 0; i < numServices; i++) {
                await treasury.depositETHFromServices([i + 1], [donations[i]], {value: donations[i]});
            }
            // Record tokenomics results of this epoch and start the new one
            await tokenomics.checkpoint();

            // Get the last settled epoch counter
            let lastPoint = Number(await tokenomics.epochCounter()) - 1;
            // Get the epoch point of the last epoch
            let ep = await tokenomics.getEpochPoint(lastPoint);
            // Get the unit points of the last epoch
            let up = [await tokenomics.getUnitPoint(lastPoint, 0), await tokenomics.getUnitPoint(lastPoint, 1)];
            // Get the staker point
            let sp = await tokenomics.mapEpochStakerPoints(lastPoint);
            // Calculate rewards based on the points information
            const percentFraction = ethers.BigNumber.from(100);
            let rewards = [
                ethers.BigNumber.from(ep.totalDonationsETH).mul(ethers.BigNumber.from(sp.rewardStakerFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalDonationsETH).mul(ethers.BigNumber.from(up[0].rewardUnitFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalDonationsETH).mul(ethers.BigNumber.from(up[1].rewardUnitFraction)).div(percentFraction)
            ];
            let accountRewards = rewards[0].add(rewards[1]).add(rewards[2]);
            // Calculate top-ups based on the points information
            let topUps = [
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(ep.maxBondFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(up[0].topUpUnitFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(up[1].topUpUnitFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(sp.topUpStakerFraction)).div(percentFraction)
            ];
            let accountTopUps = topUps[1].add(topUps[2]).add(topUps[3]);
            expect(accountRewards).to.greaterThan(0);
            expect(accountTopUps).to.greaterThan(0);

            // Get owners rewards in ETH
            let balanceETHBeforeReward = new Array(numComponents);
            let tx = new Array(numComponents);
            let receipt = new Array(numComponents);
            let gasCost = new Array(numComponents);
            let balanceOLAS = new Array(numComponents);
            let balanceETHAfterReward = new Array(numComponents);
            for (let i = 0; i < numComponents; i++) {
                // Get the balance before the reward
                balanceETHBeforeReward[i] = ethers.BigNumber.from(await ethers.provider.getBalance(componentOwners[i].address));
                // Claim component owner incentives: each componentOwners has 1 component
                tx[i] = await dispenser.connect(componentOwners[i]).claimOwnerIncentives([0], [i + 1]);
                // Calculate gas cost
                receipt[i] = await tx[i].wait();
                gasCost[i] = ethers.BigNumber.from(receipt[i].gasUsed).mul(ethers.BigNumber.from(tx[i].gasPrice));
                // Get OLAS balance: since service owner is different from unit owners,
                // componentOwners and agentOwners balances after the top-up will reflect OLAS top-ups in full
                balanceOLAS[i] = ethers.BigNumber.from(await olas.balanceOf(componentOwners[i].address));
                // Get ETH balance after claiming rewards
                balanceETHAfterReward[i] = ethers.BigNumber.from(await ethers.provider.getBalance(componentOwners[i].address));
            }

            // Check the received reward in ETH for components
            const expectedComponentRewards = rewards[1];
            const expectedTopUpsComponents = topUps[1];
            let rewardsNoGas = new Array(numComponents);
            let rewardsWithGas = new Array(numComponents);
            let rewardsSumNoGas = ethers.BigNumber.from(0);
            let rewardsSumWithGas = ethers.BigNumber.from(0);
            let topUpsSum = ethers.BigNumber.from(0);
            for (let i = 0; i < numComponents; i++) {
                // Rewards without gas
                rewardsNoGas[i] = balanceETHAfterReward[i].sub(balanceETHBeforeReward[i]);
                // Rewards with the gas spent for the tx
                rewardsWithGas[i] = rewardsNoGas[i].add(gasCost[i]);
                // Accumulate all the rewards and top-ups
                rewardsSumNoGas = rewardsSumNoGas.add(rewardsNoGas[i]);
                rewardsSumWithGas = rewardsSumWithGas.add(rewardsWithGas[i]);
                topUpsSum = topUpsSum.add(balanceOLAS[i]);
            }
            // Define high precision delta as 1 digit at most
            const delta = 10;
            // Get the absolute difference between expected and received rewards in ETH
            let rewardsDiffETH = Math.abs(Number(expectedComponentRewards.sub(rewardsSumWithGas)));
            expect(rewardsDiffETH).to.lessThan(delta);
            // The balance after reward minus the balance before minus the gas must be less than expected reward
            expect(rewardsSumNoGas).to.lessThan(expectedComponentRewards);
            // Calculated reward value must be less or equal the theoretical one
            expect(rewardsSumWithGas).to.lessThanOrEqual(expectedComponentRewards);

            // Calculate component top-up sum in OLAS
            expect(Math.abs(Number(expectedTopUpsComponents.sub(topUpsSum)))).to.lessThan(delta);
            // Calculated top-up value must be less or equal the theoretical one
            expect(topUpsSum).to.lessThanOrEqual(expectedTopUpsComponents);

            // Get owners rewards and top-ups for agents
            for (let i = 0; i < numAgents; i++) {
                // Get the balance before the reward
                balanceETHBeforeReward[i] = ethers.BigNumber.from(await ethers.provider.getBalance(agentOwners[i].address));
                // Claim component owner incentives: each componentOwners has 1 component
                tx[i] = await dispenser.connect(agentOwners[i]).claimOwnerIncentives([1], [i + 1]);
                // Calculate gas cost
                receipt[i] = await tx[i].wait();
                gasCost[i] = ethers.BigNumber.from(receipt[i].gasUsed).mul(ethers.BigNumber.from(tx[i].gasPrice));
                // Get OLAS balance: since service owner is different from unit owners,
                // componentOwners and agentOwners balances after the top-up will reflect OLAS top-ups in full
                balanceOLAS[i] = ethers.BigNumber.from(await olas.balanceOf(agentOwners[i].address));
                // Get ETH balance after claiming rewards
                balanceETHAfterReward[i] = ethers.BigNumber.from(await ethers.provider.getBalance(agentOwners[i].address));
            }

            // Check the received reward in ETH for agents
            const expectedAgentRewards = rewards[2];
            const expectedTopUpsAgents = topUps[2];
            rewardsSumNoGas = ethers.BigNumber.from(0);
            rewardsSumWithGas = ethers.BigNumber.from(0);
            topUpsSum = ethers.BigNumber.from(0);
            for (let i = 0; i < numAgents; i++) {
                // Rewards without gas
                rewardsNoGas[i] = balanceETHAfterReward[i].sub(balanceETHBeforeReward[i]);
                // Rewards with the gas spent for the tx
                rewardsWithGas[i] = rewardsNoGas[i].add(gasCost[i]);
                // Accumulate all the rewards and top-ups
                rewardsSumNoGas = rewardsSumNoGas.add(rewardsNoGas[i]);
                rewardsSumWithGas = rewardsSumWithGas.add(rewardsWithGas[i]);
                topUpsSum = topUpsSum.add(balanceOLAS[i]);
            }
            // Get the absolute difference between expected and received rewards in ETH
            rewardsDiffETH = Math.abs(Number(expectedAgentRewards.sub(rewardsSumWithGas)));
            expect(rewardsDiffETH).to.lessThan(delta);
            // The balance after reward minus the balance before minus the gas must be less than expected reward
            expect(rewardsSumNoGas).to.lessThan(expectedAgentRewards);
            // Calculated reward value must be less or equal the theoretical one
            expect(rewardsSumWithGas).to.lessThanOrEqual(expectedAgentRewards);

            // Calculate component top-up sum in OLAS
            expect(Math.abs(Number(expectedTopUpsAgents.sub(topUpsSum)))).to.lessThan(delta);
            // Calculated top-up value must be less or equal the theoretical one
            expect(topUpsSum).to.lessThanOrEqual(expectedTopUpsAgents);

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
            const tx = await dispenser.connect(deployer).claimStakingIncentives();
            const receipt = await tx.wait();
            const gasCost = Number(receipt.gasUsed) * Number(tx.gasPrice);
            expect(gasCost).to.greaterThan(0);
            //console.log("gas cost", gasCost);

            // Restore to the state of the snapshot
            await snapshot.restore();
        });
    });

    context("Tokenomics full life cycle", async function () {
        it("Performance of two epochs, checks for OLAS top-ups only", async () => {
            // Take a snapshot of the current state of the blockchain
            const snapshot = await helpers.takeSnapshot();

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
            const amountLiquidityOLAS = "5"  + "0".repeat(3) + decimals;
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
                amountLiquidityOLAS,
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

            // In order to get OLAS top-ups for owners of components / agents, service owner needs to lock enough veOLAS
            const minWeightedBalance = await tokenomics.veOLASThreshold();
            const balanceOLASToLock = minWeightedBalance.toString() + "1";
            // Transfer the needed amount of OLAS to the component / agent / service owner
            await olas.transfer(owner, balanceOLASToLock);
            // signers[3] is the EOA for the service owner address
            await olas.connect(signers[3]).approve(ve.address, balanceOLASToLock);
            // Set the lock duration to 4 years such that the amount of OLAS is almost the amount of veOLAS
            // veOLAS = OLAS * time_locked / MAXTIME (where MAXTIME is 4 years)
            let lockDuration = fourYears;
            await ve.connect(signers[3]).createLock(balanceOLASToLock, lockDuration);

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
            const userStakersFractionNumerator = ethers.BigNumber.from(threeHundredETHBalance);
            const userStakersFractionDenominator = ethers.BigNumber.from(threeHundredETHBalance).add(ethers.BigNumber.from(balanceOLASToLock));

            // Allocate empty rewards during the first epoch
            await tokenomics.checkpoint();

            // Increase the time to more than one epoch
            await helpers.time.increase(epochLen + 3);

            // Send deposits services
            await treasury.depositETHFromServices([1, 2], [regServiceRevenue, doubleRegServiceRevenue],
                {value: tripleRegServiceRevenue});

            // Enable LP token of OLAS-DAI pair
            await treasury.enableToken(pairODAI.address);

            // Create a depository bond product and checking that it's equal
            const priceLP = await depository.getCurrentPriceLP(pairODAI.address);
            await depository.create(pairODAI.address, priceLP, supplyProductOLAS, vesting);
            const productId = 0;
            expect(await depository.isActiveProduct(productId)).to.equal(true);

            // Change epsilonRate to 0.4 to test the fKD parameter
            // Rest of tokenomics parameters are left unchanged
            await tokenomics.changeTokenomicsParameters(0, "4" + "0".repeat(17), 0, 0);

            // !!!!!!!!!!!!!!!!!!    EPOCH 1    !!!!!!!!!!!!!!!!!!!!
            await tokenomics.checkpoint();

            // Get the last settled epoch counter
            let lastPoint = await tokenomics.epochCounter() - 1;
            // Check the inverse discount factor caltulation
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
            // idf = 1 + fKD = 1.36
            const idf = Number(await tokenomics.getIDF(lastPoint)) * 1.0 / E18;
            //console.log("idf", idf);
            expect(Math.abs(idf - 1.36)).to.lessThan(delta);

            // Get the epoch point of the last epoch
            let ep = await tokenomics.getEpochPoint(lastPoint);
            // Get the unit points of the last epoch
            let up = [await tokenomics.getUnitPoint(lastPoint, 0), await tokenomics.getUnitPoint(lastPoint, 1)];
            // Get the staker point
            let sp = await tokenomics.mapEpochStakerPoints(lastPoint);
            // Calculate rewards based on the points information
            const percentFraction = ethers.BigNumber.from(100);
            let rewards = [
                ethers.BigNumber.from(ep.totalDonationsETH).mul(ethers.BigNumber.from(sp.rewardStakerFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalDonationsETH).mul(ethers.BigNumber.from(up[0].rewardUnitFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalDonationsETH).mul(ethers.BigNumber.from(up[1].rewardUnitFraction)).div(percentFraction)
            ];
            let accountRewards = rewards[0].add(rewards[1]).add(rewards[2]);
            // Calculate top-ups based on the points information
            let topUps = [
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(ep.maxBondFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(up[0].topUpUnitFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(up[1].topUpUnitFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(sp.topUpStakerFraction)).div(percentFraction)
            ];
            let accountTopUps = topUps[1].add(topUps[2]).add(topUps[3]);
            expect(accountRewards).to.greaterThan(0);
            expect(accountTopUps).to.greaterThan(0);

            // Get owners top-ups
            // We have 4 components
            let balanceComponentOwner = new Array(4);
            for (let i = 0; i < 4; i++) {
                await dispenser.connect(componentOwners[i]).claimOwnerIncentives([0], [i+1]);
                balanceComponentOwner[i] = ethers.BigNumber.from(await olas.balanceOf(componentOwners[i].address));
            }

            // 3 agents
            let balanceAgentOwner = new Array(3);
            for (let i = 0; i < 3; i++) {
                await dispenser.connect(agentOwners[i]).claimOwnerIncentives([1], [i+1]);
                balanceAgentOwner[i] = ethers.BigNumber.from(await olas.balanceOf(agentOwners[i].address));
            }

            // Check the received top-ups for components in OLAS
            // Calculate component top-up sum in OLAS
            let expectedComponentTopUp = topUps[1];
            // Calculate component top-up sup
            let sumComponentOwnerTopUps = ethers.BigNumber.from(0);
            for (let i = 0; i < 4; i++) {
                sumComponentOwnerTopUps = sumComponentOwnerTopUps.add(balanceComponentOwner[i]);
            }

            // Check the received top-ups for agents
            let expectedAgentTopUp = topUps[2];
            // Calculate agent top-up sum difference with the expected value
            let sumAgentOwnerTopUps = ethers.BigNumber.from(0);
            for (let i = 0; i < 3; i++) {
                sumAgentOwnerTopUps = sumAgentOwnerTopUps.add(balanceAgentOwner[i]);
            }
            // Get the overall sum and compare the difference with the expected value
            let diffTopUp = Math.abs(expectedComponentTopUp.add(expectedAgentTopUp).sub(sumComponentOwnerTopUps).sub(sumAgentOwnerTopUps));
            expect(diffTopUp).to.lessThan(delta);

            // Staking rewards will be calculated after 2 epochs are completed

            // Bonding of tokens for OLAS
            // Bond amount that is 2 times smaller than the supply (IFD is 1.4 < 2)
            const amountToBond = new ethers.BigNumber.from(supplyProductOLAS).div(2);
            await pairODAI.approve(treasury.address, amountToBond);
            let [expectedPayout,,] = await depository.connect(deployer).callStatic.deposit(productId, amountToBond);
            //console.log("[expectedPayout, expiry, index]:",[expectedPayout, expiry, index]);
            await depository.connect(deployer).deposit(productId, amountToBond);

            await helpers.time.increase(vesting + 60);
            const deployerBalanceBeforeBondRedeem = ethers.BigNumber.from(await olas.balanceOf(deployer.address));
            await depository.connect(deployer).redeem([0]);
            const deployerBalanceAfterBondRedeem = ethers.BigNumber.from(await olas.balanceOf(deployer.address));
            const diffBalance = deployerBalanceAfterBondRedeem.sub(deployerBalanceBeforeBondRedeem);
            expect(Math.abs(Number(ethers.BigNumber.from(expectedPayout).sub(diffBalance)))).to.lessThan(delta);

            // Stakers reward for this epoch in OLAS
            // We need to subtract service owner staking part
            const expectedStakerTopUpEpoch1 = (topUps[3].mul(userStakersFractionNumerator)).div(userStakersFractionDenominator);

            // Increase the time to more than one epoch length
            await helpers.time.increase(epochLen + 3);

            // Send service revenues for the next epoch
            await treasury.depositETHFromServices([1, 2], [doubleRegServiceRevenue, regServiceRevenue],
                {value: tripleRegServiceRevenue});


            // !!!!!!!!!!!!!!!!!!    EPOCH 2    !!!!!!!!!!!!!!!!!!!!
            await tokenomics.checkpoint();

            // Get the last settled epoch counter
            lastPoint = await tokenomics.epochCounter() - 1;
            // Get the epoch point of the last epoch
            ep = await tokenomics.getEpochPoint(lastPoint);
            // Get the unit points of the last epoch
            up = [await tokenomics.getUnitPoint(lastPoint, 0), await tokenomics.getUnitPoint(lastPoint, 1)];
            // Calculate rewards based on the points information
            rewards = [
                ethers.BigNumber.from(ep.totalDonationsETH).mul(ethers.BigNumber.from(sp.rewardStakerFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalDonationsETH).mul(ethers.BigNumber.from(up[0].rewardUnitFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalDonationsETH).mul(ethers.BigNumber.from(up[1].rewardUnitFraction)).div(percentFraction)
            ];
            accountRewards = rewards[0].add(rewards[1]).add(rewards[2]);
            // Calculate top-ups based on the points information
            topUps = [
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(ep.maxBondFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(up[0].topUpUnitFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(up[1].topUpUnitFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(sp.topUpStakerFraction)).div(percentFraction)
            ];
            accountTopUps = topUps[1].add(topUps[2]).add(topUps[3]);
            expect(accountRewards).to.greaterThan(0);
            expect(accountTopUps).to.greaterThan(0);

            // Get owners rewards
            // We have 4 components
            for (let i = 0; i < 4; i++) {
                // Subtract the balance owners had before claiming top-ups
                const balanceBeforeClaim = ethers.BigNumber.from(await olas.balanceOf(componentOwners[i].address));
                await dispenser.connect(componentOwners[i]).claimOwnerIncentives([0], [i+1]);
                balanceComponentOwner[i] = ethers.BigNumber.from(await olas.balanceOf(componentOwners[i].address)).sub(balanceBeforeClaim);
            }

            // 3 agents
            for (let i = 0; i < 3; i++) {
                // Subtract the balance owners had before claiming top-ups
                const balanceBeforeClaim = ethers.BigNumber.from(await olas.balanceOf(agentOwners[i].address));
                await dispenser.connect(agentOwners[i]).claimOwnerIncentives([1], [i+1]);
                balanceAgentOwner[i] = ethers.BigNumber.from(await olas.balanceOf(agentOwners[i].address)).sub(balanceBeforeClaim);
            }

            // Check the received top-ups for components in OLAS
            // Calculate component top-up sum in OLAS
            expectedComponentTopUp = topUps[1];
            // Calculate component top-up sup
            sumComponentOwnerTopUps = ethers.BigNumber.from(0);
            for (let i = 0; i < 4; i++) {
                sumComponentOwnerTopUps = sumComponentOwnerTopUps.add(balanceComponentOwner[i]);
            }

            // Check the received top-ups for agents
            expectedAgentTopUp = topUps[2];
            // Calculate agent top-up sum difference with the expected value
            sumAgentOwnerTopUps = ethers.BigNumber.from(0);
            for (let i = 0; i < 3; i++) {
                sumAgentOwnerTopUps = sumAgentOwnerTopUps.add(balanceAgentOwner[i]);
            }
            // Get the overall sum and compare the difference with the expected value
            diffTopUp = Math.abs(expectedComponentTopUp.add(expectedAgentTopUp).sub(sumComponentOwnerTopUps).sub(sumAgentOwnerTopUps));
            expect(diffTopUp).to.lessThan(delta);

            // Increase the time to more than one week for which lockers were staking
            await helpers.time.increase(oneWeek + 10000);
            // Claim skating by the deployer (considered rewards for 1 epoch) and a staker
            await ve.withdraw();
            await ve.connect(staker).withdraw();
            await dispenser.connect(deployer).claimStakingIncentives();
            await dispenser.connect(staker).claimStakingIncentives();

            // Staker balance must increase on the topUpStakerFraction amount of the received service revenue
            // plus the previous epoch rewards
            // We need to subtract service owner staking part
            const expectedTopUp = ((topUps[3].mul(userStakersFractionNumerator)).div(userStakersFractionDenominator)).add(expectedStakerTopUpEpoch1);
            const deployerBalance = ethers.BigNumber.from(await olas.balanceOf(deployer.address));
            const stakerBalance = ethers.BigNumber.from(await olas.balanceOf(staker.address));
            const sumBalance = deployerBalance.add(stakerBalance);

            // Calculate initial OLAS balance minus the initial liquidity amount of the deployer plus the reward after
            // staking was received plus the amount of OLAS from bonding minus the final amount balance of both accounts
            // minus the OLAS amount transferred to the srvice owner
            const balanceDiff = (ethers.BigNumber.from(initialMint).add(expectedTopUp).add(ethers.BigNumber.from(expectedPayout)).
                sub(ethers.BigNumber.from(amountLiquidityOLAS)).sub(sumBalance).sub(ethers.BigNumber.from(balanceOLASToLock)));
            expect(Math.abs(balanceDiff)).to.lessThan(delta);

            //console.log("before", deployerBalanceBeforeBondRedeem / E18);
            //console.log("after", deployerBalanceAfterBondRedeem / E18);
            //console.log("expected reward epoch 1", Number(expectedStakerTopUpEpoch1) / E18);
            //console.log("expected total rewards", expectedStakerRewards / E18);
            //console.log("final deployer balance", Number(deployerBalance) / E18);
            //console.log("sumBalance", sumBalance / E18);
            //console.log("expected payout", Number(expectedPayout) / E18);

            // Restore to the state of the snapshot
            await snapshot.restore();
        });

        it("Performance of two epochs, checks for OLAS top-ups only, with gnosis safe wallets", async () => {
            // Take a snapshot of the current state of the blockchain
            const snapshot = await helpers.takeSnapshot();

            const mechManager = signers[1];
            const serviceManager = signers[2];
            const owner = signers[3].address;
            const operator = signers[4].address;
            const agentInstances = [signers[5].address, signers[6].address, signers[7].address, signers[8].address,
                signers[9].address];
            const staker = signers[10];
            const componentOwners = [signers[11], signers[12], signers[13], signers[14]];
            const agentOwners = [signers[15], signers[16]];
            const agentOwnerMultisigSigner = signers[17];

            // Create a multisig that will be the agent owner, and the staker multisig
            const safeContracts = require("@gnosis.pm/safe-contracts");
            // Agent owner multisig
            let setupData = gnosisSafe.interface.encodeFunctionData(
                "setup",
                // signers, threshold, to_address, data, fallback_handler, payment_token, payment, payment_receiver
                // defaultCallbackHandler is needed for the ERC721 support
                [[agentOwnerMultisigSigner.address], 1, AddressZero, "0x", defaultCallbackHandler.address,
                    AddressZero, 0, AddressZero]
            );
            let proxyAddress = await safeContracts.calculateProxyAddress(gnosisSafeProxyFactory, gnosisSafe.address,
                setupData, 0);
            await gnosisSafeProxyFactory.createProxyWithNonce(gnosisSafe.address, setupData, 0).then((tx) => tx.wait());
            const agentOwnerMultisig = await ethers.getContractAt("GnosisSafe", proxyAddress);
            const agentOwnerMultisigAddress = agentOwnerMultisig.address;

            // Staker multisig
            setupData = gnosisSafe.interface.encodeFunctionData(
                "setup",
                // signers, threshold, to_address, data, fallback_handler, payment_token, payment, payment_receiver
                [[staker.address], 1, AddressZero, "0x", AddressZero, AddressZero, 0, AddressZero]
            );
            proxyAddress = await safeContracts.calculateProxyAddress(gnosisSafeProxyFactory, gnosisSafe.address,
                setupData, 0);
            await gnosisSafeProxyFactory.createProxyWithNonce(gnosisSafe.address, setupData, 0).then((tx) => tx.wait());
            const stakerMultisig = await ethers.getContractAt("GnosisSafe", proxyAddress);
            const stakerMultisigAddress = stakerMultisig.address;

            // Add liquidity of OLAS-DAI (5000 OLAS, 1000 DAI)
            const amountLiquidityOLAS = "5"  + "0".repeat(3) + decimals;
            const amountDAI = "5" + "0".repeat(3) + decimals;
            const minAmountOLA =  "5" + "0".repeat(2) + decimals;
            const minAmountDAI = "1" + "0".repeat(3) + decimals;
            const deadline = Date.now() + 1000;
            const toAddress = stakerMultisigAddress;
            await olas.approve(router.address, LARGE_APPROVAL);
            await dai.approve(router.address, LARGE_APPROVAL);

            await router.connect(deployer).addLiquidity(
                dai.address,
                olas.address,
                amountDAI,
                amountLiquidityOLAS,
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
            // The last agent is registered for the multisig address
            await agentRegistry.connect(mechManager).create(agentOwnerMultisigAddress, agentHash2, [3]);

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

            // In order to get OLAS top-ups for owners of components / agents, service owner needs to lock enough veOLAS
            const minWeightedBalance = await tokenomics.veOLASThreshold();
            const balanceOLASToLock = minWeightedBalance.toString() + "1";
            // Transfer the needed amount of OLAS to the component / agent / service owner
            await olas.transfer(owner, balanceOLASToLock);
            // signers[3] is the EOA for the service owner address
            await olas.connect(signers[3]).approve(ve.address, balanceOLASToLock);
            // Set the lock duration to 4 years such that the amount of OLAS is almost the amount of veOLAS
            // veOLAS = OLAS * time_locked / MAXTIME (where MAXTIME is 4 years)
            let lockDuration = fourYears;
            await ve.connect(signers[3]).createLock(balanceOLASToLock, lockDuration);

            // Stake OLAS with 2 stakers: deployer and staker
            await olas.transfer(stakerMultisigAddress, twoHundredETHBalance);
            await olas.approve(ve.address, hundredETHBalance);
            let nonce = await stakerMultisig.nonce();
            let txHashData = await safeContracts.buildContractCall(olas, "approve",
                [ve.address, twoHundredETHBalance], nonce, 0, 0);
            let signMessageData = await safeContracts.safeSignMessage(staker, stakerMultisig, txHashData, 0);
            await safeContracts.executeTx(stakerMultisig, txHashData, [signMessageData], 0);
            lockDuration = oneWeek;

            // Balance should be zero before the lock and specified amount after the lock
            expect(await ve.getVotes(deployer.address)).to.equal(0);
            await ve.createLock(hundredETHBalance, lockDuration);
            nonce = await stakerMultisig.nonce();
            txHashData = await safeContracts.buildContractCall(ve, "createLock",
                [twoHundredETHBalance, lockDuration], nonce, 0, 0);
            signMessageData = await safeContracts.safeSignMessage(staker, stakerMultisig, txHashData, 0);
            await safeContracts.executeTx(stakerMultisig, txHashData, [signMessageData], 0);
            const balanceDeployer = await ve.balanceOf(deployer.address);
            expect(balanceDeployer).to.equal(hundredETHBalance);
            const balanceStaker = await ve.balanceOf(stakerMultisigAddress);
            expect(balanceStaker).to.equal(twoHundredETHBalance);

            // Calculate the fraction of stakers vs the stakers with the service owner staking
            const userStakersFractionNumerator = ethers.BigNumber.from(threeHundredETHBalance);
            const userStakersFractionDenominator = ethers.BigNumber.from(threeHundredETHBalance).add(ethers.BigNumber.from(balanceOLASToLock));

            // Allocate empty rewards during the first epoch
            await tokenomics.checkpoint();

            // Increase the time to more than one epoch
            await helpers.time.increase(epochLen + 3);

            // Send deposits services
            await treasury.depositETHFromServices([1, 2], [regServiceRevenue, doubleRegServiceRevenue],
                {value: tripleRegServiceRevenue});

            // Enable LP token of OLAS-DAI pair
            await treasury.enableToken(pairODAI.address);

            // Create a depository bond product and checking that it's equal
            const priceLP = await depository.getCurrentPriceLP(pairODAI.address);
            await depository.create(pairODAI.address, priceLP, supplyProductOLAS, vesting);
            const productId = 0;
            expect(await depository.isActiveProduct(productId)).to.equal(true);

            // Change epsilonRate to 0.4 to test the fKD parameter
            // Rest of tokenomics parameters are left unchanged
            await tokenomics.changeTokenomicsParameters(0, "4" + "0".repeat(17), 0, 0);

            // !!!!!!!!!!!!!!!!!!    EPOCH 1    !!!!!!!!!!!!!!!!!!!!
            await tokenomics.checkpoint();

            // Get the last settled epoch counter
            let lastPoint = await tokenomics.epochCounter() - 1;
            // Check the inverse discount factor caltulation
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
            // idf = 1 + fKD = 1.36
            const idf = Number(await tokenomics.getIDF(lastPoint)) * 1.0 / E18;
            //console.log("idf", idf);
            expect(Math.abs(idf - 1.36)).to.lessThan(delta);

            // Get the epoch point of the last epoch
            let ep = await tokenomics.getEpochPoint(lastPoint);
            // Get the unit points of the last epoch
            let up = [await tokenomics.getUnitPoint(lastPoint, 0), await tokenomics.getUnitPoint(lastPoint, 1)];
            // Get the staker point
            let sp = await tokenomics.mapEpochStakerPoints(lastPoint);
            // Calculate rewards based on the points information
            const percentFraction = ethers.BigNumber.from(100);
            let rewards = [
                ethers.BigNumber.from(ep.totalDonationsETH).mul(ethers.BigNumber.from(sp.rewardStakerFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalDonationsETH).mul(ethers.BigNumber.from(up[0].rewardUnitFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalDonationsETH).mul(ethers.BigNumber.from(up[1].rewardUnitFraction)).div(percentFraction)
            ];
            let accountRewards = rewards[0].add(rewards[1]).add(rewards[2]);
            // Calculate top-ups based on the points information
            let topUps = [
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(ep.maxBondFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(up[0].topUpUnitFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(up[1].topUpUnitFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(sp.topUpStakerFraction)).div(percentFraction)
            ];
            let accountTopUps = topUps[1].add(topUps[2]).add(topUps[3]);
            expect(accountRewards).to.greaterThan(0);
            expect(accountTopUps).to.greaterThan(0);

            // Get owners top-ups
            // We have 4 components
            let balanceComponentOwner = new Array(4);
            for (let i = 0; i < 4; i++) {
                await dispenser.connect(componentOwners[i]).claimOwnerIncentives([0], [i+1]);
                balanceComponentOwner[i] = ethers.BigNumber.from(await olas.balanceOf(componentOwners[i].address));
            }

            // 2 agent owners plus a gnosis safe one
            let balanceAgentOwner = new Array(3);
            for (let i = 0; i < 2; i++) {
                await dispenser.connect(agentOwners[i]).claimOwnerIncentives([1], [i+1]);
                balanceAgentOwner[i] = ethers.BigNumber.from(await olas.balanceOf(agentOwners[i].address));
            }
            nonce = await agentOwnerMultisig.nonce();
            txHashData = await safeContracts.buildContractCall(dispenser, "claimOwnerIncentives",
                [[1], [3]], nonce, 0, 0);
            signMessageData = await safeContracts.safeSignMessage(agentOwnerMultisigSigner, agentOwnerMultisig, txHashData, 0);
            await safeContracts.executeTx(agentOwnerMultisig, txHashData, [signMessageData], 0);
            balanceAgentOwner[2] = ethers.BigNumber.from(await olas.balanceOf(agentOwnerMultisigAddress));

            // Check the received top-ups for components in OLAS
            // Calculate component top-up sum in OLAS
            let expectedComponentTopUp = topUps[1];
            // Calculate component top-up sup
            let sumComponentOwnerTopUps = ethers.BigNumber.from(0);
            for (let i = 0; i < 4; i++) {
                sumComponentOwnerTopUps = sumComponentOwnerTopUps.add(balanceComponentOwner[i]);
            }

            // Check the received top-ups for agents
            let expectedAgentTopUp = topUps[2];
            // Calculate agent top-up sum difference with the expected value
            let sumAgentOwnerTopUps = ethers.BigNumber.from(0);
            for (let i = 0; i < 3; i++) {
                sumAgentOwnerTopUps = sumAgentOwnerTopUps.add(balanceAgentOwner[i]);
            }
            // Get the overall sum and compare the difference with the expected value
            let diffTopUp = Math.abs(expectedComponentTopUp.add(expectedAgentTopUp).sub(sumComponentOwnerTopUps).sub(sumAgentOwnerTopUps));
            expect(diffTopUp).to.lessThan(delta);

            // Staking rewards will be calculated after 2 epochs are completed

            // Bonding of tokens for OLAS
            // Bond amount that is 2 times smaller than the supply (IFD is 1.4 < 2)
            const amountToBond = ethers.BigNumber.from(supplyProductOLAS).div(2);
            // Approve LP tokens for the treasury
            nonce = await stakerMultisig.nonce();
            txHashData = await safeContracts.buildContractCall(pairODAI, "approve",
                [treasury.address, amountToBond], nonce, 0, 0);
            signMessageData = await safeContracts.safeSignMessage(staker, stakerMultisig, txHashData, 0);
            await safeContracts.executeTx(stakerMultisig, txHashData, [signMessageData], 0);
            // Deposit LP tokens for OLAS
            nonce = await stakerMultisig.nonce();
            txHashData = await safeContracts.buildContractCall(depository, "deposit",
                [productId, amountToBond], nonce, 0, 0);
            signMessageData = await safeContracts.safeSignMessage(staker, stakerMultisig, txHashData, 0);
            await safeContracts.executeTx(stakerMultisig, txHashData, [signMessageData], 0);

            // Get the expected payout for the bond Id 0
            const bondInstance = await depository.mapUserBonds(0);
            const expectedPayout = bondInstance.payout;

            // Advance to the maturity time and redeem the bond
            await helpers.time.increase(vesting + 60);
            const deployerBalanceBeforeBondRedeem = ethers.BigNumber.from(await olas.balanceOf(stakerMultisigAddress));
            nonce = await stakerMultisig.nonce();
            txHashData = await safeContracts.buildContractCall(depository, "redeem", [[0]], nonce, 0, 0);
            signMessageData = await safeContracts.safeSignMessage(staker, stakerMultisig, txHashData, 0);
            await safeContracts.executeTx(stakerMultisig, txHashData, [signMessageData], 0);
            // Compare the OLAS balance after redeeming the bond
            const deployerBalanceAfterBondRedeem = ethers.BigNumber.from(await olas.balanceOf(stakerMultisigAddress));
            const diffBalance = deployerBalanceAfterBondRedeem.sub(deployerBalanceBeforeBondRedeem);
            expect(Math.abs(Number(ethers.BigNumber.from(expectedPayout).sub(diffBalance)))).to.lessThan(delta);

            // Stakers reward for this epoch in OLAS
            // We need to subtract service owner staking part
            const expectedStakerTopUpEpoch1 = (topUps[3].mul(userStakersFractionNumerator)).div(userStakersFractionDenominator);

            // Increase the time to more than one epoch length
            await helpers.time.increase(epochLen + 3);

            // Send service revenues for the next epoch
            await treasury.depositETHFromServices([1, 2], [doubleRegServiceRevenue, regServiceRevenue],
                {value: tripleRegServiceRevenue});


            // !!!!!!!!!!!!!!!!!!    EPOCH 2    !!!!!!!!!!!!!!!!!!!!
            await tokenomics.checkpoint();

            // Get the last settled epoch counter
            lastPoint = await tokenomics.epochCounter() - 1;
            // Get the epoch point of the last epoch
            ep = await tokenomics.getEpochPoint(lastPoint);
            // Get the unit points of the last epoch
            up = [await tokenomics.getUnitPoint(lastPoint, 0), await tokenomics.getUnitPoint(lastPoint, 1)];
            // Calculate rewards based on the points information
            rewards = [
                ethers.BigNumber.from(ep.totalDonationsETH).mul(ethers.BigNumber.from(sp.rewardStakerFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalDonationsETH).mul(ethers.BigNumber.from(up[0].rewardUnitFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalDonationsETH).mul(ethers.BigNumber.from(up[1].rewardUnitFraction)).div(percentFraction)
            ];
            accountRewards = rewards[0].add(rewards[1]).add(rewards[2]);
            // Calculate top-ups based on the points information
            topUps = [
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(ep.maxBondFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(up[0].topUpUnitFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(up[1].topUpUnitFraction)).div(percentFraction),
                ethers.BigNumber.from(ep.totalTopUpsOLAS).mul(ethers.BigNumber.from(sp.topUpStakerFraction)).div(percentFraction)
            ];
            accountTopUps = topUps[1].add(topUps[2]).add(topUps[3]);
            expect(accountRewards).to.greaterThan(0);
            expect(accountTopUps).to.greaterThan(0);

            // Get owners rewards
            // We have 4 components
            for (let i = 0; i < 4; i++) {
                // Subtract the balance owners had before claiming top-ups
                const balanceBeforeClaim = ethers.BigNumber.from(await olas.balanceOf(componentOwners[i].address));
                await dispenser.connect(componentOwners[i]).claimOwnerIncentives([0], [i+1]);
                balanceComponentOwner[i] = ethers.BigNumber.from(await olas.balanceOf(componentOwners[i].address)).sub(balanceBeforeClaim);
            }

            // 2 agent owners plus the gnosis safe one
            for (let i = 0; i < 2; i++) {
                // Subtract the balance owners had before claiming top-ups
                const balanceBeforeClaim = ethers.BigNumber.from(await olas.balanceOf(agentOwners[i].address));
                await dispenser.connect(agentOwners[i]).claimOwnerIncentives([1], [i+1]);
                balanceAgentOwner[i] = ethers.BigNumber.from(await olas.balanceOf(agentOwners[i].address)).sub(balanceBeforeClaim);
            }
            const balanceBeforeClaim = ethers.BigNumber.from(await olas.balanceOf(agentOwnerMultisigAddress));
            nonce = await agentOwnerMultisig.nonce();
            txHashData = await safeContracts.buildContractCall(dispenser, "claimOwnerIncentives",
                [[1], [3]], nonce, 0, 0);
            signMessageData = await safeContracts.safeSignMessage(agentOwnerMultisigSigner, agentOwnerMultisig, txHashData, 0);
            await safeContracts.executeTx(agentOwnerMultisig, txHashData, [signMessageData], 0);
            balanceAgentOwner[2] = ethers.BigNumber.from(await olas.balanceOf(agentOwnerMultisigAddress)).sub(balanceBeforeClaim);

            // Check the received top-ups for components in OLAS
            // Calculate component top-up sum in OLAS
            expectedComponentTopUp = topUps[1];
            // Calculate component top-up sup
            sumComponentOwnerTopUps = ethers.BigNumber.from(0);
            for (let i = 0; i < 4; i++) {
                sumComponentOwnerTopUps = sumComponentOwnerTopUps.add(balanceComponentOwner[i]);
            }

            // Check the received top-ups for agents
            expectedAgentTopUp = topUps[2];
            // Calculate agent top-up sum difference with the expected value
            sumAgentOwnerTopUps = ethers.BigNumber.from(0);
            for (let i = 0; i < 3; i++) {
                sumAgentOwnerTopUps = sumAgentOwnerTopUps.add(balanceAgentOwner[i]);
            }
            // Get the overall sum and compare the difference with the expected value
            diffTopUp = Math.abs(expectedComponentTopUp.add(expectedAgentTopUp).sub(sumComponentOwnerTopUps).sub(sumAgentOwnerTopUps));
            expect(diffTopUp).to.lessThan(delta);

            // Increase the time to more than one week for which lockers were staking
            await helpers.time.increase(oneWeek + 10000);
            // Claim skating by the deployer (considered rewards for 1 epoch) and a staker
            await ve.withdraw();
            await dispenser.connect(deployer).claimStakingIncentives();

            nonce = await stakerMultisig.nonce();
            txHashData = await safeContracts.buildContractCall(ve, "withdraw", [], nonce, 0, 0);
            signMessageData = await safeContracts.safeSignMessage(staker, stakerMultisig, txHashData, 0);
            await safeContracts.executeTx(stakerMultisig, txHashData, [signMessageData], 0);
            nonce = await stakerMultisig.nonce();
            txHashData = await safeContracts.buildContractCall(dispenser, "claimStakingIncentives", [], nonce, 0, 0);
            signMessageData = await safeContracts.safeSignMessage(staker, stakerMultisig, txHashData, 0);
            await safeContracts.executeTx(stakerMultisig, txHashData, [signMessageData], 0);

            // Staker balance must increase on the topUpStakerFraction amount of the received service revenue
            // plus the previous epoch rewards
            // We need to subtract service owner staking part
            const expectedTopUp = ((topUps[3].mul(userStakersFractionNumerator)).div(userStakersFractionDenominator)).add(expectedStakerTopUpEpoch1);
            const deployerBalance = ethers.BigNumber.from(await olas.balanceOf(deployer.address));
            const stakerBalance = ethers.BigNumber.from(await olas.balanceOf(stakerMultisigAddress));
            const sumBalance = deployerBalance.add(stakerBalance);

            // Calculate initial OLAS balance minus the initial liquidity amount of the deployer plus the reward after
            // staking was received plus the amount of OLAS from bonding minus the final amount balance of both accounts
            // minus the OLAS amount transferred to the srvice owner
            const balanceDiff = (ethers.BigNumber.from(initialMint).add(expectedTopUp).add(ethers.BigNumber.from(expectedPayout)).
                sub(ethers.BigNumber.from(amountLiquidityOLAS)).sub(sumBalance).sub(ethers.BigNumber.from(balanceOLASToLock)));
            expect(Math.abs(balanceDiff)).to.lessThan(delta);

            //console.log("before", deployerBalanceBeforeBondRedeem / E18);
            //console.log("after", deployerBalanceAfterBondRedeem / E18);
            //console.log("expected reward epoch 1", Number(expectedStakerTopUpEpoch1) / E18);
            //console.log("expected total rewards", expectedStakerRewards / E18);
            //console.log("final deployer balance", Number(deployerBalance) / E18);
            //console.log("sumBalance", sumBalance / E18);
            //console.log("expected payout", Number(expectedPayout) / E18);

            // Restore to the state of the snapshot
            await snapshot.restore();
        });
    });

    context("Drain slashed funds", async function () {
        it("Drain slashed funds from the service registry", async () => {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            const operator = signers[6].address;
            const agentInstance = signers[7];
            const maxThreshold = 1;

            // Create a component and an agent
            await componentRegistry.changeManager(mechManager.address);
            await componentRegistry.connect(mechManager).create(owner, componentHash, []);
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, agentHash, [1]);

            // Whitelist gnosis multisig implementation
            await serviceRegistry.changeMultisigPermission(gnosisSafeMultisig.address, true);

            // Create services and activate the agent instance registration
            let serviceInstance = await serviceRegistry.getService(serviceId);
            expect(serviceInstance.state).to.equal(0);
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).create(owner, configHash, [1],
                [[1, regBond]], maxThreshold);

            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, {value: regDeposit});

            /// Register agent instance
            await serviceRegistry.connect(serviceManager).registerAgents(operator, serviceId, [agentInstance.address], [agentId], {value: regBond});

            // Create multisig
            const safe = await serviceRegistry.connect(serviceManager).deploy(owner, serviceId,
                gnosisSafeMultisig.address, payload);
            const result = await safe.wait();
            const proxyAddress = result.events[0].address;

            // Getting a real multisig address and calling slashing method with it
            const multisig = await ethers.getContractAt("GnosisSafe", proxyAddress);
            const safeContracts = require("@gnosis.pm/safe-contracts");
            const nonce = await multisig.nonce();
            const txHashData = await safeContracts.buildContractCall(serviceRegistry, "slash",
                [[agentInstance.address], [regFine], serviceId], nonce, 0, 0);
            const signMessageData = await safeContracts.safeSignMessage(agentInstance, multisig, txHashData, 0);

            // Slash the agent instance operator with the correct multisig
            await safeContracts.executeTx(multisig, txHashData, [signMessageData], 0);

            // After slashing the operator balance must be the difference between the regBond and regFine
            const balanceOperator = Number(await serviceRegistry.getOperatorBalance(operator, serviceId));
            expect(balanceOperator).to.equal(regBond - regFine);

            // The overall slashing balance must be equal to regFine
            const slashedFunds = Number(await serviceRegistry.slashedFunds());
            expect(slashedFunds).to.equal(regFine);

            // Drain slashed funds by the drainer (treasury)
            await serviceRegistry.changeDrainer(treasury.address);
            // Trying to drain by the operator
            await expect(
                treasury.connect(signers[1]).drainServiceSlashedFunds()
            ).to.be.revertedWithCustomError(treasury, "OwnerOnly");

            // Get the slashed funds transferred to the drainer address
            const amount = await treasury.connect(deployer).callStatic.drainServiceSlashedFunds();
            expect(amount).to.equal(regFine);

            // Check that slashed funds are zeroed
            await treasury.connect(deployer).drainServiceSlashedFunds();
            expect(await serviceRegistry.slashedFunds()).to.equal(0);

            // Try to drain again
            // First one to check the drained amount to be zero with a static call
            expect(await treasury.connect(deployer).callStatic.drainServiceSlashedFunds()).to.equal(0);
            // Then do the real drain and make sure nothing has changed or failed
            await treasury.connect(deployer).callStatic.drainServiceSlashedFunds();
            expect(await serviceRegistry.slashedFunds()).to.equal(0);

            // Check the treasury balances
            const ETHOwned = Number(await treasury.ETHOwned());
            expect(ETHOwned).to.equal(regFine);
            const balanceTreasury = await ethers.provider.getBalance(treasury.address);
            expect(balanceTreasury).to.equal(regFine);
        });
    });
});
