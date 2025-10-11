## Backend (Smart Contract Layer)
Hardhat 3 + Ignition module for deploying the `DonationSplitter` contract.

### Key Contract Functions
| Function | Purpose |
|----------|---------|
| `donateETH()` | Accepts ETH and proportionally credits pending balances to beneficiaries. |
| `withdrawETH()` | Beneficiary claims their pending allocation; updates withdrawn tracking. |
| `beneficiaryTotals(address)` | View returning `(pending, withdrawn, lifetime)` for UI aggregation. |
| `setBeneficiaries(...)` | (Owner) Update distribution list (must sum to 10000 bps). |

Events: `DonationRecorded(donor, amount, timestamp)`, `Withdrawn(beneficiary, amount)`, `BeneficiariesUpdated(count,totalBps)`.

### Development
Compile & test:
```bash
npx hardhat compile
npx hardhat test            # if/when tests added
```

Run local node & deploy:
```bash
npx hardhat node
npx hardhat ignition deploy --network localhost ignition/modules/DonationSplitter.ts
```

### Environment / Secrets
Use environment variables or Hardhat keystore:
```
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/<key>
SEPOLIA_PRIVATE_KEY=0x<64hex>
```
Keystore (alternative):
```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
```

List stored keys:
```bash
npx hardhat keystore list
```

### Deploy (Testnet / Mainnet)
Sepolia:
```bash
npx hardhat ignition deploy --network sepolia ignition/modules/DonationSplitter.ts
```
Mainnet (prepare & double‑check beneficiaries, audits, owner safety):
```bash
npx hardhat ignition deploy --network mainnet ignition/modules/DonationSplitter.ts
```

After each deploy: update the **Deployment History** below and sync frontend `contractInfo.ts`.

### Owner / Deployer
The first configured account in `networks.sepolia.accounts` becomes the owner. To confirm:
```bash
npx hardhat console --network sepolia
> (await hre.viem.getWalletClients())[0].account.address
```
Then verify contract owner:
```js
const c = await hre.viem.getContractAt('DonationSplitter', '<address>');
await c.read.owner();
```

### Modifying Beneficiaries
Beneficiaries are now externalized as JSON per environment (dev / sepolia / mainnet) for reproducible, reviewable config.

#### File Locations
`backend/beneficiaries/`
```
dev.json      # used when DS_ENV=dev (local node / localhost network)
sepolia.json  # used when DS_ENV=sepolia (Sepolia testnet deploys)
mainnet.json  # must be populated BEFORE a mainnet deploy (guarded)
```

Each JSON file is an array of objects:
```jsonc
[
	{ "address": "0x1234...", "bps": 2500, "label": "Org A" },
	{ "address": "0xABCD...", "bps": 2500, "label": "Org B" },
	{ "address": "0x....",  "bps": 2500, "label": "Org C" },
	{ "address": "0x....",  "bps": 2500, "label": "Org D" }
]
```
Rules / validation performed at deploy time:
* Sum of all `bps` must equal exactly 10000.
* No duplicate addresses (case-insensitive).
* No zero address, no zero bps.
* `mainnet.json` MAY NOT be empty. An empty file will abort deployment.
* Mainnet deployment additionally requires explicit `MAINNET_DEPLOY=1` safety flag.

The Ignition module reads `process.env.DS_ENV` (defaults to `dev` if unset) to choose which file to load. If the file is missing or invalid it will throw before broadcasting any transaction.

#### Environment Variable Selection
| DS_ENV value | Uses file        | Typical network command                                 |
|--------------|------------------|---------------------------------------------------------|
| dev          | beneficiaries/dev.json      | `--network localhost` (local Hardhat node)             |
| sepolia      | beneficiaries/sepolia.json  | `--network sepolia`                                    |
| mainnet      | beneficiaries/mainnet.json  | `--network mainnet` (requires `MAINNET_DEPLOY=1`)      |

#### Deployment Examples
Local (dev config):
```bash
DS_ENV=dev npx hardhat ignition deploy --network localhost ignition/modules/DonationSplitter.ts
```
Sepolia (testnet config):
```bash
DS_ENV=sepolia npx hardhat ignition deploy --network sepolia ignition/modules/DonationSplitter.ts
```
Mainnet (requires populated mainnet.json + explicit opt-in):
```bash
DS_ENV=mainnet MAINNET_DEPLOY=1 npx hardhat ignition deploy --network mainnet ignition/modules/DonationSplitter.ts
```

#### Updating the Distribution
1. Edit the appropriate JSON file (e.g. `sepolia.json`) in a PR so changes are reviewable.
2. Confirm total BPS = 10000 and addresses are verified, production‑safe wallets.
3. Deploy to the matching network with `DS_ENV=<env>`.
4. Append deployment info to the history table (below) and update frontend `contractInfo.ts`.
5. (If promoting to mainnet) replicate tested config into `mainnet.json`, secure approvals, then deploy with `MAINNET_DEPLOY=1` flag.

The old inline array inside `DonationSplitter.ts` is no longer used; configurations live solely in version‑controlled JSON.

---

## Deployment History

This section records production/test deployments so the `ignition/deployments` directory can be safely cleaned without losing provenance. Fill new rows after each redeploy.

| Date (UTC) | Network | Chain ID | Contract | Module Ref | Address | Deployer (EOA) | Commit | Notes |
|-----------|---------|----------|----------|------------|---------|----------------|--------|-------|
| 2025-10-11 | Sepolia (Testnet) | 11155111 | DonationSplitter | DonationSplitterModule#DonationSplitter | `0x849E04a51573F61B33DeFA318fEDBF444240bAFb` | (first configured account) | 09b6658dd34cdd2b6d1ea86f0d94bb8f5012ffd7 | Initial tracked deployment (pre-mainnet) |
| (pending) | Ethereum Mainnet | 1 | DonationSplitter | DonationSplitterModule#DonationSplitter | (to add) | (deployer) | (commit) | First mainnet release |
| (future) | Sepolia (Testnet) | 11155111 | DonationSplitter | DonationSplitterModule#DonationSplitter | (new addr) | (deployer) | (commit) | Upgrade / param change |

### How to add a new entry
1. Deploy with Ignition.
2. Copy the output contract address.
3. Record the deploying EOA (run `npx hardhat console --network sepolia` then `(await hre.viem.getWalletClients())[0].account.address`).
4. Fill in the commit hash (`git rev-parse --short HEAD`).
5. Describe briefly the change (e.g. "added withdrawn tracking", "beneficiary shares update").

### Suggested cleanup workflow
```bash
# Optional: archive raw ignition deployment metadata before cleaning
tar -czf ignition_deployments_backup_$(date -u +%Y%m%d).tgz ignition/deployments/chain-11155111

# Then remove if desired
rm -rf ignition/deployments/chain-11155111
```

Keep this table in sync with the frontend `contractInfo.ts` address after each update.

### Cross References
- Project overview & architecture: [root README](../README.md)
- Frontend UI docs: [frontend/README.md](../frontend/README.md)
