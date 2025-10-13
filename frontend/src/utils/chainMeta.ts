// Basic chain metadata for explorer links & labels
export interface ChainInfo { id: number; name: string; explorer: string; explorerTx: string; explorerAddress: string; testnet: boolean; }

export const CHAINS: Record<number, ChainInfo> = {
  31337: {
    id: 31337,
    name: 'Hardhat Local',
    explorer: '',
    explorerTx: '',
    explorerAddress: '',
    testnet: true, // treat as testnet (not real ETH)
  },
  11155111: {
    id: 11155111,
    name: 'Sepolia',
    // explorer: 'https://sepolia.etherscan.io',
    // explorerTx: 'https://sepolia.etherscan.io/tx/',
    // explorerAddress: 'https://sepolia.etherscan.io/address/',
    explorer: '',
    explorerTx: '',
    explorerAddress: '',
    testnet: true,
  },
  1: {
    id: 1,
    name: 'Ethereum Mainnet',
    // explorer: 'https://etherscan.io',
    // explorerTx: 'https://etherscan.io/tx/',
    // explorerAddress: 'https://etherscan.io/address/',
    explorer: '',
    explorerTx: '',
    explorerAddress: '',
    testnet: false,
  }
};

export function getChainInfo(chainId?: number): ChainInfo | undefined {
  if (!chainId) return undefined;
  return CHAINS[chainId];
}


import { blockscoutAddressUrl } from '../services/blockscout';

export function makeAddressLink(chainId: number, address: string) {
  // Always use Blockscout explorer links for uniformity
  return blockscoutAddressUrl(chainId, address) || '#';
}
