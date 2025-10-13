import { useState } from 'react';

// Tx hash chip component (copy + explorer link)
interface TxHashChipProps { 
  label: string; 
  hash: string; 
  url: string; 
}

export function TxHashChip({ label, hash, url }: TxHashChipProps) {
  const [copied, setCopied] = useState(false);
  const short = hash ? `${hash.slice(0,6)}…${hash.slice(-4)}` : '';
  
  function copy() {
    if (!hash) return;
    navigator.clipboard.writeText(hash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }).catch(()=>{});
  }
  
  return (
    <span className={`tx-hash-chip ${copied ? 'copied' : ''}`} title={copied ? 'Hash copiado' : 'Click para copiar hash'}>
      <button type="button" onClick={copy} style={{ all:'unset', cursor:'pointer', fontWeight:600, letterSpacing:'.5px' }}>
        {label}
      </button>
      <a href={url} target="_blank" rel="noopener noreferrer" className="mono" style={{ textDecoration:'none', fontWeight:500 }}>
        {short} ↗
      </a>
    </span>
  );
}

// AddressChip reutilizable (copia al click, muestra hash truncado y opcional enlace explorer separado con flecha)
interface AddressChipProps { 
  address: string; 
  label?: string; 
  explorerHref?: string; 
  className?: string; 
}

export function AddressChip({ address, label='ADDR', explorerHref, className }: AddressChipProps) {
  const [copied, setCopied] = useState(false);
  
  if (!address) return <span style={{ opacity:.4, fontSize:'.55rem' }}>—</span>;
  
  const truncated = address.slice(0,6) + '...' + address.slice(-4);
  
  function copy() {
    navigator.clipboard.writeText(address).then(()=>{ 
      setCopied(true); 
      setTimeout(()=>setCopied(false), 1400); 
    }).catch(()=>{});
  }
  
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'.3rem' }} className={className}>
      <button
        type="button"
        onClick={copy}
        title={copied ? 'Copiado!' : `Copiar dirección: ${address}`}
        className={`addr-chip ${copied ? 'copied' : ''}`}
        style={{ fontSize:'.55rem' }}
      >
        {copied ? (
          <span style={{ display:'inline-flex', alignItems:'center', gap:'.3rem' }}>
            <span style={{ fontSize:'.7rem', color:'var(--accent-alt)' }}>✔</span>
            Copied
          </span>
        ) : (
          <span style={{ display:'inline-flex', alignItems:'center', gap:'.4rem' }}>
            <span className="addr-label" style={{ fontWeight:600 }}>{label}</span>
            <span className="addr-value" style={{ fontFamily:'JetBrains Mono, monospace' }}>{truncated}</span>
          </span>
        )}
      </button>
      {explorerHref && (
        <a href={explorerHref} target="_blank" rel="noopener noreferrer" className="explorer-chip" style={{ textDecoration:'none' }} title="Ver en explorer">
          ↗
        </a>
      )}
    </span>
  );
}