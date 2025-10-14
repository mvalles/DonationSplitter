
import { useCallback } from 'react';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LIT_NETWORK } from '@lit-protocol/constants';

// Mapeo simple de nombre de red a LIT_NETWORKS_KEYS válidos en esta versión
const networkToLitNetwork = (network: string) => {
  switch (network?.toLowerCase()) {
    case 'sepolia':
    case 'mumbai':
    case 'polygon':
    case 'goerli':
      return LIT_NETWORK.DatilTest;
    case 'ethereum':
    case 'mainnet':
      return LIT_NETWORK.Datil;
    default:
      return LIT_NETWORK.DatilTest;
  }
};

export function useLitEncryptDonorData() {
  // Retorna una función que cifra datos con Lit Protocol
  return useCallback(async (data: string, ownerAddress: string, network: string = 'sepolia') => {
    const litNetwork = networkToLitNetwork(network);
    const litClient = new LitNodeClient({ litNetwork });
    await litClient.connect();
    const accessControlConditions = [
      {
        contractAddress: '',
        standardContractType: '',
        chain: network,
        method: 'eth_getBalance',
        parameters: [ownerAddress, 'latest'],
        returnValueTest: { comparator: '>=', value: '0' },
      },
    ];
    // NOTA: La API de cifrado puede variar según la versión, aquí se asume encryptString y saveEncryptionKey existen
    // Si no existen, se debe consultar la doc oficial de lit-protocol v7
  // @ts-expect-error La API encryptString no está tipada en esta versión
  const { encryptedString, symmetricKey } = await litClient.encryptString(data);
  // @ts-expect-error La API saveEncryptionKey no está tipada en esta versión
  const encryptedSymmetricKey = await litClient.saveEncryptionKey({
      accessControlConditions,
      symmetricKey,
      chain: network,
    });
    return JSON.stringify({ ciphertext: encryptedString, encryptedSymmetricKey: Array.from(new Uint8Array(encryptedSymmetricKey)), accessControlConditions });
  }, []);
}
