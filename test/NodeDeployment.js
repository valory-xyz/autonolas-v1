/*global ethers, describe, it*/

describe("Node deployment", function () {
    it("Deployment flow", async function () {
        // Common parameters
        const AddressZero = ethers.constants.AddressZero;

        // Test address, IPFS hashes and descriptions for components and agents
        const testAddress = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";
        const compHs = ["0x" + "9".repeat(64), "0x" + "1".repeat(64), "0x" + "2".repeat(64)];
        const agentHs = ["0x" + "3".repeat(62) + "11", "0x" + "4".repeat(62) + "11"];
        const configHash = "0x" + "5".repeat(62) + "22";

        // Safe related
        const safeThreshold = 7;
        const nonce =  0;
        const payload = "0x";

        // Initial OLAS supply of 1 million
        const initialMint = "1" + "0".repeat(24);
        const decimals = "0".repeat(18);
        // Lock-related parameters
        const oneWeek = 7 * 86400;
        const oneYear = 365 * 86400;
        const numSteps = 4;

        // Governance related
        const minDelay = 1;
        const initialVotingDelay = 1; // blocks
        const initialVotingPeriod = 45818; // blocks ±= 1 week
        const initialProposalThreshold = 0; // voting power
        const quorum = 1; // quorum factor

        // Tokenomics related
        const oneMonth = 86400 * 30;
        const epochLen = oneMonth;
        const supplyProductOLAS =  "20" + decimals;
        const vesting = oneWeek;
        const maxNumClaimingEpochs = 10;
        const maxNumStakingTargets = 100;
        const defaultMinStakingWeight = 100;
        const defaultMaxStakingIncentive = ethers.utils.parseEther("1");
        const retainer = "0x" + "0".repeat(24) + "5".repeat(40);

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
        // 0 for component, 1 for agent
        await registriesManager.create(0, testAddress, compHs[0], []);
        await registriesManager.create(1, testAddress, agentHs[0], [1]);
        await registriesManager.create(0, testAddress, compHs[1], [1]);
        await registriesManager.create(0, testAddress, compHs[2], [1, 2]);
        await registriesManager.create(1, testAddress, agentHs[1], [1, 2, 3]);
        const componentBalance = await componentRegistry.balanceOf(testAddress);
        const agentBalance = await agentRegistry.balanceOf(testAddress);
        console.log("Owner of minted components and agents:", testAddress);
        console.log("Number of initial components:", Number(componentBalance));
        console.log("Number of initial agents:", Number(agentBalance));

        // Gnosis Safe deployment
        const GnosisSafe = await ethers.getContractFactory("GnosisSafe");
        const gnosisSafe = await GnosisSafe.deploy();
        await gnosisSafe.deployed();

        const GnosisSafeProxyFactory = await ethers.getContractFactory("GnosisSafeProxyFactory");
        const gnosisSafeProxyFactory = await GnosisSafeProxyFactory.deploy();
        await gnosisSafeProxyFactory.deployed();

        const bytecode = await ethers.provider.getCode(gnosisSafe.address);
        const bytecodeHash = ethers.utils.keccak256(bytecode);

        const GnosisSafeMultisig = await ethers.getContractFactory("GnosisSafeMultisig");
        const gnosisSafeMultisig = await GnosisSafeMultisig.deploy(gnosisSafe.address, gnosisSafeProxyFactory.address);
        await gnosisSafeMultisig.deployed();

        const GnosisSafeSameAddressMultisig = await ethers.getContractFactory("GnosisSafeSameAddressMultisig");
        const gnosisSafeSameAddressMultisig = await GnosisSafeSameAddressMultisig.deploy(bytecodeHash);
        await gnosisSafeSameAddressMultisig.deployed();

        // Creating and updating a service
        const regBond = 1000;
        const regDeposit = 1000;
        const agentIds = [1];
        const agentParams = [[4, regBond]];
        const maxThreshold = agentParams[0][0];
        const serviceId = 1;

        const ServiceRegistry = await ethers.getContractFactory("ServiceRegistry");
        const serviceRegistry = await ServiceRegistry.deploy("service registry", "SERVICE", "https://localhost/service/",
            agentRegistry.address);
        await serviceRegistry.deployed();

        const ServiceManager = await ethers.getContractFactory("ServiceManager");
        const serviceManager = await ServiceManager.deploy(serviceRegistry.address);
        await serviceManager.deployed();

        console.log("ServiceRegistry deployed to:", serviceRegistry.address);
        console.log("ServiceManager deployed to:", serviceManager.address);

        // Create a service
        await serviceRegistry.changeManager(deployer.address);
        await serviceRegistry.create(testAddress, configHash, agentIds, agentParams, maxThreshold);
        console.log("Service is created");

        // Register agents
        await serviceRegistry.activateRegistration(testAddress, serviceId, {value: regDeposit});
        // Owner / deployer is the operator of agent instances as well
        await serviceRegistry.registerAgents(operator.address, serviceId, agentInstances, [1, 1, 1, 1], {value: 4*regBond});

        // Whitelist gnosis multisig implementations
        await serviceRegistry.changeMultisigPermission(gnosisSafeMultisig.address, true);
        await serviceRegistry.changeMultisigPermission(gnosisSafeSameAddressMultisig.address, true);
        // Deploy the service
        const safe = await serviceRegistry.deploy(testAddress, serviceId, gnosisSafeMultisig.address, payload);
        const result = await safe.wait();
        const multisig = result.events[0].address;
        console.log("Service multisig deployed to:", multisig);
        console.log("Number of agent instances:", agentInstances.length);

        // Verify the deployment of the created Safe: checking threshold and owners
        const proxyContract = await ethers.getContractAt("GnosisSafe", multisig);
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
        const setupData = gnosisSafe.interface.encodeFunctionData(
            "setup",
            // signers, threshold, to_address, data, fallback_handler, payment_token, payment, payment_receiver
            [safeSigners, safeThreshold, AddressZero, "0x", AddressZero, AddressZero, 0, AddressZero]
        );
        const safeContracts = require("@gnosis.pm/safe-contracts");
        const proxyAddress = await safeContracts.calculateProxyAddress(gnosisSafeProxyFactory, gnosisSafe.address,
            setupData, nonce);
        await gnosisSafeProxyFactory.createProxyWithNonce(gnosisSafe.address, setupData, nonce).then((tx) => tx.wait());

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

        const WVE = await ethers.getContractFactory("wveOLAS");
        const wve = await WVE.deploy(ve.address, olas.address);
        await wve.deployed();
        console.log("Wrapped veOLAS deployed to", wve.address);

        // Deploy timelock with a multisig being a proposer
        const executors = [];
        const proposers = [proxyAddress];
        const Timelock = await ethers.getContractFactory("Timelock");
        const timelock = await Timelock.deploy(minDelay, proposers, executors);
        await timelock.deployed();
        console.log("Timelock deployed to", timelock.address);

        // Deploy Governor OLAS pointing to the wrapped veOLAS token
        const GovernorOLAS = await ethers.getContractFactory("GovernorOLAS");
        const governor = await GovernorOLAS.deploy(wve.address, timelock.address, initialVotingDelay,
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

        // Mint the initial OLAS supply for the deployer contract
        await olas.mint(deployer.address, initialMint);
        // Approve deployer for veOLAS and buOLAS
        await olas.connect(deployer).approve(ve.address, ethers.constants.MaxUint256);
        await olas.connect(deployer).approve(bu.address, ethers.constants.MaxUint256);

        // Create lockable balances for the testAddress
        // 50k OLAS for veOLAS lock
        const balanceVE = "5" + "0".repeat(22);
        // 100k OLAS for buOLAS lock
        const balanceBU = "1" + "0".repeat(23);
        await ve.createLockFor(testAddress, balanceVE, oneYear);
        await bu.createLockFor(testAddress, balanceBU, numSteps);

        // Send some ETH to the testAddress1
        const testAddress1 = "0xB618970Ff99562D0D27b756256b7da55A16b9d0b";
        await deployer.sendTransaction({to: testAddress1, value: ethers.utils.parseEther("1000")});

        const DonatorBlacklist = await ethers.getContractFactory("DonatorBlacklist");
        const donatorBlacklist = await DonatorBlacklist.deploy();
        await donatorBlacklist.deployed();

        // Deploy master tokenomics contract
        const Tokenomics = await ethers.getContractFactory("Tokenomics");
        const tokenomicsMaster = await Tokenomics.deploy();
        await tokenomicsMaster.deployed();

        // Correct treasury, depository and dispenser addresses are missing here, they will be defined below
        const proxyData = tokenomicsMaster.interface.encodeFunctionData("initializeTokenomics",
            [olas.address, deployer.address, deployer.address, deployer.address, ve.address, epochLen,
                componentRegistry.address, agentRegistry.address, serviceRegistry.address, donatorBlacklist.address]);
        // Deploy tokenomics proxy based on the needed tokenomics initialization
        const TokenomicsProxy = await ethers.getContractFactory("TokenomicsProxy");
        const tokenomicsProxy = await TokenomicsProxy.deploy(tokenomicsMaster.address, proxyData);
        await tokenomicsProxy.deployed();

        // Get the tokenomics proxy contract
        const tokenomics = await ethers.getContractAt("Tokenomics", tokenomicsProxy.address);

        // Correct depository address is missing here, it will be defined just one line below
        const Treasury = await ethers.getContractFactory("Treasury");
        const treasury = await Treasury.deploy(olas.address, tokenomics.address, deployer.address, deployer.address);
        await treasury.deployed();
        // Deploy generic bond calculator contract
        const GenericBondCalculator = await ethers.getContractFactory("GenericBondCalculator");
        const genericBondCalculator = await GenericBondCalculator.deploy(olas.address, tokenomics.address);
        await genericBondCalculator.deployed();
        // Deploy depository contract
        const Depository = await ethers.getContractFactory("Depository");
        const depository = await Depository.deploy(olas.address, tokenomics.address, treasury.address,
            genericBondCalculator.address);
        await depository.deployed();
        // Deploy dispenser contract
        const Dispenser = await ethers.getContractFactory("Dispenser");
        const dispenser = await Dispenser.deploy(olas.address, tokenomics.address, treasury.address, deployer.address,
            retainer, maxNumClaimingEpochs, maxNumStakingTargets, defaultMinStakingWeight, defaultMaxStakingIncentive);
        await dispenser.deployed();
        // Change to the correct addresses
        await tokenomics.changeManagers(treasury.address, depository.address, dispenser.address);
        await treasury.changeManagers(AddressZero, depository.address, dispenser.address);

        // Change minter to the treasury address
        await olas.changeMinter(treasury.address);

        // Deploy DAI token
        const dai = await OLAS.deploy();
        await dai.deployed();
        console.log("DAI token deployed to", olas.address);
        // Airdrop of DAI to deployer
        await dai.mint(deployer.address, initialMint);

        // WETH contract deployment
        const WETH = await ethers.getContractFactory("WETH9");
        const weth = await WETH.deploy();
        await weth.deployed();

        // Deploy Uniswap factory
        const Factory = await ethers.getContractFactory("UniswapV2Factory");
        const factory = await Factory.deploy(deployer.address);
        await factory.deployed();

        // Deploy Router02
        const Router = await ethers.getContractFactory("UniswapV2Router02");
        const router = await Router.deploy(factory.address, weth.address);
        await router.deployed();

        // Create OLAS-DAI pair
        await factory.createPair(olas.address, dai.address);
        const pairAddress = await factory.allPairs(0);
        const pairODAI = await ethers.getContractAt("UniswapV2Pair", pairAddress);

        // Add liquidity
        const amountOLAS = "5"  + "0".repeat(3) + decimals;
        const amountDAI = "5" + "0".repeat(3) + decimals;
        const minAmountOLA =  "5" + "0".repeat(2) + decimals;
        const minAmountDAI = "1" + "0".repeat(3) + decimals;
        const deadline = Date.now() + 1000;
        const toAddress = deployer.address;
        await olas.approve(router.address, ethers.constants.MaxUint256);
        await dai.approve(router.address, ethers.constants.MaxUint256);

        await router.connect(deployer).addLiquidity(
            dai.address,
            olas.address,
            amountDAI,
            amountOLAS,
            minAmountDAI,
            minAmountOLA,
            toAddress,
            deadline
        );

        // Enable LP token of OLAS-DAI pair
        await treasury.enableToken(pairODAI.address);
        // Create a bonding product
        const priceLP = await depository.getCurrentPriceLP(pairODAI.address);
        await depository.create(pairODAI.address, priceLP, supplyProductOLAS, vesting);

        // Send half of the balance from deployer to the test address
        const amountTo = new ethers.BigNumber.from(await pairODAI.balanceOf(deployer.address)).div(2);
        await pairODAI.connect(deployer).transfer(testAddress, amountTo);
    });
});
