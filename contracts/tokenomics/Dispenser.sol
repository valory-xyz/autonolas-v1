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
import "hardhat/console.sol";

/// @title Dispenser - Smart contract for rewards
/// @author AL
/// @author Aleksandr Kuperman - <aleksandr.kuperman@valory.xyz>
contract Dispenser is IStructs, IErrors, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    event TokenomicsUpdated(address tokenomics);
    event TransferETHFailed(address account, uint256 amount);

    // OLA token address
    address public immutable ola;
    // Tokenomics address
    address public tokenomics;
    // Mapping account => last taken reward block for staking
    mapping(address => uint256) public mapLastRewardEpochs;

    constructor(address _ola, address _tokenomics) {
        ola = _ola;
        tokenomics = _tokenomics;
    }

    function changeTokenomics(address newTokenomics) external onlyOwner {
        tokenomics = newTokenomics;
        emit TokenomicsUpdated(newTokenomics);
    }

    /// @dev Withdraws rewards for owners of components / agents.
    /// @return reward Reward amount in ETH.
    /// @return topUp Top-up amount in OLA.
    function withdrawOwnerRewards() external nonReentrant whenNotPaused returns (uint256 reward, uint256 topUp) {
        (reward, topUp) = ITokenomics(tokenomics).accountOwnerRewards(msg.sender);
        console.log("reward", reward);
        console.log("topUp", topUp);
        console.log("ether balance", address(this).balance);
        if (reward > 0) {
            (bool success, ) = msg.sender.call{value: reward}("");
            if (!success) {
                console.log("No success");
                // TODO: Decide what to do later, so that still try the ola transfer
                emit TransferETHFailed(msg.sender, reward);
            }
        }
        if (topUp > 0) {
            IERC20(ola).safeTransfer(msg.sender, topUp);
        }
    }

    /// @dev Withdraws rewards for a staker.
    /// @return reward Reward amount in ETH.
    /// @return topUp Top-up amount in OLA.
    function withdrawStakingRewards() external nonReentrant whenNotPaused returns (uint256 reward, uint256 topUp) {
        // Starting epoch number where the last time reward was not yet given
        uint256 startEpochNumber = mapLastRewardEpochs[msg.sender];
        uint256 endEpochNumber;
        // Get the reward and epoch number up to which the reward was calculated
        (reward, topUp, endEpochNumber) = ITokenomics(tokenomics).calculateStakingRewards(msg.sender, startEpochNumber);
        // Update the latest epoch number from which reward will be calculated the next time
        mapLastRewardEpochs[msg.sender] = endEpochNumber;

        if (reward > 0) {
            IERC20(ola).safeTransfer(msg.sender, reward);
        }
    }
}
