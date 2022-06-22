/*global ethers, describe, it*/

const { expect } = require("chai");

describe("Node deployment", function () {
    it("Deployment flow", async function () {
        // Common parameters
        const AddressZero = "0x" + "0".repeat(40);

        // Test address, IPFS hashes and descriptions for components and agents
        const testAddress = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";
        const compHs = [{hash: "0x" + "0".repeat(64), hashFunction: "0x12", size: "0x20"},
            {hash: "0x" + "1".repeat(64), hashFunction: "0x12", size: "0x20"},
            {hash: "0x" + "2".repeat(64), hashFunction: "0x12", size: "0x20"}];
        const agentHs = [{hash: "0x" + "3".repeat(62) + "11", hashFunction: "0x12", size: "0x20"},
            {hash: "0x" + "4".repeat(62) + "11", hashFunction: "0x12", size: "0x20"}];
        const compDs = ["Component 1", "Component 2", "Component 3"];
        const agentDs = ["Agent 1", "Agent 2"];
        const configHash = {hash: "0x" + "5".repeat(62) + "22", hashFunction: "0x12", size: "0x20"};

        // Safe related
        const safeThreshold = 7;
        const nonce =  0;
        const payload = "0x";

        // Initial OLAS supply of 1 million
        const initialMint = "1" + "0".repeat(24);
        // Lock-related parameters
        const oneYear = 365 * 86400;
        const numSteps = 4;

        // Governance related
        const minDelay = 1;
        const initialVotingDelay = 1; // blocks
        const initialVotingPeriod = 45818; // blocks ±= 1 week
        const initialProposalThreshold = 0; // voting power
        const quorum = 1; // quorum factor

        const signers = await ethers.getSigners();
        const deployer = signers[0];
        const operator = signers[10];
        const agentInstances = [signers[0].address, signers[1].address, signers[2].address, signers[3].address];
        console.log("Deploying contracts with the account:", deployer.address);
        console.log("Account balance:", (await deployer.getBalance()).toString());

        // Deploying component registry
        const ComponentRegistry = await ethers.getContractFactory("ComponentRegistry");
        const componentRegistry = await ComponentRegistry.deploy("agent components", "MECHCOMP",
            "https://localhost/component/");
        await componentRegistry.deployed();

        // Deploying agent registry
        const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
        const agentRegistry = await AgentRegistry.deploy("agent", "MECH", "https://localhost/agent/",
            componentRegistry.address);
        await agentRegistry.deployed();

        // Deploying minter
        const RegistriesManager = await ethers.getContractFactory("RegistriesManager");
        const registriesManager = await RegistriesManager.deploy(componentRegistry.address, agentRegistry.address);
        await registriesManager.deployed();

        console.log("ComponentRegistry deployed to:", componentRegistry.address);
        console.log("AgentRegistry deployed to:", agentRegistry.address);
        console.log("RegistriesManager deployed to:", registriesManager.address);

        // Whitelisting minter in component and agent registry
        await componentRegistry.changeManager(registriesManager.address);
        await agentRegistry.changeManager(registriesManager.address);
        console.log("Whitelisted RegistriesManager addresses to both ComponentRegistry and AgentRegistry contract instances");

        // Create 3 components and two agents based on defined component and agent hashes
        await registriesManager.mintComponent(testAddress, testAddress, compHs[0], compDs[0], []);
        await registriesManager.mintAgent(testAddress, testAddress, agentHs[0], agentDs[0], [1]);
        await registriesManager.mintComponent(testAddress, testAddress, compHs[1], compDs[1], [1]);
        await registriesManager.mintComponent(testAddress, testAddress, compHs[2], compDs[2], [1, 2]);
        await registriesManager.mintAgent(testAddress, testAddress, agentHs[1], agentDs[1], [1, 2, 3]);
        const componentBalance = await componentRegistry.balanceOf(testAddress);
        const agentBalance = await agentRegistry.balanceOf(testAddress);
        console.log("Owner of minted components and agents:", testAddress);
        console.log("Number of initial components:", Number(componentBalance));
        console.log("Number of initial agents:", Number(agentBalance));

        // Gnosis Safe deployment
        const GnosisSafeL2 = await ethers.getContractFactory("GnosisSafeL2");
        const gnosisSafeL2 = await GnosisSafeL2.deploy();
        await gnosisSafeL2.deployed();

        const GnosisSafeProxyFactory = await ethers.getContractFactory("GnosisSafeProxyFactory");
        const gnosisSafeProxyFactory = await GnosisSafeProxyFactory.deploy();
        await gnosisSafeProxyFactory.deployed();

        const GnosisSafeMultisig = await ethers.getContractFactory("GnosisSafeMultisig");
        const gnosisSafeMultisig = await GnosisSafeMultisig.deploy(gnosisSafeL2.address, gnosisSafeProxyFactory.address);
        await gnosisSafeMultisig.deployed();

        // Creating and updating a service
        const name = "service name";
        const description = "service description";
        const regBond = 1000;
        const regDeposit = 1000;
        const agentIds = [1];
        const agentParams = [[4, regBond]];
        const maxThreshold = agentParams[0][0];
        const serviceId = 1;

        const ServiceRegistry = await ethers.getContractFactory("ServiceRegistry");
        const serviceRegistry = await ServiceRegistry.deploy("service registry", "SERVICE", agentRegistry.address);
        await serviceRegistry.deployed();

        const ServiceManager = await ethers.getContractFactory("ServiceManager");
        // Treasury address is irrelevant at the moment
        const serviceManager = await ServiceManager.deploy(serviceRegistry.address, deployer.address);
        await serviceManager.deployed();

        console.log("ServiceRegistry deployed to:", serviceRegistry.address);
        console.log("ServiceManager deployed to:", serviceManager.address);

        // Create a service
        await serviceRegistry.changeManager(deployer.address);
        await serviceRegistry.create(testAddress, name, description, configHash, agentIds, agentParams,
            maxThreshold);
        console.log("Service is created");

        // Register agents
        await serviceRegistry.activateRegistration(testAddress, serviceId, {value: regDeposit});
        // Owner / deployer is the operator of agent instances as well
        await serviceRegistry.registerAgents(operator.address, serviceId, agentInstances, [1, 1, 1, 1], {value: 4*regBond});

        // Whitelist gnosis multisig implementation
        await serviceRegistry.changeMultisigPermission(gnosisSafeMultisig.address, true);
        // Deploy the service
        const safe = await serviceRegistry.deploy(testAddress, serviceId, gnosisSafeMultisig.address, payload);
        const result = await safe.wait();
        const multisig = result.events[0].address;
        console.log("Service multisig deployed to:", multisig);
        console.log("Number of agent instances:", agentInstances.length);

        // Verify the deployment of the created Safe: checking threshold and owners
        const proxyContract = await ethers.getContractAt("GnosisSafeL2", multisig);
        if (await proxyContract.getThreshold() != maxThreshold) {
            throw new Error("incorrect threshold");
        }
        for (const aInstance of agentInstances) {
            const isOwner = await proxyContract.isOwner(aInstance);
            if (!isOwner) {
                throw new Error("incorrect agent instance");
            }
        }

        // Give service manager rights to the corresponding contract
        await serviceRegistry.changeManager(serviceManager.address);

        // Deploy safe multisig for the governance
        const safeSigners = signers.slice(11, 20).map(
            function (currentElement) {
                return currentElement.address;
            }
        );
        const setupData = gnosisSafeL2.interface.encodeFunctionData(
            "setup",
            // signers, threshold, to_address, data, fallback_handler, payment_token, payment, payment_receiver
            [safeSigners, safeThreshold, AddressZero, "0x", AddressZero, AddressZero, 0, AddressZero]
        );
        const safeContracts = require("@gnosis.pm/safe-contracts");
        const proxyAddress = await safeContracts.calculateProxyAddress(gnosisSafeProxyFactory, gnosisSafeL2.address,
            setupData, nonce);
        await gnosisSafeProxyFactory.createProxyWithNonce(gnosisSafeL2.address, setupData, nonce).then((tx) => tx.wait());

        // Deploying governance contracts
        // Deploy OLAS token and veOLAS
        const OLAS = await ethers.getContractFactory("OLAS");
        const olas = await OLAS.deploy();
        await olas.deployed();
        console.log("OLAS token deployed to", olas.address);

        const VE = await ethers.getContractFactory("veOLAS");
        const ve = await VE.deploy(olas.address, "Voting Escrow OLAS", "veOLAS");
        await ve.deployed();
        console.log("Voting Escrow OLAS deployed to", ve.address);

        // Deploy timelock with a multisig being a proposer
        const executors = [];
        const proposers = [proxyAddress];
        const Timelock = await ethers.getContractFactory("Timelock");
        const timelock = await Timelock.deploy(minDelay, proposers, executors);
        await timelock.deployed();
        console.log("Timelock deployed to", timelock.address);

        // Deploy Governor OLAS
        const GovernorOLAS = await ethers.getContractFactory("GovernorOLAS");
        const governor = await GovernorOLAS.deploy(ve.address, timelock.address, initialVotingDelay,
            initialVotingPeriod, initialProposalThreshold, quorum);
        await governor.deployed();
        console.log("Governor OLAS deployed to", governor.address);

        // Change the admin role from deployer to governor
        const adminRole = ethers.utils.id("TIMELOCK_ADMIN_ROLE");
        await timelock.connect(deployer).grantRole(adminRole, governor.address);
        await timelock.connect(deployer).renounceRole(adminRole, deployer.address);

        // Deploy buOLAS contract
        const BU = await ethers.getContractFactory("buOLAS");
        const bu = await BU.deploy(olas.address, "Lockable OLAS", "buOLAS");
        await bu.deployed();
        console.log("buOLAS deployed to", bu.address);
        console.log("!!!!!!!!!!OALS from buOLAS", await bu.token());

        // Deploy  Sale contracts
        const SALE = await ethers.getContractFactory("Sale");
        const sale = await SALE.deploy(olas.address, ve.address, bu.address);
        await sale.deployed();
        console.log("Sale deployed to", sale.address);

        // Mint the initial OLAS supply for the Sale contract
        await olas.mint(sale.address, initialMint);

        // Create lockable balances for the testAddress
        // 50k OLAS for veOLAS lock
        const balanceVE = "5" + "0".repeat(22);
        // 100k OLAS for buOLAS lock
        const balanceBU = "1" + "0".repeat(23);
        await sale.createBalancesFor([testAddress], [balanceVE], [oneYear], [testAddress], [balanceBU], [numSteps]);

        const balances = await sale.claimableBalances(testAddress);
        expect(balances.veBalance).to.equal(balanceVE);
        expect(balances.buBalance).to.equal(balanceBU);
    });
});
