# GiveClear: Donations you can verify

GiveClear is a donation safe. Donors give to an organization's campaign, and the money is held in a smart contract on BNB Smart Chain (BSC) testnet. The organizer can only take money out by uploading a receipt. Gemini reads the receipt and checks it against the claim. If it matches, the payment is sent. If not, it is rejected with a plain reason. Everything is recorded on-chain and can be checked on BscScan.

Testnet only. No real funds, no token launches. In the app, 1 mUSD (the practice token) is shown as 1 peso.

## How it works

1. The platform owner registers organizations as campaigns (each has its own balance).
2. A donor picks a campaign, connects MetaMask, and donates practice pesos into the safe.
3. The organizer submits an expense (amount, purpose, supplier wallet) with a receipt photo. The photo's fingerprint (hash) is saved on-chain.
4. The backend reads the claim from the chain, sends the photo to Gemini, and gets back JSON (items, total, matches or not).
5. If the receipt is readable, the total is within 1 peso of the claim, and Gemini says it matches, the backend approves and the contract pays the supplier. Otherwise it rejects and no money moves.
6. The public "Follow the funds" list shows every expense, its status, the check result, and a link to the payment record.

## Roles

| Role | Who | What they can do |
| --- | --- | --- |
| Owner | You (deployer wallet) | Register campaigns, change the approver |
| Approver | Backend wallet | Approve or reject requests. Cannot pay more than the claim or the campaign balance |
| Organizer | One wallet per campaign | Submit expenses for its own campaign only |
| Donor | Anyone with a wallet | Donate to a campaign |

For the demo, use one wallet as owner and approver, a second MetaMask account as organizer, and a third as donor.

## Project layout

```
contracts/   Hardhat (TypeScript) + Solidity: MockUSD, GiveClear, tests, deploy and verify scripts
backend/     Node + Express + TypeScript: receipt check with Gemini, approve/reject on-chain
frontend/    React + TypeScript + Vite + Tailwind: donor and organizer screens
```

## Before you start

- Node.js 20 or newer
- MetaMask with 3 accounts (use fresh test accounts, never one with real money)
- Test BNB (tBNB) from the BNB Chain testnet faucet in the owner/approver account and the organizer account (needed for network fees)
- Gemini API key from Google AI Studio (aistudio.google.com/apikey)
- BscScan API key (bscscan.com/myapikey, or an Etherscan key, which also works for BscScan)

Keep keys and private keys in `.env` files only. Never commit them or paste them into chats.

## Quick Start: Running Everything Locally (No Testnet, 100% Free)

You can run the entire stack on your machine without testnet BNB, faucets, or mainnet balances. Hardhat provides instant local mining and 20 pre-funded test accounts with 10,000 free coins each.

### 1. Terminal 1: Start the Local Blockchain Node
```bash
cd contracts
npm install
npm run node
```
*Keep this terminal running. It starts a local JSON-RPC server at `http://127.0.0.1:8545`.*

### 2. Terminal 2: Deploy Contracts & Start Backend
In a new terminal, deploy the contracts to your local node:
```bash
cd contracts
npm run deploy:local
```
Then start the backend server:
```bash
cd ../backend
npm install
npm run dev
```
*The backend connects to your local node and Gemini API on `http://localhost:4000`.*

### 3. Terminal 3: Start the Frontend
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Open the Vite URL printed in your console (usually `http://localhost:5173`).

### 4. Connect MetaMask (Import Free Test Wallet)
1. In MetaMask, click the account dropdown > **Add account or hardware wallet** > **Import account**.
2. Paste this pre-funded Hardhat test private key (comes with 10,000 free local coins):
   ```text
   0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```
3. Add or switch to **Hardhat Localhost** in MetaMask:
   - **RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency symbol**: `ETH` (or `tBNB`)
4. Click **Connect Wallet** and **Get practice pesos** in GiveClear to begin donating and testing!

---

## Setup (BSC Testnet Mode)

```bash
cd contracts
npm install
cp .env.example .env     # fill in PRIVATE_KEY, BSCSCAN_API_KEY, ORGANIZER_ADDRESS
npx hardhat test
npm run deploy
npm run verify
```

`npm run deploy` deploys both contracts, creates 3 example campaigns, mints practice tokens, and saves addresses to `contracts/deployments/bscTestnet.json`.
`npm run verify` verifies both on BscScan (a hard requirement of the hackathon). Do this early.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `GEMINI_API_KEY`, `PRIVATE_KEY` (the approver wallet, which must match `APPROVER_ADDRESS` used at deploy time), and `GIVECLEAR_ADDRESS` (from the deployments file). The approver wallet needs a little tBNB.

```bash
npm run dev
```

Check `http://localhost:4000/api/health`.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Fill in `VITE_GIVECLEAR_ADDRESS`, `VITE_TOKEN_ADDRESS`, and `VITE_DEPLOY_BLOCK` from the deployments file.

```bash
npm run dev
```

Open the URL Vite prints. On first connect, MetaMask is asked to switch to BNB Smart Chain Testnet (chain ID 97).

## Demo script (about 3 minutes)

1. Open the home page and show the campaigns with their totals.
2. As the donor: connect, click "Get practice pesos", donate 500 to a campaign. Show "Payment confirmed".
3. Switch MetaMask to the organizer account. Open "For organizers", pick the campaign, enter an amount that matches a sample receipt, a supplier wallet, and upload the receipt. Show the receipt check and "Payment confirmed".
4. Submit a second expense with a receipt that does not match the amount. Show that Gemini rejects it and no money moves.
5. Open "Follow the funds" and click "View payment record" to show the transaction on BscScan.
6. Show the verified contract on BscScan.

Prepare two sample receipt photos ahead of time: one that matches and one that does not.

## Troubleshooting

- **Verification fails:** check that the constructor arguments match (token address and approver address) and that your key is set. If your hardhat-verify version is old, run `npm i -D @nomicfoundation/hardhat-verify@latest`.
- **RPC errors or timeouts:** the public testnet RPC can be slow or change. Find the current RPC in docs.bnbchain.org and set `BSC_TESTNET_RPC`, `RPC_URL`, and `VITE_RPC_URL`.
- **"Model not found" from Gemini:** set `GEMINI_MODEL` in `backend/.env` to a current model name from AI Studio.
- **"Not the approver":** the backend `PRIVATE_KEY` is not the wallet used as `APPROVER_ADDRESS`. Fix it, or call `setApprover` from the owner wallet.
- **Wallet says insufficient funds:** the account needs tBNB for network fees.
- **A request stays "Waiting":** the receipt check did not finish. Use "Retry receipt check" on the organizer page.
- **No payment links:** set `VITE_DEPLOY_BLOCK` in `frontend/.env`.

## Honest limits (good to say out loud in the pitch)

- The approver is a single backend wallet in this prototype. It only carries out the AI result, and the contract limits what it can pay. A real version would use several approvers or a human review step for large amounts.
- The receipt check can spot differences, but it cannot prove a receipt is genuine.
- The mock token has an open mint function. It is for testing only.
- Organizers are registered by the owner. A real version needs an organization verification step.

## Stack

Solidity (OpenZeppelin), Hardhat + TypeScript, BNB Smart Chain testnet, ethers.js, Node + Express, Google Gemini API, React + Vite + Tailwind CSS, Inter font, Lucide icons, MetaMask.
