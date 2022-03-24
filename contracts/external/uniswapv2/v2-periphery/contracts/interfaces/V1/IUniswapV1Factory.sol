// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.5.0;

interface IUniswapV1Factory {
    function getExchange(address) external view returns (address);
}
