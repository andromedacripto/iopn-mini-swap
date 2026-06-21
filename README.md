# OPN Mini Swap

![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?logo=solidity&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-blue?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)
![Network](https://img.shields.io/badge/network-OPN%20Testnet%20(984)-orange)
![Status](https://img.shields.io/badge/status-live%20demo-brightgreen)

A minimal **Uniswap V2-style AMM DEX** built from scratch for the **IOPn (OPN Chain) Testnet** — Solidity contracts on one side, a Next.js + TypeScript + wagmi/viem frontend on the other, with a built-in faucet so anyone can try a real swap without owning any tokens first.

**Live demo:** https://opnxwap.vercel.app/

---

## Table of contents

- [What it does](#what-it-does)
- [Architecture](#architecture)
- [Contracts](#contracts)
- [Deployed addresses (OPN Testnet)](#deployed-addresses-opn-testnet)
- [Frontend](#frontend)
- [Security notes](#security-notes)
- [Quickstart](#quickstart)
- [Project structure](#project-structure)
- [Roadmap](#roadmap)
- [Disclaimer](#disclaimer)

---

## What it does

OPN Mini Swap lets you connect a wallet, claim free test tokens from a faucet, and swap between two ERC-20 test tokens (TKA / TKB) through an on-chain AMM pool — all on the OPN Chain Testnet (chainId `984`).

It exists to answer one question concretely: *what does a Uniswap V2-style DEX look like when written from scratch, with no external dependencies, on a fully EVM-compatible chain?*

- Connect a wallet (MetaMask or any injected wallet) and auto-detect/switch to OPN Testnet.
- Claim 10 TKA every 24h from the built-in `Faucet` contract — no pre-existing balance required.
- Get a live quote, set your own slippage tolerance, and swap TKA ⇄ TKB with on-chain deadline and slippage protection.
- Every transaction is real — testnet, but real contracts, real reverts, real confirmations.

---

## Architecture
                     ┌──────────────────┐
                     │   OPNSwapFactory  │
                     │  (creates pairs)  │
                     └─────────┬─────────┘
                               │ CREATE2
                               ▼
┌────────────┐   transferFrom   ┌──────────────────┐   mint/burn LP   ┌─────────────────┐

│   Wallet    │ ───────────────▶ │   OPNSwapPair     │ ◀──────────────│  OPNSwapERC20   │

│  (user)     │                  │ (AMM, x*y=k pool) │                 │ (LP token base) │

└─────┬──────┘                  └────────▲─────────┘                 └─────────────────┘

│                                  │

│   swapExactTokensForTokens       │ swap()

▼                                  │

┌─────────────┐                          │

│ OPNSwapRouter│ ─────────────────────────┘

│ (entry point)│

└──────┬───────┘

│ deposit/withdraw

▼

┌─────────────┐        ┌─────────────┐        ┌─────────────┐

│    WOPN      │        │  TestToken   │        │   Faucet     │

│ (wrap native)│        │  (TKA / TKB) │        │ (10 TKA/24h) │

└─────────────┘        └─────────────┘        └─────────────┘

The Router is the only contract the frontend talks to for swaps and liquidity. User tokens move straight from wallet to Pair via `transferFrom` — they never sit in the Router's own balance, which removes the classic "malicious router holds your funds" risk class entirely.

---

## Contracts

| Contract | Role |
|---|---|
| **`OPNSwapFactory`** | Creates and indexes liquidity pairs via deterministic `CREATE2` — pair addresses are predictable, never front-runnable. |
| **`OPNSwapRouter`** | The entry point for swaps and liquidity. Every state-changing call enforces an on-chain `deadline` and an explicit `amountOutMin`/`amountInMax` check — real on-chain guarantees, not just UI hints. |
| **`OPNSwapPair`** | The AMM pool itself. Constant-product invariant (`x * y = k`), 0.3% swap fee, mints/burns LP tokens. |
| **`OPNSwapERC20`** | Minimal ERC-20 base (with permit) that `OPNSwapPair` inherits from to issue LP tokens. |
| **`WOPN`** | Wrapped OPN — a WETH9-style wrapper around the chain's native token, so it can be traded like any other ERC-20. |
| **`TestToken`** | A minimal hand-written ERC-20, deployed twice (as TKA and TKB) to have something to trade. |
| **`Faucet`** | Distributes 10 TKA per wallet every 24h. Has no mint power — it only redistributes a balance the owner funds manually, so a worst-case compromise leaks at most its own reserve, never the token's total supply. |

All contracts: `pragma solidity =0.8.20`, **zero external dependencies** (no OpenZeppelin, no proxies, no upgradeability). Access control, the ERC-20 standard, and the fixed-point math used for price accumulators are all implemented by hand — the whole system is small enough to read end-to-end in one sitting.

---

## Deployed addresses (OPN Testnet)

> Network: **OPN Testnet** · chainId `984` · RPC `testnet-rpc.iopn.tech`

| Contract | Address |
|---|---|
| OPNSwapFactory | `0x4642c152796b582f76F724aC031C094ca4e94666` |
| OPNSwapRouter | `0xe2bA49F5Cbd691246d11DF2eA01634EA43E624A5` |
| WOPN | `0x2d66aaC10452fde876a2E46eFD745C30a49B97B4` |
| TestToken (TKA) | `0x91868509607d179781bD5776FBCfCB30Dd5629fE` |
| TestToken (TKB) | `0xC3DF6c7d9c2ba5C000f76f33ee3746C042b5a61d` |
| Faucet | `0x7e5c2C1c206912692b10A6d3c950e01227DD2006` |

TKA and TKB are two deployments of the **same** `TestToken` contract, with different constructor parameters (`name`, `symbol`) — there's intentionally no separate `TokenA.sol`/`TokenB.sol` file.

---

## Frontend

Next.js (App Router) + TypeScript, styled with Tailwind, wallet connection and contract calls via **wagmi**/**viem**.

- Wallet connection with automatic network detection and a one-click switch to OPN Testnet.
- Live swap quotes, configurable slippage tolerance (presets + custom value), and an on-chain deadline on every swap.
- Full input validation before any transaction is sent — no malformed amount ever reaches the wallet.
- Clear approve → swap flow with explicit pending/confirming/success/error states, and on-chain revert reasons translated into plain-language messages instead of raw Solidity strings.
- A faucet widget that reads the live cooldown and faucet reserve directly from the chain, so the button always reflects on-chain truth instead of a guess.

---

## Security notes

These are deliberate design choices made while writing the contracts, not afterthoughts:

- **Checks-Effects-Interactions everywhere.** `Faucet.claim()` updates the cooldown timestamp *before* calling `transfer`; `WOPN.withdraw()` debits the balance *before* the native-token `call`. Both close the reentrancy window by construction.
- **No router custody.** The Router never holds user funds between approve and swap — tokens go straight from the user's wallet to the Pair contract.
- **Deadline + slippage are enforced on-chain**, not just suggested by the UI. `amountOutMin` / `amountInMax` are `require`d before any transfer happens.
- **The Faucet can't mint.** It only redistributes a balance the owner deposits manually — a compromised faucet can never threaten the token's total supply, only its own reserve.
- **Deterministic pair addresses via `CREATE2`** remove any front-running risk on which address a new pair will get.

This is a testnet demo, not an audited production system — see [Disclaimer](#disclaimer).

---

## Quickstart

### 1. Get test OPN

Grab test OPN from the faucet to pay for gas: https://faucet.iopn.tech

### 2. Deploy the contracts

```bash
cd contracts
npm install
cp .env.example .env
# edit .env with your test wallet's PRIVATE_KEY

npm run deploy:testnet
```

This prints — and saves to `contracts/deployed/opnTestnet.json` — the addresses of the Factory, Router, WOPN, and the two test tokens (TKA/TKB), already with initial liquidity added.

### 3. Configure and run the frontend

```bash
cd ../frontend
npm install
cp .env.local.example .env.local
# edit .env.local with the addresses printed above

npm run dev
```

Open http://localhost:3000, connect your wallet (MetaMask), confirm you're on **OPN Testnet** (chainId `984`), and try a swap between TKA and TKB.

---

## Project structure
opn-mini-swap/

├── contracts/                  Solidity contracts + Hardhat

│   ├── contracts/

│   │   ├── OPNSwapFactory.sol

│   │   ├── OPNSwapPair.sol

│   │   ├── OPNSwapRouter.sol

│   │   ├── OPNSwapERC20.sol

│   │   ├── WOPN.sol

│   │   ├── TestToken.sol

│   │   ├── Faucet.sol

│   │   ├── interfaces/

│   │   └── libraries/

│   ├── scripts/                deploy.js, deploy-faucet.js

│   └── test/                   Hardhat + Chai test suite

└── frontend/                   Next.js (App Router) + TypeScript

├── app/

├── components/              SwapCard, FaucetButton, ConnectWallet

├── hooks/                   useSwap, useFaucet

└── lib/                     contracts, abis, chains, wagmi config

---

## Roadmap

**Q1 2026 — Hardening & audit prep**
- Third-party security review of the Factory/Pair/Router trio before any move past testnet.
- Fuzz-testing suite (Echidna/Foundry invariants) on top of the existing Chai test suite.
- Gas profiling pass on the swap paths.

**Q2 2026 — Feature completeness**
- Multi-hop swap routing in the UI (the Router already supports `path[]`).
- LP position dashboard — add/remove liquidity from the UI, not just via scripts.
- On-chain price charts and swap history.

**Q3 2026 — Beyond testnet**
- Formal audit and remediation cycle.
- Mainnet deployment plan, contingent on audit results.
- Governance/timelock for `feeToSetter`, replacing the current single-owner control.

---

## Disclaimer

This is a **testnet-only demo project**. Tokens have no real value, and the contracts have **not** been professionally audited. Do not deploy to mainnet or use with real funds without an independent security audit.

---

## License

MIT
