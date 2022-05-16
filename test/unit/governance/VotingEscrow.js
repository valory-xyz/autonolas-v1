/*global describe, context, beforeEach, it*/

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe.only("VotingEscrow", function () {
    let ola;
    let ve;
    let signers;
    const initialMint = "1000000000000000000000000"; // 1000000
    const oneWeek = 7 * 86400;
    const oneOLABalance = ethers.utils.parseEther("1");
    const twoOLABalance = ethers.utils.parseEther("2");
    const tenOLABalance = ethers.utils.parseEther("10");
    const AddressZero = "0x" + "0".repeat(40);

    beforeEach(async function () {
        const OLA = await ethers.getContractFactory("OLA");
        ola = await OLA.deploy(0, AddressZero);
        await ola.deployed();

        signers = await ethers.getSigners();
        await ola.mint(signers[0].address, initialMint);

        const VE = await ethers.getContractFactory("VotingEscrow");
        ve = await VE.deploy(ola.address, "name", "symbol");
        await ve.deployed();
    });

    context("Locks", async function () {
        it("Should fail when creating a lock with zero value or wrong duration", async function () {
            await ola.approve(ve.address, oneOLABalance);

            await expect(
                ve.createLock(0, 0)
            ).to.be.revertedWith("ZeroValue");

            await expect(
                ve.createLock(oneOLABalance, 0)
            ).to.be.revertedWith("UnlockTimeIncorrect");
        });

        it("Create lock", async function () {
            // Transfer 10 OLA to signers[1]
            const owner = signers[1];
            await ola.transfer(owner.address, tenOLABalance);

            // Approve signers[0] and signers[1] for 1 OLA by voting escrow
            await ola.approve(ve.address, oneOLABalance);
            await ola.connect(owner).approve(ve.address, oneOLABalance);

            // Define 1 week for the lock duration
            const blockNumber = await ethers.provider.getBlockNumber();
            const block = await ethers.provider.getBlock(blockNumber);
            const lockDuration = block.timestamp + oneWeek; // 1 week from now

            // Balance should be zero before the lock
            expect(await ve.getVotes(owner.address)).to.equal(0);
            await ve.createLock(oneOLABalance, lockDuration);
            await ve.connect(owner).createLock(oneOLABalance, lockDuration);

            // Lock end is rounded by 1 week, as implemented by design
            const lockEnd = await ve.lockedEnd(owner.address);
            expect(Math.floor(lockDuration / oneWeek) * oneWeek).to.equal(lockEnd);

            // Get the account of the last user point
            const pv = await ve.getLastUserPoint(owner.address);
            expect(pv.balance).to.equal(oneOLABalance);

            // Get the number of user points for owner and compare the balance of the last point
            const numAccountPoints = await ve.getNumUserPoints(owner.address);
            expect(numAccountPoints).to.equal(1);
            const pvLast = await ve.getUserPoint(owner.address, numAccountPoints - 1);
            expect(pvLast.balance).to.equal(pv.balance);

            // Balance is time-based, it changes slightly every fraction of a time
            // Use the second address for locked funds to compare
            const balanceDeployer = await ve.getVotes(signers[0].address);
            const balanceOwner = await ve.getVotes(owner.address);
            expect(balanceDeployer > 0).to.be.true;
            expect(balanceDeployer).to.equal(balanceOwner);
        });

        it("Deposit for", async function () {
            const deployer = signers[0];
            // Transfer 10 OLA to signers[1]
            const owner = signers[1];
            await ola.transfer(owner.address, tenOLABalance);

            // Approve deployer owner for 1 OLA by voting escrow
            await ola.approve(ve.address, oneOLABalance);
            await ola.connect(owner).approve(ve.address, oneOLABalance);

            // Define 1 week for the lock duration
            const blockNumber = await ethers.provider.getBlockNumber();
            const block = await ethers.provider.getBlock(blockNumber);
            const lockDuration = block.timestamp + oneWeek; // 1 week from now

            // Try to deposit 1 OLA for deployer without initially locked balance
            await expect(
                ve.depositFor(deployer.address, oneOLABalance)
            ).to.be.revertedWith("NoValueLocked");

            // Create lock for the deployer
            await ve.createLock(oneOLABalance, lockDuration);

            // Try to deposit zero value for deployer
            await expect(
                ve.depositFor(deployer.address, 0)
            ).to.be.revertedWith("ZeroValue");

            // Deposit for the deployer from the
            await ve.connect(owner).depositFor(deployer.address, oneOLABalance);

            // Check the balance of deployer (must be twice of his initial one)
            const balanceDeployer = await ve.balanceOf(deployer.address);
            expect(balanceDeployer).to.equal(twoOLABalance);

            // Try to deposit 1 OLA for deployer after its lock time hase expired
            ethers.provider.send("evm_increaseTime", [oneWeek + 1000]);
            ethers.provider.send("evm_mine");
            await expect(
                ve.depositFor(deployer.address, oneOLABalance)
            ).to.be.revertedWith("LockExpired");
        });

        it("Should fail when creating a lock for more than 4 years", async function () {
            const fourYears = 4 * 365 * oneWeek / 7;
            await ola.approve(ve.address, oneOLABalance);

            const blockNumber = await ethers.provider.getBlockNumber();
            const block = await ethers.provider.getBlock(blockNumber);
            const lockDuration = block.timestamp + fourYears + oneWeek; // 4 years and 1 week

            await expect(
                ve.createLock(oneOLABalance, lockDuration)
            ).to.be.revertedWith("MaxUnlockTimeReached");
        });

        it("Should fail when creating a lock with already locked value", async function () {
            await ola.approve(ve.address, oneOLABalance);

            const blockNumber = await ethers.provider.getBlockNumber();
            const block = await ethers.provider.getBlock(blockNumber);
            const lockDuration = block.timestamp + oneWeek;

            ve.createLock(oneOLABalance, lockDuration);
            await expect(
                ve.createLock(oneOLABalance, lockDuration)
            ).to.be.revertedWith("LockedValueNotZero");
        });

        it("Increase amount of lock", async function () {
            await ola.approve(ve.address, tenOLABalance);

            const blockNumber = await ethers.provider.getBlockNumber();
            const block = await ethers.provider.getBlock(blockNumber);
            const lockDuration = block.timestamp + oneWeek;

            // Should fail if requires are not satisfied
            // No previous lock
            await expect(
                ve.increaseAmount(oneOLABalance)
            ).to.be.revertedWith("NoValueLocked");

            // Now lock 1 OLA
            ve.createLock(oneOLABalance, lockDuration);
            // Increase by more than a zero
            await expect(
                ve.increaseAmount(0)
            ).to.be.revertedWith("ZeroValue");

            // Add 1 OLA more
            await ve.increaseAmount(oneOLABalance);

            // Time forward to the lock expiration
            ethers.provider.send("evm_increaseTime", [oneWeek]);
            ethers.provider.send("evm_mine");

            // Not possible to add to the expired lock
            await expect(
                ve.increaseAmount(oneOLABalance)
            ).to.be.revertedWith("LockExpired");
        });

        it("Increase amount of unlock time", async function () {
            await ola.approve(ve.address, tenOLABalance);

            const blockNumber = await ethers.provider.getBlockNumber();
            const block = await ethers.provider.getBlock(blockNumber);
            const lockDuration = block.timestamp + oneWeek;

            // Should fail if requires are not satisfied
            // Nothing is locked
            await expect(
                ve.increaseUnlockTime(oneWeek)
            ).to.be.revertedWith("NoValueLocked");

            // Lock 1 OLA
            await ve.createLock(oneOLABalance, lockDuration);
            // Try to decrease the unlock time
            await expect(
                ve.increaseUnlockTime(lockDuration - 1)
            ).to.be.revertedWith("UnlockTimeIncorrect");

            await ve.increaseUnlockTime(lockDuration + oneWeek);

            // Try to increase unlock for the period of bigger than the max lock time
            await expect(
                ve.increaseUnlockTime(lockDuration + oneWeek * 300)
            ).to.be.revertedWith("MaxUnlockTimeReached");

            // Time forward to the lock expiration
            ethers.provider.send("evm_increaseTime", [oneWeek + oneWeek]);
            ethers.provider.send("evm_mine");

            // Not possible to add to the expired lock
            await expect(
                ve.increaseUnlockTime(1)
            ).to.be.revertedWith("LockExpired");
        });
    });

    context("Withdraw", async function () {
        it("Withdraw", async function () {
            // Transfer 2 OLA to signers[1] and approve the voting escrow for 1 OLA
            const owner = signers[1];
            await ola.transfer(owner.address, tenOLABalance);
            await ola.connect(owner).approve(ve.address, oneOLABalance);

            // Lock 1 OLA
            const blockNumber = await ethers.provider.getBlockNumber();
            const block = await ethers.provider.getBlock(blockNumber);
            const lockDuration = block.timestamp + oneWeek;
            await ve.connect(owner).createLock(oneOLABalance, lockDuration);

            // Try withdraw early
            await expect(ve.connect(owner).withdraw()).to.be.revertedWith("LockNotExpired");
            // Now try withdraw after the time has expired
            ethers.provider.send("evm_increaseTime", [oneWeek]);
            ethers.provider.send("evm_mine"); // mine the next block
            await ve.connect(owner).withdraw();
            expect(await ola.balanceOf(owner.address)).to.equal(tenOLABalance);
        });
    });

    context("Balance and supply", async function () {
        it("Supply at", async function () {
            // Transfer 10 OLA worth of OLA to signers[1]
            const owner = signers[1];
            await ola.transfer(owner.address, tenOLABalance);

            // Approve signers[0] and signers[1] for 1 OLA by voting escrow
            await ola.approve(ve.address, oneOLABalance);
            await ola.connect(owner).approve(ve.address, tenOLABalance);

            // Initial total supply must be 0
            expect(await ve.totalSupply()).to.equal(0);

            // Define 1 week for the lock duration
            const blockNumber = await ethers.provider.getBlockNumber();
            const block = await ethers.provider.getBlock(blockNumber);
            const lockDuration = block.timestamp + oneWeek; // 1 week from now

            // Create locks for both addresses signers[0] and signers[1]
            await ve.createLock(oneOLABalance, lockDuration);
            await ve.connect(owner).createLock(twoOLABalance, lockDuration);

            // Balance is time-based, it changes slightly every fraction of a time
            // Use both balances to check for the supply
            const balanceDeployer = await ve.getVotes(signers[0].address);
            const balanceOwner = await ve.getVotes(owner.address);
            const supply = await ve.totalSupplyLocked();
            const sumBalance = BigInt(balanceOwner) + BigInt(balanceDeployer);
            expect(supply).to.equal(sumBalance.toString());
        });

        it("Checkpoint", async function () {
            const user = signers[1].address;
            // We don't have any points at the beginning
            let numPoints = await ve.numPoints();
            expect(numPoints).to.equal(0);

            // Checkpoint writes point and increases their global counter
            await ve.checkpoint();
            numPoints = await ve.numPoints();
            expect(numPoints).to.equal(1);

            // Try to get past total voting supply of a block number in the future
            const blockNumber = await ethers.provider.getBlockNumber();
            await expect(
                ve.getPastTotalSupply(blockNumber + 10)
            ).to.be.revertedWith("WrongBlockNumber");

            // Try to get past total supply of a block number in the future
            await expect(
                ve.getPastVotes(user, blockNumber + 20)
            ).to.be.revertedWith("WrongBlockNumber");
        });

        it.only("Getting past votes and supply", async function () {
            // Transfer 10 OLA worth of OLA to signers[1]
            const deployer = signers[0];
            const owner = signers[1];
            await ola.transfer(owner.address, tenOLABalance);

            // Approve signers[0] and signers[1] for 1 OLA by voting escrow
            await ola.approve(ve.address, tenOLABalance);
            await ola.connect(owner).approve(ve.address, tenOLABalance);

            // Define 1 week for the lock duration
            let blockNumber = await ethers.provider.getBlockNumber();
            let block = await ethers.provider.getBlock(blockNumber);
            let lockDuration = block.timestamp + oneWeek;

            // Create and increase locks for both addresses signers[0] and signers[1]
            await ve.createLock(twoOLABalance, lockDuration);
            await ve.increaseAmount(oneOLABalance);
            blockNumber = await ethers.provider.getBlockNumber();
            await ve.connect(owner).createLock(twoOLABalance, lockDuration);
            await ve.connect(owner).increaseAmount(oneOLABalance);
            await ve.connect(owner).increaseAmount(oneOLABalance);

            // Get past votes of the owner
            const votesOwner = await ve.getPastVotes(owner.address, blockNumber);
            expect(Number(votesOwner)).to.greaterThan(0);

            // Get past voting supply from the same block number
            const supply = await ve.getPastTotalSupply(blockNumber);
            // They must be equal with the deployer voting power at that time
            const votesDeployer = await ve.getPastVotes(deployer.address, blockNumber);
            expect(Number(supply)).to.equal(Number(votesDeployer));

            // Try to get voting supply power at time in the future
            blockNumber = await ethers.provider.getBlockNumber();
            block = await ethers.provider.getBlock(blockNumber);
            const supplyAt = await ve.totalSupplyLockedAtT(block.timestamp + oneWeek + 1000);
            expect(Number(supplyAt)).to.equal(0);
            console.log(supplyAt);

            await ve.increaseUnlockTime(lockDuration + oneWeek);

            // Move forward in time and withdraw from the owner
            ethers.provider.send("evm_increaseTime", [oneWeek + 1000]);
            ethers.provider.send("evm_mine");
            await ve.connect(owner).withdraw();

            // Move forward in time for more than two weeks
            ethers.provider.send("evm_increaseTime", [2 * oneWeek - 2000]);
            ethers.provider.send("evm_mine");
//
//            // Define 4 week for the lock duration and lock for the owner
//            blockNumber = await ethers.provider.getBlockNumber();
//            block = await ethers.provider.getBlock(blockNumber);
//            lockDuration = block.timestamp + 4 * oneWeek;
//            await ve.connect(owner).createLock(twoOLABalance, lockDuration);
//
//            // Move forward in time for more than four weeks and withdraw from both
//            ethers.provider.send("evm_increaseTime", [4 * oneWeek +  5000]);
//            ethers.provider.send("evm_mine");
//            await ve.withdraw();
//            await ve.connect(owner).withdraw();
        });
    });

    context("ERC20VotesNonTransferable", async function () {
        it("Check all the related functions", async function () {
            const deployer = signers[0].address;
            const user = signers[1].address;
            // Approve signers[0] for 1 OLA by voting escrow
            await ola.approve(ve.address, oneOLABalance);

            // Initial total supply must be 0
            expect(await ve.totalSupply()).to.equal(0);

            // Define 1 week for the lock duration
            const blockNumber = await ethers.provider.getBlockNumber();
            const block = await ethers.provider.getBlock(blockNumber);
            const lockDuration = block.timestamp + oneWeek; // 1 week from now

            // Create locks for both addresses signers[0] and signers[1]
            await ve.createLock(oneOLABalance, lockDuration);

            // Try to call transfer-related functions for veOLA
            await expect(
                ve.approve(user, oneOLABalance)
            ).to.be.revertedWith("NonTransferable");
            await expect(
                ve.allowance(deployer, user)
            ).to.be.revertedWith("NonTransferable");
            await expect(
                ve.transfer(user, oneOLABalance)
            ).to.be.revertedWith("NonTransferable");
            await expect(
                ve.transferFrom(deployer, user, oneOLABalance)
            ).to.be.revertedWith("NonTransferable");

            // Try to call delegate-related functions for veOLA
            await expect(
                ve.delegates(user)
            ).to.be.revertedWith("NonDelegatable");
            await expect(
                ve.delegate(deployer)
            ).to.be.revertedWith("NonDelegatable");
            const rv = "0x" + "0".repeat(64);
            await expect(
                ve.delegateBySig(deployer, 0, 0, 0, rv, rv)
            ).to.be.revertedWith("NonDelegatable");
        });
    });
});
