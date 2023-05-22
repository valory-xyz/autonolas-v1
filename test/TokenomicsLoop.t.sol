pragma solidity =0.8.20;

import {GnosisSafe} from "@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol";
import {GnosisSafeProxyFactory} from "@gnosis.pm/safe-contracts/contracts/proxies/GnosisSafeProxyFactory.sol";
import {Test} from "forge-std/Test.sol";
import {Utils} from "./utils/Utils.sol";
import {ZuniswapV2Factory} from "zuniswapv2/ZuniswapV2Factory.sol";
import {ZuniswapV2Router} from "zuniswapv2/ZuniswapV2Router.sol";
import {ZuniswapV2Pair} from "zuniswapv2/ZuniswapV2Pair.sol";
import {OLAS} from "../lib/autonolas-governance/contracts/OLAS.sol";
import {veOLAS} from "../lib/autonolas-governance/contracts/veOLAS.sol";
import {AgentRegistry} from "../lib/autonolas-registries/contracts/AgentRegistry.sol";
import {ComponentRegistry} from "../lib/autonolas-registries/contracts/ComponentRegistry.sol";
import {RegistriesManager} from "../lib/autonolas-registries/contracts/RegistriesManager.sol";
import "../lib/autonolas-registries/contracts/ServiceRegistry.sol";
import {ServiceManager} from "../lib/autonolas-registries/contracts/ServiceManager.sol";
import {GnosisSafeMultisig} from "../lib/autonolas-registries/contracts/multisigs/GnosisSafeMultisig.sol";
import {Depository} from "../lib/autonolas-tokenomics/contracts/Depository.sol";
import {Dispenser} from "../lib/autonolas-tokenomics/contracts/Dispenser.sol";
import {GenericBondCalculator} from "../lib/autonolas-tokenomics/contracts/GenericBondCalculator.sol";
import "../lib/autonolas-tokenomics/contracts/Tokenomics.sol";
import {TokenomicsProxy} from "../lib/autonolas-tokenomics/contracts/TokenomicsProxy.sol";
import {Treasury} from "../lib/autonolas-tokenomics/contracts/Treasury.sol";

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
    ZuniswapV2Factory internal factory;
    ZuniswapV2Router internal router;

    uint32[] internal emptyArray32;
    uint32[] internal agent1Components;
    uint32[] internal agent2Components;
    uint32[] internal agent3Components;
    uint32[] internal agentDefaultComponents;
    uint32[] internal agentMaxNumComponents;
    address payable[] internal users;
    address[] internal agentInstancesService1;
    address[] internal agentInstancesService2;
    address[] internal defaultAgentInstances;
    address[] internal componentOwners;
    address[] internal agentOwners;
    uint256[] internal serviceIds;
    uint256[] internal defaultServiceIds;
    uint256[] internal serviceAmounts;
    uint256[] internal defaultServiceAmounts;
    uint256[] internal donationServiceIds;
    uint256[] internal donationServiceAmounts;
    uint256[] internal unitTypes;
    uint256[] internal unitIds;
    uint256[] internal productIds;
    uint256[] internal bondIds;
    address internal deployer;
    address internal serviceOwner;
    address internal operator;
    address internal pair;
    uint256 internal initialMint = 50_000_000 ether;
    uint256 internal largeApproval = 1_000_000_000 ether;
    uint256 internal epochLen = 30 days;
    uint256 internal oneYear = 365 * 24 * 3600;
    uint32 internal threshold = 2;
    uint96 internal regBond = 1000;
    uint256 internal regDeposit = 1000;
    uint256 internal delta = 10;
    uint256 internal deltaMaxNumUnits = 100;
    uint256 internal globalDelta = 3e3;
    uint256 internal globalDeltaMaxNumUnits = 3e4;
    uint256 internal globalRoundOffETH;
    uint256 internal globalRoundOffOLAS;
    uint256 internal maxNumUnits = 50;
    uint256 internal initialLiquidity;
    uint256 internal amountOLAS = 5_000_000 ether;
    uint256 internal amountDAI = 5_000_000 ether;
    uint256 internal minAmountOLAS = 5_00 ether;
    uint256 internal minAmountDAI = 5_00 ether;
    uint256 internal supplyProductOLAS =  2_000 ether;
    uint256 internal defaultPriceLP = 2 ether;
    uint256 internal vesting = 10 days;
    uint256 internal priceLP;
    uint256 internal productId;
    uint256 internal bondId;

    bytes32 internal unitHash = 0x9999999999999999999999999999999999999999999999999999999999999999;
    bytes internal payload;
    uint32[][] internal agentIds;
    uint32[] internal defaultAgentIds;

    function setUp() public virtual {
        emptyArray32 = new uint32[](0);
        agent1Components = new uint32[](2);
        (agent1Components[0], agent1Components[1]) = (1, 2);
        agent2Components = new uint32[](1);
        agent2Components[0] = 2;
        agent3Components = new uint32[](1);
        agent3Components[0] = 3;
        agentDefaultComponents = new uint32[](1);
        agentMaxNumComponents = new uint32[](maxNumUnits);
        agentIds = new uint32[][](2);
        agentIds[0] = new uint32[](2);
        (agentIds[0][0], agentIds[0][1]) = (1, 2);
        agentIds[1] = new uint32[](2);
        (agentIds[1][0], agentIds[1][1]) = (1, 3);
        defaultAgentIds = new uint32[](1);
        unitTypes = new uint256[](1);
        unitIds = new uint256[](1);

        utils = new Utils();
        users = utils.createUsers(20 + 2 * maxNumUnits);
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
        defaultAgentInstances = new address[](1);
        // There are maxNumUnits component and agent owners
        componentOwners = new address[](maxNumUnits);
        agentOwners = new address[](maxNumUnits);
        for (uint256 i = 0; i < maxNumUnits; ++i) {
            componentOwners[i] = users[i + 11];
            agentOwners[i] = users[i + 11 + maxNumUnits];
            agentMaxNumComponents[i] = uint32(i + 1);
        }
        // There are 2 service amounts field for donating to each service
        serviceAmounts = new uint256[](2);
        serviceIds = new uint256[](2);
        (serviceIds[0], serviceIds[1]) = (1, 2);
        defaultServiceAmounts = new uint256[](1);
        defaultServiceIds = new uint256[](1);

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
        olas.mint(address(deployer), initialMint);
        olas.mint(address(this), initialMint);
        olas.mint(serviceOwner, initialMint);
        dai = new OLAS();
        dai.mint(address(this), initialMint);
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
        treasury = new Treasury(address(olas), address(tokenomics), deployer, deployer);
        // Deploy generic bond calculator contract
        genericBondCalculator = new GenericBondCalculator(address(olas), address(tokenomics));
        // Deploy depository contract
        depository = new Depository(address(olas), address(tokenomics), address(treasury), address(genericBondCalculator));
        // Deploy dispenser contract
        dispenser = new Dispenser(address(tokenomics), address(treasury));

        // Change contract addresses to the correct ones
        tokenomics.changeManagers(address(treasury), address(depository), address(dispenser));
        treasury.changeManagers(address(0), address(depository), address(dispenser));

        // Set treasury contract as a minter for OLAS
        olas.changeMinter(address(treasury));

        // Deploy factory and router
        factory = new ZuniswapV2Factory();
        router = new ZuniswapV2Router(address(factory));

        // Create LP token
        factory.createPair(address(olas), address(dai));
        // Get the LP token address
        pair = factory.pairs(address(olas), address(dai));

        // Add liquidity
        olas.approve(address(router), largeApproval);
        dai.approve(address(router), largeApproval);

        (, , initialLiquidity) = router.addLiquidity(
            address(dai),
            address(olas),
            amountDAI,
            amountOLAS,
            amountDAI,
            amountOLAS,
            address(this)
        );

        // Enable LP token in treasury
        treasury.enableToken(pair);
        priceLP = depository.getCurrentPriceLP(pair);

        // Give a large approval for treasury
        vm.prank(deployer);
        ZuniswapV2Pair(pair).approve(address(treasury), largeApproval);

        // Transfer LP tokens to deployer
        ZuniswapV2Pair(pair).transfer(deployer, 1_000_000 ether);
    }
}

