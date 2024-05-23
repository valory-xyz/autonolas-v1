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
                version: "0.8.25",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 100,
                    },
                },
                evmVersion: "cancun"
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
