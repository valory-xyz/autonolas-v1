// SPDX-License-Identifier: GPL-3.0-or-later

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
pragma experimental ABIEncoderV2;

// Uniswapv2
import "@uniswap/lib/contracts/libraries/FixedPoint.sol";

/// @title Test #4 test FixedPoint library
/// @author AL
contract FixedPointTest {
    function encode(uint112 x) external pure returns (FixedPoint.uq112x112 memory) {
        return FixedPoint.encode(x);
    }

    function encode144(uint144 x) external pure returns (FixedPoint.uq144x112 memory) {
        return FixedPoint.encode144(x);
    }

    function decode(FixedPoint.uq112x112 calldata self) external pure returns (uint112) {
        return FixedPoint.decode(self);
    }

    function decode144(FixedPoint.uq144x112 calldata self) external pure returns (uint144) {
        return FixedPoint.decode144(self);
    }

    function mul(FixedPoint.uq112x112 calldata self, uint256 y) external pure returns (FixedPoint.uq144x112 memory) {
        return FixedPoint.mul(self, y);
    }

    function muli(FixedPoint.uq112x112 calldata self, int256 y) external pure returns (int256) {
        return FixedPoint.muli(self, y);
    }

    function muluq(FixedPoint.uq112x112 calldata self, FixedPoint.uq112x112 calldata other)
        external
        pure
        returns (FixedPoint.uq112x112 memory)
    {
        return FixedPoint.muluq(self, other);
    }

    function divuq(FixedPoint.uq112x112 calldata self, FixedPoint.uq112x112 calldata other)
        external
        pure
        returns (FixedPoint.uq112x112 memory)
    {
        return FixedPoint.divuq(self, other);
    }

    function fraction(uint256 numerator, uint256 denominator) external pure returns (FixedPoint.uq112x112 memory) {
        return FixedPoint.fraction(numerator, denominator);
    }

    function reciprocal(FixedPoint.uq112x112 calldata self) external pure returns (FixedPoint.uq112x112 memory) {
        return FixedPoint.reciprocal(self);
    }

    function sqrt(FixedPoint.uq112x112 calldata self) external pure returns (FixedPoint.uq112x112 memory) {
        return FixedPoint.sqrt(self);
    }
}