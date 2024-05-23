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
    const maxWeight = 10000;
    const numClaimedEpochs = 1;
    const bridgePayload = "0x";
    const epochLen = oneMonth;
    const maxNumClaimingEpochs = 10;
    const maxNumStakingTargets = 100;
    const numInstances = 3;
    const defaultGasLimit = "2000000";
    const retainer = "0x" + "0".repeat(24) + "5".repeat(40);
    const livenessRatio = "1" + "0".repeat(16); // 0.01 transaction per second (TPS)
    let serviceParams = {
        metadataHash: defaultHash,
        maxNumServices: 3,
        rewardsPerSecond: "1" + "0".repeat(18),
        minStakingDeposit: 10,
        minNumStakingPeriods: 3,
        maxNumInactivityPeriods: 3,
        livenessPeriod: 10, // Ten seconds
        timeForEmissions: 100000000,
        numAgentInstances: 1,
        agentIds: [],
        threshold: 0,
        configHash: HashZero,
        proxyHash: HashZero,
        serviceRegistry: AddressZero,
        activityChecker: AddressZero
    };
    // Double (fload) delta
    const dDelta = 1. / 10**10;
    // Big number delta
    const bnDelta = 10**7;

    let signers;
    let deployer;
    let olas;
    let ve;
    let vw;
    let stakingActivityChecker;
    let stakingFactory;
    let stakingTokenImplementation;
    let stakingInstances = new Array(numInstances);
    let stakingInstanceAddresses = new Array(numInstances);
    let stakingInstanceAddresses32 = new Array(numInstances);
    let tokenomics;
    let treasury;
    let dispenser;
    let ethereumDepositProcessor;
    let bridgeRelayer;
    let gnosisDepositProcessorL1;
    let gnosisTargetDispenserL2;
    let wormholeDepositProcessorL1;

    function compare(a, b) {
        if (a.toString() < b.toString()){
            return -1;
        }
        if (a.toString() > b.toString()){
            return 1;
        }
        return 0;
    }

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
        // Create staking proxy instances
        for (let i = 0; i < numInstances; i++) {
            const stakingTokenAddress = await stakingFactory.getProxyAddress(stakingTokenImplementation.address);
            await stakingFactory.createStakingInstance(stakingTokenImplementation.address, initPayload);
            const stakingInstance = await ethers.getContractAt("StakingToken", stakingTokenAddress);
            stakingInstances[i] = stakingInstance;
            stakingInstanceAddresses[i] = stakingTokenAddress;
            stakingInstanceAddresses32[i] = convertAddressToBytes32(stakingTokenAddress);
        }


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
        it("Claim staking incentives with total veOLAS power bigger than inflation", async () => {
            // Take a snapshot of the current state of the blockchain
            const snapshot = await helpers.takeSnapshot();

            // Set staking fraction to 100%
            await tokenomics.changeIncentiveFractions(0, 0, 0, 0, 0, 100);
            // Changing staking parameters (max staking amount, min weight (in 10_000 form, so 100 is 1%))
            await tokenomics.changeStakingParams(ethers.utils.parseEther("300000"), 100);

            // Checkpoint to apply changes
            await helpers.time.increase(epochLen);
            await tokenomics.checkpoint();

            // Unpause the dispenser
            await dispenser.setPauseState(0);

            // Lock veOLAS
            await olas.approve(ve.address, initialMint);
            await ve.createLock(ethers.utils.parseEther("100000"), oneYear * 4);
            // Transfer OLAS to another account
            await olas.transfer(signers[1].address, ethers.utils.parseEther("200000"));
            await olas.connect(signers[1]).approve(ve.address, initialMint);
            await ve.connect(signers[1]).createLock(ethers.utils.parseEther("200000"), oneYear * 4);

            // Add a staking instances as nominees
            for (let i = 0; i < numInstances; i++) {
                await vw.addNomineeEVM(stakingInstances[i].address, chainId);
            }

            const chainIds = new Array(numInstances).fill(chainId);
            // Vote for the nominees by the deployer
            const weights = [maxWeight / 2, maxWeight / 2, 0];
            await vw.voteForNomineeWeightsBatch(stakingInstanceAddresses32, chainIds, weights);
            // Vote for the nominees by the deployer
            const weights2 = [Math.floor(maxWeight / 3), Math.floor(maxWeight / 3), Math.floor(maxWeight / 3) + 1];
            await vw.connect(signers[1]).voteForNomineeWeightsBatch(stakingInstanceAddresses32, chainIds, weights2);

            // Checkpoint to apply changes
            await helpers.time.increase(epochLen);
            await tokenomics.checkpoint();

            // Get the staking inflation for the previous epoch
            const lastPoint = await tokenomics.epochCounter() - 1;
            // Get the staking point of the last epoch
            const sp = await tokenomics.mapEpochStakingPoints(lastPoint);

            // Calculate total staking incentive and return amounts
            let totalStakingIncentive = ethers.BigNumber.from(0);
            let totalReturnAmount = ethers.BigNumber.from(0);
            for (let i = 0; i < numInstances; i++) {
                const res = await dispenser.callStatic.calculateStakingIncentives(numClaimedEpochs, chainId,
                    stakingInstanceAddresses32[i], 18);
                totalStakingIncentive = totalStakingIncentive.add(res.totalStakingIncentive);
                totalReturnAmount = totalReturnAmount.add(res.totalReturnAmount);
            }

            // Get the difference: staking inflation - (staking incentive + staking return)
            let diff = sp.stakingIncentive.sub(totalStakingIncentive.add(totalReturnAmount));
            expect(diff).to.lt(bnDelta);

            // Sort staking addresses
            stakingInstanceAddresses32.sort(compare);
            // Claim staking incentives
            await dispenser.claimStakingIncentivesBatch(numClaimedEpochs, [chainId], [stakingInstanceAddresses32],
                [bridgePayload], [0]);

            // Check that the target contract got OLAS
            let sumBalance = ethers.BigNumber.from(0);
            let balances = new Array(numInstances).fill(0);
            for (let i = 0; i < numInstances; i++) {
                balances[i] = await olas.balanceOf(stakingInstances[i].address);
                sumBalance = sumBalance.add(balances[i]);
                expect(balances[i]).to.gt(0);
            }

            // Since the veOLAS power is bigger than staking inflation, all the staking inflation must be used
            diff = sp.stakingIncentive.sub(sumBalance);
            expect(diff).to.lt(bnDelta);

            // Restore to the state of the snapshot
            await snapshot.restore();
        });

        it("Claim staking incentives with total veOLAS power smaller than inflation", async () => {
            // Take a snapshot of the current state of the blockchain
            const snapshot = await helpers.takeSnapshot();

            // Set staking fraction to 100%
            await tokenomics.changeIncentiveFractions(0, 0, 0, 0, 0, 100);
            // Changing staking parameters (max staking amount, min weight (in 10_000 form, so 100 is 1%))
            // The limit is much smaller than the staking inflation
            await tokenomics.changeStakingParams(ethers.utils.parseEther("3"), 100);

            // Checkpoint to apply changes
            await helpers.time.increase(epochLen);
            await tokenomics.checkpoint();

            // Unpause the dispenser
            await dispenser.setPauseState(0);

            // Lock veOLAS
            await olas.approve(ve.address, initialMint);
            await ve.createLock(ethers.utils.parseEther("1"), oneYear);
            // Transfer OLAS to another account
            await olas.transfer(signers[1].address, ethers.utils.parseEther("2"));
            await olas.connect(signers[1]).approve(ve.address, initialMint);
            await ve.connect(signers[1]).createLock(ethers.utils.parseEther("2"), oneYear);

            // Add a staking instances as nominees
            for (let i = 0; i < numInstances; i++) {
                await vw.addNomineeEVM(stakingInstances[i].address, chainId);
            }

            const chainIds = new Array(numInstances).fill(chainId);
            // Vote for the nominees by the deployer
            const weights = [maxWeight / 2, maxWeight / 2, 0];
            await vw.voteForNomineeWeightsBatch(stakingInstanceAddresses32, chainIds, weights);
            // Vote for the nominees by the deployer
            const weights2 = [Math.floor(maxWeight / 3), Math.floor(maxWeight / 3), Math.floor(maxWeight / 3) + 1];
            await vw.connect(signers[1]).voteForNomineeWeightsBatch(stakingInstanceAddresses32, chainIds, weights2);

            // Checkpoint to apply changes
            await helpers.time.increase(epochLen);
            await tokenomics.checkpoint();

            // Get the staking inflation for the previous epoch
            const lastPoint = await tokenomics.epochCounter() - 1;
            // Get the staking point of the last epoch
            const sp = await tokenomics.mapEpochStakingPoints(lastPoint);

            // Calculate total staking incentive and return amounts
            let totalStakingIncentive = ethers.BigNumber.from(0);
            let totalReturnAmount = ethers.BigNumber.from(0);
            for (let i = 0; i < numInstances; i++) {
                const res = await dispenser.callStatic.calculateStakingIncentives(numClaimedEpochs, chainId,
                    stakingInstanceAddresses32[i], 18);
                totalStakingIncentive = totalStakingIncentive.add(res.totalStakingIncentive);
                totalReturnAmount = totalReturnAmount.add(res.totalReturnAmount);
            }
            
            // Get the difference: staking inflation - (staking incentive + staking return)
            const diff = sp.stakingIncentive.sub(totalStakingIncentive.add(totalReturnAmount));
            expect(diff).to.lt(bnDelta);

            // Sort staking addresses
            stakingInstanceAddresses32.sort(compare);
            // Claim staking incentives
            await dispenser.claimStakingIncentivesBatch(numClaimedEpochs, [chainId], [stakingInstanceAddresses32],
                [bridgePayload], [0]);

            // Check that the target contract got OLAS
            let balances = new Array(numInstances).fill(0);
            let totalWeights = new Array(numInstances).fill(0);
            let ratios = new Array(numInstances).fill(0);
            let ratioSum = 0;
            for (let i = 0; i < numInstances; i++) {
                const weightBN = ethers.BigNumber.from(weights[i]);
                const weightBN2 = ethers.BigNumber.from(weights2[i]);
                const maxWeightBN = ethers.BigNumber.from(maxWeight);

                totalWeights[i] = ((await ve.getVotes(deployer.address)).mul(weightBN).
                    add((await ve.getVotes(signers[1].address)).mul(weightBN2))).div(maxWeightBN);

                balances[i] = await olas.balanceOf(stakingInstances[i].address);
                expect(balances[i]).to.gt(0);

                ratios[i] = Number(totalWeights[i]) / Number(balances[i]);
                ratioSum += ratios[i];
            }

            // The weight / balance ratio must be approximately the same for all the elements
            const ratioAverage = ratioSum / numInstances;
            for (let i = 0; i < numInstances; i++) {
                const diff = Math.abs(ratios[i] - ratioAverage);
                expect(diff).to.lt(dDelta);
            }

            // Restore to the state of the snapshot
            await snapshot.restore();
        });
    });
});
