// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

// Pulls the Gnosis Safe DefaultCallbackHandler into the compile graph so tests can deploy it.
// Kept in its own source unit: importing it alongside ServiceRegistry.sol clashes on the
// duplicate ERC721TokenReceiver declaration reachable from both dependency trees.
import "@gnosis.pm/safe-contracts/contracts/handler/DefaultCallbackHandler.sol";
