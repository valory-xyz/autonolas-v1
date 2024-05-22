// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

// Importing all the necessary Autonolas tokenomics contracts
import {DonatorBlacklist} from "../lib/autonolas-tokenomics/contracts/DonatorBlacklist.sol";
import {GenericBondCalculator} from "../lib/autonolas-tokenomics/contracts/GenericBondCalculator.sol";
import {Depository} from "../lib/autonolas-tokenomics/contracts/Depository.sol";
import {Dispenser} from "../lib/autonolas-tokenomics/contracts/Dispenser.sol";
import {Tokenomics} from "../lib/autonolas-tokenomics/contracts/Tokenomics.sol";
import {TokenomicsProxy} from "../lib/autonolas-tokenomics/contracts/TokenomicsProxy.sol";
import {Treasury} from "../lib/autonolas-tokenomics/contracts/Treasury.sol";
import {EthereumDepositProcessor} from "../lib/autonolas-tokenomics/contracts/staking/EthereumDepositProcessor.sol";
import {GnosisDepositProcessorL1} from "../lib/autonolas-tokenomics/contracts/staking/GnosisDepositProcessorL1.sol";
import {GnosisTargetDispenserL2} from "../lib/autonolas-tokenomics/contracts/staking/GnosisTargetDispenserL2.sol";
import {BridgeRelayer} from "../lib/autonolas-tokenomics/contracts/staking/test/BridgeRelayer.sol";