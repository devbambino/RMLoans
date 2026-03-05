import { ethers } from 'ethers';

export const BASE_SEPOLIA_CONFIG = {
    chainId: 84532,
    rpcUrl: "https://sepolia.base.org",
    blockExplorer: "https://sepolia.basescan.org",
};

export const CONTRACT_ADDRESSES = {
    // Base Sepolia Token Addresses
    usdc: "0xba50cd2a20f6da35d788639e581bca8d0b5d4d5f",
    mockMXNE: "0xC7b61E7Ae2BdE11cC34D47971EBC7d95AA638803",

    // Wrapper & Vault Addresses
    wmUSDC: "0x0E01950150Dc5DE0cBaEE3BF86ACb93D276CCAcc",
    morphoUSDCVault: "0xA694354Ab641DFB8C6fC47Ceb9223D12cCC373f9",
    morphoMXNEVault: "0x961648C5D237d1c2Ea15675f32ec00d37052Ee27",

    // Morpho Addresses
    morphoBlue: "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb",
    irm: "0x46415998764C29aB2a25CbeA6254146D50D22687",

    // Oracle Addresses
    wmusdcMxneOracle: "0x21aE644311f44237241e8b320d344C29cB3Bbc4c",
    ethUsdcOracle: "0x97EBCdb0F784CDc9F91490bEBC9C8756491814a3",
};

export const MARKET_IDS = {
    usdc: "0x6af42641dd1ddc4fd0c3648e45497a29b78eb50d21fd0f6eac7b8eae2192dd47",
    mxne: "0x82faa3ff8c26b58579935fad6dea2b3cf81d637d5bea68874bba48ef0f6e95a0",
};

// Morpho Blue Market Params Tuple
// [loanToken, collateralToken, oracle, irm, lltv]
export const MXNE_MARKET_PARAMS = {
    loanToken: CONTRACT_ADDRESSES.mockMXNE,
    collateralToken: CONTRACT_ADDRESSES.wmUSDC,
    oracle: CONTRACT_ADDRESSES.wmusdcMxneOracle,
    irm: "0x46415998764C29aB2a25CbeA6254146D50D22687",
    lltv: ethers.parseEther("0.77")
};

// ABIs
export const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function decimals() external view returns (uint8)",
    "function symbol() external view returns (string)",
    "function name() external view returns (string)",
];

export const VAULT_ABI = [
    "function deposit(uint256 assets, address receiver) external returns (uint256)",
    "function withdraw(uint256 assets, address receiver, address owner) external returns (uint256)",
    "function redeem(uint256 shares, address receiver, address owner) external returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function asset() external view returns (address)",
    "function convertToShares(uint256 assets) external view returns (uint256)",
    "function convertToAssets(uint256 shares) external view returns (uint256)",
];

export const WMEMORY_ABI = [
    "function deposit(uint256 assets, address receiver) external returns (uint256)",
    "function redeem(uint256 shares, address receiver, address owner) external returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function getInterestSubsidy(address user) external returns (uint256)",
    "function redeemWithInterestSubsidy(uint256 shares, address receiver, address owner) external returns (uint256)",
    "function userInterestSubsidyInWmUSDC(address) view returns (uint256)",
    "function userInterestInMxnb(address) view returns (uint256)",
    "function userPaidSubsidyInUSDC(address) view returns (uint256)",
];

export const MORPHO_ABI = [
    "function supplyCollateral(tuple(address loanToken, address collateralToken, address oracle, address irm, uint256 lltv) marketParams, uint256 amount, address onBehalf, bytes data) external",
    "function withdrawCollateral(tuple(address loanToken, address collateralToken, address oracle, address irm, uint256 lltv) marketParams, uint256 amount, address onBehalf, address receiver) external",
    "function borrow(tuple(address loanToken, address collateralToken, address oracle, address irm, uint256 lltv) marketParams, uint256 assets, uint256 shares, address onBehalf, address receiver) external returns (uint256, uint256)",
    "function repay(tuple(address loanToken, address collateralToken, address oracle, address irm, uint256 lltv) marketParams, uint256 assets, uint256 shares, address onBehalf, bytes data) external returns (uint256, uint256)",
    "function position(bytes32 id, address user) external view returns (tuple(uint256 supplyShares, uint256 borrowShares, uint256 collateral))",
    "function market(bytes32 id) external view returns (uint128 totalSupplyAssets, uint128 totalSupplyShares, uint128 totalBorrowAssets, uint128 totalBorrowShares, uint128 lastUpdate, uint128 fee)",
];

export const ORACLE_ABI = [
    "function price() external view returns (uint256)",
];

export const IRM_ABI = [
    "function borrowRateView(tuple(address loanToken, address collateralToken, address oracle, address irm, uint256 lltv) marketParams, tuple(uint128 totalSupplyAssets, uint128 totalSupplyShares, uint128 totalBorrowAssets, uint128 totalBorrowShares, uint128 lastUpdate, uint128 fee) marketStatus) external view returns (uint256)",
];