contract TokenomicsLoopTest is BaseSetup {
    function setUp() public override {
        super.setUp();
    }

    /// @dev Tokenomics full loop for 2 services throughout 550 epochs.
    /// @notice Assume that no single donation is bigger than 2^64 - 1.
    /// @param amount0 Amount to donate to the first service.
    /// @param amount1 Amount to donate to the second service.
    function testTokenomicsBasic(uint64 amount0, uint64 amount1) public {
        // Amounts must be bigger than a meaningful amount
        vm.assume(amount0 > treasury.minAcceptedETH());
        vm.assume(amount1 > treasury.minAcceptedETH());

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
        // Note this value will be enough for about 2.5 years, after which owners will start getting zero tup-ups
        vm.startPrank(serviceOwner);
        olas.approve(address(ve), tokenomics.veOLASThreshold() * 10);
        // Set the lock duration to 4 years such that the amount of OLAS is almost the amount of veOLAS
        // veOLAS = OLAS * time_locked / MAXTIME (where MAXTIME is 4 years)
        ve.createLock(tokenomics.veOLASThreshold() * 10, 4 * oneYear);
        vm.stopPrank();

        // Set treasury reward fraction to be more than zero
        tokenomics.changeIncentiveFractions(50, 25, 49, 34, 17);
        // Move at least epochLen seconds in time
        vm.warp(block.timestamp + epochLen);
        // Mine a next block to avoid a flash loan attack condition
        vm.roll(block.number + 1);
        // Skip the first epoch to apply tokenomics incentives changes
        tokenomics.checkpoint();

        uint256[] memory rewards = new uint256[](3);
        uint256[] memory topUps = new uint256[](2);

        // Run for more than 10 years (more than 52 weeks in a year)
        uint256 endTime = 1 weeks;
        for (uint256 i = 0; i < endTime; i += epochLen) {
            // Create a bond product
            productId = depository.create(pair, priceLP, supplyProductOLAS, vesting);

            // Deposit LP token for OLAS using half of the product supply considering that there will be the IDF multiplier
            vm.prank(deployer);
            (, , bondId) = depository.deposit(productId, supplyProductOLAS / 2);

            // Check matured bonds up until the last created bond Id
            delete bondIds;
            (bondIds, ) = depository.getBonds(deployer, true);

            // Redeem matured bonds
            if (bondIds.length > 0) {
                vm.prank(deployer);
                depository.redeem(bondIds);
            }

            // Send donations to services from the deployer
            (serviceAmounts[0], serviceAmounts[1]) = (amount0, amount1);
            // Set deployer balance to cover the max of two donations
            vm.deal(deployer, type(uint128).max);
            vm.prank(deployer);
            treasury.depositServiceDonationsETH{value: serviceAmounts[0] + serviceAmounts[1]}(serviceIds, serviceAmounts);

            // Move at least epochLen seconds in time
            vm.warp(block.timestamp + epochLen);
            // Mine a next block to avoid a flash loan attack condition
            vm.roll(block.number + 1);

            // Start new epoch and calculate tokenomics parameters and rewards
            tokenomics.checkpoint();

            // Get the last settled epoch counter
            uint256 lastPoint = tokenomics.epochCounter() - 1;

            // Get the epoch point of the last epoch
            EpochPoint memory ep = tokenomics.mapEpochTokenomics(lastPoint);
            // Get the unit points of the last epoch
            UnitPoint[] memory up = new UnitPoint[](2);
            (up[0], up[1]) = (tokenomics.getUnitPoint(lastPoint, 0), tokenomics.getUnitPoint(lastPoint, 1));

            // Calculate rewards based on the points information
            rewards[0] = (ep.totalDonationsETH * up[0].rewardUnitFraction) / 100;
            rewards[1] = (ep.totalDonationsETH * up[1].rewardUnitFraction) / 100;
            rewards[2] = (ep.totalDonationsETH * ep.rewardTreasuryFraction) / 100;
            uint256 accountRewards = rewards[0] + rewards[1];
            // Calculate top-ups based on the points information
            topUps[0] = (ep.totalTopUpsOLAS * up[0].topUpUnitFraction) / 100;
            topUps[1] = (ep.totalTopUpsOLAS * up[1].topUpUnitFraction) / 100;
            uint256 accountTopUps = topUps[0] + topUps[1];

            // Rewards and top-ups must not be zero
            assertGt(accountRewards, 0);
            assertGt(accountTopUps, 0);
            assertGt(rewards[2], 0);

            // Check for the Treasury balance to correctly be reflected by ETHFromServices + ETHOwned
            assertEq(address(treasury).balance, treasury.ETHFromServices() + treasury.ETHOwned());

            uint256 balanceETH;
            uint256 balanceOLAS;

            // Get owners rewards and sum up all of them
            // We have 4 components
            unitTypes[0] = 0;
            for (uint256 j = 0; j < 4; ++j) {
                // Subtract the balance owners had before claiming incentives
                uint256 balanceBeforeClaimETH = componentOwners[j].balance;
                uint256 balanceBeforeClaimOLAS = olas.balanceOf(componentOwners[j]);
                unitIds[0] = j + 1;
                (uint256 ownerRewards, uint256 ownerTopUps) = tokenomics.getOwnerIncentives(componentOwners[j], unitTypes, unitIds);
                if ((ownerRewards + ownerTopUps) > 0) {
                    vm.prank(componentOwners[j]);
                    dispenser.claimOwnerIncentives(unitTypes, unitIds);
                }
                // Check that the incentive view function and claim return same results
                assertEq(ownerRewards, componentOwners[j].balance - balanceBeforeClaimETH);
                assertEq(ownerTopUps, olas.balanceOf(componentOwners[j]) - balanceBeforeClaimOLAS);
                // Sum up incentives
                balanceETH += componentOwners[j].balance - balanceBeforeClaimETH;
                balanceOLAS += olas.balanceOf(componentOwners[j]) - balanceBeforeClaimOLAS;
            }

            // 3 agents
            unitTypes[0] = 1;
            for (uint256 j = 0; j < 3; j++) {
                // Subtract the balance owners had before claiming incentives
                uint256 balanceBeforeClaimETH = agentOwners[j].balance;
                uint256 balanceBeforeClaimOLAS = olas.balanceOf(agentOwners[j]);
                unitIds[0] = j + 1;
                (uint256 ownerRewards, uint256 ownerTopUps) = tokenomics.getOwnerIncentives(agentOwners[j], unitTypes, unitIds);
                if ((ownerRewards + ownerTopUps) > 0) {
                    vm.prank(agentOwners[j]);
                    dispenser.claimOwnerIncentives(unitTypes, unitIds);
                }
                // Check that the incentive view function and claim return same results
                assertEq(ownerRewards, agentOwners[j].balance - balanceBeforeClaimETH);
                assertEq(ownerTopUps, olas.balanceOf(agentOwners[j]) - balanceBeforeClaimOLAS);
                // Sum up incentives
                balanceETH += agentOwners[j].balance - balanceBeforeClaimETH;
                balanceOLAS += olas.balanceOf(agentOwners[j]) - balanceBeforeClaimOLAS;
            }

            // Check the ETH and OLAS balance after receiving incentives
            if (balanceETH > accountRewards) {
                balanceETH -= accountRewards;
            } else {
                balanceETH = accountRewards - balanceETH;
            }
            assertLt(balanceETH, delta);

            // OLAS balance could be zero when the serviceOwner veOLAS balance is less than the required top-up threshold
            if (balanceOLAS > 0) {
                if (balanceOLAS > accountTopUps) {
                    balanceOLAS -= accountTopUps;
                } else {
                    balanceOLAS = accountTopUps - balanceOLAS;
                }
                assertLt(balanceOLAS, delta);
            } else {
                assertLt(ve.getVotes(serviceOwner), tokenomics.veOLASThreshold());
            }

            // Sum up the global round-off error
            globalRoundOffETH += balanceETH;
            globalRoundOffOLAS += balanceOLAS;
        }
        assertLt(globalRoundOffETH, globalDelta);
        assertLt(globalRoundOffOLAS, globalDelta);

        // Move four more weeks in time
        vm.warp(block.timestamp + 4 weeks);
        // Check that all bond products are closed
        productIds = depository.getProducts(true);
        assertEq(productIds.length, 0);
    }

    /// @dev Tokenomics with changing number of services throughout 550 epochs.
    /// @notice Assume that no single donation is bigger than 2^64 - 1.
    /// @param donationAmount Amount to donate to the service.
    /// @param numServices Number of services to donate to.
    function testTokenomicsChangingNumberOfServices(uint64 donationAmount, uint256 numServices) public {
        // Donation amount must be bigger than a meaningful amount
        vm.assume(donationAmount > treasury.minAcceptedETH());
        // The number of services is within the max number range
        vm.assume(numServices > 0 && numServices <= maxNumUnits);

        // Create components and agents based on them
        componentRegistry.changeManager(address(registriesManager));
        agentRegistry.changeManager(address(registriesManager));
        vm.startPrank(address(registriesManager));
        for (uint256 i = 0; i < numServices; ++i) {
            componentRegistry.create(componentOwners[i], unitHash, emptyArray32);
            agentDefaultComponents[0] = uint32(i + 1);
            agentRegistry.create(agentOwners[i], unitHash, agentDefaultComponents);
        }
        vm.stopPrank();

        AgentParams[] memory agentParams = new AgentParams[](1);
        agentParams[0].slots = 1;
        agentParams[0].bond = regBond;
        // Create maxNumUnits services with 1 agent (consisting of one component) each
        serviceRegistry.changeManager(address(serviceManager));
        vm.startPrank(address(serviceManager));
        for (uint256 i = 0; i < numServices; ++i) {
            defaultAgentIds[0] = uint32(i + 1);
            serviceRegistry.create(serviceOwner, unitHash, defaultAgentIds, agentParams, 1);
        }
        vm.stopPrank();

        // Activate registration by service owners
        vm.startPrank(serviceOwner);
        for (uint256 i = 0; i < numServices; ++i) {
            defaultServiceIds[0] = i + 1;
            serviceManager.activateRegistration{value: regDeposit}(defaultServiceIds[0]);
        }
        vm.stopPrank();

        // Register agent instances by the operator
        vm.startPrank(operator);
        for (uint256 i = 0; i < numServices; ++i) {
            defaultServiceIds[0] = i + 1;
            defaultAgentIds[0] = uint32(i + 1);
            defaultAgentInstances[0] = agentOwners[i];
            serviceManager.registerAgents{value: regBond}(defaultServiceIds[0], defaultAgentInstances, defaultAgentIds);
        }
        vm.stopPrank();

        // Deploy services
        serviceRegistry.changeMultisigPermission(address(gnosisSafeMultisig), true);
        vm.startPrank(serviceOwner);
        for (uint256 i = 0; i < numServices; ++i) {
            defaultServiceIds[0] = i + 1;
            serviceManager.deploy(defaultServiceIds[0], address(gnosisSafeMultisig), payload);
        }
        vm.stopPrank();

        // In order to get OLAS top-ups for owners of components / agents, service serviceOwner needs to lock enough veOLAS
        // Note this value will be enough for about 2.5 years, after which owners will start getting zero tup-ups
        vm.startPrank(serviceOwner);
        olas.approve(address(ve), tokenomics.veOLASThreshold() * 10);
        // Set the lock duration to 4 years such that the amount of OLAS is almost the amount of veOLAS
        // veOLAS = OLAS * time_locked / MAXTIME (where MAXTIME is 4 years)
        ve.createLock(tokenomics.veOLASThreshold() * 10, 4 * oneYear);
        vm.stopPrank();

        // Set treasury reward fraction to be more than zero
        tokenomics.changeIncentiveFractions(40, 20, 49, 34, 17);
        // Move at least epochLen seconds in time
        vm.warp(block.timestamp + epochLen);
        // Mine a next block to avoid a flash loan attack condition
        vm.roll(block.number + 1);
        // Skip the first epoch to apply tokenomics incentives changes
        tokenomics.checkpoint();

        uint256[] memory rewards = new uint256[](3);
        uint256[] memory topUps = new uint256[](3);

        // Run for more than 10 years (more than 52 weeks in a year)
        uint256 endTime = 550 weeks;
        for (uint256 i = 0; i < endTime; i += epochLen) {
            // Send donations to services from the deployer
            donationServiceIds = new uint256[](numServices);
            donationServiceAmounts = new uint256[](numServices);
            // All services will receive the same amount
            uint256 sumDonation;
            for (uint256 j = 0; j < numServices; ++j) {
                donationServiceIds[j] = j + 1;
                donationServiceAmounts[j] = donationAmount + j;
                sumDonation += donationServiceAmounts[j];
            }
            // Set deployer balance to cover the max donation
            vm.deal(deployer, type(uint128).max);
            vm.prank(deployer);
            treasury.depositServiceDonationsETH{value: sumDonation}(donationServiceIds, donationServiceAmounts);

            // Move at least epochLen seconds in time
            vm.warp(block.timestamp + epochLen);
            // Mine a next block to avoid a flash loan attack condition
            vm.roll(block.number + 1);

            // Start new epoch and calculate tokenomics parameters and rewards
            tokenomics.checkpoint();

            // Get the last settled epoch counter
            uint256 lastPoint = tokenomics.epochCounter() - 1;

            // Get the epoch point of the last epoch
            EpochPoint memory ep = tokenomics.mapEpochTokenomics(lastPoint);
            // Get the unit points of the last epoch
            UnitPoint[] memory up = new UnitPoint[](2);
            (up[0], up[1]) = (tokenomics.getUnitPoint(lastPoint, 0), tokenomics.getUnitPoint(lastPoint, 1));

            // Calculate rewards based on the points information
            rewards[0] = (ep.totalDonationsETH * up[0].rewardUnitFraction) / 100;
            rewards[1] = (ep.totalDonationsETH * up[1].rewardUnitFraction) / 100;
            rewards[2] = (ep.totalDonationsETH * ep.rewardTreasuryFraction) / 100;
            uint256 accountRewards = rewards[0] + rewards[1];
            // Calculate top-ups based on the points information
            topUps[0] = (ep.totalTopUpsOLAS * up[0].topUpUnitFraction) / 100;
            topUps[1] = (ep.totalTopUpsOLAS * up[1].topUpUnitFraction) / 100;
            topUps[2] = (ep.totalTopUpsOLAS * ep.maxBondFraction) / 100;
            uint256 accountTopUps = topUps[0] + topUps[1];

            // Rewards and top-ups must not be zero
            assertGt(accountRewards, 0);
            assertGt(accountTopUps, 0);
            assertGt(rewards[2], 0);
            // maxBond must not be zero
            assertGt(topUps[2], 0);
            // Other epoch point values must not be zero as well
            assertGt(ep.idf, 0);
            assertGt(tokenomics.devsPerCapital(), 0);
            assertGt(ep.endTime, 0);

            // Check for the Treasury balance to correctly be reflected by ETHFromServices + ETHOwned
            assertEq(address(treasury).balance, treasury.ETHFromServices() + treasury.ETHOwned());

            uint256 balanceETH;
            uint256 balanceOLAS;

            // Get owners rewards and sum up all of them
            // We have maxNumUnits components
            unitTypes[0] = 0;
            for (uint256 j = 0; j < numServices; ++j) {
                // Subtract the balance owners had before claiming incentives
                uint256 balanceBeforeClaimETH = componentOwners[j].balance;
                uint256 balanceBeforeClaimOLAS = olas.balanceOf(componentOwners[j]);
                unitIds[0] = j + 1;
                (uint256 ownerRewards, uint256 ownerTopUps) = tokenomics.getOwnerIncentives(componentOwners[j], unitTypes, unitIds);
                if ((ownerRewards + ownerTopUps) > 0) {
                    vm.prank(componentOwners[j]);
                    dispenser.claimOwnerIncentives(unitTypes, unitIds);
                }
                // Check that the incentive view function and claim return same results
                assertEq(ownerRewards, componentOwners[j].balance - balanceBeforeClaimETH);
                assertEq(ownerTopUps, olas.balanceOf(componentOwners[j]) - balanceBeforeClaimOLAS);
                // Sum up incentives
                balanceETH += componentOwners[j].balance - balanceBeforeClaimETH;
                balanceOLAS += olas.balanceOf(componentOwners[j]) - balanceBeforeClaimOLAS;
            }

            // maxNumUnits agents
            unitTypes[0] = 1;
            for (uint256 j = 0; j < numServices; j++) {
                // Subtract the balance owners had before claiming incentives
                uint256 balanceBeforeClaimETH = agentOwners[j].balance;
                uint256 balanceBeforeClaimOLAS = olas.balanceOf(agentOwners[j]);
                unitIds[0] = j + 1;
                (uint256 ownerRewards, uint256 ownerTopUps) = tokenomics.getOwnerIncentives(agentOwners[j], unitTypes, unitIds);
                if ((ownerRewards + ownerTopUps) > 0) {
                    vm.prank(agentOwners[j]);
                    dispenser.claimOwnerIncentives(unitTypes, unitIds);
                }
                // Check that the incentive view function and claim return same results
                assertEq(ownerRewards, agentOwners[j].balance - balanceBeforeClaimETH);
                assertEq(ownerTopUps, olas.balanceOf(agentOwners[j]) - balanceBeforeClaimOLAS);
                // Sum up incentives
                balanceETH += agentOwners[j].balance - balanceBeforeClaimETH;
                balanceOLAS += olas.balanceOf(agentOwners[j]) - balanceBeforeClaimOLAS;
            }

            // Check the ETH and OLAS balance after receiving incentives
            if (balanceETH > accountRewards) {
                balanceETH -= accountRewards;
            } else {
                balanceETH = accountRewards - balanceETH;
            }
            assertLt(balanceETH, deltaMaxNumUnits);

            // OLAS balance could be zero when the serviceOwner veOLAS balance is less than the required top-up threshold
            if (balanceOLAS > 0) {
                if (balanceOLAS > accountTopUps) {
                    balanceOLAS -= accountTopUps;
                } else {
                    balanceOLAS = accountTopUps - balanceOLAS;
                }
                assertLt(balanceOLAS, deltaMaxNumUnits);
            } else {
                assertLt(ve.getVotes(serviceOwner), tokenomics.veOLASThreshold());
            }

            // Sum up the global round-off error
            globalRoundOffETH += balanceETH;
            globalRoundOffOLAS += balanceOLAS;
        }
        assertLt(globalRoundOffETH, globalDeltaMaxNumUnits);
        assertLt(globalRoundOffOLAS, globalDeltaMaxNumUnits);
    }

    /// @dev Tokenomics with changing number of services throughout 550 epochs and all the zero top-up fractions.
    /// @notice Assume that no single donation is bigger than 2^64 - 1.
    /// @param donationAmount Amount to donate to the service.
    /// @param numServices Number of services to donate to.
    function testTokenomicsChangingNumberOfServicesZeroTopUps(uint64 donationAmount, uint256 numServices) public {
        // Donation amount must be bigger than a meaningful amount
        vm.assume(donationAmount > treasury.minAcceptedETH());
        // The number of services is within the max number range
        vm.assume(numServices > 0 && numServices <= maxNumUnits);

        // Create components and agents based on them
        componentRegistry.changeManager(address(registriesManager));
        agentRegistry.changeManager(address(registriesManager));
        vm.startPrank(address(registriesManager));
        for (uint256 i = 0; i < numServices; ++i) {
            componentRegistry.create(componentOwners[i], unitHash, emptyArray32);
            agentDefaultComponents[0] = uint32(i + 1);
            agentRegistry.create(agentOwners[i], unitHash, agentDefaultComponents);
        }
        vm.stopPrank();

        AgentParams[] memory agentParams = new AgentParams[](1);
        agentParams[0].slots = 1;
        agentParams[0].bond = regBond;
        // Create maxNumUnits services with 1 agent (consisting of one component) each
        serviceRegistry.changeManager(address(serviceManager));
        vm.startPrank(address(serviceManager));
        for (uint256 i = 0; i < numServices; ++i) {
            defaultAgentIds[0] = uint32(i + 1);
            serviceRegistry.create(serviceOwner, unitHash, defaultAgentIds, agentParams, 1);
        }
        vm.stopPrank();

        // Activate registration by service owners
        vm.startPrank(serviceOwner);
        for (uint256 i = 0; i < numServices; ++i) {
            defaultServiceIds[0] = i + 1;
            serviceManager.activateRegistration{value: regDeposit}(defaultServiceIds[0]);
        }
        vm.stopPrank();

        // Register agent instances by the operator
        vm.startPrank(operator);
        for (uint256 i = 0; i < numServices; ++i) {
            defaultServiceIds[0] = i + 1;
            defaultAgentIds[0] = uint32(i + 1);
            defaultAgentInstances[0] = agentOwners[i];
            serviceManager.registerAgents{value: regBond}(defaultServiceIds[0], defaultAgentInstances, defaultAgentIds);
        }
        vm.stopPrank();

        // Deploy services
        serviceRegistry.changeMultisigPermission(address(gnosisSafeMultisig), true);
        vm.startPrank(serviceOwner);
        for (uint256 i = 0; i < numServices; ++i) {
            defaultServiceIds[0] = i + 1;
            serviceManager.deploy(defaultServiceIds[0], address(gnosisSafeMultisig), payload);
        }
        vm.stopPrank();

        // In order to get OLAS top-ups for owners of components / agents, service serviceOwner needs to lock enough veOLAS
        // Note this value will be enough for about 2.5 years, after which owners will start getting zero tup-ups
        vm.startPrank(serviceOwner);
        olas.approve(address(ve), tokenomics.veOLASThreshold() * 10);
        // Set the lock duration to 4 years such that the amount of OLAS is almost the amount of veOLAS
        // veOLAS = OLAS * time_locked / MAXTIME (where MAXTIME is 4 years)
        ve.createLock(tokenomics.veOLASThreshold() * 10, 4 * oneYear);
        vm.stopPrank();

        // Set treasury reward fraction to be more than zero
        tokenomics.changeIncentiveFractions(40, 20, 0, 0, 0);
        // Move at least epochLen seconds in time
        vm.warp(block.timestamp + epochLen);
        // Mine a next block to avoid a flash loan attack condition
        vm.roll(block.number + 1);
        // Skip the first epoch to apply tokenomics incentives changes
        tokenomics.checkpoint();

        uint256[] memory rewards = new uint256[](3);
        uint256[] memory topUps = new uint256[](3);
        uint256 effectiveBond = tokenomics.effectiveBond();

        // Run for more than 10 years (more than 52 weeks in a year)
        uint256 endTime = 550 weeks;
        for (uint256 i = 0; i < endTime; i += epochLen) {
            // Send donations to services from the deployer
            donationServiceIds = new uint256[](numServices);
            donationServiceAmounts = new uint256[](numServices);
            // All services will receive the same amount
            uint256 sumDonation;
            for (uint256 j = 0; j < numServices; ++j) {
                donationServiceIds[j] = j + 1;
                donationServiceAmounts[j] = donationAmount + j;
                sumDonation += donationServiceAmounts[j];
            }
            // Set deployer balance to cover the max donation
            vm.deal(deployer, type(uint128).max);
            vm.prank(deployer);
            treasury.depositServiceDonationsETH{value: sumDonation}(donationServiceIds, donationServiceAmounts);

            // Move at least epochLen seconds in time
            vm.warp(block.timestamp + epochLen);
            // Mine a next block to avoid a flash loan attack condition
            vm.roll(block.number + 1);

            // Start new epoch and calculate tokenomics parameters and rewards
            tokenomics.checkpoint();

            // Get the last settled epoch counter
            uint256 lastPoint = tokenomics.epochCounter() - 1;

            // Get the epoch point of the last epoch
            EpochPoint memory ep = tokenomics.mapEpochTokenomics(lastPoint);
            // Get the unit points of the last epoch
            UnitPoint[] memory up = new UnitPoint[](2);
            (up[0], up[1]) = (tokenomics.getUnitPoint(lastPoint, 0), tokenomics.getUnitPoint(lastPoint, 1));

            // Calculate rewards based on the points information
            rewards[0] = (ep.totalDonationsETH * up[0].rewardUnitFraction) / 100;
            rewards[1] = (ep.totalDonationsETH * up[1].rewardUnitFraction) / 100;
            rewards[2] = (ep.totalDonationsETH * ep.rewardTreasuryFraction) / 100;
            uint256 accountRewards = rewards[0] + rewards[1];
            // Calculate top-ups based on the points information
            topUps[0] = (ep.totalTopUpsOLAS * up[0].topUpUnitFraction) / 100;
            topUps[1] = (ep.totalTopUpsOLAS * up[1].topUpUnitFraction) / 100;
            topUps[2] = (ep.totalTopUpsOLAS * ep.maxBondFraction) / 100;
            uint256 accountTopUps = topUps[0] + topUps[1];

            // Rewards and top-ups must not be zero
            assertGt(accountRewards, 0);
            assertEq(accountTopUps, 0);
            assertGt(rewards[2], 0);
            // maxBond must not be zero
            assertEq(topUps[2], 0);
            // Other epoch point values must not be zero as well
            assertGt(ep.idf, 0);
            assertGt(tokenomics.devsPerCapital(), 0);
            assertGt(ep.endTime, 0);

            // Check for the Treasury balance to correctly be reflected by ETHFromServices + ETHOwned
            assertEq(address(treasury).balance, treasury.ETHFromServices() + treasury.ETHOwned());

            uint256 balanceETH;
            uint256 balanceOLAS;

            // Get owners rewards and sum up all of them
            // We have maxNumUnits components
            unitTypes[0] = 0;
            for (uint256 j = 0; j < numServices; ++j) {
                // Subtract the balance owners had before claiming incentives
                uint256 balanceBeforeClaimETH = componentOwners[j].balance;
                uint256 balanceBeforeClaimOLAS = olas.balanceOf(componentOwners[j]);
                unitIds[0] = j + 1;
                (uint256 ownerRewards, uint256 ownerTopUps) = tokenomics.getOwnerIncentives(componentOwners[j], unitTypes, unitIds);
                if ((ownerRewards + ownerTopUps) > 0) {
                    vm.prank(componentOwners[j]);
                    dispenser.claimOwnerIncentives(unitTypes, unitIds);
                }
                // Check that the incentive view function and claim return same results
                assertEq(ownerRewards, componentOwners[j].balance - balanceBeforeClaimETH);
                assertEq(ownerTopUps, olas.balanceOf(componentOwners[j]) - balanceBeforeClaimOLAS);
                // Sum up incentives
                balanceETH += componentOwners[j].balance - balanceBeforeClaimETH;
                balanceOLAS += olas.balanceOf(componentOwners[j]) - balanceBeforeClaimOLAS;
            }

            // maxNumUnits agents
            unitTypes[0] = 1;
            for (uint256 j = 0; j < numServices; j++) {
                // Subtract the balance owners had before claiming incentives
                uint256 balanceBeforeClaimETH = agentOwners[j].balance;
                uint256 balanceBeforeClaimOLAS = olas.balanceOf(agentOwners[j]);
                unitIds[0] = j + 1;
                (uint256 ownerRewards, uint256 ownerTopUps) = tokenomics.getOwnerIncentives(agentOwners[j], unitTypes, unitIds);
                if ((ownerRewards + ownerTopUps) > 0) {
                    vm.prank(agentOwners[j]);
                    dispenser.claimOwnerIncentives(unitTypes, unitIds);
                }
                // Check that the incentive view function and claim return same results
                assertEq(ownerRewards, agentOwners[j].balance - balanceBeforeClaimETH);
                assertEq(ownerTopUps, olas.balanceOf(agentOwners[j]) - balanceBeforeClaimOLAS);
                // Sum up incentives
                balanceETH += agentOwners[j].balance - balanceBeforeClaimETH;
                balanceOLAS += olas.balanceOf(agentOwners[j]) - balanceBeforeClaimOLAS;
            }
            assertEq(balanceOLAS, 0);

            // Check the ETH and OLAS balance after receiving incentives
            if (balanceETH > accountRewards) {
                balanceETH -= accountRewards;
            } else {
                balanceETH = accountRewards - balanceETH;
            }
            assertLt(balanceETH, deltaMaxNumUnits);

            // Check that the effective bond has not changed
            assertEq(effectiveBond, tokenomics.effectiveBond());

            // Sum up the global round-off error
            globalRoundOffETH += balanceETH;
        }
        assertLt(globalRoundOffETH, globalDeltaMaxNumUnits);
    }
}
