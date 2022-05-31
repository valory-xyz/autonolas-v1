// SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "../interfaces/IErrors.sol";

/// @title OLA - Smart contract for the main OLA token
/// @author AL
/// @author Aleksandr Kuperman - <aleksandr.kuperman@valory.xyz>
contract OLA is IErrors, Ownable, ERC20, ERC20Burnable, ERC20Permit {
    event MinterUpdated(address minter);

    // One year interval
    uint256 public constant oneYear = 1 days * 365;
    // Total supply cap for the first ten years (one billion OLA tokens)
    uint256 public constant tenYearSupplyCap = 1_000_000_000e18;
    // Maximum annual inflation after first ten years
    uint256 public constant maxMintCapFraction = 2;
    // Initial timestamp of the token deployment
    uint256 public immutable timeLaunch;

    // Minter address
    address public minter;

    constructor(uint256 _supply) ERC20("OLA Token", "OLA") ERC20Permit("OLA Token") {
        minter = msg.sender;
        timeLaunch = block.timestamp;
        if (_supply > 0) {
            _mint(msg.sender, _supply);
        }
    }

    modifier onlyManager() {
        if (msg.sender != minter) {
            revert ManagerOnly(msg.sender, minter);
        }
        _;
    }

    /// @dev Changes the minter address.
    /// @param newMinter Address of a new minter.
    function changeMinter(address newMinter) external onlyOwner {
        minter = newMinter;
        emit MinterUpdated(newMinter);
    }

    /// @dev Mints OLA tokens.
    /// @param account Account address.
    /// @param amount OLA token amount.
    function mint(address account, uint256 amount) public onlyManager {
        if (inflationControl(amount)) {
            _mint(account, amount);
        }
    }

    /// @dev Provides various checks for the inflation control.
    /// @param amount Amount of OLA to mint.
    /// @return True if the amount request is within inflation boundaries.
    function inflationControl(uint256 amount) public view returns (bool) {
        uint256 remainder = inflationRemainder();
        return (amount <= remainder);
    }

    /// @dev Gets the reminder of OLA possible for the mint.
    /// @return remainder OLA token remainder.
    function inflationRemainder() public view returns (uint256 remainder) {
        uint256 totalSupply = super.totalSupply();
        // Current year
        uint256 numYears = (block.timestamp - timeLaunch) / oneYear;
        // Calculate maximum mint amount to date
        uint256 supplyCap = tenYearSupplyCap;
        // After 10 years, adjust supplyCap according to the yearly inflation % set in maxMintCapFraction
        if (numYears > 9) {
            // Number of years after ten years have passed (including ongoing ones)
            numYears -= 9;
            for (uint256 i = 0; i < numYears; ++i) {
                supplyCap += (supplyCap * maxMintCapFraction) / 100;
            }
        }
        // Check for the requested mint overflow
        remainder = supplyCap - totalSupply;
    }
}
