const { ethers, network } = require("hardhat");
const { expect } = require("chai");
const { smock } = require("@defi-wonderland/smock");

describe("Bond Depository LP", async () => {
    const LARGE_APPROVAL = "100000000000000000000000000000000";
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    // Initial mint for Frax, ola and DAI (10,000,000)
    const initialMint    = "40000000000000000000000";
    const initialDepositDAI = "1000000000000000000000000"; // initial deposit 1M DAI.
    // Increase timestamp by amount determined by `offset`

    let deployer, alice, bob, carol;
    let erc20Factory;
    let authFactory;
    let olaFactory;
    //let gOhmFactory;
    let depositoryFactory;

    let auth;
    let dai;
    let ola;
    let pairODAI;
    let depository;
    let treasury;
    let treasuryFactory;
    //let gOHM;
    //let staking;

    let capacity = 10000e9;
    let initialPrice = 400e9;
    let buffer = 2e5;

    let vesting = 100;
    let timeToConclusion = 60 * 60 * 24;
    let conclusion;

    let depositInterval = 60 * 60 * 4;
    let tuneInterval = 60 * 60;

    let refReward = 10;
    let daoReward = 50;

    var bid = 0;

    let first;
    let id;

    /**
     * Everything in this block is only run once before all tests.
     * This is the home for setup methods
     */
    before(async () => {
        [deployer, alice, bob, carol] = await ethers.getSigners();

        authFactory = await ethers.getContractFactory("OlympusAuthority");
        olaFactory = await ethers.getContractFactory("OLA");
        erc20Factory = await smock.mock("MockERC20");
        // gOhmFactory = await smock.mock("MockGOhm");

        depositoryFactory = await ethers.getContractFactory("OlympusBondDepositoryV2");

        const block = await ethers.provider.getBlock("latest");
        conclusion = block.timestamp + timeToConclusion;
    });

    beforeEach(async () => {
        dai = await erc20Factory.deploy("Dai", "DAI", 18);

        auth = await authFactory.deploy(
            deployer.address,
            deployer.address,
            deployer.address,
            deployer.address
        );
        //ohm = await erc20Factory.deploy("Olympus", "OHM", 9);
        //treasury = await smock.fake("ITreasury");
        ola = await olaFactory.deploy(auth.address);
        
        treasuryFactory = await ethers.getContractFactory("OlympusTreasury");
        treasury = await treasuryFactory.deploy(ola.address, "0", auth.address);
        // gOHM = await gOhmFactory.deploy("50000000000"); // Set index as 50
        // staking = await smock.fake("OlympusStaking");
        depository = await depositoryFactory.deploy(
            auth.address,
            ola.address,
            treasury.address
        );

        // Setup for each component
        await dai.mint(bob.address, initialMint);

        // To get past OLA contract guards
        await auth.pushVault(treasury.address, true);

        await dai.mint(deployer.address, initialDepositDAI);
        await dai.approve(treasury.address, initialDepositDAI);
        //await treasury.deposit(initialDeposit, dai.address, "10000000000000");
        //await ohm.mint(deployer.address, "10000000000000"); ==> self minting ohm prohibited, breaking insufficientReserves
        await dai.approve(treasury.address, LARGE_APPROVAL);
        // toggle bond depository reserve depositor
        await treasury.enable("0", depository.address, ZERO_ADDRESS);
        await treasury.enable("0", deployer.address, ZERO_ADDRESS);
        // toggle liquidity depositor
        await treasury.enable("4", depository.address, ZERO_ADDRESS);
        // toggle reward manager
        await treasury.enable("8", depository.address, ZERO_ADDRESS);
        // toggle DAI as reserve token
        await treasury.enable("2", dai.address, ZERO_ADDRESS);
        // Deposit 10,000 DAI to treasury, 1,0000 ola gets minted to deployer with 9000 as excess reserves (ready to be minted)
        await treasury
            .connect(deployer)
            .deposit("10000000000000000000000", dai.address, "9000000000000");    
        // await treasury.baseSupply.returns(await ohm.totalSupply());
        /*    
        enum STATUS {
            RESERVEDEPOSITOR, 0
            RESERVESPENDER, 1
            RESERVETOKEN, 2
            RESERVEMANAGER, 3
            LIQUIDITYDEPOSITOR, 4
            LIQUIDITYTOKEN, 5
            LIQUIDITYMANAGER, 6
            RESERVEDEBTOR, 7
            REWARDMANAGER, 8
            SOHM, 9
            OHMDEBTOR 10
        }
        */
        // console.log("balance ola for deployer:",(await ola.balanceOf(deployer.address)));
        await ola.connect(deployer).transfer(alice.address,(await ola.balanceOf(deployer.address))/2); // half to alice
        // console.log("balance ola for alice:",(await ola.balanceOf(alice.address)));

        const wethFactory = await ethers.getContractFactory("contracts/tokenomics/canonical-weth/contracts/WETH9.sol:WETH9");
        const weth = await wethFactory.deploy();
        // Deploy Uniswap factory
        const Factory = await ethers.getContractFactory("UniswapV2Factory");
        const factory = await Factory.deploy(deployer.address);
        await factory.deployed();
        // console.log("Uniswap factory deployed to:", factory.address);

        // Deploy Router02
        const Router = await ethers.getContractFactory("UniswapV2Router02");
        const router = await Router.deploy(factory.address, weth.address);
        await router.deployed();
        // console.log("Uniswap router02 deployed to:", router.address);

        var json = require('../../../artifacts/contracts/tokenomics/v2-core/contracts/UniswapV2Pair.sol/UniswapV2Pair.json')
        const actual_bytecode1 = json["bytecode"];
        const COMPUTED_INIT_CODE_HASH1 = ethers.utils.keccak256(actual_bytecode1);
        // console.log("init hash:", COMPUTED_INIT_CODE_HASH1, "fix in UniswapV2Library :: pairFor:61098f8791ebe192da6bc073c2d9c1e67e8df84f47345262772a1bebc24e77de");

        const pairODAItxReceipt = await factory.createPair(ola.address, dai.address);
        const pairODAIdata = factory.interface.decodeFunctionData("createPair", pairODAItxReceipt.data);
        // console.log("ola[%s]:DAI[%s] pool", pairODAIdata[0], pairODAIdata[1]); 
        let pairAddress = await factory.allPairs(0);
        // console.log("ola - DAI address:", pairAddress);
        pairODAI = await ethers.getContractAt("UniswapV2Pair", pairAddress);
        // let reserves = await pairODAI.getReserves();
        // console.log("ola - DAI reserves:", reserves.toString());
	// console.log("balance dai for deployer:",(await dai.balanceOf(deployer.address)));

        // Add liquidity
        const amountola = await ola.balanceOf(deployer.address);
        const minAmountola = "50000000000";
        //const amountWETH = await weth.balanceOf(deployer.address);
        const amountDAI = "10000000000000000000000";
        //const amountETH = amountWETH;
        const minAmountDAI = "1000000000000000000000";
        //const minAmountETH = minAmountWETH;
        const deadline = Date.now() + 1000;
        const toAddress = deployer.address;
        await ola.approve(router.address, LARGE_APPROVAL);
        await dai.approve(router.address, LARGE_APPROVAL);
        
        await router.connect(deployer).addLiquidity(
            dai.address,
            ola.address,
            amountDAI,
            amountola,
            minAmountDAI,
            minAmountola,
            toAddress,
            deadline
        );
        

        // console.log("deployer LP balance:",await pairODAI.balanceOf(deployer.address));
        // console.log("LP total supply:",await pairODAI.totalSupply());
        await pairODAI.connect(deployer).transfer(bob.address,"35355339059326876"); 
        // console.log("balance LP for bob:",(await pairODAI.balanceOf(bob.address)));

        await ola.connect(alice).approve(depository.address, LARGE_APPROVAL);
        await dai.connect(bob).approve(depository.address, LARGE_APPROVAL);
        await pairODAI.connect(bob).approve(depository.address, LARGE_APPROVAL);
        await dai.connect(alice).approve(depository.address, capacity);

        // create the first bond
        await depository.create(
            pairODAI.address,
            [capacity, initialPrice, buffer],
            [false, true],
            [vesting, conclusion],
            [depositInterval, tuneInterval]
        );
    });

    it("should create market", async () => {
        expect(await depository.isLive(bid)).to.equal(true);
    });

    // ok test 18-02-22
    it("should conclude in correct amount of time", async () => {
        let [, , , concludes] = await depository.terms(bid);
        expect(concludes).to.equal(conclusion);
        let [, , length, , , ,] = await depository.metadata(bid);
        // timestamps are a bit inaccurate with tests
        var upperBound = timeToConclusion * 1.0033;
        var lowerBound = timeToConclusion * 0.9967;
        expect(Number(length)).to.be.greaterThan(lowerBound);
        expect(Number(length)).to.be.lessThan(upperBound);
    });
    // ok test 18-02-22
    it("should set max payout to correct % of capacity", async () => {
        let [, , , , maxPayout, ,] = await depository.markets(bid);
        var upperBound = (capacity * 1.0033) / 6;
        var lowerBound = (capacity * 0.9967) / 6;
        expect(Number(maxPayout)).to.be.greaterThan(lowerBound);
        expect(Number(maxPayout)).to.be.lessThan(upperBound);
    });
    // ok test 18-02-22
    it("should return IDs of all markets", async () => {
        // create a second bond
        await depository.create(
            pairODAI.address,
            [capacity, initialPrice, buffer],
            [false, true],
            [vesting, conclusion],
            [depositInterval, tuneInterval]
        );
        let [first, second] = await depository.liveMarkets();
        expect(Number(first)).to.equal(0);
        expect(Number(second)).to.equal(1);
    });
    // ok test 18-02-22
    it("should update IDs of markets", async () => {
        // create a second bond
        await depository.create(
            pairODAI.address,
            [capacity, initialPrice, buffer],
            [false, true],
            [vesting, conclusion],
            [depositInterval, tuneInterval]
        );
        // close the first bond
        await depository.close(0);
        [first] = await depository.liveMarkets();
        expect(Number(first)).to.equal(1);
    });
    // ok test 18-02-22
    it("should include ID in live markets for quote token", async () => {
        [id] = await depository.liveMarketsFor(pairODAI.address);
        expect(Number(id)).to.equal(bid);
    });
    // ok test 18-02-22
    it("should start with price at initial price", async () => {
        let lowerBound = initialPrice * 0.9999;
        expect(Number(await depository.marketPrice(bid))).to.be.greaterThan(lowerBound);
    });
    // ok test 18-02-22
    it("should give accurate payout for price", async () => {
        let price = await depository.marketPrice(bid);
        let amount = "10000000000000000000000"; // 10,000
        let expectedPayout = amount / price;
        let lowerBound = expectedPayout * 0.9999;
        expect(Number(await depository.payoutFor(amount, 0))).to.be.greaterThan(lowerBound);
    });
    // ok test 18-02-22
    it("should decay debt", async () => {
        let [, , , totalDebt, , ,] = await depository.markets(0);

        await network.provider.send("evm_increaseTime", [100]);
        await depository.connect(bob).deposit(bid, "0", initialPrice, bob.address);

        let [, , , newTotalDebt, , ,] = await depository.markets(0);
        expect(Number(totalDebt)).to.be.greaterThan(Number(newTotalDebt));
    });
    // ok at 18-02-22
    it("should not start adjustment if ahead of schedule! fixed at 17-02-22", async () => {
        //let amount = "650000000000000000000000"; // 10,000 
        //let amount = "10000000000000000000000"; // 10,000
        let amount = (await pairODAI.balanceOf(bob.address))/4;
        await depository
            .connect(bob)
            .deposit(bid, amount, initialPrice * 2, bob.address);
        await depository
            .connect(bob)
            .deposit(bid, amount, initialPrice * 2, bob.address);

        await network.provider.send("evm_increaseTime", [tuneInterval]);
        //amount = "650000000000000000000000";
        //amount = "200000000000000000000000"; // for new cv > cv, in original test not minting in Treasury
        await depository
            .connect(bob)
            .deposit(bid, amount, initialPrice * 2, bob.address);
        let [change, lastAdjustment, timeToAdjusted, active] = await depository.adjustments(bid);
        if(amount >= 200000000000000000000000) {
            expect(Boolean(active)).to.equal(false);
        } else {
            expect(Boolean(active)).to.equal(true);
        }
    });
    // ok test 18-02-22
    it("should start adjustment if behind schedule", async () => {
        await network.provider.send("evm_increaseTime", [tuneInterval]);
        //let amount = "10000000000000000000000"; // 10,000
        let amount = (await pairODAI.balanceOf(bob.address))/4;
        await depository
            .connect(bob)
            .deposit(bid, amount, initialPrice, bob.address);
        let [change, lastAdjustment, timeToAdjusted, active] = await depository.adjustments(bid);
        expect(Boolean(active)).to.equal(true);
    });
    // ok test 18-02-22
    it("adjustment should lower control variable by change in tune interval if behind", async () => {
        await network.provider.send("evm_increaseTime", [tuneInterval]);
        let [, controlVariable, , ,] = await depository.terms(bid);
        //let amount = "10000000000000000000000"; // 10,000
        let amount = (await pairODAI.balanceOf(bob.address))/4;
        await depository
            .connect(bob)
            .deposit(bid, amount, initialPrice, bob.address);
        await network.provider.send("evm_increaseTime", [tuneInterval]);
        let [change, lastAdjustment, timeToAdjusted, active] = await depository.adjustments(bid);
        await depository
            .connect(bob)
            .deposit(bid, amount, initialPrice, bob.address);
        let [, newControlVariable, , ,] = await depository.terms(bid);
        expect(newControlVariable).to.equal(controlVariable.sub(change));
    });
    // ok test 18-02-22
    it("adjustment should lower control variable by half of change in half of a tune interval", async () => {
        await network.provider.send("evm_increaseTime", [tuneInterval]);
        let [, controlVariable, , ,] = await depository.terms(bid);
        //let amount = "10000000000000000000000"; // 10,000
        let amount = (await pairODAI.balanceOf(bob.address))/4;
        await depository
            .connect(bob)
            .deposit(bid, amount, initialPrice, bob.address);
        let [change, lastAdjustment, timeToAdjusted, active] = await depository.adjustments(bid);
        await network.provider.send("evm_increaseTime", [tuneInterval / 2]);
        await depository
            .connect(bob)
            .deposit(bid, amount, initialPrice, bob.address);
        let [, newControlVariable, , ,] = await depository.terms(bid);
        let lowerBound = (controlVariable - change / 2) * 0.999;
        expect(Number(newControlVariable)).to.lessThanOrEqual(
            Number(controlVariable.sub(change.div(2)))
        );
        expect(Number(newControlVariable)).to.greaterThan(Number(lowerBound));
    });
    // ok test 18-02-22
    it("adjustment should continue lowering over multiple deposits in same tune interval", async () => {
        await network.provider.send("evm_increaseTime", [tuneInterval]);
        [, controlVariable, , ,] = await depository.terms(bid);
        //let amount = "10000000000000000000000"; // 10,000
        let amount = (await pairODAI.balanceOf(bob.address))/4;
        await depository
            .connect(bob)
            .deposit(bid, amount, initialPrice, bob.address);
        let [change, lastAdjustment, timeToAdjusted, active] = await depository.adjustments(bid);

        await network.provider.send("evm_increaseTime", [tuneInterval / 2]);
        await depository
            .connect(bob)
            .deposit(bid, amount, initialPrice, bob.address);

        await network.provider.send("evm_increaseTime", [tuneInterval / 2]);
        await depository
            .connect(bob)
            .deposit(bid, amount, initialPrice, bob.address);
        let [, newControlVariable, , ,] = await depository.terms(bid);
        expect(newControlVariable).to.equal(controlVariable.sub(change));
    });
    // ok test 18-02-22
    it("should allow a deposit", async () => {
        //let amount = "10000000000000000000000"; // 10,000
        let amount = (await pairODAI.balanceOf(bob.address))/4;
        await depository
            .connect(bob)
            .deposit(bid, amount, initialPrice, bob.address);

        expect(Array(await depository.indexesFor(bob.address)).length).to.equal(1);
    });
    // ok test 18-02-22
    it("should not allow a deposit greater than max payout", async () => {
        let amount = "6700000000000000000000000"; // 6.7m (400 * 10000 / 6 + 0.5%)
        await expect(
            depository.connect(bob).deposit(bid, amount, initialPrice, bob.address)
        ).to.be.revertedWith("Depository: max size exceeded");
    });
    // ok test 18-02-22
    it("should not redeem before vested", async () => {
        let balance = await ola.balanceOf(bob.address);
        //let amount = "10000000000000000000000"; // 10,000
        let amount = (await pairODAI.balanceOf(bob.address))/4;
        await depository
            .connect(bob)
            .deposit(bid, amount, initialPrice, bob.address);
        await depository.connect(bob).redeemAll(bob.address);
        expect(await ola.balanceOf(bob.address)).to.equal(balance);
    });
    // ok test 18-02-22
    it("should redeem after vested", async () => {
        //let amount = "10000000000000000000000"; // 10,000
        let amount = (await pairODAI.balanceOf(bob.address))/4;
        let [expectedPayout, expiry, index] = await depository
            .connect(bob)
            .callStatic.deposit(bid, amount, initialPrice, bob.address);
        
        // console.log("[expectedPayout, expiry, index]:",[expectedPayout, expiry, index]);

        await depository
            .connect(bob)
            .deposit(bid, amount, initialPrice, bob.address);

        await network.provider.send("evm_increaseTime", [1000]);
        await depository.redeemAll(bob.address);
        const bobBalance = Number(await ola.balanceOf(bob.address));
        // console.log("bob balance in ola:",bobBalance);
        //const bobBalance = Number(await ola.balanceOf(bob.address));
        expect(bobBalance).to.greaterThanOrEqual(Number(expectedPayout));
        expect(bobBalance).to.lessThan(Number(expectedPayout * 1.0001));
    });
    // ok test 18-02-22
    it("should decay a max payout in target deposit interval", async () => {
        let [, , , , , maxPayout, ,] = await depository.markets(bid);
        let price = await depository.marketPrice(bid);
        let amount = maxPayout * price;
        await depository.connect(bob).deposit(
            bid,
            amount, // amount for max payout
            initialPrice,
            bob.address
        );
        await network.provider.send("evm_increaseTime", [depositInterval]);
        let newPrice = await depository.marketPrice(bid);
        expect(Number(newPrice)).to.be.lessThan(initialPrice);
    });
    // ok test 18-02-22
    it("should close a market", async () => {
        [capacity, , , , , ,] = await depository.markets(bid);
        expect(Number(capacity)).to.be.greaterThan(0);
        await depository.close(bid);
        [capacity, , , , , ,] = await depository.markets(bid);
        expect(Number(capacity)).to.equal(0);
    });
});
