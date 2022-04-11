
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

// Uniswapv2
import "@uniswap/lib/contracts/libraries/Babylonian.sol";

/// @title Test #1 test FixedPoint library
/// @author AL
contract BabylonianTest {
    function checkSqrt(uint256 input) external pure returns (uint256 res) {
        res = Babylonian.sqrt(input);
        // 2**128 == sqrt(2^256)
        assert(res < 2**128);
        // since we compute floor(sqrt(input))
        assert(res**2 <= input);
    }
}