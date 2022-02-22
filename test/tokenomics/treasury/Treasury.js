const { ethers, waffle, network } = require("hardhat");
const { expect } = require("chai");
//const { FakeContract, smock } = require("@defi-wonderland/smock");

const { utils } = require("ethers");
const { advanceBlock } = require("../utils/advancement");

describe("Treasury", async () => {
    const LARGE_APPROVAL = "100000000000000000000000000000000";
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    // Initial mint for Frax and DAI (10,000,000)
    const initialMint = "10000000000000000000000000";

    const mineBlock = async () => {
        await network.provider.request({
            method: "evm_mine",
            params: [],
        });
    };

    // Calculate index after some number of epochs. Takes principal and rebase rate.
    // TODO verify this works
    const calcIndex = (principal, rate, epochs) => principal * (1 + rate) ** epochs;

    //let deployer, alice, bob, carol;
    let deployer;
    let erc20Factory;
    let olaFactory;
    let treasuryFactory;
    let authFactory;

    let auth;
    let dai;
    let lpToken;
    let ola;
    //let sOhm;
    //let staking;
    let treasury;
    //let distributor;

    /**
     * Everything in this block is only run once before all tests.
     * This is the home for setup methodss
     */
    before(async () => {
        // [deployer, alice, bob, carol] = await ethers.getSigners();
        [deployer] = await ethers.getSigners();
        // use dai as erc20 
        authFactory = await ethers.getContractFactory("OlympusAuthority");
        erc20Factory = await ethers.getContractFactory("DAI");
        olaFactory = await ethers.getContractFactory("OLA");
        treasuryFactory = await ethers.getContractFactory("OlympusTreasury");
    });

    // These should not be in beforeEach.
    beforeEach(async () => {
        //dai = await smock.fake(erc20Factory);
        //lpToken = await smock.fake(erc20Factory);
        dai = await erc20Factory.deploy(0);
        lpToken = await erc20Factory.deploy(0);
        
        auth = await authFactory.deploy(
            deployer.address,
            deployer.address,
            deployer.address,
            deployer.address
        ); // TODO
        ola = await olaFactory.deploy(auth.address);
        treasury = await treasuryFactory.deploy(ola.address, "0", auth.address);
        
        //distributor = await distributorFactory.deploy(
        //    treasury.address,
        //    ohm.address,
        //    staking.address,
        //    auth.address
        //);

        // Setup for each component

        // Needed for treasury deposit
        //await gOhm.migrate(staking.address, sOhm.address);
        await dai.mint(deployer.address, initialMint);
        await dai.approve(treasury.address, LARGE_APPROVAL);

        // Needed to spend deployer's OHM
        //await ohm.approve(staking.address, LARGE_APPROVAL);

        // To get past OLA contract guards
        await auth.pushVault(treasury.address, true);
        
        // Skip original
        // Initialization for sOHM contract.
        // Set index to 10
        //await sOhm.setIndex("10000000000");
        //await sOhm.setgOHM(gOhm.address);
        //await sOhm.initialize(staking.address, treasury.address);

        // Set distributor staking contract
        //await staking.setDistributor(distributor.address);

        // Don't need to disable timelock because disabled by default.

        // toggle reward manager
        await treasury.enable("8", deployer.address, ZERO_ADDRESS);
        // toggle deployer reserve depositor
        await treasury.enable("0", deployer.address, ZERO_ADDRESS);
        // toggle liquidity depositor
        await treasury.enable("4", deployer.address, ZERO_ADDRESS);
        // toggle DAI as reserve token
        await treasury.enable("2", dai.address, ZERO_ADDRESS);
        // set sOHM
        //await treasury.enable("9", sOhm.address, ZERO_ADDRESS);

        // Deposit 10,000 DAI to treasury, 1,000 OHM gets minted to deployer with 9000 as excess reserves (ready to be minted)
        await treasury
            .connect(deployer)
            .deposit("10000000000000000000000", dai.address, "9000000000000");
    });

    it("deposit ok", async () => {
        expect(await treasury.baseSupply()).to.equal("1000000000000");
    })
    
});
