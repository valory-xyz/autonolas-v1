/*global describe, context, beforeEach, it*/

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Governance integration", function () {
    let gnosisSafeL2;
    let gnosisSafeProxyFactory;
    let testServiceRegistry;
    let token;
    let ve;
    let signers;
    const AddressZero = "0x" + "0".repeat(40);
    const bytes32Zero = "0x" + "0".repeat(64);
    const oneOLABalance = ethers.utils.parseEther("1");
    const fiveOLABalance = ethers.utils.parseEther("5");
    const tenOLABalance = ethers.utils.parseEther("10");
    const minDelay = 1; // blocks
    const initialVotingDelay = 0; // blocks
    const initialVotingPeriod = 1; // blocks
    const initialProposalThreshold = fiveOLABalance; // required voting power
    const quorum = 1; // quorum factor
    const proposalDescription = "Proposal to change value";
    const controlValue = 20;
    beforeEach(async function () {
        const GnosisSafeL2 = await ethers.getContractFactory("GnosisSafeL2");
        gnosisSafeL2 = await GnosisSafeL2.deploy();
        await gnosisSafeL2.deployed();

        const GnosisSafeProxyFactory = await ethers.getContractFactory("GnosisSafeProxyFactory");
        gnosisSafeProxyFactory = await GnosisSafeProxyFactory.deploy();
        await gnosisSafeProxyFactory.deployed();

        const TestServiceRegistry = await ethers.getContractFactory("TestServiceRegistry");
        testServiceRegistry = await TestServiceRegistry.deploy("service registry", "SERVICE", AddressZero);
        await testServiceRegistry.deployed();

        const Token = await ethers.getContractFactory("OLA");
        token = await Token.deploy(0);
        await token.deployed();

        // Dispenser address is irrelevant in these tests, so its contract is passed as a zero address
        const VotingEscrow = await ethers.getContractFactory("VotingEscrow");
        ve = await VotingEscrow.deploy(token.address, "Governance OLA", "veOLA");
        await ve.deployed();

        signers = await ethers.getSigners();

        // Mint 10 OLA worth of OLA tokens by default
        await token.mint(signers[0].address, tenOLABalance);
        const balance = await token.balanceOf(signers[0].address);
        expect(ethers.utils.formatEther(balance) == 10).to.be.true;
    });

    context("Controlling other contracts", async function () {
        it("Governance setup and control via proposal roles", async function () {
            // Deploy Timelock
            const executors = [signers[0].address];
            const proposers = [signers[0].address];
            const Timelock = await ethers.getContractFactory("Timelock");
            const timelock = await Timelock.deploy(minDelay, proposers, executors);
            await timelock.deployed();
            // console.log("Timelock deployed to", timelock.address);

            // Deploy Governance Bravo
            const GovernorBravo = await ethers.getContractFactory("GovernorBravoOLA");
            const governorBravo = await GovernorBravo.deploy(ve.address, timelock.address, initialVotingDelay,
                initialVotingPeriod, initialProposalThreshold, quorum);
            await governorBravo.deployed();
            // console.log("Governor Bravo deployed to", governorBravo.address);

            // Setting the governor of a controlled contract
            testServiceRegistry.changeManager(timelock.address);

            // Schedule an operation from timelock via a proposer (deployer by default)
            const callData = testServiceRegistry.interface.encodeFunctionData("executeByGovernor", [controlValue]);
            await timelock.schedule(testServiceRegistry.address, 0, callData, bytes32Zero, bytes32Zero, minDelay);

            // Waiting for the minDelay number of blocks to pass
            for (let i = 0; i < minDelay; i++) {
                ethers.provider.send("evm_mine");
            }

            // Execute the proposed operation and check the execution result
            await timelock.execute(testServiceRegistry.address, 0, callData, bytes32Zero, bytes32Zero);
            const newValue = await testServiceRegistry.getControlValue();
            expect(newValue).to.be.equal(controlValue);
        });

        it("Governance setup and control via delegator proposal", async function () {
            const deployer = signers[0];
            const balance = await token.balanceOf(deployer.address);
            expect(ethers.utils.formatEther(balance) == 10).to.be.true;

            // Approve signers[0] for 10 OLA by voting ve
            await token.connect(deployer).approve(ve.address, tenOLABalance);

            // Define 4 years for the lock duration.
            // This will result in voting power being almost exactly as OLA amount locked:
            // voting power = amount * t_left_before_unlock / t_max
            const fourYears = 4 * 365 * 86400;
            const lockDuration = fourYears;

            // Lock 5 OLA, which is lower than the initial proposal threshold by a bit
            await ve.connect(deployer).createLock(fiveOLABalance, lockDuration);
            // Add a bit more
            await ve.connect(deployer).increaseAmount(oneOLABalance);

            // Deploy Timelock
            const executors = [];
            const proposers = [];
            const Timelock = await ethers.getContractFactory("Timelock");
            const timelock = await Timelock.deploy(minDelay, proposers, executors);
            await timelock.deployed();

            // Deploy Governance Bravo
            const GovernorBravo = await ethers.getContractFactory("GovernorBravoOLA");
            const governorBravo = await GovernorBravo.deploy(ve.address, timelock.address, initialVotingDelay,
                initialVotingPeriod, initialProposalThreshold, quorum);
            await governorBravo.deployed();

            // Grand governorBravo an admin, proposer and executor role in the timelock
            const adminRole = ethers.utils.id("TIMELOCK_ADMIN_ROLE");
            await timelock.grantRole(adminRole, governorBravo.address);
            const proposerRole = ethers.utils.id("PROPOSER_ROLE");
            await timelock.grantRole(proposerRole, governorBravo.address);
            const executorRole = ethers.utils.id("EXECUTOR_ROLE");
            await timelock.grantRole(executorRole, governorBravo.address);

            // Setting the governor of a controlled contract
            testServiceRegistry.changeManager(timelock.address);

            // Schedule an operation from timelock via a proposer (deployer by default)
            const callData = testServiceRegistry.interface.encodeFunctionData("executeByGovernor", [controlValue]);
            // Solidity overridden functions must be explicitly declared
            // https://github.com/ethers-io/ethers.js/issues/407
            await governorBravo["propose(address[],uint256[],bytes[],string)"]([testServiceRegistry.address], [0],
                [callData], proposalDescription);

            // Get the proposalId
            const descriptionHash = ethers.utils.id(proposalDescription);
            const proposalId = await governorBravo.hashProposal([testServiceRegistry.address], [0], [callData],
                descriptionHash);

            // If initialVotingDelay is greater than 0 we have to wait that many blocks before the voting starts
            // Casting votes for the proposalId: 0 - Against, 1 - For, 2 - Abstain
            await governorBravo.castVote(proposalId, 1);
            await governorBravo["queue(address[],uint256[],bytes[],bytes32)"]([testServiceRegistry.address], [0],
                [callData], descriptionHash);

            // Waiting for the next minDelay blocks to pass
            ethers.provider.send("evm_increaseTime", [minDelay * 86460]);
            ethers.provider.send("evm_mine");

            // Execute the proposed operation and check the execution result
            await governorBravo["execute(uint256)"](proposalId);
            const newValue = await testServiceRegistry.getControlValue();
            expect(newValue).to.be.equal(controlValue);
        });

        it("Cancel the proposal that was setup via delegator proposal", async function () {
            const deployer = signers[0];
            const balance = await token.balanceOf(deployer.address);
            expect(ethers.utils.formatEther(balance) == 10).to.be.true;

            // Approve signers[0] for 10 OLA by voting ve
            await token.connect(deployer).approve(ve.address, tenOLABalance);

            // Define 4 years for the lock duration.
            // This will result in voting power being almost exactly as OLA amount locked:
            // voting power = amount * t_left_before_unlock / t_max
            const fourYears = 4 * 365 * 86400;
            const lockDuration = fourYears;

            // Lock 5 OLA, which is lower than the initial proposal threshold by a bit
            await ve.connect(deployer).createLock(fiveOLABalance, lockDuration);
            // Add a bit more
            await ve.connect(deployer).increaseAmount(oneOLABalance);

            // Deploy Timelock
            const executors = [];
            const proposers = [];
            const Timelock = await ethers.getContractFactory("Timelock");
            const timelock = await Timelock.deploy(minDelay, proposers, executors);
            await timelock.deployed();

            // Deploy Governance Bravo
            const GovernorBravo = await ethers.getContractFactory("GovernorBravoOLA");
            const governorBravo = await GovernorBravo.deploy(ve.address, timelock.address, initialVotingDelay,
                initialVotingPeriod, initialProposalThreshold, quorum);
            await governorBravo.deployed();

            // Grand governorBravo an admin, proposer, executor and canceller role in the timelock
            const adminRole = ethers.utils.id("TIMELOCK_ADMIN_ROLE");
            await timelock.grantRole(adminRole, governorBravo.address);
            const proposerRole = ethers.utils.id("PROPOSER_ROLE");
            await timelock.grantRole(proposerRole, governorBravo.address);
            const executorRole = ethers.utils.id("EXECUTOR_ROLE");
            await timelock.grantRole(executorRole, governorBravo.address);
            const cancellerRole = ethers.utils.id("CANCELLER_ROLE");
            await timelock.grantRole(cancellerRole, governorBravo.address);

            // Setting the governor of a controlled contract
            testServiceRegistry.changeManager(timelock.address);

            // Schedule an operation from timelock via a proposer (deployer by default)
            const callData = testServiceRegistry.interface.encodeFunctionData("executeByGovernor", [controlValue]);
            // Solidity overridden functions must be explicitly declared
            // https://github.com/ethers-io/ethers.js/issues/407
            await governorBravo["propose(address[],uint256[],bytes[],string)"]([testServiceRegistry.address], [0],
                [callData], proposalDescription);

            // Get the proposalId
            const descriptionHash = ethers.utils.id(proposalDescription);
            const proposalId = await governorBravo.hashProposal([testServiceRegistry.address], [0], [callData],
                descriptionHash);

            // If initialVotingDelay is greater than 0 we have to wait that many blocks before the voting starts
            // Casting votes for the proposalId: 0 - Against, 1 - For, 2 - Abstain
            await governorBravo.castVote(proposalId, 1);
            await governorBravo["queue(address[],uint256[],bytes[],bytes32)"]([testServiceRegistry.address], [0],
                [callData], descriptionHash);

            // Cancel the proposal
            await governorBravo["cancel(uint256)"](proposalId);

            // Check that the proposal was cancelled: enum value of ProposalState.Canceled == 2
            const proposalState = await governorBravo.state(proposalId);
            expect(proposalState).to.equal(2);
        });

        it("Governance proposal from multisig veOLA stakers", async function () {
            const safeSigners = [signers[1], signers[2]];
            const safeThreshold = 2;
            let nonce = 0;
            // Create a multisig
            const setupData = gnosisSafeL2.interface.encodeFunctionData(
                "setup",
                // signers, threshold, to_address, data, fallback_handler, payment_token, payment, payment_receiver
                [[safeSigners[0].address, safeSigners[1].address], safeThreshold, AddressZero, "0x", AddressZero, AddressZero, 0, AddressZero]
            );
            const safeContracts = require("@gnosis.pm/safe-contracts");
            const proxyAddress = await safeContracts.calculateProxyAddress(gnosisSafeProxyFactory, gnosisSafeL2.address,
                setupData, nonce);
            await gnosisSafeProxyFactory.createProxyWithNonce(gnosisSafeL2.address, setupData, nonce).then((tx) => tx.wait());
            const multisig = await ethers.getContractAt("GnosisSafeL2", proxyAddress);

            // Mint 10 OLA tokens to the multisig
            await token.mint(multisig.address, tenOLABalance);
            const balance = await token.balanceOf(multisig.address);
            expect(ethers.utils.formatEther(balance) == 10).to.be.true;

            // Approve multisig for 10 OLA by voting ve
            nonce = await multisig.nonce();
            let txHashData = await safeContracts.buildContractCall(token, "approve",
                [ve.address, tenOLABalance], nonce, 0, 0);
            let signMessageData = [await safeContracts.safeSignMessage(safeSigners[0], multisig, txHashData, 0),
                await safeContracts.safeSignMessage(safeSigners[1], multisig, txHashData, 0)];
            await safeContracts.executeTx(multisig, txHashData, signMessageData, 0);

            // Define 4 years for the lock duration.
            // This will result in voting power being almost exactly as OLA amount locked:
            // voting power = amount * t_left_before_unlock / t_max
            const fourYears = 4 * 365 * 86400;
            const lockDuration = fourYears;

            // Lock 5 OLA, which is lower than the initial proposal threshold by a bit
            nonce = await multisig.nonce();
            txHashData = await safeContracts.buildContractCall(ve, "createLock",
                [fiveOLABalance, lockDuration], nonce, 0, 0);
            signMessageData = [await safeContracts.safeSignMessage(safeSigners[0], multisig, txHashData, 0),
                await safeContracts.safeSignMessage(safeSigners[1], multisig, txHashData, 0)];
            await safeContracts.executeTx(multisig, txHashData, signMessageData, 0);
            // Add a bit more
            nonce = await multisig.nonce();
            txHashData = await safeContracts.buildContractCall(ve, "increaseAmount",
                [oneOLABalance], nonce, 0, 0);
            signMessageData = [await safeContracts.safeSignMessage(safeSigners[0], multisig, txHashData, 0),
                await safeContracts.safeSignMessage(safeSigners[1], multisig, txHashData, 0)];
            await safeContracts.executeTx(multisig, txHashData, signMessageData, 0);

            // Deploy Timelock
            const executors = [];
            const proposers = [];
            const Timelock = await ethers.getContractFactory("Timelock");
            const timelock = await Timelock.deploy(minDelay, proposers, executors);
            await timelock.deployed();

            // Deploy Governance Bravo
            const GovernorBravo = await ethers.getContractFactory("GovernorBravoOLA");
            const governorBravo = await GovernorBravo.deploy(ve.address, timelock.address, initialVotingDelay,
                initialVotingPeriod, initialProposalThreshold, quorum);
            await governorBravo.deployed();

            // Grand governorBravo an admin, proposer and executor role in the timelock
            const adminRole = ethers.utils.id("TIMELOCK_ADMIN_ROLE");
            await timelock.grantRole(adminRole, governorBravo.address);
            const proposerRole = ethers.utils.id("PROPOSER_ROLE");
            await timelock.grantRole(proposerRole, governorBravo.address);
            const executorRole = ethers.utils.id("EXECUTOR_ROLE");
            await timelock.grantRole(executorRole, governorBravo.address);

            // Setting the governor of a controlled contract
            testServiceRegistry.changeManager(timelock.address);

            // Schedule an operation from timelock via a proposer (deployer by default)
            const callData = testServiceRegistry.interface.encodeFunctionData("executeByGovernor", [controlValue]);

            // Make a proposal by a multisig
            nonce = await multisig.nonce();
            txHashData = await safeContracts.buildContractCall(governorBravo, "propose(address[],uint256[],bytes[],string)",
                [[testServiceRegistry.address], [0], [callData], proposalDescription], nonce, 0, 0);
            signMessageData = [await safeContracts.safeSignMessage(safeSigners[0], multisig, txHashData, 0),
                await safeContracts.safeSignMessage(safeSigners[1], multisig, txHashData, 0)];
            await safeContracts.executeTx(multisig, txHashData, signMessageData, 0);

            // Get the proposalId
            const descriptionHash = ethers.utils.id(proposalDescription);
            const proposalId = await governorBravo.hashProposal([testServiceRegistry.address], [0], [callData],
                descriptionHash);

            // If initialVotingDelay is greater than 0 we have to wait that many blocks before the voting starts
            // Casting votes for the proposalId: 0 - Against, 1 - For, 2 - Abstain
            nonce = await multisig.nonce();
            txHashData = await safeContracts.buildContractCall(governorBravo, "castVote",
                [proposalId, 1], nonce, 0, 0);
            signMessageData = [await safeContracts.safeSignMessage(safeSigners[0], multisig, txHashData, 0),
                await safeContracts.safeSignMessage(safeSigners[1], multisig, txHashData, 0)];
            await safeContracts.executeTx(multisig, txHashData, signMessageData, 0);

            // Queueing the passed proposal
            nonce = await multisig.nonce();
            txHashData = await safeContracts.buildContractCall(governorBravo, "queue(address[],uint256[],bytes[],bytes32)",
                [[testServiceRegistry.address], [0], [callData], descriptionHash], nonce, 0, 0);
            signMessageData = [await safeContracts.safeSignMessage(safeSigners[0], multisig, txHashData, 0),
                await safeContracts.safeSignMessage(safeSigners[1], multisig, txHashData, 0)];
            await safeContracts.executeTx(multisig, txHashData, signMessageData, 0);

            // Waiting for the next minDelay blocks to pass
            ethers.provider.send("evm_mine");

            // Execute the proposed operation and check the execution result
            nonce = await multisig.nonce();
            txHashData = await safeContracts.buildContractCall(governorBravo, "execute(uint256)",
                [proposalId], nonce, 0, 0);
            signMessageData = [await safeContracts.safeSignMessage(safeSigners[0], multisig, txHashData, 0),
                await safeContracts.safeSignMessage(safeSigners[1], multisig, txHashData, 0)];
            await safeContracts.executeTx(multisig, txHashData, signMessageData, 0);

            // Check that the value of the testServiceRegistry was changed
            const newValue = await testServiceRegistry.getControlValue();
            expect(newValue).to.be.equal(controlValue);
        });

        it("Defeating the proposal", async function () {
            // Mint OLA for other signers
            for (let i = 1; i < 4; i++) {
                await token.mint(signers[i].address, tenOLABalance);
            }

            // Approve signers for 10 OLA by voting ve
            for (let i = 0; i < 4; i++) {
                await token.connect(signers[i]).approve(ve.address, tenOLABalance);
            }

            // Define 4 years for the lock duration.
            // This will result in voting power being almost exactly as OLA amount locked:
            // voting power = amount * t_left_before_unlock / t_max
            const fourYears = 4 * 365 * 86400;
            const lockDuration = fourYears;

            // Lock 5 OLA, which is lower than the initial proposal threshold by a bit
            await ve.createLock(fiveOLABalance, lockDuration);
            // Add a bit more
            await ve.increaseAmount(oneOLABalance);

            // Set quorum to 20%
            const newQuorum = 20;
            // Set initial voting delay, period and mindelay as 10 blocks
            const newInitialVotingDelay = 10;
            const newInitialVotingPeriod = 10;
            const newMinDelay = 10;

            // Deploy Timelock
            const executors = [];
            const proposers = [];
            const Timelock = await ethers.getContractFactory("Timelock");
            const timelock = await Timelock.deploy(newMinDelay, proposers, executors);
            await timelock.deployed();

            // Deploy Governance Bravo
            const GovernorBravo = await ethers.getContractFactory("GovernorBravoOLA");
            const governorBravo = await GovernorBravo.deploy(ve.address, timelock.address, newInitialVotingDelay,
                newInitialVotingPeriod, initialProposalThreshold, newQuorum);
            await governorBravo.deployed();

            // Grand governorBravo an admin, proposer and executor role in the timelock
            const adminRole = ethers.utils.id("TIMELOCK_ADMIN_ROLE");
            await timelock.grantRole(adminRole, governorBravo.address);
            const proposerRole = ethers.utils.id("PROPOSER_ROLE");
            await timelock.grantRole(proposerRole, governorBravo.address);
            const executorRole = ethers.utils.id("EXECUTOR_ROLE");
            await timelock.grantRole(executorRole, governorBravo.address);

            // Setting the governor of a controlled contract
            testServiceRegistry.changeManager(timelock.address);

            // Schedule an operation from timelock via a proposer (signers[0] by default)
            const callData = testServiceRegistry.interface.encodeFunctionData("executeByGovernor", [controlValue]);
            await governorBravo["propose(address[],uint256[],bytes[],string)"]([testServiceRegistry.address], [0],
                [callData], proposalDescription);

            // Get the proposalId
            const descriptionHash = ethers.utils.id(proposalDescription);
            const proposalId = await governorBravo.hashProposal([testServiceRegistry.address], [0], [callData],
                descriptionHash);

            // Trying to vote right away does not respect the initial voting delay
            await expect(
                governorBravo.castVote(proposalId, 1)
            ).to.be.revertedWith("Governor: vote not currently active");

            // Wait for 10 initial blocks
            for (let i = 0; i < newInitialVotingDelay - 1; i++) {
                ethers.provider.send("evm_mine");
            }

            // Have other signers cast votes
            await ve.connect(signers[1]).createLock(fiveOLABalance, lockDuration);
            await ve.connect(signers[2]).createLock(fiveOLABalance, lockDuration);
            await ve.connect(signers[3]).createLock(fiveOLABalance, lockDuration);

            // If initialVotingDelay is greater than 0 we have to wait that many blocks before the voting starts
            // Casting votes for the proposalId: 0 - Against, 1 - For, 2 - Abstain
            // signers[0] votes for
            await governorBravo.castVote(proposalId, 1);
            // Trying to vote again
            await expect(
                governorBravo.castVote(proposalId, 0)
            ).to.be.revertedWith("GovernorCompatibilityBravo: vote already cast");

            // signers[1] and signers[2] vote against
            await governorBravo.connect(signers[1]).castVote(proposalId, 0);
            await governorBravo.connect(signers[2]).castVote(proposalId, 0);
            // The total amount of voting power is 6 + 5 + 5 + 5 = 21. 6 voted for, 10 against
            // The proposal is not successful
            // Wait for past the voting period number of blocks
            for (let i = 0; i < newInitialVotingPeriod; i++) {
                ethers.provider.send("evm_mine");
            }

            await expect(
                governorBravo["queue(address[],uint256[],bytes[],bytes32)"]([testServiceRegistry.address], [0],
                    [callData], descriptionHash)
            ).to.be.revertedWith("Governor: proposal not successful");
        });

        it("Winning the proposal with multiple voters", async function () {
            // Mint OLA for other signers
            for (let i = 1; i < 4; i++) {
                await token.mint(signers[i].address, tenOLABalance);
            }

            // Approve signers for 10 OLA by voting ve
            for (let i = 0; i < 4; i++) {
                await token.connect(signers[i]).approve(ve.address, tenOLABalance);
            }

            // Define 4 years for the lock duration.
            // This will result in voting power being almost exactly as OLA amount locked:
            // voting power = amount * t_left_before_unlock / t_max
            const fourYears = 4 * 365 * 86400;
            const lockDuration = fourYears;

            // Lock 5 OLA, which is lower than the initial proposal threshold by a bit
            await ve.createLock(fiveOLABalance, lockDuration);
            // Add a bit more
            await ve.increaseAmount(oneOLABalance);

            // Set quorum to 20%
            const newQuorum = 20;
            // Set initial voting delay, period and mindelay as 10 blocks
            const newInitialVotingDelay = 10;
            const newInitialVotingPeriod = 10;
            const newMinDelay = 10;

            // Deploy Timelock
            const executors = [];
            const proposers = [];
            const Timelock = await ethers.getContractFactory("Timelock");
            const timelock = await Timelock.deploy(newMinDelay, proposers, executors);
            await timelock.deployed();

            // Deploy Governance Bravo
            const GovernorBravo = await ethers.getContractFactory("GovernorBravoOLA");
            const governorBravo = await GovernorBravo.deploy(ve.address, timelock.address, newInitialVotingDelay,
                newInitialVotingPeriod, initialProposalThreshold, newQuorum);
            await governorBravo.deployed();

            // Grand governorBravo an admin, proposer and executor role in the timelock
            const adminRole = ethers.utils.id("TIMELOCK_ADMIN_ROLE");
            await timelock.grantRole(adminRole, governorBravo.address);
            const proposerRole = ethers.utils.id("PROPOSER_ROLE");
            await timelock.grantRole(proposerRole, governorBravo.address);
            const executorRole = ethers.utils.id("EXECUTOR_ROLE");
            await timelock.grantRole(executorRole, governorBravo.address);

            // Setting the governor of a controlled contract
            testServiceRegistry.changeManager(timelock.address);

            // Schedule an operation from timelock via a proposer (signers[0] by default)
            const callData = testServiceRegistry.interface.encodeFunctionData("executeByGovernor", [controlValue]);
            await governorBravo["propose(address[],uint256[],bytes[],string)"]([testServiceRegistry.address], [0],
                [callData], proposalDescription);

            // Get the proposalId
            const descriptionHash = ethers.utils.id(proposalDescription);
            const proposalId = await governorBravo.hashProposal([testServiceRegistry.address], [0], [callData],
                descriptionHash);

            // Trying to vote right away does not respect the initial voting delay
            await expect(
                governorBravo.castVote(proposalId, 1)
            ).to.be.revertedWith("Governor: vote not currently active");

            // Wait for 10 initial blocks
            for (let i = 0; i < newInitialVotingDelay - 1; i++) {
                ethers.provider.send("evm_mine");
            }

            // Have other signers cast votes
            await ve.connect(signers[1]).createLock(fiveOLABalance, lockDuration);
            await ve.connect(signers[2]).createLock(fiveOLABalance, lockDuration);
            await ve.connect(signers[3]).createLock(fiveOLABalance, lockDuration);

            // If initialVotingDelay is greater than 0 we have to wait that many blocks before the voting starts
            // Casting votes for the proposalId: 0 - Against, 1 - For, 2 - Abstain
            // signers[0] votes for
            await governorBravo.castVote(proposalId, 1);
            // Trying to vote again
            await expect(
                governorBravo.castVote(proposalId, 0)
            ).to.be.revertedWith("GovernorCompatibilityBravo: vote already cast");
            // signers[1] and signers[2] vote against, signers[3] votes for
            await governorBravo.connect(signers[1]).castVote(proposalId, 0);
            await governorBravo.connect(signers[2]).castVote(proposalId, 0);
            await governorBravo.connect(signers[3]).castVote(proposalId, 1);
            // The total amount of voting power is 6 + 5 + 5 + 5 = 21.
            // Overall voting fraction now is 11 vs 10. The proposal succeeds

            // Wait for voting period blocks, out of 10 only 2 blocks are left
            for (let i = 0; i < 2; i++) {
                ethers.provider.send("evm_mine");
            }

            await governorBravo["queue(address[],uint256[],bytes[],bytes32)"]([testServiceRegistry.address], [0],
                [callData], descriptionHash);

            // Trying to execute the proposal right away without the min delay wait
            await expect(
                governorBravo["execute(uint256)"](proposalId)
            ).to.be.revertedWith("TimelockController: operation is not ready");

            // Waiting for the next minDelay blocks to pass
            for (let i = 0; i < newMinDelay; i++) {
                ethers.provider.send("evm_mine");
            }

            // Execute the proposed operation and check the execution result
            await governorBravo["execute(uint256)"](proposalId);
            const newValue = await testServiceRegistry.getControlValue();
            expect(newValue).to.be.equal(controlValue);
        });
    });
});
