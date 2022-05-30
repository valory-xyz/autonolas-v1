## OLA
- Figure out the correct timeLaunch: use as is or set as an input parameter in the constructor

## veOLA

## Governance
Define the following governance parameters:
- initialVotingDelay;
- initialVotingPeriod;
- initialProposalThreshold;
- quorumFraction.

Correctly setup and define roles (check one of the tests that simulate that), then drop the deployer:
- TIMELOCK_ADMIN_ROLE (governance, multisig?);
- PROPOSER_ROLE (governance, multisig);
- EXECUTOR_ROLE (governance, multisig);
- CANCELLER_ROLE (governance, multisig)