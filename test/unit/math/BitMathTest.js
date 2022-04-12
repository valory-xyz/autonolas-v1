/*global describe, before, beforeEach, it*/
const { ethers, network } = require("hardhat");
const { expect } = require("chai");

// original reference from https://github.com/Uniswap/solidity-lib/blob/master/test/BitMath.spec.ts

describe("BitMathTest", () => {
    let bitMathFactory;
    let bitMath;

    before("deploy BitMathTest", async () => {
        bitMathFactory = await await ethers.getContractFactory("BitMathTest");
        bitMath = await bitMathFactory.deploy();
    });
    it("mostSignificantBit 0", async () => {
        await expect(bitMath.mostSignificantBit(0)).to.be.revertedWith("BitMath::mostSignificantBit: zero");
    });
    it("mostSignificantBit 1", async () => {
        expect(await bitMath.mostSignificantBit(1)).to.eq(0);
    });
    it("mostSignificantBit 2", async () => {
        expect(await bitMath.mostSignificantBit(2)).to.eq(1);
    });
    it("mostSignificantBit all powers of 2", async () => {
        const results = await Promise.all(
            [...Array(255)].map((_, i) => bitMath.mostSignificantBit(ethers.BigNumber.from(2).pow(i)))
        );
        expect(results).to.deep.eq([...Array(255)].map((_, i) => i));
    });
    it("mostSignificantBit 2**256-1", async () => {
        expect(await bitMath.mostSignificantBit(ethers.BigNumber.from(2).pow(256).sub(1))).to.eq(255);
    });

    it("leastSignificantBit 0", async () => {
        await expect(bitMath.leastSignificantBit(0)).to.be.revertedWith("BitMath::leastSignificantBit: zero");
    });
    it("leastSignificantBit 1", async () => {
        expect(await bitMath.leastSignificantBit(1)).to.eq(0);
    });
    it("leastSignificantBit 2", async () => {
        expect(await bitMath.leastSignificantBit(2)).to.eq(1);
    });
    it("leastSignificantBit all powers of 2", async () => {
        const results = await Promise.all(
            [...Array(255)].map((_, i) => bitMath.leastSignificantBit(ethers.BigNumber.from(2).pow(i)))
        );
        expect(results).to.deep.eq([...Array(255)].map((_, i) => i));
    });
    it("leastSignificantBit 2**256-1", async () => {
        expect(await bitMath.leastSignificantBit(ethers.BigNumber.from(2).pow(256).sub(1))).to.eq(0);
    });
});