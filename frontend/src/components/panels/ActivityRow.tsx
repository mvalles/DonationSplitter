import { useState } from 'react';
import { blockscoutTxUrl, blockscoutAddressUrl } from '../../services/blockscout';
import { useLitDecryptDonorData } from '../../hooks/useLitDecryptDonorData';


interface ActivityRowProps {
  ev: any;
  chainId: number;
  contractAddress: string;
  ownerAddress: string;
}

export function ActivityRow({ ev, chainId, contractAddress, ownerAddress }: ActivityRowProps) {
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string|null>(null);
  const decryptDonorData = useLitDecryptDonorData(contractAddress, ownerAddress);

  const explorer = blockscoutTxUrl(chainId, ev.txHash);
  const addrExplorer = blockscoutAddressUrl(chainId, ev.address);
  const roleLabel = ev.type === 'donate' ? 'DONOR' : 'BENEFICIARY';
  const irysUrl = ev.uri ? `https://gateway.irys.xyz/${ev.uri}` : null;

  async function handleDecryptEmail() {
    setLoading(true);
    setError(null);
    try {
      // Recuperar el payload cifrado desde Irys usando el uri
      if (ev.type === 'donate' && ev.uri && ownerAddress) {
        const res = await fetch(`https://gateway.irys.xyz/${ev.uri}`);
        if (!res.ok) throw new Error('Failed to fetch encrypted donor data');
        const payload = await res.json();
        if (!payload.ciphertext || !payload.symmetricKey) throw new Error('Invalid encrypted donor data');
        const result = await decryptDonorData({ ciphertext: payload.ciphertext, symmetricKey: payload.symmetricKey });
        setEmail(result);
      } else {
        setError('No encrypted donor data available');
      }
    } catch (e:any) {
      setError(e.message || 'Error decrypting email');
    } finally {
      setLoading(false);
    }
  }

  // Solo el owner puede descifrar el email
  // Solo el owner puede descifrar el email
  let selectedAddress = '';
  if (window?.ethereum?.selectedAddress) {
    selectedAddress = window.ethereum.selectedAddress.toLowerCase();
  } else if (window?.ethereum?.accounts && window.ethereum.accounts[0]) {
    selectedAddress = window.ethereum.accounts[0].toLowerCase();
  }
  const isOwner = ownerAddress && selectedAddress === ownerAddress.toLowerCase();
  return (
    <div
      key={ev.id}
      style={{
        display: 'grid',
          gridTemplateColumns: '100px 80px 80px 160px 100px 1fr 180px',
        alignItems: 'center',
        gap: '.4rem',
        padding: '.4rem .4rem',
        background: 'transparent',
        border: 'none',
        borderRadius: 0,
        fontSize: '.52rem',
        minHeight: '28px',
        overflowX: 'hidden',
      }}
    >
      <span
        className={`activity-type-chip ${ev.type}`}
        style={{
          display: 'inline-block',
          background: ev.type === 'donate' ? '#e0f7fa' : '#ffe0e0',
          color: ev.type === 'donate' ? '#00796b' : '#c62828',
          borderRadius: 8,
          padding: '.18rem .7rem',
          fontWeight: 600,
          fontSize: '.52rem',
          minWidth: '90px',
          maxWidth: '110px',
          textAlign: 'center',
          letterSpacing: '.5px',
          whiteSpace: 'nowrap',
        }}
      >
        {ev.type === 'donate' ? '💰 DONATE' : '💸 WITHDRAW'}
      </span>
      <span className="mono" style={{ textAlign: 'left', minWidth: '45px', marginRight: '6px', marginLeft: '4px', whiteSpace: 'nowrap' }}>
        {ev.amountEth.toFixed(6)} ETH
      </span>
  <span className={`role-chip ${ev.type === 'donate' ? 'donor' : 'beneficiary'}`} style={{ fontSize: '.45rem', padding: '.12rem .5rem', minWidth: '90px', maxWidth: '110px', textAlign: 'center', display: 'inline-block', borderRadius: '8px', fontWeight: 500, marginLeft: '26px', whiteSpace: 'nowrap' }}>
        {roleLabel}
      </span>
  {addrExplorer ? (
  <a href={addrExplorer} target="_blank" rel="noopener noreferrer" className="addr-link mono" style={{ textDecoration: 'none', color: 'var(--accent)', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '340px', display: 'inline-flex', alignItems: 'center', marginLeft: '48px' }}>
      <span style={{ flexShrink: 0 }}>{ev.address.slice(0, 6)}...{ev.address.slice(-4)}</span>
      <span style={{ marginLeft: 2, flexShrink: 0 }}>↗</span>
    </a>
  ) : (
  <span className="mono" style={{ opacity: .6, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '340px', display: 'inline-flex', alignItems: 'center', marginLeft: '24px' }}>
      <span style={{ flexShrink: 0 }}>{ev.address.slice(0, 6)}...{ev.address.slice(-4)}</span>
    </span>
  )}
      {irysUrl ? (
  <a href={irysUrl} target="_blank" rel="noopener noreferrer" className="tx-link mono" style={{ textDecoration: 'none', color: '#ffb300', fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '340px', display: 'inline-flex', alignItems: 'center', marginLeft: '24px' }}>
          <span style={{ flexShrink: 0 }}>Irys</span>
          <span style={{ marginLeft: 2, flexShrink: 0 }}>↗</span>
        </a>
      ) : explorer ? (
  <a href={explorer} target="_blank" rel="noopener noreferrer" className="tx-link mono" style={{ textDecoration: 'none', color: 'var(--accent-alt)', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '340px', display: 'inline-flex', alignItems: 'center', marginLeft: '24px' }}>
          <span style={{ flexShrink: 0 }}>{ev.txHash.slice(0, 6)}...{ev.txHash.slice(-4)}</span>
          <span style={{ marginLeft: 2, flexShrink: 0 }}>↗</span>
        </a>
      ) : (
  <span className="mono" style={{ opacity: .6, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '340px', display: 'inline-flex', alignItems: 'center', marginLeft: '24px' }}>
          <span style={{ flexShrink: 0 }}>{ev.txHash.slice(0, 6)}...{ev.txHash.slice(-4)}</span>
        </span>
      )}
      {/* Email only visible for contract owner */}
      {isOwner && ev.type === 'donate' && ev.uri && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', minWidth: 0, width: '100%', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn ghost sm"
            style={{ minWidth: '120px', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            onClick={handleDecryptEmail}
            disabled={loading}
          >
            {loading ? 'Decrypting...' : email ? `Email: ${email}` : 'Show donor email'}
          </button>
          {error && <span style={{ color: '#e74c3c', fontSize: '.52rem', minWidth: 0 }}>{error}</span>}
        </div>
      )}
      {ev.type === 'withdraw' && (
        <span style={{ opacity: .5, fontSize: '.5rem', minWidth: 'fit-content', textAlign: 'right', whiteSpace: 'nowrap', gridColumn: '8' }}>{timeAgo(ev.timestamp * 1000)}</span>
      )}
      {ev.type === 'donate' && (
        <span style={{ opacity: .5, fontSize: '.5rem', minWidth: 'fit-content', textAlign: 'right', whiteSpace: 'nowrap' }}>{timeAgo(ev.timestamp * 1000)}</span>
      )}
    </div>
  );
}

function timeAgo(tsMs: number) {
  const diff = Date.now() - tsMs;
  const s = Math.floor(diff / 1000);
  if (s < 60) return s + 's ago';
  const m = Math.floor(s / 60); if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24); return d + 'd ago';
}
