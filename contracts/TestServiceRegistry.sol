// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol";
import "../lib/autonolas-registries/contracts/ServiceRegistry.sol";
import "../lib/autonolas-registries/contracts/interfaces/IMultisig.sol";

contract TestServiceRegistry is ServiceRegistry {
    uint256 private _controlValue;

    constructor(string memory _name, string memory _symbol, string memory _baseURI, address _agentRegistry)
        ServiceRegistry(_name, _symbol, _baseURI, _agentRegistry) {}

    // Create a safe contract with the parameters passed and check it via GnosisSafe
    function createCheckSafe(
        address[] memory owners,
        uint256 threshold,
        address multisigMaster,
        bytes memory data
    ) public
    {
        // Craete a safe multisig
        address multisig = IMultisig(multisigMaster).create(owners, threshold, data);
        address payable gAddress = payable(address(multisig));

        // Check the validity of safe
        GnosisSafe gSafe = GnosisSafe(gAddress);
        require(gSafe.getThreshold() == threshold, "Threshold does not match");
        address[] memory gSafeInstances = gSafe.getOwners();
        for (uint256 i = 0; i < owners.length; i++) {
            require(gSafeInstances[i] == owners[i], "Owners are wrong");
        }
    }

    // Function to test the governance execution
    function executeByGovernor(uint256 newValue) external {
        // Check for the manager privilege for a service management
        if (manager != msg.sender) {
            revert ManagerOnly(msg.sender, manager);
        }

        _controlValue = newValue;
    }

    // Getter for a controlled value
    function getControlValue() public view returns (uint256) {
        return _controlValue;
    }
}
