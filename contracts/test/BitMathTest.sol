// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

// Uniswapv2
import "@uniswap/lib/contracts/libraries/BitMath.sol";

// 

/// @title Test #2 test FixedPoint library
/// @author AL
contract BitMathTest {
    function mostSignificantBit(uint256 x) external pure returns (uint8 r) {
        return BitMath.mostSignificantBit(x);
    }
    function leastSignificantBit(uint256 x) external pure returns (uint8 r) {
        return BitMath.leastSignificantBit(x);
    }
}