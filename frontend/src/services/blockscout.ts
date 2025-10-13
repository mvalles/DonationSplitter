// Simple Blockscout URL helpers. Extendable para más redes.
// Si una red no tiene Blockscout público conocido, se puede hacer fallback al explorador ya existente.


export interface ChainInfo {
  id: number;
  name: string;
  blockscoutBase: string;
  testnet: boolean;
}

const CHAINS: Record<number, ChainInfo> = {
  31337: {
    id: 31337,
    name: 'Hardhat Local',
    blockscoutBase: 'http://localhost:4000',
    testnet: true,
  },
  11155111: {
    id: 11155111,
    name: 'Sepolia',
    blockscoutBase: 'https://eth-sepolia.blockscout.com',
    testnet: true,
  },
  1: {
    id: 1,
    name: 'Ethereum Mainnet',
    blockscoutBase: 'https://eth.blockscout.com', // Puede no estar público; ajustar según despliegue real
    testnet: false,
  }
};

// Helper para compatibilidad con componentes existentes
export function makeAddressLink(chainId: number, address: string) {
  return blockscoutAddressUrl(chainId, address) || '#';
}

export function getChainInfo(chainId?: number): ChainInfo | undefined {
  if (!chainId) return undefined;
  return CHAINS[chainId];
}


export function blockscoutBase(chainId: number): string | undefined {
  return getChainInfo(chainId)?.blockscoutBase;
}

export function blockscoutTxUrl(chainId: number, txHash?: string | null): string | undefined {
  if (!txHash) return undefined;
  const base = blockscoutBase(chainId);
  return base ? `${base}/tx/${txHash}` : undefined;
}

export function blockscoutAddressUrl(chainId: number, address?: string | null): string | undefined {
  if (!address) return undefined;
  const base = blockscoutBase(chainId);
  return base ? `${base}/address/${address}` : undefined;
}

export function hasBlockscout(chainId: number): boolean {
  return !!blockscoutBase(chainId);
}

// API endpoints for data fetching
export function blockscoutApiBase(chainId: number): string | undefined {
  const base = blockscoutBase(chainId);
  return base ? `${base}/api/v2` : undefined;
}

// Get contract transactions from Blockscout API
export function blockscoutContractTxsUrl(chainId: number, address: string, limit = 50): string | undefined {
  const apiBase = blockscoutApiBase(chainId);
  return apiBase ? `${apiBase}/addresses/${address}/transactions?filter=to&items_count=${limit}` : undefined;
}

// Get contract logs/events from Blockscout API  
export function blockscoutContractLogsUrl(chainId: number, address: string, limit = 50): string | undefined {
  const apiBase = blockscoutApiBase(chainId);
  return apiBase ? `${apiBase}/addresses/${address}/logs?items_count=${limit}` : undefined;
}

// Get token transfers (if contract handles tokens)
export function blockscoutTokenTransfersUrl(chainId: number, address: string, limit = 50): string | undefined {
  const apiBase = blockscoutApiBase(chainId);
  return apiBase ? `${apiBase}/addresses/${address}/token-transfers?items_count=${limit}` : undefined;
}
