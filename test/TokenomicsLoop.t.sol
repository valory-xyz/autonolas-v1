pragma solidity 0.8.17;

import "forge-std/Test.sol";
import "./utils/Utils.sol";
import "../lib/autonolas-governance/contracts/OLAS.sol";
import "../lib/autonolas-governance/contracts/veOLAS.sol";
import "autonolas-tokenomics/Depository.sol";
import "autonolas-tokenomics/Dispenser.sol";
import "autonolas-tokenomics/Tokenomics.sol";
import "autonolas-tokenomics/TokenomicsProxy.sol";
import "autonolas-tokenomics/Treasury.sol";

contract BaseSetup is Test {
    Utils internal utils;
    OLAS internal olas;
    veOLAS internal ve;
    OLAS internal dai;

    address payable[] internal users;
    address internal deployer;
    address internal dev;
    uint256 internal initialMint = 40_000e18;
    uint256 internal largeApproval = 1_000_000e18;

    function setUp() public virtual {
        utils = new Utils();
        users = utils.createUsers(2);
        deployer = users[0];
        vm.label(deployer, "Deployer");
        dev = users[1];
        vm.label(dev, "Developer");

        olas = new OLAS();
        olas.mint(deployer, initialMint);
        dai = new OLAS();
        dai.mint(deployer, initialMint);
    }
}

contract TokenomicsLoopTest is BaseSetup {
    function setUp() public override {
        super.setUp();
    }

    function testTokenomics() public {
        assertEq(olas.balanceOf(deployer), initialMint);
        assertEq(dai.balanceOf(deployer), initialMint);
    }
}
