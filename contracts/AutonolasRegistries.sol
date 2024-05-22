// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

// Importing all the necessary Autonolas registries contracts
import {AgentRegistry} from "../lib/autonolas-registries/contracts/AgentRegistry.sol";
import {ComponentRegistry} from "../lib/autonolas-registries/contracts/ComponentRegistry.sol";
import {RegistriesManager} from "../lib/autonolas-registries/contracts/RegistriesManager.sol";
import {ServiceManager} from "../lib/autonolas-registries/contracts/ServiceManager.sol";
import {ServiceRegistry} from "../lib/autonolas-registries/contracts/ServiceRegistry.sol";
import {GnosisSafeMultisig} from "../lib/autonolas-registries/contracts/multisigs/GnosisSafeMultisig.sol";
import {GnosisSafeSameAddressMultisig} from "../lib/autonolas-registries/contracts/multisigs/GnosisSafeSameAddressMultisig.sol";
import {StakingActivityChecker} from "../lib/autonolas-registries/contracts/staking/StakingActivityChecker.sol";
import {StakingFactory} from "../lib/autonolas-registries/contracts/staking/StakingFactory.sol";
import {StakingToken} from "../lib/autonolas-registries/contracts/staking/StakingToken.sol";