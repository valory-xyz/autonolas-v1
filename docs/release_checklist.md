## OLA
- Figure out the correct timeLaunch: use as is or set as an input parameter in the constructor

## veOLA

## Governance
Define the following governance parameters:
- initialVotingDelay = 2 days in blocks (assuming 14s blocks);
- initialVotingPeriod = 3 days in blocks (assuming 14s blocks);
- initialProposalThreshold = ?;
- quorumFraction = 4(%).

Correctly setup and define roles (check one of the tests that simulate that), then drop the deployer:
- TIMELOCK_ADMIN_ROLE (governance);
- PROPOSER_ROLE (governance, multisig);
- EXECUTOR_ROLE (governance, multisig);
- CANCELLER_ROLE (governance, multisig).

The canceller role for the multisig is needed since this is the only way to cancel the multisig scheduled actions that
do not go through the governance.