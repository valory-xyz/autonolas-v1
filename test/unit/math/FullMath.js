/*global describe, before, beforeEach, it*/
const { ethers, network } = require("hardhat");
const { expect } = require("chai");

// original reference from https://github.com/Uniswap/solidity-lib/blob/master/test/FullMath.spec.ts

describe("FullMath", () => {
    let fmFactory;
    let fm;
    before("deploy FullMathTest", async () => {
        fmFactory = await await ethers.getContractFactory("FullMathTest");
        fm = await fmFactory.deploy();
    });

    const Q128 = ethers.BigNumber.from(2).pow(128);
    it("accurate without phantom overflow", async () => {
        const result = Q128.div(3);
        expect(
            await fm.mulDiv(
                Q128,
                ethers.BigNumber.from(50).mul(Q128).div(100),
                ethers.BigNumber.from(150).mul(Q128).div(100)
            )
        ).to.eq(result);

        expect(
            await fm.mulDivRoundingUp(
                Q128,
                ethers.BigNumber.from(50).mul(Q128).div(100),
                ethers.BigNumber.from(150).mul(Q128).div(100)
            )
        ).to.eq(result.add(1));
    });

    it("accurate with phantom overflow", async () => {
        const result = ethers.BigNumber.from(4375).mul(Q128).div(1000);
        expect(await fm.mulDiv(Q128, ethers.BigNumber.from(35).mul(Q128), ethers.BigNumber.from(8).mul(Q128))).to.eq(result);
        expect(await fm.mulDivRoundingUp(Q128, ethers.BigNumber.from(35).mul(Q128), ethers.BigNumber.from(8).mul(Q128))).to.eq(result);
    });

    it("accurate with phantom overflow and repeating decimal", async () => {
        const result = ethers.BigNumber.from(1).mul(Q128).div(3);
        expect(await fm.mulDiv(Q128, ethers.BigNumber.from(1000).mul(Q128), ethers.BigNumber.from(3000).mul(Q128))).to.eq(result);
        expect(await fm.mulDivRoundingUp(Q128, ethers.BigNumber.from(1000).mul(Q128), ethers.BigNumber.from(3000).mul(Q128))).to.eq(
            result.add(1)
        );
    });
});
