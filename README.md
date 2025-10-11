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

Spin up local Hardhat node & deploy:
```bash
cd backend
npx hardhat node          # local chain
npx hardhat ignition deploy --network localhost ignition/modules/DonationSplitter.ts
```

Run the frontend:
```bash
cd ../frontend
npm run dev
```

Update the contract address in `frontend/src/contractInfo.ts` with the one printed by Ignition (if it changed).

---
## 3. Environment Variables
Create a `backend/.env` (or use Hardhat keystore) for testnet/mainnet deploys:
```
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/<key>
SEPOLIA_PRIVATE_KEY=0x<64hex>
```
Optional (frontend – if you externalize config in future):
```
VITE_DONATION_SPLITTER_ADDRESS=0x...
```

---
## 4. Deployment Cheat‑Sheet
Local:
```bash
npx hardhat ignition deploy --network localhost ignition/modules/DonationSplitter.ts
```
Sepolia:
```bash
npx hardhat ignition deploy --network sepolia ignition/modules/DonationSplitter.ts
```
After redeploy: update `contractInfo.ts`, append row to backend deployment history table.

---
## 5. Current Testnet Deployment
See authoritative table in [backend/README.md](./backend/README.md#deployment-history). Latest known Sepolia address (for UI):
```
0xcb9CB1159999fBd1cf0AC07c7eE6de8A148A2D8d
```

---
## 6. Customizing Beneficiaries
Edit `frontend/src/beneficiaries.ts` (labels, addresses, bps, logos). Keep total BPS = 10000. Redeploy backend if you alter the constructor beneficiary list.

---
## 7. Contributing / Next Steps
- Add historical charts (index events off‑chain)
- Export verifiable snapshot (Merkle tree of pending balances)
- Admin rotation / multisig ownership
- Additional asset support (ERC20) using extended splitter

PRs & issues welcome. Keep READMEs in sync when addresses or flows change.

---
## 8. License / Disclaimer
Prototype educational MVP. Review, audit, and test thoroughly before any mainnet usage.

*(Secciones originales en español se han condensado; aún puedes añadir traducción completa si lo deseas.)*