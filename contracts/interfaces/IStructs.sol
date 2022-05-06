// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@uniswap/lib/contracts/libraries/FixedPoint.sol";

/// @dev IPFS multihash.
interface IStructs {
    // Canonical agent Id parameters
    struct AgentParams {
        // Number of agent instances
        uint256 slots;
        // Bond per agent instance
        uint256 bond;
    }

    // Multihash according to self-describing hashes standard. For more information of multihashes please visit https://multiformats.io/multihash/
    struct Multihash {
        // IPFS uses a sha2-256 hashing function. Each IPFS hash has to start with 1220.
        bytes32 hash;
        // Code in hex for sha2-256 is 0x12
        uint8 hashFunction;
        // Length of the hash is 32 bytes, or 0x20 in hex
        uint8 size;
    }

    // TODO Pack these numbers into a single uint256
    // Structure for component / agent tokenomics-related statistics
    struct PointUnits {
        // Total absolute number of components / agents
        uint256 numUnits;
        // Number of components / agents that were part of profitable services
        uint256 numProfitableUnits;
        // Allocated rewards for components / agents
        uint256 unitRewards;
        // Cumulative UCFc-s / UCFa-s
        uint256 ucfuSum;
        // Coefficient weight of units for the final UCF formula, set by the government
        uint256 ucfWeight;
    }

    // Structure for tokenomics
    struct PointEcomonics {
        PointUnits ucfc;
        PointUnits ucfa;
        FixedPoint.uq112x112 df; // x > 1.0
        uint256 numServices;
        uint256 treasuryRewards;
        uint256 stakerRewards;
        uint256 totalDonationETH;
        // Timestamp
        uint256 ts;
        // Block number
        uint256 blockNumber;
    }

    // Structure for voting escrow points
    struct PointVoting {
        // b: y = ax + b
        int128 bias;
        // a: dweight / dt
        int128 slope;
        // Timestamp
        uint256 ts;
        // Block number
        uint256 blockNumber;
        // Total balance or account balance
        uint256 balance;
    }
}
