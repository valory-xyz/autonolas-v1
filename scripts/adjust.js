/*global process*/
const hre = require("hardhat");

async function main() {
    var json = require("../artifacts/contracts/tokenomics/v2-core/contracts/UniswapV2Pair.sol/UniswapV2Pair.json");
    const actualBytecode = json["bytecode"];
    const initHash = hre.ethers.utils.keccak256(actualBytecode);
    const initHashReplace = initHash.slice(2);
    console.log(initHashReplace);
    // const STANDARD_HASH = "96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f"
    //console.log("----------");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
