// wagmi v2 helper for contract write
import { DONATION_SPLITTER_ADDRESS, DONATION_SPLITTER_ABI } from './contractInfo';
import { useWriteContract } from 'wagmi';

export function useDonateETH() {
  const { writeContractAsync, isPending, error, data } = useWriteContract();
  async function donateETH(value: bigint) {
    return await writeContractAsync({
      address: DONATION_SPLITTER_ADDRESS,
      abi: DONATION_SPLITTER_ABI,
      functionName: 'donateETH',
      value,
    });
  }
  return { donateETH, isPending, error, data };
}

export function useWithdrawETH() {
  const { writeContractAsync, isPending, error, data } = useWriteContract();
  async function withdrawETH() {
    return await writeContractAsync({
      address: DONATION_SPLITTER_ADDRESS,
      abi: DONATION_SPLITTER_ABI,
      functionName: 'withdrawETH',
    });
  }
  return { withdrawETH, isPending, error, data };
}
