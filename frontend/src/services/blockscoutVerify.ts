// Consulta si un contrato está verificado en Blockscout
// Devuelve true/false según el estado real

const blockscoutVerifyCache: Record<string, boolean> = {};
const blockscoutVerifyPending: Record<string, Promise<boolean>> = {};

export async function isBlockscoutVerified(chainId: number, address: string): Promise<boolean> {
  // Blockscout API: /api?module=contract&action=getsourcecode&address=...
  const base = {
    11155111: 'https://eth-sepolia.blockscout.com',
    1: 'https://eth.blockscout.com',
    31337: 'http://localhost:4000',
  }[chainId];
  if (!base) return false;
  const url = `${base}/api?module=contract&action=getsourcecode&address=${address}`;
  const cacheKey = `${chainId}:${address}`;
  if (blockscoutVerifyCache[cacheKey] !== undefined) {
    return blockscoutVerifyCache[cacheKey];
  }
  if (blockscoutVerifyPending[cacheKey]) {
    return blockscoutVerifyPending[cacheKey];
  }
  blockscoutVerifyPending[cacheKey] = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) return false;
      const data = await res.json();
      // Solo considerar verificado si el ABI es distinto y además SourceCode no está vacío
      if (data && data.result && Array.isArray(data.result) && data.result[0]) {
        const abiOk = data.result[0].ABI !== 'Contract source code not verified';
        const srcOk = !!data.result[0].SourceCode && String(data.result[0].SourceCode).trim().length > 0;
        const verified = abiOk && srcOk;
        blockscoutVerifyCache[cacheKey] = verified;
        delete blockscoutVerifyPending[cacheKey];
        return verified;
      }
      blockscoutVerifyCache[cacheKey] = false;
      delete blockscoutVerifyPending[cacheKey];
      return false;
    } catch {
      blockscoutVerifyCache[cacheKey] = false;
      delete blockscoutVerifyPending[cacheKey];
      return false;
    }
  })();
  return blockscoutVerifyPending[cacheKey];
}
