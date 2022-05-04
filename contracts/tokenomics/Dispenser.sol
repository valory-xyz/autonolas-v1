// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IErrors.sol";
import "../interfaces/IStructs.sol";
import "../interfaces/ITokenomics.sol";
import "../interfaces/ITreasury.sol";

/// @title Dispenser - Smart contract for rewards
/// @author AL
/// @author Aleksandr Kuperman - <aleksandr.kuperman@valory.xyz>
contract Dispenser is IStructs, IErrors, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    event TreasuryUpdated(address treasury);
    event TokenomicsUpdated(address tokenomics);

    // OLA token address
    address public immutable ola;
    // Treasury address
    address public treasury;
    // Tokenomics address
    address public tokenomics;
    // Mapping account => last taken reward block for staking
    mapping(address => uint256) public mapLastRewardEpochs;

    constructor(address _ola, address _treasury, address _tokenomics) {
        ola = _ola;
        treasury = _treasury;
        tokenomics = _tokenomics;
    }

    // Only treasury has a privilege to manipulate a dispenser
    modifier onlyTreasury() {
        if (treasury != msg.sender) {
            revert ManagerOnly(msg.sender, treasury);
        }
        _;
    }

    function changeTreasury(address newTreasury) external onlyOwner {
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    function changeTokenomics(address newTokenomics) external onlyOwner {
        tokenomics = newTokenomics;
        emit TokenomicsUpdated(newTokenomics);
    }

    /// @dev Withdraws rewards for owners of components / agents.
    function withdrawOwnerRewards() external nonReentrant {
        uint256 reward = ITokenomics(tokenomics).accountOwnerRewards(msg.sender);
        if (reward > 0) {
            IERC20(ola).safeTransfer(msg.sender, reward);
        }
    }

    /// @dev Withdraws rewards for a staker.
    /// @return reward Reward amount.
    function withdrawStakingRewards() external nonReentrant returns (uint256 reward) {
        // Starting epoch number where the last time reward was not yet given
        uint256 startEpochNumber = mapLastRewardEpochs[msg.sender];
        uint256 endEpochNumber;
        // Get the reward and epoch number up to which the reward was calculated
        (reward, endEpochNumber) = ITokenomics(tokenomics).calculateStakingRewards(msg.sender, startEpochNumber);
        // Update the latest epoch number from which reward will be calculated the next time
        mapLastRewardEpochs[msg.sender] = endEpochNumber;

        if (reward > 0) {
            IERC20(ola).safeTransfer(msg.sender, reward);
        }
    }

    /// @dev Gets the paused state.
    /// @return True, if paused.
    function isPaused() external view returns (bool) {
        return paused();
    }
}
