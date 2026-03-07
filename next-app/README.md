> [!IMPORTANT]
> Due to the complexity of our logic/architecture, RapiLoans requires intensive testing and contract auditing before deployment to Mainnet. The PoC is working on Base Sepolia. You will need Sepolia ETH, USDC(Aave's version of USDC) and mockMXNE(our version of MXNe) for testing the Borrow and Lend features. For getting the tokens you need to:
> 1. We've created a smart contract faucet for mockMXNE tokens, deployed to Base Sepolia. You only need to send Sepolia ETH from your wallet to the SC's address(`0xF3388E7AF4503a700261ef3f16a91AC98B2B35B5`) in Base Sepolia and the SC will automatically transfer back the corresponding amount of mockMXNE tokens(the FX rate is 1 ETH to 33548.87 mockMXNE). The Faucet smart contract is located at `/contracts/MXNEFacucet.sol`. For checking the real time liquidity of the faucet in Sepolia Basescan [click here](https://sepolia.basescan.org/address/0xF3388E7AF4503a700261ef3f16a91AC98B2B35B5), which is nearly 100M mockMXNE.
> 2. For simplicity we decided to use Aave's USDC which already have a faucet available in Base Sepolia. To get the USDC [click here](https://app.aave.com/faucet/), please remember to enable the Testnet mode in Aave first.

# RapiLoans 💰

**Instant MXNE loans. Zero interest. Powered by Base.**

RapiLoans, by RapiMoni, enables users to access instant loans in MXNE (EtherFuse's Mexican Peso stablecoin) by collateralizing USDC, with **0% interest rates subsidized by the RapiLoans protocol**. Built on Base for speed, low costs, and accessibility to the Latin American market.

---

## 📋 Pitch Deck Sections

### Problem

Latin American users face a "liquidity trap": they hold crypto or USD stablecoins to hedge against inflation, but traditional credit in local currency (like the Mexican Peso) is predatory, with interest rates often hitting 30%+. Existing DeFi lending options are equally insufficient for daily needs because they primarily offer USD-pegged loans with 5-15% APR borrowing costs and require high technical friction. This leaves millions of un/underbanked users unable to access affordable, local-currency liquidity without selling their assets and triggering tax events or losing their market positions.

**The Gap in Latin American Credit:**

- ❌ **Liquidity barriers**: Mexican and Latin American users struggle to access fast loans without KYC-heavy traditional banking, or really high interest rates (30% and more)
- ⏰ **Slow transaction times**: Traditional lending takes days; users need capital urgently
- 💳 **Limited local currency DeFi lending**: Traditional DeFi offers few/no options for borrowing in local fiat-backed stablecoins (like MXNE)
- ⚠️ **High DeFi borrowing costs**: Existing DeFi lending protocols charge 5-15% APY, in USD stablecoins, making short-term loans expensive

**The Scope:**

LatinAmerica and other Global-South markets with large un/underbanked populations and high remittance flows. This matters because access to fast working capital (for merchants, remittances recipients, traders, freelancers, etc) directly improves economic inclusion, reduces FX friction, and enables crypto users to transact locally without converting to/from volatile crypto or enduring slow bank rails.

**The User:**
Our primary persona is "Mateo," a crypto-native freelancer or small business owner in Mexico. Mateo receives payments in USDC but has daily expenses (rent, payroll, supplies) in Mexican Pesos.

- **Needs**: Fast access to MXNe without selling his USDC or navigating a 3-day bank approval process with a extremely high loan denial rate.
- **Goals**: Maintain his long-term savings in USDC while using it as leverage for short-term working capital or local purchasing power; avoid costly bank loans and FX spreads.
- **Frustrations**: Predatory local bank rates (30%+), high gas fees on other chains, lack of DeFi protocols that support local stablecoins like MXNe, severe loan denials due to a lack of formal credit history, slow bank transfers, complex onboarding

This is primarily B2C (consumers, small merchants), with B2B extensions (merchant payouts, remittance integrators) later.

### Solution

**RapiLoans: Instant. Affordable. Borderless.**

RapiLoans provides:
- ✅ **0% interest rate** — Ingeniously subsidized by capturing Morpho USDC yield from collateral
- ⚡ **Instant liquidity** — Borrow MXNE in minutes, not days
- 🔒 **Overcollateralization model** — Supply USDC, borrow MXNE with predictable liquidation mechanics
- 🌐 **Non-custodial** — Users maintain full control via smart contracts on Base
- 📱 **Simple UX** — Intuitive web interface for wallet connection, collateral supply, and borrowing
- 💎 **Sustainable model** — Lenders earn base Morpho MXNE yield plus USDC rewards coming from the Morpho USDC yield generated (total of 6-15% APY); protocol revenue comes from yield spread, not user extraction

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
   - Use USDC to take leveraged positions in MXNE
   - Need fast, cheap capital for short-term opportunities

2. **Mexican & Latin American Crypto Users**
   - Want to borrow in local currency equivalents (MXNE)
   - Avoid traditional banking friction and high rates

3. **Remittance & Cross-Border Payment Users**
   - Receive USDC internationally, borrow MXNE locally
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
| **Local Currency** | MXNE | MXN + fees | Limited options |
| **Non-Custodial** | Yes | No | Yes |
| **Chain** | Base | N/A | Multiple / Expensive |

### Go-to-Market Strategy

**Phase 1 (Launch):**
- Target crypto traders on Base with $1K–$100K USDC collateral
- Partner with Bitso community for MXNE awareness
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

3. Borrow MXNE Against Collateral
   └─> Up to 50% LTV on your collateral value
   └─> 0% interest rate 🎉

4. Use MXNE Instantly
   └─> Trade, spend, or convert as needed

5. Repay Anytime
   └─> Return MXNE to unlock collateral + yield
```

### Technical Architecture

**Built on Base with Morpho Blue:**

- **Morpho USDC Vault** → Supply USDC, earn yield
- **WmUSDC (ERC-4626 Wrapper)** → Non-rebasing collateral asset
- **Morpho Blue Markets** → Uncensorable lending engine
- **Custom Oracle** → USDC/MXNE price feed for safety
- **Frontend UI** → Simple, non-custodial interface

**Why Base?**
- ⚡ Low transaction costs (sub-cent)
- 🚀 High throughput (40K+ TPS)
- 🌱 Thriving DeFi ecosystem
- 🏦 Native support for multiple assets

---

## ✨ Key Features

- ✅ **0% Interest Rate** — Subsidized by the protocol
- ✅ **Instant Liquidity** — Borrow in minutes via Base's speed
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
- Borrows MXNE at **0% interest rate** (fully subsidized)
- Collateral continues earning Morpho yield in the background

**4. Protocol Captures Yield at Repayment**
- When borrower repays MXNE loan, RapiLoans retrieves accrued interest from Morpho's Vaults
- Converts MXNE interest to WmUSDC equivalent via oracle
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
Annual USDC Collateral TVL:       $10M
├─ Loans Generated:               $5M (up to 50% of $10M USDC collateral)
├─ USDC Yield Generated:          $500,000 (5% of $10M USDC collateral)
├──  Loan Interest Subsidies:       $250,000 (up to 50% of yield as APR subsidies)
├──  Lender Incentives:             $150,000 (up to 30% of yield as Bonus APY)
└──  Protocol Revenue:              $100,000 (up to 20% of yield kept by DAO/treasury)
```

### The GTM Advantage

This model is a **game-changing Go-to-Market strategy**:

✅ **Attract Early Lenders:**
- Lenders earn Morpho yield (5-10% base) + up to 30% of USDC yield as incentive APY
- Total yield: **7-13% APY** (far better than traditional options)

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
- Lend APY: 7-13% (Morpho + incentives)
- Spread: 10-20% to protocol from USDC yield ✓
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
- Base Testnet (official deployment chain)
- The Graph for subgraph indexing
- IPFS for decentralized storage

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- MetaMask or compatible Web3 wallet
- USDC and MXNE on Base Mainnet

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
PRIVY_APP_SECRET=your_privy_app_secret
BASE_SEPOLIA_RPC=https://sepolia.base.org
PRIVY_SIGNING_KEY=wallet-auth:signing_key
NEXT_PUBLIC_PRIVY_SIGNER_ID=your_signer_id

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Deployment to Base Testnet

You need to follow these steps:
```bash
# 1. Deploy WmUSDC, and oracle contracts (if needed)
# 2. Create USDC/MXNE lending market on Morpho Blue
# 3. Output market IDs for frontend configuration
```

**Update frontend configuration:**
Edit `next-app/src/constants/contracts.ts` with deployed contract addresses from the output.

---

## 💻 Smart Contract Overview

### 1. **MockMXNE.sol**
ERC-20 token representing Mexican Peso stablecoin. 
- 6 decimals (matches USDC)
- Owner-controlled minting for initial liquidity

### 2. **WmUSDC.sol**
ERC-4626 vault wrapper around Morpho's mUSDC token.
- Non-rebasing shares for collateral composability
- Price per share increases as Morpho yields accrue
- Enables collateral to earn yield while borrowed

### 3. **WmusdcMxneOracle.sol**
Price oracle providing WmUSDC/MXNE exchange rate for Morpho Blue markets.
- Safe pricing for risk management
- 77% LTV (Loan-to-Value) ratio

### 4. **MXNEFaucet.sol** (Testnet)
Faucet contract for minting test MXNE tokens during development.

---

## 📊 Morpho Blue Market Configuration

**RapiLoans creates one primary market:**

```
Market: MXNE Loan / WmUSDC Collateral
├─ Loan Token: MXNE
├─ Collateral Token: WmUSDC (yield-bearing)
├─ Oracle: WmusdcMxneOracle
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
- Real-time wallet balance display (USDC, MXNE, WmUSDC)
- Active loan status and liquidation risk
- APY and yield tracking

**Lending:**
- Deposit USDC → Mint mUSDC from Morpho
- Wrap mUSDC → WmUSDC (ERC-4626)
- Supply WmUSDC as collateral

**Borrowing:**
- Borrow MXNE against WmUSDC collateral
- See real-time borrowing capacity
- Track health factor

**Repayment:**
- Repay MXNE loans anytime, with no penalties
- Withdraw collateral
- Claim accrued yield

---

## 🌐 Base Network Details

**Official RapiLoans Chain:** Base Testnet 

- **Chain ID:** 84532
- **RPC:** https://sepolia.base.org
- **Block Explorer:** https://sepolia-explorer.base.org
- **Gas Token:** ETH (native)

**Official RapiLoans Chain:** Base Mainnet

- **Chain ID:** 8453
- **RPC:** https://mainnet.base.org
- **Block Explorer:** https://base.blockscout.com/
- **Gas Token:** ETH (native)
- **LOAN TOKEN (MXNE):** https://basescan.org/token/0x269cae7dc59803e5c596c95756faeebb6030e0af


**Why Base?**
- Ultra-low transaction fees
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
| **Pricing** | WmusdcMxneOracle | Safe collateral valuation |
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
- ✅ Launch on Base Testnet
- ✅ Core USDC/MXNE market live
- Target: $1M initial TVL

**Q2 2026:**
- Governance token ($MONI) introduction
- Protocol revenue sharing with stakers
- Remittance partnership pilots

**Q3 2026:**
- Expand to additional stablecoins (ARS, BRL, COP)
- Mobile app release
- Cross-chain bridging (Arbitrum, Avalanche, Solana)

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
Powered by **Base**, **Morpho Blue** and Bitso/Juno

Special thanks to:
- [Morpho Labs](https://morpho.org/) for the lending protocol
- [EtherFuse](https://brale.xyz/stablecoins/MXNe) for MXNE innovation
- [Base](https://www.base.dev/) for ecosystem support

---

**Status:** 🚀 Ready for Base Testnet  
**Last Updated:** March 2026  