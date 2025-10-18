

import { useCallback } from 'react';


export function useLitDecryptDonorData(contractAddress: string, ownerAddress: string) {
		return useCallback(async ({ ciphertext, symmetricKey }: {
			ciphertext: string;
			symmetricKey: number[];
		}) => {
			// 1️⃣ Reconstruct symmetric key
			const keyBuffer = new Uint8Array(symmetricKey);
			const key = await window.crypto.subtle.importKey(
				'raw',
				keyBuffer,
				{ name: 'AES-GCM' },
				true,
				['decrypt']
			);

			// 2️⃣ Parse IV and ciphertext
			const [ivBase64, ctBase64] = ciphertext.split(':');
			const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
			const ct = Uint8Array.from(atob(ctBase64), c => c.charCodeAt(0));

			// 3️⃣ Decrypt
			const decryptedBuffer = await window.crypto.subtle.decrypt(
				{ name: 'AES-GCM', iv },
				key,
				ct
			);
			const decrypted = new TextDecoder().decode(decryptedBuffer);
			// 4️⃣ Parse donor data (should be JSON with email)
			let email = '';
			try {
				const obj = JSON.parse(decrypted);
				email = obj.email || '';
			} catch {
				email = '[Invalid donor data]';
			}
			return email;
	}, [contractAddress, ownerAddress]);
}
