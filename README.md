# DonationSplitter
Public transparency &amp; allocation dashboard for a smart contract that splits incoming ETH among pre‑configured humanitarian beneficiaries (equal or weighted shares).

# installation
```bash
npx hardhat --init
npx hardhat --help
npx hardhat build
npx hardhat test
npx hardhat test solidity
```

# Desplegar contrato inteligente
Ver: [Deploying Smart Contracts](https://hardhat.org/docs/learn-more/deploying-contracts)

> Se puede desplegar el contrato directamente en red:
> - hardhat: red local, solo activa mientras se ejecuta el comando
> - localhost: tras arrancarla con `npx hardhat node` se añade al comando `npx hardhat ignition deploy --network localhost ignition/modules/Lock.ts` el parámetro `--network`.
> - se puede configurar el `networks` del `fichero hardhat.config.js` y configurar `sepolia` (testnet) por ejemplo.

En el fichero `hardhat.config.js` añadir: (ver si es necesario porque ya cargo datos privados como se muestra más abajo)

```typescript
import "dotenv/config";
```

Añadir `SEPOLIA_RPC_URL`y `SEPOLIA_PRIVATE_KEY` al encrypted secrets manager de hardhat:
[Deploying Smart Contracts](https://hardhat.org/docs/learn-more/deploying-contracts)
```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
```

Para listar las claves almacenadas en el keystore, ejecutar: `npx hardhat keystore list`.

## Despliegues
```bash
npx hardhat ignition deploy ignition/modules/Counter.ts
npx hardhat ignition deploy --network localhost ignition/modules/Counter.ts # tras npx hardhat node
