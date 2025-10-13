import { useState, useEffect } from 'react';
import { useBalance, usePublicClient } from 'wagmi';
import type { Chain } from 'viem';
import { DONATION_SPLITTER_ABI } from '../../config/contractInfo';
import { BENEFICIARIES } from '../../config/beneficiaries';

interface DonatePanelProps {
  address: string | undefined;
  activeChain: Chain | undefined;
  chainId: number;
  runtimeAddress: string;
  mismatch: boolean;
  ready: boolean;
  providerAvailable: boolean;
  isMainnet: boolean;
  role: 'owner' | 'beneficiary' | 'donor' | 'unauth';
  TARGET_CHAIN_ID: number;
  TARGET_CHAIN_LABEL: string;
  onDonationSuccess: () => void;
  setShowMainnetConfirm: (show: boolean) => void;
  showMainnetConfirm: boolean;
  [key: string]: unknown; // allow data-tab
}

export function DonatePanel({
  address,
  chainId,
  runtimeAddress,
  mismatch,
  ready,
  providerAvailable,
  isMainnet,
  TARGET_CHAIN_ID,
  setShowMainnetConfirm,
  showMainnetConfirm,
  // ...rest
}: DonatePanelProps) {
  const [ethAmount, setEthAmount] = useState('');
  const [donateError, setDonateError] = useState<string | null>(null);
  const [howOpen, setHowOpen] = useState(false);
  const [gasEstimating, setGasEstimating] = useState(false);
  const [estGasUnits, setEstGasUnits] = useState<number|undefined>();
  const [gasPriceWei, setGasPriceWei] = useState<bigint|undefined>();
  const [ethUsd, setEthUsd] = useState<number|undefined>();
  const [priceError, setPriceError] = useState(false);

  const publicClient = usePublicClient();
  // const { donateETH } = useDonateETH();

  // Read the user's wallet balance
  const { data: userBalance } = useBalance({
    address: address as `0x${string}` | undefined,
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  // Derivados después de tener userBalance
  const numericAmount = Number(ethAmount);
  const walletEth = userBalance ? Number(userBalance.value) / 1e18 : 0;
  const THRESH_WARN = 50; // %
  const THRESH_DANGER = 80; // %
  const gasBufferEth = 0.0005;
  const fallbackGasUnits = 55_000;
  const fallbackGasPriceGwei = 5;
  const usedGasUnits = estGasUnits ?? fallbackGasUnits;
  const gasPriceGwei = gasPriceWei ? Number(gasPriceWei) / 1e9 : fallbackGasPriceGwei;
  const gasCostEth = (usedGasUnits * gasPriceGwei) / 1e9 / 1e9;
  const effectiveMaxSendEth = walletEth > gasCostEth ? walletEth - gasCostEth : 0;
  const exceedsBalance = !!ethAmount && !isNaN(numericAmount) && numericAmount > walletEth + 1e-18;
  const pctUsage = walletEth > 0 && !isNaN(numericAmount) ? (numericAmount / walletEth) * 100 : 0;

  function fillMax() {
    if (!walletEth || walletEth <= gasBufferEth) return;
    const max = effectiveMaxSendEth - gasBufferEth;
    if (max <= 0) return;
    setEthAmount(max.toFixed(6).replace(/\.0+$/,''));
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!publicClient || !runtimeAddress) return;
      setGasEstimating(true); 
      setDonateError(null);
      try {
        const gp = await publicClient.getGasPrice();
        if (cancelled) return;
        setGasPriceWei(gp);
        let valueWei: bigint = 1n;
        if (!isNaN(numericAmount) && numericAmount > 0) {
          valueWei = BigInt(Math.floor(numericAmount * 1e18));
        }
        const est = await publicClient.estimateContractGas({
          address: runtimeAddress as `0x${string}`,
          abi: DONATION_SPLITTER_ABI,
          functionName: 'donateETH',
          value: valueWei,
          account: address as `0x${string}` | undefined,
        }).catch(()=>undefined);
        if (cancelled) return;
        if (est) setEstGasUnits(Number(est));
      } catch (err) {
        if (!cancelled) setDonateError((err as Error).message);
      } finally {
        if (!cancelled) setGasEstimating(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [publicClient, runtimeAddress, address, numericAmount, chainId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const json = await res.json();
        if (cancelled) return;
        const v = json?.ethereum?.usd;
        if (typeof v === 'number') { 
          setEthUsd(v); 
          setPriceError(false); 
        } else { 
          setPriceError(true); 
        }
      } catch { 
        if (!cancelled) setPriceError(true); 
      }
    }
    load();
    const id = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDonateError(null);
      try {
        if (exceedsBalance) {
          setDonateError('Amount exceeds wallet balance');
          return;
        }
        if (isMainnet && !showMainnetConfirm) {
          setShowMainnetConfirm(true);
          return;
        }
        // if (!(role === 'owner' || role === 'donor' || role === 'beneficiary')) {
        //   return;
        // }
        // TODO: Call donateETH or other donation logic here
      } catch (err) {
        setDonateError((err as Error).message);
      }
  };

  return (
    <div>
      {/* ...existing JSX content... */}
          <form className="donate-form inline-layout" onSubmit={handleSubmit}>
            <div className="donate-input-wrap">
              <input
                type="number"
                min="0"
                step="any"
                placeholder="Amount in ETH"
                value={ethAmount}
                onChange={e => setEthAmount(e.target.value)}
                required
                style={{ width:'100%' }}
              />
            </div>
            <div className="donate-actions" style={{ display:'flex', gap:'.45rem', alignItems:'stretch', flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.22)', padding:'.55rem .75rem', borderRadius:8, fontSize:'.68rem', fontFamily:'JetBrains Mono, monospace', fontWeight:500, letterSpacing:'.5px', boxShadow:'0 1px 2px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04) inset', minHeight:'42px' }} title={ethUsd ? 'Conversión aproximada USD' : 'Esperando precio USD'}>
                {ethAmount && !isNaN(numericAmount) && numericAmount>0 && ethUsd ? (
                  '≈ $' + (numericAmount*ethUsd).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})
                ) : (
                  <span style={{ opacity:.4 }}>≈ $0.00</span>
                )}
              </div>
              <button type="button" className="btn ghost sm" style={{ fontSize:'.6rem', padding:'.55rem .75rem', minHeight:'42px', display:'inline-flex', alignItems:'center' }} onClick={fillMax} disabled={!walletEth || walletEth <= gasBufferEth}>
                Max
              </button>
              <button className="btn donate-compact" type="submit" disabled={exceedsBalance || mismatch || (ready && !providerAvailable)} style={{ padding:'.55rem 1.0rem', fontSize:'.78rem', fontWeight:600, whiteSpace:'nowrap', opacity: exceedsBalance ? .55 : 1, minHeight:'42px', display:'inline-flex', alignItems:'center' }}>
                Donate
              </button>
            </div>
          </form>

          {priceError && (
            <div style={{ marginTop:'.35rem', fontSize:'.5rem', opacity:.6 }}>
              USD feed no disponible (testnet / rate limit). Solo se muestra ETH.
            </div>
          )}

          {/* Barra de progreso de uso del balance */}
          {walletEth > 0 && ethAmount && !isNaN(numericAmount) && (
            <div style={{ marginTop:'.45rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.5rem', letterSpacing:'.4px', marginBottom:'.25rem' }}>
                <span>Usage: {pctUsage.toFixed(2)}%</span>
                <span style={{ opacity:.7 }} title={`Gas est. ~${usedGasUnits.toLocaleString()} u${gasPriceWei ? ' · gasPrice ' + gasPriceGwei.toFixed(2) + ' gwei' : ' (fallback)'} · ${(gasCostEth).toFixed(6)} ETH${ethUsd ? ' ($' + (gasCostEth * ethUsd).toFixed(4) + ')' : ''}`}>
                  Bal: {walletEth.toFixed(4)} ETH
                </span>
              </div>
              {(() => {
                let bg = 'linear-gradient(90deg,#2ecc71,#27ae60)';
                if (pctUsage >= THRESH_WARN && pctUsage < THRESH_DANGER) bg = 'linear-gradient(90deg,#f1c40f,#f39c12)';
                if (pctUsage >= THRESH_DANGER) bg = 'linear-gradient(90deg,#e74c3c,#c0392b)';
                const width = Math.min(100, pctUsage);
                return (
                  <div style={{ position:'relative', height:6, background:bg, borderRadius:4, overflow:'hidden', boxShadow:'0 0 0 1px rgba(255,255,255,0.08) inset' }} aria-label={`Using ${pctUsage.toFixed(2)}% of wallet balance`} title={`Est. gas ${(gasCostEth).toFixed(6)} ETH${ethUsd ? ' ($' + (gasCostEth*ethUsd).toFixed(4) + ')' : ''} · Máx seguro ~${effectiveMaxSendEth.toFixed(6)} ETH${ethUsd ? ' ($' + (effectiveMaxSendEth*ethUsd).toFixed(2) + ')' : ''}`}>
                    <div style={{ position:'absolute', inset:0, width: width + '%', background:bg, transition:'width .35s ease' }} />
                    {exceedsBalance && (
                      <div style={{ position:'absolute', inset:0, background:'repeating-linear-gradient(45deg,rgba(255,0,0,0.55) 0 6px, rgba(255,0,0,0.15) 6px 12px)', mixBlendMode:'screen' }} />
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Badge de gas estimado */}
          <div style={{ marginTop:'.4rem', display:'flex', gap:'.5rem', flexWrap:'wrap', fontSize:'.52rem', letterSpacing:'.4px', alignItems:'center' }}>
            <span style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)', padding:'.28rem .5rem', borderRadius:6 }} title={gasEstimating ? 'Estimating gas…' : `Gas units ~${usedGasUnits.toLocaleString()} · Cost ${(gasCostEth).toFixed(6)} ETH${ethUsd ? ' ($' + (gasCostEth*ethUsd).toFixed(4) + ')' : ''}`}>
              Gas: {gasEstimating ? '…' : (gasCostEth).toFixed(6)} ETH{ethUsd && !gasEstimating && <span style={{ opacity:.8 }}> (${(gasCostEth*ethUsd).toFixed(4)})</span>}
            </span>
            <span style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)', padding:'.28rem .55rem', borderRadius:6 }} title={`Máx seguro (balance - gas): ~${effectiveMaxSendEth.toFixed(6)} ETH${ethUsd ? ' ($' + (effectiveMaxSendEth*ethUsd).toFixed(2) + ')' : ''}`}>
              Max send ≈ {effectiveMaxSendEth.toFixed(6)} ETH
            </span>
          </div>

          {exceedsBalance && (
            <div className="alert" style={{ marginTop:'.45rem' }}>
              Amount entered ({numericAmount.toFixed(6)} ETH) is greater than your wallet balance ({walletEth.toFixed(6)} ETH).
            </div>
          )}

          {/* Preview Split */}
          {ethAmount && !isNaN(Number(ethAmount)) && Number(ethAmount) > 0 && (
            <div style={{ marginTop:'.75rem', background:'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))', border:'1px solid rgba(255,255,255,0.15)', padding:'.75rem .8rem .85rem', borderRadius:10, position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', inset:0, pointerEvents:'none', background:'radial-gradient(circle at 85% 15%, rgba(255,255,255,0.15), transparent 60%)', opacity:.35 }} />
              <div style={{ fontWeight:600, fontSize:'.68rem', letterSpacing:'.5px', marginBottom:'.55rem', display:'flex', alignItems:'center', gap:'.5rem' }}>
                <span style={{ background:'rgba(255,255,255,0.08)', padding:'.32rem .55rem', borderRadius:6, border:'1px solid rgba(255,255,255,0.15)', fontSize:'.55rem' }}>Preview Split</span>
                <span style={{ fontSize:'.48rem', opacity:.55, textTransform:'uppercase', letterSpacing:'.6px' }}>Off-chain estimation</span>
              </div>
              <div style={{ display:'grid', gap:'.45rem' }}>
                {BENEFICIARIES.map(b => {
                  const amountEth = Number(ethAmount);
                  const share = (amountEth * b.bps) / 10000;
                  const pctNum = (b.bps/100);
                  const barGradient = 'linear-gradient(90deg,var(--accent) 0%, var(--accent-alt) 100%)';
                  return (
                    <div key={b.address} style={{ display:'grid', gridTemplateColumns:'minmax(140px,1fr) auto', alignItems:'center', gap:'.75rem' }}>
                      <div style={{ display:'flex', flexDirection:'column', gap:'.3rem' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'.45rem', flexWrap:'wrap' }}>
                          <span style={{ fontFamily:'monospace', fontSize:'.65rem', background:'rgba(255,255,255,0.07)', padding:'.25rem .45rem', borderRadius:5, border:'1px solid rgba(255,255,255,0.15)' }}>{pctNum.toFixed(2)}%</span>
                          <span style={{ fontSize:'.63rem', fontWeight:600, letterSpacing:'.3px' }}>{b.label}</span>
                        </div>
                        <div style={{ position:'relative', height:6, background:'rgba(255,255,255,0.08)', borderRadius:4, overflow:'hidden' }}>
                          <div style={{ position:'absolute', inset:0, width:`${pctNum}%`, background:barGradient, boxShadow:'0 0 0 1px rgba(255,255,255,0.08) inset', transition:'width .4s ease' }} />
                        </div>
                      </div>
                      <div style={{ fontFamily:'monospace', fontSize:'.6rem', fontWeight:500, textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'.15rem' }}>
                        <span>{share.toFixed(6)} ETH</span>
                        {ethUsd && <span style={{ fontSize:'.47rem', opacity:.65 }}>${(share*ethUsd).toFixed(2)}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop:'.55rem', fontSize:'.5rem', letterSpacing:'.4px', opacity:.7, display:'flex', alignItems:'center', gap:'.5rem', flexWrap:'wrap' }}>
                <span>Residual rounding → last beneficiary.</span>
                <span style={{ background:'rgba(255,255,255,0.07)', padding:'.25rem .45rem', borderRadius:5, fontSize:'.48rem', border:'1px solid rgba(255,255,255,0.15)' }}>Approximate</span>
              </div>
            </div>
          )}

          {donateError && <p className="alert" style={{ marginTop: '.5rem' }}>Donate error: {donateError}</p>}
          {mismatch && <p className="note" style={{ marginTop: '.5rem' }}>Switch wallet network to id {TARGET_CHAIN_ID} to enable donations.</p>}
          {ready && !providerAvailable && !mismatch && <p className="note" style={{ marginTop: '.5rem' }}>Provider not detected. Re-open in MetaMask browser or refresh after returning from app switch.</p>}
          {/* How It Works Modal */}
          {howOpen && (
            <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1600, display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem' }} role="dialog" aria-modal="true" aria-label="How It Works">
              <div className="card" style={{ maxWidth:580, maxHeight:'72vh', overflow:'auto', gap:'.9rem' }}>
                <div className="card-header-row">
                  <h2 style={{ margin:0 }}>How It Works</h2>
                  <button type="button" className="btn ghost sm" onClick={()=>setHowOpen(false)}>Close</button>
                </div>
                <HowItWorksBody />
              </div>
            </div>
          )}
    </div>
  );
}

// Local expandable How It Works section component
function HowItWorksBody() {
  return (
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
  );
}