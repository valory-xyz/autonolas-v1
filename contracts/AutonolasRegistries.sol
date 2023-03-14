// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

// Importing all the necessary Autonolas registries contracts
import "../lib/autonolas-registries/contracts/AgentRegistry.sol";
import "../lib/autonolas-registries/contracts/ComponentRegistry.sol";
import "../lib/autonolas-registries/contracts/RegistriesManager.sol";
import "../lib/autonolas-registries/contracts/ServiceManager.sol";
import "../lib/autonolas-registries/contracts/ServiceRegistry.sol";
import {GnosisSafeMultisig} from "../lib/autonolas-registries/contracts/multisigs/GnosisSafeMultisig.sol";
import {GnosisSafeSameAddressMultisig} from "../lib/autonolas-registries/contracts/multisigs/GnosisSafeSameAddressMultisig.sol";