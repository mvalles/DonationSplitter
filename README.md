## DonationSplitter

Built for ETHGlobal Online 2025
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
## 1. Architecture (Overview)
High‑level flow:
```
Wallet → Frontend (React + wagmi/viem) → Ethereum (target chain) → DonationSplitter
             ^                                |
             +----- periodic reads (beneficiaryTotals, pendingEth, balances)
```
Core contract API (summary – full table in backend README): donateETH(), withdrawETH(), beneficiaryTotals(address).
Events: DonationRecorded, Withdrawn, BeneficiariesUpdated.

UI features: real‑time polling, stacked activity bars (withdrawn vs pending), target‑anchored reads (avoid flicker on wallet network change), minimal mismatch notice, theming.

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
## 3. Environment Variables (Pointers)
Canonical, always‑updated details:
- Backend env & DS_ENV selection: see [backend/README.md](./backend/README.md#environment--secrets)
- Frontend env (target selection, optional Hardhat RPC): see `frontend/README.md` (section Environment)

Quick recall:
```
DS_ENV=dev|sepolia|mainnet   # backend deploy selection
VITE_TARGET_CHAIN=local|sepolia|mainnet  # dashboard read/label target
VITE_HARDHAT_RPC=<remote-hardhat-url>    # optional; enables remote Codespaces access
```
Set `VITE_DEBUG_NETWORK=1` (frontend) to surface the debug chain panel (development only).

---
## 4. Deployment (Short Form)
Backend deploy commands (full guidance, safety flags, beneficiary JSON rules): see [backend/README.md](./backend/README.md#deploy-testnet--mainnet).

Lifecycle reminder after deploy:
1. Append row to backend Deployment History.
2. Update `frontend/src/contractInfo.ts` address map.
3. Trigger frontend rebuild (e.g. Vercel) if public dashboard.

---
## 5. Current Deployments
For authoritative addresses & provenance: see backend Deployment History table.

---
## 6. Beneficiaries Configuration
On-chain source of truth: JSON files in `backend/beneficiaries/` (picked by DS_ENV). UI metadata (logos, descriptions) lives in `frontend/src/beneficiaries.ts`.
Rules & validation: see backend README (section Modifying Beneficiaries). Ensure total BPS = 10000 before any deploy.

---
## 7. Frontend Deployment
Detailed Vercel / hosting steps: see `frontend/README.md` (deployment section). This root file only tracks contract / config interplay.

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