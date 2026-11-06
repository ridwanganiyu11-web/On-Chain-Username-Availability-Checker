# BotName — On-Chain Username Availability Checker

**Your Name. Your Wallet. Your Identity on Botchain.**

A lightweight decentralized username registration system on **Botchain Testnet (Chain ID 968)** built with Solidity, React, Vite, TypeScript, Tailwind CSS, Reown AppKit, Wagmi v2, and Viem.

---

## Botchain Testnet Configuration

| Parameter | Value |
| :--- | :--- |
| **Network Name** | Botchain Testnet |
| **Chain ID** | `968` (`0x3c8`) |
| **RPC URL** | `https://rpc.bohr.life` |
| **Native Token** | `BOT` |
| **Total Supply** | `150 Million` |
| **Block Explorer** | `https://scan.bohr.life/` |

---

## Core Features

1. **Username Search & Availability Checker (`/`)**
   - Instant client-side validation (`3–20` characters, lowercase letters `a–z`, numbers `0–9`, and underscores `_`).
   - Live read-only lookup against `BotUsernameRegistry.sol` on `https://rpc.bohr.life`.
   - Displays **Available** or **Already Claimed** (with owner wallet address, registration timestamp, and link to their public profile).
2. **Username Registration (`/`)**
   - Connects MetaMask or any WalletConnect-compatible wallet via **Reown AppKit + Wagmi v2**.
   - Automatically prompts to add/switch to **Botchain Testnet (Chain ID 968)**.
   - Executes `claimUsername(string username)` on-chain and provides a shareable profile URL upon confirmation.
3. **Public Username Profile (`/u/:username`)**
   - Displays `@username`, linked wallet address (with 1-click copy & Explorer link), network details, and on-chain registration timestamp.
4. **My Username Dashboard (`/dashboard`)**
   - View your wallet's active `@username`.
   - Atomically change your handle (`changeUsername(string newUsername)`) or release it (`releaseUsername()`).
5. **QR Code Sharing**
   - Generates a high-resolution QR code for any `@username` profile using a local QR generator and downloads a branded PNG card.

---

## Smart Contract (`contracts/BotUsernameRegistry.sol`)

- `claimUsername(string username)` — Claim an available username (`3–20` chars, `[a-z0-9_]`, 1 per wallet).
- `isAvailable(string username)` — Check whether a username is valid and unclaimed.
- `getWallet(string username)` — Retrieve the wallet address linked to a username.
- `getUsername(address wallet)` — Retrieve the username linked to a wallet address.
- `changeUsername(string newUsername)` — Atomically replace your existing username with a new available username.
- `releaseUsername()` — Release your current username back to the pool.
- `getProfile(string username)` — Returns `(address wallet, uint256 registeredAt, bool exists)`.

---

## Getting Started

```bash
# Install dependencies
npm install --legacy-peer-deps

# Compile BotUsernameRegistry.sol ABI & Bytecode
npm run compile:contract

# Start local development server
npm run dev
```

### Deploying `BotUsernameRegistry.sol`

You can deploy the contract in two ways:
1. **1-Click In-App Deployment (Recommended)**: Click **Setup Contract** in the top navigation bar, connect your wallet on Botchain Testnet (`Chain ID 968`), and click **Deploy BotUsernameRegistry Now**.
2. **CLI Deployment**:
   ```bash
   PRIVATE_KEY=0xYourPrivateKey npm run deploy:testnet
   ```

