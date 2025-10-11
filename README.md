# DonationSplitter
Public transparency &amp; allocation dashboard for a smart contract that splits incoming ETH among pre‑configured humanitarian beneficiaries (equal or weighted shares).

# Installation
```bash
npx hardhat --init
npx hardhat --help
npx hardhat build
npx hardhat test
npx hardhat test solidity
```

## Deploy the smart contract
Reference: [Deploying Smart Contracts](https://hardhat.org/docs/learn-more/deploying-contracts)

> You can deploy the contract to different networks:
> - hardhat: ephemeral in‑memory local network that exists only for the duration of the command you run.
> - localhost: after starting a persistent node with `npx hardhat node`, append `--network localhost` to deployment commands (e.g. `npx hardhat ignition deploy --network localhost ignition/modules/DonationSplitter.ts`).
> - You can configure additional networks (e.g. `sepolia` testnet) inside `hardhat.config.js` under the `networks` field.

Add to `hardhat.config.ts` (or `.js`) if you need environment variable loading (may already be handled elsewhere):

Add `SEPOLIA_RPC_URL` and `SEPOLIA_PRIVATE_KEY` to Hardhat's encrypted secrets manager:
```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
```

List stored keys:
```bash
npx hardhat keystore list
```

## Deployments
```bash
npx hardhat ignition deploy ignition/modules/Counter.ts
npx hardhat ignition deploy --network localhost ignition/modules/DonationSplitter.ts # after starting local node: npx hardhat node
npx hardhat ignition deploy --network sepolia ignition/modules/DonationSplitter.ts
```


## Start frontend APP:
```bash
npm run dev
```