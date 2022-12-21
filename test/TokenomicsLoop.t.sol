pragma solidity 0.8.17;

import "@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol";
import "@gnosis.pm/safe-contracts/contracts/proxies/GnosisSafeProxyFactory.sol";
import "forge-std/Test.sol";
import "./utils/Utils.sol";
import "../lib/autonolas-governance/contracts/OLAS.sol";
import "../lib/autonolas-governance/contracts/veOLAS.sol";
import "../lib/autonolas-registries/contracts/AgentRegistry.sol";
import "../lib/autonolas-registries/contracts/ComponentRegistry.sol";
import "../lib/autonolas-registries/contracts/RegistriesManager.sol";
import "../lib/autonolas-registries/contracts/ServiceRegistry.sol";
import "../lib/autonolas-registries/contracts/ServiceManager.sol";
import "../lib/autonolas-registries/contracts/multisigs/GnosisSafeMultisig.sol";
import "../lib/autonolas-tokenomics/contracts/Depository.sol";
import "../lib/autonolas-tokenomics/contracts/Dispenser.sol";
import "../lib/autonolas-tokenomics/contracts/GenericBondCalculator.sol";
import "../lib/autonolas-tokenomics/contracts/Tokenomics.sol";
import "../lib/autonolas-tokenomics/contracts/TokenomicsProxy.sol";
import "../lib/autonolas-tokenomics/contracts/Treasury.sol";

contract BaseSetup is Test {
    Utils internal utils;
    OLAS internal olas;
    veOLAS internal ve;
    OLAS internal dai;
    ComponentRegistry internal componentRegistry;
    AgentRegistry internal agentRegistry;
    ServiceRegistry internal serviceRegistry;
    RegistriesManager internal registriesManager;
    ServiceManager internal serviceManager;
    GnosisSafe internal gnosisSafe;
    GnosisSafeProxyFactory internal gnosisSafeProxyFactory;
    GnosisSafeMultisig internal gnosisSafeMultisig;
    Depository internal depository;
    Dispenser internal dispenser;
    Treasury internal treasury;
    Tokenomics internal tokenomics;
    GenericBondCalculator internal genericBondCalculator;

    uint32[] internal emptyArray32;
    uint32[] internal agent1Components;
    uint32[] internal agent2Components;
    uint32[] internal agent3Components;
    address payable[] internal users;
    address[] internal agentInstancesService1;
    address[] internal agentInstancesService2;
    address[] internal componentOwners;
    address[] internal agentOwners;
    uint256[] internal serviceIds;
    uint256[] internal serviceAmounts;
    address internal deployer;
    address internal serviceOwner;
    address internal operator;
    uint256 internal initialMint = 50_000_000e18;
    uint256 internal largeApproval = 1_000_000_000e18;
    uint256 internal epochLen = 1 weeks;
    uint256 internal oneYear = 365 * 24 * 3600;
    uint32 internal threshold = 2;
    uint96 internal regBond = 1000;
    uint256 internal regDeposit = 1000;

    bytes32 internal unitHash = 0x9999999999999999999999999999999999999999999999999999999999999999;
    bytes internal payload;
    uint32[][] internal agentIds;

    function setUp() public virtual {
        emptyArray32 = new uint32[](0);
        agent1Components = new uint32[](2);
        (agent1Components[0], agent1Components[1]) = (1, 2);
        agent2Components = new uint32[](1);
        agent2Components[0] = 2;
        agent3Components = new uint32[](1);
        agent3Components[0] = 3;
        agentIds = new uint32[][](2);
        agentIds[0] = new uint32[](2);
        (agentIds[0][0], agentIds[0][1]) = (1, 2);
        agentIds[1] = new uint32[](2);
        (agentIds[1][0], agentIds[1][1]) = (1, 3);

        utils = new Utils();
        users = utils.createUsers(50);
        deployer = users[0];
        vm.label(deployer, "Deployer");
        serviceOwner = users[3];
        operator = users[4];
        // There are 2 agent instances in each service
        agentInstancesService1 = new address[](2);
        for (uint256 i = 0; i < 2; ++i) {
            agentInstancesService1[i] = users[i + 5];
        }
        agentInstancesService2 = new address[](2);
        for (uint256 i = 0; i < 2; ++i) {
            agentInstancesService2[i] = users[i + 7];
        }
        // There are 4 component owners
        componentOwners = new address[](4);
        for (uint256 i = 0; i < 4; ++i) {
            componentOwners[i] = users[i + 11];
        }
        // There are 3 agent owners
        agentOwners = new address[](3);
        for (uint256 i = 0; i < 3; ++i) {
            agentOwners[i] = users[i + 15];
        }
        // There are 2 service amounts field for donating to each service
        serviceAmounts = new uint256[](2);
        serviceIds = new uint256[](2);
        (serviceIds[0], serviceIds[1]) = (1, 2);

        // Deploying registries contracts
        componentRegistry = new ComponentRegistry("Component Registry", "COMPONENT", "https://localhost/component/");
        agentRegistry = new AgentRegistry("Agent Registry", "AGENT", "https://localhost/agent/", address(componentRegistry));
        serviceRegistry = new ServiceRegistry("Service Registry", "SERVICE", "https://localhost/service/", address(agentRegistry));
        registriesManager = new RegistriesManager(address(componentRegistry), address(agentRegistry));
        serviceManager = new ServiceManager(address(serviceRegistry));

        // Deploying multisig contracts and multisig implementation
        gnosisSafe = new GnosisSafe();
        gnosisSafeProxyFactory = new GnosisSafeProxyFactory();
        gnosisSafeMultisig = new GnosisSafeMultisig(payable(address(gnosisSafe)), address(gnosisSafeProxyFactory));

        // Deploying tokens contracts
        olas = new OLAS();
        olas.mint(deployer, initialMint);
        olas.mint(serviceOwner, initialMint);
        dai = new OLAS();
        dai.mint(deployer, initialMint);
        ve = new veOLAS(address(olas), "Voting Escrow OLAS", "veOLAS");

        // Deploying tokenomics contracts
        Tokenomics tokenomicsMaster = new Tokenomics();
        // Correct treasury, depository and dispenser addresses are missing here, they will be defined below
        bytes memory proxyData = abi.encodeWithSelector(tokenomicsMaster.initializeTokenomics.selector,
            address(olas), deployer, deployer, deployer, address(ve), epochLen,
            address(componentRegistry), address(agentRegistry), address(serviceRegistry), address(0));
        TokenomicsProxy tokenomicsProxy = new TokenomicsProxy(address(tokenomicsMaster), proxyData);
        tokenomics = Tokenomics(address(tokenomicsProxy));

        // Correct depository address is missing here, it will be defined just one line below
        treasury = new Treasury(address(olas), deployer, address(tokenomics), deployer);
        // Deploy generic bond calculator contract
        genericBondCalculator = new GenericBondCalculator(address(olas), address(tokenomics));
        // Deploy depository contract
        depository = new Depository(address(olas), address(treasury), address(tokenomics), address(genericBondCalculator));
        // Deploy dispenser contract
        dispenser = new Dispenser(address(tokenomics), address(treasury));

        // Change contract addresses to the correct ones
        tokenomics.changeManagers(address(0), address(treasury), address(depository), address(dispenser));
        treasury.changeManagers(address(0), address(0), address(depository), address(dispenser));

        // Set treasury contract as a minter for OLAS
        olas.changeMinter(address(treasury));

        // TODO Create OLAS-DAI pair
    }
}

