// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/**
Votes have a weight depending on time, so that users are committed to the future of (whatever they are voting for).
Vote weight decays linearly over time. Lock time cannot be more than `MAXTIME` (4 years).
Voting escrow has time-weighted votes derived from the amount of tokens locked. The maximum voting power can be
achieved with the longest lock possible. This way the users are incentivized to lock tokens for more time.
# w ^ = amount * time_locked / MAXTIME
# 1 +        /
#   |      /
#   |    /
#   |  /
#   |/
# 0 +--------+------> time
#       maxtime (4 years?)
*/

/// @title Voting Escrow - the workflow is ported from Curve Finance Vyper implementation
/// @author Aleksandr Kuperman - <aleksandr.kuperman@valory.xyz>
/// Code ported from: https://github.com/curvefi/curve-dao-contracts/blob/master/contracts/VotingEscrow.vy
/// and: https://github.com/solidlyexchange/solidly/blob/master/contracts/ve.sol

/* We cannot really do block numbers per se b/c slope is per time, not per block
* and per block could be fairly bad b/c Ethereum changes blocktimes.
* What we can do is to extrapolate ***At functions */

struct LockedBalance {
    int128 amount;
    uint256 end;
}

// Structure for voting escrow points
struct PointVoting {
    // w(i) = at + b (bias)
    int128 bias;
    // dw / dt = a (slope)
    int128 slope;
    // Timestamp
    uint256 ts;
    // Block number
    uint256 blockNumber;
    // Supply or account balance
    uint256 balance;
}

