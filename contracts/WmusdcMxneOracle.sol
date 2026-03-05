// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title WmusdcMxneOracle
 * @notice Simple oracle that returns a fixed price for Morpho Blue integration
 * @dev
 * - Returns a constant price scaled by 1e36 (Morpho's required precision)
 * - For this PoC:  collateral (WmUSDC) has 18 decs and loan (MXNE) have 6 decimals
 * - Price: 1 WmUSDC = 17.6 MXNE 
 *
 * Production oracle would use:
 * - Chainlink price feeds
 * - Uniswap TWAP
 * - Other decentralized price oracles
 */
contract WmusdcMxneOracle {
    /// @notice The fixed price returned by this oracle
    /// @dev Morpho requires price scaled by 1e36
    /// For our PoC: 1 WmUSDC (18 decimals) = 17 MXNE (6 decimals)
    /// So price = 17.6 * 10^24 = 176 * 1e23
    uint256 private constant PRICE = 176 * 10**(6 - 18 + 35);

    /**
     * @notice Get the price of collateral quoted in loan token
     * @return price Price scaled by 1e24
     * @dev
     * Formula for multi-decimal tokens:
     * price = price_in_usd * 10^(loan_decimals - collateral_decimals + 36)
     *
     * For decimals:
     * price = 17.6 * 10^(6 - 18 + 36) = 17.6 * 1e24 = 176 * 1e23
     */
    function price() external pure returns (uint256) {
        return PRICE;
    }

    /**
     * @notice View function version (same as price())
     * @return price Price scaled by 1e48
     */
    function priceView() external pure returns (uint256) {
        return PRICE;
    }
}