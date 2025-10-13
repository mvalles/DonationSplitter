// Simple Blockscout URL helpers. Extendable para más redes.
// Si una red no tiene Blockscout público conocido, se puede hacer fallback al explorador ya existente.

const BLOCKSCOUT_BASES: Record<number, string> = {
  11155111: 'https://eth-sepolia.blockscout.com',
  1: 'https://eth.blockscout.com', // Puede no estar público; ajustar según despliegue real
  31337: 'http://localhost:4000' // Placeholder si montas un Blockscout local
};

export function blockscoutBase(chainId: number): string | undefined {
  return BLOCKSCOUT_BASES[chainId];
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
