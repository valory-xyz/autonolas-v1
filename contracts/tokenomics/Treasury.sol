// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../interfaces/IDispenser.sol";
import "../interfaces/IErrors.sol";
import "../interfaces/IOLA.sol";
import "../interfaces/ITokenomics.sol";
import "../interfaces/IStructs.sol";
import "hardhat/console.sol";

/// @title Treasury - Smart contract for managing OLA Treasury
/// @author AL
/// @author Aleksandr Kuperman - <aleksandr.kuperman@valory.xyz>
contract Treasury is IErrors, IStructs, Ownable, ReentrancyGuard  {
    using SafeERC20 for IERC20;
    
    event DepositLPFromDepository(address token, uint256 tokenAmount, uint256 olaMintAmount);
    event DepositETHFromServices(uint256[] amounts, uint256[] serviceIds, uint256 revenue, uint256 donation);
    event Withdrawal(address token, uint256 tokenAmount);
    event TokenReserves(address token, uint256 reserves);
    event EnableToken(address token);
    event DisableToken(address token);
    event TreasuryUpdated(address treasury);
    event TokenomicsUpdated(address tokenomics);
    event DepositoryUpdated(address depository);
    event DispenserUpdated(address dispenser);
    event TransferToDispenserETH(uint256 amount);
    event TransferToDispenserOLA(uint256 amount);
    event TransferETHFailed(address account, uint256 amount);
    event TransferOLAFailed(address account, uint256 amount);
    event ReceivedETH(address sender, uint amount);

    enum TokenState {
        NonExistent,
        Enabled,
        Disabled
    }
    
    struct TokenInfo {
        // State of a token in this treasury
        TokenState state;
        // Reserves of a token
        uint256 reserves;
    }

    // OLA token address
    address public immutable ola;
    // Depository address
    address public depository;
    // Dispenser contract address
    address public dispenser;
    // Tokenomics contract address
    address public tokenomics;
    // ETH received from services
    uint256 public ETHFromServices;
    // ETH owned by treasury
    uint256 public ETHOwned;
    // Set of registered tokens
    address[] public tokenRegistry;
    // Token address => token info related to bonding
    mapping(address => TokenInfo) public mapTokens;

    // https://developer.kyber.network/docs/DappsGuide#contract-example
    address public constant ETH_TOKEN_ADDRESS = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE); // well-know representation ETH as address

    constructor(address _ola, address _depository, address _tokenomics, address _dispenser) payable {
        if (_ola == address(0)) {
            revert ZeroAddress();
        }
        ola = _ola;
        ETHOwned = msg.value;
        depository = _depository;
        dispenser = _dispenser;
        tokenomics = _tokenomics;
    }

    // Only the depository has a privilege to control some actions of a treasury
    modifier onlyDepository() {
        if (depository != msg.sender) {
            revert ManagerOnly(msg.sender, depository);
        }
        _;
    }

    /// @dev Changes the depository address.
    /// @param newDepository Address of a new depository.
    function changeDepository(address newDepository) external onlyOwner {
        depository = newDepository;
        emit DepositoryUpdated(newDepository);
    }

    /// @dev Changes dispenser address.
    /// @param newDispenser Address of a new dispenser.
    function changeDispenser(address newDispenser) external onlyOwner {
        dispenser = newDispenser;
        emit DispenserUpdated(newDispenser);
    }

    function changeTokenomics(address newTokenomics) external onlyOwner {
        tokenomics = newTokenomics;
        emit TokenomicsUpdated(newTokenomics);
    }

    /// @dev Allows the depository to deposit an asset for OLA.
    /// @param tokenAmount Token amount to get OLA for.
    /// @param token Token address.
    /// @param olaMintAmount Amount of OLA token issued.
    /// @return True, if deposit is successful.
    function depositTokenForOLA(uint256 tokenAmount, address token, uint256 olaMintAmount) external onlyDepository
        returns (bool)
    {
        // Check if the token is authorized by the registry
        if (mapTokens[token].state != TokenState.Enabled) {
            revert UnauthorizedToken(token);
        }

        // Mint specified number of OLA tokens corresponding to tokens bonding deposit if the amount is possible to mint
        uint256 supply = IERC20(ola).totalSupply();
        IOLA(ola).mint(msg.sender, olaMintAmount);
        // Check if the mint has minted the exact number of tokens
        if (IERC20(ola).totalSupply() - supply != olaMintAmount) {
            return false;
        }

        // Transfer tokens from depository to treasury and add to the token treasury reserves
        mapTokens[token].reserves += tokenAmount;
        IERC20(token).safeTransferFrom(msg.sender, address(this), tokenAmount);

        emit DepositLPFromDepository(token, tokenAmount, olaMintAmount);
        return true;
    }

    /// @dev Deposits ETH from protocol-owned services in batch.
    function depositETHFromServices(uint256[] memory serviceIds, uint256[] memory amounts) external payable nonReentrant {
        if (msg.value == 0) {
            revert ZeroValue();
        }

        // Check for the same length of arrays
        uint256 numServices = serviceIds.length;
        if (amounts.length != numServices) {
            revert WrongArrayLength(numServices, amounts.length);
        }

        uint256 totalAmount;
        for (uint256 i = 0; i < numServices; ++i) {
            totalAmount += amounts[i];
        }

        // Check if the total transferred amount corresponds to the sum of amounts from services
        if (msg.value != totalAmount) {
            revert WrongAmount(msg.value, totalAmount);
        }

        (uint256 revenueETH, uint256 donationETH) = ITokenomics(tokenomics).trackServicesETHRevenue(serviceIds, amounts);
        ETHFromServices += revenueETH;
        ETHOwned += donationETH;

        emit DepositETHFromServices(amounts, serviceIds, revenueETH, donationETH);
    }

    /// @dev Allows owner to transfer specified tokens from reserves to a specified address.
    /// @param to Address to transfer funds to.
    /// @param tokenAmount Token amount to get reserves from.
    /// @param token Token address.
    /// @param bonding Indicates if bonding of LP token is used.
    function withdraw(address to, uint256 tokenAmount, address token, bool bonding) external onlyOwner {
        if (bonding) {
            // Only approved token reserves can be used for redemptions
            if (mapTokens[token].state != TokenState.Enabled) {
                revert UnauthorizedToken(token);
            }
            mapTokens[token].reserves -= tokenAmount;
        } else {
            ETHOwned -= tokenAmount;
        }

        // Transfer tokens from reserves to the manager
        if (token == ETH_TOKEN_ADDRESS) {
            (bool success, ) = to.call{value: tokenAmount}("");
            if (!success) {
                revert TransferFailed(token, address(this), to, tokenAmount);
            }
        } else {
            IERC20(token).safeTransfer(to, tokenAmount);
        }

        emit Withdrawal(token, tokenAmount);
    }

    /// @dev Enables a token to be exchanged for OLA.
    /// @param token Token address.
    function enableToken(address token) external onlyOwner {
        TokenState state = mapTokens[token].state;
        if (state != TokenState.Enabled) {
            if (state == TokenState.NonExistent) {
                tokenRegistry.push(token);
            }
            mapTokens[token].state = TokenState.Enabled;
            emit EnableToken(token);
        }
    }

    /// @dev Disables a token from the ability to exchange for OLA.
    /// @param token Token address.
    function disableToken(address token) external onlyOwner {
        TokenState state = mapTokens[token].state;
        if (state != TokenState.Disabled) {
            // The reserves of a token must be zero in order to disable it
            if (mapTokens[token].reserves > 0) {
                revert NonZeroValue();
            }
            mapTokens[token].state = TokenState.Disabled;
            emit DisableToken(token);
        }
    }

    /// @dev Gets information about token being enabled for bonding.
    /// @param token Token address.
    /// @return enabled True if token is enabled.
    function isEnabled(address token) public view returns (bool enabled) {
        enabled = (mapTokens[token].state == TokenState.Enabled);
    }

    /// @dev Check if the token is UniswapV2Pair.
    /// @param token Address of a token.
    function checkPair(address token) public returns (bool) {
        bool success;
        bytes memory data = abi.encodeWithSelector(bytes4(keccak256("kLast()")));
        assembly {
            success := call(
            5000,           // 5k gas
            token,         // destination address
            0,              // no ether
            add(data, 32),  // input buffer (starts after the first 32 bytes in the `data` array)
            mload(data),    // input length (loaded from the first 32 bytes in the `data` array)
            0,              // output buffer
            0               // output length
            )
        }
        return success;
    }

    /// @dev Rebalances ETH funds.
    /// @param amount ETH token amount.
    function _rebalanceETH(uint256 amount) internal {
        if (ETHFromServices >= amount) {
            ETHFromServices -= amount;
            ETHOwned += amount;
        }
    }

    /// @dev Sends funds to the dispenser contract.
    /// @param amountETH Amount in ETH.
    /// @param amountOLA Amount in OLA.
    /// @return success True if the funds were sent correctly.
    function _sendFundsToDispenser(uint256 amountETH, uint256 amountOLA) internal returns (bool success){
        success = true;
        if (amountETH > 0) {
            ETHFromServices -= amountETH;
            (success, ) = dispenser.call{value: amountETH}("");
            if (success) {
                emit TransferToDispenserETH(amountETH);
            } else {
                emit TransferETHFailed(dispenser, amountETH);
            }
        }
        if (amountOLA > 0) {
            uint256 supply = IERC20(ola).totalSupply();
            IOLA(ola).mint(dispenser, amountOLA);
            // Check if the mint has minted the exact number of tokens
            if (IERC20(ola).totalSupply() - supply == amountOLA) {
                emit TransferToDispenserOLA(amountOLA);
            } else {
                success = false;
                emit TransferOLAFailed(dispenser, amountOLA);
            }
        }
    }

    /// @dev Starts a new epoch.
    function allocateRewards() external onlyOwner returns (bool) {
        // Process the epoch data
        ITokenomics(tokenomics).checkpoint();
        PointEcomonics memory point = ITokenomics(tokenomics).getLastPoint();

        // Collect treasury's own reward share
        _rebalanceETH(point.treasuryRewards);

        // Send cumulative funds of staker, component, agent rewards and top-ups to dispenser
        uint256 rewards = point.stakerRewards + point.ucfc.unitRewards + point.ucfa.unitRewards;
        uint256 topUps = point.ownerTopUps + point.stakerTopUps;
        console.log("treasury balance before sending", address(this).balance / 1e18);
        if (!_sendFundsToDispenser(rewards, topUps)) {
            return false;
        }
        return true;
    }

    receive() external payable {
        ETHOwned += msg.value;
        emit ReceivedETH(msg.sender, msg.value);
    }
}
