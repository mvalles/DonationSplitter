
// Polyfill para Buffer (necesario para lit-js-sdk y dependencias de Node.js en navegador)
import { Buffer } from 'buffer';
// @ts-ignore
if (typeof window !== 'undefined') window.Buffer = Buffer;


import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import type { Chain } from 'viem';
import { TARGET_CHAIN_ID, TARGET_CHAIN_LABEL } from './config/contractInfo';
import { metaMask } from 'wagmi/connectors';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { RefetchProvider } from './context/RefetchContext';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Puedes cambiar localhost por la red que uses (por ejemplo, sepolia, etc.)

const hardhatRpc = (import.meta as unknown as { env?: Record<string, string> })?.env?.VITE_HARDHAT_RPC || import.meta.env.VITE_HARDHAT_RPC || 'http://127.0.0.1:8545';

// Define explicit Hardhat local chain (31337) instead of wagmi localhost (1337) to stay consistent.
const hardhatLocal: Chain = {
  id: 31337,
  name: 'Hardhat Local',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [hardhatRpc] },
    public: { http: [hardhatRpc] }
  },
};


// Usar el endpoint local solo para Hardhat, el resto (Sepolia, Mainnet) usan el RPC de la wallet/metamask

// Configura Sepolia para usar el endpoint RPC de Alchemy si está definido
const sepoliaRpc = (import.meta as unknown as { env?: Record<string, string> })?.env?.VITE_SEPOLIA_RPC || import.meta.env.VITE_SEPOLIA_RPC;
const sepoliaChain: Chain = {
  ...sepolia,
  rpcUrls: {
    default: { http: sepoliaRpc ? [sepoliaRpc] : sepolia.rpcUrls.default.http }
  }
};

const availableChains: Chain[] = [hardhatLocal, sepoliaChain, mainnet];
const chainSelection: Chain[] = availableChains;

const transports: Record<number, ReturnType<typeof http>> = {};
chainSelection.forEach(ch => {
  if (ch.id === 31337) transports[ch.id] = http(hardhatRpc);
  else if (ch.id === 11155111 && sepoliaRpc) transports[ch.id] = http(sepoliaRpc);
  else transports[ch.id] = http();
});

console.info('[DonationSplitter] Wagmi config chains:', chainSelection.map(c=>c.id+':'+c.name).join(', '), '| target:', TARGET_CHAIN_ID, TARGET_CHAIN_LABEL);

const config = createConfig({
  connectors: [metaMask()],
  chains: chainSelection as unknown as readonly [Chain, ...Chain[]],
  transports,
  ssr: false,
});

// Optional: runtime chain change debug
import { watchChainId } from 'wagmi/actions';
watchChainId(config, { onChange(id) { console.info('[DonationSplitter] chainId changed to', id); } });

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <RefetchProvider>
          <App />
        </RefetchProvider>
      </WagmiProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
