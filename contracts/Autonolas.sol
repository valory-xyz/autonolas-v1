// SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;

// Importing all the necessary Autonolas contracts
import "../lib/autonolas-governance/contracts/OLAS.sol";
import "../lib/autonolas-governance/contracts/GovernorOLAS.sol";
import "../lib/autonolas-governance/contracts/Timelock.sol";
import "../lib/autonolas-governance/contracts/veOLAS.sol";
import "../lib/autonolas-governance/contracts/Sale.sol";
import "../lib/autonolas-registries/contracts/AgentRegistry.sol";
import "../lib/autonolas-registries/contracts/ComponentRegistry.sol";
import "../lib/autonolas-registries/contracts/RegistriesManager.sol";
import "../lib/autonolas-registries/contracts/ServiceManager.sol";
import "../lib/autonolas-registries/contracts/ServiceRegistry.sol";
import "../lib/autonolas-registries/contracts/multisigs/GnosisSafeMultisig.sol";
import "../lib/autonolas-registries/contracts/test/GnosisSafeABICreator.sol";
import "../lib/autonolas-tokenomics/contracts/Depository.sol";
import "../lib/autonolas-tokenomics/contracts/Dispenser.sol";
import "../lib/autonolas-tokenomics/contracts/Tokenomics.sol";
import "../lib/autonolas-tokenomics/contracts/Treasury.sol";