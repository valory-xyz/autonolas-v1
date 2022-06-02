// SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "../interfaces/IErrors.sol";
import "../interfaces/IStructs.sol";

/// @title Burnable Locked OLA Token - OLA burnable contract
/// @author Aleksandr Kuperman - <aleksandr.kuperman@valory.xyz>

// Struct for storing balance, lock and unlock time
// The struct size is one storage slot of uint256 (128 + 64 + 64)
struct LockedBalance {
    // Token amount
    uint128 amount;
    // Lock time start
    uint64 start;
    // Time of the last release
    uint64 lastRelease;
}

/// @notice This token supports the ERC20 interface specifications except for transfers.
contract buOLA is IErrors, IStructs, IERC20, IERC165 {
    event Lock(address indexed account, uint256 amount, uint256 start, uint256 end);
    event Release(address indexed account, uint256 amount, uint256 ts);
    event Revoke(address indexed account, uint256 amount, uint256 ts);
    event Supply(uint256 prevSupply, uint256 curSupply);
    event OwnerUpdated(address indexed owner);

    // Locking step (1 year)
    uint64 internal constant STEP_TIME = 365 * 86400;
    // Number of locking steps (4 years)
    uint64 internal constant LOCKING_STEPS = 4;
    // Total locking time
    uint64 internal constant TOTAL_LOCKING_TIME = STEP_TIME * LOCKING_STEPS;
    // Number of decimals
    uint8 public constant decimals = 18;

    // Token address
    address public immutable token;
    // Token burn address
    address public immutable furnace;
    // Owner address
    address public owner;
    // Total token supply
    uint256 public supply;
    // Mapping of account address => LockedBalance
    mapping(address => LockedBalance) public mapLockedBalances;

    // Voting token name
    string public name;
    // Voting token symbol
    string public symbol;

    // Reentrancy lock
    uint256 private locked = 1;

    /// @dev Contract constructor
    /// @param _token Token address.
    /// @param _name Token name.
    /// @param _symbol Token symbol.
    /// @param _furnace Token burn address.
    constructor(address _token, string memory _name, string memory _symbol, address _furnace)
    {
        token = _token;
        name = _name;
        symbol = _symbol;
        owner = msg.sender;
        furnace = _furnace;
    }

    /// @dev Changes the owner address.
    /// @param newOwner Address of a new owner.
    function changeOwner(address newOwner) external {
        if (newOwner == address(0)) {
            revert ZeroAddress();
        }

        if (msg.sender != owner) {
            revert ManagerOnly(msg.sender, owner);
        }

        owner = newOwner;
        emit OwnerUpdated(newOwner);
    }

    /// @dev Deposits `amount` tokens for the `account` and lock for `TOTAL_LOCKING_TIME`.
    /// @param account Target account address.
    /// @param amount Amount to deposit.
    function createLockFor(address account, uint256 amount) external {
        // Reentrancy guard
        if (locked > 1) {
            revert ReentrancyGuard();
        }
        locked = 2;

        LockedBalance memory lockedBalance = mapLockedBalances[account];
        // Check if the amount is zero
        if (amount == 0) {
            revert ZeroValue();
        }
        // The locked balance must be zero in order to start the lock
        if (lockedBalance.amount > 0) {
            revert LockedValueNotZero(account, uint256(lockedBalance.amount));
        }
        lockedBalance.start = uint64(block.timestamp);
        lockedBalance.lastRelease = lockedBalance.start;
        // After 10 years, the inflation rate is 2% per year. It would take 220+ years to reach 2^96 - 1 total supply
        if (amount > type(uint96).max) {
            revert Overflow(amount, type(uint96).max);
        }

        // Store the locked balance for the account
        lockedBalance.amount = uint128(amount);
        mapLockedBalances[account] = lockedBalance;

        // Calculate total supply
        uint256 supplyBefore = supply;
        uint256 supplyAfter;
        // Cannot overflow because the total supply << 2^128-1
        unchecked {
            supplyAfter = supplyBefore + amount;
            supply = supplyAfter;
        }

        if (amount > 0) {
            // OLA is a standard ERC20 token with a original function transfer() that returns bool
            bool success = IERC20(token).transferFrom(account, address(this), amount);
            if (!success) {
                revert TransferFailed(token, msg.sender, address(this), amount);
            }
        }

        emit Lock(account, amount, block.timestamp, block.timestamp + TOTAL_LOCKING_TIME);
        emit Supply(supplyBefore, supplyAfter);

        locked = 1;
    }

    /// @dev Releases all matured tokens for `msg.sender`.
    function release() external {
        // Reentrancy guard
        if (locked > 1) {
            revert ReentrancyGuard();
        }
        locked = 2;

        LockedBalance memory lockedBalance = mapLockedBalances[msg.sender];

        // Calculate the amount to release
        uint256 amount;
        uint256 lockedSteps;
        (amount, lockedSteps) = releasableAmount(msg.sender);
        // Check if at least one locking step has passed
        if (amount == 0) {
            revert LockNotExpired(msg.sender, lockedBalance.lastRelease, block.timestamp);
        }
        
        unchecked {
            // Update the last release time rounded by the locking step
            // Cannot practically overflow because block.timestamp + unlockTime (max 4 years) << 2^64-1
            lockedBalance.lastRelease += uint64(lockedSteps) * STEP_TIME;
            // Update the account locked amount
            lockedBalance.amount -= uint128(amount);
        }
        mapLockedBalances[msg.sender] = lockedBalance;

        uint256 supplyBefore = supply;
        uint256 supplyAfter;
        // The amount cannot be less than the total supply
        unchecked {
            supplyAfter = supplyBefore - amount;
            supply = supplyAfter;
        }

        emit Release(msg.sender, amount, block.timestamp);
        emit Supply(supplyBefore, supplyAfter);

        bool success = IERC20(token).transfer(msg.sender, amount);
        if (!success) {
            revert TransferFailed(token, address(this), msg.sender, amount);
        }
        locked = 1;
    }

    /// @dev Revoke and burn all non-matured tokens from the `account`.
    /// @param account Account address.
    function revoke(address account) external {
        // Check for the ownership
        if (owner != msg.sender) {
            revert ManagerOnly(msg.sender, owner);
        }

        LockedBalance memory lockedBalance = mapLockedBalances[account];
        // Current locked time
        uint64 lockedSteps;
        // Time in the future will be greater than the start time
        unchecked {
            lockedSteps = (uint64(block.timestamp) - lockedBalance.start) / STEP_TIME;
        }

        // If the number of locked steps is greater than the maturity, there is nothing to revoke
        if ((lockedSteps + 1) > LOCKING_STEPS) {
            revert LockExpired(account, lockedBalance.start + TOTAL_LOCKING_TIME, block.timestamp);
        }
        // Calculate what is left from non-matured tokens
        // At this stage lockedSteps cannot be bigger than LOCKING_STEPS
        unchecked {
            lockedSteps = LOCKING_STEPS - lockedSteps;
        }

        // Calculate amount to revoke and burn
        uint256 amount = uint256((lockedBalance.amount * lockedSteps) / LOCKING_STEPS);

        unchecked {
            // Update the last release time rounded by the locking step (the rest until this date belongs to the account)
            // Cannot practically overflow because block.timestamp + unlockTime (max 4 years) << 2^64-1
            lockedBalance.lastRelease += lockedSteps * STEP_TIME;
            // Update the account locked amount
            lockedBalance.amount -= uint128(amount);
        }
        mapLockedBalances[msg.sender] = lockedBalance;

        uint256 supplyBefore = supply;
        uint256 supplyAfter;
        // The amount cannot be less than the total supply
        unchecked {
            supplyAfter = supplyBefore - amount;
            supply = supplyAfter;
        }

        emit Revoke(account, amount, block.timestamp);
        emit Supply(supplyBefore, supplyAfter);

        bool success = IERC20(token).transfer(furnace, amount);
        if (!success) {
            revert TransferFailed(token, address(this), furnace, amount);
        }
    }

    /// @dev Gets the account locking balance.
    /// @param account Account address.
    /// @return balance Account balance.
    function balanceOf(address account) public view override returns (uint256 balance) {
        balance = uint256(mapLockedBalances[account].amount);
    }

    /// @dev Gets total token supply.
    /// @return Total token supply.
    function totalSupply() public view override returns (uint256) {
        return supply;
    }

    /// @dev Gets the account releasable amount.
    /// @param account Account address.
    /// @return amount Amount to release.
    /// @return lockedSteps Number of locked steps to release.
    function releasableAmount(address account) public view returns (uint256 amount, uint256 lockedSteps) {
        LockedBalance memory lockedBalance = mapLockedBalances[msg.sender];
        // Current locked time
        uint64 releasedSteps;
        // Time in the future will be greater than the start time
        unchecked {
            releasedSteps = (lockedBalance.lastRelease - lockedBalance.start) / STEP_TIME;
            // Round locked time to the number of steps
            lockedSteps = (uint64(block.timestamp) - lockedBalance.lastRelease) / STEP_TIME;
        }

        // If the number of locked steps is greater than the maturity, all the available tokens are unlocked
        if ((lockedSteps + releasedSteps + 1) > LOCKING_STEPS) {
            // LOCKING_STEPS is always bigger or equal to releasedSteps
            unchecked {
                lockedSteps = LOCKING_STEPS - releasedSteps;
            }
        }

        // Calculate the amount to release
        amount = uint256((lockedBalance.amount * lockedSteps) / LOCKING_STEPS);
    }

    /// @dev Gets the `account`'s next possible release time.
    /// @param account Account address.
    /// @return releaseTime Release time.
    function nextReleaseTime(address account) external view returns (uint256 releaseTime) {
        releaseTime = uint256(mapLockedBalances[account].lastRelease + STEP_TIME);
    }

    /// @dev Gets the `account`'s locking end time.
    /// @param account Account address.
    /// @return unlockTime Maturity time.
    function lockedEnd(address account) external view returns (uint256 unlockTime) {
        unlockTime = uint256(mapLockedBalances[account].start + TOTAL_LOCKING_TIME);
    }

    /// @dev Gets information about the interface support.
    /// @param interfaceId A specified interface Id.
    /// @return True if this contract implements the interface defined by interfaceId.
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IERC20).interfaceId;
    }

    /// @dev Bans the transfer of this token.
    function transfer(address to, uint256 amount) external virtual override returns (bool) {
        revert NonTransferable(address(this));
    }

    /// @dev Bans the approval of this token.
    function approve(address spender, uint256 amount) external virtual override returns (bool) {
        revert NonTransferable(address(this));
    }

    /// @dev Bans the transferFrom of this token.
    function transferFrom(address from, address to, uint256 amount) external virtual override returns (bool) {
        revert NonTransferable(address(this));
    }

    /// @dev Compatibility with IERC20.
    function allowance(address owner, address spender) external view virtual override returns (uint256)
    {
        revert NonTransferable(address(this));
    }
}
