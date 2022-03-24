// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/// @dev Interface for treasury management.
interface ITreasury {
    /// @dev Allows approved address to deposit an asset for OLA.
    /// @param tokenAmount Token amount to get OLA for.
    /// @param token Token address.
    /// @param olaMintAmount Amount of OLA token issued.
    function deposit(uint256 tokenAmount, address token, uint256 olaMintAmount) external;

    /// @dev Allows manager to withdraw specified tokens from reserves
    /// @param tokenAmount Token amount to get reserves from.
    /// @param token Token address.
    function withdraw(uint256 tokenAmount, address token) external;

    /// @dev Enables a token to be exchanged for OLA.
    /// @param token Token address.
    function enableToken(address token) external;

    /// @dev Disables a token from the ability to exchange for OLA.
    /// @param token Token address.
    function disableToken(address token) external;

    /// @dev Gets the token registry set.
    /// @return Set of token registry.
    function getTokenRegistry() external view returns (address[] memory);

    /// @dev Gets information about token being enabled.
    /// @param token Token address.
    /// @return enabled True is token is enabled.
    function isEnabled(address token) external view returns (bool enabled);
}