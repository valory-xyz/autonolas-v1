## Sūrya's Description Report

### Files Description Table


|  File Name  |  SHA-1 Hash  |
|-------------|--------------|
| flatten.sol | 8597d54aaefee7fabef8bd8bc5e7614622bd7ef3 |


### Contracts Description Table


|  Contract  |         Type        |       Bases      |                  |                 |
|:----------:|:-------------------:|:----------------:|:----------------:|:---------------:|
|     └      |  **Function Name**  |  **Visibility**  |  **Mutability**  |  **Modifiers**  |
||||||
| **IVotes** | Interface |  |||
| └ | getVotes | External ❗️ |   |NO❗️ |
| └ | getPastVotes | External ❗️ |   |NO❗️ |
| └ | getPastTotalSupply | External ❗️ |   |NO❗️ |
| └ | delegates | External ❗️ |   |NO❗️ |
| └ | delegate | External ❗️ | 🛑  |NO❗️ |
| └ | delegateBySig | External ❗️ | 🛑  |NO❗️ |
||||||
| **IERC20** | Interface |  |||
| └ | totalSupply | External ❗️ |   |NO❗️ |
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | transfer | External ❗️ | 🛑  |NO❗️ |
| └ | allowance | External ❗️ |   |NO❗️ |
| └ | approve | External ❗️ | 🛑  |NO❗️ |
| └ | transferFrom | External ❗️ | 🛑  |NO❗️ |
||||||
| **IErrors** | Interface |  |||
||||||
| **ERC20VotesNonTransferable** | Implementation | IErrors, IVotes, IERC20 |||
| └ | transfer | External ❗️ | 🛑  |NO❗️ |
| └ | approve | External ❗️ | 🛑  |NO❗️ |
| └ | transferFrom | External ❗️ | 🛑  |NO❗️ |
| └ | allowance | External ❗️ |   |NO❗️ |
| └ | delegates | External ❗️ |   |NO❗️ |
| └ | delegate | External ❗️ | 🛑  |NO❗️ |
| └ | delegateBySig | External ❗️ | 🛑  |NO❗️ |
||||||
| **IERC721Receiver** | Interface |  |||
| └ | onERC721Received | External ❗️ | 🛑  |NO❗️ |
||||||
| **IERC165** | Interface |  |||
| └ | supportsInterface | External ❗️ |   |NO❗️ |
||||||
| **IERC1155Receiver** | Interface | IERC165 |||
| └ | onERC1155Received | External ❗️ | 🛑  |NO❗️ |
| └ | onERC1155BatchReceived | External ❗️ | 🛑  |NO❗️ |
||||||
| **Strings** | Library |  |||
| └ | toString | Internal 🔒 |   | |
| └ | toHexString | Internal 🔒 |   | |
| └ | toHexString | Internal 🔒 |   | |
||||||
| **ECDSA** | Library |  |||
| └ | _throwError | Private 🔐 |   | |
| └ | tryRecover | Internal 🔒 |   | |
| └ | recover | Internal 🔒 |   | |
| └ | tryRecover | Internal 🔒 |   | |
| └ | recover | Internal 🔒 |   | |
| └ | tryRecover | Internal 🔒 |   | |
| └ | recover | Internal 🔒 |   | |
| └ | toEthSignedMessageHash | Internal 🔒 |   | |
| └ | toEthSignedMessageHash | Internal 🔒 |   | |
| └ | toTypedDataHash | Internal 🔒 |   | |
||||||
| **EIP712** | Implementation |  |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | _domainSeparatorV4 | Internal 🔒 |   | |
| └ | _buildDomainSeparator | Private 🔐 |   | |
| └ | _hashTypedDataV4 | Internal 🔒 |   | |
||||||
| **ERC165** | Implementation | IERC165 |||
| └ | supportsInterface | Public ❗️ |   |NO❗️ |
||||||
| **SafeCast** | Library |  |||
| └ | toUint224 | Internal 🔒 |   | |
| └ | toUint128 | Internal 🔒 |   | |
| └ | toUint96 | Internal 🔒 |   | |
| └ | toUint64 | Internal 🔒 |   | |
| └ | toUint32 | Internal 🔒 |   | |
| └ | toUint16 | Internal 🔒 |   | |
| └ | toUint8 | Internal 🔒 |   | |
| └ | toUint256 | Internal 🔒 |   | |
| └ | toInt128 | Internal 🔒 |   | |
| └ | toInt64 | Internal 🔒 |   | |
| └ | toInt32 | Internal 🔒 |   | |
| └ | toInt16 | Internal 🔒 |   | |
| └ | toInt8 | Internal 🔒 |   | |
| └ | toInt256 | Internal 🔒 |   | |
||||||
| **DoubleEndedQueue** | Library |  |||
| └ | pushBack | Internal 🔒 | 🛑  | |
| └ | popBack | Internal 🔒 | 🛑  | |
| └ | pushFront | Internal 🔒 | 🛑  | |
| └ | popFront | Internal 🔒 | 🛑  | |
| └ | front | Internal 🔒 |   | |
| └ | back | Internal 🔒 |   | |
| └ | at | Internal 🔒 |   | |
| └ | clear | Internal 🔒 | 🛑  | |
| └ | length | Internal 🔒 |   | |
| └ | empty | Internal 🔒 |   | |
||||||
| **Address** | Library |  |||
| └ | isContract | Internal 🔒 |   | |
| └ | sendValue | Internal 🔒 | 🛑  | |
| └ | functionCall | Internal 🔒 | 🛑  | |
| └ | functionCall | Internal 🔒 | 🛑  | |
| └ | functionCallWithValue | Internal 🔒 | 🛑  | |
| └ | functionCallWithValue | Internal 🔒 | 🛑  | |
| └ | functionStaticCall | Internal 🔒 |   | |
| └ | functionStaticCall | Internal 🔒 |   | |
| └ | functionDelegateCall | Internal 🔒 | 🛑  | |
| └ | functionDelegateCall | Internal 🔒 | 🛑  | |
| └ | verifyCallResult | Internal 🔒 |   | |
||||||
| **Context** | Implementation |  |||
| └ | _msgSender | Internal 🔒 |   | |
| └ | _msgData | Internal 🔒 |   | |
||||||
| **Timers** | Library |  |||
| └ | getDeadline | Internal 🔒 |   | |
| └ | setDeadline | Internal 🔒 | 🛑  | |
| └ | reset | Internal 🔒 | 🛑  | |
| └ | isUnset | Internal 🔒 |   | |
| └ | isStarted | Internal 🔒 |   | |
| └ | isPending | Internal 🔒 |   | |
| └ | isExpired | Internal 🔒 |   | |
| └ | getDeadline | Internal 🔒 |   | |
| └ | setDeadline | Internal 🔒 | 🛑  | |
| └ | reset | Internal 🔒 | 🛑  | |
| └ | isUnset | Internal 🔒 |   | |
| └ | isStarted | Internal 🔒 |   | |
| └ | isPending | Internal 🔒 |   | |
| └ | isExpired | Internal 🔒 |   | |
||||||
| **IGovernor** | Implementation | IERC165 |||
| └ | name | Public ❗️ |   |NO❗️ |
| └ | version | Public ❗️ |   |NO❗️ |
| └ | COUNTING_MODE | Public ❗️ |   |NO❗️ |
| └ | hashProposal | Public ❗️ |   |NO❗️ |
| └ | state | Public ❗️ |   |NO❗️ |
| └ | proposalSnapshot | Public ❗️ |   |NO❗️ |
| └ | proposalDeadline | Public ❗️ |   |NO❗️ |
| └ | votingDelay | Public ❗️ |   |NO❗️ |
| └ | votingPeriod | Public ❗️ |   |NO❗️ |
| └ | quorum | Public ❗️ |   |NO❗️ |
| └ | getVotes | Public ❗️ |   |NO❗️ |
| └ | getVotesWithParams | Public ❗️ |   |NO❗️ |
| └ | hasVoted | Public ❗️ |   |NO❗️ |
| └ | propose | Public ❗️ | 🛑  |NO❗️ |
| └ | execute | Public ❗️ |  💵 |NO❗️ |
| └ | castVote | Public ❗️ | 🛑  |NO❗️ |
| └ | castVoteWithReason | Public ❗️ | 🛑  |NO❗️ |
| └ | castVoteWithReasonAndParams | Public ❗️ | 🛑  |NO❗️ |
| └ | castVoteBySig | Public ❗️ | 🛑  |NO❗️ |
| └ | castVoteWithReasonAndParamsBySig | Public ❗️ | 🛑  |NO❗️ |
||||||
| **Governor** | Implementation | Context, ERC165, EIP712, IGovernor, IERC721Receiver, IERC1155Receiver |||
| └ | <Constructor> | Public ❗️ | 🛑  | EIP712 |
| └ | <Receive Ether> | External ❗️ |  💵 |NO❗️ |
| └ | supportsInterface | Public ❗️ |   |NO❗️ |
| └ | name | Public ❗️ |   |NO❗️ |
| └ | version | Public ❗️ |   |NO❗️ |
| └ | hashProposal | Public ❗️ |   |NO❗️ |
| └ | state | Public ❗️ |   |NO❗️ |
| └ | proposalSnapshot | Public ❗️ |   |NO❗️ |
| └ | proposalDeadline | Public ❗️ |   |NO❗️ |
| └ | proposalThreshold | Public ❗️ |   |NO❗️ |
| └ | _quorumReached | Internal 🔒 |   | |
| └ | _voteSucceeded | Internal 🔒 |   | |
| └ | _getVotes | Internal 🔒 |   | |
| └ | _countVote | Internal 🔒 | 🛑  | |
| └ | _defaultParams | Internal 🔒 |   | |
| └ | propose | Public ❗️ | 🛑  |NO❗️ |
| └ | execute | Public ❗️ |  💵 |NO❗️ |
| └ | _execute | Internal 🔒 | 🛑  | |
| └ | _beforeExecute | Internal 🔒 | 🛑  | |
| └ | _afterExecute | Internal 🔒 | 🛑  | |
| └ | _cancel | Internal 🔒 | 🛑  | |
| └ | getVotes | Public ❗️ |   |NO❗️ |
| └ | getVotesWithParams | Public ❗️ |   |NO❗️ |
| └ | castVote | Public ❗️ | 🛑  |NO❗️ |
| └ | castVoteWithReason | Public ❗️ | 🛑  |NO❗️ |
| └ | castVoteWithReasonAndParams | Public ❗️ | 🛑  |NO❗️ |
| └ | castVoteBySig | Public ❗️ | 🛑  |NO❗️ |
| └ | castVoteWithReasonAndParamsBySig | Public ❗️ | 🛑  |NO❗️ |
| └ | _castVote | Internal 🔒 | 🛑  | |
| └ | _castVote | Internal 🔒 | 🛑  | |
| └ | relay | External ❗️ | 🛑  | onlyGovernance |
| └ | _executor | Internal 🔒 |   | |
| └ | onERC721Received | Public ❗️ | 🛑  |NO❗️ |
| └ | onERC1155Received | Public ❗️ | 🛑  |NO❗️ |
| └ | onERC1155BatchReceived | Public ❗️ | 🛑  |NO❗️ |
||||||
| **GovernorSettings** | Implementation | Governor |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | votingDelay | Public ❗️ |   |NO❗️ |
| └ | votingPeriod | Public ❗️ |   |NO❗️ |
| └ | proposalThreshold | Public ❗️ |   |NO❗️ |
| └ | setVotingDelay | Public ❗️ | 🛑  | onlyGovernance |
| └ | setVotingPeriod | Public ❗️ | 🛑  | onlyGovernance |
| └ | setProposalThreshold | Public ❗️ | 🛑  | onlyGovernance |
| └ | _setVotingDelay | Internal 🔒 | 🛑  | |
| └ | _setVotingPeriod | Internal 🔒 | 🛑  | |
| └ | _setProposalThreshold | Internal 🔒 | 🛑  | |
||||||
| **Counters** | Library |  |||
| └ | current | Internal 🔒 |   | |
| └ | increment | Internal 🔒 | 🛑  | |
| └ | decrement | Internal 🔒 | 🛑  | |
| └ | reset | Internal 🔒 | 🛑  | |
||||||
| **IGovernorTimelock** | Implementation | IGovernor |||
| └ | timelock | Public ❗️ |   |NO❗️ |
| └ | proposalEta | Public ❗️ |   |NO❗️ |
| └ | queue | Public ❗️ | 🛑  |NO❗️ |
||||||
| **IGovernorCompatibilityBravo** | Implementation | IGovernor |||
| └ | quorumVotes | Public ❗️ |   |NO❗️ |
| └ | proposals | Public ❗️ |   |NO❗️ |
| └ | propose | Public ❗️ | 🛑  |NO❗️ |
| └ | queue | Public ❗️ | 🛑  |NO❗️ |
| └ | execute | Public ❗️ |  💵 |NO❗️ |
| └ | cancel | Public ❗️ | 🛑  |NO❗️ |
| └ | getActions | Public ❗️ |   |NO❗️ |
| └ | getReceipt | Public ❗️ |   |NO❗️ |
||||||
| **GovernorCompatibilityBravo** | Implementation | IGovernorTimelock, IGovernorCompatibilityBravo, Governor |||
| └ | COUNTING_MODE | Public ❗️ |   |NO❗️ |
| └ | propose | Public ❗️ | 🛑  |NO❗️ |
| └ | propose | Public ❗️ | 🛑  |NO❗️ |
| └ | queue | Public ❗️ | 🛑  |NO❗️ |
| └ | execute | Public ❗️ |  💵 |NO❗️ |
| └ | cancel | Public ❗️ | 🛑  |NO❗️ |
| └ | _encodeCalldata | Private 🔐 |   | |
| └ | _storeProposal | Private 🔐 | 🛑  | |
| └ | proposals | Public ❗️ |   |NO❗️ |
| └ | getActions | Public ❗️ |   |NO❗️ |
| └ | getReceipt | Public ❗️ |   |NO❗️ |
| └ | quorumVotes | Public ❗️ |   |NO❗️ |
| └ | hasVoted | Public ❗️ |   |NO❗️ |
| └ | _quorumReached | Internal 🔒 |   | |
| └ | _voteSucceeded | Internal 🔒 |   | |
| └ | _countVote | Internal 🔒 | 🛑  | |
||||||
| **GovernorVotes** | Implementation | Governor |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | _getVotes | Internal 🔒 |   | |
||||||
| **GovernorVotesQuorumFraction** | Implementation | GovernorVotes |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | quorumNumerator | Public ❗️ |   |NO❗️ |
| └ | quorumDenominator | Public ❗️ |   |NO❗️ |
| └ | quorum | Public ❗️ |   |NO❗️ |
| └ | updateQuorumNumerator | External ❗️ | 🛑  | onlyGovernance |
| └ | _updateQuorumNumerator | Internal 🔒 | 🛑  | |
||||||
| **IAccessControl** | Interface |  |||
| └ | hasRole | External ❗️ |   |NO❗️ |
| └ | getRoleAdmin | External ❗️ |   |NO❗️ |
| └ | grantRole | External ❗️ | 🛑  |NO❗️ |
| └ | revokeRole | External ❗️ | 🛑  |NO❗️ |
| └ | renounceRole | External ❗️ | 🛑  |NO❗️ |
||||||
| **AccessControl** | Implementation | Context, IAccessControl, ERC165 |||
| └ | supportsInterface | Public ❗️ |   |NO❗️ |
| └ | hasRole | Public ❗️ |   |NO❗️ |
| └ | _checkRole | Internal 🔒 |   | |
| └ | _checkRole | Internal 🔒 |   | |
| └ | getRoleAdmin | Public ❗️ |   |NO❗️ |
| └ | grantRole | Public ❗️ | 🛑  | onlyRole |
| └ | revokeRole | Public ❗️ | 🛑  | onlyRole |
| └ | renounceRole | Public ❗️ | 🛑  |NO❗️ |
| └ | _setupRole | Internal 🔒 | 🛑  | |
| └ | _setRoleAdmin | Internal 🔒 | 🛑  | |
| └ | _grantRole | Internal 🔒 | 🛑  | |
| └ | _revokeRole | Internal 🔒 | 🛑  | |
||||||
| **TimelockController** | Implementation | AccessControl, IERC721Receiver, IERC1155Receiver |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | <Receive Ether> | External ❗️ |  💵 |NO❗️ |
| └ | supportsInterface | Public ❗️ |   |NO❗️ |
| └ | isOperation | Public ❗️ |   |NO❗️ |
| └ | isOperationPending | Public ❗️ |   |NO❗️ |
| └ | isOperationReady | Public ❗️ |   |NO❗️ |
| └ | isOperationDone | Public ❗️ |   |NO❗️ |
| └ | getTimestamp | Public ❗️ |   |NO❗️ |
| └ | getMinDelay | Public ❗️ |   |NO❗️ |
| └ | hashOperation | Public ❗️ |   |NO❗️ |
| └ | hashOperationBatch | Public ❗️ |   |NO❗️ |
| └ | schedule | Public ❗️ | 🛑  | onlyRole |
| └ | scheduleBatch | Public ❗️ | 🛑  | onlyRole |
| └ | _schedule | Private 🔐 | 🛑  | |
| └ | cancel | Public ❗️ | 🛑  | onlyRole |
| └ | execute | Public ❗️ |  💵 | onlyRoleOrOpenRole |
| └ | executeBatch | Public ❗️ |  💵 | onlyRoleOrOpenRole |
| └ | _beforeCall | Private 🔐 |   | |
| └ | _afterCall | Private 🔐 | 🛑  | |
| └ | _call | Private 🔐 | 🛑  | |
| └ | updateDelay | External ❗️ | 🛑  |NO❗️ |
| └ | onERC721Received | Public ❗️ | 🛑  |NO❗️ |
| └ | onERC1155Received | Public ❗️ | 🛑  |NO❗️ |
| └ | onERC1155BatchReceived | Public ❗️ | 🛑  |NO❗️ |
||||||
| **GovernorTimelockControl** | Implementation | IGovernorTimelock, Governor |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | supportsInterface | Public ❗️ |   |NO❗️ |
| └ | state | Public ❗️ |   |NO❗️ |
| └ | timelock | Public ❗️ |   |NO❗️ |
| └ | proposalEta | Public ❗️ |   |NO❗️ |
| └ | queue | Public ❗️ | 🛑  |NO❗️ |
| └ | _execute | Internal 🔒 | 🛑  | |
| └ | _cancel | Internal 🔒 | 🛑  | |
| └ | _executor | Internal 🔒 |   | |
| └ | updateTimelock | External ❗️ | 🛑  | onlyGovernance |
| └ | _updateTimelock | Private 🔐 | 🛑  | |
||||||
| **GovernorBravoOLA** | Implementation | Governor, GovernorSettings, GovernorCompatibilityBravo, GovernorVotes, GovernorVotesQuorumFraction, GovernorTimelockControl |||
| └ | <Constructor> | Public ❗️ | 🛑  | Governor GovernorSettings GovernorVotes GovernorVotesQuorumFraction GovernorTimelockControl |
| └ | state | Public ❗️ |   |NO❗️ |
| └ | propose | Public ❗️ | 🛑  |NO❗️ |
| └ | proposalThreshold | Public ❗️ |   |NO❗️ |
| └ | _execute | Internal 🔒 | 🛑  | |
| └ | _cancel | Internal 🔒 | 🛑  | |
| └ | _executor | Internal 🔒 |   | |
| └ | supportsInterface | Public ❗️ |   |NO❗️ |
||||||
| **Timelock** | Implementation | TimelockController |||
| └ | <Constructor> | Public ❗️ | 🛑  | TimelockController |
||||||
| **Ownable** | Implementation | Context |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | owner | Public ❗️ |   |NO❗️ |
| └ | renounceOwnership | Public ❗️ | 🛑  | onlyOwner |
| └ | transferOwnership | Public ❗️ | 🛑  | onlyOwner |
| └ | _transferOwnership | Internal 🔒 | 🛑  | |
||||||
| **IERC20Metadata** | Interface | IERC20 |||
| └ | name | External ❗️ |   |NO❗️ |
| └ | symbol | External ❗️ |   |NO❗️ |
| └ | decimals | External ❗️ |   |NO❗️ |
||||||
| **ERC20** | Implementation | Context, IERC20, IERC20Metadata |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | name | Public ❗️ |   |NO❗️ |
| └ | symbol | Public ❗️ |   |NO❗️ |
| └ | decimals | Public ❗️ |   |NO❗️ |
| └ | totalSupply | Public ❗️ |   |NO❗️ |
| └ | balanceOf | Public ❗️ |   |NO❗️ |
| └ | transfer | Public ❗️ | 🛑  |NO❗️ |
| └ | allowance | Public ❗️ |   |NO❗️ |
| └ | approve | Public ❗️ | 🛑  |NO❗️ |
| └ | transferFrom | Public ❗️ | 🛑  |NO❗️ |
| └ | increaseAllowance | Public ❗️ | 🛑  |NO❗️ |
| └ | decreaseAllowance | Public ❗️ | 🛑  |NO❗️ |
| └ | _transfer | Internal 🔒 | 🛑  | |
| └ | _mint | Internal 🔒 | 🛑  | |
| └ | _burn | Internal 🔒 | 🛑  | |
| └ | _approve | Internal 🔒 | 🛑  | |
| └ | _spendAllowance | Internal 🔒 | 🛑  | |
| └ | _beforeTokenTransfer | Internal 🔒 | 🛑  | |
| └ | _afterTokenTransfer | Internal 🔒 | 🛑  | |
||||||
| **SafeERC20** | Library |  |||
| └ | safeTransfer | Internal 🔒 | 🛑  | |
| └ | safeTransferFrom | Internal 🔒 | 🛑  | |
| └ | safeApprove | Internal 🔒 | 🛑  | |
| └ | safeIncreaseAllowance | Internal 🔒 | 🛑  | |
| └ | safeDecreaseAllowance | Internal 🔒 | 🛑  | |
| └ | _callOptionalReturn | Private 🔐 | 🛑  | |
||||||
| **ReentrancyGuard** | Implementation |  |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
||||||
| **IStructs** | Interface |  |||
||||||
| **VotingEscrow** | Implementation | IStructs, ReentrancyGuard, ERC20VotesNonTransferable |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | getLastUserPoint | External ❗️ |   |NO❗️ |
| └ | getNumUserPoints | External ❗️ |   |NO❗️ |
| └ | getUserPoint | External ❗️ |   |NO❗️ |
| └ | _checkpoint | Internal 🔒 | 🛑  | |
| └ | _depositFor | Internal 🔒 | 🛑  | |
| └ | checkpoint | External ❗️ | 🛑  |NO❗️ |
| └ | depositFor | External ❗️ | 🛑  | nonReentrant |
| └ | createLock | External ❗️ | 🛑  | nonReentrant |
| └ | increaseAmount | External ❗️ | 🛑  | nonReentrant |
| └ | increaseUnlockTime | External ❗️ | 🛑  | nonReentrant |
| └ | withdraw | External ❗️ | 🛑  | nonReentrant |
| └ | _findPointByBlock | Internal 🔒 |   | |
| └ | _balanceOfLocked | Internal 🔒 |   | |
| └ | balanceOf | Public ❗️ |   |NO❗️ |
| └ | lockedEnd | External ❗️ |   |NO❗️ |
| └ | balanceOfAt | External ❗️ |   |NO❗️ |
| └ | getVotes | Public ❗️ |   |NO❗️ |
| └ | _getBlockTime | Internal 🔒 |   | |
| └ | getPastVotes | Public ❗️ |   |NO❗️ |
| └ | _supplyLockedAt | Internal 🔒 |   | |
| └ | totalSupply | Public ❗️ |   |NO❗️ |
| └ | totalSupplyAt | External ❗️ |   |NO❗️ |
| └ | totalSupplyLockedAtT | Public ❗️ |   |NO❗️ |
| └ | totalSupplyLocked | Public ❗️ |   |NO❗️ |
| └ | getPastTotalSupply | Public ❗️ |   |NO❗️ |
||||||
| **IOLA** | Interface | IERC20 |||
| └ | mint | External ❗️ | 🛑  |NO❗️ |
| └ | timeLaunch | External ❗️ | 🛑  |NO❗️ |
| └ | inflationControl | External ❗️ |   |NO❗️ |
| └ | inflationRemainder | External ❗️ |   |NO❗️ |
| └ | decimals | External ❗️ |   |NO❗️ |
||||||
| **IERC721** | Interface | IERC165 |||
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | ownerOf | External ❗️ |   |NO❗️ |
| └ | safeTransferFrom | External ❗️ | 🛑  |NO❗️ |
| └ | safeTransferFrom | External ❗️ | 🛑  |NO❗️ |
| └ | transferFrom | External ❗️ | 🛑  |NO❗️ |
| └ | approve | External ❗️ | 🛑  |NO❗️ |
| └ | setApprovalForAll | External ❗️ | 🛑  |NO❗️ |
| └ | getApproved | External ❗️ |   |NO❗️ |
| └ | isApprovedForAll | External ❗️ |   |NO❗️ |
||||||
| **IERC721Enumerable** | Interface | IERC721 |||
| └ | totalSupply | External ❗️ |   |NO❗️ |
| └ | tokenOfOwnerByIndex | External ❗️ |   |NO❗️ |
| └ | tokenByIndex | External ❗️ |   |NO❗️ |
||||||
| **IRegistry** | Interface | IStructs, IERC721Enumerable |||
| └ | create | External ❗️ | 🛑  |NO❗️ |
| └ | updateHash | External ❗️ | 🛑  |NO❗️ |
| └ | exists | External ❗️ |   |NO❗️ |
| └ | getInfo | External ❗️ |   |NO❗️ |
| └ | getDependencies | External ❗️ |   |NO❗️ |
| └ | getHashes | External ❗️ |   |NO❗️ |
| └ | getBaseURI | External ❗️ |   |NO❗️ |
| └ | setBaseURI | External ❗️ | 🛑  |NO❗️ |
||||||
| **IService** | Interface | IStructs |||
| └ | createService | External ❗️ | 🛑  |NO❗️ |
| └ | update | External ❗️ | 🛑  |NO❗️ |
| └ | activateRegistration | External ❗️ |  💵 |NO❗️ |
| └ | registerAgents | External ❗️ |  💵 |NO❗️ |
| └ | deploy | External ❗️ | 🛑  |NO❗️ |
| └ | terminate | External ❗️ | 🛑  |NO❗️ |
| └ | unbond | External ❗️ | 🛑  |NO❗️ |
| └ | destroy | External ❗️ | 🛑  |NO❗️ |
| └ | exists | External ❗️ |   |NO❗️ |
| └ | getServiceIdsCreatedWithAgentId | External ❗️ |   |NO❗️ |
| └ | getServiceIdsCreatedWithComponentId | External ❗️ |   |NO❗️ |
| └ | getAgentIdsOfServiceId | External ❗️ |   |NO❗️ |
| └ | getComponentIdsOfServiceId | External ❗️ |   |NO❗️ |
||||||
| **ITokenomics** | Interface | IStructs |||
| └ | getCurrentEpoch | External ❗️ |   |NO❗️ |
| └ | effectiveBond | External ❗️ |   |NO❗️ |
| └ | epochLen | External ❗️ |   |NO❗️ |
| └ | getDF | External ❗️ |   |NO❗️ |
| └ | getPoint | External ❗️ |   |NO❗️ |
| └ | getLastPoint | External ❗️ |   |NO❗️ |
| └ | calculatePayoutFromLP | External ❗️ | 🛑  |NO❗️ |
| └ | trackServicesETHRevenue | External ❗️ | 🛑  |NO❗️ |
| └ | checkpoint | External ❗️ | 🛑  |NO❗️ |
| └ | getExchangeAmountOLA | External ❗️ | 🛑  |NO❗️ |
| └ | getProfitableComponents | External ❗️ |   |NO❗️ |
| └ | getProfitableAgents | External ❗️ |   |NO❗️ |
| └ | usedBond | External ❗️ | 🛑  |NO❗️ |
| └ | allowedNewBond | External ❗️ | 🛑  |NO❗️ |
| └ | accountOwnerRewards | External ❗️ | 🛑  |NO❗️ |
| └ | calculateStakingRewards | External ❗️ |   |NO❗️ |
| └ | isAllowedMint | External ❗️ | 🛑  |NO❗️ |
||||||
| **IProxy** | Interface |  |||
| └ | masterCopy | External ❗️ |   |NO❗️ |
||||||
| **GnosisSafeProxy** | Implementation |  |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | <Fallback> | External ❗️ |  💵 |NO❗️ |
||||||
| **IProxyCreationCallback** | Interface |  |||
| └ | proxyCreated | External ❗️ | 🛑  |NO❗️ |
||||||
| **GnosisSafeProxyFactory** | Implementation |  |||
| └ | createProxy | Public ❗️ | 🛑  |NO❗️ |
| └ | proxyRuntimeCode | Public ❗️ |   |NO❗️ |
| └ | proxyCreationCode | Public ❗️ |   |NO❗️ |
| └ | deployProxyWithNonce | Internal 🔒 | 🛑  | |
| └ | createProxyWithNonce | Public ❗️ | 🛑  |NO❗️ |
| └ | createProxyWithCallback | Public ❗️ | 🛑  |NO❗️ |
| └ | calculateCreateProxyWithNonceAddress | External ❗️ | 🛑  |NO❗️ |
||||||
| **GnosisSafeMultisig** | Implementation |  |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | _parseData | Internal 🔒 |   | |
| └ | create | External ❗️ | 🛑  |NO❗️ |
||||||
| **IERC721Metadata** | Interface | IERC721 |||
| └ | name | External ❗️ |   |NO❗️ |
| └ | symbol | External ❗️ |   |NO❗️ |
| └ | tokenURI | External ❗️ |   |NO❗️ |
||||||
| **ERC721** | Implementation | Context, ERC165, IERC721, IERC721Metadata |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | supportsInterface | Public ❗️ |   |NO❗️ |
| └ | balanceOf | Public ❗️ |   |NO❗️ |
| └ | ownerOf | Public ❗️ |   |NO❗️ |
| └ | name | Public ❗️ |   |NO❗️ |
| └ | symbol | Public ❗️ |   |NO❗️ |
| └ | tokenURI | Public ❗️ |   |NO❗️ |
| └ | _baseURI | Internal 🔒 |   | |
| └ | approve | Public ❗️ | 🛑  |NO❗️ |
| └ | getApproved | Public ❗️ |   |NO❗️ |
| └ | setApprovalForAll | Public ❗️ | 🛑  |NO❗️ |
| └ | isApprovedForAll | Public ❗️ |   |NO❗️ |
| └ | transferFrom | Public ❗️ | 🛑  |NO❗️ |
| └ | safeTransferFrom | Public ❗️ | 🛑  |NO❗️ |
| └ | safeTransferFrom | Public ❗️ | 🛑  |NO❗️ |
| └ | _safeTransfer | Internal 🔒 | 🛑  | |
| └ | _exists | Internal 🔒 |   | |
| └ | _isApprovedOrOwner | Internal 🔒 |   | |
| └ | _safeMint | Internal 🔒 | 🛑  | |
| └ | _safeMint | Internal 🔒 | 🛑  | |
| └ | _mint | Internal 🔒 | 🛑  | |
| └ | _burn | Internal 🔒 | 🛑  | |
| └ | _transfer | Internal 🔒 | 🛑  | |
| └ | _approve | Internal 🔒 | 🛑  | |
| └ | _setApprovalForAll | Internal 🔒 | 🛑  | |
| └ | _checkOnERC721Received | Private 🔐 | 🛑  | |
| └ | _beforeTokenTransfer | Internal 🔒 | 🛑  | |
| └ | _afterTokenTransfer | Internal 🔒 | 🛑  | |
||||||
| **ERC721Enumerable** | Implementation | ERC721, IERC721Enumerable |||
| └ | supportsInterface | Public ❗️ |   |NO❗️ |
| └ | tokenOfOwnerByIndex | Public ❗️ |   |NO❗️ |
| └ | totalSupply | Public ❗️ |   |NO❗️ |
| └ | tokenByIndex | Public ❗️ |   |NO❗️ |
| └ | _beforeTokenTransfer | Internal 🔒 | 🛑  | |
| └ | _addTokenToOwnerEnumeration | Private 🔐 | 🛑  | |
| └ | _addTokenToAllTokensEnumeration | Private 🔐 | 🛑  | |
| └ | _removeTokenFromOwnerEnumeration | Private 🔐 | 🛑  | |
| └ | _removeTokenFromAllTokensEnumeration | Private 🔐 | 🛑  | |
||||||
| **AgentRegistry** | Implementation | IErrors, IStructs, ERC721Enumerable, Ownable, ReentrancyGuard |||
| └ | <Constructor> | Public ❗️ | 🛑  | ERC721 |
| └ | changeManager | Public ❗️ | 🛑  | onlyOwner |
| └ | _setAgentInfo | Private 🔐 | 🛑  | |
| └ | create | External ❗️ | 🛑  | onlyManager checkHash nonReentrant |
| └ | updateHash | External ❗️ | 🛑  | onlyManager checkHash |
| └ | exists | Public ❗️ |   |NO❗️ |
| └ | getInfo | Public ❗️ |   |NO❗️ |
| └ | getDependencies | Public ❗️ |   |NO❗️ |
| └ | getHashes | Public ❗️ |   |NO❗️ |
| └ | _baseURI | Internal 🔒 |   | |
| └ | getBaseURI | Public ❗️ |   |NO❗️ |
| └ | setBaseURI | Public ❗️ | 🛑  | onlyOwner |
||||||
| **ComponentRegistry** | Implementation | IErrors, IStructs, ERC721Enumerable, Ownable, ReentrancyGuard |||
| └ | <Constructor> | Public ❗️ | 🛑  | ERC721 |
| └ | changeManager | Public ❗️ | 🛑  | onlyOwner |
| └ | _setComponentInfo | Private 🔐 | 🛑  | |
| └ | create | External ❗️ | 🛑  | onlyManager checkHash nonReentrant |
| └ | updateHash | External ❗️ | 🛑  | onlyManager checkHash |
| └ | exists | Public ❗️ |   |NO❗️ |
| └ | getInfo | Public ❗️ |   |NO❗️ |
| └ | getDependencies | Public ❗️ |   |NO❗️ |
| └ | getHashes | Public ❗️ |   |NO❗️ |
| └ | _baseURI | Internal 🔒 |   | |
| └ | getBaseURI | Public ❗️ |   |NO❗️ |
| └ | setBaseURI | Public ❗️ | 🛑  | onlyOwner |
||||||
| **Pausable** | Implementation | Context |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | paused | Public ❗️ |   |NO❗️ |
| └ | _pause | Internal 🔒 | 🛑  | whenNotPaused |
| └ | _unpause | Internal 🔒 | 🛑  | whenPaused |
||||||
| **RegistriesManager** | Implementation | IStructs, Ownable, Pausable |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | mintAgent | External ❗️ | 🛑  | whenNotPaused |
| └ | updateAgentHash | External ❗️ | 🛑  |NO❗️ |
| └ | mintComponent | External ❗️ | 🛑  | whenNotPaused |
| └ | updateComponentHash | External ❗️ | 🛑  |NO❗️ |
| └ | pause | External ❗️ | 🛑  | onlyOwner |
| └ | unpause | External ❗️ | 🛑  | onlyOwner |
||||||
| **ITreasury** | Interface |  |||
| └ | depositTokenForOLA | External ❗️ | 🛑  |NO❗️ |
| └ | depositETHFromServices | External ❗️ |  💵 |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | enableToken | External ❗️ | 🛑  |NO❗️ |
| └ | disableToken | External ❗️ | 🛑  |NO❗️ |
| └ | isEnabled | External ❗️ |   |NO❗️ |
| └ | checkPair | External ❗️ | 🛑  |NO❗️ |
| └ | requestFunds | External ❗️ | 🛑  |NO❗️ |
| └ | allocateRewards | External ❗️ | 🛑  |NO❗️ |
||||||
| **ServiceManager** | Implementation | IErrors, IStructs, Ownable, Pausable |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | <Fallback> | External ❗️ |  💵 |NO❗️ |
| └ | <Receive Ether> | External ❗️ |  💵 |NO❗️ |
| └ | changeTreasury | External ❗️ | 🛑  | onlyOwner |
| └ | serviceCreate | External ❗️ | 🛑  | whenNotPaused |
| └ | serviceUpdate | External ❗️ | 🛑  |NO❗️ |
| └ | serviceActivateRegistration | External ❗️ |  💵 |NO❗️ |
| └ | serviceRegisterAgents | External ❗️ |  💵 |NO❗️ |
| └ | serviceDeploy | External ❗️ | 🛑  |NO❗️ |
| └ | serviceTerminate | External ❗️ | 🛑  |NO❗️ |
| └ | serviceUnbond | External ❗️ | 🛑  |NO❗️ |
| └ | serviceDestroy | External ❗️ | 🛑  |NO❗️ |
| └ | serviceReward | External ❗️ |  💵 |NO❗️ |
| └ | pause | External ❗️ | 🛑  | onlyOwner |
| └ | unpause | External ❗️ | 🛑  | onlyOwner |
||||||
| **IMultisig** | Interface |  |||
| └ | create | External ❗️ | 🛑  |NO❗️ |
||||||
| **ServiceRegistry** | Implementation | IErrors, IStructs, Ownable, ERC721Enumerable, ReentrancyGuard |||
| └ | <Constructor> | Public ❗️ | 🛑  | ERC721 |
| └ | <Fallback> | External ❗️ |  💵 |NO❗️ |
| └ | <Receive Ether> | External ❗️ |  💵 |NO❗️ |
| └ | changeManager | Public ❗️ | 🛑  | onlyOwner |
| └ | _initialChecks | Private 🔐 |   | |
| └ | _setServiceData | Private 🔐 | 🛑  | |
| └ | createService | External ❗️ | 🛑  | onlyManager |
| └ | update | External ❗️ | 🛑  | onlyManager onlyServiceOwner |
| └ | activateRegistration | External ❗️ |  💵 | onlyManager onlyServiceOwner nonReentrant |
| └ | registerAgents | External ❗️ |  💵 | onlyManager nonReentrant |
| └ | deploy | External ❗️ | 🛑  | onlyManager onlyServiceOwner |
| └ | slash | Public ❗️ | 🛑  | serviceExists |
| └ | terminate | External ❗️ | 🛑  | onlyManager onlyServiceOwner nonReentrant |
| └ | unbond | External ❗️ | 🛑  | onlyManager nonReentrant |
| └ | destroy | External ❗️ | 🛑  | onlyManager onlyServiceOwner |
| └ | _getAgentInstances | Private 🔐 |   | |
| └ | _updateServiceComponentAgentConnection | Private 🔐 | 🛑  | |
| └ | exists | Public ❗️ |   |NO❗️ |
| └ | getServiceInfo | Public ❗️ |   | serviceExists |
| └ | getInstancesForAgentId | Public ❗️ |   | serviceExists |
| └ | getConfigHashes | Public ❗️ |   | serviceExists |
| └ | getAgentIdsOfServiceId | External ❗️ |   |NO❗️ |
| └ | getComponentIdsOfServiceId | External ❗️ |   |NO❗️ |
| └ | getServiceState | Public ❗️ |   |NO❗️ |
| └ | getOperatorBalance | Public ❗️ |   | serviceExists |
| └ | changeMultisigPermission | Public ❗️ | 🛑  | onlyOwner |
||||||
| **ERC20Token** | Implementation | ERC20, Ownable |||
| └ | <Constructor> | Public ❗️ | 🛑  | ERC20 |
| └ | mint | Public ❗️ | 🛑  | onlyOwner |
||||||
| **Enum** | Implementation |  |||
||||||
| **SelfAuthorized** | Implementation |  |||
| └ | requireSelfCall | Private 🔐 |   | |
||||||
| **Executor** | Implementation |  |||
| └ | execute | Internal 🔒 | 🛑  | |
||||||
| **ModuleManager** | Implementation | SelfAuthorized, Executor |||
| └ | setupModules | Internal 🔒 | 🛑  | |
| └ | enableModule | Public ❗️ | 🛑  | authorized |
| └ | disableModule | Public ❗️ | 🛑  | authorized |
| └ | execTransactionFromModule | Public ❗️ | 🛑  |NO❗️ |
| └ | execTransactionFromModuleReturnData | Public ❗️ | 🛑  |NO❗️ |
| └ | isModuleEnabled | Public ❗️ |   |NO❗️ |
| └ | getModulesPaginated | External ❗️ |   |NO❗️ |
||||||
| **OwnerManager** | Implementation | SelfAuthorized |||
| └ | setupOwners | Internal 🔒 | 🛑  | |
| └ | addOwnerWithThreshold | Public ❗️ | 🛑  | authorized |
| └ | removeOwner | Public ❗️ | 🛑  | authorized |
| └ | swapOwner | Public ❗️ | 🛑  | authorized |
| └ | changeThreshold | Public ❗️ | 🛑  | authorized |
| └ | getThreshold | Public ❗️ |   |NO❗️ |
| └ | isOwner | Public ❗️ |   |NO❗️ |
| └ | getOwners | Public ❗️ |   |NO❗️ |
||||||
| **FallbackManager** | Implementation | SelfAuthorized |||
| └ | internalSetFallbackHandler | Internal 🔒 | 🛑  | |
| └ | setFallbackHandler | Public ❗️ | 🛑  | authorized |
| └ | <Fallback> | External ❗️ | 🛑  |NO❗️ |
||||||
| **Guard** | Interface |  |||
| └ | checkTransaction | External ❗️ | 🛑  |NO❗️ |
| └ | checkAfterExecution | External ❗️ | 🛑  |NO❗️ |
||||||
| **GuardManager** | Implementation | SelfAuthorized |||
| └ | setGuard | External ❗️ | 🛑  | authorized |
| └ | getGuard | Internal 🔒 |   | |
||||||
| **EtherPaymentFallback** | Implementation |  |||
| └ | <Receive Ether> | External ❗️ |  💵 |NO❗️ |
||||||
| **Singleton** | Implementation |  |||
||||||
| **SignatureDecoder** | Implementation |  |||
| └ | signatureSplit | Internal 🔒 |   | |
||||||
| **SecuredTokenTransfer** | Implementation |  |||
| └ | transferToken | Internal 🔒 | 🛑  | |
||||||
| **StorageAccessible** | Implementation |  |||
| └ | getStorageAt | Public ❗️ |   |NO❗️ |
| └ | simulateAndRevert | External ❗️ | 🛑  |NO❗️ |
||||||
| **ISignatureValidatorConstants** | Implementation |  |||
||||||
| **ISignatureValidator** | Implementation | ISignatureValidatorConstants |||
| └ | isValidSignature | Public ❗️ |   |NO❗️ |
||||||
| **GnosisSafeMath** | Library |  |||
| └ | mul | Internal 🔒 |   | |
| └ | sub | Internal 🔒 |   | |
| └ | add | Internal 🔒 |   | |
| └ | max | Internal 🔒 |   | |
||||||
| **GnosisSafe** | Implementation | EtherPaymentFallback, Singleton, ModuleManager, OwnerManager, SignatureDecoder, SecuredTokenTransfer, ISignatureValidatorConstants, FallbackManager, StorageAccessible, GuardManager |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | setup | External ❗️ | 🛑  |NO❗️ |
| └ | execTransaction | Public ❗️ |  💵 |NO❗️ |
| └ | handlePayment | Private 🔐 | 🛑  | |
| └ | checkSignatures | Public ❗️ |   |NO❗️ |
| └ | checkNSignatures | Public ❗️ |   |NO❗️ |
| └ | requiredTxGas | External ❗️ | 🛑  |NO❗️ |
| └ | approveHash | External ❗️ | 🛑  |NO❗️ |
| └ | getChainId | Public ❗️ |   |NO❗️ |
| └ | domainSeparator | Public ❗️ |   |NO❗️ |
| └ | encodeTransactionData | Public ❗️ |   |NO❗️ |
| └ | getTransactionHash | Public ❗️ |   |NO❗️ |
||||||
| **GnosisSafeL2** | Implementation | GnosisSafe |||
| └ | execTransaction | Public ❗️ |  💵 |NO❗️ |
| └ | execTransactionFromModule | Public ❗️ | 🛑  |NO❗️ |
||||||
| **TestServiceRegistry** | Implementation | ServiceRegistry |||
| └ | <Constructor> | Public ❗️ | 🛑  | ServiceRegistry |
| └ | createCheckSafe | Public ❗️ | 🛑  |NO❗️ |
| └ | executeByGovernor | External ❗️ | 🛑  | onlyManager |
| └ | getControlValue | Public ❗️ |   |NO❗️ |
||||||
| **WETH9** | Implementation |  |||
| └ | <Fallback> | External ❗️ |  💵 |NO❗️ |
| └ | deposit | Public ❗️ |  💵 |NO❗️ |
| └ | withdraw | Public ❗️ | 🛑  |NO❗️ |
| └ | totalSupply | Public ❗️ |   |NO❗️ |
| └ | approve | Public ❗️ | 🛑  |NO❗️ |
| └ | transfer | Public ❗️ | 🛑  |NO❗️ |
| └ | transferFrom | Public ❗️ | 🛑  |NO❗️ |
||||||
| **IUniswapV2Factory** | Interface |  |||
| └ | feeTo | External ❗️ |   |NO❗️ |
| └ | feeToSetter | External ❗️ |   |NO❗️ |
| └ | getPair | External ❗️ |   |NO❗️ |
| └ | allPairs | External ❗️ |   |NO❗️ |
| └ | allPairsLength | External ❗️ |   |NO❗️ |
| └ | createPair | External ❗️ | 🛑  |NO❗️ |
| └ | setFeeTo | External ❗️ | 🛑  |NO❗️ |
| └ | setFeeToSetter | External ❗️ | 🛑  |NO❗️ |
||||||
| **IUniswapV2Pair** | Interface |  |||
| └ | name | External ❗️ |   |NO❗️ |
| └ | symbol | External ❗️ |   |NO❗️ |
| └ | decimals | External ❗️ |   |NO❗️ |
| └ | totalSupply | External ❗️ |   |NO❗️ |
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | allowance | External ❗️ |   |NO❗️ |
| └ | approve | External ❗️ | 🛑  |NO❗️ |
| └ | transfer | External ❗️ | 🛑  |NO❗️ |
| └ | transferFrom | External ❗️ | 🛑  |NO❗️ |
| └ | DOMAIN_SEPARATOR | External ❗️ |   |NO❗️ |
| └ | PERMIT_TYPEHASH | External ❗️ |   |NO❗️ |
| └ | nonces | External ❗️ |   |NO❗️ |
| └ | permit | External ❗️ | 🛑  |NO❗️ |
| └ | MINIMUM_LIQUIDITY | External ❗️ |   |NO❗️ |
| └ | factory | External ❗️ |   |NO❗️ |
| └ | token0 | External ❗️ |   |NO❗️ |
| └ | token1 | External ❗️ |   |NO❗️ |
| └ | getReserves | External ❗️ |   |NO❗️ |
| └ | price0CumulativeLast | External ❗️ |   |NO❗️ |
| └ | price1CumulativeLast | External ❗️ |   |NO❗️ |
| └ | kLast | External ❗️ |   |NO❗️ |
| └ | mint | External ❗️ | 🛑  |NO❗️ |
| └ | burn | External ❗️ | 🛑  |NO❗️ |
| └ | swap | External ❗️ | 🛑  |NO❗️ |
| └ | skim | External ❗️ | 🛑  |NO❗️ |
| └ | sync | External ❗️ | 🛑  |NO❗️ |
| └ | initialize | External ❗️ | 🛑  |NO❗️ |
||||||
| **IUniswapV2ERC20** | Interface |  |||
| └ | name | External ❗️ |   |NO❗️ |
| └ | symbol | External ❗️ |   |NO❗️ |
| └ | decimals | External ❗️ |   |NO❗️ |
| └ | totalSupply | External ❗️ |   |NO❗️ |
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | allowance | External ❗️ |   |NO❗️ |
| └ | approve | External ❗️ | 🛑  |NO❗️ |
| └ | transfer | External ❗️ | 🛑  |NO❗️ |
| └ | transferFrom | External ❗️ | 🛑  |NO❗️ |
| └ | DOMAIN_SEPARATOR | External ❗️ |   |NO❗️ |
| └ | PERMIT_TYPEHASH | External ❗️ |   |NO❗️ |
| └ | nonces | External ❗️ |   |NO❗️ |
| └ | permit | External ❗️ | 🛑  |NO❗️ |
||||||
| **SafeMath** | Library |  |||
| └ | add | Internal 🔒 |   | |
| └ | sub | Internal 🔒 |   | |
| └ | mul | Internal 🔒 |   | |
||||||
| **UniswapV2ERC20** | Implementation | IUniswapV2ERC20 |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | _mint | Internal 🔒 | 🛑  | |
| └ | _burn | Internal 🔒 | 🛑  | |
| └ | _approve | Private 🔐 | 🛑  | |
| └ | _transfer | Private 🔐 | 🛑  | |
| └ | approve | External ❗️ | 🛑  |NO❗️ |
| └ | transfer | External ❗️ | 🛑  |NO❗️ |
| └ | transferFrom | External ❗️ | 🛑  |NO❗️ |
| └ | permit | External ❗️ | 🛑  |NO❗️ |
||||||
| **Math** | Library |  |||
| └ | min | Internal 🔒 |   | |
| └ | sqrt | Internal 🔒 |   | |
||||||
| **UQ112x112** | Library |  |||
| └ | encode | Internal 🔒 |   | |
| └ | uqdiv | Internal 🔒 |   | |
||||||
| **IERC20** | Interface |  |||
| └ | name | External ❗️ |   |NO❗️ |
| └ | symbol | External ❗️ |   |NO❗️ |
| └ | decimals | External ❗️ |   |NO❗️ |
| └ | totalSupply | External ❗️ |   |NO❗️ |
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | allowance | External ❗️ |   |NO❗️ |
| └ | approve | External ❗️ | 🛑  |NO❗️ |
| └ | transfer | External ❗️ | 🛑  |NO❗️ |
| └ | transferFrom | External ❗️ | 🛑  |NO❗️ |
||||||
| **IUniswapV2Callee** | Interface |  |||
| └ | uniswapV2Call | External ❗️ | 🛑  |NO❗️ |
||||||
| **UniswapV2Pair** | Implementation | IUniswapV2Pair, UniswapV2ERC20 |||
| └ | getReserves | Public ❗️ |   |NO❗️ |
| └ | _safeTransfer | Private 🔐 | 🛑  | |
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | initialize | External ❗️ | 🛑  |NO❗️ |
| └ | _update | Private 🔐 | 🛑  | |
| └ | _mintFee | Private 🔐 | 🛑  | |
| └ | mint | External ❗️ | 🛑  | lock |
| └ | burn | External ❗️ | 🛑  | lock |
| └ | swap | External ❗️ | 🛑  | lock |
| └ | skim | External ❗️ | 🛑  | lock |
| └ | sync | External ❗️ | 🛑  | lock |
||||||
| **UniswapV2Factory** | Implementation | IUniswapV2Factory |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | allPairsLength | External ❗️ |   |NO❗️ |
| └ | createPair | External ❗️ | 🛑  |NO❗️ |
| └ | setFeeTo | External ❗️ | 🛑  |NO❗️ |
| └ | setFeeToSetter | External ❗️ | 🛑  |NO❗️ |
||||||
| **TransferHelper** | Library |  |||
| └ | safeApprove | Internal 🔒 | 🛑  | |
| └ | safeTransfer | Internal 🔒 | 🛑  | |
| └ | safeTransferFrom | Internal 🔒 | 🛑  | |
| └ | safeTransferETH | Internal 🔒 | 🛑  | |
||||||
| **IUniswapV2Router01** | Interface |  |||
| └ | factory | External ❗️ |   |NO❗️ |
| └ | WETH | External ❗️ |   |NO❗️ |
| └ | addLiquidity | External ❗️ | 🛑  |NO❗️ |
| └ | addLiquidityETH | External ❗️ |  💵 |NO❗️ |
| └ | removeLiquidity | External ❗️ | 🛑  |NO❗️ |
| └ | removeLiquidityETH | External ❗️ | 🛑  |NO❗️ |
| └ | removeLiquidityWithPermit | External ❗️ | 🛑  |NO❗️ |
| └ | removeLiquidityETHWithPermit | External ❗️ | 🛑  |NO❗️ |
| └ | swapExactTokensForTokens | External ❗️ | 🛑  |NO❗️ |
| └ | swapTokensForExactTokens | External ❗️ | 🛑  |NO❗️ |
| └ | swapExactETHForTokens | External ❗️ |  💵 |NO❗️ |
| └ | swapTokensForExactETH | External ❗️ | 🛑  |NO❗️ |
| └ | swapExactTokensForETH | External ❗️ | 🛑  |NO❗️ |
| └ | swapETHForExactTokens | External ❗️ |  💵 |NO❗️ |
| └ | quote | External ❗️ |   |NO❗️ |
| └ | getAmountOut | External ❗️ |   |NO❗️ |
| └ | getAmountIn | External ❗️ |   |NO❗️ |
| └ | getAmountsOut | External ❗️ |   |NO❗️ |
| └ | getAmountsIn | External ❗️ |   |NO❗️ |
||||||
| **IUniswapV2Router02** | Interface | IUniswapV2Router01 |||
| └ | removeLiquidityETHSupportingFeeOnTransferTokens | External ❗️ | 🛑  |NO❗️ |
| └ | removeLiquidityETHWithPermitSupportingFeeOnTransferTokens | External ❗️ | 🛑  |NO❗️ |
| └ | swapExactTokensForTokensSupportingFeeOnTransferTokens | External ❗️ | 🛑  |NO❗️ |
| └ | swapExactETHForTokensSupportingFeeOnTransferTokens | External ❗️ |  💵 |NO❗️ |
| └ | swapExactTokensForETHSupportingFeeOnTransferTokens | External ❗️ | 🛑  |NO❗️ |
||||||
| **SafeMath** | Library |  |||
| └ | add | Internal 🔒 |   | |
| └ | sub | Internal 🔒 |   | |
| └ | mul | Internal 🔒 |   | |
||||||
| **UniswapV2Library** | Library |  |||
| └ | sortTokens | Internal 🔒 |   | |
| └ | pairFor | Internal 🔒 |   | |
| └ | getReserves | Internal 🔒 |   | |
| └ | quote | Internal 🔒 |   | |
| └ | getAmountOut | Internal 🔒 |   | |
| └ | getAmountIn | Internal 🔒 |   | |
| └ | getAmountsOut | Internal 🔒 |   | |
| └ | getAmountsIn | Internal 🔒 |   | |
||||||
| **IERC20** | Interface |  |||
| └ | name | External ❗️ |   |NO❗️ |
| └ | symbol | External ❗️ |   |NO❗️ |
| └ | decimals | External ❗️ |   |NO❗️ |
| └ | totalSupply | External ❗️ |   |NO❗️ |
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | allowance | External ❗️ |   |NO❗️ |
| └ | approve | External ❗️ | 🛑  |NO❗️ |
| └ | transfer | External ❗️ | 🛑  |NO❗️ |
| └ | transferFrom | External ❗️ | 🛑  |NO❗️ |
||||||
| **IWETH** | Interface |  |||
| └ | deposit | External ❗️ |  💵 |NO❗️ |
| └ | transfer | External ❗️ | 🛑  |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
||||||
| **UniswapV2Router02** | Implementation | IUniswapV2Router02 |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | <Receive Ether> | External ❗️ |  💵 |NO❗️ |
| └ | _addLiquidity | Internal 🔒 | 🛑  | |
| └ | addLiquidity | External ❗️ | 🛑  | ensure |
| └ | addLiquidityETH | External ❗️ |  💵 | ensure |
| └ | removeLiquidity | Public ❗️ | 🛑  | ensure |
| └ | removeLiquidityETH | Public ❗️ | 🛑  | ensure |
| └ | removeLiquidityWithPermit | External ❗️ | 🛑  |NO❗️ |
| └ | removeLiquidityETHWithPermit | External ❗️ | 🛑  |NO❗️ |
| └ | removeLiquidityETHSupportingFeeOnTransferTokens | Public ❗️ | 🛑  | ensure |
| └ | removeLiquidityETHWithPermitSupportingFeeOnTransferTokens | External ❗️ | 🛑  |NO❗️ |
| └ | _swap | Internal 🔒 | 🛑  | |
| └ | swapExactTokensForTokens | External ❗️ | 🛑  | ensure |
| └ | swapTokensForExactTokens | External ❗️ | 🛑  | ensure |
| └ | swapExactETHForTokens | External ❗️ |  💵 | ensure |
| └ | swapTokensForExactETH | External ❗️ | 🛑  | ensure |
| └ | swapExactTokensForETH | External ❗️ | 🛑  | ensure |
| └ | swapETHForExactTokens | External ❗️ |  💵 | ensure |
| └ | _swapSupportingFeeOnTransferTokens | Internal 🔒 | 🛑  | |
| └ | swapExactTokensForTokensSupportingFeeOnTransferTokens | External ❗️ | 🛑  | ensure |
| └ | swapExactETHForTokensSupportingFeeOnTransferTokens | External ❗️ |  💵 | ensure |
| └ | swapExactTokensForETHSupportingFeeOnTransferTokens | External ❗️ | 🛑  | ensure |
| └ | quote | Public ❗️ |   |NO❗️ |
| └ | getAmountOut | Public ❗️ |   |NO❗️ |
| └ | getAmountIn | Public ❗️ |   |NO❗️ |
| └ | getAmountsOut | Public ❗️ |   |NO❗️ |
| └ | getAmountsIn | Public ❗️ |   |NO❗️ |
||||||
| **Depository** | Implementation | IErrors, Ownable |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | changeManagers | External ❗️ | 🛑  | onlyOwner |
| └ | deposit | External ❗️ | 🛑  |NO❗️ |
| └ | redeem | Public ❗️ | 🛑  |NO❗️ |
| └ | redeemAll | External ❗️ | 🛑  |NO❗️ |
| └ | getPendingBonds | Public ❗️ |   |NO❗️ |
| └ | getBondStatus | Public ❗️ |   |NO❗️ |
| └ | create | External ❗️ | 🛑  | onlyOwner |
| └ | close | External ❗️ | 🛑  | onlyOwner |
| └ | isActive | Public ❗️ |   |NO❗️ |
| └ | getActiveProductsForToken | External ❗️ |   |NO❗️ |
| └ | getProduct | Public ❗️ |   |NO❗️ |
||||||
| **Dispenser** | Implementation | IStructs, IErrors, Ownable, Pausable, ReentrancyGuard |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | changeTokenomics | External ❗️ | 🛑  | onlyOwner |
| └ | withdrawOwnerRewards | External ❗️ | 🛑  | nonReentrant whenNotPaused |
| └ | withdrawStakingRewards | External ❗️ | 🛑  | nonReentrant whenNotPaused |
| └ | <Receive Ether> | External ❗️ |  💵 |NO❗️ |
||||||
| **IERC20Permit** | Interface |  |||
| └ | permit | External ❗️ | 🛑  |NO❗️ |
| └ | nonces | External ❗️ |   |NO❗️ |
| └ | DOMAIN_SEPARATOR | External ❗️ |   |NO❗️ |
||||||
| **ERC20Permit** | Implementation | ERC20, IERC20Permit, EIP712 |||
| └ | <Constructor> | Public ❗️ | 🛑  | EIP712 |
| └ | permit | Public ❗️ | 🛑  |NO❗️ |
| └ | nonces | Public ❗️ |   |NO❗️ |
| └ | DOMAIN_SEPARATOR | External ❗️ |   |NO❗️ |
| └ | _useNonce | Internal 🔒 | 🛑  | |
||||||
| **ERC20Burnable** | Implementation | Context, ERC20 |||
| └ | burn | Public ❗️ | 🛑  |NO❗️ |
| └ | burnFrom | Public ❗️ | 🛑  |NO❗️ |
||||||
| **OLA** | Implementation | IErrors, Ownable, ERC20, ERC20Burnable, ERC20Permit |||
| └ | <Constructor> | Public ❗️ | 🛑  | ERC20 ERC20Permit |
| └ | changeMinter | External ❗️ | 🛑  | onlyOwner |
| └ | mint | Public ❗️ | 🛑  | onlyManager |
| └ | inflationControl | Public ❗️ |   |NO❗️ |
| └ | inflationRemainder | Public ❗️ |   |NO❗️ |
||||||
| **FullMath** | Library |  |||
| └ | fullMul | Internal 🔒 |   | |
| └ | fullDiv | Private 🔐 |   | |
| └ | mulDiv | Internal 🔒 |   | |
||||||
| **Babylonian** | Library |  |||
| └ | sqrt | Internal 🔒 |   | |
||||||
| **BitMath** | Library |  |||
| └ | mostSignificantBit | Internal 🔒 |   | |
| └ | leastSignificantBit | Internal 🔒 |   | |
||||||
| **FixedPoint** | Library |  |||
| └ | encode | Internal 🔒 |   | |
| └ | encode144 | Internal 🔒 |   | |
| └ | decode | Internal 🔒 |   | |
| └ | decode144 | Internal 🔒 |   | |
| └ | mul | Internal 🔒 |   | |
| └ | muli | Internal 🔒 |   | |
| └ | muluq | Internal 🔒 |   | |
| └ | divuq | Internal 🔒 |   | |
| └ | fraction | Internal 🔒 |   | |
| └ | reciprocal | Internal 🔒 |   | |
| └ | sqrt | Internal 🔒 |   | |
||||||
| **IVotingEscrow** | Interface |  |||
| └ | balanceOfAt | External ❗️ |   |NO❗️ |
| └ | totalSupplyAt | External ❗️ |   |NO❗️ |
||||||
| **Tokenomics** | Implementation | IErrors, IStructs, Ownable |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | changeManagers | External ❗️ | 🛑  | onlyOwner |
| └ | getCurrentEpoch | External ❗️ |   |NO❗️ |
| └ | changeTokenomicsParameters | External ❗️ | 🛑  | onlyOwner |
| └ | changeRewardFraction | External ❗️ | 🛑  | onlyOwner |
| └ | changeServiceOwnerWhiteList | External ❗️ | 🛑  | onlyOwner |
| └ | isAllowedMint | Public ❗️ | 🛑  |NO❗️ |
| └ | _getInflationRemainderForYear | Public ❗️ | 🛑  |NO❗️ |
| └ | allowedNewBond | External ❗️ | 🛑  | onlyDepository |
| └ | usedBond | External ❗️ | 🛑  | onlyDepository |
| └ | trackServicesETHRevenue | Public ❗️ | 🛑  | onlyTreasury |
| └ | _calculateUnitTokenomics | Private 🔐 | 🛑  | |
| └ | _clearEpochData | Internal 🔒 | 🛑  | |
| └ | checkpoint | External ❗️ | 🛑  | onlyTreasury |
| └ | _adjustMaxBond | Internal 🔒 | 🛑  | |
| └ | getTopUpPerEpoch | Public ❗️ |   |NO❗️ |
| └ | _checkpoint | Internal 🔒 | 🛑  | |
| └ | calculatePayoutFromLP | External ❗️ |   |NO❗️ |
| └ | _calculatePayoutFromLP | Internal 🔒 |   | |
| └ | getAmountOut | Internal 🔒 |   | |
| └ | calculateStakingRewards | External ❗️ |   |NO❗️ |
| └ | getPoint | Public ❗️ |   |NO❗️ |
| └ | getLastPoint | External ❗️ |   |NO❗️ |
| └ | getDF | External ❗️ |   |NO❗️ |
| └ | _add | Private 🔐 |   | |
| └ | getUCF | External ❗️ |   |NO❗️ |
| └ | getOwnerRewards | External ❗️ |   |NO❗️ |
| └ | accountOwnerRewards | External ❗️ | 🛑  | onlyDispenser |
||||||
| **IDispenser** | Interface |  |||
| └ | distributeRewards | External ❗️ | 🛑  |NO❗️ |
| └ | isPaused | External ❗️ | 🛑  |NO❗️ |
||||||
| **Treasury** | Implementation | IErrors, IStructs, Ownable, ReentrancyGuard |||
| └ | <Constructor> | Public ❗️ |  💵 |NO❗️ |
| └ | changeManagers | External ❗️ | 🛑  | onlyOwner |
| └ | depositTokenForOLA | External ❗️ | 🛑  | onlyDepository |
| └ | depositETHFromServices | External ❗️ |  💵 | nonReentrant |
| └ | withdraw | External ❗️ | 🛑  | onlyOwner |
| └ | enableToken | External ❗️ | 🛑  | onlyOwner |
| └ | disableToken | External ❗️ | 🛑  | onlyOwner |
| └ | isEnabled | Public ❗️ |   |NO❗️ |
| └ | checkPair | Public ❗️ | 🛑  |NO❗️ |
| └ | _rebalanceETH | Internal 🔒 | 🛑  | |
| └ | _sendFundsToDispenser | Internal 🔒 | 🛑  | |
| └ | allocateRewards | External ❗️ | 🛑  | onlyOwner |
| └ | <Receive Ether> | External ❗️ |  💵 |NO❗️ |


### Legend

|  Symbol  |  Meaning  |
|:--------:|-----------|
|    🛑    | Function can modify state |
|    💵    | Function is payable |
