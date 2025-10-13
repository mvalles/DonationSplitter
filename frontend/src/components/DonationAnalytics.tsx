import { useBlockscoutData } from '../hooks/useBlockscoutData';
import { BENEFICIARIES } from '../config/beneficiaries';

interface DonationAnalyticsProps {
  chainId: number;
  contractAddress: string;
}

export function DonationAnalytics({ chainId, contractAddress }: DonationAnalyticsProps) {
  const { stats, loading, error, refetch } = useBlockscoutData(chainId, contractAddress);

  if (loading) {
    return (
      <div style={{
        background: 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📊</div>
        <div style={{ color: 'rgba(255,255,255,0.7)' }}>Loading donation analytics from Blockscout...</div>
      </div>
    );
  }

  if (error) {
    const isContractNotFound = error.includes('Contract not found') || error.includes('analytics will be available');
    
    return (
      <div style={{
        background: isContractNotFound 
          ? 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))'
          : 'linear-gradient(145deg, rgba(255,100,100,0.1), rgba(255,100,100,0.05))',
        border: isContractNotFound
          ? '1px solid rgba(255,255,255,0.1)'
          : '1px solid rgba(255,100,100,0.3)',
        borderRadius: 16,
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>
          {isContractNotFound ? '📊' : '⚠️'}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '1rem' }}>
          {isContractNotFound ? (
            <>
              <div style={{ fontWeight: 600, marginBottom: '.5rem' }}>Analytics Coming Soon</div>
              <div style={{ fontSize: '.9rem', opacity: 0.7 }}>
                Donation analytics will appear here after the first donation is received.
                All data is pulled directly from the blockchain for complete transparency.
              </div>
            </>
          ) : (
            <>Error loading analytics: {error}</>
          )}
        </div>
        {!isContractNotFound && (
          <button
            onClick={refetch}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8,
              color: '#fff',
              padding: '.5rem 1rem',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{
        background: 'linear-gradient(145deg, rgba(116, 185, 255, 0.1), rgba(116, 185, 255, 0.05))',
        border: '1px solid rgba(116, 185, 255, 0.3)',
        borderRadius: 16,
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔍</div>
        <div style={{ color: 'rgba(255,255,255,0.8)' }}>
          Blockscout Integration Ready
          <br />
          <small style={{ opacity: 0.6 }}>Analytics will appear when donations are detected</small>
        </div>
      </div>
    );
  }

  const maxWeeklyAmount = Math.max(...stats.donationsByWeek.map(w => w.amount));
  const averageWeeklyDonation = stats.donationsByWeek.length > 0 
    ? stats.donationsByWeek.reduce((sum, w) => sum + w.amount, 0) / stats.donationsByWeek.length 
    : 0;

  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 16,
      padding: '1.5rem',
      marginBottom: '1.5rem'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '1.1rem',
          fontWeight: 700,
          color: 'rgba(255,255,255,0.9)',
          display: 'flex',
          alignItems: 'center',
          gap: '.5rem'
        }}>
          ⚡ Donation Analytics
          <span style={{
            fontSize: '.6rem',
            padding: '.2rem .5rem',
            background: 'linear-gradient(90deg, #3498db, #74b9ff)',
            color: '#fff',
            borderRadius: 4,
            fontWeight: 600
          }}>
            BLOCKSCOUT
          </span>
        </h3>
        
        <button
          onClick={refetch}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 6,
            color: 'rgba(255,255,255,0.7)',
            fontSize: '.7rem',
            padding: '.4rem .8rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title="Refresh data from Blockscout"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: 'rgba(46, 204, 113, 0.1)',
          border: '1px solid rgba(46, 204, 113, 0.3)',
          borderRadius: 12,
          padding: '1rem',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#2ecc71',
            marginBottom: '.3rem'
          }}>
            {stats.totalReceived.toFixed(4)}
          </div>
          <div style={{
            fontSize: '.7rem',
            color: 'rgba(255,255,255,0.6)',
            textTransform: 'uppercase',
            letterSpacing: '.5px'
          }}>
            Total ETH Received
          </div>
        </div>

        <div style={{
          background: 'rgba(52, 152, 219, 0.1)',
          border: '1px solid rgba(52, 152, 219, 0.3)',
          borderRadius: 12,
          padding: '1rem',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#3498db',
            marginBottom: '.3rem'
          }}>
            {stats.totalDonations}
          </div>
          <div style={{
            fontSize: '.7rem',
            color: 'rgba(255,255,255,0.6)',
            textTransform: 'uppercase',
            letterSpacing: '.5px'
          }}>
            Total Donations
          </div>
        </div>

        <div style={{
          background: 'rgba(155, 89, 182, 0.1)',
          border: '1px solid rgba(155, 89, 182, 0.3)',
          borderRadius: 12,
          padding: '1rem',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#9b59b6',
            marginBottom: '.3rem'
          }}>
            {averageWeeklyDonation.toFixed(4)}
          </div>
          <div style={{
            fontSize: '.7rem',
            color: 'rgba(255,255,255,0.6)',
            textTransform: 'uppercase',
            letterSpacing: '.5px'
          }}>
            Avg Weekly Donation
          </div>
        </div>
      </div>

      {/* Weekly Donations Chart */}
      {stats.donationsByWeek.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{
            fontSize: '.9rem',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.8)',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '.5rem'
          }}>
            📈 Donations by Week
          </h4>
          
          <div style={{
            background: 'rgba(0,0,0,0.2)',
            borderRadius: 12,
            padding: '1rem',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            {stats.donationsByWeek.map((week, index) => {
              const percentage = maxWeeklyAmount > 0 ? (week.amount / maxWeeklyAmount) * 100 : 0;
              const weekDate = new Date(week.week);
              const weekLabel = weekDate.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              });
              
              return (
                <div key={week.week} style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: index < stats.donationsByWeek.length - 1 ? '.8rem' : 0,
                  gap: '1rem'
                }}>
                  <div style={{
                    minWidth: '60px',
                    fontSize: '.7rem',
                    color: 'rgba(255,255,255,0.6)'
                  }}>
                    {weekLabel}
                  </div>
                  
                  <div style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 4,
                    height: '20px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      background: 'linear-gradient(90deg, #3498db, #74b9ff)',
                      height: '100%',
                      width: `${percentage}%`,
                      borderRadius: 4,
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                  
                  <div style={{
                    minWidth: '80px',
                    textAlign: 'right',
                    fontSize: '.7rem',
                    color: 'rgba(255,255,255,0.8)'
                  }}>
                    {week.amount.toFixed(3)} ETH
                    <div style={{
                      fontSize: '.6rem',
                      color: 'rgba(255,255,255,0.5)'
                    }}>
                      {week.count} donations
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Beneficiary Distribution */}
      <div>
        <h4 style={{
          fontSize: '.9rem',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.8)',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '.5rem'
        }}>
          🎯 Distribution per Beneficiary
        </h4>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          {BENEFICIARIES.map((beneficiary) => {
            // Calculate actual distribution based on BPS
            const beneficiaryShare = (stats.totalReceived * beneficiary.bps) / 10000;
            const sharePercentage = (beneficiary.bps / 100).toFixed(2);
            
            return (
              <div key={beneficiary.address} style={{
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 12,
                padding: '1rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.5rem',
                  marginBottom: '.5rem'
                }}>
                  <div style={{ fontSize: '.8rem' }}>
                    {beneficiary.logoId ? '🏛️' : (beneficiary.icon || '🎯')}
                  </div>
                  <div style={{
                    fontSize: '.8rem',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.9)'
                  }}>
                    {beneficiary.label}
                  </div>
                  <div style={{
                    fontSize: '.6rem',
                    background: 'rgba(116, 185, 255, 0.2)',
                    color: '#74b9ff',
                    padding: '.2rem .4rem',
                    borderRadius: 4,
                    fontWeight: 600,
                    marginLeft: 'auto'
                  }}>
                    {sharePercentage}%
                  </div>
                </div>
                
                <div style={{
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: '#2ecc71',
                  marginBottom: '.3rem'
                }}>
                  {beneficiaryShare.toFixed(4)} ETH
                </div>
                
                <div style={{
                  fontSize: '.6rem',
                  color: 'rgba(255,255,255,0.5)',
                  fontFamily: 'monospace'
                }}>
                  {beneficiary.address.slice(0, 8)}...{beneficiary.address.slice(-6)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer with transparency message */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        background: 'rgba(116, 185, 255, 0.05)',
        border: '1px solid rgba(116, 185, 255, 0.2)',
        borderRadius: 12,
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '.8rem',
          color: 'rgba(255,255,255,0.8)',
          fontWeight: 600,
          marginBottom: '.3rem'
        }}>
          🔍 Transparencia Real, Auditable en Blockchain
        </div>
        <div style={{
          fontSize: '.7rem',
          color: 'rgba(255,255,255,0.6)'
        }}>
          Todos los datos verificables en tiempo real vía Blockscout
        </div>
      </div>
    </div>
  );
}