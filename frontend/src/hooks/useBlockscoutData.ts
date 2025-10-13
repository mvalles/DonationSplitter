import { useState, useEffect, useCallback } from 'react';
import { blockscoutApiBase, hasBlockscout } from '../services/blockscout';

interface BlockscoutTransaction {
  hash: string;
  block_number: number;
  timestamp: string;
  value: string;
  from: {
    hash: string;
  };
  to: {
    hash: string;
  };
  status: string;
  method?: string;
}

interface DonationStats {
  totalReceived: number;
  totalDonations: number;
  donationsByWeek: { week: string; amount: number; count: number }[];
  recentDonations: { hash: string; amount: number; timestamp: string; from: string }[];
}

interface UseBlockscoutDataResult {
  stats: DonationStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useBlockscoutData(chainId: number, contractAddress: string): UseBlockscoutDataResult {
  const [stats, setStats] = useState<DonationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!hasBlockscout(chainId)) {
      setError('Blockscout not available for this chain');
      return;
    }

    if (!contractAddress || !contractAddress.startsWith('0x') || contractAddress.length !== 42) {
      setError('Invalid contract address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First, try to fetch with a smaller limit and basic parameters
      const apiBase = blockscoutApiBase(chainId);
      if (!apiBase) throw new Error('Could not build Blockscout API base URL');

      // Use the correct Blockscout API parameters (no 'page' parameter, use 'items_count' only)
      const txsUrl = `${apiBase}/addresses/${contractAddress}/transactions?items_count=50`;
      
      console.log('Fetching from:', txsUrl); // Debug log

      const response = await fetch(txsUrl);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }
      
      const data = await response.json();
      const transactions: BlockscoutTransaction[] = data.items || [];

      // Filter for successful transactions with ETH value (donations)
      const donations = transactions.filter(tx => {
        try {
          return tx.status === 'ok' && 
                 parseFloat(tx.value || '0') > 0 &&
                 tx.to?.hash?.toLowerCase() === contractAddress.toLowerCase();
        } catch {
          return false;
        }
      });

      // Calculate stats
      const totalReceived = donations.reduce((sum, tx) => {
        try {
          return sum + parseFloat(tx.value || '0') / 1e18;
        } catch {
          return sum;
        }
      }, 0);

      // Group by week
      const weeklyData: Record<string, { amount: number; count: number }> = {};
      
      donations.forEach(tx => {
        try {
          const date = new Date(tx.timestamp);
          // Skip invalid dates
          if (isNaN(date.getTime())) return;
          
          const weekStart = getWeekStart(date);
          const weekKey = weekStart.toISOString().split('T')[0];
          
          if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = { amount: 0, count: 0 };
          }
          
          weeklyData[weekKey].amount += parseFloat(tx.value || '0') / 1e18;
          weeklyData[weekKey].count += 1;
        } catch (err) {
          console.warn('Error processing transaction for weekly data:', tx.hash, err);
        }
      });

      const donationsByWeek = Object.entries(weeklyData)
        .map(([week, data]) => ({ week, ...data }))
        .sort((a, b) => a.week.localeCompare(b.week));

      // Recent donations for display
      const recentDonations = donations.slice(0, 10).map(tx => {
        try {
          return {
            hash: tx.hash,
            amount: parseFloat(tx.value || '0') / 1e18,
            timestamp: tx.timestamp,
            from: tx.from?.hash || 'unknown'
          };
        } catch {
          return {
            hash: tx.hash || 'unknown',
            amount: 0,
            timestamp: tx.timestamp || '',
            from: 'unknown'
          };
        }
      });

      setStats({
        totalReceived,
        totalDonations: donations.length,
        donationsByWeek,
        recentDonations
      });

    } catch (err) {
      console.error('Blockscout fetch error:', err);
      
      let errorMessage = 'Unknown error';
      if (err instanceof Error) {
        if (err.message.includes('422')) {
          errorMessage = 'Contract not found or invalid address - analytics will be available after first donation';
        } else if (err.message.includes('404')) {
          errorMessage = 'Blockscout API endpoint not found';
        } else if (err.message.includes('429')) {
          errorMessage = 'Rate limited - please try again later';
        } else if (err.message.includes('Failed to fetch')) {
          errorMessage = 'Network error - check connection';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [chainId, contractAddress]);

  useEffect(() => {
    if (contractAddress && chainId) {
      fetchData();
    }
  }, [chainId, contractAddress, fetchData]);

  return {
    stats,
    loading,
    error,
    refetch: fetchData
  };
}

// Helper function to get the start of the week (Monday)
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}