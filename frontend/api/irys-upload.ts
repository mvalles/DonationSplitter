// frontend/api/irys-upload.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Uploader } from '@irys/upload';
import { Ethereum } from '@irys/upload-ethereum';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[irys-upload] Handler started');

  if (req.method !== 'POST') {
  return res.status(405).json({ error: 'Method not allowed' });
  }

  const irysKey = process.env.IRYS_PRIVATE_KEY;
  if (!irysKey) {
  console.error('[irys-upload] ❌ IRYS_PRIVATE_KEY not defined');
  return res.status(500).json({ error: 'Missing IRYS_PRIVATE_KEY in environment' });
  }

  try {
    const payload = req.body;
  console.log('[irys-upload] Payload received:', Object.keys(payload));

  // Initialize modern uploader
  console.log('[irys-upload] Initializing Irys Uploader...');
    const irysUploader = await Uploader(Ethereum).withWallet(irysKey);

  console.log('[irys-upload] Uploading data...');
    const uploadResult = await irysUploader.upload(JSON.stringify(payload));

  console.log('[irys-upload] ✅ Upload successful:', uploadResult);
  return res.status(200).json({ uri: uploadResult.id });
  } catch (error: any) {
  console.error('[irys-upload] ❌ Error uploading to Irys:', error);
    return res.status(500).json({
  error: 'Error uploading to Irys',
  details: error?.message || 'Unknown error',
    });
  }
}
