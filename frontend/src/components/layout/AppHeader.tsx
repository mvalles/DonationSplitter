import { useConnect, useDisconnect } from 'wagmi';
import { metaMask } from 'wagmi/connectors';
import DonationSplitArt from '../ui/DonationSplitArt';

interface AppHeaderProps {
  isConnected: boolean;
  isConnecting: boolean;
}

export function AppHeader({ isConnected, isConnecting }: AppHeaderProps) {
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <header 
      className="hero-compact" 
      style={{ 
        position: 'relative', 
        display: 'flex', 
        alignItems: 'flex-start', 
        gap: '1.75rem', 
        paddingBottom: '.5rem', 
        borderBottom: '1px solid rgba(255,255,255,0.08)', 
        flexWrap: 'wrap' 
      }}
    >
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
        <div style={{ 
          width: 178, 
          minWidth: 178, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '.15rem 0', 
          transform: 'translateY(2px)' 
        }}>
          <DonationSplitArt animate={true} size={178} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.55rem', paddingTop: '.25rem' }}>
          <h1 className="hero-title" style={{ 
            margin: 0, 
            fontSize: 'clamp(1.95rem,3.2vw,2.7rem)', 
            textAlign: 'left' 
          }}>
            Donation Splitter
          </h1>
          <div className="model-badge" style={{ alignSelf: 'flex-start' }}>
            <strong>Humanitarian</strong> Basic Model
          </div>
          <p className="hero-subtitle" style={{ 
            textAlign: 'left', 
            margin: '0', 
            maxWidth: 620, 
            fontSize: '.9rem' 
          }}>
            Automatically split your contributions across multiple beneficiaries transparently & verifiably on-chain.
          </p>
        </div>
      </div>
      
      <div style={{ 
        marginLeft: 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'flex-end', 
        gap: '.35rem' 
      }}>
        {!isConnected && (
          <>
            <button
              className="btn primary"
              disabled={isConnecting}
              onClick={() => connect({ connector: metaMask() })}
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ 
                fontSize: '.6rem', 
                textDecoration: 'none', 
                color: 'var(--accent)', 
                opacity: .85, 
                fontWeight: 500 
              }}
            >
              Get MetaMask
            </a>
          </>
        )}
        {isConnected && (
          <button
            className="btn primary"
            style={{ padding: '.7rem 1.15rem', fontWeight: 600 }}
            onClick={() => disconnect()}
          >
            Disconnect
          </button>
        )}
      </div>
    </header>
  );
}