// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// Importing all the necessary Autonolas tokenomics contracts
import "../lib/autonolas-tokenomics/contracts/DonatorBlacklist.sol";
import {GenericBondCalculator} from "../lib/autonolas-tokenomics/contracts/GenericBondCalculator.sol";
import "../lib/autonolas-tokenomics/contracts/Depository.sol";
import "../lib/autonolas-tokenomics/contracts/Dispenser.sol";
import "../lib/autonolas-tokenomics/contracts/Tokenomics.sol";
import "../lib/autonolas-tokenomics/contracts/TokenomicsProxy.sol";
import "../lib/autonolas-tokenomics/contracts/Treasury.sol";