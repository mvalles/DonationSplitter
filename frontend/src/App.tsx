


import './App.css';
import { useAccount, useConnect, useDisconnect, useReadContract, useBalance, useChainId, useChains, useReadContracts } from 'wagmi';
import { useDonateETH, useWithdrawETH } from './contractWriteHooks';
import { useRefetchKey } from './RefetchContext';
import { metaMask } from 'wagmi/connectors';
import { DONATION_SPLITTER_ABI, type DonationSplitterAbi, getDonationSplitterAddress, TARGET_CHAIN_ID as CONFIG_TARGET_CHAIN_ID, TARGET_CHAIN_LABEL } from './contractInfo';
import DonationSplitArt from './DonationSplitArt';
import React, { useState } from 'react';
import { BENEFICIARIES, beneficiariesTotalBps, formatPercent } from './beneficiaries';
import { getChainInfo, makeAddressLink } from './chainMeta';
import { OrgLogo } from './orgLogos';



function App() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const chains = useChains();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [ethAmount, setEthAmount] = useState('');
  const [showMainnetConfirm, setShowMainnetConfirm] = useState(false);
  // Target chain (from env) determining which contract we show when no wallet is connected
  const TARGET_CHAIN_ID = CONFIG_TARGET_CHAIN_ID;
  const [donateError, setDonateError] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

    // Refetch context
  const { bump } = useRefetchKey();
    // Read pending balance for the connected user
    const runtimeAddress = getDonationSplitterAddress(chainId);
    // Determine active chain early (needed for mismatch gating)
    const activeChain = chains.find(c => c.id === chainId);
    const isMainnet = activeChain?.id === 1;
    // Additional provider-based detection (covers cases where wagmi chainId not refreshed)
    const [providerChainId, setProviderChainId] = useState<number|undefined>(undefined);
    // Initialize provider chain id and subscribe to changes
    React.useEffect(() => {
      const win = window as unknown as { ethereum?: { request: (args:{method:string})=>Promise<string>; on?: (ev:string, cb:(p:string)=>void)=>void; removeListener?: (ev:string, cb:(p:string)=>void)=>void } };
      if (!win.ethereum) return;
      let mounted = true;
      win.ethereum.request({ method: 'eth_chainId' }).then((cid: string) => {
        if (!mounted) return;
        const parsed = Number(cid);
        if (!isNaN(parsed)) setProviderChainId(parsed);
      }).catch(()=>{});
      const handler = (cid: string) => {
        if (!mounted) return;
        const parsed = Number(cid);
        if (!isNaN(parsed)) setProviderChainId(parsed);
      };
      win.ethereum.on?.('chainChanged', handler);
      return () => { mounted = false; win.ethereum?.removeListener?.('chainChanged', handler); };
    }, []);
  const effectiveChainId = providerChainId ?? chainId; // prefer provider direct reading
  const mismatch = isConnected && effectiveChainId !== undefined && effectiveChainId !== TARGET_CHAIN_ID; // mismatch only matters once wallet is connected
    const { data: pendingEth, refetch } = useReadContract({
      address: runtimeAddress,
      abi: DONATION_SPLITTER_ABI,
      functionName: 'pendingEth',
      args: address ? [address] : undefined,
      query: { enabled: isConnected && !mismatch, refetchInterval: 5000 },
    });
    // Read total contract balance
    const { data: contractBalance } = useBalance({
      address: runtimeAddress,
      // periodic refetch to keep fresh data
      query: { enabled: true, refetchInterval: 5000 },
    });
    // Read the user's wallet balance
    const { data: userBalance } = useBalance({
      address: address,
      query: { enabled: !!address, refetchInterval: 5000 },
    });

  // activeChain / isMainnet / mismatch already defined above for early gating
    function truncateAddress(addr?: string) {
      if (!addr) return '';
      return addr.slice(0, 6) + '...' + addr.slice(-4);
    }

    // Contract write hooks
  const { donateETH } = useDonateETH();
    const { withdrawETH, isPending: isWithdrawing } = useWithdrawETH();

    // Provide a helper to request network switch when mismatch
    // Removed network switch helper per simplification request

  return (
    <div className="app-shell app-shell-compact">
      {/**
       * Compact Hero Layout NOTE:
       * This layout replaces the original centered hero (large art centered below title).
       * To revert:
       * 1. Remove className "app-shell-compact" from root div.
       * 2. Replace <header className="hero-compact" ...> block with the previous block (see git history) that had:
       *    - Centered h1, model badge, subtitle
       *    - <DonationSplitArt size={isConnected ? 240 : 300} /> centered
       * 3. Optionally remove new CSS additions (.app-shell-compact, .hero-compact) from index.css.
       */}
      <header className="hero-compact" style={{ position:'relative', display:'flex', alignItems:'flex-start', gap:'1.75rem', paddingBottom:'.5rem', borderBottom:'1px solid rgba(255,255,255,0.08)', flexWrap:'wrap' }}>
        <div style={{ position:'relative', display:'flex', alignItems:'flex-start', gap:'1.25rem' }}>
          <div style={{ width:178, minWidth:178, display:'flex', alignItems:'center', justifyContent:'center', padding:'.15rem 0', transform:'translateY(2px)' }}>
            <DonationSplitArt animate={true} size={178} />
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'.55rem', paddingTop:'.25rem' }}>
            <h1 className="hero-title" style={{ margin:0, fontSize:'clamp(1.95rem,3.2vw,2.7rem)', textAlign:'left' }}>Donation Splitter</h1>
            <div className="model-badge" style={{ alignSelf:'flex-start' }}><strong>Humanitarian</strong> Basic Model</div>
            <p className="hero-subtitle" style={{ textAlign:'left', margin:'0', maxWidth:620, fontSize:'.9rem' }}>
              Automatically split your contributions across multiple beneficiaries transparently & verifiably on-chain.
            </p>
            {/* Simplified: no inline mismatch badge here */}
          </div>
        </div>
        {!isConnected && (
          <div style={{ marginLeft:'auto', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'.35rem' }}>
            <button
              className="btn primary"
              style={{ fontSize:'.9rem', padding:'.6rem 1.15rem', fontWeight:600, boxShadow:'0 6px 20px -6px rgba(0,0,0,.55)' }}
              onClick={() => connect({ connector: metaMask() })}
              disabled={isPending}
            >
              {isPending ? 'Connecting...' : 'Connect Wallet'}
            </button>
            <a
              href="https://ethereum.org/en/wallets/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize:'.6rem', textDecoration:'none', color:'var(--accent)', opacity:.85, fontWeight:500 }}
            >Need a wallet?</a>
          </div>
        )}
      </header>
      <section style={{ paddingTop:'.25rem' }}>
        {/* No global banner; show a single concise English notice inside wallet panel & donate panel */}
        {showMainnetConfirm && isMainnet && !mismatch && (
          <div style={{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.6)', zIndex:1000 }}>
            <div className="card" style={{ maxWidth:420 }}>
              <h2 style={{ marginTop:0 }}>Mainnet Donation</h2>
              <p style={{ fontSize:'.8rem', lineHeight:1.5 }}>
                You are about to donate on <strong>Ethereum Mainnet</strong>. This will transfer real ETH. Confirm you have verified the contract address and amount.
              </p>
              <div style={{ display:'flex', gap:'.75rem', justifyContent:'flex-end' }}>
                <button className="btn secondary" type="button" onClick={() => { setShowMainnetConfirm(false); }}>Cancel</button>
                <button className="btn" type="button" onClick={async () => {
                  setShowMainnetConfirm(false);
                  try {
                    const value = ethAmount && !isNaN(Number(ethAmount)) ? BigInt(Math.floor(Number(ethAmount.toString()) * 1e18)) : undefined;
                    if (!value) throw new Error('Invalid amount');
                    const tx = await donateETH(value);
                    setEthAmount('');
                    bump();
                    if (refetch) refetch();
                    console.log('Donation TX sent:', tx);
                  } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : String(err);
                    setDonateError(errorMsg);
                  }
                }}>Confirm Mainnet Donation</button>
              </div>
            </div>
          </div>
        )}
        {!isConnected && (
          <div className="card beneficiaries-card" style={{ marginBottom: '1.5rem' }}>
            <BeneficiariesCard />
            <div style={{ marginTop:'.7rem', fontSize:'.6rem', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)', padding:'.5rem .65rem', borderRadius:'8px', lineHeight:1.3, color:'var(--text-secondary)' }}>
              Public dashboard mode: connect only if you intend to donate or simulate. Aggregated metrics (pending / withdrawn / lifetime) refresh near real-time from on-chain state.
            </div>
          </div>
        )}
        {isConnected && mismatch && (
          <div className="card" style={{ marginBottom: '1rem', border:'1px solid rgba(255,170,0,0.35)', background:'rgba(255,170,0,0.10)' }}>
            <div style={{ fontSize:'.65rem', lineHeight:1.4 }}>
              Network mismatch: your wallet is on {activeChain?.name} (id {activeChain?.id}) while the dashboard target is {TARGET_CHAIN_LABEL} (id {TARGET_CHAIN_ID}). Data shown comes from the target chain. Switch networks before sending transactions.
            </div>
          </div>
        )}
        {isConnected && (
          <div className="card beneficiaries-card" style={{ marginBottom: '1.5rem' }}>
            <BeneficiariesCard />
          </div>
        )}
        {isConnected && (
          <div className="panels-grid">
            {/* Wallet Panel */}
            <div className="card wallet-panel">
              <h2>Wallet</h2>
              <div className="wallet-lines">
                <div className="kv-row"><span className="kv-label">Account</span><span className="mono">{truncateAddress(address)}</span></div>
                <div className="kv-row">
                  <span className="kv-label">Network</span>
                  <span className="mono">{activeChain ? `${activeChain.name} · id ${activeChain.id}` : 'Unknown'}</span>
                </div>
                <div className="kv-row"><span className="kv-label">Balance</span>
                  <span className="mono">
                    {userBalance ? `${(Number(userBalance.value)/1e18).toFixed(4)} ${userBalance.symbol}` : (
                      <span style={{ display: 'inline-block', width: 90 }} className="skeleton skeleton-sm" />
                    )}
                  </span>
                </div>
                <div className="badges">
                  {!isMainnet && activeChain && <span className="badge badge-test">TEST / NON-MAINNET</span>}
                  {isMainnet && <span className="badge badge-main">MAINNET · CAUTION</span>}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'.35rem', marginTop:'.35rem' }}>
                  <a
                    href={makeAddressLink(activeChain?.id || TARGET_CHAIN_ID, runtimeAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize:'.6rem', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'.4rem', background:'rgba(255,255,255,0.06)', padding:'.4rem .55rem', borderRadius:'6px', border:'1px solid rgba(255,255,255,0.12)', color:'var(--accent-alt)' }}
                    title="View contract on explorer"
                  >
                    <span style={{ fontWeight:600 }}>Contract</span>
                    <span className="mono" style={{ fontSize:'.55rem' }}>{truncateAddress(runtimeAddress)}</span>
                    <span style={{ fontSize:'.65em', opacity:.7 }}>↗</span>
                  </a>
                  {mismatch && (
                    <div className="alert" style={{ margin:0 }}>Network mismatch: wallet {activeChain?.name} vs target {TARGET_CHAIN_LABEL}. Data shown = target. Switch network to interact.</div>
                  )}
                </div>
                {isMainnet && (
                  <div className="alert">You are on mainnet. Double‑check addresses and amounts before sending.</div>
                )}
                {!isMainnet && activeChain && (
                  <div className="note">Test or local network. Funds are not real ETH.</div>
                )}
              </div>
              <div className="divider" />
              <button className="btn secondary" onClick={() => disconnect()}>Disconnect</button>
            </div>
            {/* Donate Panel */}
            <div className="card">
              <h2>Donate ETH</h2>
              {mismatch && (
                <div className="alert" style={{ marginTop: '.3rem' }}>
                  Wallet {activeChain?.name} (id {activeChain?.id}) ≠ target {TARGET_CHAIN_LABEL} (id {TARGET_CHAIN_ID}). Read‑only mode until you switch.
                </div>
              )}
              <form className="donate-form"
                onSubmit={async e => {
                  e.preventDefault();
                  setDonateError(null);
                  try {
                    if (isMainnet && !showMainnetConfirm) {
                      // Trigger confirm modal first
                      setShowMainnetConfirm(true);
                      return;
                    }
                    const value = ethAmount && !isNaN(Number(ethAmount)) ? BigInt(Math.floor(Number(ethAmount.toString()) * 1e18)) : undefined;
                    if (!value) throw new Error('Invalid amount');
                    const tx = await donateETH(value);
                    setEthAmount('');
                    bump();
                    if (refetch) refetch();
                    console.log('Donation TX sent:', tx);
                  } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : String(err);
                    setDonateError(errorMsg);
                    console.error('Donation error:', err);
                  }
                }}>
                <div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Amount in ETH"
                    value={ethAmount}
                    onChange={e => setEthAmount(e.target.value)}
                    required
                  />
                </div>
                <button className="btn" type="submit" disabled={mismatch}>Donate</button>
              </form>
              {donateError && <p className="alert" style={{ marginTop: '.5rem' }}>Donate error: {donateError}</p>}
                    {mismatch && <p className="note" style={{ marginTop: '.5rem' }}>Switch wallet network to id {TARGET_CHAIN_ID} to enable donations.</p>}
            </div>
            {/* Withdraw Panel */}
            <div className="card">
              <h2>Withdrawals</h2>
              <p className="muted">Contract balance: <strong>{contractBalance ? (Number(contractBalance.value)/1e18).toFixed(4) : (<span style={{ display: 'inline-block', width: 80 }} className="skeleton skeleton-sm" />)}{contractBalance && ' ETH'}</strong></p>
              {(() => {
                const pending = pendingEth as bigint | undefined;
                return isConnected && pending !== undefined && pending > 0n;
              })() ? (
                <div className="pending-box">
                  <p>Pending balance: <strong>{pendingEth ? ((Number(pendingEth as bigint))/1e18).toFixed(4) + ' ETH' : (<span style={{ display: 'inline-block', width: 70 }} className="skeleton skeleton-sm" />)}</strong></p>
                  <button className="btn secondary"
                    onClick={async () => {
                      setWithdrawError(null);
                      try {
                        const tx = await withdrawETH();
                        bump();
                        if (refetch) refetch();
                        console.log('Withdraw TX:', tx);
                      } catch (err) {
                        const errorMsg = err instanceof Error ? err.message : String(err);
                        setWithdrawError(errorMsg);
                        console.error('Withdraw error:', err);
                      }
                    }}
                    disabled={isWithdrawing}
                  >
                    {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
                  </button>
                  {withdrawError && <p className="alert">Withdraw error: {withdrawError}</p>}
                </div>
              ) : (
                <p className="muted">No pending balance to withdraw.</p>
              )}
            </div>
          </div>
        )}
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <HowItWorks />
        </div>
      </section>
      <footer className="app-footer">DonationSplitter · Experimental UI · {new Date().getFullYear()}</footer>
    </div>
  );
}

