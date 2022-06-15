/*global describe, context, beforeEach, it*/
const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("Tokenomics integration", async () => {
    const decimals = "0".repeat(18);
    const LARGE_APPROVAL = "1" + "0".repeat(6) + decimals;
    // Initial mint for olas and DAI (40,000)
    const initialMint = "4" + "0".repeat(4) + decimals;
    // Supply amount for the bonding product
    const supplyProductOLA =  "5" + "0".repeat(3) + decimals;

    let erc20Token;
    let olaFactory;
    let depositoryFactory;
    let tokenomicsFactory;
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

    const componentHash = {hash: "0x" + "0".repeat(64), hashFunction: "0x12", size: "0x20"};
    const componentHash1 = {hash: "0x" + "1".repeat(64), hashFunction: "0x12", size: "0x20"};
    const componentHash2 = {hash: "0x" + "2".repeat(64), hashFunction: "0x12", size: "0x20"};
    const agentHash = {hash: "0x" + "3".repeat(64), hashFunction: "0x12", size: "0x20"};
    const agentHash1 = {hash: "0x" + "4".repeat(64), hashFunction: "0x12", size: "0x20"};
    const agentHash2 = {hash: "0x" + "5".repeat(64), hashFunction: "0x12", size: "0x20"};
    const configHash = {hash: "0x" + "6".repeat(64), hashFunction: "0x12", size: "0x20"};
    const configHash1 = {hash: "0x" + "7".repeat(64), hashFunction: "0x12", size: "0x20"};
    const configHash2 = {hash: "0x" + "8".repeat(64), hashFunction: "0x12", size: "0x20"};
    const AddressZero = "0x" + "0".repeat(40);
    const regBond = 1000;
    const regDeposit = 1000;
    const maxThreshold = 1;
    const name = "service name";
    const description = "service description";
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
    const magicDenominator = 5192296858534816;
    const E18 = 10**18;
    const delta = 1.0 / 10**10;
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
        serviceRegistry = await ServiceRegistry.deploy("service registry", "SERVICE", agentRegistry.address);
        await serviceRegistry.deployed();

        const GnosisSafeL2 = await ethers.getContractFactory("GnosisSafeL2");
        const gnosisSafeL2 = await GnosisSafeL2.deploy();
        await gnosisSafeL2.deployed();

        const GnosisSafeProxyFactory = await ethers.getContractFactory("GnosisSafeProxyFactory");
        const gnosisSafeProxyFactory = await GnosisSafeProxyFactory.deploy();
        await gnosisSafeProxyFactory.deployed();


        const GnosisSafeMultisig = await ethers.getContractFactory("GnosisSafeMultisig");
        gnosisSafeMultisig = await GnosisSafeMultisig.deploy(gnosisSafeL2.address, gnosisSafeProxyFactory.address);
        await gnosisSafeMultisig.deployed();

        deployer = signers[0];
        dai = await erc20Token.deploy();
        olas = await olaFactory.deploy();
        // Correct treasury address is missing here, it will be defined just one line below
        tokenomics = await tokenomicsFactory.deploy(olas.address, deployer.address, deployer.address, deployer.address,
            deployer.address, epochLen, componentRegistry.address, agentRegistry.address, serviceRegistry.address);
        // Correct depository address is missing here, it will be defined just one line below
        treasury = await treasuryFactory.deploy(olas.address, deployer.address, tokenomics.address, deployer.address);
        depository = await depositoryFactory.deploy(olas.address, treasury.address, tokenomics.address);
        ve = await veFactory.deploy(olas.address, "Voting Escrow OLAS", "veOLAS");
        dispenser = await dispenserFactory.deploy(olas.address, tokenomics.address);
        // Change to the correct addresses
        await tokenomics.changeManagers(treasury.address, depository.address, dispenser.address, ve.address);
        await treasury.changeManagers(depository.address, dispenser.address, AddressZero);

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
        // console.log("Uniswap factory deployed to:", factory.address);

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
        it("Calculate tokenomics factors with service registry coordination. One service is deployed", async () => {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            const operator = signers[6].address;
            const agentInstance = signers[7].address;

            // Create one agent
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, agentHash, description, []);

            // Create one service
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, [agentId],
                [agentParams], maxThreshold);

            // Register agent instances
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, {value: regDeposit});
            await serviceRegistry.connect(serviceManager).registerAgents(operator, serviceId, [agentInstance], [agentId], {value: regBond});

            // Deploy the service
            await serviceRegistry.changeMultisigPermission(gnosisSafeMultisig.address, true);
            await serviceRegistry.connect(serviceManager).deploy(owner, serviceId, gnosisSafeMultisig.address, payload);

            // Whitelist a service owner
            await tokenomics.changeServiceOwnerWhiteList([owner], [true]);
            // Send deposits from a service
            await treasury.depositETHFromServices([1], [regServiceRevenue], {value: regServiceRevenue});

            // Calculate current epoch parameters
            await treasury.allocateRewards();

            // Checking the values with delta rounding error
            const lastEpoch = await tokenomics.getCurrentEpoch() - 1;
            const ucf = Number(await tokenomics.getUCF(lastEpoch) / magicDenominator) * 1.0 / E18;
            expect(Math.abs(ucf - 0.5)).to.lessThan(delta);
        });

        it("Calculate tokenomics factors. One service is deployed", async () => {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            const operator = signers[6].address;
            const agentInstance = signers[7].address;

            // Create one agent
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, agentHash, description, []);

            // Create one service
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, [agentId],
                [agentParams], maxThreshold);

            // Register agent instances
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, {value: regDeposit});
            await serviceRegistry.connect(serviceManager).registerAgents(operator, serviceId, [agentInstance], [agentId], {value: regBond});

            // Deploy the service
            await serviceRegistry.changeMultisigPermission(gnosisSafeMultisig.address, true);
            await serviceRegistry.connect(serviceManager).deploy(owner, serviceId, gnosisSafeMultisig.address, payload);

            // Whitelist a service owner
            await tokenomics.changeServiceOwnerWhiteList([owner], [true]);
            // Send deposits from a service
            await treasury.depositETHFromServices([1], [regServiceRevenue], {value: regServiceRevenue});

            // Calculate current epoch parameters
            await treasury.allocateRewards();

            // Checking the values with delta rounding error
            const lastEpoch = await tokenomics.getCurrentEpoch() - 1;
            const ucf = Number(await tokenomics.getUCF(lastEpoch) / magicDenominator) * 1.0 / E18;
            expect(Math.abs(ucf - 0.5)).to.lessThan(delta);
        });

        it("Calculate tokenomics factors. Two services with one agent for each, 3 agents in total", async () => {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            const operator = signers[6].address;
            const agentInstances = [signers[7].address, signers[8].address];

            // Create 3 agents
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, agentHash, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, agentHash1, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, agentHash2, description, []);

            // Create services
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, [agentId],
                [agentParams], maxThreshold);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash1, [2],
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

            // Whitelist a service owner
            await tokenomics.changeServiceOwnerWhiteList([owner], [true]);
            // Fail if the sent amount and the sum of specified amount for each service do not match
            await expect(
                treasury.depositETHFromServices([1, 2], [regServiceRevenue, regServiceRevenue], {value: regServiceRevenue})
            ).to.be.revertedWith("WrongAmount");
            // Fail if the service Ids / amounts array differ in length
            await expect(
                treasury.depositETHFromServices([1, 2], [regServiceRevenue], {value: regServiceRevenue})
            ).to.be.revertedWith("WrongArrayLength");

            // Send deposits from services
            await treasury.depositETHFromServices([1, 2], [regServiceRevenue, regServiceRevenue], {value: doubleRegServiceRevenue});

            // Calculate current epoch parameters
            await treasury.allocateRewards();

            // Checking the values with delta rounding error
            const lastEpoch = await tokenomics.getCurrentEpoch() - 1;
            const ucf = Number(await tokenomics.getUCF(lastEpoch) / magicDenominator) * 1.0 / E18;
            expect(Math.abs(ucf - 0.166666666666666)).to.lessThan(delta);
        });

        it("Calculate tokenomics factors. Two services with different set of agents are deployed", async () => {
            const mechManager = signers[1];
            const serviceManager = signers[2];
            const owner = signers[3].address;
            const operator = signers[4].address;
            const agentInstances = [signers[5].address, signers[6].address, signers[7].address, signers[8].address];

            // Create 3 agents
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, agentHash, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, agentHash1, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, agentHash2, description, []);

            // Create services
            const agentIds = [[1, 2], [2, 3]];
            const agentParams = [[1, regBond], [1, regBond]];
            const threshold = 2;
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds[0],
                agentParams, threshold);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash1, agentIds[1],
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

            // Whitelist a service owner
            await tokenomics.changeServiceOwnerWhiteList([owner], [true]);
            // Send deposits services
            await treasury.depositETHFromServices([1, 2], [regServiceRevenue, regServiceRevenue], {value: doubleRegServiceRevenue});

            // Calculate current epoch parameters
            await treasury.allocateRewards();

            // Checking the values with delta rounding error
            const lastEpoch = await tokenomics.getCurrentEpoch() - 1;
            const ucf = Number(await tokenomics.getUCF(lastEpoch) / magicDenominator) * 1.0 / E18;
            expect(Math.abs(ucf - 0.375)).to.lessThan(delta);
        });

        it("Tokenomics factors. Two services with two agents and two components, one service is not profitable", async () => {
            const mechManager = signers[1];
            const serviceManager = signers[2];
            const owner = signers[3].address;
            const operator = signers[4].address;
            const agentInstances = [signers[5].address, signers[6].address, signers[7].address, signers[8].address];

            // Create 2 components and 2 agents based on them
            await componentRegistry.changeManager(mechManager.address);
            await componentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await componentRegistry.connect(mechManager).create(owner, owner, componentHash1, description, []);
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, agentHash, description, [1, 2]);
            await agentRegistry.connect(mechManager).create(owner, owner, agentHash1, description, [1, 2]);

            // Create 3 services
            const agentIds = [[1, 2], [1, 2]];
            const agentParams = [[1, regBond], [1, regBond]];
            const threshold = 2;
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds[0],
                agentParams, threshold);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash1, agentIds[1],
                agentParams, threshold);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash2, agentIds[1],
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

            // Whitelist a service owner
            await tokenomics.changeServiceOwnerWhiteList([owner], [true]);
            // Send deposits services
            await treasury.depositETHFromServices([1, 2], [regServiceRevenue, regServiceRevenue], {value: doubleRegServiceRevenue});

            // Calculate current epoch parameters
            await treasury.allocateRewards();

            // Checking the values with delta rounding error
            const lastEpoch = await tokenomics.getCurrentEpoch() - 1;
            const ucf = Number(await tokenomics.getUCF(lastEpoch) / magicDenominator) * 1.0 / E18;
            expect(Math.abs(ucf - 1.0)).to.lessThan(delta);
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
            await componentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await componentRegistry.connect(mechManager).create(owner, owner, componentHash1, description, []);
            await componentRegistry.connect(mechManager).create(owner, owner, componentHash2, description, []);
            await componentRegistry.connect(mechManager).create(owner, owner, configHash2, description, []);
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, agentHash, description, [1, 2]);
            await agentRegistry.connect(mechManager).create(owner, owner, agentHash1, description, [2, 3]);
            await agentRegistry.connect(mechManager).create(owner, owner, agentHash2, description, [3, 4]);

            // Create 2 services
            const agentIds = [[1, 2, 3], [1, 3]];
            const agentParams1 = [[1, regBond], [1, regBond], [1, regBond]];
            const agentParams2 = [[1, regBond], [1, regBond]];
            const threshold1 = 3;
            const threshold2 = 2;
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds[0],
                agentParams1, threshold1);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash1, agentIds[1],
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

            // Whitelist a service owner
            await tokenomics.changeServiceOwnerWhiteList([owner], [true]);
            // Send deposits services
            await treasury.depositETHFromServices([1, 2], [doubleRegServiceRevenue, regServiceRevenue],
                {value: tripleRegServiceRevenue});

            // Calculate current epoch parameters
            await treasury.allocateRewards();

            // Calculation of values: ucfc = 1.0 since all 4 components are in both services
            // ucfa[1] = 1, ucfa[2] = 2/3, ucfa[3] = 1
            // |As(1)| = 3, |As(2)| = 2
            // ucfas[1] = sum(ucfa_s1[i]) / |As(1)| = (1 + 2/3 + 1) / 3 = 8/9
            // ucfas[2] = sum(ucfa_s2[i]) / |As(2)| = (1 + 1) / 2 = 1
            // ucfa = sum(ucfas) / |S| = (8/9 + 1) / 2 = 17/18
            // (ucfc + ucfa) / 2 = 0.972(2)

            // Checking the values with delta rounding error
            const lastEpoch = await tokenomics.getCurrentEpoch() - 1;
            const ucf = Number(await tokenomics.getUCF(lastEpoch) / magicDenominator) * 1.0 / E18;
            expect(Math.abs(ucf - 0.97222222222222)).to.lessThan(delta);
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
            await componentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await componentRegistry.connect(mechManager).create(owner, owner, componentHash1, description, []);
            await componentRegistry.connect(mechManager).create(owner, owner, componentHash2, description, []);
            await componentRegistry.connect(mechManager).create(owner, owner, configHash2, description, []);
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, agentHash, description, [1, 2]);
            await agentRegistry.connect(mechManager).create(owner, owner, agentHash1, description, [2]);
            await agentRegistry.connect(mechManager).create(owner, owner, agentHash2, description, [3]);

            // Create 2 services
            const agentIds = [[1, 2], [1, 3]];
            const agentParams = [[1, regBond], [1, regBond]];
            const threshold = 2;
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds[0],
                agentParams, threshold);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash1, agentIds[1],
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

            // Whitelist a service owner
            await tokenomics.changeServiceOwnerWhiteList([owner], [true]);
            // Send deposits services
            await treasury.depositETHFromServices([1, 2], [regServiceRevenue, doubleRegServiceRevenue],
                {value: tripleRegServiceRevenue});

            // Calculate current epoch parameters
            await treasury.allocateRewards();

            // Calculation of ucfc
            // ucfc[1] = 1, ucfc[2] = 1, ucfc[3] = 2/3
            // |Cs(1)| = 2, |Cs(2)| = 3
            // ucfcs[1] = sum(ucfc_s1[i]) / |Cs(1)| = (1 + 1) / 2 = 1
            // ucfcs[2] = sum(ucfc_s2[i]) / |Cs(2)| = (1 + 1 + 2/3) / 3 = 8/9
            // ucfc = sum(ucfas) / |S| = (8/9 + 1) / 2 = 17/18
            // Since not all components are engaged:
            // ucfc = ucfc * |Cref| / |Ctotal| = ucfc * 3 / 4 = 17/24
            // Calculation of ucfa
            // ucfa[1] = 1, ucfa[2] = 1/3, ucfa[3] = 2/3
            // |As(1)| = 2, |As(2)| = 2
            // ucfas[1] = sum(ucfa_s1[i]) / |As(1)| = (1 + 1/3) / 2 = 2/3
            // ucfas[2] = sum(ucfa_s2[i]) / |As(2)| = (1 + 2/3) / 2 = 5/6
            // ucfa = sum(ucfas) / |S| = (2/3 + 5/6) / 2 = 3/4
            // Total UCF
            // UCF = (ucfc + ucfa) / 2 = 0.72916(6)

            // Checking the values with delta rounding error
            const lastEpoch = await tokenomics.getCurrentEpoch() - 1;
            const ucf = Number(await tokenomics.getUCF(lastEpoch) / magicDenominator) * 1.0 / E18;
            expect(Math.abs(ucf - 0.72916666666666)).to.lessThan(delta);
        });
    });


    context("Dispenser", async function () {
        it("Dispenser for an agent owner", async () => {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5];
            const ownerAddress = owner.address;
            const operator = signers[6].address;
            const agentInstance = signers[7].address;

            // Create one agent
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(ownerAddress, ownerAddress, agentHash, description, []);

            // Create one service
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(ownerAddress, name, description, configHash, [agentId],
                [agentParams], maxThreshold);

            // Register agent instances
            await serviceRegistry.connect(serviceManager).activateRegistration(ownerAddress, serviceId, {value: regDeposit});
            await serviceRegistry.connect(serviceManager).registerAgents(operator, serviceId, [agentInstance], [agentId], {value: regBond});

            // Deploy the service
            await serviceRegistry.changeMultisigPermission(gnosisSafeMultisig.address, true);
            await serviceRegistry.connect(serviceManager).deploy(ownerAddress, serviceId, gnosisSafeMultisig.address, payload);

            // Whitelist a service owner
            await tokenomics.changeServiceOwnerWhiteList([ownerAddress], [true]);
            // Send deposits from a service
            await treasury.depositETHFromServices([1], [regServiceRevenue], {value: regServiceRevenue});

            // Get the top up per epoch before the mint happens, such that it correctly reflects the amount
            const topUpPerEpoch = await tokenomics.getTopUpPerEpoch();

            // Calculate current epoch parameters
            await treasury.allocateRewards();

            // Get owner rewards
            const balanceETHBeforeReward = await ethers.provider.getBalance(ownerAddress);
            const tx = await dispenser.connect(owner).withdrawOwnerRewards();
            // Calculate gas cost
            const receipt = await tx.wait();
            const gasCost = Number(receipt.gasUsed) * Number(tx.gasPrice);
            const balanceOLA = await olas.balanceOf(owner.address);
            const balanceETHAfterReward = await ethers.provider.getBalance(ownerAddress);
            //console.log("balanceETHBeforeReward", balanceETHBeforeReward);
            //console.log("gas used", receipt.gasUsed);
            //console.log("gas price", tx.gasPrice);
            //console.log("gas cost", gasCost);
            //console.log("balance OLAS", balanceOLA);
            //console.log("balanceETHAfterReward", balanceETHAfterReward);

            // Check the received reward
            const agentFraction = await tokenomics.agentFraction();
            const expectedRewards = regServiceRevenue * agentFraction / 100;
            // Rewards without gas
            const rewardsNoGas = Number(balanceETHAfterReward) - Number(balanceETHBeforeReward);
            // Rewards with the gas spent for the tx
            const rewardsWithGas = rewardsNoGas + gasCost;
            // Get the absolute difference between expected and received rewards in ETH
            const rewardsDiffETH = Math.abs((Number(expectedRewards) - rewardsWithGas) / E18);
            expect(rewardsDiffETH).to.lessThan(gasDelta);
            // The balance after reward minus the balance before minus the gas must be less than expected reward
            expect(rewardsNoGas).to.lessThan(expectedRewards);

            // Check the top-ups for OLAS
            // Note that regServiceRevenue is not accounted for, since it is equal to sumProfits (1 agent only)
            const topUpOwnerFraction = await tokenomics.topUpOwnerFraction();
            const componentWeight = await tokenomics.componentWeight();
            const agentWeight = await tokenomics.agentWeight();
            let expectedTopUp = topUpPerEpoch * topUpOwnerFraction * agentWeight;
            expectedTopUp /=  100 * (Number(componentWeight) + Number(agentWeight));
            expect(Number(balanceOLA)).to.equal(expectedTopUp);
        });

        it("Dispenser for several agent owners", async () => {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owners = [signers[5], signers[6]];
            const operator = signers[7].address;
            const agentInstances = [signers[8].address, signers[9].address, signers[10].address];
            const serviceOwner = signers[11].address;

            // Create two agents each for their owner
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owners[0].address, owners[0].address, agentHash, description, []);
            await agentRegistry.connect(mechManager).create(owners[1].address, owners[1].address, agentHash1, description, []);

            // Create two services
            const agentIds = [[1, 2], [1]];
            const agentParams1 = [[1, regBond], [1, regBond]];
            const agentParams2 = [[1, regBond]];
            const threshold1 = 2;
            const threshold2 = 1;
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(serviceOwner, name, description, configHash, agentIds[0],
                agentParams1, threshold1);
            await serviceRegistry.connect(serviceManager).createService(serviceOwner, name, description, configHash, agentIds[1],
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

            // Whitelist a service owner
            await tokenomics.changeServiceOwnerWhiteList([serviceOwner], [true]);
            // Send deposits from a service
            await treasury.depositETHFromServices([1, 2], [regServiceRevenue, doubleRegServiceRevenue],
                {value: tripleRegServiceRevenue});

            // Get the top up per epoch before the mint happens, such that it correctly reflects the amount
            const topUpPerEpoch = await tokenomics.getTopUpPerEpoch();

            // Calculate current epoch parameters
            await treasury.allocateRewards();

            // Get owners rewards in ETH
            const balanceETHBeforeReward = [await ethers.provider.getBalance(owners[0].address),
                await ethers.provider.getBalance(owners[1].address)];
            const tx = [await dispenser.connect(owners[0]).withdrawOwnerRewards(),
                await dispenser.connect(owners[1]).withdrawOwnerRewards()];
            // Calculate gas cost
            const receipt = [await tx[0].wait(), await tx[1].wait()];
            const gasCost = [Number(receipt[0].gasUsed) * Number(tx[0].gasPrice),
                Number(receipt[1].gasUsed) * Number(tx[1].gasPrice)];
            // Get OLAS balance
            const balanceOLA = [await olas.balanceOf(owners[0].address), await olas.balanceOf(owners[1].address)];
            // Get ETH balance after rewards
            const balanceETHAfterReward = [await ethers.provider.getBalance(owners[0].address),
                await ethers.provider.getBalance(owners[1].address)];

            // Check the received reward in ETH
            const agentFraction = await tokenomics.agentFraction();
            const expectedRewards = tripleRegServiceRevenue * agentFraction / 100;
            // Rewards without gas
            const rewardsNoGas = [Number(balanceETHAfterReward[0]) - Number(balanceETHBeforeReward[0]),
                Number(balanceETHAfterReward[1]) - Number(balanceETHBeforeReward[1])];
            // Rewards with the gas spent for the tx
            const rewardsWithGas = [rewardsNoGas[0] + gasCost[0], rewardsNoGas[1] + gasCost[1]];
            // Get the absolute difference between expected and received rewards in ETH
            const rewardsDiffETH = Math.abs((Number(expectedRewards) - (rewardsWithGas[0] + rewardsWithGas[1])) / E18);
            expect(rewardsDiffETH).to.lessThan(gasDelta);
            // The balance after reward minus the balance before minus the gas must be less than expected reward
            expect(rewardsNoGas[0] + rewardsNoGas[1]).to.lessThan(expectedRewards);

            // Check the top-ups in OLAS
            // Note that regServiceRevenue is not accounted for, since it is equal to sumProfits (1 agent only)
            const topUpOwnerFraction = await tokenomics.topUpOwnerFraction();
            const componentWeight = await tokenomics.componentWeight();
            const agentWeight = await tokenomics.agentWeight();
            let expectedTopUp = topUpPerEpoch * topUpOwnerFraction * agentWeight;
            expectedTopUp /=  100 * (Number(componentWeight) + Number(agentWeight));
            expect(Number(balanceOLA[0]) + Number(balanceOLA[1])).to.equal(expectedTopUp);
        });

        it("Dispenser for several agent owners and stakers", async () => {
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
            await componentRegistry.connect(mechManager).create(componentOwners[0].address, componentOwners[0].address, componentHash, description, []);
            await componentRegistry.connect(mechManager).create(componentOwners[1].address, componentOwners[1].address, componentHash1, description, []);
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(agentOwners[0].address, agentOwners[0].address, agentHash, description, [1]);
            await agentRegistry.connect(mechManager).create(agentOwners[1].address, agentOwners[1].address, agentHash1, description, [2]);

            // Create two services
            const agentIds = [[1, 2], [1]];
            const agentParams1 = [[1, regBond], [1, regBond]];
            const agentParams2 = [[1, regBond]];
            const threshold1 = 2;
            const threshold2 = 1;
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(serviceOwner, name, description, configHash, agentIds[0],
                agentParams1, threshold1);
            await serviceRegistry.connect(serviceManager).createService(serviceOwner, name, description, configHash, agentIds[1],
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

            // Whitelist a service owner
            await tokenomics.changeServiceOwnerWhiteList([serviceOwner], [true]);

            // Allocate empty rewards during the first epoch
            await treasury.allocateRewards();
            ethers.provider.send("evm_increaseTime", [oneWeek + 10000]);
            const currentBlock = await ethers.provider.getBlock("latest");
            // Mine blocks until the next epoch
            for (let i = currentBlock.number; i < epochLen + currentBlock.number; i++) {
                await ethers.provider.send("evm_mine");
            }

            // Send deposits from a service
            await treasury.depositETHFromServices([1, 2], [regServiceRevenue, doubleRegServiceRevenue],
                {value: tripleRegServiceRevenue});

            // Get the top up per epoch before the mint happens, such that it correctly reflects the amount
            const topUpPerEpoch = await tokenomics.getTopUpPerEpoch();

            // Allocate rewards for the epoch
            await treasury.allocateRewards();
            //console.log("Current epoch", await tokenomics.getCurrentEpoch());

            // Get owners rewards and top-ups for components
            let balanceETHBeforeReward = [await ethers.provider.getBalance(componentOwners[0].address),
                await ethers.provider.getBalance(componentOwners[1].address)];
            let tx = [await dispenser.connect(componentOwners[0]).withdrawOwnerRewards(),
                await dispenser.connect(componentOwners[1]).withdrawOwnerRewards()];
            // Calculate gas cost
            let receipt = [await tx[0].wait(), await tx[1].wait()];
            let gasCost = [Number(receipt[0].gasUsed) * Number(tx[0].gasPrice),
                Number(receipt[1].gasUsed) * Number(tx[1].gasPrice)];
            // Get OLAS balance
            let balanceOLA = [await olas.balanceOf(componentOwners[0].address),
                await olas.balanceOf(componentOwners[1].address)];
            // Get ETH balance after rewards
            let balanceETHAfterReward = [await ethers.provider.getBalance(componentOwners[0].address),
                await ethers.provider.getBalance(componentOwners[1].address)];

            // Check the received reward in ETH for components
            const componentFraction = await tokenomics.componentFraction();
            const expectedComponentRewards = tripleRegServiceRevenue * componentFraction / 100;
            // Rewards without gas
            let rewardsNoGas = [Number(balanceETHAfterReward[0]) - Number(balanceETHBeforeReward[0]),
                Number(balanceETHAfterReward[1]) - Number(balanceETHBeforeReward[1])];
            // Rewards with the gas spent for the tx
            let rewardsWithGas = [rewardsNoGas[0] + gasCost[0], rewardsNoGas[1] + gasCost[1]];
            // Get the absolute difference between expected and received rewards in ETH
            let rewardsDiffETH = Math.abs((Number(expectedComponentRewards) - (rewardsWithGas[0] + rewardsWithGas[1])) / E18);
            expect(rewardsDiffETH).to.lessThan(gasDelta);
            // The balance after reward minus the balance before minus the gas must be less than expected reward
            expect(rewardsNoGas[0] + rewardsNoGas[1]).to.lessThan(expectedComponentRewards);

            // Calculate component top-up sum in OLAS
            const topUpOwnerFraction = await tokenomics.topUpOwnerFraction();
            const componentWeight = await tokenomics.componentWeight();
            const agentWeight = await tokenomics.agentWeight();
            let expectedTopUp = topUpPerEpoch * topUpOwnerFraction * componentWeight;
            expectedTopUp /=  100 * (Number(componentWeight) + Number(agentWeight));
            const diffComponentReward = Number(expectedTopUp) -
                (Number(balanceOLA[0]) + Number(balanceOLA[1]));
            expect(diffComponentReward / E18).to.lessThan(delta);

            // Get owners rewards and top-ups for agents
            balanceETHBeforeReward = [await ethers.provider.getBalance(agentOwners[0].address),
                await ethers.provider.getBalance(agentOwners[1].address)];
            tx = [await dispenser.connect(agentOwners[0]).withdrawOwnerRewards(),
                await dispenser.connect(agentOwners[1]).withdrawOwnerRewards()];
            // Calculate gas cost
            receipt = [await tx[0].wait(), await tx[1].wait()];
            gasCost = [Number(receipt[0].gasUsed) * Number(tx[0].gasPrice),
                Number(receipt[1].gasUsed) * Number(tx[1].gasPrice)];
            // Get OLAS balance
            balanceOLA = [await olas.balanceOf(agentOwners[0].address), await olas.balanceOf(agentOwners[1].address)];
            // Get ETH balance after rewards
            balanceETHAfterReward = [await ethers.provider.getBalance(agentOwners[0].address),
                await ethers.provider.getBalance(agentOwners[1].address)];

            // Check the received reward in ETH for agents
            const agentFraction = await tokenomics.agentFraction();
            const expectedAgentRewards = tripleRegServiceRevenue * agentFraction / 100;
            // Rewards without gas
            rewardsNoGas = [Number(balanceETHAfterReward[0]) - Number(balanceETHBeforeReward[0]),
                Number(balanceETHAfterReward[1]) - Number(balanceETHBeforeReward[1])];
            // Rewards with the gas spent for the tx
            rewardsWithGas = [rewardsNoGas[0] + gasCost[0], rewardsNoGas[1] + gasCost[1]];
            // Get the absolute difference between expected and received rewards in ETH
            rewardsDiffETH = Math.abs((Number(expectedAgentRewards) - (rewardsWithGas[0] + rewardsWithGas[1])) / E18);
            expect(rewardsDiffETH).to.lessThan(gasDelta);
            // The balance after reward minus the balance before minus the gas must be less than expected reward
            expect(rewardsNoGas[0] + rewardsNoGas[1]).to.lessThan(expectedAgentRewards);

            // Calculate agent top-up difference in OLAS with the expected value
            expectedTopUp = topUpPerEpoch * topUpOwnerFraction * agentWeight;
            expectedTopUp /=  100 * (Number(agentWeight) + Number(agentWeight));
            const diffAgentReward = Number(expectedAgentRewards) -
                (Number(balanceOLA[0]) + Number(balanceOLA[1]));
            expect(diffAgentReward / E18).to.lessThan(delta);

            // Withdraw locking and skating by the deployer (considered rewards and top-ups for 1 epoch) and a staker
            balanceETHBeforeReward = [await ethers.provider.getBalance(deployer.address),
                await ethers.provider.getBalance(staker.address)];
            // veOLAS withdraw
            tx = [await ve.withdraw(), await ve.connect(staker).withdraw()];
            // Calculate gas cost
            receipt = [await tx[0].wait(), await tx[1].wait()];
            gasCost = [Number(receipt[0].gasUsed) * Number(tx[0].gasPrice),
                Number(receipt[1].gasUsed) * Number(tx[1].gasPrice)];
            // Staking withdraw
            tx = [await dispenser.connect(deployer).withdrawStakingRewards(),
                await dispenser.connect(staker).withdrawStakingRewards()];
            // Add to the gas cost
            receipt = [await tx[0].wait(), await tx[1].wait()];
            gasCost = [Number(receipt[0].gasUsed) * Number(tx[0].gasPrice) + gasCost[0],
                Number(receipt[1].gasUsed) * Number(tx[1].gasPrice) + gasCost[1]];
            // Get OLAS balance
            balanceOLA = [await olas.balanceOf(deployer.address),
                await olas.balanceOf(staker.address)];
            // Get ETH balance after rewards
            balanceETHAfterReward = [await ethers.provider.getBalance(deployer.address),
                await ethers.provider.getBalance(staker.address)];

            // Staker balance must increase on the stakerFraction amount of the received service revenue
            const stakerFraction = await tokenomics.stakerFraction();
            const expectedStakerRewards = tripleRegServiceRevenue * stakerFraction / 100;
            // Rewards without gas
            rewardsNoGas = [Number(balanceETHAfterReward[0]) - Number(balanceETHBeforeReward[0]),
                Number(balanceETHAfterReward[1]) - Number(balanceETHBeforeReward[1])];
            // Rewards with the gas spent for the tx
            rewardsWithGas = [rewardsNoGas[0] + gasCost[0], rewardsNoGas[1] + gasCost[1]];
            // Get the absolute difference between expected and received rewards in ETH
            rewardsDiffETH = Math.abs((Number(expectedStakerRewards) - (rewardsWithGas[0] + rewardsWithGas[1])) / E18);
            expect(rewardsDiffETH).to.lessThan(gasDelta);
            // The balance after reward minus the balance before minus the gas must be less than expected reward
            expect(rewardsNoGas[0] + rewardsNoGas[1]).to.lessThan(expectedStakerRewards);


            // Calculate component top-up sum in OLAS
            const topUpStakerFraction = await tokenomics.topUpStakerFraction();
            expectedTopUp = topUpPerEpoch * topUpStakerFraction / 100;
            const sumBalance = Number(balanceOLA[0]) + Number(balanceOLA[1]);
            // Calculate balance after staking was received minus the initial OLAS balance minus the expected reward in ETH
            const balanceDiff = (sumBalance - Number(initialMint) - Number(expectedTopUp)) / E18;
            expect(Math.abs(balanceDiff)).to.lessThan(delta);
        });
    });

    context("Tokenomics full life cycle", async function () {
        it("Performance of two epochs, checks for OLAS top-ups only", async () => {
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
            const minAmountOLA =  "5" + "0".repeat(2) + decimals;
            const amountDAI = "1" + "0".repeat(4) + decimals;
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
            await componentRegistry.connect(mechManager).create(componentOwners[0].address, componentOwners[0].address, componentHash, description, []);
            await componentRegistry.connect(mechManager).create(componentOwners[1].address, componentOwners[1].address, componentHash1, description, []);
            await componentRegistry.connect(mechManager).create(componentOwners[2].address, componentOwners[2].address, componentHash2, description, []);
            await componentRegistry.connect(mechManager).create(componentOwners[3].address, componentOwners[3].address, configHash2, description, []);
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(agentOwners[0].address, agentOwners[0].address, agentHash, description, [1, 2]);
            await agentRegistry.connect(mechManager).create(agentOwners[1].address, agentOwners[1].address, agentHash1, description, [2]);
            await agentRegistry.connect(mechManager).create(agentOwners[2].address, agentOwners[2].address, agentHash2, description, [3]);

            // Create 2 services
            const agentIds = [[1, 2], [1, 3]];
            const agentParams = [[1, regBond], [1, regBond]];
            const threshold = 2;
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds[0],
                agentParams, threshold);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash1, agentIds[1],
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

            // Whitelist a service owner
            await tokenomics.changeServiceOwnerWhiteList([owner], [true]);

            // Allocate empty rewards during the first epoch
            await treasury.allocateRewards();
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
            await depository.create(pairODAI.address, supplyProductOLA, vesting);
            const productId = 0;
            expect(await depository.isActive(pairODAI.address, productId)).to.equal(true);

            // Get the top up per epoch before the mint happens, such that it correctly reflects the amount
            let topUpPerEpoch = await tokenomics.getTopUpPerEpoch();

            // !!!!!!!!!!!!!!!!!!    EPOCH 1    !!!!!!!!!!!!!!!!!!!!
            await treasury.allocateRewards();

            // Calculation of ucfc
            // ucfc[1] = 1, ucfc[2] = 1, ucfc[3] = 2/3
            // |Cs(1)| = 2, |Cs(2)| = 3
            // ucfcs[1] = sum(ucfc_s1[i]) / |Cs(1)| = (1 + 1) / 2 = 1
            // ucfcs[2] = sum(ucfc_s2[i]) / |Cs(2)| = (1 + 1 + 2/3) / 3 = 8/9
            // ucfc = sum(ucfas) / |S| = (8/9 + 1) / 2 = 17/18
            // Since not all components are engaged:
            // ucfc = ucfc * |Cref| / |Ctotal| = ucfc * 3 / 4 = 17/24
            // Calculation of ucfa
            // ucfa[1] = 1, ucfa[2] = 1/3, ucfa[3] = 2/3
            // |As(1)| = 2, |As(2)| = 2
            // ucfas[1] = sum(ucfa_s1[i]) / |As(1)| = (1 + 1/3) / 2 = 2/3
            // ucfas[2] = sum(ucfa_s2[i]) / |As(2)| = (1 + 2/3) / 2 = 5/6
            // ucfa = sum(ucfas) / |S| = (2/3 + 5/6) / 2 = 3/4
            // Total UCF
            // UCF = (ucfc + ucfa) / 2 = 0.72916(6)

            // Checking the values with delta rounding error of UCF, DF
            let lastEpoch = await tokenomics.getCurrentEpoch() - 1;
            let ucf = Number(await tokenomics.getUCF(lastEpoch) / magicDenominator) * 1.0 / E18;
            expect(Math.abs(ucf - 0.72916666666666)).to.lessThan(delta);

            // f(K(e), D(e)) = d * k * K(e) + d * D(e)
            // Default treasury reward is 0, so K(e) = 0
            // New components = 3, new agents = 3
            // d = 3 + 3 = 6
            // New agent and component owners = 6
            // D(e) = 6
            // f(K, D) = 6 * 6
            // df = (f(K, D) / 100) + 1 = 0.36 + 1 = 1.36
            const df = Number(await tokenomics.getDF(lastEpoch)) * 1.0 / E18;
            expect(Math.abs(df - 1.36)).to.lessThan(delta);

            // Get owners top-ups
            // We have 4 components
            let balanceComponentOwner = new Array(4);
            for (let i = 0; i < 4; i++) {
                await dispenser.connect(componentOwners[i]).withdrawOwnerRewards();
                balanceComponentOwner[i] = await olas.balanceOf(componentOwners[i].address);
            }

            // 3 agents
            let balanceAgentOwner = new Array(3);
            for (let i = 0; i < 3; i++) {
                await dispenser.connect(agentOwners[i]).withdrawOwnerRewards();
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
            const amountToBond = new ethers.BigNumber.from(await pairODAI.balanceOf(deployer.address)).div(3);
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

            // Whitelist a service owner
            await tokenomics.changeServiceOwnerWhiteList([owner], [true]);
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
            await treasury.allocateRewards();

            // Checking the values of tokenomics parameters with delta rounding error
            lastEpoch = await tokenomics.getCurrentEpoch() - 1;
            ucf = Number(await tokenomics.getUCF(lastEpoch) / magicDenominator) * 1.0 / E18;
            expect(Math.abs(ucf - 0.70833333333333)).to.lessThan(delta);

            // Get owners rewards
            // We have 4 components
            balanceComponentOwner = new Array(4);
            for (let i = 0; i < 4; i++) {
                await dispenser.connect(componentOwners[i]).withdrawOwnerRewards();
                balanceComponentOwner[i] = Number(await olas.balanceOf(componentOwners[i].address));
            }

            // 3 agents
            balanceAgentOwner = new Array(3);
            for (let i = 0; i < 3; i++) {
                await dispenser.connect(agentOwners[i]).withdrawOwnerRewards();
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

            // Withdraw skating by the deployer (considered rewards for 1 epoch) and a staker
            ethers.provider.send("evm_increaseTime", [oneWeek + 10000]);
            currentBlock = await ethers.provider.getBlock("latest");
            // Mine one block to update the time
            await ethers.provider.send("evm_mine");
            await ve.withdraw();
            await ve.connect(staker).withdraw();
            await dispenser.connect(deployer).withdrawStakingRewards();
            await dispenser.connect(staker).withdrawStakingRewards();

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
