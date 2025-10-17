// Sube un archivo a Irys: solo disponible en backend o usando la API HTTP de Bundlr/Irys.
// En frontend, la subida directa requiere integración con wallet y API REST de Bundlr/Irys.
export async function uploadToIrys(_data: Uint8Array | string, _contentType = 'application/json') {
  throw new Error('La subida directa a Irys solo está soportada en backend o usando la API HTTP de Bundlr/Irys. Implementa la subida vía REST o usa el backend.');
}
