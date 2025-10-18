// src/hooks/useLitEncryptDonorData.ts
import { useCallback } from 'react';

const getAccessControlConditions = (contractAddress: string, ownerAddress: string) => [
  {
    contractAddress,
    standardContractType: '',
    chain: 'ethereum',
    method: 'owner',
    parameters: [],
    returnValueTest: { comparator: '=', value: ownerAddress },
  },
];

export function useLitEncryptDonorData(contractAddress: string, ownerAddress: string) {
  return useCallback(async (donorData: string) => {
  console.log('[LitEncrypt] Starting encryption flow...');
  console.log('[LitEncrypt] donorData (string):', donorData, typeof donorData);

  // 1️⃣ Generate AES-GCM symmetric key
    const key = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  console.log('[LitEncrypt] Symmetric key generated');

  // 2️⃣ Encrypt the data
    const enc = new TextEncoder();
    const data = enc.encode(donorData);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertextBuffer = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
    const ciphertext = `${Buffer.from(iv).toString('base64')}:${Buffer.from(new Uint8Array(ciphertextBuffer)).toString('base64')}`;
  console.log('[LitEncrypt] Data encrypted, ciphertext length:', ciphertext.length);

  // 3️⃣ Export symmetric key
    const exportedKey = await window.crypto.subtle.exportKey('raw', key);
  console.log('[LitEncrypt] Symmetric key exported, length:', exportedKey.byteLength);

  // 4️⃣ Compute SHA-256 hash
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const dataToEncryptHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  console.log('[LitEncrypt] Data hash computed:', dataToEncryptHash);

  // 5️⃣ ACCs
    const accessControlConditions = getAccessControlConditions(contractAddress, ownerAddress);
  console.log('[LitEncrypt] Access control conditions:', accessControlConditions);

  // 6️⃣ Upload to backend
  console.log('[LitEncrypt] Sending payload to /api/irys-upload...');
    const res = await fetch('/api/irys-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ciphertext,
        symmetricKey: Array.from(new Uint8Array(exportedKey)),
        accessControlConditions,
        dataToEncryptHash,
        contractAddress,
        ownerAddress,
      }),
    });

  console.log('[LitEncrypt] Upload response status:', res.status);

    if (!res.ok) {
      const text = await res.text();
  console.error('[LitEncrypt] Upload failed:', text);
      throw new Error(`Error uploading to Irys: ${text}`);
    }

    const { uri } = await res.json();
  console.log('[LitEncrypt] Upload successful, URI:', uri);

    return {
      ciphertext,
      accessControlConditions,
      uri,
    };
  }, [contractAddress, ownerAddress]);
}
