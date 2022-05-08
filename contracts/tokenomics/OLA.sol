// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "../interfaces/IErrors.sol";

/// @title OLA - Smart contract for the OLA token
/// @author AL
contract OLA is IErrors, Ownable, ERC20, ERC20Burnable, ERC20Permit {
    event MinterUpdated(address minter);

    // One year interval
    uint256 public constant oneYear = 1 days * 365;
    // Ten years interval
    uint256 public constant tenYears = 10 * oneYear;
    // Total supply cap for the first ten years (one billion OLA tokens)
    uint256 public constant tenYearSupplyCap = 1_000_000_000e18;
    // Maximum annual inflation after first ten years
    uint256 public constant maxMintCapFraction = 2;
    // Initial timestamp of the token deployment
    uint256 public timeLaunch;

    // Minter address
    address public minter;

    constructor(uint256 _supply, address _minter) ERC20("OLA Token", "OLA") ERC20Permit("OLA Token") {
        minter = _minter;
        timeLaunch = block.timestamp;
        if (_supply > 0) {
            mint(msg.sender, _supply);
        }
    }

    modifier onlyManager() {
        if (msg.sender != minter && msg.sender != owner()) {
            revert ManagerOnly(msg.sender, minter);
        }
        _;
    }

    /// @dev Changes the minter address.
    /// @param newMinter Address of a new minter.
    function changeMinter(address newMinter) external onlyOwner {
        minter = newMinter;
        emit MinterUpdated(minter);
    }

    /// @dev Mints OLA tokens.
    /// @param account Account address.
    /// @param amount OLA token amount.
    function mint(address account, uint256 amount) public onlyManager {
        if (inflationControl(amount)) {
            super._mint(account, amount);
        }
    }

    /// @dev Provides various checks for the inflation control.
    /// @param amount Amount of OLA to mint.
    /// @return True if the amount request is within inflation boundaries.
    function inflationControl(uint256 amount) public returns (bool) {
        // Scenario for the first ten years
        uint256 remainder = inflationRemainder()
        if (amount > remainder) {
            return false;
        }
        return true;
    }

    function inflationRemainder() public pure returns (uint256 remainder) {
        uint256 totalSupply = super.totalSupply();
        if (block.timestamp - timeLaunch < tenYears) {
            remainder = tenYearSupplyCap - totalSupply;
        } else {
            // Number of years after ten years have passed (including ongoing ones)
            uint256 numYears = (block.timestamp - tenYears - timeLaunch) / oneYear + 1;
            // Calculate maximum mint amount to date
            uint256 supplyCap = tenYearSupplyCap;
            for (uint256 i = 0; i < numYears; ++i) {
                supplyCap += supplyCap * maxMintCapFraction / 100;
            }
            remainder = supplyCap - totalSupply;
        }
    }
}