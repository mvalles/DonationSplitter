import { useChainId, useAccount } from 'wagmi';
import { useEffect, useRef, useState } from 'react';
import { TARGET_CHAIN_ID } from '../config/contractInfo';

export interface EffectiveChainState {
  walletChainId?: number;        // wagmi hook chain id
  providerChainId?: number;      // direct provider chain id
  effectiveChainId?: number;     // provider preferred
  targetChainId: number;         // configured target (env)
  mismatch: boolean;             // wallet connected & differs from target
  isTarget: boolean;             // effective === target
  ready: boolean;                // provider check attempted
  providerAvailable: boolean;    // window.ethereum provider detected
}

/**
 * Unifies chain detection (wagmi + window.ethereum) and mismatch logic.
 * Avoids duplication across components.
 */
export function useEffectiveChain(): EffectiveChainState {
  const walletChainId = useChainId();
  const { isConnected } = useAccount();
  const [providerChainId, setProviderChainId] = useState<number | undefined>();
  const [ready, setReady] = useState(false);
  const lastRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    interface EthereumLike {
      request: (args: { method: string }) => Promise<string>;
      on?: (ev: string, cb: (p: string) => void) => void;
      removeListener?: (ev: string, cb: (p: string) => void) => void;
    }
    const eth: EthereumLike | undefined = (window as unknown as { ethereum?: EthereumLike }).ethereum;
    if (!eth) { setReady(true); return; }
    let mounted = true;

    eth.request({ method: 'eth_chainId' })
      .then((cid: string) => {
        if (!mounted) return;
        const n = Number(cid);
        if (!isNaN(n) && lastRef.current !== n) {
          lastRef.current = n;
          setProviderChainId(n);
        }
        setReady(true);
      })
      .catch(() => setReady(true));

    const handler = (cid: string) => {
      if (!mounted) return;
      const n = Number(cid);
      if (!isNaN(n) && lastRef.current !== n) {
        lastRef.current = n;
        setProviderChainId(n);
      }
    };
    eth.on?.('chainChanged', handler);
    return () => { mounted = false; eth?.removeListener?.('chainChanged', handler); };
  }, []);

  const effectiveChainId = providerChainId ?? walletChainId;
  const mismatch = !!(isConnected && effectiveChainId !== undefined && effectiveChainId !== TARGET_CHAIN_ID);
  const providerAvailable = !!((window as unknown as { ethereum?: unknown }).ethereum);

  return {
    walletChainId,
    providerChainId,
    effectiveChainId,
    targetChainId: TARGET_CHAIN_ID,
    mismatch,
    isTarget: effectiveChainId === TARGET_CHAIN_ID,
    ready,
    providerAvailable,
  };
}
