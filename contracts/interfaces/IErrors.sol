// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/**
 * @dev Errors.
 */
interface IErrors {
    /// @dev Only `manager` has a privilege, but the `sender` was provided.
    /// @param sender Sender address.
    /// @param manager Required sender address as a manager.
    error ManagerOnly(address sender, address manager);

    /// @dev Wrong hash format.
    /// @param hashFunctionProvided Hash function classification provided.
    /// @param hashFunctionNeeded Hash function classification needed.
    /// @param sizeProvided Size of a hash digest provided.
    /// @param sizeNeeded Size of a hash digest needed.
    error WrongHash(uint8 hashFunctionProvided, uint8 hashFunctionNeeded, uint8 sizeProvided, uint8 sizeNeeded);

    /// @dev Hash already exists in the records.
    error HashExists();

    /// @dev Provided zero address.
    error ZeroAddress();

    /// @dev The provided string is empty.
    error EmptyString();

    /// @dev Component Id is not correctly provided for the current routine.
    /// @param componentId Component Id.
    error WrongComponentId(uint256 componentId);

    /// @dev Agent Id is not correctly provided for the current routine.
    /// @param agentId Component Id.
    error WrongAgentId(uint256 agentId);

    /// @dev Inconsistent data of cannonical agent Ids and their correspondent slots.
    /// @param numAgentIds Number of canonical agent Ids.
    /// @param numAgentSlots Numberf of canonical agent Id slots.
    error WrongAgentIdsData(uint256 numAgentIds, uint256 numAgentSlots);

    /// @dev Canonical agent Id is not found.
    /// @param agentId Canonical agent Id.
    error AgentNotFound(uint256 agentId);

    /// @dev Component Id is not found.
    /// @param componentId Component Id.
    error ComponentNotFound(uint256 componentId);

    /// @dev Multisig threshold is out of bounds.
    /// @param currentThreshold Current threshold value.
    /// @param minThreshold Minimum possible threshold value.
    /// @param maxThreshold Maximum possible threshold value.
    error WrongThreshold(uint256 currentThreshold, uint256 minThreshold, uint256 maxThreshold);

    /// @dev Service Id is not found, although service Id might exist in the records.
    /// @dev serviceId Service Id.
    error ServiceNotFound(uint256 serviceId);

    /// @dev Service Id does not exist in registry records.
    /// @param serviceId Service Id.
    error ServiceDoesNotExist(uint256 serviceId);

    /// @dev Agent instance is already registered with a specified `serviceId`.
    /// @param serviceId Service Id.
    error AgentInstanceRegistered(uint256 serviceId);

    /// @dev Wrong operator is specified when interacting with a specified `serviceId`.
    /// @param serviceId Service Id.
    error WrongOperator(uint256 serviceId);

    /// @dev Canonical `agentId` is not found as a part of `serviceId`.
    /// @param agentId Canonical agent Id.
    /// @param serviceId Service Id.
    error AgentNotInService(uint256 agentId, uint256 serviceId);

    /// @dev Zero value when it has to be greater than zero.
    error ZeroValue();

    /// @dev Service is inactive.
    /// @param serviceId Service Id.
    error ServiceInactive(uint256 serviceId);

    /// @dev Service is active.
    /// @param serviceId Service Id.
    error ServiceActive(uint256 serviceId);

    /// @dev Agent instance registration timeout has been reached. Service is expired.
    /// @param deadline The registration deadline.
    /// @param curTime Current timestamp.
    /// @param serviceId Service Id.
    error RegistrationTimeout(uint256 deadline, uint256 curTime, uint256 serviceId);

    /// @dev Service termination block has been reached. Service is terminated.
    /// @param teminationBlock The termination block.
    /// @param curBlock Current block.
    /// @param serviceId Service Id.
    error ServiceTerminated(uint256 teminationBlock, uint256 curBlock, uint256 serviceId);

    /// @dev All the agent instance slots for a specific `serviceId` are filled.
    /// @param serviceId Service Id.
    error AgentInstancesSlotsFilled(uint256 serviceId);

    /// @dev Agent instances for a specific `serviceId` are not filled.
    /// @param actual Current number of agent instances.
    /// @param maxNumAgentInstances Maximum number of agent instances to be filled.
    /// @param serviceId Service Id.
    error AgentInstancesSlotsNotFilled(uint256 actual, uint256 maxNumAgentInstances, uint256 serviceId);

    /// @dev Failure of a transfer.
    /// @param token Address of a token.
    /// @param from Address `from`.
    /// @param to Address `to`.
    /// @param value Value.
    error TransferFailed(address token, address from, address to, uint256 value);

    /// @dev No existing lock value is found.
    /// @param addr Address that is checked for the locked value.
    error NoValueLocked(address addr);

    /// @dev Locked value is not zero.
    /// @param addr Address that is checked for the locked value.
    /// @param amount Locked amount.
    error LockedValueNotZero(address addr, int128 amount);

    /// @dev Value lock is expired.
    /// @param addr Address that is checked for the locked value.
    /// @param deadline The lock expiration deadline.
    /// @param curTime Current timestamp.
    error LockExpired(address addr, uint256 deadline, uint256 curTime);

    /// @dev Value lock is not expired.
    /// @param addr Address that is checked for the locked value.
    /// @param deadline The lock expiration deadline.
    /// @param curTime Current timestamp.
    error LockNotExpired(address addr, uint256 deadline, uint256 curTime);

    /// @dev Provided unlock time is incorrect.
    /// @param addr Address that is checked for the locked value.
    /// @param minUnlockTime Minimal unlock time that can be set.
    /// @param providedUnlockTime Provided unlock time.
    error UnlockTimeIncorrect(address addr, uint256 minUnlockTime, uint256 providedUnlockTime);

    /// @dev Provided unlock time is bigger than the maximum allowed.
    /// @param addr Address that is checked for the locked value.
    /// @param maxUnlockTime Max unlock time that can be set.
    /// @param providedUnlockTime Provided unlock time.
    error MaxUnlockTimeReached(address addr, uint256 maxUnlockTime, uint256 providedUnlockTime);

    /// @dev Provided block number is incorrect (has not been processed yet).
    /// @param providedBlockNumber Provided block number.
    /// @param actualBlockNumber Actual block number.
    error WrongBlockNumber(uint256 providedBlockNumber, uint256 actualBlockNumber);
}