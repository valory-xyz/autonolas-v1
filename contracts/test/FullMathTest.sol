// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

// Uniswapv2
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/lib/contracts/libraries/FullMath.sol";

/// @title Test #3 test FixedPoint library
/// @author AL
contract FullMathTest {
    function mulDiv(
        uint256 x,
        uint256 y,
        uint256 z
    ) external pure returns (uint256) {
            return FullMath.mulDiv(x, y, z);
    }

    function mulDivRoundingUp(
        uint256 x,
        uint256 y,
        uint256 z
    ) external pure returns (uint256) {
        bool roundUp = mulmod(x, y, z) > 0;
        return FullMath.mulDiv(x, y, z) + (roundUp ? 1 : 0);
    }
}