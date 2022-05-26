# On-chain Protocol

## Introduction

This repository contains the entirety of contracts making up our on-chain protocol.

A graphical overview is available here:

![architecture](https://github.com/valory-xyz/onchain-protocol/blob/main/docs/On-chain_architecture_v2.png?raw=true)


The architecture is broken up into three main areas:

1. Governance:

	We follow the standard governance setup by OpenZeppelin. Our governance token is a vote-escrow token.

	An overview of the design is provided [here](https://github.com/valory-xyz/onchain-protocol/blob/main/docs/Audit_Governance.pdf?raw=true).

    - [VotingEscrow (veOLA)](https://github.com/valory-xyz/onchain-protocol/blob/main/contracts/governance/VotingEscrow.sol)
    - [GovernorBravoOLA](https://github.com/valory-xyz/onchain-protocol/blob/main/contracts/governance/GovernorBravoOLA.sol)
    - [Timelock](https://github.com/valory-xyz/onchain-protocol/blob/main/contracts/governance/Timelock.sol)


2. Agent Services Functionality:

	We have a core periphery architecture for both the components/agents and services. The core contracts are ERC721s primarily accessed via the peripheral manager contracts.

	An overview of the design is provided [here](https://github.com/valory-xyz/onchain-protocol/blob/main/docs/Audit_AgentServicesFunctionality.pdf?raw=true). An overview of the state machine governing service managament and usage is provided [here](https://github.com/valory-xyz/onchain-protocol/blob/main/docs/FSM.md).

	- [ComponentRegistry](https://github.com/valory-xyz/onchain-protocol/blob/main/contracts/registries/ComponentRegistry.sol)
	- [AgentRegistry](https://github.com/valory-xyz/onchain-protocol/blob/main/contracts/registries/AgentRegistry.sol)
	- [RegistriesManager](https://github.com/valory-xyz/onchain-protocol/blob/main/contracts/registries/RegistriesManager.sol)
	- [ServiceRegistry](https://github.com/valory-xyz/onchain-protocol/blob/main/contracts/registries/ServiceRegistry.sol)
	- [ServiceManager](https://github.com/valory-xyz/onchain-protocol/blob/main/contracts/registries/ServiceManager.sol)


3. Tokenomics

	An overview of the design is provided [here](https://github.com/valory-xyz/onchain-protocol/blob/main/docs/Audit_Tokenomics.pdf?raw=true).

	The OLA token is a standard ERC20 contract with mint functionality and hard coded supply schedule. The Depository and Treasury contracts borrow concepts from OlympusDAO. The Tokenomics contract implements the brunt of the reward logic for component and agent owners as well as veOLA stakers.

	- [OLA](https://github.com/valory-xyz/onchain-protocol/blob/main/contracts/tokenomics/OLA.sol) (❗For licensing reasons the optimised token contract we will use - functionality wise equivalent - is [here](https://github.com/valory-xyz/token/blob/main/src/tokens/OLA.sol))
	- [Depository](https://github.com/valory-xyz/onchain-protocol/blob/main/contracts/tokenomics/Depository.sol)
	- [Dispenser](https://github.com/valory-xyz/onchain-protocol/blob/main/contracts/tokenomics/Dispenser.sol)
	- [Tokenomics](https://github.com/valory-xyz/onchain-protocol/blob/main/contracts/tokenomics/Tokenomics.sol)
	- [Treasury](https://github.com/valory-xyz/onchain-protocol/blob/main/contracts/tokenomics/Treasury.sol)


❗ Known issues: https://github.com/valory-xyz/onchain-protocol/issues/102


![launch](https://github.com/valory-xyz/onchain-protocol/blob/main/docs/LaunchTimeline.png?raw=true)

## Development

### Prerequisites
- This repository follows the standard [`Hardhat`](https://hardhat.org/tutorial/) development process.
- The code is written on Solidity `0.8.14`.
- The standard versions of Node.js along with Yarn are required to proceed further (confirmed to work with Yarn `1.22.10` and npx/npm `6.14.11` and node `v12.22.0`).

### Install the dependencies
The dependency list is managed by the `package.json` file,
and the setup parameters are stored in the `hardhat.config.js` file.
Simply run the follwing command to install the project:
```
yarn install
```

### Core components
The contracts, deploy scripts, regular scripts and tests are located in the following folders respectively:
```
contracts
deploy
scripts
test
```
The tests are logically separated into unit and integration ones.

### Compile the code and run
Compile the code:
```
npm run compile
```
Run the tests:
```
npx hardhat test
```
Run the script without the node deployment:
```
npx hardhat run scripts/name_of_the_script.js
```
Run the code with its deployment on the node:
```
npx hardhat node
```

### Internal audit
The audit is provided internally as development matures. The latest audit report can be found here: [audit](https://github.com/valory-xyz/onchain-protocol/blob/main/audit).

### Linters
- [`ESLint`](https://eslint.org) is used for JS code.
- [`solhint`](https://github.com/protofire/solhint) is used for Solidity linting.


### Github workflows
The PR process is managed by github workflows, where the code undergoes
several steps in order to be verified. Those include:
- code isntallation
- running linters
- running tests


### Staging chain

Merges into main trigger deployment into a freshly provisioned Ganache image. The node is accessible at https://staging.chain.autonolas.tech/ and the latest ABIs are accessible at https://staging.abi-server.autonolas.tech/.

