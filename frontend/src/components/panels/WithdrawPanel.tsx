import { useState } from 'react';
import { useReadContract } from 'wagmi';
import { useWithdrawETH } from '../../hooks/contractWriteHooks';
import { DONATION_SPLITTER_ABI } from '../../config/contractInfo';
import { TxHashChip } from '../shared/AddressComponents';
import { blockscoutTxUrl } from '../../services/blockscout';

interface WithdrawPanelProps {
  address: string | undefined;
  runtimeAddress: string;
  activeChainId: number;
  TARGET_CHAIN_ID: number;
  role: 'owner' | 'beneficiary' | 'donor' | 'unauth';
  isBeneficiary: boolean;
  isConnected: boolean;
  mismatch: boolean;
  onWithdrawSuccess: () => void;
  [key: string]: unknown; // allow data-tab
}

export function WithdrawPanel({
  address,
  runtimeAddress,
  activeChainId,
  TARGET_CHAIN_ID,
  role,
  isBeneficiary,
  isConnected,
  mismatch,
  onWithdrawSuccess,
  ...rest
}: WithdrawPanelProps) {
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [lastWithdrawTx, setLastWithdrawTx] = useState<string | null>(null);
  
  const { withdrawETH, isPending: isWithdrawing } = useWithdrawETH();
  
  // Read pending balance for the connected user
  const { data: pendingEth } = useReadContract({
    address: runtimeAddress as `0x${string}`,
    abi: DONATION_SPLITTER_ABI,
    functionName: 'pendingEth',
    args: address ? [address as `0x${string}`] : undefined,
    chainId: activeChainId,
    query: { enabled: isConnected && !mismatch, refetchInterval: 5000 },
  });

  const handleWithdraw = async () => {
    setWithdrawError(null);
    try {
      const tx = await withdrawETH();
      setLastWithdrawTx(tx);
      onWithdrawSuccess();
      console.log('Withdraw TX:', tx);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setWithdrawError(errorMsg);
      console.error('Withdraw error:', err);
    }
  };

  if (!(role === 'beneficiary' || (role === 'owner' && isBeneficiary))) {
    return null;
  }

  const hasPendingBalance = isConnected && pendingEth !== undefined && pendingEth > 0n;

  return (
    <div data-tab={rest['data-tab']} className="card">
      <h2>Withdrawals</h2>

      {/* Pending Balance & Withdraw Action */}
      {hasPendingBalance ? (
        <div style={{ 
          background: 'linear-gradient(145deg, rgba(46,125,209,0.15), rgba(74,168,255,0.08))', 
          border: '1px solid rgba(74,168,255,0.25)', 
          borderRadius: 12, 
          padding: '1rem', 
          marginBottom: '.75rem' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem' }}>
            <div>
              <div style={{ fontSize: '.68rem', fontWeight: 600, marginBottom: '.25rem', color: 'rgba(255,255,255,0.9)' }}>
                Available to Withdraw
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                {pendingEth ? ((Number(pendingEth as bigint))/1e18).toFixed(4) + ' ETH' : (
                  <span style={{ display: 'inline-block', width: 70 }} className="skeleton skeleton-sm" />
                )}
              </div>
            </div>
            <button 
              className="btn"
              style={{ 
                padding: '.65rem 1.25rem', 
                fontSize: '.75rem', 
                fontWeight: 600,
                minWidth: '100px'
              }}
              onClick={handleWithdraw}
              disabled={isWithdrawing}
            >
              {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
            </button>
          </div>
          
          {/* Transaction Links */}
          {lastWithdrawTx && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', paddingTop: '.5rem', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
              <span style={{ fontSize: '.55rem', color: 'rgba(255,255,255,0.7)' }}>Last withdrawal:</span>
              <TxHashChip 
                label="TX" 
                hash={lastWithdrawTx} 
                url={blockscoutTxUrl(activeChainId || TARGET_CHAIN_ID, lastWithdrawTx) || '#'} 
              />
            </div>
          )}
        </div>
      ) : (
        <div style={{ 
          background: 'rgba(255,255,255,0.03)', 
          border: '1px solid rgba(255,255,255,0.08)', 
          borderRadius: 12, 
          padding: '1rem', 
          textAlign: 'center',
          marginBottom: '.75rem'
        }}>
          <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,0.6)', marginBottom: '.5rem' }}>
            💰 No pending balance to withdraw
          </div>
          <div style={{ fontSize: '.58rem', color: 'rgba(255,255,255,0.4)' }}>
            Your share will appear here when donations are received
          </div>
        </div>
      )}
      
      {withdrawError && (
        <div className="alert" style={{ marginTop: '.5rem' }}>
          Withdraw error: {withdrawError}
        </div>
      )}
    </div>
  );
}