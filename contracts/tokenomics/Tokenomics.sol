// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "../interfaces/IOLA.sol";
import "../interfaces/IService.sol";
import "../interfaces/ITreasury.sol";
import "../interfaces/IErrors.sol";
import "../interfaces/IStructs.sol";
import "../interfaces/IVotingEscrow.sol";

/// @title Tokenomics - Smart contract for store/interface for key tokenomics params
/// @author AL
/// @author Aleksandr Kuperman - <aleksandr.kuperman@valory.xyz>
contract Tokenomics is IErrors, IStructs, Ownable {
    using FixedPoint for *;

    event TreasuryUpdated(address treasury);
    event DepositoryUpdated(address depository);
    event DispenserUpdated(address dispenser);
    event VotingEscrowUpdated(address ve);
    event EpochLengthUpdated(uint256 epochLength);

    // OLA token address
    address public immutable ola;
    // Treasury contract address
    address public treasury;
    // Depository contract address
    address public depository;
    // Dispenser contract address
    address public dispenser;
    // Voting Escrow address
    address public ve;

    bytes4  private constant FUNC_SELECTOR = bytes4(keccak256("kLast()")); // is pair or pure ERC20?
    // Epoch length in block numbers
    uint256 public epochLen;
    // Global epoch counter
    uint256 public epochCounter = 1;
    // source: https://github.com/compound-finance/open-oracle/blob/d0a0d0301bff08457d9dfc5861080d3124d079cd/contracts/Uniswap/UniswapLib.sol#L27 
    // 2^(112 - log2(1e18))
    uint256 public constant MAGIC_DENOMINATOR =  5192296858534816;
    uint256 public constant INITIAL_DF = (110 * 1e18) / 100; // 10% with 18 decimals
    uint256 public maxBond = 2_000_000 * 1e18; // 2M OLA with 18 decimals
    // Default epsilon of 200% rounded with epsilon of 1e13 (100% is a factor of 2)
    uint256 public epsilon = 3 * 1e18 + 1e13;

    // UCFc / UCFa weights for the UCF contribution
    uint256 ucfcWeight = 1;
    uint256 ucfaWeight = 1;

    // Total service revenue per epoch: sum(r(s))
    uint256 public epochServiceRevenueETH;
    // Donation balance
    uint256 public donationBalanceETH;

    // Staking parameters with multiplying by 100
    // treasuryFraction + componentFraction + agentFraction + stakerFraction = 100%
    uint256 public treasuryFraction = 0;
    uint256 public stakerFraction = 50;
    uint256 public componentFraction = 33;
    uint256 public agentFraction = 17;

    //Discount Factor v2
    //Bond(t)
    uint256 private _bondPerEpoch;
    // MaxBond(e) - sum(BondingProgram)
    uint256 private _bondLeft = maxBond;

    // Component Registry
    address public immutable componentRegistry;
    // Agent Registry
    address public immutable agentRegistry;
    // Service Registry
    address payable public immutable serviceRegistry;

    // Inflation caps for the first ten years
    uint256[] public inflationCaps;
    // Set of protocol-owned services in current epoch
    uint256[] public protocolServiceIds;
    // Mapping of epoch => point
    mapping(uint256 => PointEcomonics) public mapEpochEconomics;
    // Map of service Ids and their amounts in current epoch
    mapping(uint256 => uint256) public mapServiceAmounts;
    // Mapping of owner of component / agent address => reward amount
    mapping(address => uint256) public mapOwnerRewards;
    // Map of whitelisted service owners
    mapping(address => bool) private _mapServiceOwners;

    // TODO sync address constants with other contracts
    address public constant ETH_TOKEN_ADDRESS = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    constructor(address _ola, address _treasury, address _depository, address _dispenser, address _ve, uint256 _epochLen,
        address _componentRegistry, address _agentRegistry, address payable _serviceRegistry)
    {
        ola = _ola;
        treasury = _treasury;
        depository = _depository;
        dispenser = _dispenser;
        ve = _ve;
        epochLen = _epochLen;
        componentRegistry = _componentRegistry;
        agentRegistry = _agentRegistry;
        serviceRegistry = _serviceRegistry;

        inflationCaps = new uint[](10);
        inflationCaps[0] = 520_000_000e18;
        inflationCaps[1] = 590_000_000e18;
        inflationCaps[2] = 660_000_000e18;
        inflationCaps[3] = 730_000_000e18;
        inflationCaps[4] = 790_000_000e18;
        inflationCaps[5] = 840_000_000e18;
        inflationCaps[6] = 890_000_000e18;
        inflationCaps[7] = 930_000_000e18;
        inflationCaps[8] = 970_000_000e18;
        inflationCaps[9] = 1_000_000_000e18;
    }

    // Only the manager has a privilege to manipulate a tokenomics
    modifier onlyTreasury() {
        if (treasury != msg.sender) {
            revert ManagerOnly(msg.sender, treasury);
        }
        _;
    }

    // Only the manager has a privilege to manipulate a tokenomics
    modifier onlyDepository() {
        if (depository != msg.sender) {
            revert ManagerOnly(msg.sender, depository);
        }
        _;
    }

    // Only the manager has a privilege to manipulate a tokenomics
    modifier onlyDispenser() {
        if (dispenser != msg.sender) {
            revert ManagerOnly(msg.sender, dispenser);
        }
        _;
    }

    /// @dev Changes treasury address.
    function changeTreasury(address newTreasury) external onlyOwner {
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    /// @dev Changes treasury address.
    function changeDepository(address newDepository) external onlyOwner {
        depository = newDepository;
        emit DepositoryUpdated(newDepository);
    }

    /// @dev Changes treasury address.
    function changeDispenser(address newDispenser) external onlyOwner {
        dispenser = newDispenser;
        emit DispenserUpdated(newDispenser);
    }

    /// @dev Changes voting escrow address.
    function changeVotingEscrow(address newVE) external onlyOwner {
        ve = newVE;
        emit VotingEscrowUpdated(newVE);
    }

    /// @dev Changes epoch length.
    /// @param newEpochLen New epoch length.
    function changeEpochLength(uint256 newEpochLen) external onlyOwner {
        epochLen = newEpochLen;
        emit EpochLengthUpdated(newEpochLen);
    }

    /// @dev Gets the current epoch number.
    /// @return Current epoch number.
    function getCurrentEpoch() external view returns (uint256) {
        return epochCounter;
    }

    /// @dev Changes tokenomics parameters.
    /// @param _ucfcWeight UCFc weighs for the UCF contribution.
    /// @param _ucfaWeight UCFa weight for the UCF contribution.
    /// @param _maxBond MaxBond OLA, 18 decimals
    function changeTokenomicsParameters(
        uint256 _ucfcWeight,
        uint256 _ucfaWeight,
        uint256 _maxBond
    ) external onlyOwner {
        ucfcWeight = _ucfcWeight;
        ucfaWeight = _ucfaWeight;
        // take into account the change during the epoch
        if(_maxBond > maxBond) {
            uint256 delta = _maxBond - maxBond;
            _bondLeft += delta; 
        }
        if(_maxBond < maxBond) {
            uint256 delta = maxBond - _maxBond;
            if(delta < _bondLeft) {
                _bondLeft -= delta;
            } else {
                _bondLeft = 0;
            }
        }
        maxBond = _maxBond;
    }

    /// @dev Sets staking parameters in fractions of distributed rewards.
    /// @param _stakerFraction Fraction for stakers.
    /// @param _componentFraction Fraction for component owners.
    function changeRewardFraction(
        uint256 _treasuryFraction,
        uint256 _stakerFraction,
        uint256 _componentFraction,
        uint256 _agentFraction
    ) external onlyOwner {
        // Check that the sum of fractions is 100%
        if (_treasuryFraction + _stakerFraction + _componentFraction + _agentFraction != 100) {
            revert WrongAmount(_treasuryFraction + _stakerFraction + _componentFraction + _agentFraction, 100);
        }

        treasuryFraction = _treasuryFraction;
        stakerFraction = _stakerFraction;
        componentFraction = _componentFraction;
        agentFraction = _agentFraction;
    }

    function changeServiceOwnerWhiteList(address[] memory accounts, bool[] memory permissions) external onlyOwner {
        uint256 numAccounts = accounts.length;
        // Check the array size
        if (permissions.length != numAccounts) {
            revert WrongArrayLength(numAccounts, permissions.length);
        }
        for (uint256 i = 0; i < numAccounts; ++i) {
            _mapServiceOwners[accounts[i]] = permissions[i];
        }
    }

    /// @dev Checks for the OLA minting ability WRT the inflation schedule.
    /// @param amount Amount of requested OLA tokens to mint.
    /// @return True if the mint is allowed.
    function isAllowedMint(uint256 amount) public returns (bool) {
        // OLA token time launch
        uint256 timeLaunch = IOLA(ola).timeLaunch();
        // One year of time
        uint256 oneYear = 1 days * 365;
        // Current year
        uint256 numYear = (block.timestamp - timeLaunch) / oneYear;
        // OLA token supply to-date
        uint256 supply = IERC20(ola).totalSupply();
        // For the first 10 years we check the inflation cap that is pre-defined
        if (numYear < 10) {
            if (supply + amount <= inflationCaps[numYear]){
                return true;
            } else {
                return false;
            }
        } else {
            return IOLA(ola).inflationControl(amount);
        }
    }

    /// @dev take into account the bonding program in this epoch. 
    /// @dev programs exceeding the limit in the epoch are not allowed
    function allowedNewBond(uint256 amount) external onlyDepository returns (bool)  {
        if(_bondLeft >= amount && isAllowedMint(amount)) {
            _bondLeft -= amount;
            return true;
        }
        return false;
    }

    /// @dev take into account materialization OLA per Depository.deposit() for currents program
    function usedBond(uint256 payout) external onlyDepository {
        _bondPerEpoch += payout;
    }

    /// @dev Tracks the deposit token amount during the epoch.
    function trackServicesETHRevenue(uint256[] memory serviceIds, uint256[] memory amounts) public onlyTreasury
        returns (uint256 revenueETH, uint256 donationETH)
    {
        // Loop over service Ids and track their amounts
        uint256 numServices = serviceIds.length;
        for (uint256 i = 0; i < numServices; ++i) {
            // Check for the service Id existence
            if (!IService(serviceRegistry).exists(serviceIds[i])) {
                revert ServiceDoesNotExist(serviceIds[i]);
            }
            // Check for the whitelisted service owner
            address owner = IERC721Enumerable(serviceRegistry).ownerOf(serviceIds[i]);
            // If not, accept it as donation
            if (!_mapServiceOwners[owner]) {
                donationETH += amounts[i];
            } else {
                // Add a new service Id to the set of Ids if one was not currently in it
                if (mapServiceAmounts[serviceIds[i]] == 0) {
                    protocolServiceIds.push(serviceIds[i]);
                }
                mapServiceAmounts[serviceIds[i]] += amounts[i];
                revenueETH += amounts[i];
            }
        }
        // Increase the total service revenue per epoch and donation balance
        epochServiceRevenueETH += revenueETH;
        donationBalanceETH += donationETH;
    }

    /// @dev Detect UniswapV2Pair
    /// @param _token Address of a _token. Possible LP or ERC20
    function callDetectPair(address _token) public returns (bool) {
        bool success;
        bytes memory data = abi.encodeWithSelector(FUNC_SELECTOR);
        assembly {
            success := call(
                5000,           // 5k gas
                _token,         // destination address
                0,              // no ether
                add(data, 32),  // input buffer (starts after the first 32 bytes in the `data` array)
                mload(data),    // input length (loaded from the first 32 bytes in the `data` array)
                0,              // output buffer
                0               // output length
            )
        }
        return success;
    }

    /// @dev Calculates tokenomics for components / agents of protocol-owned services.
    /// @param registry Address of a component / agent registry contract.
    /// @param unitRewards Component / agent allocated rewards.
    function _calculateUnitTokenomics(address registry, uint256 unitRewards) private
        returns (PointUnits memory ucfu)
    {
        uint256 numServices = protocolServiceIds.length;

        // TODO Possible optimization is to store a set of componets / agents and the map of those used in protocol-owned services
        ucfu.numUnits = IERC721Enumerable(registry).totalSupply();
        // Set of agent revenues UCFu-s. Agent / component Ids start from "1", so the index can be equal to the set size
        uint256[] memory ucfuRevs = new uint256[](ucfu.numUnits + 1);
        // Set of agent revenues UCFu-s divided by the cardinality of agent Ids in each service
        uint256[] memory ucfus = new uint256[](numServices);
        // Overall profits of UCFu-s
        uint256 sumProfits = 0;

        // Loop over profitable service Ids to calculate initial UCFu-s
        for (uint256 i = 0; i < numServices; ++i) {
            uint256 serviceId = protocolServiceIds[i];
            uint256 numServiceUnits;
            uint256[] memory unitIds;
            if (registry == componentRegistry) {
                (numServiceUnits, unitIds) = IService(serviceRegistry).getComponentIdsOfServiceId(serviceId);
            } else {
                (numServiceUnits, unitIds) = IService(serviceRegistry).getAgentIdsOfServiceId(serviceId);
            }
            // Add to UCFa part for each agent Id
            for (uint256 j = 0; j < numServiceUnits; ++j) {
                // Convert revenue to OLA
                uint256 amountOLA = _getExchangeAmountOLA(ETH_TOKEN_ADDRESS, mapServiceAmounts[serviceId]);
                ucfuRevs[unitIds[j]] += amountOLA;
                sumProfits += amountOLA;
            }
        }

        // Calculate all complete UCFu-s divided by the cardinality of agent Ids in each service
        for (uint256 i = 0; i < numServices; ++i) {
            uint256 serviceId = protocolServiceIds[i];
            uint256 numServiceUnits;
            uint256[] memory unitIds;
            if (registry == componentRegistry) {
                (numServiceUnits, unitIds) = IService(serviceRegistry).getComponentIdsOfServiceId(serviceId);
            } else {
                (numServiceUnits, unitIds) = IService(serviceRegistry).getAgentIdsOfServiceId(serviceId);
            }
            for (uint256 j = 0; j < numServiceUnits; ++j) {
                // Sum(UCFa[i]) / |As(epoch)|
                ucfus[i] += ucfuRevs[unitIds[j]];
            }
            ucfus[i] /= numServiceUnits;
        }

        // Calculate component / agent related values
        for (uint256 i = 0; i < ucfu.numUnits; ++i) {
            // Get the agent Id from the index list
            uint256 agentId = IERC721Enumerable(registry).tokenByIndex(i);
            if (ucfuRevs[agentId] > 0) {
                // Add address of a profitable component owner
                address owner = IERC721Enumerable(registry).ownerOf(agentId);
                // Increase a profitable agent number
                ++ucfu.numProfitableUnits;
                // Calculate agent rewards
                mapOwnerRewards[owner] += unitRewards * ucfuRevs[agentId] / sumProfits;
            }
        }

        // Calculate total UCFu
        for (uint256 i = 0; i < numServices; ++i) {
            ucfu.ucfuSum += ucfus[i];
        }
        // Record unit rewards
        ucfu.unitRewards = unitRewards;
    }

    /// @dev calc df by WD Math formula UCF, USF, DF v2
    /// @param dcm direct contribution measure DCM(t) by first version
    function _calculateDF(FixedPoint.uq112x112 memory dcm) internal view returns (FixedPoint.uq112x112 memory df) {
        df = FixedPoint.fraction(1, 1);
    }

    /// @dev Sums two fixed points.
    function _add(FixedPoint.uq112x112 memory x, FixedPoint.uq112x112 memory y) private pure
        returns (FixedPoint.uq112x112 memory r)
    {
        uint224 z = x._x + y._x;
        if(x._x > 0 && y._x > 0) assert(z > x._x && z > y._x);
        return FixedPoint.uq112x112(uint224(z));
    }

    /// @dev Pow of a fixed point.
    function _pow(FixedPoint.uq112x112 memory a, uint b) internal pure returns (FixedPoint.uq112x112 memory c) {
        if(b == 0) {
            return FixedPoint.fraction(1, 1);
        }

        if(b == 1) {
            return a;
        }

        c = FixedPoint.fraction(1, 1);
        while(b > 0) {
            // b % 2
            if((b & 1) == 1) {
                c = c.muluq(a);
            }
            a = a.muluq(a);
            // b = b / 2;
            b >>= 1;
        }
        return c;
    }

    /// @dev Clears necessary data structures for the next epoch.
    function _clearEpochData() internal {
        uint256 numServices = protocolServiceIds.length;
        for (uint256 i = 0; i < numServices; ++i) {
            delete mapServiceAmounts[protocolServiceIds[i]];
        }
        delete protocolServiceIds;
        epochServiceRevenueETH = 0;
        // clean bonding data
        _bondLeft = maxBond;
        _bondPerEpoch = 0;
    }

    /// @dev Record global data to the checkpoint
    function checkpoint() external onlyTreasury {
        PointEcomonics memory lastPoint = mapEpochEconomics[epochCounter - 1];
        // New point can be calculated only if we passed number of blocks equal to the epoch length
        if (block.number > lastPoint.blockNumber) {
            uint256 diffNumBlocks = block.number - lastPoint.blockNumber;
            if (diffNumBlocks >= epochLen) {
                _checkpoint();
            }
        }
    }

    /// @dev Record global data to new checkpoint
    function _checkpoint() internal {
        FixedPoint.uq112x112 memory _ucf;
        FixedPoint.uq112x112 memory _usf;
        FixedPoint.uq112x112 memory _dcm;
        // df = 1/(1 + iterest_rate) by documantation, reverse_df = 1/df >= 1.0.
        FixedPoint.uq112x112 memory _df;

        // Get total amount of OLA as profits for rewards, and all the rewards categories
        // 0: total rewards, 1: treasuryRewards, 2: staterRewards, 3: componentRewards, 4: agentRewards
        uint256[] memory rewards = new uint256[](5);
        rewards[0] = _getExchangeAmountOLA(ETH_TOKEN_ADDRESS, epochServiceRevenueETH);
        rewards[1] = rewards[0] * treasuryFraction / 100;
        rewards[2] = rewards[0] * stakerFraction / 100;
        rewards[3] = rewards[0] * componentFraction / 100;
        rewards[4] = rewards[0] * agentFraction / 100;

        // Calculate UCFc, UCFa and rewards allocated from them
        PointUnits memory ucfc;
        PointUnits memory ucfa;
        if (rewards[0] > 0) {
            // Calculate total UCFc
            uint256 numComponents = IERC721Enumerable(componentRegistry).totalSupply();
            // TODO If there are no components, all their part of rewards go to treasury
            if (numComponents == 0) {
                rewards[1] += rewards[3];
            } else {
                ucfc = _calculateUnitTokenomics(componentRegistry, rewards[3]);
            }
            ucfc.ucfWeight = ucfcWeight;

            // Calculate total UCFa
            ucfa = _calculateUnitTokenomics(agentRegistry, rewards[4]);
            ucfa.ucfWeight = ucfaWeight;
        }

        // DF calculation
        _df = _calculateDF(_dcm);

        uint256 numServices = protocolServiceIds.length;
        PointEcomonics memory newPoint = PointEcomonics(ucfc, ucfa, _df, numServices, rewards[1], rewards[2],
            donationBalanceETH, block.timestamp, block.number);
        mapEpochEconomics[epochCounter] = newPoint;
        epochCounter++;

        _clearEpochData();
    }

    // @dev Calculates the amount of OLA tokens based on LP (see the doc for explanation of price computation). Any can do it
    /// @param token Token address.
    /// @param tokenAmount Token amount.
    /// @param epoch epoch number
    /// @return resAmount Resulting amount of OLA tokens.
    function calculatePayoutFromLP(address token, uint256 tokenAmount, uint256 epoch) external view
        returns (uint256 resAmount)
    {
        uint256 df;
        PointEcomonics memory _PE;
        // avoid start checkpoint from calculatePayoutFromLP
        for (uint256 i = epoch + 1; i > 0; i--) {
            _PE = mapEpochEconomics[i - 1];
            // if current point undefined, so calculatePayoutFromLP called before mined tx(checkpoint)
            if(_PE.blockNumber > 0) {
                df = uint256(_PE.df._x / MAGIC_DENOMINATOR);
                break;
            }
        }
        if(df > 0) {
            resAmount = _calculatePayoutFromLP(token, tokenAmount, df);
        } else {
            // if df undefined in points
            resAmount = _calculatePayoutFromLP(token, tokenAmount, INITIAL_DF);
        }
    }

    /// @dev Calculates the amount of OLA tokens based on LP (see the doc for explanation of price computation).
    /// @param token Token address.
    /// @param amount Token amount.
    /// @param df Discount
    /// @return resAmount Resulting amount of OLA tokens.
    function _calculatePayoutFromLP(address token, uint256 amount, uint256 df) internal view
        returns (uint256 resAmount)
    {
        // Calculation of removeLiquidity
        IUniswapV2Pair pair = IUniswapV2Pair(address(token));
        address token0 = pair.token0();
        address token1 = pair.token1();
        uint256 balance0 = IERC20(token0).balanceOf(address(pair));
        uint256 balance1 = IERC20(token1).balanceOf(address(pair));
        uint256 totalSupply = pair.totalSupply();

        // Using balances ensures pro-rate distribution
        uint256 amount0 = (amount * balance0) / totalSupply;
        uint256 amount1 = (amount * balance1) / totalSupply;

        require(balance0 > amount0, "UniswapV2: INSUFFICIENT_LIQUIDITY token0");
        require(balance1 > amount1, "UniswapV2: INSUFFICIENT_LIQUIDITY token1");

        // Get the initial OLA token amounts
        uint256 amountOLA = (token0 == ola) ? amount0 : amount1;
        uint256 amountPairForOLA = (token0 == ola) ? amount1 : amount0;

        // Calculate swap tokens from the LP back to the OLA token
        balance0 -= amount0;
        balance1 -= amount1;
        uint256 reserveIn = (token0 == ola) ? balance1 : balance0;
        uint256 reserveOut = (token0 == ola) ? balance0 : balance1;
        
        amountOLA = amountOLA + getAmountOut(amountPairForOLA, reserveIn, reserveOut);

        // The resulting DF amount cannot be bigger than the maximum possible one
        if (df > epsilon) {
            revert AmountLowerThan(epsilon, df);
        }

        // Get the resulting amount in OLA tokens
        resAmount = (amountOLA * df) / 1e18; // df with decimals 18

        // The discounted amount cannot be smaller than the actual one
        if (resAmount < amountOLA) {
            revert AmountLowerThan(resAmount, amountOLA);
        }
    }

    // UniswapV2 https://github.com/Uniswap/v2-periphery/blob/master/contracts/libraries/UniswapV2Library.sol
    // No license in file
    // forked for Solidity 8.x
    // given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset

    /// @dev Gets the additional OLA amount from the LP pair token by swapping.
    /// @param amountIn Initial OLA token amount.
    /// @param reserveIn Token amount that is not OLA.
    /// @param reserveOut Token amount in OLA wit fees.
    /// @return amountOut Resulting OLA amount.
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) internal pure
        returns (uint256 amountOut)
    {
        require(amountIn > 0, "UniswapV2Library: INSUFFICIENT_INPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "UniswapV2Library: INSUFFICIENT_LIQUIDITY");

        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee / reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        amountOut = numerator / denominator;
    }

    /// @dev get Point by epoch
    /// @param epoch number of a epoch
    /// @return _PE raw point
    function getPoint(uint256 epoch) public view returns (PointEcomonics memory _PE) {
        _PE = mapEpochEconomics[epoch];
    }

    /// @dev Get last epoch Point.
    function getLastPoint() external view returns (PointEcomonics memory _PE) {
        _PE = mapEpochEconomics[epochCounter - 1];
    }

    // decode a uq112x112 into a uint with 18 decimals of precision (cycle into the past), INITIAL_DF if not exist
    function getDF(uint256 epoch) public view returns (uint256 df) {
        PointEcomonics memory _PE;
        for (uint256 i = epoch + 1; i > 0; i--) {
            _PE = mapEpochEconomics[i - 1];
            // if current point undefined, so getDF called before mined tx(checkpoint)
            if(_PE.blockNumber > 0) {
                // https://github.com/compound-finance/open-oracle/blob/d0a0d0301bff08457d9dfc5861080d3124d079cd/contracts/Uniswap/UniswapLib.sol#L27
                // a/b is encoded as (a << 112) / b or (a * 2^112) / b
                df = uint256(_PE.df._x / MAGIC_DENOMINATOR);
                break;
            }
        }
        if (df == 0) {
            df = INITIAL_DF;
        }
    }

    /// @dev Calculates staking rewards.
    /// @param account Account address.
    /// @param startEpochNumber Epoch number at which the reward starts being calculated.
    /// @return reward Reward amount up to the last possible epoch.
    /// @return endEpochNumber Epoch number where the reward calculation will start the next time.
    function calculateStakingRewards(address account, uint256 startEpochNumber) external view
        returns (uint256 reward, uint256 endEpochNumber)
    {
        // There is no reward in the first epoch yet
        if (startEpochNumber < 2) {
            startEpochNumber = 2;
        }

        for (endEpochNumber = startEpochNumber; endEpochNumber < epochCounter; ++endEpochNumber) {
            // Epoch point where the current epoch info is recorded
            PointEcomonics memory pe = mapEpochEconomics[endEpochNumber];
            // Last block number of a previous epoch
            uint256 iBlock = mapEpochEconomics[endEpochNumber - 1].blockNumber - 1;
            // Get account's balance at the end of epoch
            (uint256 balance, ) = IVotingEscrow(ve).balanceOfAt(account, iBlock);

            // If there was no locking / staking, we skip the reward computation
            if (balance > 0) {
                // Get the total supply at the last block of the epoch
                (uint256 supply, ) = IVotingEscrow(ve).totalSupplyAt(iBlock);

                // Add to the reward depending on the staker reward
                if (supply > 0) {
                    reward += balance * pe.stakerRewards / supply;
                }
            }
        }
    }

    function getUCF(uint256 epoch) external view returns (FixedPoint.uq112x112 memory ucf) {
        PointEcomonics memory pe = mapEpochEconomics[epoch];

        // Total rewards per epoch
        uint256 totalRewards = pe.treasuryRewards + pe.stakerRewards + pe.ucfc.unitRewards + pe.ucfa.unitRewards;

        // Calculate UCFc
        uint256 denominator = totalRewards * pe.numServices * pe.ucfc.numUnits;
        FixedPoint.uq112x112 memory ucfc;
        // Number of components can be equal to zero for all the services, so the UCFc is just zero by default
        if (denominator > 0) {
            ucfc = FixedPoint.fraction(pe.ucfc.numProfitableUnits * pe.ucfc.ucfuSum, denominator);
        }

        // Calculate UCFa
        denominator = totalRewards * pe.numServices * pe.ucfa.numUnits;
        // Number of agents must always be greater than zero, since at least one agent is used by a service
        if (denominator == 0) {
            revert ZeroValue();
        }
        FixedPoint.uq112x112 memory ucfa = FixedPoint.fraction(pe.ucfa.numProfitableUnits * pe.ucfa.ucfuSum, denominator);

        // Calculate UCF
        denominator = pe.ucfc.ucfWeight + pe.ucfa.ucfWeight;
        if (denominator == 0) {
            revert ZeroValue();
        }
        FixedPoint.uq112x112 memory weightedUCFc = FixedPoint.fraction(pe.ucfc.ucfWeight, 1);
        FixedPoint.uq112x112 memory weightedUCFa = FixedPoint.fraction(pe.ucfa.ucfWeight, 1);
        weightedUCFc = ucfc.muluq(weightedUCFc);
        weightedUCFa = ucfa.muluq(weightedUCFa);
        ucf = _add(weightedUCFc, weightedUCFa);
        FixedPoint.uq112x112 memory fraction = FixedPoint.fraction(1, denominator);
        ucf = ucf.muluq(fraction);
    }

    /// @dev Gets exchange rate for OLA.
    /// @param token Token address to be exchanged for OLA.
    /// @param tokenAmount Token amount.
    /// @return amountOLA Amount of OLA tokens.
    function _getExchangeAmountOLA(address token, uint256 tokenAmount) private pure returns (uint256 amountOLA) {
        // TODO Exchange rate is a stub for now
        amountOLA = tokenAmount;
    }

    function getBondLeft() external view returns (uint256 bondLeft) {
        bondLeft = _bondLeft;
    }

    function getBondCurrentEpoch() external view returns (uint256 bondPerEpoch) {
        bondPerEpoch = _bondPerEpoch;
    }

    /// @dev Gets the component / agent owner reward.
    /// @param account Account address.
    /// @return reward Reward amount.
    function getOwnerRewards(address account) external view returns (uint256 reward) {
        reward = mapOwnerRewards[account];
    }

    /// @dev Gets the component / agent owner reward and zeros the record of it being written off.
    /// @param account Account address.
    /// @return reward Reward amount.
    function accountOwnerRewards(address account) external onlyDispenser returns (uint256 reward) {
        reward = mapOwnerRewards[account];
        mapOwnerRewards[account] = 0;
    }
}    
