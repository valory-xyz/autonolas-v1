/*global describe, before, beforeEach, it*/
const { ethers, network } = require("hardhat");
const { expect } = require("chai");

// original reference from https://github.com/Uniswap/solidity-lib/blob/master/test/Babylonian.spec.ts 

describe("Babylonian", () => {
    let babylonian;
    let babylonianFactory;

    before("deploy BabylonianTest", async () => {
        babylonianFactory = await await ethers.getContractFactory("BabylonianTest");
        babylonian = await babylonianFactory.deploy();
    });
    
    it("works for 0-99", async () => {
        for (let i = 0; i < 100; i++) {
            expect(await babylonian.checkSqrt(i)).to.eq(Math.floor(Math.sqrt(i)));
        }
    });

    it("product of numbers close to max uint112", async () => {
        const max = ethers.BigNumber.from(2).pow(112).sub(1);
        expect(await babylonian.checkSqrt(max.mul(max))).to.eq(max);
        const maxMinus1 = max.sub(1);
        expect(await babylonian.checkSqrt(maxMinus1.mul(maxMinus1))).to.eq(maxMinus1);
        const maxMinus2 = max.sub(2);
        expect(await babylonian.checkSqrt(maxMinus2.mul(maxMinus2))).to.eq(maxMinus2);
        expect(await babylonian.checkSqrt(max.mul(maxMinus1))).to.eq(maxMinus1);
        expect(await babylonian.checkSqrt(max.mul(maxMinus2))).to.eq(maxMinus2);
        expect(await babylonian.checkSqrt(maxMinus1.mul(maxMinus2))).to.eq(maxMinus2);
    });

    it("max uint256", async () => {
        const expected = ethers.BigNumber.from(2).pow(128).sub(1);
        expect(await babylonian.checkSqrt(ethers.constants.MaxUint256)).to.eq(expected);
    });
});
