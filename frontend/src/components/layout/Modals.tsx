import { DonationAnalytics } from '../analytics/DonationAnalytics';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chainId: number;
  contractAddress: string;
}

export function AnalyticsModal({ isOpen, onClose, chainId, contractAddress }: AnalyticsModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      style={{ 
        position:'fixed', 
        inset:0, 
        background:'rgba(0,0,0,0.6)', 
        zIndex:1600, 
        display:'flex', 
        alignItems:'center', 
        justifyContent:'center', 
        padding:'1rem' 
      }} 
      role="dialog" 
      aria-modal="true" 
      aria-label="Donation Analytics"
    >
      <div className="card" style={{ maxWidth:'min(95vw, 1000px)', maxHeight:'85vh', overflow:'auto', gap:'.9rem', width:'100%' }}>
        <div className="card-header-row">
          <h2 style={{ margin:0 }}>⚡ Analytics</h2>
          <button type="button" className="btn ghost sm" onClick={onClose}>Close</button>
        </div>
        <DonationAnalytics 
          chainId={chainId}
          contractAddress={contractAddress}
        />
      </div>
    </div>
  );
}

interface MainnetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function MainnetConfirmModal({ isOpen, onClose, onConfirm }: MainnetConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      style={{ 
        position:'fixed', 
        inset:0, 
        display:'flex', 
        alignItems:'center', 
        justifyContent:'center', 
        background:'rgba(0,0,0,0.6)', 
        zIndex:1000 
      }}
    >
      <div className="card" style={{ maxWidth:420 }}>
        <h2 style={{ marginTop:0 }}>Mainnet Donation</h2>
        <p style={{ fontSize:'.8rem', lineHeight:1.5 }}>
          You are about to donate on <strong>Ethereum Mainnet</strong>. This will transfer real ETH. Confirm you have verified the contract address and amount.
        </p>
        <div style={{ display:'flex', gap:'.75rem', justifyContent:'flex-end' }}>
          <button className="btn secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" type="button" onClick={onConfirm}>
            Confirm Mainnet Donation
          </button>
        </div>
      </div>
    </div>
  );
}