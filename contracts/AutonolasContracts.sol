// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

// Importing all the necessary Autonolas governance contracts
import {buOLAS} from "../lib/autonolas-governance/contracts/buOLAS.sol";
import {OLAS} from "../lib/autonolas-governance/contracts/OLAS.sol";
import {GovernorOLAS} from "../lib/autonolas-governance/contracts/GovernorOLAS.sol";
import {Timelock} from "../lib/autonolas-governance/contracts/Timelock.sol";
import {veOLAS} from "../lib/autonolas-governance/contracts/veOLAS.sol";
import {wveOLAS} from "../lib/autonolas-governance/contracts/wveOLAS.sol";
import {VoteWeighting} from "../lib/autonolas-governance/contracts/VoteWeighting.sol";

// Importing all the necessary Autonolas registries contracts
import {AgentRegistry} from "../lib/autonolas-registries/contracts/AgentRegistry.sol";
import {ComponentRegistry} from "../lib/autonolas-registries/contracts/ComponentRegistry.sol";
import {RegistriesManager} from "../lib/autonolas-registries/contracts/RegistriesManager.sol";
import {ServiceRegistry} from "../lib/autonolas-registries/contracts/ServiceRegistry.sol";
import {ServiceRegistryTokenUtility} from "../lib/autonolas-registries/contracts/ServiceRegistryTokenUtility.sol";
import {ServiceManager} from "../lib/autonolas-registries/contracts/ServiceManager.sol";
import {ServiceManagerProxy} from "../lib/autonolas-registries/contracts/ServiceManagerProxy.sol";
import {GnosisSafeMultisig} from "../lib/autonolas-registries/contracts/multisigs/GnosisSafeMultisig.sol";
import {GnosisSafeSameAddressMultisig} from "../lib/autonolas-registries/contracts/multisigs/GnosisSafeSameAddressMultisig.sol";
import {StakingActivityChecker} from "../lib/autonolas-registries/contracts/staking/StakingActivityChecker.sol";
import {StakingFactory} from "../lib/autonolas-registries/contracts/staking/StakingFactory.sol";
import {StakingToken} from "../lib/autonolas-registries/contracts/staking/StakingToken.sol";

// Importing all the necessary Autonolas tokenomics contracts
import {DonatorBlacklist} from "../lib/autonolas-tokenomics/contracts/DonatorBlacklist.sol";
import {GenericBondCalculator} from "../lib/autonolas-tokenomics/contracts/GenericBondCalculator.sol";
import {Depository} from "../lib/autonolas-tokenomics/contracts/Depository.sol";
import {Dispenser} from "../lib/autonolas-tokenomics/contracts/Dispenser.sol";
import {Tokenomics} from "../lib/autonolas-tokenomics/contracts/Tokenomics.sol";
import {TokenomicsProxy} from "../lib/autonolas-tokenomics/contracts/proxies/TokenomicsProxy.sol";
import {Treasury} from "../lib/autonolas-tokenomics/contracts/Treasury.sol";
import {BridgeRelayer} from "../lib/autonolas-tokenomics/contracts/staking/test/BridgeRelayer.sol";
import {EthereumDepositProcessor} from "../lib/autonolas-tokenomics/contracts/staking/EthereumDepositProcessor.sol";
import {GnosisDepositProcessorL1} from "../lib/autonolas-tokenomics/contracts/staking/GnosisDepositProcessorL1.sol";
import {GnosisTargetDispenserL2} from "../lib/autonolas-tokenomics/contracts/staking/GnosisTargetDispenserL2.sol";
import {MockDepositProcessorL1} from "../lib/autonolas-tokenomics/contracts/staking/test/MockDepositProcessorL1.sol";
import {MockStakingDispenser} from "../lib/autonolas-tokenomics/contracts/staking/test/MockStakingDispenser.sol";

// Importing Gnosis Safe ABIs (master copy, proxy factory, multisend and sign-message libraries) for multisig tests.
// ABICreator.sol is itself an import-only aggregator with no contract symbol, so it is imported as a whole file.
import "../lib/autonolas-registries/contracts/test/ABICreator.sol";