contract TokenomicsLoopTest is BaseSetup {
    function setUp() public override {
        super.setUp();
    }

    /// @dev Tokenomics full loop for 2 services.
    /// @notice Assume that no single donation is bigger than 2^64 - 1.
    /// @param amount0 Amount to donate to the first service.
    /// @param amount1 Amount to donate to the second service.
    function testTokenomics(uint64 amount0, uint64 amount1) public {
        // TODO Add liquidity to the LP token, create a bonding program and deposit from epoch to epoch

        // Amounts must be bigger than a meaningful amount
        vm.assume(amount0 > 1e9);
        vm.assume(amount1 > 1e9);

        // Create 4 components and 3 agents based on them
        componentRegistry.changeManager(address(registriesManager));
        agentRegistry.changeManager(address(registriesManager));
        vm.startPrank(address(registriesManager));
        componentRegistry.create(componentOwners[0], unitHash, emptyArray32);
        componentRegistry.create(componentOwners[1], unitHash, emptyArray32);
        componentRegistry.create(componentOwners[2], unitHash, emptyArray32);
        componentRegistry.create(componentOwners[3], unitHash, emptyArray32);

        agentRegistry.create(agentOwners[0], unitHash, agent1Components);
        agentRegistry.create(agentOwners[1], unitHash, agent2Components);
        agentRegistry.create(agentOwners[2], unitHash, agent3Components);
        vm.stopPrank();

        AgentParams[] memory agentParams = new AgentParams[](2);
        agentParams[0].slots = 1;
        agentParams[0].bond = regBond;
        agentParams[1].slots = 1;
        agentParams[1].bond = regBond;
        // Create 2 services
        serviceRegistry.changeManager(address(serviceManager));
        vm.startPrank(address(serviceManager));
        serviceRegistry.create(serviceOwner, unitHash, agentIds[0], agentParams, threshold);
        serviceRegistry.create(serviceOwner, unitHash, agentIds[1], agentParams, threshold);
        vm.stopPrank();

        // Activate registration by service owners
        vm.startPrank(serviceOwner);
        serviceManager.activateRegistration{value: regDeposit}(1);
        serviceManager.activateRegistration{value: regDeposit}(2);
        vm.stopPrank();

        // Register agent instances by the operator
        vm.startPrank(operator);
        serviceManager.registerAgents{value: 2 * regBond}(serviceIds[0], agentInstancesService1, agentIds[0]);
        serviceManager.registerAgents{value: 2 * regBond}(serviceIds[1], agentInstancesService2, agentIds[1]);
        vm.stopPrank();

        // Deploy services
        serviceRegistry.changeMultisigPermission(address(gnosisSafeMultisig), true);
        vm.startPrank(serviceOwner);
        serviceManager.deploy(serviceIds[0], address(gnosisSafeMultisig), payload);
        serviceManager.deploy(serviceIds[1], address(gnosisSafeMultisig), payload);
        vm.stopPrank();

        // In order to get OLAS top-ups for owners of components / agents, service serviceOwner needs to lock enough veOLAS
        vm.startPrank(serviceOwner);
        olas.approve(address(ve), tokenomics.veOLASThreshold() * 10);
        // Set the lock duration to 4 years such that the amount of OLAS is almost the amount of veOLAS
        // veOLAS = OLAS * time_locked / MAXTIME (where MAXTIME is 4 years)
        ve.createLock(tokenomics.veOLASThreshold() * 10, 4 * oneYear);
        vm.stopPrank();

//        // Define the types of units to claim rewards and top-ups for
//        (unitTypes[0], unitTypes[1]) = (0, 1);
//        // Define unit Ids to claim rewards and top-ups for
//        (unitIds[0], unitIds[1]) = (1, 1);

        // Set epoch length equal to a week
        tokenomics.changeTokenomicsParameters(0, 0, epochLen, 0);
        // Set treasury reward fraction to be more than zero
        tokenomics.changeIncentiveFractions(50, 25, 49, 34, 17);

        uint256[] memory rewards = new uint256[](2);
        uint256[] memory topUps = new uint256[](2);

        // Run for more than 2 years (more than 52 weeks in a year)
        uint256 endTime = 2 weeks;
        for (uint256 i = 0; i < endTime; i += epochLen) {
            // Send donations to services from the deployer
            (serviceAmounts[0], serviceAmounts[1]) = (amount0, amount1);
            vm.prank(deployer);
            treasury.depositServiceDonationsETH{value: serviceAmounts[0] + serviceAmounts[1]}(serviceIds, serviceAmounts);

            // Move at least epochLen seconds in time
            vm.warp(block.timestamp + epochLen);

            // Start new epoch and calculate tokenomics parameters and rewards
            tokenomics.checkpoint();

            // Get the last settled epoch counter
            uint256 lastPoint = tokenomics.epochCounter() - 1;

            // Get the epoch point of the last epoch
            EpochPoint memory ep = tokenomics.getEpochPoint(lastPoint);
            // Get the unit points of the last epoch
            UnitPoint[] memory up = new UnitPoint[](2);
            (up[0], up[1]) = (tokenomics.getUnitPoint(lastPoint, 0), tokenomics.getUnitPoint(lastPoint, 1));

            // Calculate rewards based on the points information
            rewards[0] += (ep.totalDonationsETH * up[0].rewardUnitFraction) / 100;
            rewards[1] += (ep.totalDonationsETH * up[1].rewardUnitFraction) / 100;
            uint256 accountRewards = rewards[0] + rewards[1];
            // Calculate top-ups based on the points information
            topUps[0] += (ep.totalTopUpsOLAS * up[0].topUpUnitFraction) / 100;
            topUps[1] += (ep.totalTopUpsOLAS * up[1].topUpUnitFraction) / 100;
            uint256 accountTopUps = topUps[0] + topUps[1];

            // Rewards and top-ups must not be zero
            assertGe(accountRewards, 0);
            assertGe(accountTopUps, 0);
        }
    }
}
