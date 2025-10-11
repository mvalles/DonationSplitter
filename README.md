## DonationSplitterMVP
Public transparency & allocation dashboard for a smart contract that splits incoming ETH among pre‑configured humanitarian beneficiaries (equal or weighted shares) and tracks:

- Pending: funds allocated but not yet withdrawn
- Withdrawn: funds already claimed by a beneficiary
- Lifetime: cumulative (pending + withdrawn)

### Repo Layout
```
backend/   Hardhat 3 + Ignition module + Solidity (DonationSplitter)
frontend/  React + Vite + wagmi/viem dashboard UI
```

### Quick Links
- Backend details & deployment history: [backend/README.md](./backend/README.md)
- Frontend UI & customization: [frontend/README.md](./frontend/README.md)

---
## 1. Architecture
Flow (simplified):
```
User Wallet -> Frontend (React + wagmi/viem) -> Ethereum Network (Sepolia/Mainnet) -> DonationSplitter Contract
					|                                         |
					+-- reads beneficiaryTotals() ------------+
					+-- donateETH() / withdrawETH() txs ------+
```

Key contract surface:
- `donateETH()` (payable) – records donation and internally apportions pending shares.
- `withdrawETH()` – beneficiary pulls their accumulated pending allocation (updates withdrawn tracking).
- `beneficiaryTotals(address)` – view returning (pending, withdrawn, lifetime).
- Events: `DonationRecorded`, `Withdrawn`, `BeneficiariesUpdated`.

Frontend highlights:
- Real‑time polling of aggregated pending/withdrawn values via multicall.
- Stacked visualization (withdrawn vs pending) per beneficiary.
- Mainnet safety confirmation & network mismatch handling.
- Theming (dark/light) + responsive layout optimizations.

---
## 2. Getting Started (Local Dev)
Clone & install dependencies:
```bash
git clone <repo>
cd DonationSplitterMVP
cd backend && npm install || yarn install || pnpm install
cd ../frontend && npm install
```

Spin up local Hardhat node & deploy (explicit DS_ENV=dev for beneficiary JSON selection):
```bash
cd backend
export DS_ENV=dev
npx hardhat node          # local chain (keep running)
# In a second terminal (still in backend/):
DS_ENV=dev npx hardhat ignition deploy --network localhost ignition/modules/DonationSplitter.ts
```

Run the frontend:
```bash
cd ../frontend
npm run dev
```

Update the contract address in `frontend/src/contractInfo.ts` with the one printed by Ignition (if it changed).

---
## 3. Environment Variables

### Backend (`backend/.env` or keystore)
```
# RPC endpoints
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/<key>
MAINNET_RPC_URL=https://mainnet.infura.io/v3/<key>

# Deployer private keys (NEVER commit)
SEPOLIA_PRIVATE_KEY=0x<64hex>
MAINNET_PRIVATE_KEY=0x<64hex>

# Optional safety flag for mainnet deploy
MAINNET_DEPLOY=1
```
At deploy time set the beneficiary config environment:
`DS_ENV=dev | sepolia | mainnet` (defaults to `dev` if unset).

### Frontend (`frontend/.env`)
```
VITE_TARGET_CHAIN=local   # local | sepolia | mainnet (aliases: localhost/hardhat -> local, sep -> sepolia, main -> mainnet)
VITE_HARDHAT_RPC=https://<codespace-subdomain>-8545.app.github.dev  # optional remote hardhat URL
#VITE_DEBUG_NETWORK=1      # enable extra debug panel
```
If deploying dashboard for Sepolia in Vercel, set:
```
VITE_TARGET_CHAIN=sepolia
```
And ensure `DONATION_SPLITTER_ADDRESSES[11155111]` in `src/contractInfo.ts` is the latest deployed address.

---
## 4. Deployment Cheat‑Sheet
Local (Hardhat dev config):
```bash
DS_ENV=dev npx hardhat ignition deploy --network localhost ignition/modules/DonationSplitter.ts
```
Sepolia:
```bash
DS_ENV=sepolia npx hardhat ignition deploy --network sepolia ignition/modules/DonationSplitter.ts
```
Mainnet (after audits / review):
```bash
DS_ENV=mainnet MAINNET_DEPLOY=1 npx hardhat ignition deploy --network mainnet ignition/modules/DonationSplitter.ts
```

After any redeploy: update `contractInfo.ts` address map + append a row to backend deployment history table.

---
## 5. Current Testnet Deployment
Authoritative table: [backend/README.md](./backend/README.md#deployment-history). Latest Sepolia address (sync this if changed):
```
0xcb9CB1159999fBd1cf0AC07c7eE6de8A148A2D8d
```

---
## 6. Customizing Beneficiaries
Edit `frontend/src/beneficiaries.ts` (labels, addresses, bps, logos). Keep total BPS = 10000. Redeploy backend if you alter the constructor beneficiary list.

On-chain constructor distribution sources the JSON file in `backend/beneficiaries/<env>.json` selected by `DS_ENV`. Keep that JSON and frontend list logically aligned (frontend adds presentation metadata; contract uses only address+bps).

---
## 7. Deploying Frontend to Vercel (Sepolia example)
1. Push repository to GitHub.
2. Import project in Vercel.
3. Set build command (auto from `package.json`): `npm run build` inside `frontend` (either set root to `frontend/` or use monorepo config with `rootDirectory`).
4. Environment Variables in Vercel UI:
	- `VITE_TARGET_CHAIN=sepolia`
	- (Optional) `VITE_HARDHAT_RPC=https://...` if you want fallback local simulation.
5. Redeploy. Confirm console log in browser shows resolved target chain.
6. When upgrading contract: redeploy backend, update `contractInfo.ts`, trigger new Vercel build.

Optional hardening:
- Set `X-Frame-Options: DENY` (Vercel Security Headers) if you add a custom config.
- Enable analytics only after privacy review.

## 8. Contributing / Next Steps
- Add historical charts (index events off‑chain)
- Export verifiable snapshot (Merkle tree of pending balances)
- Admin rotation / multisig ownership
- Additional asset support (ERC20) using extended splitter

PRs & issues welcome. Keep READMEs in sync when addresses or flows change.

---
## 9. License / Disclaimer
Prototype educational MVP. Review, audit, and test thoroughly before any mainnet usage.

*(Secciones originales en español se han condensado; aún puedes añadir traducción completa si lo deseas.)*