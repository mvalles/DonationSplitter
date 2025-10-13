import type { Chain } from 'viem';

interface NetworkMismatchAlertProps {
  activeChain: Chain | undefined;
  TARGET_CHAIN_LABEL: string;
  TARGET_CHAIN_ID: number;
}

export function NetworkMismatchAlert({ activeChain, TARGET_CHAIN_LABEL, TARGET_CHAIN_ID }: NetworkMismatchAlertProps) {
  return (
    <div className="card" style={{ marginBottom: '1rem', border:'1px solid rgba(255,170,0,0.35)', background:'rgba(255,170,0,0.10)' }}>
      <div style={{ fontSize:'.65rem', lineHeight:1.4 }}>
        Network mismatch: your wallet is on {activeChain?.name} (id {activeChain?.id}) while the dashboard target is {TARGET_CHAIN_LABEL} (id {TARGET_CHAIN_ID}). Data shown comes from the target chain. Switch networks before sending transactions.
      </div>
    </div>
  );
}

export function ProviderNotAvailableAlert() {
  return (
    <div className="card" style={{ marginBottom:'1rem', border:'1px solid rgba(255,170,0,0.35)', background:'rgba(255,170,0,0.08)' }}>
      <div style={{ fontSize:'.65rem', lineHeight:1.4 }}>
        Wallet session detected but no injected provider (mobile Safari / iOS?). Open this dApp inside MetaMask browser or return after approving the connection. Session will reset if provider is still absent.
      </div>
    </div>
  );
}

export function DisconnectedNotice() {
  return (
    <div style={{ marginTop:'.7rem', fontSize:'.6rem', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)', padding:'.5rem .65rem', borderRadius:'8px', lineHeight:1.3, color:'var(--text-secondary)' }}>
      Public dashboard mode: connect only if you intend to donate or simulate. Aggregated metrics (pending / withdrawn / lifetime) refresh near real-time from on-chain state.
    </div>
  );
}