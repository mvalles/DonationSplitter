

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

// Build chains list dynamically; always include target + sepolia + mainnet for easy switching.
const availableChains: Chain[] = [hardhatLocal, sepolia, mainnet];
const chainSelection: Chain[] = availableChains;
// (Could filter in future if we want minimal set)

const transports: Record<number, ReturnType<typeof http>> = {};
chainSelection.forEach(ch => {
  if (ch.id === 31337) transports[ch.id] = http(hardhatRpc); else transports[ch.id] = http();
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
