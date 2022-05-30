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

// Structure for voting escrow points
struct PointVoting {
    // w(i) = at + b (bias)
    int128 bias;
    // dw / dt = a (slope)
    int128 slope;
    // Timestamp. It will never practically be bigger
    uint64 ts;
    // Block number. It will not be bigger than the timestamp
    uint64 blockNumber;
    // Token amount. It will never practically be bigger. Initial OLA cap is 1 bn tokens, or 1e27.
    // After 10 years, the inflation rate is 2% per year. It would take 1340+ years to reach 2^128 - 1
    uint128 balance;
}


struct LockedBalance {
    // Token amount. It will never practically be bigger. Initial OLA cap is 1 bn tokens, or 1e27.
    // After 10 years, the inflation rate is 2% per year. It would take 1340+ years to reach 2^128 - 1
    uint128 amount;
    // Unlock time. It will never practically be bigger
    uint64 end;
}

contract VotingEscrowVerySimple {
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
    uint64 internal constant WEEK = 1 weeks;
    // Maximum lock time (4 years)
    uint256 internal constant MAXTIME = 4 * 365 * 86400;
    // Maximum lock time (4 years) in int128
    int128 internal constant IMAXTIME = 4 * 365 * 86400;
    // Number of decimals
    uint8 public constant decimals = 18;

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
    mapping(uint64 => int128) public mapSlopeChanges;

    // Voting token name
    string public name;
    // Voting token symbol
    string public symbol;

    // https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/security/ReentrancyGuard.sol
    // Reentrancy lock
    uint256 private locked = 1;

    /// Echidna invariant
    
    uint256 block_slope; // dblock/dt

    constructor()
    {
        // simplificated for fuzzing
        mapSupplyPoints[0] = PointVoting(0, 0, uint64(block.timestamp), uint64(block.number), 0);
    }

    /// @dev Record global and per-user data to checkpoint. Target for fuzzing
    function _checkpoint(
        address account,
        LockedBalance memory oldLocked,
        LockedBalance memory newLocked,
        PointVoting memory _lastPoint,
        uint128 curSupply,
        int128 _mapSlopeChangesOldLockedEnd,
        int128 _mapSlopeChangesNewLockedEnd,
        int128 _mapSlopeChangesTStep
    ) public {
        PointVoting memory uOld;
        PointVoting memory uNew;
        int128 oldDSlope;
        int128 newDSlope;
        uint256 curNumPoint = totalNumPoints;

        if (account != address(0)) {
            // Calculate slopes and biases
            // Kept at zero when they have to
            if (oldLocked.end > block.timestamp && oldLocked.amount > 0) {
                uOld.slope = int128(oldLocked.amount) / IMAXTIME;
                uOld.bias = uOld.slope * int128(oldLocked.end - uint128(block.timestamp));
            }
            if (newLocked.end > block.timestamp && newLocked.amount > 0) {
                uNew.slope = int128(newLocked.amount) / IMAXTIME;
                uNew.bias = uNew.slope * int128(newLocked.end - uint128(block.timestamp));
            }

            // Read values of scheduled changes in the slope
            // oldLocked.end can be in the past and in the future
            // newLocked.end can ONLY be in the FUTURE unless everything expired: than zeros
            oldDSlope = _mapSlopeChangesOldLockedEnd;
            if (newLocked.end > 0) {
                if (newLocked.end == oldLocked.end) {
                    newDSlope = oldDSlope;
                } else {
                    newDSlope = _mapSlopeChangesNewLockedEnd;
                }
            }
        }

        PointVoting memory lastPoint;
        if (curNumPoint > 0) {
            lastPoint = mapSupplyPoints[curNumPoint];
        } else {
            // If no point is created yet, we take the actual time and block parameters
            lastPoint = PointVoting(0, 0, uint64(block.timestamp), uint64(block.number), 0);
        }
        uint64 lastCheckpoint = lastPoint.ts;
        // initialPoint is used for extrapolation to calculate the block number and save them
        // as we cannot figure that out in exact values from inside of the contract
        PointVoting memory initialPoint = lastPoint;
        block_slope = 0;
        if (block.timestamp > lastPoint.ts) {
            block_slope = (1e18 * uint256(block.number - lastPoint.blockNumber)) / uint256(block.timestamp - lastPoint.ts);
        }
        // If last point is already recorded in this block, slope == 0, but we know the block already in this case
        // Go over weeks to fill in the history and (or) calculate what the current point is
        {
            // The timestamp is always rounded and > 0 and < 2^32-1 before 2037
            uint64 tStep = (lastCheckpoint / WEEK) * WEEK;
            for (uint256 i = 0; i < 255; ++i) {
                // Hopefully it won't happen that this won't get used in 5 years!
                // If it does, users will be able to withdraw but vote weight will be broken
                // This is always practically < 2^64-1
                unchecked {
                    tStep += WEEK;
                }
                int128 dSlope;
                if (tStep > block.timestamp) {
                    tStep = uint64(block.timestamp);
                } else {
                    dSlope = _mapSlopeChangesTStep;
                }
                lastPoint.bias -= lastPoint.slope * int128(int64(tStep - lastCheckpoint));
                lastPoint.slope += dSlope;
                if (lastPoint.bias < 0) {
                    // This could potentially happen, but fuzzer didn't find available "real" combinations
                    lastPoint.bias = 0;
                    cond = false;
                }
                if (lastPoint.slope < 0) {
                    // This cannot happen - just in case. Again, fuzzer didn't reach this
                    lastPoint.slope = 0;
                }
                lastCheckpoint = tStep;
                lastPoint.ts = tStep;
                lastPoint.blockNumber = initialPoint.blockNumber + uint64((block_slope * uint256(tStep - initialPoint.ts)) / 1e18);
                lastPoint.balance = initialPoint.balance;
                // In order for the overflow of total number of economical checkpoints (starting from zero)
                // the _checkpoint() call must happen n >(2**256 -1)/255 or n > ~1e77/255 > ~1e74 times
                unchecked {
                    curNumPoint += 1;    
                }
                if (tStep == block.timestamp) {
                    lastPoint.blockNumber = uint64(block.number);
                    lastPoint.balance = curSupply;
                    break;
                } else {
                    mapSupplyPoints[curNumPoint] = lastPoint;
                }
            }
        }

        // totalNumPoints = curNumPoint;
        {
            // Now mapSupplyPoints is filled until current time
            if (account != address(0)) {
                // If last point was in this block, the slope change has been already applied. In such case we have 0 slope(s)
                lastPoint.slope += (uNew.slope - uOld.slope);
                lastPoint.bias += (uNew.bias - uOld.bias);
                if (lastPoint.slope < 0) {
                    lastPoint.slope = 0;
                }
                if (lastPoint.bias < 0) {
                lastPoint.bias = 0;
                }
            }
        }
    }


    /// @dev Echidna fuzzer
    function echidna_test() public returns (bool) {
        return(cond);
    }
}
