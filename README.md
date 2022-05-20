# On-chain Protocol

## Introduction

This repository contains the entirety of contracts making up our on-chain protocol.

A graphical overview is available here:

![architecture](https://github.com/valory-xyz/onchain-protocol/blob/main/docs/On-chain_architecture_v2.png?raw=true)


The architecture is broken up into three main areas:

1. Governance:

	We follow the standard governance setup by OpenZeppelin. Our governance token is a vote-escrow token.

    - [VotingEscrow (veOLA)](https://github.com/valory-xyz/onchain-protocol/blob/main/contracts/governance/VotingEscrow.sol)
    - [GovernorBravoOLA](https://github.com/valory-xyz/onchain-protocol/blob/main/contracts/governance/GovernorBravoOLA.sol)
    - [Timelock](https://github.com/valory-xyz/onchain-protocol/blob/main/contracts/governance/Timelock.sol)


2. Agent Services Functionality:

	We have a core periphery architecture for both the components/agents and services. The core contracts are ERC721s primarily accessed via the peripheral manager contracts.

	- [ComponentRegistry](https://github.com/valory-xyz/onchain-protocol/blob/main/contracts/registries/ComponentRegistry.sol)
	- [AgentRegistry](https://github.com/valory-xyz/onchain-protocol/blob/main/contracts/registries/AgentRegistry.sol)
	- [RegistriesManager](https://github.com/valory-xyz/onchain-protocol/blob/main/contracts/registries/RegistriesManager.sol)
	- [ServiceRegistry](https://github.com/valory-xyz/onchain-protocol/blob/main/contracts/registries/ServiceRegistry.sol)
	- [ServiceManager](https://github.com/valory-xyz/onchain-protocol/blob/main/contracts/registries/ServiceManager.sol)


3. Tokenomics

	An overview of the design is provided [here](https://github.com/valory-xyz/onchain-protocol/blob/main/docs/Audit_Tokenomics.pdf?raw=true)


	The contracts borrow concepts from OlympusDAO.

	- [Depository](https://github.com/valory-xyz/onchain-protocol/blob/main/contracts/tokenomics/Depository.sol)
	- [Dispenser](https://github.com/valory-xyz/onchain-protocol/blob/main/contracts/tokenomics/Dispenser.sol)
	- [OLA](https://github.com/valory-xyz/onchain-protocol/blob/main/contracts/tokenomics/OLA.sol)
	- [Tokenomics](https://github.com/valory-xyz/onchain-protocol/blob/main/contracts/tokenomics/Tokenomics.sol)
	- [Treasury](https://github.com/valory-xyz/onchain-protocol/blob/main/contracts/tokenomics/Treasury.sol)


## Development

### Prerequisites
- This repository follows the standard [`Hardhat`](https://hardhat.org/tutorial/) development process.
- The code is written on Solidity 0.8.0.
- The standard versions of Node.js along with Yarn are required to proceed further

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

### Linters
- [`ESLint`](https://eslint.org) is used for JS code.
- [`solhint`](https://github.com/protofire/solhint) is used for Solidity linting.


### Github workflows
The PR process is managed by github workflows, where the code undergoes
several steps in order to be verified. Those include:
- code isntallation
- running linters
- running tests

