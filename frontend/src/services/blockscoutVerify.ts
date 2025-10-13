// Consulta si un contrato está verificado en Blockscout
// Devuelve true/false según el estado real

export async function isBlockscoutVerified(chainId: number, address: string): Promise<boolean> {
  // Blockscout API: /api?module=contract&action=getsourcecode&address=...
  const base = {
    11155111: 'https://eth-sepolia.blockscout.com',
    1: 'https://eth.blockscout.com',
    31337: 'http://localhost:4000',
  }[chainId];
  if (!base) return false;
  const url = `${base}/api?module=contract&action=getsourcecode&address=${address}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const data = await res.json();
    // Blockscout responde con result[0].ABI !== 'Contract source code not verified'
    if (data && data.result && Array.isArray(data.result) && data.result[0]) {
      return data.result[0].ABI !== 'Contract source code not verified';
    }
    return false;
  } catch {
    return false;
  }
}
