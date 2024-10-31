# Autonolas-v1

## Introduction

This repository contains the entirety of contracts in form of cloned submodules, making up the full Autonolas on-chain protocol.

A graphical overview is available here:

![architecture](https://github.com/valory-xyz/autonolas-v1/blob/main/docs/On-chain_architecture_v5.png?raw=true)

The architecture is broken up into three main areas: Governance, Registries and Tokenomics,
with the Solana lockbox being complimentary to them:

1. [Governance and OLAS token](https://github.com/valory-xyz/autonolas-governance);
2. [Agent Services Functionality](https://github.com/valory-xyz/autonolas-registries);
3. [Tokenomics](https://github.com/valory-xyz/autonolas-tokenomics);
4. [Lockbox Solana](https://github.com/valory-xyz/lockbox-solana).

![launch](https://github.com/valory-xyz/autonolas-v1/blob/main/docs/LaunchTimeline.png?raw=true)

## Development

### Prerequisites
- This repository follows the standard [`Hardhat`](https://hardhat.org/tutorial/) development process.
- The code is written on Solidity starting from the version `0.8.15`.
- The standard versions of Node.js along with Yarn are required to proceed further (confirmed to work with Yarn `1.22.19` and npx/npm `10.1.0` and node `v18.6.0`).
- [`Foundry`](https://book.getfoundry.sh/) is required to run the foundry tests.

### Install the dependencies
The project has submodules to get the dependencies. Make sure you run `git clone --recursive` or init the submodules yourself.
The dependency list is managed by the `package.json` file, and the setup parameters are stored in the `hardhat.config.js` file.
Simply run the following command to install the project:
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

This repository covers integration tests that combine functionality of other subprojects. Note that lockbox Solana
is not the part of integration tests as it runs exclusively on Solana.

### Compile the code and run
Compile the code:
```
npm run compile
```
Run tests with Hardhat:
```
npx hardhat test
```
Run tests with Foundry:
```
forge test --hh -vv
```
Run the code with its deployment on the node:
```
npx hardhat node
```

### Audits
The audit is provided as development matures. The latest audit report for a specific subproject can be found here:
- [Governance and Token audit](https://github.com/valory-xyz/autonolas-governance/blob/main/audits);
- [Agent Services Functionality audit](https://github.com/valory-xyz/autonolas-registries/blob/main/audits);
- [Tokenomics audit](https://github.com/valory-xyz/autonolas-tokenomics/blob/main/audits);
- [Lockbox Solana audit](https://github.com/valory-xyz/lockbox-solana/blob/main/audits).

The initial internal audit of the overall `autonolas-v1` pre-split repository is available here:
- [Autonolas internal audit](https://github.com/valory-xyz/autonolas-v1/blob/main/audits).

The initial external review of the `autonolas-v1` pre-split repository is available here:
- [Autonolas external audit](https://github.com/valory-xyz/autonolas-v1/blob/main/audits/Valory_Review_Final.pdf)

### Linters
- [`ESLint`](https://eslint.org) is used for JS code.
- [`solhint`](https://github.com/protofire/solhint) is used for Solidity linting.


### Github workflows
The PR process is managed by github workflows, where the code undergoes several steps in order to be verified. Those include:
- code installation
- running linters
- running tests


## Deployed Protocol
The list of mainnet addresses for different chains and their full contract configuration can be found in the following locations:
- [Governance and Token addresses](https://github.com/valory-xyz/autonolas-governance/blob/main/docs/configuration.json);
- [Agent Services Functionality addresses](https://github.com/valory-xyz/autonolas-registries/blob/main/docs/configuration.json);
- [Tokenomics addresses](https://github.com/valory-xyz/autonolas-tokenomics/blob/main/docs/configuration.json);
- [Lockbox Solana addresses](https://github.com/valory-xyz/lockbox-solana/blob/docs/configuration.json).
