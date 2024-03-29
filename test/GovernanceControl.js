/*global describe, context, beforeEach, it*/

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Governance integration", function () {
    let gnosisSafe;
    let gnosisSafeProxyFactory;
    let testServiceRegistry;
    let serviceRegistry;
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
        const GnosisSafe = await ethers.getContractFactory("GnosisSafe");
        gnosisSafe = await GnosisSafe.deploy();
        await gnosisSafe.deployed();

        const GnosisSafeProxyFactory = await ethers.getContractFactory("GnosisSafeProxyFactory");
        gnosisSafeProxyFactory = await GnosisSafeProxyFactory.deploy();
        await gnosisSafeProxyFactory.deployed();

        const TestServiceRegistry = await ethers.getContractFactory("TestServiceRegistry");
        testServiceRegistry = await TestServiceRegistry.deploy("Test service registry", "TESTSERVICE",
            "https://localhost/service/", AddressZero);
        await testServiceRegistry.deployed();

        const ServiceRegistry = await ethers.getContractFactory("ServiceRegistry");
        serviceRegistry = await ServiceRegistry.deploy("Service Registry", "SERVICE", "https://localhost/service/",
            AddressZero);
        await serviceRegistry.deployed();

        const Token = await ethers.getContractFactory("OLAS");
        token = await Token.deploy();
        await token.deployed();

        // Dispenser address is irrelevant in these tests, so its contract is passed as a zero address
        const VE = await ethers.getContractFactory("veOLAS");
        ve = await VE.deploy(token.address, "Voting Escrow OLAS", "veOLAS");
        await ve.deployed();

        signers = await ethers.getSigners();

        // Mint 10 OLAS worth of OLAS tokens by default
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
            const GovernorBravo = await ethers.getContractFactory("GovernorOLAS");
            const governor = await GovernorBravo.deploy(ve.address, timelock.address, initialVotingDelay,
                initialVotingPeriod, initialProposalThreshold, quorum);
            await governor.deployed();
            // console.log("Governor Bravo deployed to", governor.address);

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

            // Approve signers[0] for 10 OLAS by voting ve
            await token.connect(deployer).approve(ve.address, tenOLABalance);

            // Define 4 years for the lock duration.
            // This will result in voting power being almost exactly as OLAS amount locked:
            // voting power = amount * t_left_before_unlock / t_max
            const fourYears = 4 * 365 * 86400;
            const lockDuration = fourYears;

            // Lock 5 OLAS, which is lower than the initial proposal threshold by a bit
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
            const GovernorBravo = await ethers.getContractFactory("GovernorOLAS");
            const governor = await GovernorBravo.deploy(ve.address, timelock.address, initialVotingDelay,
                initialVotingPeriod, initialProposalThreshold, quorum);
            await governor.deployed();

            // Grand governor an admin, proposer and executor role in the timelock
            const adminRole = ethers.utils.id("TIMELOCK_ADMIN_ROLE");
            await timelock.grantRole(adminRole, governor.address);
            const proposerRole = ethers.utils.id("PROPOSER_ROLE");
            await timelock.grantRole(proposerRole, governor.address);
            const executorRole = ethers.utils.id("EXECUTOR_ROLE");
            await timelock.grantRole(executorRole, governor.address);

            // Setting the governor of a controlled contract
            testServiceRegistry.changeManager(timelock.address);

            // Schedule an operation from timelock via a proposer (deployer by default)
            const callData = testServiceRegistry.interface.encodeFunctionData("executeByGovernor", [controlValue]);
            // Solidity overridden functions must be explicitly declared
            // https://github.com/ethers-io/ethers.js/issues/407
            await governor["propose(address[],uint256[],bytes[],string)"]([testServiceRegistry.address], [0],
                [callData], proposalDescription);

            // Get the proposalId
            const descriptionHash = ethers.utils.id(proposalDescription);
            const proposalId = await governor.hashProposal([testServiceRegistry.address], [0], [callData],
                descriptionHash);

            // If initialVotingDelay is greater than 0 we have to wait that many blocks before the voting starts
            // Casting votes for the proposalId: 0 - Against, 1 - For, 2 - Abstain
            await governor.castVote(proposalId, 1);
            await governor["queue(address[],uint256[],bytes[],bytes32)"]([testServiceRegistry.address], [0],
                [callData], descriptionHash);

            // Waiting for the next minDelay blocks to pass
            ethers.provider.send("evm_increaseTime", [minDelay * 86460]);
            ethers.provider.send("evm_mine");

            // Execute the proposed operation and check the execution result
            await governor["execute(uint256)"](proposalId);
            const newValue = await testServiceRegistry.getControlValue();
            expect(newValue).to.be.equal(controlValue);
        });

        it("Cancel the proposal that was setup via delegator proposal", async function () {
            const deployer = signers[0];
            const balance = await token.balanceOf(deployer.address);
            expect(ethers.utils.formatEther(balance) == 10).to.be.true;

            // Approve signers[0] for 10 OLAS by voting ve
            await token.connect(deployer).approve(ve.address, tenOLABalance);

            // Define 4 years for the lock duration.
            // This will result in voting power being almost exactly as OLAS amount locked:
            // voting power = amount * t_left_before_unlock / t_max
            const fourYears = 4 * 365 * 86400;
            const lockDuration = fourYears;

            // Lock 5 OLAS, which is lower than the initial proposal threshold by a bit
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
            const GovernorBravo = await ethers.getContractFactory("GovernorOLAS");
            const governor = await GovernorBravo.deploy(ve.address, timelock.address, initialVotingDelay,
                initialVotingPeriod, initialProposalThreshold, quorum);
            await governor.deployed();

            // Grand governor an admin, proposer, executor and canceller role in the timelock
            const adminRole = ethers.utils.id("TIMELOCK_ADMIN_ROLE");
            await timelock.grantRole(adminRole, governor.address);
            const proposerRole = ethers.utils.id("PROPOSER_ROLE");
            await timelock.grantRole(proposerRole, governor.address);
            const executorRole = ethers.utils.id("EXECUTOR_ROLE");
            await timelock.grantRole(executorRole, governor.address);
            const cancellerRole = ethers.utils.id("CANCELLER_ROLE");
            await timelock.grantRole(cancellerRole, governor.address);

            // Setting the governor of a controlled contract
            testServiceRegistry.changeManager(timelock.address);

            // Schedule an operation from timelock via a proposer (deployer by default)
            const callData = testServiceRegistry.interface.encodeFunctionData("executeByGovernor", [controlValue]);
            // Solidity overridden functions must be explicitly declared
            // https://github.com/ethers-io/ethers.js/issues/407
            await governor["propose(address[],uint256[],bytes[],string)"]([testServiceRegistry.address], [0],
                [callData], proposalDescription);

            // Get the proposalId
            const descriptionHash = ethers.utils.id(proposalDescription);
            const proposalId = await governor.hashProposal([testServiceRegistry.address], [0], [callData],
                descriptionHash);

            // If initialVotingDelay is greater than 0 we have to wait that many blocks before the voting starts
            // Casting votes for the proposalId: 0 - Against, 1 - For, 2 - Abstain
            await governor.castVote(proposalId, 1);
            await governor["queue(address[],uint256[],bytes[],bytes32)"]([testServiceRegistry.address], [0],
                [callData], descriptionHash);

            // Cancel the proposal
            await governor["cancel(uint256)"](proposalId);

            // Check that the proposal was cancelled: enum value of ProposalState.Canceled == 2
            const proposalState = await governor.state(proposalId);
            expect(proposalState).to.equal(2);
        });

        it("Governance proposal from multisig veOLA stakers", async function () {
            const safeSigners = [signers[1], signers[2]];
            const safeThreshold = 2;
            let nonce = 0;
            // Create a multisig
            const setupData = gnosisSafe.interface.encodeFunctionData(
                "setup",
                // signers, threshold, to_address, data, fallback_handler, payment_token, payment, payment_receiver
                [[safeSigners[0].address, safeSigners[1].address], safeThreshold, AddressZero, "0x", AddressZero, AddressZero, 0, AddressZero]
            );
            const safeContracts = require("@gnosis.pm/safe-contracts");
            const proxyAddress = await safeContracts.calculateProxyAddress(gnosisSafeProxyFactory, gnosisSafe.address,
                setupData, nonce);
            await gnosisSafeProxyFactory.createProxyWithNonce(gnosisSafe.address, setupData, nonce).then((tx) => tx.wait());
            const multisig = await ethers.getContractAt("GnosisSafe", proxyAddress);

            // Mint 10 OLAS tokens to the multisig
            await token.mint(multisig.address, tenOLABalance);
            const balance = await token.balanceOf(multisig.address);
            expect(ethers.utils.formatEther(balance) == 10).to.be.true;

            // Approve multisig for 10 OLAS by voting ve
            nonce = await multisig.nonce();
            let txHashData = await safeContracts.buildContractCall(token, "approve",
                [ve.address, tenOLABalance], nonce, 0, 0);
            let signMessageData = [await safeContracts.safeSignMessage(safeSigners[0], multisig, txHashData, 0),
                await safeContracts.safeSignMessage(safeSigners[1], multisig, txHashData, 0)];
            await safeContracts.executeTx(multisig, txHashData, signMessageData, 0);

            // Define 4 years for the lock duration.
            // This will result in voting power being almost exactly as OLAS amount locked:
            // voting power = amount * t_left_before_unlock / t_max
            const fourYears = 4 * 365 * 86400;
            const lockDuration = fourYears;

            // Lock 5 OLAS, which is lower than the initial proposal threshold by a bit
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
            const GovernorBravo = await ethers.getContractFactory("GovernorOLAS");
            const governor = await GovernorBravo.deploy(ve.address, timelock.address, initialVotingDelay,
                initialVotingPeriod, initialProposalThreshold, quorum);
            await governor.deployed();

            // Grand governor an admin, proposer and executor role in the timelock
            const adminRole = ethers.utils.id("TIMELOCK_ADMIN_ROLE");
            await timelock.grantRole(adminRole, governor.address);
            const proposerRole = ethers.utils.id("PROPOSER_ROLE");
            await timelock.grantRole(proposerRole, governor.address);
            const executorRole = ethers.utils.id("EXECUTOR_ROLE");
            await timelock.grantRole(executorRole, governor.address);

            // Setting the governor of a controlled contract
            testServiceRegistry.changeManager(timelock.address);

            // Schedule an operation from timelock via a proposer (deployer by default)
            const callData = testServiceRegistry.interface.encodeFunctionData("executeByGovernor", [controlValue]);

            // Make a proposal by a multisig
            nonce = await multisig.nonce();
            txHashData = await safeContracts.buildContractCall(governor, "propose(address[],uint256[],bytes[],string)",
                [[testServiceRegistry.address], [0], [callData], proposalDescription], nonce, 0, 0);
            signMessageData = [await safeContracts.safeSignMessage(safeSigners[0], multisig, txHashData, 0),
                await safeContracts.safeSignMessage(safeSigners[1], multisig, txHashData, 0)];
            await safeContracts.executeTx(multisig, txHashData, signMessageData, 0);

            // Get the proposalId
            const descriptionHash = ethers.utils.id(proposalDescription);
            const proposalId = await governor.hashProposal([testServiceRegistry.address], [0], [callData],
                descriptionHash);

            // If initialVotingDelay is greater than 0 we have to wait that many blocks before the voting starts
            // Casting votes for the proposalId: 0 - Against, 1 - For, 2 - Abstain
            nonce = await multisig.nonce();
            txHashData = await safeContracts.buildContractCall(governor, "castVote",
                [proposalId, 1], nonce, 0, 0);
            signMessageData = [await safeContracts.safeSignMessage(safeSigners[0], multisig, txHashData, 0),
                await safeContracts.safeSignMessage(safeSigners[1], multisig, txHashData, 0)];
            await safeContracts.executeTx(multisig, txHashData, signMessageData, 0);

            // Queueing the passed proposal
            nonce = await multisig.nonce();
            txHashData = await safeContracts.buildContractCall(governor, "queue(address[],uint256[],bytes[],bytes32)",
                [[testServiceRegistry.address], [0], [callData], descriptionHash], nonce, 0, 0);
            signMessageData = [await safeContracts.safeSignMessage(safeSigners[0], multisig, txHashData, 0),
                await safeContracts.safeSignMessage(safeSigners[1], multisig, txHashData, 0)];
            await safeContracts.executeTx(multisig, txHashData, signMessageData, 0);

            // Waiting for the next minDelay blocks to pass
            ethers.provider.send("evm_mine");

            // Execute the proposed operation and check the execution result
            nonce = await multisig.nonce();
            txHashData = await safeContracts.buildContractCall(governor, "execute(uint256)",
                [proposalId], nonce, 0, 0);
            signMessageData = [await safeContracts.safeSignMessage(safeSigners[0], multisig, txHashData, 0),
                await safeContracts.safeSignMessage(safeSigners[1], multisig, txHashData, 0)];
            await safeContracts.executeTx(multisig, txHashData, signMessageData, 0);

            // Check that the value of the testServiceRegistry was changed
            const newValue = await testServiceRegistry.getControlValue();
            expect(newValue).to.be.equal(controlValue);
        });

        it("Defeating the proposal", async function () {
            // Mint OLAS for other signers
            for (let i = 1; i < 4; i++) {
                await token.mint(signers[i].address, tenOLABalance);
            }

            // Approve signers for 10 OLAS by voting ve
            for (let i = 0; i < 4; i++) {
                await token.connect(signers[i]).approve(ve.address, tenOLABalance);
            }

            // Define 4 years for the lock duration.
            // This will result in voting power being almost exactly as OLAS amount locked:
            // voting power = amount * t_left_before_unlock / t_max
            const fourYears = 4 * 365 * 86400;
            const lockDuration = fourYears;

            // Lock 5 OLAS for each signer, which is lower than the initial proposal threshold by a bit
            for (let i = 0; i < 4; i++) {
                await ve.connect(signers[i]).createLock(fiveOLABalance, lockDuration);
            }
            // Add one more OLAS to the signers[0]
            await ve.increaseAmount(oneOLABalance);

            // Set quorum to 30%
            const newQuorum = 30;
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
            const GovernorBravo = await ethers.getContractFactory("GovernorOLAS");
            const governor = await GovernorBravo.deploy(ve.address, timelock.address, newInitialVotingDelay,
                newInitialVotingPeriod, initialProposalThreshold, newQuorum);
            await governor.deployed();

            // Grand governor an admin, proposer and executor role in the timelock
            const adminRole = ethers.utils.id("TIMELOCK_ADMIN_ROLE");
            await timelock.grantRole(adminRole, governor.address);
            const proposerRole = ethers.utils.id("PROPOSER_ROLE");
            await timelock.grantRole(proposerRole, governor.address);
            const executorRole = ethers.utils.id("EXECUTOR_ROLE");
            await timelock.grantRole(executorRole, governor.address);

            // Setting the governor of a controlled contract
            testServiceRegistry.changeManager(timelock.address);

            // Schedule an operation from timelock via a proposer (signers[0] by default)
            const callData = testServiceRegistry.interface.encodeFunctionData("executeByGovernor", [controlValue]);
            await governor["propose(address[],uint256[],bytes[],string)"]([testServiceRegistry.address], [0],
                [callData], proposalDescription);

            // Get the proposalId
            const descriptionHash = ethers.utils.id(proposalDescription);
            const proposalId = await governor.hashProposal([testServiceRegistry.address], [0], [callData],
                descriptionHash);

            // Trying to vote right away does not respect the initial voting delay
            await expect(
                governor.castVote(proposalId, 1)
            ).to.be.revertedWith("Governor: vote not currently active");

            // Wait for 10 initial blocks
            for (let i = 0; i < newInitialVotingDelay - 1; i++) {
                ethers.provider.send("evm_mine");
            }

            // Get the snapshot block number of when the voting starts
            const snapshot = await governor.proposalSnapshot(proposalId);
            const totalSupplySnapshot = await ve.getPastTotalSupply(snapshot);
            // Lock more OLAS after the voting has started
            await ve.connect(signers[1]).increaseAmount(oneOLABalance);
            const expectedTotalSupplySnapshot = await ve.getPastTotalSupply(snapshot);
            // The total voting power after the voting start does not change even with new locking of OLAS
            expect(Number(totalSupplySnapshot)).to.equal(Number(expectedTotalSupplySnapshot));

            // If initialVotingDelay is greater than 0 we have to wait that many blocks before the voting starts
            // Casting votes for the proposalId: 0 - Against, 1 - For, 2 - Abstain
            // signers[0] votes for
            await governor.castVote(proposalId, 1);
            // Trying to vote again
            await expect(
                governor.castVote(proposalId, 0)
            ).to.be.revertedWith("GovernorCompatibilityBravo: vote already cast");

            // signers[1] and signers[2] vote against
            await governor.connect(signers[1]).castVote(proposalId, 0);
            await governor.connect(signers[2]).castVote(proposalId, 0);
            // The total amount of voting power is 6 + 5 + 5 + 5 = 21. 6 voted for, 10 against
            // The proposal is not successful, by votes and by quorum: 30% is 6.3 OLAS vs 6 OLAS voted for
            // Wait for past the voting period number of blocks
            for (let i = 0; i < newInitialVotingPeriod; i++) {
                ethers.provider.send("evm_mine");
            }

            await expect(
                governor["queue(address[],uint256[],bytes[],bytes32)"]([testServiceRegistry.address], [0],
                    [callData], descriptionHash)
            ).to.be.revertedWith("Governor: proposal not successful");

            // State 3 means the proposal is defeated
            const proposalState = await governor.state(proposalId);
            expect(proposalState).to.equal(3);
        });

        it("Winning the proposal with multiple voters", async function () {
            // Mint OLAS for other signers
            for (let i = 1; i < 4; i++) {
                await token.mint(signers[i].address, tenOLABalance);
            }

            // Approve signers for 10 OLAS by voting ve
            for (let i = 0; i < 4; i++) {
                await token.connect(signers[i]).approve(ve.address, tenOLABalance);
            }

            // Define 4 years for the lock duration.
            // This will result in voting power being almost exactly as OLAS amount locked:
            // voting power = amount * t_left_before_unlock / t_max
            const fourYears = 4 * 365 * 86400;
            const lockDuration = fourYears;

            // Lock 5 OLAS, which is lower than the initial proposal threshold by a bit
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
            const GovernorBravo = await ethers.getContractFactory("GovernorOLAS");
            const governor = await GovernorBravo.deploy(ve.address, timelock.address, newInitialVotingDelay,
                newInitialVotingPeriod, initialProposalThreshold, newQuorum);
            await governor.deployed();

            // Grand governor an admin, proposer and executor role in the timelock
            const adminRole = ethers.utils.id("TIMELOCK_ADMIN_ROLE");
            await timelock.grantRole(adminRole, governor.address);
            const proposerRole = ethers.utils.id("PROPOSER_ROLE");
            await timelock.grantRole(proposerRole, governor.address);
            const executorRole = ethers.utils.id("EXECUTOR_ROLE");
            await timelock.grantRole(executorRole, governor.address);

            // Setting the governor of a controlled contract
            testServiceRegistry.changeManager(timelock.address);

            // Schedule an operation from timelock via a proposer (signers[0] by default)
            const callData = testServiceRegistry.interface.encodeFunctionData("executeByGovernor", [controlValue]);
            await governor["propose(address[],uint256[],bytes[],string)"]([testServiceRegistry.address], [0],
                [callData], proposalDescription);

            // Get the proposalId
            const descriptionHash = ethers.utils.id(proposalDescription);
            const proposalId = await governor.hashProposal([testServiceRegistry.address], [0], [callData],
                descriptionHash);

            // Trying to vote right away does not respect the initial voting delay
            await expect(
                governor.castVote(proposalId, 1)
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
            await governor.castVote(proposalId, 1);
            // Trying to vote again
            await expect(
                governor.castVote(proposalId, 0)
            ).to.be.revertedWith("GovernorCompatibilityBravo: vote already cast");
            // signers[1] and signers[2] vote against, signers[3] votes for
            await governor.connect(signers[1]).castVote(proposalId, 0);
            await governor.connect(signers[2]).castVote(proposalId, 0);
            await governor.connect(signers[3]).castVote(proposalId, 1);
            // The total amount of voting power is 6 + 5 + 5 + 5 = 21.
            // Overall voting fraction now is 11 vs 10. The proposal succeeds

            // Wait for voting period blocks, out of 10 only 2 blocks are left
            for (let i = 0; i < 2; i++) {
                ethers.provider.send("evm_mine");
            }

            await governor["queue(address[],uint256[],bytes[],bytes32)"]([testServiceRegistry.address], [0],
                [callData], descriptionHash);

            // Trying to execute the proposal right away without the min delay wait
            await expect(
                governor["execute(uint256)"](proposalId)
            ).to.be.revertedWith("TimelockController: operation is not ready");

            // Waiting for the next minDelay blocks to pass
            for (let i = 0; i < newMinDelay; i++) {
                ethers.provider.send("evm_mine");
            }

            // Execute the proposed operation and check the execution result
            await governor["execute(uint256)"](proposalId);
            const newValue = await testServiceRegistry.getControlValue();
            expect(newValue).to.be.equal(controlValue);
        });

        it("Proposal from a multisig to add different multisig implementation in service registry contracts", async function () {
            const safeSigners = [signers[1], signers[2]];
            const safeThreshold = 2;
            let nonce = 0;
            // Create a multisig
            const setupData = gnosisSafe.interface.encodeFunctionData(
                "setup",
                // signers, threshold, to_address, data, fallback_handler, payment_token, payment, payment_receiver
                [[safeSigners[0].address, safeSigners[1].address], safeThreshold, AddressZero, "0x", AddressZero, AddressZero, 0, AddressZero]
            );
            const safeContracts = require("@gnosis.pm/safe-contracts");
            const proxyAddress = await safeContracts.calculateProxyAddress(gnosisSafeProxyFactory, gnosisSafe.address,
                setupData, nonce);
            await gnosisSafeProxyFactory.createProxyWithNonce(gnosisSafe.address, setupData, nonce).then((tx) => tx.wait());
            const multisig = await ethers.getContractAt("GnosisSafe", proxyAddress);

            // Mint 10 OLAS tokens to the multisig
            await token.mint(multisig.address, tenOLABalance);
            const balance = await token.balanceOf(multisig.address);
            expect(ethers.utils.formatEther(balance) == 10).to.be.true;

            // Approve ve over the 10 OLAS in the multisig
            nonce = await multisig.nonce();
            let txHashData = await safeContracts.buildContractCall(token, "approve",
                [ve.address, tenOLABalance], nonce, 0, 0);
            let signMessageData = [await safeContracts.safeSignMessage(safeSigners[0], multisig, txHashData, 0),
                await safeContracts.safeSignMessage(safeSigners[1], multisig, txHashData, 0)];
            await safeContracts.executeTx(multisig, txHashData, signMessageData, 0);

            // Define 4 years for the lock duration.
            // This will result in voting power being almost exactly as OLAS amount locked:
            // voting power = amount * t_left_before_unlock / t_max
            const fourYears = 4 * 365 * 86400;
            const lockDuration = fourYears;

            // Lock 5 OLAS, which is slightly below than the initial proposal threshold by a bit
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
            const GovernorBravo = await ethers.getContractFactory("GovernorOLAS");
            const governor = await GovernorBravo.deploy(ve.address, timelock.address, initialVotingDelay,
                initialVotingPeriod, initialProposalThreshold, quorum);
            await governor.deployed();

            // Grand governor an admin, proposer and executor role in the timelock
            const adminRole = ethers.utils.id("TIMELOCK_ADMIN_ROLE");
            await timelock.grantRole(adminRole, governor.address);
            const proposerRole = ethers.utils.id("PROPOSER_ROLE");
            await timelock.grantRole(proposerRole, governor.address);
            const executorRole = ethers.utils.id("EXECUTOR_ROLE");
            await timelock.grantRole(executorRole, governor.address);

            // Declare multisig implementations
            const multisigImplementations = [signers[10].address, signers[11].address, signers[12].address];
            // Whitelist one multisig implementation
            serviceRegistry.changeMultisigPermission(multisigImplementations[0], true);
            // Setting the timelock to be the owner of a service registry contract
            serviceRegistry.changeOwner(timelock.address);

            // Propose to de-whitelist first multisig implementation and whitelist two new ones
            let callDatas = [serviceRegistry.interface.encodeFunctionData("changeMultisigPermission",
                [multisigImplementations[0], false]),
            serviceRegistry.interface.encodeFunctionData("changeMultisigPermission",
                [multisigImplementations[1], true]),
            serviceRegistry.interface.encodeFunctionData("changeMultisigPermission",
                [multisigImplementations[2], true])];
            // Solidity overridden functions must be explicitly declared
            // https://github.com/ethers-io/ethers.js/issues/407
            const propAddresses = [serviceRegistry.address, serviceRegistry.address, serviceRegistry.address];
            const propValues = [0, 0, 0];
            // Make a proposal by a multisig
            nonce = await multisig.nonce();
            txHashData = await safeContracts.buildContractCall(governor, "propose(address[],uint256[],bytes[],string)",
                [propAddresses, propValues, callDatas, proposalDescription], nonce, 0, 0);
            signMessageData = [await safeContracts.safeSignMessage(safeSigners[0], multisig, txHashData, 0),
                await safeContracts.safeSignMessage(safeSigners[1], multisig, txHashData, 0)];
            await safeContracts.executeTx(multisig, txHashData, signMessageData, 0);

            // Get the proposalId
            const descriptionHash = ethers.utils.id(proposalDescription);
            const proposalId = await governor.hashProposal(propAddresses, propValues, callDatas, descriptionHash);

            // If initialVotingDelay is greater than 0 we have to wait that many blocks before the voting starts
            // Casting votes for the proposalId: 0 - Against, 1 - For, 2 - Abstain
            nonce = await multisig.nonce();
            txHashData = await safeContracts.buildContractCall(governor, "castVote",
                [proposalId, 1], nonce, 0, 0);
            signMessageData = [await safeContracts.safeSignMessage(safeSigners[0], multisig, txHashData, 0),
                await safeContracts.safeSignMessage(safeSigners[1], multisig, txHashData, 0)];
            await safeContracts.executeTx(multisig, txHashData, signMessageData, 0);

            // Queueing the passed proposal
            nonce = await multisig.nonce();
            txHashData = await safeContracts.buildContractCall(governor, "queue(address[],uint256[],bytes[],bytes32)",
                [propAddresses, propValues, callDatas, descriptionHash], nonce, 0, 0);
            signMessageData = [await safeContracts.safeSignMessage(safeSigners[0], multisig, txHashData, 0),
                await safeContracts.safeSignMessage(safeSigners[1], multisig, txHashData, 0)];
            await safeContracts.executeTx(multisig, txHashData, signMessageData, 0);

            // Waiting for the next minDelay blocks to pass
            ethers.provider.send("evm_increaseTime", [minDelay * 86460]);
            ethers.provider.send("evm_mine");

            // Execute the proposed operation and check the execution result
            nonce = await multisig.nonce();
            txHashData = await safeContracts.buildContractCall(governor, "execute(uint256)",
                [proposalId], nonce, 0, 0);
            signMessageData = [await safeContracts.safeSignMessage(safeSigners[0], multisig, txHashData, 0),
                await safeContracts.safeSignMessage(safeSigners[1], multisig, txHashData, 0)];
            await safeContracts.executeTx(multisig, txHashData, signMessageData, 0);

            // Verify the multisig implementation whitelisted addresses
            let result = await serviceRegistry.mapMultisigs(multisigImplementations[0]);
            expect(result).to.be.equal(false);
            result = await serviceRegistry.mapMultisigs(multisigImplementations[1]);
            expect(result).to.be.equal(true);
            result = await serviceRegistry.mapMultisigs(multisigImplementations[2]);
            expect(result).to.be.equal(true);
        });

        it("Proposal from a multisig to add different multisig implementation in service registry contracts via schedule", async function () {
            const safeSigners = [signers[1], signers[2]];
            const safeThreshold = 2;
            let nonce = 0;
            // Create a multisig
            const setupData = gnosisSafe.interface.encodeFunctionData(
                "setup",
                // signers, threshold, to_address, data, fallback_handler, payment_token, payment, payment_receiver
                [[safeSigners[0].address, safeSigners[1].address], safeThreshold, AddressZero, "0x", AddressZero, AddressZero, 0, AddressZero]
            );
            const safeContracts = require("@gnosis.pm/safe-contracts");
            const proxyAddress = await safeContracts.calculateProxyAddress(gnosisSafeProxyFactory, gnosisSafe.address,
                setupData, nonce);
            await gnosisSafeProxyFactory.createProxyWithNonce(gnosisSafe.address, setupData, nonce).then((tx) => tx.wait());
            const multisig = await ethers.getContractAt("GnosisSafe", proxyAddress);

            // Deploy Timelock with multisig executor / proposer roles
            const executors = [multisig.address];
            const proposers = [multisig.address];
            const Timelock = await ethers.getContractFactory("Timelock");
            const timelock = await Timelock.deploy(minDelay, proposers, executors);
            await timelock.deployed();

            // Deploy Governance Bravo
            const GovernorBravo = await ethers.getContractFactory("GovernorOLAS");
            const governor = await GovernorBravo.deploy(ve.address, timelock.address, initialVotingDelay,
                initialVotingPeriod, initialProposalThreshold, quorum);
            await governor.deployed();

            // Declare multisig implementations
            const multisigImplementations = [signers[10].address, signers[11].address, signers[12].address];
            // Whitelist one multisig implementation
            serviceRegistry.changeMultisigPermission(multisigImplementations[0], true);
            // Setting the timelock to be the owner of a service registry contract
            serviceRegistry.changeOwner(timelock.address);

            // Propose to de-whitelist first multisig implementation and whitelist two new ones
            let callDatas = [serviceRegistry.interface.encodeFunctionData("changeMultisigPermission",
                [multisigImplementations[0], false]),
            serviceRegistry.interface.encodeFunctionData("changeMultisigPermission",
                [multisigImplementations[1], true]),
            serviceRegistry.interface.encodeFunctionData("changeMultisigPermission",
                [multisigImplementations[2], true])];
            // Solidity overridden functions must be explicitly declared
            // https://github.com/ethers-io/ethers.js/issues/407
            const propAddresses = [serviceRegistry.address, serviceRegistry.address, serviceRegistry.address];
            const propValues = [0, 0, 0];
            // Schedule an operation via a multisig that is a proposer
            nonce = await multisig.nonce();
            let txHashData = await safeContracts.buildContractCall(timelock, "scheduleBatch",
                [propAddresses, propValues, callDatas, bytes32Zero, bytes32Zero, minDelay], nonce, 0, 0);
            let signMessageData = [await safeContracts.safeSignMessage(safeSigners[0], multisig, txHashData, 0),
                await safeContracts.safeSignMessage(safeSigners[1], multisig, txHashData, 0)];
            await safeContracts.executeTx(multisig, txHashData, signMessageData, 0);

            // Waiting for the minDelay number of blocks to pass
            for (let i = 0; i < minDelay; i++) {
                ethers.provider.send("evm_mine");
            }

            // Execute the proposed operation and check the execution result
            nonce = await multisig.nonce();
            txHashData = await safeContracts.buildContractCall(timelock, "executeBatch",
                [propAddresses, propValues, callDatas, bytes32Zero, bytes32Zero], nonce, 0, 0);
            signMessageData = [await safeContracts.safeSignMessage(safeSigners[0], multisig, txHashData, 0),
                await safeContracts.safeSignMessage(safeSigners[1], multisig, txHashData, 0)];
            await safeContracts.executeTx(multisig, txHashData, signMessageData, 0);

            // Verify the multisig implementation whitelisted addresses
            let result = await serviceRegistry.mapMultisigs(multisigImplementations[0]);
            expect(result).to.be.equal(false);
            result = await serviceRegistry.mapMultisigs(multisigImplementations[1]);
            expect(result).to.be.equal(true);
            result = await serviceRegistry.mapMultisigs(multisigImplementations[2]);
            expect(result).to.be.equal(true);
        });
    });
});
