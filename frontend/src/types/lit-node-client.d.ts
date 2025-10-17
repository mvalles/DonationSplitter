// Parche temporal para LIT_NETWORKS_KEYS: permite usar strings conocidos de red
// Puedes eliminar este archivo si la librería lo expone correctamente en el futuro

declare module '@lit-protocol/lit-node-client' {
  export type LIT_NETWORKS_KEYS = 'cayenne' | 'manzano' | 'habanero' | 'jalapeno' | 'datil' | 'local';
}
