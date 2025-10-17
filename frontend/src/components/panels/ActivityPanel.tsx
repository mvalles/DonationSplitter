import { useState, useRef } from 'react';
import { useDonationActivity } from '../../hooks/useDonationActivity';
import { blockscoutTxUrl, blockscoutAddressUrl } from '../../services/blockscout';

interface ActivityPanelProps {
  chainId: number;
  [key: string]: unknown; // allow data-tab
}

export function ActivityPanel({ chainId, ...rest }: ActivityPanelProps) {
  const [typeFilter, setTypeFilter] = useState<'all'|'donate'|'withdraw'>('all');
  const [limit, setLimit] = useState(25);
  const [fullHistoryProgress, setFullHistoryProgress] = useState<{windows:number; running:boolean}>({ windows:0, running:false });
  const [toast, setToast] = useState<string | null>(null);
  const cancelFullHistoryRef = useRef(false);
  
  const { items, total, loading, manualLoading, error, refetch, fetchFullHistory, hasMore } = useDonationActivity({ limit, chainId });
  const filtered = items.filter(i => typeFilter==='all' || i.type === typeFilter);
  
  function exportCsv() {
    const header = 'type,txHash,address,amountEth,timestamp\n';
    const rows = filtered.map(i => [i.type, i.txHash, i.address, i.amountEth.toFixed(6), i.timestamp ? new Date(i.timestamp*1000).toISOString() : ''].join(','));
    const csv = header + rows.join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity_${chainId}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  return (
    <div data-tab={rest['data-tab']} className="card">
      <div style={{ display:'flex', flexDirection:'column', gap:'0.9rem' }}>
        <div className="card-header-row" style={{ alignItems:'flex-start' }}>
          <h2 style={{ margin:0 }}>Activity</h2>
          {/* DEBUG: Mostrar número de items y filtered */}
          <div style={{ fontSize:'.6rem', color:'#888', marginLeft:8 }}>
            items: {items.length} | filtered: {filtered.length} | total: {total}
          </div>
          <div className="activity-filters">
            <div className="segmented">
              {(['all','donate','withdraw'] as const).map(t => (
                <button key={t} type="button" className={t===typeFilter? 'active':''} onClick={()=>setTypeFilter(t)} title={t==='all'?'Mostrar todo': t==='donate'?'Solo donaciones':'Solo retiros'}>
                  {t==='all'?'All': t==='donate'?'Donations':'Withdrawals'}
                </button>
              ))}
            </div>
            <div className="segmented sm">
              {[10,25,50].map(n => (
                <button key={n} type="button" className={n===limit?'active':''} onClick={()=>setLimit(n)} title={`Mostrar hasta ${n}`}>{n}</button>
              ))}
            </div>
            <div className="spacer" />
            <button type="button" className="btn ghost sm" onClick={()=>refetch()} disabled={manualLoading} title="Manual refresh">
              {manualLoading ? 'Refreshing…' : 'Refresh'}
            </button>
            {hasMore && (
              <button
                type="button"
                className="btn ghost sm"
                onClick={async ()=> {
                  if (!fullHistoryProgress.running) {
                    cancelFullHistoryRef.current = false;
                    setFullHistoryProgress({ windows: 0, running: true });
                    let windows = 0;
                    const updateProgress = () => {
                      windows++;
                      setFullHistoryProgress({ windows, running: true });
                    };
                    while (!cancelFullHistoryRef.current) {
                      const added = await fetchFullHistory();
                      updateProgress();
                      if (!added || added === 0) break;
                    }
                    setFullHistoryProgress({ windows, running: false });
                    if (cancelFullHistoryRef.current) {
                      setToast('Full history loading cancelled');
                      setTimeout(() => setToast(null), 3000);
                    } else {
                      setToast('Full history loaded');
                      setTimeout(() => setToast(null), 3000);
                    }
                  } else {
                    cancelFullHistoryRef.current = true;
                  }
                }}
                disabled={manualLoading}
                title={fullHistoryProgress.running ? 'Cancel full history loading' : 'Fetch ALL remaining historical events'}
              >
                {fullHistoryProgress.running ? 'Cancel Full History' : 'Full History'}
              </button>
            )}
            <button type="button" className="btn ghost sm" onClick={exportCsv} disabled={!filtered.length} title="Export CSV">CSV</button>
            <span style={{ fontSize:'.5rem', opacity:.5, letterSpacing:'.5px' }}>{filtered.length}/{total}</span>
          </div>
        </div>
        
        {fullHistoryProgress.running && (
          <div style={{ fontSize:'.55rem', opacity:.7 }}>Loading full history… windows {fullHistoryProgress.windows}</div>
        )}
        
        {toast && (
          <div style={{ position:'relative' }}>
            <div style={{ position:'absolute', right:0, top:0, background:'rgba(0,0,0,0.75)', padding:'.5rem .75rem', borderRadius:8, fontSize:'.55rem', letterSpacing:'.3px' }}>{toast}</div>
          </div>
        )}
        
        {error && <div className="alert">Error: {error}</div>}
        
        <div style={{ display:'grid', gap:'.4rem' }}>
          {!filtered.length && !loading && <div style={{ fontSize:'.65rem', opacity:.7 }}>No activity yet.</div>}
          {filtered.map(ev => {
            const rel = ev.timestamp ? timeAgo(ev.timestamp*1000) : '—';
            const explorer = blockscoutTxUrl(chainId, ev.txHash);
            const addrExplorer = blockscoutAddressUrl(chainId, ev.address);
            const roleLabel = ev.type === 'donate' ? 'DONOR' : 'BENEFICIARY';
            // Si el evento tiene uri (Irys), construir enlace
            const irysUrl = (ev as any).uri ? `https://gateway.irys.xyz/${(ev as any).uri}` : null;
            return (
              <div
                key={ev.id}
                style={{
                  display:'flex',
                  alignItems:'center',
                  gap:'.6rem',
                  padding:'.5rem .65rem',
                  background:'rgba(255,255,255,0.04)',
                  border:'1px solid rgba(255,255,255,0.1)',
                  borderRadius:8,
                  fontSize:'.55rem',
                  flexWrap:'wrap'
                }}
              >
                <span className={`activity-type ${ev.type}`} style={{ minWidth:'fit-content' }}>
                  {ev.type === 'donate' ? '💰' : '💸'} {ev.type.toUpperCase()}
                </span>
                <span className="mono" style={{ flex:'1 1 auto', minWidth:'140px' }}>
                  {ev.amountEth.toFixed(6)} ETH
                </span>
                <span className={`role-chip ${ev.type === 'donate' ? 'donor' : 'beneficiary'}`} style={{ fontSize:'.48rem', padding:'.2rem .4rem' }}>
                  {roleLabel}
                </span>
                {addrExplorer ? (
                  <a href={addrExplorer} target="_blank" rel="noopener noreferrer" className="addr-link mono" style={{ textDecoration:'none', color:'var(--accent)' }}>
                    {ev.address.slice(0,6)}...{ev.address.slice(-4)} ↗
                  </a>
                ) : (
                  <span className="mono" style={{ opacity:.6 }}>
                    {ev.address.slice(0,6)}...{ev.address.slice(-4)}
                  </span>
                )}
                {irysUrl ? (
                  <a href={irysUrl} target="_blank" rel="noopener noreferrer" className="tx-link mono" style={{ textDecoration:'none', color:'#ffb300', fontWeight:600 }}>
                    Irys ↗
                  </a>
                ) : explorer ? (
                  <a href={explorer} target="_blank" rel="noopener noreferrer" className="tx-link mono" style={{ textDecoration:'none', color:'var(--accent-alt)' }}>
                    {ev.txHash.slice(0,6)}...{ev.txHash.slice(-4)} ↗
                  </a>
                ) : (
                  <span className="mono" style={{ opacity:.6 }}>
                    {ev.txHash.slice(0,6)}...{ev.txHash.slice(-4)}
                  </span>
                )}
                <span style={{ opacity:.5, fontSize:'.5rem', minWidth:'fit-content' }}>{rel}</span>
              </div>
            );
          })}
          {manualLoading && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', opacity:.6 }}>
              Loading more activity...
            </div>
          )}
          {!manualLoading && !hasMore && total > items.length && (
            <div style={{ fontSize:'.55rem', opacity:.6, textAlign:'center', padding:'.5rem' }}>
              Showing {items.length} of {total} total events (some events may be filtered by type)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function timeAgo(tsMs: number) {
  const diff = Date.now() - tsMs;
  const s = Math.floor(diff/1000);
  if (s < 60) return s + 's ago';
  const m = Math.floor(s/60); if (m < 60) return m + 'm ago';
  const h = Math.floor(m/60); if (h < 24) return h + 'h ago';
  const d = Math.floor(h/24); return d + 'd ago';
}