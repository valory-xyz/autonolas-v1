#!/bin/bash
FILE="./contracts/tokenomics/v2-periphery/contracts/libraries/UniswapV2Library.sol"
x=$(npx hardhat run scripts/adjust.js)
sed -i "s/61098f8791ebe192da6bc073c2d9c1e67e8df84f47345262772a1bebc24e77de/$x/g" $FILE

