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
    });
});