contract VotingEscrowFuzzing {

    enum DepositType {
        DEPOSIT_FOR_TYPE,
        CREATE_LOCK_TYPE,
        INCREASE_LOCK_AMOUNT,
        INCREASE_UNLOCK_TIME
    }

    event Deposit(address provider, uint256 amount, uint256 locktime, DepositType depositType, uint256 ts);
    event Withdraw(address indexed provider, uint256 amount, uint256 ts);
    event Supply(uint256 prevSupply, uint256 supply);

    // 1 week time
    uint256 internal constant WEEK = 1 weeks;
    // Maximum lock time (4 years)
    uint256 internal constant MAXTIME = 4 * 365 * 86400;

    // Token address
    address public token;
    // Total token supply
    uint256 public supply;
    // Mapping of account address => LockedBalance
    mapping(address => LockedBalance) public mapLockedBalances;

    // Total number of economical checkpoints (starting from zero)
    uint256 public totalNumPoints;
    // Mapping of point Id => point
    mapping(uint256 => PointVoting) public mapSupplyPoints;
    // Mapping of account address => PointVoting[point Id]
    mapping(address => PointVoting[]) public mapUserPoints;
    // Mapping of time => signed slope change
    mapping(uint256 => int128) public mapSlopeChanges;

    // Number of decimals
    uint8 public decimals;
    // Voting token name
    string public name;
    // Voting token symbol
    string public symbol;

    /// Echidna invariant
    bool public cond = true;

    /// @dev Contract constructor
    constructor()
    {
        mapSupplyPoints[0] = PointVoting(0, 0, block.timestamp, block.number, 0);
    }

    /// @dev Record global and per-user data to checkpoint.
    /// @param account Account address. User checkpoint is skipped if the address is zero.
    /// @param oldLocked Previous locked amount / end lock time for the user.
    /// @param newLocked New locked amount / end lock time for the user.
    function _checkpoint(
        address account,
        LockedBalance memory oldLocked,
        LockedBalance memory newLocked
    ) internal {
        PointVoting memory uOld;
        PointVoting memory uNew;
        int128 oldDSlope;
        int128 newDSlope;
        uint256 curNumPoint = totalNumPoints;

        if (account != address(0)) {
            // Calculate slopes and biases
            // Kept at zero when they have to
            int128 maxTime = int128(int256(MAXTIME));
            if (oldLocked.end > block.timestamp && oldLocked.amount > 0) {
                uOld.slope = oldLocked.amount / maxTime;
                uOld.bias = uOld.slope * int128(int256(oldLocked.end - block.timestamp));
            }
            if (newLocked.end > block.timestamp && newLocked.amount > 0) {
                uNew.slope = newLocked.amount / maxTime;
                uNew.bias = uNew.slope * int128(int256(newLocked.end - block.timestamp));
            }

            // Read values of scheduled changes in the slope
            // oldLocked.end can be in the past and in the future
            // newLocked.end can ONLY be in the FUTURE unless everything expired: than zeros
            oldDSlope = mapSlopeChanges[oldLocked.end];
            if (newLocked.end != 0) {
                if (newLocked.end == oldLocked.end) {
                    newDSlope = oldDSlope;
                } else {
                    newDSlope = mapSlopeChanges[newLocked.end];
                }
            }
        }

        PointVoting memory lastPoint;
        if (curNumPoint > 0) {
            lastPoint = mapSupplyPoints[curNumPoint];
        } else {
            lastPoint = PointVoting(0, 0, block.timestamp, block.number, supply);
        }
        uint256 lastCheckpoint = lastPoint.ts;
        // initialPoint is used for extrapolation to calculate the block number and save them
        // as we cannot figure that out in exact values from inside of the contract
        PointVoting memory initialPoint = lastPoint;
        uint256 block_slope; // dblock/dt
        if (block.timestamp > lastPoint.ts) {
            block_slope = (1e18 * (block.number - lastPoint.blockNumber)) / (block.timestamp - lastPoint.ts);
        }
        // If last point is already recorded in this block, slope == 0, but we know the block already in this case
        // Go over weeks to fill in the history and (or) calculate what the current point is
        {
            uint256 tStep = (lastCheckpoint / WEEK) * WEEK;
            for (uint256 i = 0; i < 255; ++i) {
                // Hopefully it won't happen that this won't get used in 5 years!
                // If it does, users will be able to withdraw but vote weight will be broken
                tStep += WEEK;
                int128 dSlope;
                if (tStep > block.timestamp) {
                    tStep = block.timestamp;
                } else {
                    dSlope = mapSlopeChanges[tStep];
                }
                if(tStep < lastCheckpoint) {
                    // This could potentially happen
                    // │─────────────────────────────────────────────────────────Tests────────────────────────────────────────────────────────│                                                          
                    // echidna_test: PASSED!
                    // cond = false;
                }
                // always tStep > lastCheckpoint, so correct int256(tStep - lastCheckpoint) from 
                // https://github.com/solidlyexchange/solidly/blob/master/contracts/ve.sol#L834
                lastPoint.bias -= lastPoint.slope * int128(int256(tStep - lastCheckpoint));
                lastPoint.slope += dSlope;
                if (lastPoint.bias < 0) {
                    // This could potentially happen
                    // │─────────────────────────────────────────────────────────Tests────────────────────────────────────────────────────────│                                                          
                    // echidna_test: PASSED!
                    // cond = false;
                    lastPoint.bias = 0;

                }
                if (lastPoint.slope < 0) {
                    // This cannot happen - just in case
                    // │─────────────────────────────────────────────────────────Tests────────────────────────────────────────────────────────│                                                          
                    // echidna_test: PASSED!
                    // cond = false;
                    lastPoint.slope = 0;
                }
                lastCheckpoint = tStep;
                lastPoint.ts = tStep;
                lastPoint.blockNumber = initialPoint.blockNumber + (block_slope * (tStep - initialPoint.ts)) / 1e18;
                lastPoint.balance = initialPoint.balance;
                curNumPoint += 1;
                if (tStep == block.timestamp) {
                    lastPoint.blockNumber = block.number;
                    lastPoint.balance = supply;
                    break;
                } else {
                    mapSupplyPoints[curNumPoint] = lastPoint;
                }
            }
        }

        totalNumPoints = curNumPoint;
        // Now mapSupplyPoints is filled until current time

        if (account != address(0)) {
            // If last point was in this block, the slope change has been already applied. In such case we have 0 slope(s)
            lastPoint.slope += (uNew.slope - uOld.slope);
            lastPoint.bias += (uNew.bias - uOld.bias);
            if (lastPoint.slope < 0) {
                // cond = false;
                // │─────────────────────────────────────────────────────────Tests────────────────────────────────────────────────────────│                                                          
                // echidna_test: PASSED!
                lastPoint.slope = 0;
            }
            if (lastPoint.bias < 0) {
                // │─────────────────────────────────────────────────────────Tests────────────────────────────────────────────────────────│                                                          
                // echidna_test: PASSED!
                // cond = false;
                lastPoint.bias = 0;
            }
        }

        // Record the last updated point
        mapSupplyPoints[curNumPoint] = lastPoint;

        if (account != address(0)) {
            // Schedule the slope changes (slope is going down)
            // We subtract new_user_slope from [newLocked.end]
            // and add old_user_slope to [oldLocked.end]
            if (oldLocked.end > block.timestamp) {
                // oldDSlope was <something> - uOld.slope, so we cancel that
                oldDSlope += uOld.slope;
                if (newLocked.end == oldLocked.end) {
                    oldDSlope -= uNew.slope; // It was a new deposit, not extension
                }
                mapSlopeChanges[oldLocked.end] = oldDSlope;
            }

            if (newLocked.end > block.timestamp) {
                if (newLocked.end > oldLocked.end) {
                    newDSlope -= uNew.slope; // old slope disappeared at this point
                    mapSlopeChanges[newLocked.end] = newDSlope;
                }
                // else: we recorded it already in oldDSlope
            }
            // Now handle user history
            uNew.ts = block.timestamp;
            uNew.blockNumber = block.number;
            uNew.balance = uint256(uint128(newLocked.amount));
            mapUserPoints[account].push(uNew);
        }
    }

    /// @dev Deposits and locks tokens for a specified account.
    /// @param account Address that already holds the locked amount.
    /// @param amount Amount to deposit.
    /// @param unlockTime New time when to unlock the tokens, or 0 if unchanged.
    /// @param lockedBalance Previous locked amount / end time.
    /// @param depositType Deposit type.
    function _depositFor(
        address account,
        uint256 amount,
        uint256 unlockTime,
        LockedBalance memory lockedBalance,
        DepositType depositType
    ) internal {
        uint256 supplyBefore = supply;
        supply = supplyBefore + amount;
        // Get the old locked data
        LockedBalance memory oldLocked;
        (oldLocked.amount, oldLocked.end) = (lockedBalance.amount, lockedBalance.end);
        // Adding to existing lock, or if a lock is expired - creating a new one
        lockedBalance.amount += int128(int256(amount));
        if (unlockTime != 0) {
            lockedBalance.end = unlockTime;
        }
        mapLockedBalances[account] = lockedBalance;

        // Possibilities:
        // Both oldLocked.end could be current or expired (>/< block.timestamp)
        // amount == 0 (extend lock) or amount > 0 (add to lock or extend lock)
        // lockedBalance.end > block.timestamp (always)
        _checkpoint(account, oldLocked, lockedBalance);

        if (amount != 0) {
            // IERC20(token).safeTransferFrom(from, address(this), amount);
        }

        emit Deposit(account, amount, lockedBalance.end, depositType, block.timestamp);
        emit Supply(supplyBefore, supplyBefore + amount);
    }

    /// @dev Record global data to checkpoint.
    function checkpoint() public {
        _checkpoint(address(0), LockedBalance(0, 0), LockedBalance(0, 0));
    }

    /// @dev Deposits `amount` tokens for `account` and adds to the lock.
    /// @dev Anyone (even a smart contract) can deposit for someone else, but
    ///      cannot extend their locktime and deposit for a brand new user.
    /// @param account Account address.
    /// @param amount Amount to add.
    function depositFor(address account, uint256 amount) public {
        LockedBalance memory lockedBalance = mapLockedBalances[account];
        // Check if the amount is zero
        if (amount == 0) {
            revert ();
        }
        // The locked balance must already exist
        if (lockedBalance.amount == 0) {
            revert ();
        }
        // Check the lock expiry
        if (lockedBalance.end <= block.timestamp) {
            revert ();
        }
        _depositFor(account, amount, 0, lockedBalance, DepositType.DEPOSIT_FOR_TYPE);
    }

    /// @dev Deposits `amount` tokens for `msg.sender` and lock until `unlockTime`.
    /// @param amount Amount to deposit.
    /// @param unlockTime Time when tokens unlock, rounded down to a whole week.
    function createLock(uint256 amount, uint256 unlockTime) public {
        // Lock time is rounded down to weeks
        uint256 unlockTime = ((block.timestamp + unlockTime) / WEEK) * WEEK;
        LockedBalance memory lockedBalance = mapLockedBalances[msg.sender];
        // Check if the amount is zero
        if (amount == 0) {
            revert ();
        }
        // The locked balance must be zero in order to start the lock
        if (lockedBalance.amount != 0) {
            revert ();
        }
        // Check for the lock time correctness
        if (unlockTime <= block.timestamp) {
            revert ();
        }
        // Check for the lock time not to exceed the MAXTIME
        if (unlockTime > block.timestamp + MAXTIME) {
            revert ();
        }

        _depositFor(msg.sender, amount, unlockTime, lockedBalance, DepositType.CREATE_LOCK_TYPE);
    }

    /// @dev Deposits `amount` additional tokens for `msg.sender` without modifying the unlock time.
    /// @param amount Amount of tokens to deposit and add to the lock.
    function increaseAmount(uint256 amount) public {
        LockedBalance memory lockedBalance = mapLockedBalances[msg.sender];
        // Check if the amount is zero
        if (amount == 0) {
            revert ();
        }
        // The locked balance must already exist
        if (lockedBalance.amount == 0) {
            revert ();
        }
        // Check the lock expiry
        if (lockedBalance.end <= block.timestamp) {
            revert ();
        }

        _depositFor(msg.sender, amount, 0, lockedBalance, DepositType.INCREASE_LOCK_AMOUNT);
    }

    /// @dev Extends the unlock time.
    /// @param unlockTime New tokens unlock time.
    function increaseUnlockTime(uint256 unlockTime) public {
        LockedBalance memory lockedBalance = mapLockedBalances[msg.sender];
        uint256 unlockTime = ((block.timestamp + unlockTime) / WEEK) * WEEK;
        // The locked balance must already exist
        if (lockedBalance.amount == 0) {
            revert ();
        }
        // Check the lock expiry
        if (lockedBalance.end <= block.timestamp) {
            revert ();
        }
        // Check for the lock time correctness
        if (unlockTime <= lockedBalance.end) {
            revert ();
        }
        // Check for the lock time not to exceed the MAXTIME
        if (unlockTime > block.timestamp + MAXTIME) {
            revert ();
        }

        _depositFor(msg.sender, 0, unlockTime, lockedBalance, DepositType.INCREASE_UNLOCK_TIME);
    }

    /// @dev Withdraws all tokens for `msg.sender`. Only possible if the lock has expired.
    function withdraw() public {
        LockedBalance memory lockedBalance = mapLockedBalances[msg.sender];
        if (lockedBalance.end > block.timestamp) {
            revert ();
        }
        uint256 amount = uint256(int256(lockedBalance.amount));

        mapLockedBalances[msg.sender] = LockedBalance(0,0);
        uint256 supplyBefore = supply;
        supply = supplyBefore - amount;

        // oldLocked can have either expired <= timestamp or zero end
        // lockedBalance has only 0 end
        // Both can have >= 0 amount
        _checkpoint(msg.sender, lockedBalance, LockedBalance(0,0));

        emit Withdraw(msg.sender, amount, block.timestamp);
        emit Supply(supplyBefore, supply);

        // IERC20(token).safeTransfer(msg.sender, amount);
    }

    /// @dev Echidna fuzzer
    function echidna_test() public returns (bool) {
        return(cond);
    }
}