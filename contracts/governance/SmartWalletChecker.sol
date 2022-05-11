// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";


// Source idea https://gov.curve.fi/t/cip-3-add-smartwalletwhitelist-with-dao-maintained-whitelist/25
// Code ported from: https://etherscan.io/address/0xca719728ef172d0961768581fdf35cb116e0b7a4#code
contract SmartWalletChecker is Ownable {
    
    mapping(address => bool) public wallets;
    
    event ApproveWallet(address);
    event RevokeWallet(address);

    // auto approve deployer
    constructor() public {
    	wallets[msg.sender] = true;
        emit ApproveWallet(msg.sender);    
    }
    

    /// @dev approve wallet
    /// @param _wallet address of wallet    
    function approveWallet(address _wallet) external onlyOwner {
        wallets[_wallet] = true;        
        emit ApproveWallet(_wallet);
    }

    /// @dev revoke wallet
    /// @param _wallet address of wallet 	
    function revokeWallet(address _wallet) external onlyOwner {
        wallets[_wallet] = false;
        emit RevokeWallet(_wallet);
    }
    
    
    /// @dev comparison wallet address with "whitelist"
    /// @param _wallet address of wallet
    function check(address _wallet) external view returns (bool) {
        // No nested check is used since this is a classic "access list". In the original contract, the nested check is never called.
        return wallets[_wallet];
    }
}
