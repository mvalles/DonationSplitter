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
# Select dashboard data source chain (affects which contract address is shown when wallet disconnected)
VITE_TARGET_CHAIN=local        # local | sepolia | mainnet (aliases: localhost/hardhat -> local, sep -> sepolia, main -> mainnet)

# Optional RPC for remote Hardhat (Codespaces / tunnel). If unset defaults to http://127.0.0.1:8545
VITE_HARDHAT_RPC=https://<codespace-subdomain>-8545.app.github.dev

# Uncomment to show a small debug panel with chain diagnostic info
#VITE_DEBUG_NETWORK=1
```

Behavior:
1. Missing/invalid `VITE_TARGET_CHAIN` → defaults to `sepolia` (logs an info/warn in console).
2. TARGET badge always reflects configured chain (even if wallet on otra red).
3. If wallet chain ≠ target, donate/withdraw are deshabilitados y aparece aviso de mismatch.
4. Datos de beneficiarios quedan anclados al target para evitar “saltos” al cambiar red en la wallet.
5. `VITE_HARDHAT_RPC` permite que el navegador acceda a un nodo Hardhat remoto (p.ej. Codespaces) en lugar de localhost.

Console Diagnostics:
- On load: `[DonationSplitter] VITE_TARGET_CHAIN raw value: <raw> | resolved: <Label> id <id>`.
  Úsalo para verificar parsing correcto.

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

### Deploying to Vercel (Sepolia)
1. Asegúrate de tener en `src/contractInfo.ts` la dirección correcta para chainId 11155111.
2. Configura en Vercel (Project Settings → Environment Variables):
	- `VITE_TARGET_CHAIN=sepolia`
	- (Opcional) `VITE_HARDHAT_RPC=https://<codespace-subdomain>-8545.app.github.dev` si quieres fallback local.
3. Ajusta root directory a `frontend/` si usas monorepo.
4. Build command: `npm run build` (usa scripts existentes).
5. Tras el despliegue abre DevTools → Console y verifica el log de resolución de cadena.
6. Al redeploy del contrato: actualiza `contractInfo.ts` + dispara nuevo build.

Hardening opcional:
- Añade encabezados de seguridad (Strict-Transport-Security, X-Frame-Options) con un archivo `vercel.json` si se requiere.
- Revisa que no haya variables sensibles expuestas (prefijo VITE_ es público).
