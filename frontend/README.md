## Frontend (Transparency Dashboard)

React + TypeScript + Vite + wagmi/viem single‑page app that visualizes real‑time allocations from the `DonationSplitter` contract.

### Key Concepts

This frontend has been adapted into a public transparency dashboard for a DonationSplitter contract. Key concepts:

- Pending: Unwithdrawn allocation per beneficiary (`pendingEth` inside the contract logic).
- Withdrawn: Historical amount already withdrawn (tracked via new `withdrawnEth` mapping).
- Lifetime: Pending + Withdrawn.
- Percent column still reflects share of distribution (BPS / 10000).

### Configure Beneficiaries
Update `src/beneficiaries.ts`:
- Replace `address` with verified beneficiary payout addresses.
- Keep `bps` sum equal to 10000 (100%).
- Update `logoSrc` to an SVG placed under `public/logos/` (opt). Provide an accessible color-agnostic version if possible.

### Adding / Removing Beneficiaries
If you change the number of beneficiaries you must:
1. Update the backend Ignition deployment (beneficiaries array passed to constructor).
2. Ensure BPS total = 10000.
3. Frontend automatically adapts (multicall uses `beneficiaryTotals`). No manual hook changes needed now.

### Testnet/Mainnet Safety
Inline chip indicates current chain. Mainnet donations trigger a confirmation modal. Network mismatch disables donate actions.

### Styling / Theming
Global variables in `src/index.css` (`:root`) control palette and radii. Adjust `--accent` and `--accent-alt` for brand colors.

### Extending Metrics
You can add more views:
- Historical timeseries: index events (DonationRecorded, Withdrawn) off-chain and build a chart.
- Proof export: generate a Merkle tree for pending balances (verifiable snapshot).

### Local Dev
```bash
npm install
npm run dev
```
Vite config (`vite.config.ts`) can set `base` if deploying under a subpath.

### Environment Variables
Create / edit `frontend/.env` (NOT the root) with:

```
VITE_TARGET_CHAIN=local   # options: local | sepolia | mainnet (aliases: localhost/hardhat -> local, sep -> sepolia, main -> mainnet)
#VITE_HARDHAT_RPC=https://<your-codespace-subdomain>-8545.app.github.dev
```

Behavior:
- If `VITE_TARGET_CHAIN` is missing or invalid → defaults to `sepolia` and logs a console warning.
- The UI (when no wallet) shows `CONFIGURED: <Chain>` pill using this value.
- When a wallet connects, the live chainId drives the TESTNET/MAINNET badge; local 31337 is treated as testnet (not real ETH).
- Mismatch (wallet chain != configured target) disables donate & shows an alert.
- `VITE_HARDHAT_RPC` lets you point localhost chain to a remote Codespaces Hardhat node; fallback is `http://127.0.0.1:8545`.

Console Diagnostics:
- On load you will see: `[DonationSplitter] VITE_TARGET_CHAIN raw value: <raw> | resolved: <Label> id <id>`.
	Use this to confirm the value was parsed as expected.

### Dynamic Contract Address Resolution
`src/contractInfo.ts` exports:
- `DONATION_SPLITTER_ADDRESSES` map (chainId → address)
- `getDonationSplitterAddress(runtimeChainId?)` chooses the connected chain address if known else env target.
- `TARGET_CHAIN_ID`, `TARGET_CHAIN_LABEL`, `TARGET_CHAIN_RAW` derived from the env variable.

Add new deployments simply by appending to `DONATION_SPLITTER_ADDRESSES` and ensuring the backend deployment history / JSON beneficiaries are consistent.

### Address / ABI Updates
Edit `src/contractInfo.ts` after each redeploy. Ensure ABI includes `beneficiaryTotals` + `withdrawnEth` if contract changes.

### Responsive
Mobile breakpoints at 640px & 480px collapse stats and compress chips; stacked bar only on small screens.

### Cross References
- Project overview: [../README.md](../README.md)
- Backend (deployment & history): [../backend/README.md](../backend/README.md)