export default App;

// Local expandable How It Works section component
function HowItWorks() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div className="card-header-row">
        <h2 style={{ margin: 0 }}>How It Works</h2>
        <button
          type="button"
          className="btn ghost sm"
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
        >
          {open ? 'Hide' : 'Show'}
        </button>
      </div>
      {open && (
        <div style={{ fontSize: '.85rem', lineHeight: 1.5, display: 'grid', gap: '.9rem' }}>
          <p>
            DonationSplitter lets donors send ETH once while the contract accounts for beneficiary percentages. Each recipient can later withdraw only what has been allocated to them.
          </p>
          <ol style={{ margin: 0, paddingLeft: '1.1rem', display: 'grid', gap: '.4rem' }}>
            <li><strong>Connect</strong>: Attach your wallet.</li>
            <li><strong>Donate</strong>: Send ETH; the contract records distribution using predefined shares.</li>
            <li><strong>Accrual</strong>: Pending balances accumulate per beneficiary.</li>
            <li><strong>Withdraw</strong>: Beneficiaries call withdraw to claim their accrued ETH.</li>
          </ol>
          <p className="muted" style={{ margin: 0 }}>All logic is on-chain: no off-chain accounting or custodial elements.</p>
        </div>
      )}
    </div>
  );
}

// Beneficiaries list card
function BeneficiariesCard() {
  const total = beneficiariesTotalBps();
  // Dynamic chain id; do not force Sepolia if unknown so we don't mislabel local networks
  const currentChainId = useChainId?.();
  const chainInfo = currentChainId ? getChainInfo(currentChainId) : undefined; // wagmi notion
  // Local provider chain detection (independent of wagmi hook) to reflect real wallet even if hook stale
  const [provChainId, setProvChainId] = useState<number|undefined>();
  // Effective wallet network (provider preferred to avoid stale wagmi)
  const walletEffectiveId = typeof provChainId !== 'undefined' ? provChainId : currentChainId;
  const walletEffectiveInfo = walletEffectiveId ? getChainInfo(walletEffectiveId) : undefined;
  React.useEffect(() => {
    const win = window as unknown as { ethereum?: { request: (args:{method:string})=>Promise<string>; on?: (ev:string, cb:(p:string)=>void)=>void; removeListener?: (ev:string, cb:(p:string)=>void)=>void } };
    if (!win.ethereum) return;
    let mounted = true;
    win.ethereum.request({ method:'eth_chainId' }).then(cid => { if (!mounted) return; const n=Number(cid); if(!isNaN(n)) setProvChainId(n); }).catch(()=>{});
    const handler = (cid:string) => { if (!mounted) return; const n=Number(cid); if(!isNaN(n)) setProvChainId(n); };
    win.ethereum.on?.('chainChanged', handler);
    return () => { mounted=false; win.ethereum?.removeListener?.('chainChanged', handler); };
  }, []);
  const { pendingPerBeneficiary, withdrawnPerBeneficiary, anyLoading, totalPending, totalWithdrawn } = useBeneficiaryFinancials();
  const totalLifetime = totalPending + totalWithdrawn;
  const [theme, setTheme] = useState<'dark'|'light'>(() => (localStorage.getItem('ds_theme') as 'dark'|'light') || 'dark');
  // apply theme class on body
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
        {/* Line 1: Title left (like How It Works) + badges pushed to right */}
        <div className="card-header-row beneficiaries-main" style={{ alignItems:'flex-start', width:'100%' }}>
          <h2 style={{ margin:0 }}>Beneficiaries</h2>
          <div style={{ display:'flex', alignItems:'center', gap:'.65rem', flexWrap:'wrap', justifyContent:'flex-end' }}>
            <span style={{ fontSize:'.6rem', letterSpacing:'.5px', padding:'.35rem .65rem', borderRadius:'999px', background: configuredId === 1 ? 'linear-gradient(135deg,#4e1218,#2a0d10)' : 'linear-gradient(135deg,#3b3f52,#272b37)', border:'1px solid rgba(255,255,255,0.18)', display:'inline-flex', gap:'.45rem', alignItems:'center', fontWeight:600, whiteSpace:'nowrap' }}>
              TARGET: {configuredName}{configuredId !== 1 && <span style={{ color:'var(--warn)', fontWeight:700 }}>Not real ETH</span>}
            </span>
            {walletEffectiveId && walletEffectiveId !== configuredId && (
              <span style={{ fontSize:'.55rem', letterSpacing:'.5px', padding:'.3rem .6rem', borderRadius:'999px', background:'linear-gradient(135deg,#4d2f20,#372016)', border:'1px solid rgba(255,180,60,0.35)', display:'inline-flex', gap:'.35rem', alignItems:'center', fontWeight:600, whiteSpace:'nowrap' }} title={`Wallet network (${walletEffectiveInfo?.name || walletEffectiveId}) differs from target (${configuredName})`}>
                WALLET: {walletEffectiveInfo?.name || walletEffectiveId}
              </span>
            )}
            <button type="button" className="btn ghost sm" style={{ fontSize:'.55rem', letterSpacing:'.5px', marginLeft:'.4rem' }}
              onClick={() => { const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next); localStorage.setItem('ds_theme', next); }}
            >Theme: {theme === 'dark' ? 'Dark' : 'Light'}</button>
          </div>
        </div>
        {/* Line 2: Legend + stats + theme (aligned to left, normal card padding) */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', fontSize:'.55rem', flexWrap:'wrap', rowGap:'.4rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap' }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:'.3rem' }}><span style={{ width:14, height:6, background:'linear-gradient(90deg,#2e7dd1,#4aa8ff)', borderRadius:3 }} /> Withdrawn</span>
            <span style={{ display:'inline-flex', alignItems:'center', gap:'.3rem' }}><span style={{ width:14, height:6, background:'linear-gradient(90deg,#f39c12,#f1c40f)', borderRadius:3 }} /> Pending</span>
            <span style={{ display:'inline-flex', alignItems:'center', gap:'.3rem' }} title="P=Pending W=Withdrawn L=Lifetime">Abbrev: P / W / L</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'1.1rem', flexWrap:'wrap', justifyContent:'flex-end', fontSize:'.62rem', fontWeight:600, letterSpacing:'.25px' }}>
            <span style={{ whiteSpace:'nowrap' }}>Total: {(total/100).toFixed(2)}%</span>
            <span style={{ whiteSpace:'nowrap' }}>Pending: { anyLoading ? (<span style={{ display:'inline-block', width:50 }} className="skeleton skeleton-sm" />) : `${(Number(totalPending)/1e18).toFixed(4)} ETH` }</span>
            <span style={{ whiteSpace:'nowrap' }}>Withdrawn: { anyLoading ? (<span style={{ display:'inline-block', width:60 }} className="skeleton skeleton-sm" />) : `${(Number(totalWithdrawn)/1e18).toFixed(4)} ETH` }</span>
            <span style={{ whiteSpace:'nowrap' }}>Lifetime: { anyLoading ? (<span style={{ display:'inline-block', width:55 }} className="skeleton skeleton-sm" />) : `${(Number(totalLifetime)/1e18).toFixed(4)} ETH` }</span>
          </div>
        </div>
        {(import.meta.env?.VITE_DEBUG_NETWORK === '1') && (
          <div style={{ fontSize:'.55rem', opacity:.7, display:'flex', flexDirection:'column', gap:'.2rem', padding:'.4rem .6rem', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:6, maxWidth:240 }}>
            <div style={{ fontWeight:600 }}>Debug Network</div>
            <div style={{ display:'flex', justifyContent:'space-between' }}><span>wagmi id</span><span style={{ fontFamily:'monospace' }}>{String(currentChainId ?? 'n/a')}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between' }}><span>provider id</span><span style={{ fontFamily:'monospace' }}>{String(typeof provChainId !== 'undefined' ? provChainId : 'n/a')}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between' }}><span>effective id</span><span style={{ fontFamily:'monospace' }}>{String(typeof provChainId !== 'undefined' ? provChainId : (currentChainId ?? 'n/a'))}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between' }}><span>wallet name</span><span style={{ fontFamily:'monospace' }}>{(provChainId ?? currentChainId) ? (getChainInfo((provChainId ?? currentChainId) || undefined)?.name || 'Unknown') : '—'}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between' }}><span>target id</span><span style={{ fontFamily:'monospace' }}>{configuredId}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between' }}><span>target name</span><span style={{ fontFamily:'monospace' }}>{configuredName}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between' }}><span>mismatch</span><span style={{ fontFamily:'monospace', color: (provChainId ?? currentChainId) && (provChainId ?? currentChainId) !== configuredId ? '#f39c12' : '#4caf50' }}>{(provChainId ?? currentChainId) && (provChainId ?? currentChainId) !== configuredId ? 'yes' : 'no'}</span></div>
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
            withdrawnPct = Number((withdrawnVal || 0n) * 10_000n / lifetime) / 100; // two decimals
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
                {/* Dynamic activity bar: withdrawn (blue) vs pending (yellow). Empty (no color) until first donation */}
                <div style={{ position:'relative', height:'6px', background:'rgba(255,255,255,0.07)', borderRadius:'4px', overflow:'hidden', marginTop:'.35rem', marginBottom:'.35rem' }} title={tooltip} aria-label={tooltip}>
                  {hasActivity && (
                    <div style={{ position:'absolute', inset:0, display:'flex', width:'100%' }}>
                      <div style={{ width: (withdrawnPct>0 && withdrawnPct<1 ? 1 : withdrawnPct) + '%', background:'linear-gradient(90deg,#2e7dd1,#4aa8ff)', transition:'width .6s ease' }} />
                      <div style={{ width: (pendingPct>0 && pendingPct<1 ? 1 : pendingPct) + '%', background:'linear-gradient(90deg,#f39c12,#f1c40f)', transition:'width .6s ease' }} />
                    </div>
                  )}
                  {!hasActivity && (
                    <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.45rem', letterSpacing:'.3px', fontWeight:500, color:'rgba(255,255,255,0.55)', background:'repeating-linear-gradient(90deg,rgba(255,255,255,0.05) 0 8px, rgba(255,255,255,0.02) 8px 16px)' }}>
                      No activity
                    </div>
                  )}
                </div>
                {/* Static configuration bar: beneficiary share (BPS) of the total – does not change unless contract is redeployed/config updated */}
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
      {/* Static config note moved to disconnected state card */}
    </div>
  );
}

