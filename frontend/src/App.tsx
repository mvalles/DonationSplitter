


import './App.css';
import { useAccount, useConnect, useDisconnect, useReadContract, useBalance } from 'wagmi';
import { useDonateETH, useWithdrawETH } from './contractWriteHooks';
import { useRefetchKey } from './RefetchContext';
import { metaMask } from 'wagmi/connectors';
import { DONATION_SPLITTER_ADDRESS, DONATION_SPLITTER_ABI } from './contractInfo';
import { useState } from 'react';



function App() {
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [ethAmount, setEthAmount] = useState('');
  const [donateError, setDonateError] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

    // Refetch context
  const { bump } = useRefetchKey();
    // Leer saldo pendiente para el usuario
    const { data: pendingEth, refetch } = useReadContract({
      address: DONATION_SPLITTER_ADDRESS,
      abi: DONATION_SPLITTER_ABI,
      functionName: 'pendingEth',
      args: address ? [address] : undefined,
      query: { enabled: isConnected, refetchInterval: 5000 },
    });

    // Leer balance total del contrato
    const { data: contractBalance } = useBalance({
      address: DONATION_SPLITTER_ADDRESS,
      watch: true,
    });

    // Hooks para escribir en el contrato
  const { donateETH } = useDonateETH();
    const { withdrawETH, isPending: isWithdrawing } = useWithdrawETH();

  return (
    <div className="app-container">
      <h1>Donation Splitter DApp</h1>
      {!isConnected && (
        <button onClick={() => connect({ connector: metaMask() })} disabled={isPending}>
          {isPending ? 'Conectando...' : 'Conectar Wallet'}
        </button>
      )}
      {isConnected && (
        <div>
          <p>Wallet conectada: <b>{address}</b></p>
          <button onClick={() => disconnect()}>Desconectar</button>
          <hr />
          <h2>Donar ETH</h2>
          <form
            onSubmit={async e => {
              e.preventDefault();
              setDonateError(null);
              try {
                const value = ethAmount && !isNaN(Number(ethAmount)) ? BigInt(Math.floor(Number(ethAmount.toString()) * 1e18)) : undefined;
                if (!value) throw new Error('Cantidad inválida');
                const tx = await donateETH(value);
                setEthAmount('');
                bump(); // fuerza refetch
                if (refetch) refetch();
                console.log('TX enviada:', tx);
              } catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                setDonateError(errorMsg);
                console.error('Error donando:', err);
              }
            }}
            style={{ marginBottom: 16 }}
          >
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Cantidad en ETH"
              value={ethAmount}
              onChange={e => setEthAmount(e.target.value)}
              required
            />
            <button type="submit">
              Donar
            </button>
          </form>
          {donateError && <p style={{ color: 'red' }}>Error al donar: {donateError}</p>}
          <h2>Retirar saldo</h2>
          <p>Balance total del contrato: <b>{contractBalance ? Number(contractBalance.value) / 1e18 : '0.0000'} ETH</b></p>
          {isConnected && pendingEth !== undefined && pendingEth !== null && (typeof pendingEth === 'bigint' ? pendingEth > 0n : BigInt(pendingEth) > 0n) && (
            <>
              <p>Saldo pendiente: <b>{
                typeof pendingEth === 'bigint'
                  ? (Number(pendingEth) / 1e18).toFixed(4)
                  : (Number(BigInt(pendingEth)) / 1e18).toFixed(4)
              } ETH</b></p>
              <button
                onClick={async () => {
                  setWithdrawError(null);
                  try {
                    const tx = await withdrawETH();
                    bump(); // fuerza refetch
                    if (refetch) refetch();
                    console.log('TX retirada:', tx);
                  } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : String(err);
                    setWithdrawError(errorMsg);
                    console.error('Error retirando:', err);
                  }
                }}
                disabled={isWithdrawing}
              >
                {isWithdrawing ? 'Retirando...' : 'Retirar'}
              </button>
              {withdrawError && <p style={{ color: 'red' }}>Error al retirar: {withdrawError}</p>}
            </>
          )}
        </div>
      )}
      <p>Conecta tu wallet y realiza donaciones o retiros.</p>
    </div>
  );
}

export default App;
