import { useState, useEffect } from 'react';
import { useBalance, usePublicClient } from 'wagmi';
import type { Chain } from 'viem';
import { DONATION_SPLITTER_ABI } from '../../config/contractInfo';
import { BENEFICIARIES } from '../../config/beneficiaries';
import { useDonateETH } from '../../hooks/contractWriteHooks';
import { useLitEncryptDonorData } from '../../hooks/useLitEncryptDonorData';
import { DONATION_SPLITTER_ADDRESS } from '../../config/contractInfo';


interface DonatePanelProps {
  address: string | undefined;
  activeChain: Chain | undefined;
  chainId: number;
  runtimeAddress: string;
  mismatch: boolean;
  ready: boolean;
  providerAvailable: boolean;
  isMainnet: boolean;
  onDonationSuccess: () => void;
  setShowMainnetConfirm: (show: boolean) => void;
  showMainnetConfirm: boolean;
  ownerAddress: string; // NEW: owner address
  [key: string]: unknown;
}

export function DonatePanel({
  address,
  chainId,
  runtimeAddress,
  mismatch,
  ready,
  providerAvailable,
  isMainnet,
  setShowMainnetConfirm,
  showMainnetConfirm,
  onDonationSuccess,
  ownerAddress,
}: DonatePanelProps) {
  const [ethAmount, setEthAmount] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donateError, setDonateError] = useState<string | null>(null);
  const [estGasUnits, setEstGasUnits] = useState<number|undefined>();
  const [gasPriceWei, setGasPriceWei] = useState<bigint|undefined>();
  const [ethUsd, setEthUsd] = useState<number|undefined>();
  const publicClient = usePublicClient();
  const { donateETH, isPending } = useDonateETH();
  // Use ownerAddress received via prop
  const encryptDonorDataWithLit = useLitEncryptDonorData(DONATION_SPLITTER_ADDRESS, ownerAddress);
  const { data: userBalance } = useBalance({
    address: address as `0x${string}` | undefined,
    query: { enabled: !!address, refetchInterval: 5000 },
  });
  const numericAmount = Number(ethAmount);
  const walletEth = userBalance ? Number(userBalance.value) / 1e18 : 0;
  const gasBufferEth = 0.0005;
  const fallbackGasUnits = 55000;
  const fallbackGasPriceGwei = 5;
  const usedGasUnits = estGasUnits ?? fallbackGasUnits;
  const gasPriceGwei = gasPriceWei ? Number(gasPriceWei) / 1e9 : fallbackGasPriceGwei;
  const gasCostEth = (usedGasUnits * gasPriceGwei) / 1e9 / 1e9;
  const effectiveMaxSendEth = walletEth > gasCostEth ? walletEth - gasCostEth : 0;
  const exceedsBalance = !!ethAmount && !isNaN(numericAmount) && numericAmount > walletEth + 1e-18;

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
          args: [""], // dummy argument to satisfy typing, adjust if contract requires something else
          value: valueWei,
          account: address as `0x${string}` | undefined,
        }).catch(()=>undefined);
        if (cancelled) return;
        if (est) setEstGasUnits(Number(est));
      } catch (err) {
        if (!cancelled) setDonateError((err as Error).message);
      } finally {
  // removed setGasEstimating
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
        }
      } catch { 
  // Silence USD price error
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
      if (!ethAmount || isNaN(numericAmount) || numericAmount <= 0) {
        setDonateError('Enter a valid amount');
        return;
      }
  // --- Lit+Irys flow: encrypt and upload before donating ---
      const donorData = JSON.stringify({
        donor: address,
        amount: ethAmount,
        timestamp: Date.now(),
        email: donorEmail || undefined
      });
  // Only pass string, never binary
  console.log('[DonatePanel] Donor data to encrypt (string):', donorData, typeof donorData);
      const encryptedResult = await encryptDonorDataWithLit(donorData);
  console.log('[DonatePanel] Encrypted result from Lit+Irys:', encryptedResult);
      const { uri } = encryptedResult;
  // Original call to donateETH, now with uri
      const value = BigInt(Math.floor(numericAmount * 1e18));
  console.log('[DonatePanel] Calling donateETH with:', { uri, value });
      await donateETH(uri, value);
  setEthAmount('');
  setDonorEmail('');
      if (typeof onDonationSuccess === 'function') onDonationSuccess();
    } catch (err) {
  console.error('[DonatePanel] Error in donation flow:', err);
      setDonateError((err as Error).message);
    }
  };

  // USD calculation
  const amountUsd = ethAmount && !isNaN(numericAmount) && ethUsd ? (numericAmount * ethUsd).toFixed(2) : '0.00';
  return (
    <div className="card">
  <form className="donate-form inline-layout" onSubmit={handleSubmit} autoComplete="off">
        <div style={{ width: '100%', marginBottom: '.7rem' }}>
          <label htmlFor="donor-email" style={{ fontSize: '.92rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '.18rem', display: 'block' }}>Email (optional)</label>
          <input
            id="donor-email"
            type="email"
            placeholder="Enter your email address to receive a private thank you note."
            value={donorEmail}
            onChange={e => setDonorEmail(e.target.value)}
            style={{
              width: '100%',
              fontSize: '.98rem',
              padding: '.55rem .9rem',
              borderRadius: '8px',
              border: '1px solid #2ecc71',
              background: 'rgba(46,204,113,0.07)',
              color: 'var(--text-primary)',
              marginBottom: '.08rem',
              fontFamily: 'JetBrains Mono, monospace',
              boxSizing: 'border-box'
            }}
            inputMode="email"
            className="mono"
            disabled={isPending}
          />
        </div>
        <div className="donate-input-wrap" style={{ display: 'flex', gap: '.45rem', alignItems: 'center', width: '100%' }}>
          <input
            type="number"
            min="0"
            step="any"
            placeholder="Amount in ETH"
            value={ethAmount}
            onChange={e => setEthAmount(e.target.value)}
            required
            style={{ flex: 1, minWidth: 0, maxWidth: '100%' }}
            inputMode="decimal"
            className="mono"
            disabled={isPending}
          />
          <span
            className="badge"
            style={{
              fontSize: '.68rem',
              background: 'rgba(255,255,255,0.07)',
              color: 'var(--text-secondary)',
              border: '1px solid rgba(255,255,255,0.18)',
              fontWeight: 500,
              pointerEvents: 'none',
              userSelect: 'none',
              minWidth: 48,
              maxWidth: 70,
              textAlign: 'center',
              padding: '.55rem .55rem',
              borderRadius: '999px',
              letterSpacing: '.4px',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              marginLeft: '.08rem'
            }}
          >
            ≈ ${amountUsd}
          </span>
          <button
            type="button"
            className="btn ghost sm"
            style={{ fontSize: '.6rem', padding: '.55rem .75rem', minHeight: '42px', display: 'inline-flex', alignItems: 'center' }}
            onClick={fillMax}
            disabled={!walletEth || walletEth <= gasBufferEth}
          >
            Max
          </button>
          <button className="btn donate-compact" type="submit" disabled={exceedsBalance || mismatch || (ready && !providerAvailable) || isPending} style={{ padding: '.55rem 1.0rem', fontSize: '.78rem', fontWeight: 600, whiteSpace: 'nowrap', opacity: exceedsBalance ? .55 : 1, minHeight: '42px', display: 'inline-flex', alignItems: 'center' }}>
            {isPending ? 'Donating…' : 'Donate'}
          </button>
        </div>
        {/* Indicadores de porcentaje y balance */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '.65rem', color: 'var(--text-secondary)', marginTop: '0', marginBottom: '0', fontWeight: 600 }}>
          <span>Usage: {walletEth > 0 && ethAmount && !isNaN(numericAmount) && numericAmount > 0 ? `${Math.min(100, ((numericAmount / walletEth) * 100)).toFixed(2)}%` : '0%'}</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>Bal: {walletEth.toFixed(6)} ETH</span>
        </div>
        {/* Barra de porcentaje donado */}
        <div style={{ width: '100%', marginTop: '0', marginBottom: '0', height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
          <div
            style={{
              width: walletEth > 0 && ethAmount && !isNaN(numericAmount) && numericAmount > 0 ? `${Math.min(100, (numericAmount / walletEth) * 100)}%` : '0%',
              height: '100%',
              background: 'linear-gradient(90deg,#2ecc71,#27ae60)',
              transition: 'width 0.3s',
            }}
          />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.28rem', marginTop: '.06rem', alignItems: 'center' }}>
          <span className="badge" style={{ fontSize: '.58rem', padding: '.22rem .45rem', background: 'linear-gradient(135deg,#2b2f3b,#1d2028)', color: 'var(--text-secondary)' }}>
            Gas: {gasCostEth.toFixed(6)} ETH{ethUsd && <> (${(gasCostEth*ethUsd).toFixed(4)})</>}
          </span>
          <span className="badge" style={{ fontSize: '.58rem', padding: '.22rem .45rem', background: 'linear-gradient(135deg,#2b2f3b,#1d2028)', color: 'var(--text-secondary)' }}>
            Max send ≈ {effectiveMaxSendEth.toFixed(6)} ETH
          </span>
        </div>
        {donateError && <div className="alert" style={{ marginTop: '.7rem' }}>{donateError}</div>}
      </form>
      {/* Preview Split - Off-chain estimation */}
      {ethAmount && !isNaN(numericAmount) && numericAmount > 0 && Array.isArray(BENEFICIARIES) && BENEFICIARIES.length > 0 && (
        <div className="card" style={{ marginTop: '1.1rem', marginBottom: '.7rem', background: 'rgba(46,204,113,0.07)', border: '1px solid rgba(46,204,113,0.18)', borderRadius: 12, padding: '1.1rem 1.2rem' }}>
          <div style={{ fontWeight: 700, fontSize: '.98rem', marginBottom: '.7rem', color: '#2ecc71', letterSpacing: '.2px' }}>
            Preview Split <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '.92em' }}>(off-chain estimation)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.7rem' }}>
            {BENEFICIARIES.map((b: any) => (
              <div key={b.address} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(46,204,113,0.13)', borderRadius: 8, padding: '.7rem .8rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '.2rem' }}>
                <div style={{ fontWeight: 600, fontSize: '.93em', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
                  {b.logoSrc ? (
                    <img src={b.logoSrc} alt={b.label} style={{ width: 22, height: 22, marginRight: '.4em', borderRadius: 4, background: '#fff', objectFit: 'contain', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }} />
                  ) : b.icon ? (
                    <span style={{ marginRight: '.4em' }}>{b.icon}</span>
                  ) : null}
                  {b.label}
                </div>
                <div style={{ fontSize: '.82em', color: 'var(--text-secondary)' }}>{(b.bps / 100).toFixed(2)}%</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#27ae60', fontSize: '.98em' }}>
                  +{((numericAmount * b.bps) / 10000).toFixed(6)} ETH
                  {ethUsd && <span style={{ fontSize: '.82em', color: 'var(--text-secondary)', marginLeft: 6 }}> (${((numericAmount * b.bps) / 10000 * ethUsd).toFixed(2)})</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

