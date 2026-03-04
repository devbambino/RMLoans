// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MXNEFaucet
 * @notice Faucet for MockMXNE token. Allows users to swap ETH for MXNE at a fixed rate.
 * @dev Fixed exchange rate: 1 ETH = 33548.87 MXNE (accounting for 18 decimal ETH and 6 decimal MXNE)
 */
contract MXNEFaucet is Ownable {
    // ============================================================================
    // STATE VARIABLES
    // ============================================================================

    IERC20 public mxneToken;

    /// @notice Fixed exchange rate: 1 ETH (10^18 wei) = 33548.87 MXNE (33548870000 wei in 6 decimals)
    /// This represents: 33548.87 * 10^6 = 33548870000
    uint256 public constant EXCHANGE_RATE = 33548870000; // MXNE per 1 ETH (accounting for 6 decimals)

    /// @notice Maximum amount of MXNE a single wallet can receive: 20000 MXNE (in wei, 6 decimals)
    uint256 public constant MAX_PER_WALLET = 20000 * 10**6; // 20000 MXNE

    /// @notice Tracks cumulative MXNE claimed by each address
    mapping(address => uint256) public claimedAmount;

    /// @notice Total ETH received by the faucet
    uint256 public totalEthReceived;

    /// @notice Total MXNE distributed by the faucet
    uint256 public totalMxneDistributed;

    // ============================================================================
    // EVENTS
    // ============================================================================

    /// @notice Emitted when a user swaps ETH for MXNE
    event Swapped(address indexed user, uint256 ethAmount, uint256 mxneAmount);

    /// @notice Emitted when owner withdraws ETH
    event EthWithdrawn(address indexed to, uint256 amount);

    /// @notice Emitted when owner withdraws remaining MXNE
    event MxneWithdrawn(address indexed to, uint256 amount);

    // ============================================================================
    // CONSTRUCTOR
    // ============================================================================

    /**
     * @notice Initialize the faucet with MXNE token address
     * @param _mxneToken Address of the MockMXNE token
     */
    constructor(address _mxneToken) Ownable(msg.sender) {
        require(_mxneToken != address(0), "Invalid MXNE token address");
        mxneToken = IERC20(_mxneToken);
    }

    // ============================================================================
    // FALLBACK FUNCTIONS
    // ============================================================================

    /**
     * @notice Fallback: Receive ETH directly (calls swapEthForMxne)
     */
    receive() external payable {
        _swapEthForMxne();
    }

    // ============================================================================
    // INTERNAL FUNCTIONS
    // ============================================================================

    /**
     * @notice Internal function to swap ETH for MXNE
     */
    function _swapEthForMxne() internal {
        require(msg.value > 0, "Must send ETH");

        // Calculate MXNE amount: (ethAmount / 10^18) * 33548.87 * 10^6
        // Which is: (ethAmount * 33548870000) / 10^18
        uint256 mxneAmount = (msg.value * EXCHANGE_RATE) / 10**18;

        // Check if this would exceed the per-wallet limit
        uint256 newClaimedAmount = claimedAmount[msg.sender] + mxneAmount;
        require(
            newClaimedAmount <= MAX_PER_WALLET,
            "Would exceed max MXNE per wallet limit"
        );

        // Check if faucet has enough MXNE
        uint256 faucetBalance = mxneToken.balanceOf(address(this));
        require(faucetBalance >= mxneAmount, "Faucet has insufficient MXNE");

        // Update tracking
        claimedAmount[msg.sender] = newClaimedAmount;
        totalEthReceived += msg.value;
        totalMxneDistributed += mxneAmount;

        // Transfer MXNE to user
        require(
            mxneToken.transfer(msg.sender, mxneAmount),
            "MXNE transfer failed"
        );

        emit Swapped(msg.sender, msg.value, mxneAmount);
    }

    // ============================================================================
    // USER FUNCTIONS
    // ============================================================================

    /**
     * @notice Swap ETH for MXNE at fixed rate: 1 ETH = 33548.87 MXNE
     * @dev User sends ETH via payable function, receives MXNE
     */
    function swapEthForMxne() external payable {
        _swapEthForMxne();
    }

    /**
     * @notice Get remaining MXNE available for a specific address
     * @param user Address to check
     * @return Remaining MXNE amount (in wei) that this user can claim
     */
    function getRemainingClaim(address user) external view returns (uint256) {
        uint256 claimed = claimedAmount[user];
        if (claimed >= MAX_PER_WALLET) {
            return 0;
        }
        return MAX_PER_WALLET - claimed;
    }

    // ============================================================================
    // OWNER FUNCTIONS
    // ============================================================================

    /**
     * @notice Owner withdraws ETH from faucet
     * @param to Recipient address
     * @param amount Amount of ETH to withdraw
     */
    function withdrawEth(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        require(amount <= address(this).balance, "Insufficient ETH balance");

        (bool success, ) = to.call{value: amount}("");
        require(success, "ETH transfer failed");

        emit EthWithdrawn(to, amount);
    }

    /**
     * @notice Owner withdraws remaining MXNE from faucet
     * @param to Recipient address
     * @param amount Amount of MXNE to withdraw
     */
    function withdrawMxne(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid recipient");

        uint256 faucetBalance = mxneToken.balanceOf(address(this));
        require(amount <= faucetBalance, "Insufficient MXNE balance");

        require(mxneToken.transfer(to, amount), "MXNE transfer failed");

        emit MxneWithdrawn(to, amount);
    }

    /**
     * @notice Owner can withdraw ETH to this address (for ease)
     */
    function withdrawEthToSelf() external payable onlyOwner {
        // No-op, just receives ETH
    }
}
