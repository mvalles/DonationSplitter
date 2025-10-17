// Descarga el archivo cifrado desde Irys dado un URI (irys://...)
export async function fetchFromIrys(uri: string): Promise<Uint8Array | null> {
  if (!uri.startsWith('irys://')) return null;
  const id = uri.replace('irys://', '');
  const url = `https://gateway.irys.xyz/${id}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}
