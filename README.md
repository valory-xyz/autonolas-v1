# On-chain Protocol

## Introduction

This repository contains the entirety of contracts in form of cloned submodules, making up our on-chain protocol.

A graphical overview is available here:

![architecture](https://github.com/valory-xyz/autonolas-v1/blob/main/docs/On-chain_architecture_v2.png?raw=true)

The architecture is broken up into three main areas:

1. [Governance and OLAS token](https://github.com/valory-xyz/autonolas-governance);
2. [Agent Services Functionality](https://github.com/valory-xyz/autonolas-registries);
3. [Tokenomics](https://github.com/valory-xyz/autonolas-tokenomics).

❗ Known issues: https://github.com/valory-xyz/autonolas-v1/issues/102

![launch](https://github.com/valory-xyz/autonolas-v1/blob/main/docs/LaunchTimeline.png?raw=true)

## Development

### Prerequisites
- This repository follows the standard [`Hardhat`](https://hardhat.org/tutorial/) development process.
- The code is written on Solidity `0.8.15` and `0.8.16`.
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
The audit is provided internally as development matures. The latest audit report for a specific subproject can be found here:
- [Governance and Token audit](https://github.com/valory-xyz/autonolas-governance/blob/main/audits);
- [Agent Services Functionality audit](https://github.com/valory-xyz/autonolas-registries/blob/main/audits);
- [Tokenomics audit](https://github.com/valory-xyz/autonolas-tokenomics/blob/main/audits).

The initial internal audit of the overall `autonolas-v1` pre-split repository is available here:
- [Autonolas internal audit](https://github.com/valory-xyz/autonolas-v1/blob/main/audits).

The initial external audit of the `autonolas-v1` pre-split repository is available here:
- [Autonolas external audit](https://github.com/valory-xyz/autonolas-v1/blob/main/audits/Valory_Review_Final.pdf)

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

