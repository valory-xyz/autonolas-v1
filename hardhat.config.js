require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomiclabs/hardhat-ethers");
require("hardhat-deploy");
require("hardhat-gas-reporter");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const accounts = {
    count: 50,
    mnemonic: "test test test test test test test test test test test junk",
    accountsBalance: "100000000000000000000000000",
};

module.exports = {
    networks: {
        local: {
            url: "http://localhost:8545",
        },
        hardhat: {
            allowUnlimitedContractSize: true,
            accounts
        },
    },
    solidity: {
        compilers: [
            {
                version: "0.8.30",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                    // evmVersion and viaIR must live inside `settings` - hardhat ignores them as
                    // siblings of it, which is why this config previously compiled against solc's
                    // default EVM target rather than prague.
                    evmVersion: "prague",
                    // Required by lib/autonolas-tokenomics: Dispenser.sol does not compile without
                    // it ("Stack too deep"). Matches that repo's own hardhat.config.js and
                    // foundry.toml, so contracts are built here exactly as they are upstream.
                    viaIR: true,
                },
            },
            {
                version: "0.5.16", // uniswap
            },
            {
                version: "0.6.6", // uniswap
            }
        ]
    },
    gasReporter: {
        enabled: true
    }
};
