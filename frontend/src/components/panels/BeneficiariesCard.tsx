import { useState } from 'react';
import { useReadContracts } from 'wagmi';
import { BENEFICIARIES, beneficiariesTotalBps, formatPercent } from '../../config/beneficiaries';
import { TARGET_CHAIN_ID as CONFIG_TARGET_CHAIN_ID, getDonationSplitterAddress, DONATION_SPLITTER_ABI, type DonationSplitterAbi } from '../../config/contractInfo';
import { useEffectiveChain } from '../../hooks/useEffectiveChain';
import { getChainInfo, makeAddressLink } from '../../services/blockscout';
import { OrgLogo } from '../ui/orgLogos';

interface BeneficiariesCardProps {
  onAnalyticsClick?: () => void;
  showAnalyticsButton?: boolean;
}

export function BeneficiariesCard({ onAnalyticsClick, showAnalyticsButton }: BeneficiariesCardProps = {}) {
  const total = beneficiariesTotalBps();
  const { walletChainId, providerChainId, effectiveChainId } = useEffectiveChain();
  const chainInfo = walletChainId ? getChainInfo(walletChainId) : undefined;
  const walletEffectiveInfo = effectiveChainId ? getChainInfo(effectiveChainId) : undefined;
  const { pendingPerBeneficiary, withdrawnPerBeneficiary, anyLoading, totalPending, totalWithdrawn } = useBeneficiaryFinancials();
  const totalLifetime = totalPending + totalWithdrawn;
  const [theme, setTheme] = useState<'dark'|'light'>(() => (localStorage.getItem('ds_theme') as 'dark'|'light') || 'dark');
  
  // Apply theme class on body
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme;
  }
  
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});
  
  function triggerCopied(addr: string) {
    setCopiedMap(m => ({ ...m, [addr]: true }));
    setTimeout(() => setCopiedMap(m => ({ ...m, [addr]: false })), 1200);
  }
  
  // Configured target (from env) for display when no wallet is connected
  const configuredNameMap: Record<number,string> = { 31337:'Hardhat Local', 11155111:'Sepolia', 1:'Ethereum Mainnet' };
  const configuredId: number = typeof CONFIG_TARGET_CHAIN_ID !== 'undefined'
    ? CONFIG_TARGET_CHAIN_ID
    : (() => {
        const rawVal = (import.meta as unknown as { env?: Record<string, unknown> })?.env?.VITE_TARGET_CHAIN || '';
        const raw = String(rawVal).trim().toLowerCase();
        if (raw === 'local' || raw === 'localhost' || raw === 'hardhat') return 31337;
        if (raw === 'mainnet' || raw === 'main') return 1;
        return 11155111;
      })();
  const configuredName = configuredNameMap[configuredId] || 'Unknown';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <div className="beneficiaries-header" style={{ display:'flex', flexDirection:'column', gap:'.4rem' }}>
        <div className="card-header-row beneficiaries-main" style={{ alignItems:'flex-start', width:'100%' }}>
          <h2 style={{ margin:0 }}>Beneficiaries</h2>
          <div style={{ display:'flex', alignItems:'center', gap:'.65rem', flexWrap:'wrap', justifyContent:'flex-end' }}>
            <span style={{ fontSize:'.6rem', letterSpacing:'.5px', padding:'.35rem .65rem', borderRadius:'999px', background: configuredId === 1 ? 'linear-gradient(135deg,#4e1218,#2a0d10)' : 'linear-gradient(135deg,#3b3f52,#272b37)', border:'1px solid rgba(255,255,255,0.18)', display:'inline-flex', gap:'.45rem', alignItems:'center', fontWeight:600, whiteSpace:'nowrap' }}>
              {configuredId === 1 ? '🛡' : '🧪'} {configuredName}{configuredId !== 1 && <span style={{ color:'var(--warn)', fontWeight:700 }}> Not real ETH</span>}
            </span>
            {effectiveChainId && effectiveChainId !== configuredId && (
              <span style={{ fontSize:'.55rem', letterSpacing:'.5px', padding:'.3rem .6rem', borderRadius:'999px', background:'linear-gradient(135deg,#4d2f20,#372016)', border:'1px solid rgba(255,180,60,0.35)', display:'inline-flex', gap:'.35rem', alignItems:'center', fontWeight:600, whiteSpace:'nowrap' }} title={`Wallet network (${walletEffectiveInfo?.name || effectiveChainId}) differs from target (${configuredName})`}>
                WALLET: {walletEffectiveInfo?.name || effectiveChainId}
              </span>
            )}
            <button type="button" className="btn ghost sm" style={{ fontSize:'.55rem', letterSpacing:'.5px', marginLeft:'.4rem' }}
              onClick={() => { const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next); localStorage.setItem('ds_theme', next); }}
            >Theme: {theme === 'dark' ? 'Dark' : 'Light'}</button>
            {showAnalyticsButton && (
              <button type="button" className="btn primary" style={{ fontSize:'.7rem', padding:'.7rem 1.15rem', fontWeight:600 }}
                onClick={onAnalyticsClick}
                title="View donation analytics from blockchain data"
              >⚡ Analytics</button>
            )}
          </div>
        </div>
        
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', fontSize:'.55rem', flexWrap:'wrap', rowGap:'.4rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap' }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:'.3rem' }}><span style={{ width:14, height:6, background:'linear-gradient(90deg,#f39c12,#f1c40f)', borderRadius:3 }} /> Pending</span>
            <span style={{ display:'inline-flex', alignItems:'center', gap:'.3rem' }}><span style={{ width:14, height:6, background:'linear-gradient(90deg,#2e7dd1,#4aa8ff)', borderRadius:3 }} /> Withdrawn</span>
            <span style={{ display:'inline-flex', alignItems:'center', gap:'.3rem' }} title="P=Pending W=Withdrawn L=Lifetime">Abbrev: P / W / L</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'1.1rem', flexWrap:'wrap', justifyContent:'flex-end', fontSize:'.62rem', fontWeight:600, letterSpacing:'.25px' }}>
            <span style={{ whiteSpace:'nowrap' }}>Pending: { anyLoading ? (<span style={{ display:'inline-block', width:50 }} className="skeleton skeleton-sm" />) : `${(Number(totalPending)/1e18).toFixed(4)} ETH` }</span>
            <span style={{ whiteSpace:'nowrap' }}>Withdrawn: { anyLoading ? (<span style={{ display:'inline-block', width:60 }} className="skeleton skeleton-sm" />) : `${(Number(totalWithdrawn)/1e18).toFixed(4)} ETH` }</span>
            <span style={{ whiteSpace:'nowrap' }}>Lifetime: { anyLoading ? (<span style={{ display:'inline-block', width:55 }} className="skeleton skeleton-sm" />) : `${(Number(totalLifetime)/1e18).toFixed(4)} ETH` }</span>
            <span style={{ whiteSpace:'nowrap' }}>Total: {(total/100).toFixed(2)}%</span>
          </div>
        </div>
        
        {(import.meta.env?.VITE_DEBUG_NETWORK === '1') && (
          <div style={{ fontSize:'.55rem', opacity:.7, display:'flex', flexDirection:'column', gap:'.2rem', padding:'.4rem .6rem', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:6, maxWidth:240 }}>
            <div style={{ fontWeight:600 }}>Debug Network</div>
            <div style={{ display:'flex', justifyContent:'space-between' }}><span>wagmi id</span><span style={{ fontFamily:'monospace' }}>{String(walletChainId ?? 'n/a')}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between' }}><span>provider id</span><span style={{ fontFamily:'monospace' }}>{String(providerChainId ?? 'n/a')}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between' }}><span>effective id</span><span style={{ fontFamily:'monospace' }}>{String(effectiveChainId ?? 'n/a')}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between' }}><span>wallet name</span><span style={{ fontFamily:'monospace' }}>{effectiveChainId ? (getChainInfo(effectiveChainId)?.name || 'Unknown') : '—'}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between' }}><span>target id</span><span style={{ fontFamily:'monospace' }}>{configuredId}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between' }}><span>target name</span><span style={{ fontFamily:'monospace' }}>{configuredName}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between' }}><span>mismatch</span><span style={{ fontFamily:'monospace', color: effectiveChainId && effectiveChainId !== configuredId ? '#f39c12' : '#4caf50' }}>{effectiveChainId && effectiveChainId !== configuredId ? 'yes' : 'no'}</span></div>
          </div>
        )}
      </div>
      
      <div className="beneficiaries-list" style={{ marginTop:'.4rem' }}>
        {BENEFICIARIES.map((b, i) => {
          const copied = !!copiedMap[b.address];
          const pct = formatPercent(b.bps);
          const truncated = b.address.slice(0,6) + '...' + b.address.slice(-4);
          const addrLink = makeAddressLink(chainInfo?.id || configuredId, b.address);
          const pendingVal = pendingPerBeneficiary[i];
          const withdrawnVal = withdrawnPerBeneficiary[i];
          const lifetime = (pendingVal || 0n) + (withdrawnVal || 0n);
          let withdrawnPct = 0;
          let pendingPct = 0;
          if (lifetime > 0n) {
            withdrawnPct = Number((withdrawnVal || 0n) * 10_000n / lifetime) / 100;
            pendingPct = 100 - withdrawnPct;
          }
          const hasActivity = lifetime > 0n;
          const tooltip = hasActivity
            ? `Withdrawn ${withdrawnVal ? (Number(withdrawnVal)/1e18).toFixed(4) : '0.0000'} ETH (${withdrawnPct.toFixed(2)}%)\nPending ${pendingVal ? (Number(pendingVal)/1e18).toFixed(4) : '0.0000'} ETH (${pendingPct.toFixed(2)}%)\nLifetime ${(Number(lifetime)/1e18).toFixed(4)} ETH`
            : 'No donations yet';
            
          return (
            <div key={b.address} className="beneficiary-row">
              <div className="beneficiary-icon" aria-hidden>
                {b.logoSrc ? (
                  <img
                    src={b.logoSrc}
                    alt={b.label + ' logo'}
                    style={{ width:40, height:40, objectFit:'contain', filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : b.logoId ? (
                  <OrgLogo id={b.logoId} size={40} />
                ) : (
                  b.icon || '🎯'
                )}
              </div>
              <div className="beneficiary-meta">
                <div className="beneficiary-header-row">
                  <span className="beneficiary-label-text">{b.label}</span>
                  {b.url && (() => {
                    let domain = b.url.replace(/^https?:\/\//,'').replace(/\/.*$/,'');
                    if (domain.startsWith('www.')) domain = domain.slice(4);
                    return (
                      <a href={b.url} target="_blank" rel="noopener noreferrer" className="beneficiary-domain">
                        {domain}<span className="ext-arrow">↗</span>
                      </a>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(b.address); triggerCopied(b.address); }}
                    title={copied ? 'Copied!' : `Copy beneficiary address: ${b.address}`}
                    className={`addr-chip ${copied ? 'copied' : ''}`}
                    aria-live="polite"
                  >
                    <span style={{ display:'inline-flex', alignItems:'center', gap:'.35rem', minWidth:'72px', justifyContent:'center' }}>
                      {copied ? (
                        <span className="addr-value" style={{ fontWeight:600, display:'inline-flex', alignItems:'center', gap:'.25rem' }}>
                          <span style={{ fontSize:'.75rem', lineHeight:1, color:'var(--accent-alt)' }}>✔</span>
                          Copied
                        </span>
                      ) : (
                        <>
                          <span className="addr-label">ADDR</span>
                          <span className="addr-value">{truncated}</span>
                        </>
                      )}
                    </span>
                  </button>
                  <a href={addrLink} target="_blank" rel="noopener noreferrer" title={`View address on ${chainInfo?.name || 'Explorer'}`} className="explorer-chip">
                    <span className="ext-arrow" style={{ fontSize:'.7em' }}>↗</span>
                  </a>
                </div>
                {b.description && <div className="beneficiary-desc">{b.description}</div>}
                
                <div style={{ position:'relative', height:'6px', background:'rgba(255,255,255,0.07)', borderRadius:'4px', overflow:'hidden', marginTop:'.35rem', marginBottom:'.35rem' }} title={tooltip} aria-label={tooltip}>
                  {hasActivity && (
                    <div style={{ position:'absolute', inset:0, display:'flex', width:'100%' }}>
                      <div style={{ width: (withdrawnPct>0 && withdrawnPct<1 ? 1 : withdrawnPct) + '%', background:'linear-gradient(90deg,#2e7dd1,#4aa8ff)', transition:'width .6s ease' }} />
                      <div style={{ width: (pendingPct>0 && pendingPct<1 ? 1 : pendingPct) + '%', background:'linear-gradient(90deg,#c97a10,#e67e22)', transition:'width .6s ease' }} />
                    </div>
                  )}
                  {!hasActivity && (
                    <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.45rem', letterSpacing:'.3px', fontWeight:500, color:'rgba(255,255,255,0.55)', background:'repeating-linear-gradient(90deg,rgba(255,255,255,0.05) 0 8px, rgba(255,255,255,0.02) 8px 16px)' }}>
                      No activity
                    </div>
                  )}
                </div>
                
                <div className="beneficiary-bar" style={{ width: pct }} title={`Configured share: ${pct}`} aria-label={`Configured share: ${pct}`} />
              </div>
              <div className="beneficiary-stats">
                <span title="Pending not yet withdrawn">
                  {pendingVal === undefined ? (
                    <span style={{ display:'inline-block', width:55 }} className="skeleton skeleton-sm" />
                  ) : (
                    'P ' + (Number(pendingVal)/1e18).toFixed(4)
                  )}
                </span>
                <span title="Withdrawn to date">
                  {withdrawnVal === undefined ? (
                    <span style={{ display:'inline-block', width:55 }} className="skeleton skeleton-sm" />
                  ) : (
                    'W ' + (Number(withdrawnVal)/1e18).toFixed(4)
                  )}
                </span>
                <span title="Lifetime (pending + withdrawn)">
                  {pendingVal === undefined || withdrawnVal === undefined ? (
                    <span style={{ display:'inline-block', width:55 }} className="skeleton skeleton-sm" />
                  ) : (
                    'L ' + ((Number((pendingVal)+(withdrawnVal)))/1e18).toFixed(4)
                  )}
                </span>
                <span title="Share of global lifetime">
                  {pendingVal === undefined || withdrawnVal === undefined || totalLifetime === 0n ? (
                    <span style={{ display:'inline-block', width:55 }} className="skeleton skeleton-sm" />
                  ) : (
                    ((Number((pendingVal+withdrawnVal)) / (Number(totalLifetime))) * 100).toFixed(2) + '%'
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Custom hook using beneficiaryTotals() via batched reads
function useBeneficiaryFinancials() {
  const runtimeAddress = getDonationSplitterAddress(CONFIG_TARGET_CHAIN_ID);
  const contracts = BENEFICIARIES.map(b => ({
    address: runtimeAddress,
    abi: DONATION_SPLITTER_ABI,
    functionName: 'beneficiaryTotals',
    args: [b.address] as const,
    chainId: CONFIG_TARGET_CHAIN_ID,
  }));
  
  const { data, isLoading } = useReadContracts({
    contracts: contracts as unknown as readonly { address: `0x${string}`; abi: DonationSplitterAbi; functionName: 'beneficiaryTotals'; args: readonly [`0x${string}`]; }[],
    query: { refetchInterval:5000 }
  });
  
  const pendingPerBeneficiary: (bigint|undefined)[] = [];
  const withdrawnPerBeneficiary: (bigint|undefined)[] = [];
  
  data?.forEach(res => {
    if (res?.result && Array.isArray(res.result)) {
      pendingPerBeneficiary.push(res.result[0] as bigint);
      withdrawnPerBeneficiary.push(res.result[1] as bigint);
    } else {
      pendingPerBeneficiary.push(undefined); 
      withdrawnPerBeneficiary.push(undefined);
    }
  });
  
  while (pendingPerBeneficiary.length < BENEFICIARIES.length) { 
    pendingPerBeneficiary.push(undefined); 
    withdrawnPerBeneficiary.push(undefined); 
  }
  
  const totalPending = pendingPerBeneficiary.reduce<bigint>((acc,v)=>acc+(v||0n),0n);
  const totalWithdrawn = withdrawnPerBeneficiary.reduce<bigint>((acc,v)=>acc+(v||0n),0n);
  
  return { pendingPerBeneficiary, withdrawnPerBeneficiary, anyLoading: isLoading, totalPending, totalWithdrawn };
}