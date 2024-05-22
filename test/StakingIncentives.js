/*global describe, beforeEach, it, context*/
const { ethers } = require("hardhat");
const { expect } = require("chai");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

describe("StakingIncentives", async () => {
    const initialMint = "1" + "0".repeat(26);
    const AddressZero = ethers.constants.AddressZero;
    const HashZero = ethers.constants.HashZero;
    const defaultHash = "0x" + "5".repeat(64);
    const oneYear = 365 * 24 * 3600;
    const oneMonth = 86400 * 30;
    const oneWeek = 86400 * 7;
    const chainId = 31337;
    const gnosisChainId = 100;
    const defaultWeight = 1000;
    const numClaimedEpochs = 1;
    const bridgePayload = "0x";
    const epochLen = oneMonth;
    const delta = 100;
    const maxNumClaimingEpochs = 10;
    const maxNumStakingTargets = 100;
    const maxUint256 = ethers.constants.MaxUint256;
    const defaultGasLimit = "2000000";
    const retainer = "0x" + "0".repeat(24) + "5".repeat(40);
    const livenessRatio = "1" + "0".repeat(16); // 0.01 transaction per second (TPS)
    let serviceParams = {
        metadataHash: defaultHash,
        maxNumServices: 3,
        rewardsPerSecond: "1" + "0".repeat(15),
        minStakingDeposit: 10,
        minNumStakingPeriods: 3,
        maxNumInactivityPeriods: 3,
        livenessPeriod: 10, // Ten seconds
        timeForEmissions: 100,
        numAgentInstances: 1,
        agentIds: [],
        threshold: 0,
        configHash: HashZero,
        proxyHash: HashZero,
        serviceRegistry: AddressZero,
        activityChecker: AddressZero
    };
    const maxInactivity = serviceParams.maxNumInactivityPeriods * serviceParams.livenessPeriod + 1;

    let signers;
    let deployer;
    let olas;
    let ve;
    let vw;
    let stakingActivityChecker;
    let stakingFactory;
    let stakingTokenImplementation;
    let stakingInstance;
    let tokenomics;
    let treasury;
    let dispenser;
    let ethereumDepositProcessor;
    let bridgeRelayer;
    let gnosisDepositProcessorL1;
    let gnosisTargetDispenserL2;
    let wormholeDepositProcessorL1;

    function convertAddressToBytes32(account) {
        return ("0x" + "0".repeat(24) + account.slice(2)).toLowerCase();
    }

    function convertBytes32ToAddress(account) {
        return "0x" + account.slice(26);
    }

    // These should not be in beforeEach.
    beforeEach(async () => {
        signers = await ethers.getSigners();
        deployer = signers[0];

        // Governance contracts
        const OLAS = await ethers.getContractFactory("OLAS");
        olas = await OLAS.deploy();
        await olas.deployed();

        const VEOLAS = await ethers.getContractFactory("veOLAS");
        ve = await VEOLAS.deploy(olas.address, "Voting Escrow OLAS", "veOLAS");
        await ve.deployed();

        const VoteWeighting = await ethers.getContractFactory("VoteWeighting");
        vw = await VoteWeighting.deploy(ve.address);
        await vw.deployed();

        // Registries contracts
        const StakingActivityChecker = await ethers.getContractFactory("StakingActivityChecker");
        stakingActivityChecker = await StakingActivityChecker.deploy(livenessRatio);
        await stakingActivityChecker.deployed();
        serviceParams.activityChecker = stakingActivityChecker.address;

        const StakingFactory = await ethers.getContractFactory("StakingFactory");
        stakingFactory = await StakingFactory.deploy(AddressZero);
        await stakingFactory.deployed();

        // For the purpose of this testing, it does not matter which bytecode is specified in the staking contract
        // Also, service registry is not important, as the staking capability itself is out of this scope
        const bytecode = await ethers.provider.getCode(stakingFactory.address);
        const bytecodeHash = ethers.utils.keccak256(bytecode);
        serviceParams.proxyHash = bytecodeHash;
        serviceParams.serviceRegistry = stakingFactory.address;

        const StakingToken = await ethers.getContractFactory("StakingToken");
        stakingTokenImplementation = await StakingToken.deploy();
        await stakingTokenImplementation.deployed();

        // Create a first staking proxy instance
        // Note serviceRegistryTokenUtility is also irrelevant for this testing (substituting with deployer)
        const initPayload = stakingTokenImplementation.interface.encodeFunctionData("initialize",
            [serviceParams, deployer.address, olas.address]);
        const stakingTokenAddress = await stakingFactory.getProxyAddress(stakingTokenImplementation.address);
        await stakingFactory.createStakingInstance(stakingTokenImplementation.address, initPayload);
        stakingInstance = await ethers.getContractAt("StakingToken", stakingTokenAddress);

        // Tokenomics contracts
        const Dispenser = await ethers.getContractFactory("Dispenser");
        dispenser = await Dispenser.deploy(olas.address, deployer.address, deployer.address, vw.address,
            retainer, maxNumClaimingEpochs, maxNumStakingTargets);
        await dispenser.deployed();

        // Set Dispenser in Vote Weighting
        vw.changeDispenser(dispenser.address);

        const Treasury = await ethers.getContractFactory("Treasury");
        treasury = await Treasury.deploy(olas.address, deployer.address, deployer.address, dispenser.address);
        await treasury.deployed();

        // Update for the correct treasury contract
        await dispenser.changeManagers(AddressZero, treasury.address, AddressZero);

        const tokenomicsFactory = await ethers.getContractFactory("Tokenomics");
        // Deploy master tokenomics contract
        const tokenomicsMaster = await tokenomicsFactory.deploy();
        await tokenomicsMaster.deployed();

        const proxyData = tokenomicsMaster.interface.encodeFunctionData("initializeTokenomics",
            [olas.address, treasury.address, deployer.address, dispenser.address, deployer.address, epochLen,
                deployer.address, deployer.address, deployer.address, AddressZero]);
        // Deploy tokenomics proxy based on the needed tokenomics initialization
        const TokenomicsProxy = await ethers.getContractFactory("TokenomicsProxy");
        const tokenomicsProxy = await TokenomicsProxy.deploy(tokenomicsMaster.address, proxyData);
        await tokenomicsProxy.deployed();

        // Get the tokenomics proxy contract
        tokenomics = await ethers.getContractAt("Tokenomics", tokenomicsProxy.address);

        // Change the tokenomics and treasury addresses in the dispenser to correct ones
        await dispenser.changeManagers(tokenomics.address, treasury.address, vw.address);

        // Update tokenomics address in treasury
        await treasury.changeManagers(tokenomics.address, AddressZero, AddressZero);

        // Mint the initial balance
        await olas.mint(deployer.address, initialMint);

        // Give treasury the minter role
        await olas.changeMinter(treasury.address);

        // Default Deposit Processor
        const EthereumDepositProcessor = await ethers.getContractFactory("EthereumDepositProcessor");
        ethereumDepositProcessor = await EthereumDepositProcessor.deploy(olas.address, dispenser.address,
            stakingFactory.address, deployer.address);
        await ethereumDepositProcessor.deployed();

        const BridgeRelayer = await ethers.getContractFactory("BridgeRelayer");
        bridgeRelayer = await BridgeRelayer.deploy(olas.address);
        await bridgeRelayer.deployed();

        const GnosisDepositProcessorL1 = await ethers.getContractFactory("GnosisDepositProcessorL1");
        gnosisDepositProcessorL1 = await GnosisDepositProcessorL1.deploy(olas.address, dispenser.address,
            bridgeRelayer.address, bridgeRelayer.address, gnosisChainId);
        await gnosisDepositProcessorL1.deployed();

        const GnosisTargetDispenserL2 = await ethers.getContractFactory("GnosisTargetDispenserL2");
        gnosisTargetDispenserL2 = await GnosisTargetDispenserL2.deploy(olas.address,
            stakingFactory.address, bridgeRelayer.address, gnosisDepositProcessorL1.address, chainId,
            bridgeRelayer.address);
        await gnosisTargetDispenserL2.deployed();

        // Set the gnosisTargetDispenserL2 address in gnosisDepositProcessorL1
        await gnosisDepositProcessorL1.setL2TargetDispenser(gnosisTargetDispenserL2.address);

        // Whitelist deposit processors
        await dispenser.setDepositProcessorChainIds(
            [ethereumDepositProcessor.address, gnosisDepositProcessorL1.address], [chainId, gnosisChainId]);
    });

    context("Staking incentives", async function () {
        it("Claim staking incentives for a single nominee", async () => {
            // Take a snapshot of the current state of the blockchain
            const snapshot = await helpers.takeSnapshot();

            // Set staking fraction to 100%
            await tokenomics.changeIncentiveFractions(0, 0, 0, 0, 0, 100);
            // Changing staking parameters
            await tokenomics.changeStakingParams(50, 10);

            // Checkpoint to apply changes
            await helpers.time.increase(epochLen);
            await tokenomics.checkpoint();

            // Unpause the dispenser
            await dispenser.setPauseState(0);

            // Lock veOLAS
            await olas.approve(ve.address, initialMint);
            await ve.createLock(ethers.utils.parseEther("1"), oneYear);

            // Add a staking instance as a nominee
            await vw.addNomineeEVM(stakingInstance.address, chainId);

            // Vote for the nominee
            const stakingTarget = convertAddressToBytes32(stakingInstance.address);
            await vw.voteForNomineeWeights(stakingTarget, chainId, defaultWeight);

            // Checkpoint to apply changes
            await helpers.time.increase(epochLen);
            await tokenomics.checkpoint();

            // Claim staking incentives
            await dispenser.claimStakingIncentives(numClaimedEpochs, chainId, stakingTarget, bridgePayload);

            // Check that the target contract got OLAS
            let olasBalance = await olas.balanceOf(stakingInstance.address);
            expect(olasBalance).to.gt(0);
            console.log(olasBalance);

            // Restore to the state of the snapshot
            await snapshot.restore();
        });
    });
});
