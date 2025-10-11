

import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, localhost, sepolia } from 'wagmi/chains';
import { metaMask } from 'wagmi/connectors';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { RefetchProvider } from './RefetchContext';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Puedes cambiar localhost por la red que uses (por ejemplo, sepolia, etc.)

const config = createConfig({
  connectors: [metaMask()],
  chains: [localhost, mainnet, sepolia],
  transports: {
    [localhost.id]: http(),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
  ssr: false,
});

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
