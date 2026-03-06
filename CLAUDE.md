# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Autonolas-v1 is the full on-chain Autonolas protocol — a monorepo of Solidity smart contracts that integrates three core submodules via git submodules:

- **Governance** (`lib/autonolas-governance`) — OLAS token, veOLAS, GovernorOLAS, Timelock, VoteWeighting
- **Registries** (`lib/autonolas-registries`) — Agent/Component/Service registries, staking, multisig management
- **Tokenomics** (`lib/autonolas-tokenomics`) — Depository, Dispenser, Treasury, Tokenomics proxy, bond calculations

- **Marketplace** (`lib/autonolas-marketplace`) — Mech marketplace contracts
- **Staking Programmes** (`lib/autonolas-staking-programmes`) — Staking programme configurations and contracts

Additional submodule: `lib/forge-std` (testing framework).

The top-level `contracts/` directory contains aggregation files that re-import contracts from submodules for unified compilation. This repo focuses on **integration tests** that exercise cross-module interactions.

## Build & Test Commands

```bash
# Install dependencies (requires git clone --recursive for submodules)
yarn install

# Compile (runs Uniswap pair-hash adjustment scripts, then hardhat compile twice)
npm run compile

# Run all Hardhat tests
npx hardhat test

# Run a single Hardhat test file
npx hardhat test test/GovernanceControl.js

# Run Foundry tests (requires forge installed)
forge test --hh -vv

# Run specific Foundry test
forge test --hh -vv --match-test testTokenomicsBasic

# Run deploy script
npx hardhat run deploy/contracts.js

# Start local node
npx hardhat node
```

## Linting

```bash
# ESLint (JS)
./node_modules/.bin/eslint . --ext .js,.jsx,.ts,.tsx

# Solhint (Solidity)
./node_modules/.bin/solhint contracts/*.sol
```

## Architecture Notes

- Solidity version: `^0.8.30` (main contracts), plus `0.5.16`/`0.6.6` compilers for Uniswap dependencies
- EVM version: `prague` (set in hardhat.config.js)
- Hardhat config uses 50 test accounts with unlimited contract size enabled
- The compile step (`npm run compile`) is multi-phase: it adjusts Uniswap pair code hashes via shell scripts in `scripts/uni-adjust/`, compiles, adjusts again, then recompiles
- Foundry remappings are in `remappings.txt` — maps `forge-std/`, `zuniswapv2/`, and the three autonolas submodule contract directories
- Tests: JS integration tests in `test/*.js` (Hardhat/ethers v5/chai), Foundry tests in `test/*.t.sol`
- Dependencies: OpenZeppelin 4.8.3, Gnosis Safe contracts, Uniswap v2, PRBMath 4.0.2

## Code Style

- JS: 4-space indent, double quotes, semicolons required, camelCase enforced (ESLint)
- Solidity: solhint:recommended with relaxed rules (no-empty-blocks off, not-rely-on-time off, const-name-snakecase off)
