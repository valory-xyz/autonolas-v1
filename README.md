# On-chain Protocol

## Introduction

This repository contains the entirety of contracts in form of cloned submodules, making up our on-chain protocol.

A graphical overview is available here:

![architecture](https://github.com/valory-xyz/onchain-protocol/blob/main/docs/On-chain_architecture_v2.png?raw=true)

The architecture is broken up into three main areas:

1. [Governance and OLAS token](https://github.com/valory-xyz/autonolas-governance);
2. [Agent Services Functionality](https://github.com/valory-xyz/autonolas-registries);
3. [Tokenomics](https://github.com/valory-xyz/autonolas-tokenomics).

❗ Known issues: https://github.com/valory-xyz/onchain-protocol/issues/102


![launch](https://github.com/valory-xyz/onchain-protocol/blob/main/docs/LaunchTimeline.png?raw=true)

## Development

### Prerequisites
- This repository follows the standard [`Hardhat`](https://hardhat.org/tutorial/) development process.
- The code is written on Solidity `0.8.14`.
- The standard versions of Node.js along with Yarn are required to proceed further (confirmed to work with Yarn `1.22.10` and npx/npm `6.14.11` and node `v12.22.0`).

### Install the dependencies
This repository utilizes submodules. Please clone with `--recursive` option.

The dependency list is managed by the `package.json` file,
and the setup parameters are stored in the `hardhat.config.js` file.
Simply run the follwing command to install the project:
```
yarn install
```

### Core components
The contracts, deploy scripts and tests are located in the following folders respectively:
```
contracts
deploy
test
```
This repository covers integration tests that combine functionality of other subprojects.

### Compile the code and run
Compile the code:
```
npm run compile
```
Run the tests:
```
npx hardhat test
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
- code installation
- running linters
- running tests


### Staging chain

Merges into main trigger deployment into a freshly provisioned Ganache image. The node is accessible at https://staging.chain.autonolas.tech/ and the latest ABIs are accessible at https://staging.abi-server.autonolas.tech/.