// Custom hook using beneficiaryTotals() via batched reads (lifetime + components)
function useBeneficiaryFinancials() {
  const chainId = useChainId?.();
  const runtimeAddress = getDonationSplitterAddress(chainId);
  // Build read contracts for each beneficiary using dynamic address
  const contracts = BENEFICIARIES.map(b => ({
    address: runtimeAddress,
    abi: DONATION_SPLITTER_ABI,
    functionName: 'beneficiaryTotals',
    args: [b.address] as const
  }));
  const { data, isLoading } = useReadContracts({
    // cast because our const ABI satisfies viem Abi type
    contracts: contracts as unknown as readonly { address: `0x${string}`; abi: DonationSplitterAbi; functionName: 'beneficiaryTotals'; args: readonly [`0x${string}`]; }[],
    query: { refetchInterval:5000 }
  });
  const pendingPerBeneficiary: (bigint|undefined)[] = [];
  const withdrawnPerBeneficiary: (bigint|undefined)[] = [];
  data?.forEach(res => {
    if (res?.result && Array.isArray(res.result)) {
      // result order: pending, withdrawn, lifetime
      pendingPerBeneficiary.push(res.result[0] as bigint);
      withdrawnPerBeneficiary.push(res.result[1] as bigint);
    } else {
      pendingPerBeneficiary.push(undefined); withdrawnPerBeneficiary.push(undefined);
    }
  });
  while (pendingPerBeneficiary.length < BENEFICIARIES.length) { pendingPerBeneficiary.push(undefined); withdrawnPerBeneficiary.push(undefined); }
  const totalPending = pendingPerBeneficiary.reduce<bigint>((acc,v)=>acc+(v||0n),0n);
  const totalWithdrawn = withdrawnPerBeneficiary.reduce<bigint>((acc,v)=>acc+(v||0n),0n);
  return { pendingPerBeneficiary, withdrawnPerBeneficiary, anyLoading: isLoading, totalPending, totalWithdrawn };
}
