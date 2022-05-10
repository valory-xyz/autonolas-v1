// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "../interfaces/IErrors.sol";

/// @title OLA - Smart contract for the main OLA token
/// @author AL
contract OLA is IErrors, Ownable, ERC20, ERC20Burnable, ERC20Permit {
    event MinterUpdated(address minter);
    event MintRejectedByInflationPolicy(address account, uint256 amount);

    // One year interval
    uint256 public constant oneYear = 1 days * 365;
    // Total supply cap for the first ten years (one billion OLA tokens)
    uint256 public constant tenYearSupplyCap = 1_000_000_000e18;
    // Maximum annual inflation after first ten years
    uint256 public constant maxMintCapFraction = 2;
    // Initial timestamp of the token deployment
    uint256 public timeLaunch;
    // Inflation caps for the first ten years
    uint256[] public inflationCaps;

    // Minter address
    address public minter;

    constructor(uint256 _supply, address _minter) ERC20("OLA Token", "OLA") ERC20Permit("OLA Token") {
        minter = _minter;
        timeLaunch = block.timestamp;
        if (_supply > 0) {
            super._mint(msg.sender, _supply);
        }

        // Set up inflation schedule for ten years
        inflationCaps = new uint[](10);
        inflationCaps[0] = 520_000_000e18;
        inflationCaps[1] = 590_000_000e18;
        inflationCaps[2] = 660_000_000e18;
        inflationCaps[3] = 730_000_000e18;
        inflationCaps[4] = 790_000_000e18;
        inflationCaps[5] = 840_000_000e18;
        inflationCaps[6] = 890_000_000e18;
        inflationCaps[7] = 930_000_000e18;
        inflationCaps[8] = 970_000_000e18;
        inflationCaps[9] = tenYearSupplyCap;
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
        } else {
            emit MintRejectedByInflationPolicy(account, amount);
        }
    }

    /// @dev Provides various checks for the inflation control.
    /// @param amount Amount of OLA to mint.
    /// @return True if the amount request is within inflation boundaries.
    function inflationControl(uint256 amount) public view returns (bool) {
        // Scenario for the first ten years
        uint256 remainder = inflationRemainder();
        if (amount > remainder) {
            return false;
        }
        return true;
    }

    /// @dev Gets the reminder of OLA possible for the mint.
    /// @return remainder OLA token remainder.
    function inflationRemainder() public view returns (uint256 remainder) {
        uint256 totalSupply = super.totalSupply();
        // Current year
        uint256 numYears = (block.timestamp - timeLaunch) / oneYear;
        if (numYears < 10) {
            // Check for the requested mint overflow
            remainder = inflationCaps[numYears] - totalSupply;
        } else {
            // Number of years after ten years have passed (including ongoing ones)
            numYears -= 9;
            // Calculate maximum mint amount to date
            uint256 supplyCap = tenYearSupplyCap;
            for (uint256 i = 0; i < numYears; ++i) {
                supplyCap += supplyCap * maxMintCapFraction / 100;
            }
            // Check for the requested mint overflow
            remainder = supplyCap - totalSupply;
        }
    }
}
