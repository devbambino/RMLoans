# RapiLoans 💰

**Instant MXNB loans. Zero interest. Powered by Arbitrum.**

RapiLoans, by RapiMoni, enables users to access instant loans in MXNB (Bitso's Mexican Peso stablecoin) by collateralizing USDC, with **0% interest rates subsidized by the RapiLoans protocol**. Built on Arbitrum for speed, low costs, and accessibility to the Latin American market.

---

## 📋 Pitch Deck Sections

### Problem

**The Gap in Latin American DeFi:**

- 💳 **Limited local currency lending**: Traditional DeFi offers few options for borrowing in local fiat-backed stablecoins (like MXNB)
- ⚠️ **High borrowing costs**: Existing lending protocols charge 5-15% APY, making short-term loans expensive
- ❌ **Liquidity barriers**: Mexican and Latin American users struggle to access fast, affordable loans without KYC-heavy traditional banking
- ⏰ **Slow transaction times**: Traditional lending takes days; users need capital urgently

### Solution

**RapiLoans: Instant. Affordable. Borderless.**

RapiLoans provides:
- ✅ **0% interest rate** — Ingeniously subsidized by capturing Morpho USDC yield from collateral
- ⚡ **Instant liquidity** — Borrow MXNB in minutes, not days
- 🔒 **Overcollateralization model** — Supply USDC, borrow MXNB with predictable liquidation mechanics
- 🌐 **Non-custodial** — Users maintain full control via smart contracts on Arbitrum
- 📱 **Simple UX** — Intuitive web interface for wallet connection, collateral supply, and borrowing
- 💎 **Sustainable model** — Lenders earn 6.5-9.5% APY; protocol revenue comes from yield spread, not user extraction

### Market Opportunity

**tam (Total Addressable Market):**
- 🇲🇽 Mexico: ~50M+ unbanked/underbanked population
- 🌎 Latin America: 240M+ users with limited access to affordable credit
- 💰 Global emerging-market lending: $100B+ annual market

**Target Market Size (First Year):**
- Conservative: $10M in TVL (Total Value Locked)
- Protocol can capture 0.5-1% of annual emerging-market lending demand

### Customer Segments

1. **Crypto-Native Traders & Arbitrageurs**
   - Use USDC to take leveraged positions in MXNB
   - Need fast, cheap capital for short-term opportunities

2. **Mexican & Latin American Crypto Users**
   - Want to borrow in local currency equivalents (MXNB)
   - Avoid traditional banking friction and high rates

3. **Remittance & Cross-Border Payment Users**
   - Receive USDC internationally, borrow MXNB locally
   - Perfect for migrant workers sending money home

4. **Small Businesses & Merchants**
   - Accept crypto payments, need quick access to local currency
   - Use RapiLoans for working capital without KYC delays

5. **Developers & DAOs**
   - Build on top of RapiLoans' lending primitives
   - Create derivatives, insurance products, or payment rails

### Competitive Advantages

| Feature | RapiLoans | Traditional Banks | Other DeFi Protocols |
|---------|-----------|-------------------|---------------------|
| **Interest Rate** | 0% (subsidized) | 20-30% | 5-15% APY |
| **Speed** | Minutes | 3-5 days | Minutes |
| **KYC Required** | No | Yes | No |
| **Local Currency** | MXNB | MXN + fees | Limited options |
| **Non-Custodial** | Yes | No | Yes |
| **Chain** | Arbitrum | N/A | Multiple / Expensive |

### Go-to-Market Strategy

**Phase 1 (Launch):**
- Target crypto traders on Arbitrum with $1K–$100K USDC collateral
- Partner with Bitso community for MXNB awareness
- Airdrop incentives for early lenders/borrowers

**Phase 2 (Scale):**
- Expand to remittance users via partnerships with payment apps
- Introduce governance token for protocol revenue sharing
- Launch insurance / liquidation pools

**Phase 3 (Ecosystem):**
- Enable borrowing in additional local stablecoins (ARS, BRL, COP)
- Build merchant API for point-of-sale crypto integration
- Create incentive programs for protocol adoption

---

## 🚀 How It Works

### The User Journey

```
1. Supply USDC as Collateral
   └─> Your USDC earns yield via Morpho protocol

2. Receive Yield-Bearing Collateral
   └─> mUSDC wrapped into WmUSDC (ERC-4626 vault)

3. Borrow MXNB Against Collateral
   └─> Up to 50% LTV on your collateral value
   └─> 0% interest rate 🎉

4. Use MXNB Instantly
   └─> Trade, spend, or convert as needed

5. Repay Anytime
   └─> Return MXNB to unlock collateral + yield
```

### Technical Architecture

**Built on Arbitrum with Morpho Blue:**

- **Morpho USDC Vault** → Supply USDC, earn yield
- **WmUSDC (ERC-4626 Wrapper)** → Non-rebasing collateral asset
- **Morpho Blue Markets** → Uncensorable lending engine
- **Custom Oracle** → USDC/MXNB price feed for safety
- **Frontend UI** → Simple, non-custodial interface

**Why Arbitrum?**
- ⚡ Low transaction costs (sub-cent)
- 🚀 High throughput (40K+ TPS)
- 🌱 Thriving DeFi ecosystem
- 🏦 Native support for multiple assets

---

## ✨ Key Features

- ✅ **0% Interest Rate** — Subsidized by the protocol
- ✅ **Instant Liquidity** — Borrow in minutes via Arbitrum's speed
- ✅ **Yield-Bearing Collateral** — Earn while you borrow
- ✅ **Rewards & Incentives** — Community-auditable smart contracts
- ✅ **Non-Custodial** — Full control via smart contracts
- ✅ **Transparent Oracles** — On-chain pricing for collateral safety
- ✅ **ERC-4626 Compliance** — Standard-compliant yield vault
- ✅ **Mobile-Friendly UI** — MetaMask / Web3 wallet integration
- ✅ **Open-Source** — Community-auditable smart contracts

---

## 💰 Revenue Model: Yield Accumulation & Protocol Subsidies

### The Clever Mechanism: How 0% APR is Sustainable

RapiLoans' 0% APR isn't a loss-leader—it's powered by an ingenious **yield accumulation mechanism** that generates protocol revenue while subsidizing borrower APR:

```
USDC Deposits → Morpho Yield → Protocol Capital → 0% APR + Incentives
```

### Step-by-Step: The Yield Flow

**1. Lender Deposits USDC**
- User supplies USDC to RapiLoans
- USDC is deposited into **Morpho USDC Vault**
- Morpho generates yield by lending USDC at ~5-8% market rates

**2. Yield Capture via WmUSDC**
- USDC deposits are wrapped into **mUSDC** (Morpho vault token)
- mUSDC is wrapped again into **WmUSDC** (non-rebasing ERC-4626)
- WmUSDC **tracks yield** separately from principal
- As Morpho's mUSDC appreciates, WmUSDC's price per share increases
- Yield remains with the protocol and collateral layer until withdrawal

**3. Borrower Uses Collateral at 0% APR**
- Borrower locks WmUSDC as collateral
- Borrows MXNB at **0% interest rate** (fully subsidized)
- Collateral continues earning Morpho yield in the background

**4. Protocol Captures Yield at Repayment**
- When borrower repays MXNB loan, RapiLoans retrieves accrued interest from Morpho's Vaults
- Converts MXNB interest to WmUSDC equivalent via oracle
- **Uses protocol-owned yield to pay back the interest subsidy**
- Any excess yield becomes protocol revenue, and it is available for rewards and incentives for lenders/borrowers

### Revenue Streams

| Revenue Source | Amount | Use Case |
|----------------|--------|----------|
| **Yield Spread** | 10-20% annual on TVL | Protocol buffer & rewards reserve |
| **Excess Yield** | After subsidy coverage | DAO treasury, governance token buyback |
| **Incentive Rewards** | Portion of spread | Lender APY boost (attract capital) |
| **Borrower Penalties** | Late repay fees | Risk management, insurance pool |

### Example Calculation

**Scenario: $10M TVL in Morpho USDC Vault**

```
Annual Morpho Yield Generated:    $10M × 10% = $1,000,000
├─ Loan Interest Subsidies:       $400,000 (covers 0% APR)
├─ Lender Incentives (APY boost): $300,000 (3% bonus APY in USDC)
├─ Protocol Revenue:              $250,000 (kept by DAO/treasury)
└─ Buffer/Insurance:              $50,000 (liquidation safety)
```

### The GTM Advantage

This model is a **game-changing Go-to-Market strategy**:

✅ **Attract Early Lenders:**
- Lenders earn Morpho yield (5-10% base) + up to 50% in incentive APY
- Total yield: **10-20% APY** (far better than traditional options)

✅ **Subsidize Borrowers to Scale:**
- 0% APR costs nothing to borrowers
- Drives rapid borrowing growth and TVL expansion
- Borrowers gain capital at no cost—incentivizing platform usage

✅ **Sustainable Protocol Revenue:**
- Never dependent on borrower APR or fees
- Revenue comes from natural Morpho yield, not extraction
- Scalable: More TVL = More yield = More sustainable

✅ **Network Effects:**
- Lenders attracted by high yields
- Borrowers attracted by 0% APR
- Both sides grow simultaneously
- Protocol earns from the spread, not the users

### Why This Matters for Profitability

**Traditional DeFi Models:**
- Borrow APY: 8-15%
- Lend APY: 5-8%
- Spread: 3-7% to protocol ✓
- Problem: Users resist high borrowing costs

**RapiLoans Model:**
- Borrow APY: 0% (subsidized from yield)
- Lend APY: 5-10% (Morpho + incentives)
- Spread: 5-10% to protocol from USDC yield ✓
- Advantage: Users flock to better rates; TVL grows faster; revenue scales massively

---

## 🛠️ Technology Stack

**Smart Contracts:**
- Solidity (EVM-compatible)
- Morpho Blue protocol integration
- ERC-20 & ERC-4626 standards

**Frontend:**
- Next.js / React
- Ethers.js v6 for blockchain interaction
- MetaMask + Privy wallet integration
- TailwindCSS for styling

**Infrastructure:**
- Arbitrum Mainnet (official deployment chain)
- The Graph for subgraph indexing
- IPFS for decentralized storage

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- MetaMask or compatible Web3 wallet
- USDC and MXNB on Arbitrum Mainnet

### Installation

```bash
# Clone the repository
git clone https://github.com/devbambino/RMLoans.git
cd RMLoans

# Install dependencies
cd next-app
pnpm install

# Copy the example environment file and configure your Privy app credentials:
cp .env.example .env.local

# Update `.env.local` with your Privy app credentials:
# Public - Safe to expose in the browser
NEXT_PUBLIC_PRIVY_APP_ID=your_app_id_here

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Deployment to Arbitrum Mainnet

You need to follow these steps:
```bash
# 1. Deploy WmUSDC, and oracle contracts (if needed)
# 2. Create USDC/MXNB lending market on Morpho Blue
# 3. Output market IDs for frontend configuration
```

**Update frontend configuration:**
Edit `next-app/src/constants/contracts.ts` with deployed contract addresses from the output.

---

## 💻 Smart Contract Overview

### 1. **MockMXNB.sol**
ERC-20 token representing Mexican Peso stablecoin. 
- 6 decimals (matches USDC)
- Owner-controlled minting for initial liquidity

### 2. **WmUSDC.sol**
ERC-4626 vault wrapper around Morpho's mUSDC token.
- Non-rebasing shares for collateral composability
- Price per share increases as Morpho yields accrue
- Enables collateral to earn yield while borrowed

### 3. **WmusdcMxnbOracle.sol**
Price oracle providing WmUSDC/MXNB exchange rate for Morpho Blue markets.
- Safe pricing for risk management
- 77% LTV (Loan-to-Value) ratio

### 4. **MXNBFaucet.sol** (Testnet)
Faucet contract for minting test MXNB tokens during development.

---

## 📊 Morpho Blue Market Configuration

**RapiLoans creates one primary market:**

```
Market: MXNB Loan / WmUSDC Collateral
├─ Loan Token: MXNB
├─ Collateral Token: WmUSDC (yield-bearing)
├─ Oracle: WmusdcMxnbOracle
├─ Interest Rate Model: 0% (protocol-subsidized)
├─ LTV: 50% (derisking)
└─ LLTV: 77% (liquidation safety)
```

**Health Factor Formula:**
```
Health Factor = (Collateral Value × LTV) / Borrowed Value

Must remain > 1.0 to avoid liquidation
```
---

## 📱 Frontend Features

**Dashboard:**
- Real-time wallet balance display (USDC, MXNB, WmUSDC)
- Active loan status and liquidation risk
- APY and yield tracking

**Lending:**
- Deposit USDC → Mint mUSDC from Morpho
- Wrap mUSDC → WmUSDC (ERC-4626)
- Supply WmUSDC as collateral

**Borrowing:**
- Borrow MXNB against WmUSDC collateral
- See real-time borrowing capacity
- Track health factor

**Repayment:**
- Repay MXNB loans anytime, with no penalties
- Withdraw collateral
- Claim accrued yield

---

## 🌐 Arbitrum Network Details

**Official RapiLoans Chain:** Arbitrum Mainnet

- **Chain ID:** 42161
- **RPC:** https://arb1.arbitrum.io/rpc
- **Block Explorer:** https://arbiscan.io/
- **Gas Token:** ETH (native)

**Why Arbitrum?**
- Ultra-low transaction fees (~$0.001)
- Fast finality (sub-second)
- EVM-compatible (deploy Ethereum contracts unchanged)
- Thriving DeFi ecosystem with deep liquidity
- Strategic choice for Latin American accessibility

---

## 📚 Core Integrations

| Component | Provider | Purpose |
|-----------|----------|---------|
| **Yield** | Morpho USDC Vault | Earn on supplied USDC |
| **Collateral** | WmUSDC (ERC-4626) | Non-rebasing wrapper for safety |
| **Lending Engine** | Morpho Blue | Un-censorable market protocol |
| **Pricing** | WmusdcMxnbOracle | Safe collateral valuation |
| **Wallet** | MetaMask / Privy | User custody & authentication |

---

## 🔐 Security & Auditing

**Current Status:** Beta / Audit-Ready

**Security Features:**
- ✅ Non-rebasing collateral design (prevents flash loan attacks)
- ✅ Conservative 50% LTV (liquidation buffer)
- ✅ Morpho Blue's battle-tested lending engine
- ✅ Transparent on-chain pricing
- ✅ No external price dependencies (decentralized oracles)

---

## 🗺️ Roadmap

**Q1 2026:**
- ✅ Launch on Arbitrum Mainnet
- ✅ Core USDC/MXNB market live
- Target: $1M initial TVL

**Q2 2026:**
- Governance token ($RAPI) introduction
- Protocol revenue sharing with stakers
- Remittance partnership pilots

**Q3 2026:**
- Expand to additional stablecoins (ARS, BRL, COP)
- Mobile app release
- Cross-chain bridging (Polygon, Avalanche, Base)

**Q4 2026 & Beyond:**
- Merchant API for point-of-sale integration
- Synthetic asset pools
- Community governance transitions to DAO

---

## 📞 Support & Community

- **Twitter:** [@semillainnolabs](#)
- **GitHub Issues:** Report bugs and feature requests

---

## 🙏 Acknowledgments

Built with ❤️ by the SemillaLabs team.  
Powered by **Arbitrum**, **Morpho Blue** and Bitso/Juno

Special thanks to:
- [Morpho Labs](https://morpho.org/) for the lending protocol
- [Bitso](https://bitso.com/) for MXNB innovation
- [Arbitrum Foundation](https://arbitrum.foundation/) for ecosystem support

---

**Status:** 🚀 Ready for Arbitrum Mainnet  
**Last Updated:** February 2026  