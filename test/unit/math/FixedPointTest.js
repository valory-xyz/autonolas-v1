/*global describe, before, beforeEach, it*/
const { ethers, network } = require("hardhat");
const { expect } = require("chai");

// original reference from https://github.com/Uniswap/solidity-lib/blob/master/test/FixedPoint.spec.ts

const Q112 = ethers.BigNumber.from(2).pow(112);

function multiplyExpanded(self, other) {
    const upper = self.shr(112).mul(other.shr(112));
    const lower = self.mask(112).mul(other.mask(112));
    const uppersLowero = self.shr(112).mul(other.mask(112));
    const upperoLowers = self.mask(112).mul(other.shr(112));
    return upper.mul(Q112).add(uppersLowero).add(upperoLowers).add(lower.div(Q112));
}

describe("FixedPointTest", () => {
    
    let fixedPointFactory;
    let fixedPoint;
    before("deploy FixedPointTest", async () => {
        fixedPointFactory = await await ethers.getContractFactory("FixedPointTest");
        fixedPoint = await fixedPointFactory.deploy();
    });

    it("encode shifts left by 112", async () => {
        expect((await fixedPoint.encode("0x01"))[0]).to.eq(Q112.toHexString());
    });
    it("encode will not take > uint112.max", async () => {
        expect(() => fixedPoint.encode(ethers.BigNumber.from(2).pow(113).sub(1))).to.throw;
    });

    it("encode144 shifts left by 112", async () => {
        expect((await fixedPoint.encode144("0x01"))[0]).to.eq(Q112.toHexString());
    });
    it("encode144 will not take > uint144.max", async () => {
        expect(() => fixedPoint.encode144(ethers.BigNumber.from(2).pow(145).sub(1))).to.throw;
    });

    it("decode shifts right by 112", async () => {
        expect(await fixedPoint.decode([ethers.BigNumber.from(3).mul(Q112)])).to.eq(ethers.BigNumber.from(3));
    });
    it("decode will not take > uint224.max", async () => {
        expect(() => fixedPoint.decode([ethers.BigNumber.from(2).pow(225).sub(1)])).to.throw;
    });

    it("decode144 shifts right by 112", async () => {
        expect(await fixedPoint.decode([ethers.BigNumber.from(3).mul(Q112)])).to.eq(ethers.BigNumber.from(3));
    });

    it("deecode will not take > uint256.max", async () => {
        expect(() => fixedPoint.decode([ethers.BigNumber.from(2).pow(257).sub(1)])).to.throw;
    });

    it("mul works for 0", async () => {
        expect((await fixedPoint.mul([0], 1))[0]).to.eq(0);
        expect((await fixedPoint.mul([1], 0))[0]).to.eq(0);
    });

    it("correct multiplication", async () => {
        expect((await fixedPoint.mul([ethers.BigNumber.from(3).mul(Q112)], ethers.BigNumber.from(2)))[0]).to.eq(
            ethers.BigNumber.from(3).mul(2).mul(Q112)
        );
    });

    it("mul overflow", async () => {
        // original "FixedPoint::mul: overflow", for Solidity 8.x reverted with panic code 0x11
        await expect(fixedPoint.mul([ethers.BigNumber.from(1).mul(Q112)], ethers.BigNumber.from(2).pow(144))).to.be.revertedWith(
            "FixedPoint::mul: overflow"
        );
        
    });

    it("mul max of q112x112", async () => {
        expect((await fixedPoint.mul([ethers.BigNumber.from(2).pow(112)], ethers.BigNumber.from(2).pow(112)))[0]).to.eq(
            ethers.BigNumber.from(2).pow(224)
        );
    });

    it("mul max without overflow, largest fixed point", async () => {
        const maxMultiplier = ethers.BigNumber.from(2).pow(32);
        expect((await fixedPoint.mul([ethers.BigNumber.from(2).pow(224).sub(1)], maxMultiplier))[0]).to.eq(
            ethers.BigNumber.from("115792089237316195423570985008687907853269984665640564039457584007908834672640")
        );
        // original "FixedPoint::mul: overflow", for Solidity 8.x reverted with panic code 0x11
        await expect(fixedPoint.mul([ethers.BigNumber.from(2).pow(224).sub(1)], maxMultiplier.add(1))).to.be.revertedWith(
            "FixedPoint::mul: overflow"
        );
    });

    it("mul max without overflow, smallest fixed point", async () => {
        const maxUint = ethers.BigNumber.from(2).pow(256).sub(1);
        expect((await fixedPoint.mul([ethers.BigNumber.from(1)], maxUint))[0]).to.eq(maxUint);
        // original "FixedPoint::mul: overflow", for Solidity 8.x reverted with panic code 0x11
        await expect(fixedPoint.mul([ethers.BigNumber.from(2)], maxUint)).to.be.revertedWith("FixedPoint::mul: overflow");
    });

    it("muli works for 0", async () => {
        expect(await fixedPoint.muli([ethers.BigNumber.from(0).mul(Q112)], ethers.BigNumber.from(1))).to.eq(ethers.BigNumber.from(0));
        expect(await fixedPoint.muli([ethers.BigNumber.from(1).mul(Q112)], ethers.BigNumber.from(0))).to.eq(ethers.BigNumber.from(0));
    });

    it("muli works for 3*2", async () => {
        expect(await fixedPoint.muli([ethers.BigNumber.from(3).mul(Q112)], ethers.BigNumber.from(2))).to.eq(ethers.BigNumber.from(6));
    });

    it("muli works for 3*-2", async () => {
        expect(await fixedPoint.muli([ethers.BigNumber.from(3).mul(Q112)], ethers.BigNumber.from(-2))).to.eq(ethers.BigNumber.from(-6));
    });

    it("muli max without overflow, largest int", async () => {
        const maxInt = ethers.BigNumber.from(2).pow(255).sub(1);
        expect(await fixedPoint.muli([ethers.BigNumber.from(1).mul(Q112)], maxInt)).to.be.eq(maxInt);

        const minInt = ethers.BigNumber.from(2).pow(255).mul(-1);
        // original "FixedPoint::muli: overflow", for Solidity 8.x reverted with panic code 0x11
        await expect(fixedPoint.muli([ethers.BigNumber.from(1).mul(Q112)], minInt)).to.be.revertedWith(
            "FixedPoint::muli: overflow"
        );

        expect(await fixedPoint.muli([ethers.BigNumber.from(1).mul(Q112).sub(1)], minInt)).to.be.eq(
            "-57896044618658097711785492504343942776262393067508711251869655679775811829760"
        );
        expect(await fixedPoint.muli([ethers.BigNumber.from(1).mul(Q112)], minInt.add(1))).to.be.eq(minInt.add(1));
    });
    it("muli max without overflow, largest fixed point", async () => {
        const maxMultiplier = ethers.BigNumber.from(2)
            .pow(255 + 112)
            .div(ethers.BigNumber.from(2).pow(224).sub(1));
        expect(await fixedPoint.muli([ethers.BigNumber.from(2).pow(224).sub(1)], maxMultiplier)).to.eq(
            ethers.BigNumber.from("57896044618658097711785492504343953926634992332820282019728792003954417336320")
        );
        // original "FixedPoint::mul: overflow", for Solidity 8.x reverted with panic code 0x11
        await expect(fixedPoint.muli([ethers.BigNumber.from(2).pow(224).sub(1)], maxMultiplier.add(1))).to.be.revertedWith(
            "FixedPoint::muli: overflow"
        );

        // negative versions
        expect(await fixedPoint.muli([ethers.BigNumber.from(2).pow(224).sub(1)], maxMultiplier.mul(-1))).to.eq(
            ethers.BigNumber.from("57896044618658097711785492504343953926634992332820282019728792003954417336320").mul(-1)
        );
        // original "FixedPoint::mul: overflow", for Solidity 8.x reverted with panic code 0x11
        await expect(
            fixedPoint.muli([ethers.BigNumber.from(2).pow(224).sub(1)], maxMultiplier.add(1).mul(-1))
        ).to.be.revertedWith("FixedPoint::muli: overflow");
    });

    it("muluq works for 0", async () => {
        expect((await fixedPoint.muluq([ethers.BigNumber.from(0)], [Q112]))[0]).to.eq(ethers.BigNumber.from(0));
        expect((await fixedPoint.muluq([Q112], [ethers.BigNumber.from(0)]))[0]).to.eq(ethers.BigNumber.from(0));
    });

    it("muluq multiplies 3*2", async () => {
        expect((await fixedPoint.muluq([ethers.BigNumber.from(3).mul(Q112)], [ethers.BigNumber.from(2).mul(Q112)]))[0]).to.eq(
            ethers.BigNumber.from(3).mul(2).mul(Q112)
        );
    });
    
    it("muluq multiplies 4/3*4/3", async () => {
        const multiplier = ethers.BigNumber.from(4).mul(Q112).div(3);
        const expectedResult = multiplyExpanded(multiplier, multiplier);
        expect((await fixedPoint.muluq([multiplier], [multiplier]))[0]).to.eq(expectedResult);
        expect(expectedResult.add(1)).to.eq(ethers.BigNumber.from(16).mul(Q112).div(9)); // close to 16/9
    });

    it("muluq overflow upper", async () => {
        const multiplier1 = Q112.mul(2);
        const multiplier2 = Q112.mul(Q112).div(2);
        await expect(fixedPoint.muluq([multiplier1], [multiplier2])).to.be.revertedWith(
            "FixedPoint::muluq: upper overflow"
        );
        expect((await fixedPoint.muluq([multiplier1.sub(1)], [multiplier2]))[0]).to.eq(
            multiplyExpanded(multiplier1.sub(1), multiplier2)
        );
        expect((await fixedPoint.muluq([multiplier1], [multiplier2.sub(1)]))[0]).to.eq(
            multiplyExpanded(multiplier1, multiplier2.sub(1))
        );
    });

    it("divuq works for 0 numerator", async () => {
        expect((await fixedPoint.divuq([ethers.BigNumber.from(0)], [Q112]))[0]).to.eq(ethers.BigNumber.from(0));
    });

    it("divuq throws for 0 denominator", async () => {
        await expect(fixedPoint.divuq([Q112], [ethers.BigNumber.from(0)])).to.be.revertedWith(
            "FixedPoint::divuq: division by zero"
        );
    });

    it("divuq equality 30/30", async () => {
        expect((await fixedPoint.divuq([ethers.BigNumber.from(30).mul(Q112)], [ethers.BigNumber.from(30).mul(Q112)]))[0]).to.eq(Q112);
    });

    it("divuq divides 30/10", async () => {
        expect((await fixedPoint.divuq([ethers.BigNumber.from(30).mul(Q112)], [ethers.BigNumber.from(10).mul(Q112)]))[0]).to.eq(
            ethers.BigNumber.from(3).mul(Q112)
        );
    });

    it("divuq divides 35/8", async () => {
        expect((await fixedPoint.divuq([ethers.BigNumber.from(35).mul(Q112)], [ethers.BigNumber.from(8).mul(Q112)]))[0]).to.eq(
            ethers.BigNumber.from(4375).mul(Q112).div(1000)
        );
    });

    it("divuq divides 1/3", async () => {
        expect((await fixedPoint.divuq([ethers.BigNumber.from(1).mul(Q112)], [ethers.BigNumber.from(3).mul(Q112)]))[0]).to.eq(
        // this is max precision 0.3333 repeating
            "1730765619511609209510165443073365"
        );
    });

    it("divuq divides 1e15/3e15 (long division, repeating)", async () => {
        expect(
            (
                await fixedPoint.divuq(
                    [ethers.BigNumber.from(10).pow(15).mul(Q112)],
                    [ethers.BigNumber.from(3).mul(ethers.BigNumber.from(10).pow(15)).mul(Q112)]
                )
            )[0]
        ).to.eq("1730765619511609209510165443073365");
    });

    it("divuq boundary of full precision", async () => {
        const maxNumeratorFullPrecision = ethers.BigNumber.from(2).pow(144).sub(1);
        const minDenominatorFullPrecision = ethers.BigNumber.from("4294967296"); // ceiling(uint144(-1) * Q112 / uint224(-1))

        expect((await fixedPoint.divuq([maxNumeratorFullPrecision], [minDenominatorFullPrecision]))[0]).to.eq(
            ethers.BigNumber.from("26959946667150639794667015087019630673637143213614752866474435543040")
        );

        await expect(
            fixedPoint.divuq([maxNumeratorFullPrecision.add(1)], [minDenominatorFullPrecision])
        ).to.be.revertedWith("FixedPoint::divuq: overflow");

        await expect(
            fixedPoint.divuq([maxNumeratorFullPrecision], [minDenominatorFullPrecision.sub(1)])
        ).to.be.revertedWith("FixedPoint::divuq: overflow");
    });

    it("divuq precision", async () => {
        const numerator = ethers.BigNumber.from(2).pow(144);

        expect((await fixedPoint.divuq([numerator], [numerator.sub(1)]))[0]).to.eq(
            ethers.BigNumber.from("5192296858534827628530496329220096")
        );

        expect((await fixedPoint.divuq([numerator], [numerator.add(1)]))[0]).to.eq(
            ethers.BigNumber.from("5192296858534827628530496329220095")
        );
    });

    it("divuq overflow with smaller numbers", async () => {
        const numerator = ethers.BigNumber.from(2).pow(143);
        const denominator = ethers.BigNumber.from(2).pow(29);
        await expect(fixedPoint.divuq([numerator], [denominator])).to.be.revertedWith("FixedPoint::divuq: overflow");
    });

    it("divuq overflow with large numbers", async () => {
        const numerator = ethers.BigNumber.from(2).pow(145);
        const denominator = ethers.BigNumber.from(2).pow(32);
        await expect(fixedPoint.divuq([numerator], [denominator])).to.be.revertedWith("FixedPoint::divuq: overflow");
    });

    it("fraction correct computation less than 1", async () => {
        expect((await fixedPoint.fraction(4, 100))[0]).to.eq(ethers.BigNumber.from(4).mul(Q112).div(100));
    });

    it("fraction correct computation greater than 1", async () => {
        expect((await fixedPoint.fraction(100, 4))[0]).to.eq(ethers.BigNumber.from(100).mul(Q112).div(4));
    });

    it("fraction fails with 0 denominator", async () => {
        await expect(fixedPoint.fraction(ethers.BigNumber.from(1), ethers.BigNumber.from(0))).to.be.revertedWith(
            "FixedPoint::fraction: division by zero"
        );
    });
    it("fraction can be called with numerator exceeding uint112 max", async () => {
        expect((await fixedPoint.fraction(Q112.mul(2359), 6950))[0]).to.eq(Q112.mul(Q112).mul(2359).div(6950));
    });
    it("fraction can be called with denominator exceeding uint112 max", async () => {
        expect((await fixedPoint.fraction(2359, Q112.mul(2359)))[0]).to.eq(1);
    });
    it("fraction can be called with numerator exceeding uint144 max", async () => {
        expect((await fixedPoint.fraction(Q112.mul(2359).mul(ethers.BigNumber.from(2).pow(32)), Q112.mul(50)))[0]).to.eq(
            ethers.BigNumber.from(2359).mul(Q112).mul(ethers.BigNumber.from(2).pow(32)).div(50)
        );
    });
    it("fraction can be called with numerator and denominator exceeding uint112 max", async () => {
        expect((await fixedPoint.fraction(Q112.mul(2359), Q112.mul(50)))[0]).to.eq(ethers.BigNumber.from(2359).mul(Q112).div(50));
    });
    it("fraction short circuits for 0", async () => {
        expect((await fixedPoint.fraction(0, Q112.mul(Q112).mul(2360)))[0]).to.eq(0);
    });
    it("fraction can overflow if result of division does not fit", async () => {
        await expect(fixedPoint.fraction(Q112.mul(2359), 50)).to.be.revertedWith("FixedPoint::fraction: overflow");
    });
    
    it("reciprocal fails for 0", async () => {
        await expect(fixedPoint.reciprocal([ethers.BigNumber.from(0)])).to.be.revertedWith(
            "FixedPoint::reciprocal: reciprocal of zero"
        );
    });
    it("reciprocal fails for 1", async () => {
        await expect(fixedPoint.reciprocal([ethers.BigNumber.from(1)])).to.be.revertedWith("FixedPoint::reciprocal: overflow");
    });
    it("reciprocal works for 0.25", async () => {
        expect((await fixedPoint.reciprocal([Q112.mul(ethers.BigNumber.from(25)).div(100)]))[0]).to.eq(Q112.mul(4));
    });
    it("reciprocal works for 5", async () => {
        expect((await fixedPoint.reciprocal([Q112.mul(ethers.BigNumber.from(5))]))[0]).to.eq(Q112.mul(ethers.BigNumber.from(1)).div(5));
    });

    it("sqrt works with 0", async () => {
        expect((await fixedPoint.sqrt([ethers.BigNumber.from(0)]))[0]).to.eq(ethers.BigNumber.from(0));
    });

    it("sqrt works with numbers less than 1", async () => {
        expect((await fixedPoint.sqrt([ethers.BigNumber.from(1225).mul(Q112).div(100)]))[0]).to.eq(
            ethers.BigNumber.from(35).mul(Q112).div(10)
        );
    });

    it("sqrt orks for 25", async () => {
        expect((await fixedPoint.sqrt([ethers.BigNumber.from(25).mul(Q112)]))[0]).to.eq(ethers.BigNumber.from(5).mul(Q112));
    });

    
    it("sqrt works for max uint144", async () => {
        const input = ethers.BigNumber.from(2).pow(144).sub(1);
        const result = (await fixedPoint.sqrt([input]))[0];
        const expected = ethers.BigNumber.from("340282366920938463463374607431768211455");
        expect(result).to.eq(expected);
    });


    it("sqrt works for 2**144", async () => {
        const input = ethers.BigNumber.from(2).pow(144);
        const result = (await fixedPoint.sqrt([input]))[0];
        const expected = ethers.BigNumber.from("340282366920938463463374607431768211456");
        expect(result).to.eq(expected.shr(2).shl(2));
    });


    it("sqrt works for encoded max uint112", async () => {
        const input = ethers.BigNumber.from(2).pow(112).sub(1).mul(Q112);
        const result = (await fixedPoint.sqrt([input]))[0];
        const expected = ethers.BigNumber.from("374144419156711147060143317175368417003121712037887");
        expect(result).to.eq(expected.shr(40).shl(40));
    });

    it("sqrt works for max uint224", async () => {
        const input = ethers.BigNumber.from(2).pow(224).sub(1);
        const result = (await fixedPoint.sqrt([input]))[0];
        const expected = ethers.BigNumber.from("374144419156711147060143317175368453031918731001855");
        expect(result).to.eq(expected.shr(40).shl(40));
    });

});

