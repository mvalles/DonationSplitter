import { useBalance } from 'wagmi';
import type { Chain } from 'viem';
import { AddressChip } from '../shared/AddressComponents';
import { makeAddressLink } from '../../utils/chainMeta';
import { hasBlockscout } from '../../services/blockscout';

interface WalletPanelProps {
  address: string | undefined;
  activeChain: Chain | undefined;
  TARGET_CHAIN_ID: number;
  TARGET_CHAIN_LABEL: string;
  runtimeAddress: string;
  role: 'owner' | 'beneficiary' | 'donor' | 'unauth';
  mismatch: boolean;
  isMainnet: boolean;
  [key: string]: unknown; // allow data-tab
}

export function WalletPanel({
  address,
  activeChain,
  TARGET_CHAIN_ID,
  TARGET_CHAIN_LABEL,
  runtimeAddress,
  role,
  mismatch,
  isMainnet,
  ...rest
}: WalletPanelProps) {
  // Read the user's wallet balance
  const { data: userBalance } = useBalance({
    address: address as `0x${string}` | undefined,
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  return (
    <div data-tab={rest['data-tab']} className="card wallet-panel">
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
              <div className="kv-row">
                <span className="kv-label">Balance</span>
                <span className="mono">
                  {userBalance ? `${(Number(userBalance.value)/1e18).toFixed(4)} ${userBalance.symbol}` : (
                    <span style={{ display:'inline-block', width:90 }} className="skeleton skeleton-sm" />
                  )}
                </span>
              </div>
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
                {/* Role/Copy row removed: role chip already appears next to Contract and address will be shown as AddressChip */}
              </div>
            </div>
          </div>
        </section>
        <section style={{ marginTop:'.2rem' }}>
          {mismatch && <div className="alert" style={{ margin:0 }}>Network mismatch: data from {TARGET_CHAIN_LABEL}.</div>}
          {isMainnet && !mismatch && <div className="alert" style={{ marginTop:'.4rem' }}>MAINNET: check amounts.</div>}
        </section>
      </div>
    </div>
  );
}