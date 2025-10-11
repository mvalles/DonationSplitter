import './App.css';
import { useAccount, useReadContract, useBalance, useChainId, useChains, useReadContracts, useConnect, useDisconnect } from 'wagmi';
import type { Chain } from 'viem';
import { metaMask } from 'wagmi/connectors';
import { useDonateETH, useWithdrawETH } from './contractWriteHooks';
import { useRefetchKey } from './RefetchContext';
import { DONATION_SPLITTER_ABI, type DonationSplitterAbi, getDonationSplitterAddress, TARGET_CHAIN_ID as CONFIG_TARGET_CHAIN_ID, TARGET_CHAIN_LABEL } from './contractInfo';
import { useEffectiveChain } from './hooks/useEffectiveChain';
import DonationSplitArt from './DonationSplitArt';
import React, { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { blockscoutTxUrl, blockscoutAddressUrl, hasBlockscout } from './blockscout';
import { BENEFICIARIES, beneficiariesTotalBps, formatPercent } from './beneficiaries';
import { getChainInfo, makeAddressLink } from './chainMeta';
import { OrgLogo } from './orgLogos';



function App() {
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const chains = useChains();

  const [ethAmount, setEthAmount] = useState('');
  const [showMainnetConfirm, setShowMainnetConfirm] = useState(false);
  // Target chain (from env) determining which contract we show when no wallet is connected
  const TARGET_CHAIN_ID = CONFIG_TARGET_CHAIN_ID;
  const [donateError, setDonateError] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [lastDonateTx, setLastDonateTx] = useState<string | null>(null);
  const [lastWithdrawTx, setLastWithdrawTx] = useState<string | null>(null);
  const [howOpen, setHowOpen] = useState(false);
  const publicClient = usePublicClient();
  const [gasEstimating, setGasEstimating] = useState(false);
  const [estGasUnits, setEstGasUnits] = useState<number|undefined>();
  const [gasPriceWei, setGasPriceWei] = useState<bigint|undefined>();
  const [ethUsd, setEthUsd] = useState<number|undefined>();
  const [gasError, setGasError] = useState<string|null>(null);
  const [priceError, setPriceError] = useState(false);

    // Refetch context
  const { bump } = useRefetchKey();
    // Read pending balance for the connected user
    const runtimeAddress = getDonationSplitterAddress(chainId);
    // Determine active chain early (needed for mismatch gating)
  const activeChain = chains.find((c: Chain) => c.id === chainId);
    const isMainnet = activeChain?.id === 1;
  // Unified chain / mismatch state via shared hook (removes duplicated provider listener logic)
  const { mismatch, providerAvailable, ready } = useEffectiveChain();
  // Auto-disconnect logic if wagmi thinks connected but no injected provider after grace period (mobile Safari / iOS deep link case)
  const [providerGraceExpired, setProviderGraceExpired] = useState(false);
  if (isConnected && ready && !providerAvailable && !providerGraceExpired) {
    // Start a one-time timer (avoid setting multiple)
    setTimeout(() => {
      // if still no provider, flag grace expired (UI warning + optional disconnect)
      setProviderGraceExpired(true);
    }, 3500);
  }
  if (providerGraceExpired && isConnected && !providerAvailable) {
    // Reset and allow user to reconnect manually
    setProviderGraceExpired(false);
  }
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

  // -------- Derivados después de tener userBalance (evita ReferenceError / TDZ) --------
  const numericAmount = Number(ethAmount);
  const walletEth = userBalance ? Number(userBalance.value) / 1e18 : 0;
  // Umbrales configurables
  const THRESH_WARN = 50; // %
  const THRESH_DANGER = 80; // %
  const gasBufferEth = 0.0005; // margen simple adicional para Max
  // Estimación dinámica de gas (con fallback)
  const fallbackGasUnits = 55_000;
  const fallbackGasPriceGwei = 5;
  const usedGasUnits = estGasUnits ?? fallbackGasUnits;
  const gasPriceGwei = gasPriceWei ? Number(gasPriceWei) / 1e9 : fallbackGasPriceGwei;
  const gasCostEth = (usedGasUnits * gasPriceGwei) / 1e9 / 1e9; // units * gwei -> eth
  const effectiveMaxSendEth = walletEth > gasCostEth ? walletEth - gasCostEth : 0;
  const exceedsBalance = !!ethAmount && !isNaN(numericAmount) && numericAmount > walletEth + 1e-18;
  const pctUsage = walletEth > 0 && !isNaN(numericAmount) ? (numericAmount / walletEth) * 100 : 0;
  function fillMax() {
    if (!walletEth || walletEth <= gasBufferEth) return;
    const max = effectiveMaxSendEth - gasBufferEth; // buffer adicional
    if (max <= 0) return;
    // Limitar a 6 decimales para evitar demasiado ruido visual
    setEthAmount(max.toFixed(6).replace(/\.0+$/,''));
  }

  // Efecto: estimar gas y gasPrice cuando cambia chain o se conecta
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!publicClient || !runtimeAddress) return;
      setGasEstimating(true); setGasError(null);
      try {
        // gas price
        const gp = await publicClient.getGasPrice();
        if (cancelled) return;
        setGasPriceWei(gp);
        // estimate contract gas (donateETH sin value -> usamos value mínima 1 wei para estimar base + overhead)
        // Usamos value concreto si el usuario llenó amount (convertimos a wei) para mayor precisión
        let valueWei: bigint = 1n;
        if (!isNaN(numericAmount) && numericAmount > 0) {
          valueWei = BigInt(Math.floor(numericAmount * 1e18));
        }
        const est = await publicClient.estimateContractGas({
          address: runtimeAddress,
          abi: DONATION_SPLITTER_ABI,
            functionName: 'donateETH',
          value: valueWei,
          account: address as `0x${string}` | undefined,
        }).catch(()=>undefined);
        if (cancelled) return;
        if (est) setEstGasUnits(Number(est));
      } catch (err) {
        if (!cancelled) setGasError((err as Error).message);
      } finally {
        if (!cancelled) setGasEstimating(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [publicClient, runtimeAddress, address, numericAmount, chainId]);

  // Efecto: fetch precio ETH/USD simple (CoinGecko) cada 60s
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const json = await res.json();
        if (cancelled) return;
        const v = json?.ethereum?.usd;
        if (typeof v === 'number') { setEthUsd(v); setPriceError(false); } else { setPriceError(true); }
      } catch { if (!cancelled) setPriceError(true); }
    }
    load();
    const id = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // activeChain / isMainnet / mismatch already defined above for early gating
    // truncateAddress eliminado: AddressChip encapsula truncado y copia

    // Contract write hooks
  const { donateETH } = useDonateETH();
    const { withdrawETH, isPending: isWithdrawing } = useWithdrawETH();
  // Read contract owner
  const { data: ownerAddress } = useReadContract({
    address: runtimeAddress,
    abi: DONATION_SPLITTER_ABI,
    functionName: 'owner',
    query: { enabled: !!runtimeAddress }
  });
  // Read beneficiaries list (addresses only)
  const { data: beneficiariesListData } = useReadContract({
    address: runtimeAddress,
    abi: DONATION_SPLITTER_ABI,
    functionName: 'beneficiariesList',
    query: { enabled: !!runtimeAddress }
  });
  let beneficiaryAddresses: string[] = [];
  if (Array.isArray(beneficiariesListData) && beneficiariesListData.length === 2 && Array.isArray(beneficiariesListData[0])) {
    beneficiaryAddresses = (beneficiariesListData as unknown as [string[], number[]])[0].map(a => a.toLowerCase());
  }
  const lowerAddr = address?.toLowerCase();
  const isOwner = !!ownerAddress && lowerAddr === (ownerAddress as string).toLowerCase();
  const isBeneficiary = !!lowerAddr && beneficiaryAddresses.includes(lowerAddr);
  const role: 'owner' | 'beneficiary' | 'donor' | 'unauth' = !isConnected ? 'unauth' : isOwner ? 'owner' : isBeneficiary ? 'beneficiary' : 'donor';

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
        <div style={{ marginLeft:'auto', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'.35rem' }}>
          {!isConnected && (
            <>
              <button
                className="btn primary"
                disabled={isConnecting}
                onClick={() => connect({ connector: metaMask() })}
              >{isConnecting ? 'Connecting...' : 'Connect Wallet'}</button>
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize:'.6rem', textDecoration:'none', color:'var(--accent)', opacity:.85, fontWeight:500 }}
              >Get MetaMask</a>
            </>
          )}
          {isConnected && (
            <button
              className="btn primary"
              style={{ padding:'.7rem 1.15rem', fontWeight:600 }}
              onClick={()=> disconnect()}
            >Disconnect</button>
          )}
        </div>
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
                    setLastDonateTx(tx);
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
        {isConnected && ready && !providerAvailable && !mismatch && (
          <div className="card" style={{ marginBottom:'1rem', border:'1px solid rgba(255,170,0,0.35)', background:'rgba(255,170,0,0.08)' }}>
            <div style={{ fontSize:'.65rem', lineHeight:1.4 }}>
              Wallet session detected but no injected provider (mobile Safari / iOS?). Open this dApp inside MetaMask browser or return after approving the connection. Session will reset if provider is still absent.
            </div>
          </div>
        )}
        {isConnected && (
          <div className="card beneficiaries-card" style={{ marginBottom: '1.5rem' }}>
            <BeneficiariesCard />
          </div>
        )}
        {isConnected && (
          <TabbedPanels>
            <div data-tab="Wallet" className="card wallet-panel">
              <div className="card-header-row" style={{ alignItems:'flex-start' }}>
                <h2 style={{ margin:0 }}>Wallet</h2>
              </div>
              <div style={{ display:'grid', gap:'1.1rem' }}>
                <section style={{ display:'grid', gap:'.4rem' }}>
                  <div style={{ display:'flex', gap:'1.4rem', flexWrap:'wrap' }}>
                    <div style={{ flex:'1 1 280px', display:'grid', gap:'.55rem', minWidth:250 }}>
                      <div className="kv-row" style={{ justifyContent:'space-between', flexWrap:'wrap', gap:'.5rem' }}>
                        <span className="kv-label">Account</span>
                        <div style={{ display:'flex', alignItems:'center', gap:'.5rem', flexWrap:'wrap' }}>
                          <AddressChip
                            label="ADDR"
                            address={address || ''}
                            explorerHref={address ? makeAddressLink(activeChain?.id || TARGET_CHAIN_ID, address) : undefined}
                          />
                          {activeChain && (
                            <span className={isMainnet ? 'badge badge-main' : 'badge badge-test'} style={{ padding:'.3rem .6rem' }}>
                              {isMainnet ? '🛡 ' + activeChain.name : '🧪 ' + activeChain.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="kv-row"><span className="kv-label">Balance</span><span className="mono">{userBalance ? `${(Number(userBalance.value)/1e18).toFixed(4)} ${userBalance.symbol}` : (<span style={{ display:'inline-block', width:90 }} className="skeleton skeleton-sm" />)}</span></div>
                    </div>
                    <div aria-hidden="true" style={{ width:'1px', background:'linear-gradient(180deg,rgba(255,255,255,0.15),rgba(255,255,255,0.05))', alignSelf:'stretch', borderRadius:'1px', flex:'0 0 1px' }} />
                    <div style={{ flex:'1 1 320px', display:'grid', gap:'.65rem', minWidth:260 }}>
                      <div className="kv-row" style={{ alignItems:'flex-start', flexDirection:'column', gap:'.5rem' }}>
                        <div style={{ display:'flex', width:'100%', alignItems:'center', gap:'.6rem', flexWrap:'wrap', justifyContent:'space-between' }}>
                          <span className="kv-label">Contract</span>
                          <div style={{ display:'flex', alignItems:'center', gap:'.55rem', flexWrap:'wrap', justifyContent:'flex-end' }}>
                            <span className={`role-chip ${role}`}>{role.toUpperCase()}</span>
                            <AddressChip
                              label="ADDR"
                              address={runtimeAddress}
                              explorerHref={makeAddressLink(activeChain?.id || TARGET_CHAIN_ID, runtimeAddress)}
                            />
                            {hasBlockscout(activeChain?.id || TARGET_CHAIN_ID) && (
                              <span className="badge-unverified" style={{ fontSize:'.5rem', padding:'.28rem .5rem' }}>Unverified</span>
                            )}
                            {activeChain && (
                              <span className={isMainnet ? 'badge badge-main' : 'badge badge-test'} style={{ padding:'.3rem .55rem' }}>
                                {isMainnet ? '🛡 ' + activeChain.name : '🧪 ' + activeChain.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="kv-row" style={{ gap:'.75rem', flexWrap:'wrap' }}>
                        {/* Fila Role/Copy eliminada: el chip de rol ya aparece junto a Contract y la dirección se mostrará como AddressChip */}
                      </div>
                    </div>
                  </div>
                </section>
                <section style={{ marginTop:'.2rem' }}>
                  {mismatch && <div className="alert" style={{ margin:0 }}>Network mismatch: data from {TARGET_CHAIN_LABEL}.</div>}
                  {isMainnet && !mismatch && <div className="alert" style={{ marginTop:'.4rem' }}>MAINNET: check amounts.</div>}
                  {/* Nota test eliminada (chip ya comunica estado). */}
                </section>
                {/* Botón Disconnect movido a barra de pestañas */}
              </div>
            </div>
            {/* Donate Panel */}
            {(role === 'owner' || role === 'donor' || role === 'beneficiary') && (
              <div data-tab="Donate" className="card">
              <h2>Donate ETH</h2>
              <p style={{ margin:'0 0 .4rem', fontSize:'.62rem', lineHeight:1.35, opacity:.85 }}>
                Send ETH once; the contract allocates shares automatically. Beneficiaries later withdraw only their accrued portion.
                <button type="button" onClick={()=>setHowOpen(true)} style={{ marginLeft:'.4rem', fontSize:'.6rem' }} className="btn ghost sm">How it works</button>
              </p>
              {/* Explorer line removed as per design refinement */}
              {mismatch && (
                <div className="alert" style={{ marginTop: '.3rem' }}>
                  Wallet {activeChain?.name} (id {activeChain?.id}) ≠ target {TARGET_CHAIN_LABEL} (id {TARGET_CHAIN_ID}). Read‑only mode until you switch.
                </div>
              )}
              {isConnected && ready && !providerAvailable && !mismatch && (
                <div className="alert" style={{ marginTop: '.3rem' }}>
                  No injected provider available (mobile). Donation disabled until provider appears.
                </div>
              )}
              <form className="donate-form inline-layout"
                onSubmit={async e => {
                  e.preventDefault();
                  setDonateError(null);
                  try {
                    if (exceedsBalance) {
                      setDonateError('Amount exceeds wallet balance');
                      return;
                    }
                    if (isMainnet && !showMainnetConfirm) {
                      // Trigger confirm modal first
                      setShowMainnetConfirm(true);
                      return;
                    }
                    const value = ethAmount && !isNaN(Number(ethAmount)) ? BigInt(Math.floor(Number(ethAmount.toString()) * 1e18)) : undefined;
                    if (!value) throw new Error('Invalid amount');
                    const tx = await donateETH(value);
                    setLastDonateTx(tx);
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
                  {/* Valor USD (solo lectura) */}
                  <div style={{ display:'flex', alignItems:'center', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.22)', padding:'.55rem .75rem', borderRadius:8, fontSize:'.68rem', fontFamily:'JetBrains Mono, monospace', fontWeight:500, letterSpacing:'.5px', boxShadow:'0 1px 2px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04) inset', minHeight:'42px' }} title={ethUsd ? 'Conversión aproximada USD' : 'Esperando precio USD'}>
                    {ethAmount && !isNaN(numericAmount) && numericAmount>0 && ethUsd ? (
                      '≈ $' + (numericAmount*ethUsd).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})
                    ) : (
                      <span style={{ opacity:.4 }}>≈ $0.00</span>
                    )}
                  </div>
                  <button type="button" className="btn ghost sm" style={{ fontSize:'.6rem', padding:'.55rem .75rem', minHeight:'42px', display:'inline-flex', alignItems:'center' }} onClick={fillMax} disabled={!walletEth || walletEth <= gasBufferEth}>Max</button>
                  <button className="btn donate-compact" type="submit" disabled={exceedsBalance || mismatch || (isConnected && ready && !providerAvailable)} style={{ padding:'.55rem 1.0rem', fontSize:'.78rem', fontWeight:600, whiteSpace:'nowrap', opacity: exceedsBalance ? .55 : 1, minHeight:'42px', display:'inline-flex', alignItems:'center' }}>Donate</button>
                </div>
              </form>
              {/* (Total USD ahora se muestra inline en el propio row del formulario) */}
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
                    <span style={{ opacity:.7 }} title={`Gas est. ~${usedGasUnits.toLocaleString()} u${gasPriceWei ? ' · gasPrice ' + gasPriceGwei.toFixed(2) + ' gwei' : ' (fallback)'} · ${(gasCostEth).toFixed(6)} ETH${ethUsd ? ' ($' + (gasCostEth * ethUsd).toFixed(4) + ')' : ''}`}>Bal: {walletEth.toFixed(4)} ETH</span>
                  </div>
                  {(() => {
                    let bg = 'linear-gradient(90deg,#2ecc71,#27ae60)';
                    if (pctUsage >= THRESH_WARN && pctUsage < THRESH_DANGER) bg = 'linear-gradient(90deg,#f1c40f,#f39c12)';
                    if (pctUsage >= THRESH_DANGER) bg = 'linear-gradient(90deg,#e74c3c,#c0392b)';
                    const width = Math.min(100, pctUsage);
                    return (
                      <div style={{ position:'relative', height:6, background:'rgba(255,255,255,0.08)', borderRadius:4, overflow:'hidden', boxShadow:'0 0 0 1px rgba(255,255,255,0.08) inset' }} aria-label={`Using ${pctUsage.toFixed(2)}% of wallet balance`} title={`Est. gas ${(gasCostEth).toFixed(6)} ETH${ethUsd ? ' ($' + (gasCostEth*ethUsd).toFixed(4) + ')' : ''} · Máx seguro ~${effectiveMaxSendEth.toFixed(6)} ETH${ethUsd ? ' ($' + (effectiveMaxSendEth*ethUsd).toFixed(2) + ')' : ''}`}>
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
                <span style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)', padding:'.28rem .5rem', borderRadius:6 }} title={gasError ? gasError : gasEstimating ? 'Estimating gas…' : `Gas units ~${usedGasUnits.toLocaleString()} · Cost ${(gasCostEth).toFixed(6)} ETH${ethUsd ? ' ($' + (gasCostEth*ethUsd).toFixed(4) + ')' : ''}`}>Gas: {gasEstimating ? '…' : (gasCostEth).toFixed(6)} ETH{ethUsd && !gasEstimating && <span style={{ opacity:.8 }}> (${(gasCostEth*ethUsd).toFixed(4)})</span>}</span>
                <span style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)', padding:'.28rem .55rem', borderRadius:6 }} title={`Máx seguro (balance - gas): ~${effectiveMaxSendEth.toFixed(6)} ETH${ethUsd ? ' ($' + (effectiveMaxSendEth*ethUsd).toFixed(2) + ')' : ''}`}>Max send ≈ {effectiveMaxSendEth.toFixed(6)} ETH</span>
              </div>
              {exceedsBalance && (
                <div className="alert" style={{ marginTop:'.45rem' }}>
                  Amount entered ({numericAmount.toFixed(6)} ETH) is greater than your wallet balance ({walletEth.toFixed(6)} ETH).
                </div>
              )}
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
              {isConnected && ready && !providerAvailable && !mismatch && <p className="note" style={{ marginTop: '.5rem' }}>Provider not detected. Re-open in MetaMask browser or refresh after returning from app switch.</p>}
            </div>
            )}
            {/* Withdraw Panel */}
            {(role === 'beneficiary' || (role === 'owner' && isBeneficiary)) && (
              <div data-tab="Withdraw" className="card">
              <h2>Withdrawals</h2>
              {hasBlockscout(activeChain?.id || TARGET_CHAIN_ID) && (
                <div className="explorer-bar" style={{ marginBottom:'.55rem' }}>
                  <span className="label">Explorer</span>
                  <a href={blockscoutAddressUrl(activeChain?.id || TARGET_CHAIN_ID, runtimeAddress)} target="_blank" rel="noopener noreferrer">Contract ↗</a>
                  {lastDonateTx && <TxHashChip label="Donate" hash={lastDonateTx!} url={blockscoutTxUrl(activeChain?.id || TARGET_CHAIN_ID, lastDonateTx!) || '#'} />}
                  {lastWithdrawTx && <TxHashChip label="Withdraw" hash={lastWithdrawTx!} url={blockscoutTxUrl(activeChain?.id || TARGET_CHAIN_ID, lastWithdrawTx!) || '#'} />}
                </div>
              )}
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
                        setLastWithdrawTx(tx);
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
            )}
          </TabbedPanels>
        )}
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
      </section>
      <footer className="app-footer">DonationSplitter · Experimental UI · {new Date().getFullYear()}</footer>
    </div>
  );
}

export default App;

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

// Beneficiaries list card
function BeneficiariesCard() {
  const total = beneficiariesTotalBps();
  // Use shared effective chain hook (eliminates duplicated provider chain listener logic)
  const { walletChainId, providerChainId, effectiveChainId } = useEffectiveChain();
  const chainInfo = walletChainId ? getChainInfo(walletChainId) : undefined;
  const walletEffectiveInfo = effectiveChainId ? getChainInfo(effectiveChainId) : undefined;
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
          </div>
        </div>
        {/* Line 2: Legend + stats + theme (aligned to left, normal card padding) */}
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
  // Always anchor reads to the configured TARGET chain (dashboard invariant),
  // independent of the wallet network to avoid state flicker / zeroing when user switches chains.
  const runtimeAddress = getDonationSplitterAddress(CONFIG_TARGET_CHAIN_ID);
  // Build read contracts for each beneficiary using the fixed dashboard target chain.
  const contracts = BENEFICIARIES.map(b => ({
    address: runtimeAddress,
    abi: DONATION_SPLITTER_ABI,
    functionName: 'beneficiaryTotals',
    args: [b.address] as const,
    chainId: CONFIG_TARGET_CHAIN_ID,
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

// Tx hash chip component (copy + explorer link)
interface TxHashChipProps { label: string; hash: string; url: string }
function TxHashChip({ label, hash, url }: TxHashChipProps) {
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
      <button type="button" onClick={copy} style={{ all:'unset', cursor:'pointer', fontWeight:600, letterSpacing:'.5px' }}>{label}</button>
      <a href={url} target="_blank" rel="noopener noreferrer" className="mono" style={{ textDecoration:'none', fontWeight:500 }}>{short} ↗</a>
    </span>
  );
}

// AddressChip reutilizable (copia al click, muestra hash truncado y opcional enlace explorer separado con flecha)
interface AddressChipProps { address: string; label?: string; explorerHref?: string; className?: string }
function AddressChip({ address, label='ADDR', explorerHref, className }: AddressChipProps) {
  const [copied, setCopied] = useState(false);
  if (!address) return <span style={{ opacity:.4, fontSize:'.55rem' }}>—</span>;
  const truncated = address.slice(0,6) + '...' + address.slice(-4);
  function copy() {
    navigator.clipboard.writeText(address).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false), 1400); }).catch(()=>{});
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

// Simple tabbed panels container
interface TabbedPanelsProps { children: React.ReactNode; actionsRight?: React.ReactNode }
type TabPaneElement = React.ReactElement<{ ['data-tab']?: string }>;
function hasDataTab(el: unknown): el is TabPaneElement {
  return React.isValidElement(el) && typeof (el.props as Record<string, unknown>)['data-tab'] === 'string';
}
function TabbedPanels({ children, actionsRight }: TabbedPanelsProps) {
  const raw = React.Children.toArray(children);
  const panes = raw.filter(hasDataTab);
  const tabNames = panes.map(p => p.props['data-tab'] || 'Tab');
  const [active, setActive] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ds_active_tab');
      if (stored && tabNames.includes(stored)) return stored;
    }
    return tabNames[0] || 'Tab';
  });
  // Ajustar si desaparece pestaña activa
  React.useEffect(() => {
    if (tabNames.length && !tabNames.includes(active)) setActive(tabNames[0]);
  }, [active, tabNames]);
  React.useEffect(() => {
    try { localStorage.setItem('ds_active_tab', active); } catch { /* ignore */ }
  }, [active]);
  if (!panes.length) return null;
  return (
    <div className="tabs-wrapper">
      <div className="tabs-nav" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.75rem', flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'.4rem', flexWrap:'wrap' }}>
          {tabNames.map(tab => (
            <button key={tab} type="button" className={`tab-btn ${tab === active ? 'active' : ''}`} onClick={() => setActive(tab)}>{tab}</button>
          ))}
        </div>
        {actionsRight && (
          <div className="tabs-actions" style={{ display:'flex', alignItems:'center', gap:'.5rem' }}>
            {actionsRight}
          </div>
        )}
      </div>
      <div className="tabs-content">
        {panes.filter(p => (p.props['data-tab'] || 'Tab') === active)}
      </div>
    </div>
  );
}
