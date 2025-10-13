import { useEffect, useState } from 'react';
import { isBlockscoutVerified } from '../services/blockscoutVerify';

export function useBlockscoutVerify(chainId: number, address: string) {
  const [verified, setVerified] = useState<boolean|undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    if (!chainId || !address) {
      setVerified(undefined);
      return;
    }
    isBlockscoutVerified(chainId, address).then(v => {
      if (!cancelled) setVerified(v);
    });
    return () => { cancelled = true; };
  }, [chainId, address]);

  return verified;
}
