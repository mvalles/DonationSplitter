import { useBlockscoutData } from '../../hooks/useBlockscoutData';
import { BENEFICIARIES } from '../../config/beneficiaries';

interface DonationAnalyticsProps {
  chainId: number;
  contractAddress: string;
}

export function DonationAnalytics({ chainId, contractAddress }: DonationAnalyticsProps) {
  const { stats, loading, error } = useBlockscoutData(chainId, contractAddress);

  // Proteger stats y calcular valores derivados
  const donationsByWeek = stats?.donationsByWeek || [];
  const maxWeeklyAmount = donationsByWeek.length > 0 ? Math.max(...donationsByWeek.map(w => w.amount)) : 0;
  const averageWeeklyDonation = donationsByWeek.length > 0 ? donationsByWeek.reduce((sum, w) => sum + w.amount, 0) / donationsByWeek.length : 0;

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
            </>
          ) : error}
        </div>
      </div>
    );
  }

  // --- MAIN RENDER ---
  return (
    <>
      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
        direction: 'ltr'
      }}>
        {/* Total ETH Received */}
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
            {stats ? stats.totalReceived.toFixed(4) : '-'}
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

        {/* Total Fees */}
        <div style={{
          background: 'rgba(241, 196, 15, 0.12)',
          border: '1px solid rgba(241, 196, 15, 0.25)',
          borderRadius: 12,
          padding: '1rem',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#f1c40f',
            marginBottom: '.3rem'
          }}>
            {stats ? stats.totalFeesEth.toFixed(5) : '-'}
          </div>
          <div style={{
            fontSize: '.7rem',
            color: 'rgba(255,255,255,0.6)',
            textTransform: 'uppercase',
            letterSpacing: '.5px'
          }}>
            Total Fees (ETH)
          </div>
        </div>

        {/* Total Donations */}
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
            {stats ? stats.totalDonations : '-'}
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

        {/* Avg Weekly Donation */}
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
      {donationsByWeek.length > 0 && (
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
            {donationsByWeek.map((week, index) => {
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
                  marginBottom: index < donationsByWeek.length - 1 ? '.8rem' : 0,
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
            const beneficiaryShare = stats ? (stats.totalReceived * beneficiary.bps) / 10000 : 0;
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
                  <div style={{ fontSize: '.8rem', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {beneficiary.logoSrc
                      ? <img src={beneficiary.logoSrc} alt={beneficiary.label + ' logo'} style={{ width: 24, height: 24, objectFit: 'contain', borderRadius: 4, background: 'white' }} />
                      : (beneficiary.icon || '🎯')}
                  </div>
                  <div style={{
                    fontSize: '.8rem',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.9)'
                  }}>
                    {beneficiary.label}
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '.5rem',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: '#2ecc71',
                  marginBottom: '.3rem'
                }}>
                  <span>{beneficiaryShare.toFixed(4)} ETH</span>
                  <span style={{
                    fontSize: '.7rem',
                    background: 'rgba(116, 185, 255, 0.2)',
                    color: '#74b9ff',
                    padding: '.15rem .35rem',
                    borderRadius: 4,
                    fontWeight: 600,
                    marginLeft: '.2rem'
                  }}>{sharePercentage}%</span>
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
          🔍 True Transparency, Auditable on Blockchain
        </div>
        <div style={{
          fontSize: '.7rem',
          color: 'rgba(255,255,255,0.6)'
        }}>
          All data verifiable in real time via Blockscout
        </div>
      </div>
    </>
  );
}