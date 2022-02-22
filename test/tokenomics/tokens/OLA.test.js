/*global describe, context, before, beforeEach, it*/

const { ethers, network } = require("hardhat");
const { expect } = require("chai");

describe("ERC20 OLA with vault", () => {
    let deployer;
    let vault;
    let bob;
    let alice;
    let ola;
    let olaFactory;
    let authFactory;

    before(async () => {
        [deployer, vault, bob, alice] = await ethers.getSigners();

        authFactory = await ethers.getContractFactory("OlympusAuthority");
        olaFactory = await ethers.getContractFactory("OLA");
    });

    beforeEach(async () => {
        [deployer, vault, bob, alice] = await ethers.getSigners();

        const authority = await authFactory.deploy(
            deployer.address,
            deployer.address,
            deployer.address,
            vault.address
        );
        await authority.deployed();

        ola = await olaFactory.deploy(authority.address);
    });

    it("correctly constructs an ERC20", async () => {
        expect(await ola.name()).to.equal("Valory");
        expect(await ola.symbol()).to.equal("OLA");
        expect(await ola.decimals()).to.equal(9);
    });

    describe("mint", () => {
        it("must be done by vault", async () => {
            await expect(ola.connect(deployer).mint(bob.address, 100)).to.be.revertedWith(
                "UNAUTHORIZED"
            );
        });

        it("increases total supply", async () => {
            const supplyBefore = await ola.totalSupply();
            await ola.connect(vault).mint(bob.address, 100);
            expect(supplyBefore.add(100)).to.equal(await ola.totalSupply());
        });
    });

    describe("burn", () => {
        beforeEach(async () => {
            await ola.connect(vault).mint(bob.address, 100);
        });

        it("reduces the total supply", async () => {
            const supplyBefore = await ola.totalSupply();
            await ola.connect(bob).burn(10);
            expect(supplyBefore.sub(10)).to.equal(await ola.totalSupply());
        });

        it("cannot exceed total supply", async () => {
            const supply = await ola.totalSupply();
            await expect(ola.connect(bob).burn(supply.add(1))).to.be.revertedWith(
                "ERC20: burn amount exceeds balance"
            );
        });

        it("cannot exceed bob's balance", async () => {
            await ola.connect(vault).mint(alice.address, 15);
            await expect(ola.connect(alice).burn(16)).to.be.revertedWith(
                "ERC20: burn amount exceeds balance"
            );
        });
    });
});
