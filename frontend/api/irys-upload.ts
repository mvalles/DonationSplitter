// frontend/api/irys-upload.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Uploader } from '@irys/upload';
import { Ethereum } from '@irys/upload-ethereum';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[irys-upload] Handler iniciado');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const irysKey = process.env.IRYS_PRIVATE_KEY;
  if (!irysKey) {
    console.error('[irys-upload] ❌ IRYS_PRIVATE_KEY no definida');
    return res.status(500).json({ error: 'Falta IRYS_PRIVATE_KEY en entorno' });
  }

  try {
    const payload = req.body;
    console.log('[irys-upload] Payload recibido:', Object.keys(payload));

    // Inicializar uploader moderno
    console.log('[irys-upload] Inicializando Irys Uploader...');
    const irysUploader = await Uploader(Ethereum).withWallet(irysKey);

    console.log('[irys-upload] Subiendo datos...');
    const uploadResult = await irysUploader.upload(JSON.stringify(payload));

    console.log('[irys-upload] ✅ Upload exitoso:', uploadResult);
    return res.status(200).json({ uri: uploadResult.id });
  } catch (error: any) {
    console.error('[irys-upload] ❌ Error al subir a Irys:', error);
    return res.status(500).json({
      error: 'Error subiendo a Irys',
      details: error?.message || 'Unknown error',
    });
  }
}
