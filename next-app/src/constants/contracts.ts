import { ethers } from 'ethers';

export const BASE_SEPOLIA_CONFIG = {
    chainId: 84532,
    rpcUrl: "https://sepolia.base.org",
    blockExplorer: "https://sepolia.basescan.org",
};

export const CONTRACT_ADDRESSES = {
    // Base Sepolia Token Addresses
    usdc: "0xba50cd2a20f6da35d788639e581bca8d0b5d4d5f",
    mockMXNB: "0xF19D2F986DC0fb7E2A82cb9b55f7676967F7bC3E",

    // Wrapper & Vault Addresses
    wmUSDC: "0xCa4625EA7F3363d7E9e3090f9a293b64229FE55B",
    morphoUSDCVault: "0xA694354Ab641DFB8C6fC47Ceb9223D12cCC373f9",
    morphoMXNBVault: "0xd6a83595b11CCC94bCcde4c9654bcaa6D423896e",

    // Morpho Addresses
    morphoBlue: "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb",

    // Oracle Addresses
    wmusdcMxnbOracle: "0x9f4b138BF3513866153Af9f0A2794096DFebFaD4",
    ethUsdcOracle: "0x97EBCdb0F784CDc9F91490bEBC9C8756491814a3",
};

export const MARKET_IDS = {
    usdc: "0x6af42641dd1ddc4fd0c3648e45497a29b78eb50d21fd0f6eac7b8eae2192dd47",
    mxnb: "0xf912f62db71d01c572b28b6953c525851f9e0660df4e422cec986e620da726df",
};

// Morpho Blue Market Params Tuple
// [loanToken, collateralToken, oracle, irm, lltv]
export const MXNB_MARKET_PARAMS: [string, string, string, string, bigint] = [
    CONTRACT_ADDRESSES.mockMXNB,        // loanToken
    CONTRACT_ADDRESSES.wmUSDC,          // collateralToken
    CONTRACT_ADDRESSES.wmusdcMxnbOracle, // oracle
    "0x46415998764C29aB2a25CbeA6254146D50D22687", // irm
    ethers.parseEther("0.77"),          // lltv (77%)
];

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
    "function asset() external view returns (address)",
    "function convertToShares(uint256 assets) external view returns (uint256)",
    "function convertToAssets(uint256 shares) external view returns (uint256)",
];

export const WMEMORY_ABI = [
    "function deposit(uint256 assets, address receiver) external returns (uint256)",
    "function redeem(uint256 shares, address receiver, address owner) external returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
];

export const MORPHO_ABI = [
    "function supplyCollateral(tuple(address,address,address,address,uint256) marketParams, uint256 amount, address onBehalf, bytes data) external",
    "function withdrawCollateral(tuple(address,address,address,address,uint256) marketParams, uint256 amount, address onBehalf, address receiver) external",
    "function borrow(tuple(address,address,address,address,uint256) marketParams, uint256 assets, uint256 shares, address onBehalf, address receiver) external returns (uint256, uint256)",
    "function repay(tuple(address,address,address,address,uint256) marketParams, uint256 assets, uint256 shares, address onBehalf, bytes data) external returns (uint256, uint256)",
    "function position(bytes32 id, address user) external view returns (tuple(uint256,uint256,uint256))",
];

export const ORACLE_ABI = [
    "function price() external view returns (uint256)",
];
