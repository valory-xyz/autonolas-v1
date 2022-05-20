# On-chain Protocol

## Introduction

This repository contains the entirety of contracts making up our on-chain protocol.

A graphical overview is available here:

![architecture](https://github.com/valory-xyz/onchain-protocol/blob/main/docs/On-chain_architecture_v2.pdf?raw=true)


The architecture is broken up into three main areas:

1. Governance


2. Agent Services Functionality

Provides the functionality to mint agent `components` and canonical `agents` via the ERC721 standard.
It stores instances associated with components and agents, supplies a set of read-only functions to inquire the state
of entities.

The protocol also provides the capability of creating `services` that are based on canonical agents. Each service
instance bears a set of canonical agent Ids it is composed of with the number of agent instances for each Id. For the
service deployment `operators` supply agent instances to a specific service via registration. Once all the required
agent instances are provided by operators, the service can be deployed forming a Gnosis Safe contract governed by
a group of agent instances.

3. Tokenomics

An overview is provided [here](https://github.com/valory-xyz/onchain-protocol/blob/main/docs/Audit_Tokenomics.pdf?raw=true)


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

