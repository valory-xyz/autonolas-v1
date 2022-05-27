// SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;

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

    // TODO Pack these numbers into a single (double) uint256
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
        // Number of new units
        uint256 numNewUnits;
        // Number of new owners
        uint256 numNewOwners;
        // Component / agent weight for new valuable code
        uint256 unitWeight;
    }

    // Structure for tokenomics
    struct PointEcomonics {
        // UCFc
        PointUnits ucfc;
        // UCFa
        PointUnits ucfa;
        // Discount factor
        uint256 df;
        // Profitable number of services
        uint256 numServices;
        // Treasury rewards
        uint256 treasuryRewards;
        // Staking rewards
        uint256 stakerRewards;
        // Donation in ETH
        uint256 totalDonationETH;
        // Top-ups for component / agent owners
        uint256 ownerTopUps;
        // Top-ups for stakers
        uint256 stakerTopUps;
        // Number of valuable devs can be paid per units of capital per epoch
        uint256 devsPerCapital;
        // Timestamp
        uint256 ts;
        // Block number
        uint256 blockNumber;
    }

    // Structure for voting escrow points
    struct PointVoting {
        // w(i) = at + b (bias)
        int128 bias;
        // dw / dt = a (slope)
        int128 slope;
        // Timestamp. It will never overflow 2^64 - 1
        uint64 ts;
        // Block number. It will not be bigger than the timestamp
        uint64 blockNumber;
        // Supply or account balance. It will never be bigger than 2^128 - 1, since the total supply of OLA is lower
        uint128 balance;
    }
}
