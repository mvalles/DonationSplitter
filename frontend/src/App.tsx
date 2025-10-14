import './App.css';
import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useChainId, useChains } from 'wagmi';
import type { Chain } from 'viem';
import { useDonateETH } from './hooks/contractWriteHooks';
import { useLitEncryptDonorData } from './hooks/useLitEncryptDonorData';
import { useRefetchKey } from './context/RefetchContext';
import { 
  DONATION_SPLITTER_ABI, 
  getDonationSplitterAddress, 
  TARGET_CHAIN_ID as CONFIG_TARGET_CHAIN_ID, 
  TARGET_CHAIN_LABEL 
} from './config/contractInfo';
import { useEffectiveChain } from './hooks/useEffectiveChain';
import { hasBlockscout } from './services/blockscout';
import {
  AppHeader,
  TabbedPanels,
  BeneficiariesCard,
  WalletPanel,
  DonatePanel,
  WithdrawPanel,
  ActivityPanel,
  AnalyticsModal,
  MainnetConfirmModal,
  NetworkMismatchAlert,
  ProviderNotAvailableAlert,
  DisconnectedNotice
} from './components';

function App() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const chains = useChains();

  // State management
  const [ethAmount, setEthAmount] = useState('');
  const [showMainnetConfirm, setShowMainnetConfirm] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  // Target chain and runtime address
  const TARGET_CHAIN_ID = CONFIG_TARGET_CHAIN_ID;
  const runtimeAddress = getDonationSplitterAddress(chainId);
  
  // Determine active chain early
  const activeChain = chains.find((c: Chain) => c.id === chainId);
  const isMainnet = activeChain?.id === 1;
  
  // Unified chain / mismatch state via shared hook
  const { mismatch, providerAvailable, ready } = useEffectiveChain();
  
  // Auto-disconnect logic if wagmi thinks connected but no injected provider after grace period
  const [providerGraceExpired, setProviderGraceExpired] = useState(false);
  
  useEffect(() => {
    if (isConnected && ready && !providerAvailable && !providerGraceExpired) {
      const timer = setTimeout(() => {
        setProviderGraceExpired(true);
      }, 3500);
      return () => clearTimeout(timer);
    }
    
    if (providerGraceExpired && isConnected && !providerAvailable) {
      setProviderGraceExpired(false);
    }
  }, [isConnected, ready, providerAvailable, providerGraceExpired]);

  // Contract reads for user role determination
  const { data: ownerAddress } = useReadContract({
    address: runtimeAddress as `0x${string}`,
    abi: DONATION_SPLITTER_ABI,
    functionName: 'owner',
    query: { enabled: !!runtimeAddress }
  });

  const { data: beneficiariesListData } = useReadContract({
    address: runtimeAddress as `0x${string}`,
    abi: DONATION_SPLITTER_ABI,
    functionName: 'beneficiariesList',
    query: { enabled: !!runtimeAddress }
  });

  // Determine user role
  let beneficiaryAddresses: string[] = [];
  if (Array.isArray(beneficiariesListData) && beneficiariesListData.length === 2 && Array.isArray(beneficiariesListData[0])) {
    beneficiaryAddresses = (beneficiariesListData as unknown as [string[], number[]])[0].map(a => a.toLowerCase());
  }
  
  const lowerAddr = address?.toLowerCase();
  const isOwner = !!ownerAddress && lowerAddr === (ownerAddress as string).toLowerCase();
  const isBeneficiary = !!lowerAddr && beneficiaryAddresses.includes(lowerAddr);
  const role: 'owner' | 'beneficiary' | 'donor' | 'unauth' = !isConnected ? 'unauth' : isOwner ? 'owner' : isBeneficiary ? 'beneficiary' : 'donor';

  // Hooks for refetching
  const { bump } = useRefetchKey();
  const { donateETH } = useDonateETH();
  const litEncryptDonorData = useLitEncryptDonorData();

  // Handle successful donation
  const handleDonationSuccess = () => {
    bump();
    try { 
      window.dispatchEvent(new CustomEvent('ds_activity_refresh')); 
    } catch { /* ignore */ }
  };

  // Handle mainnet confirmation
  const handleMainnetConfirm = async () => {
    setShowMainnetConfirm(false);
    try {
      const value = ethAmount && !isNaN(Number(ethAmount)) ? BigInt(Math.floor(Number(ethAmount.toString()) * 1e18)) : undefined;
      if (!value) throw new Error('Invalid amount');

  // --- LIT ENCRYPTION (usando hook) ---
  if (!ownerAddress) throw new Error('Owner address not loaded');
  // Usa el nombre de la red activa o el chainId como fallback
  const networkName = activeChain?.name || activeChain?.id?.toString() || 'unknown';
  const litPayload = await litEncryptDonorData(address || '', ownerAddress, networkName);

  // Llama a donateETH pasando el valor y el payload como URI temporal (en producción, subirías a Irys y pasarías el URI real)
  const tx = await donateETH(litPayload, value);
      setEthAmount('');
      handleDonationSuccess();
      console.log('Donation TX sent:', tx);
    } catch (err) {
      console.error('Donation error:', err);
    }
  };

  return (
    <div className="app-shell app-shell-compact">
      <AppHeader 
        isConnected={isConnected}
        isConnecting={false}
      />
      
      <section style={{ paddingTop:'.25rem' }}>
        {/* Mainnet confirmation modal */}
        <MainnetConfirmModal
          isOpen={showMainnetConfirm && isMainnet && !mismatch}
          onClose={() => setShowMainnetConfirm(false)}
          onConfirm={handleMainnetConfirm}
        />

        {/* Disconnected state */}
        {!isConnected && (
          <div className="card beneficiaries-card" style={{ marginBottom: '1.5rem' }}>
            <BeneficiariesCard 
              onAnalyticsClick={() => setAnalyticsOpen(true)}
              showAnalyticsButton={hasBlockscout(TARGET_CHAIN_ID)}
            />
            <DisconnectedNotice />
          </div>
        )}
        
        {/* Network mismatch alert */}
        {isConnected && mismatch && (
          <NetworkMismatchAlert
            activeChain={activeChain}
            TARGET_CHAIN_LABEL={TARGET_CHAIN_LABEL}
            TARGET_CHAIN_ID={TARGET_CHAIN_ID}
          />
        )}
        
        {/* Provider not available alert */}
        {isConnected && ready && !providerAvailable && !mismatch && (
          <ProviderNotAvailableAlert />
        )}
        
        {/* Connected state */}
        {isConnected && (
          <>
            <div className="card beneficiaries-card" style={{ marginBottom: '1.5rem' }}>
              <BeneficiariesCard 
                onAnalyticsClick={() => setAnalyticsOpen(true)}
                showAnalyticsButton={hasBlockscout(activeChain?.id || TARGET_CHAIN_ID)}
              />
            </div>
            
            <TabbedPanels>
              <WalletPanel
                data-tab="Wallet | Contract"
                address={address}
                activeChain={activeChain}
                TARGET_CHAIN_ID={TARGET_CHAIN_ID}
                TARGET_CHAIN_LABEL={TARGET_CHAIN_LABEL}
                runtimeAddress={runtimeAddress}
                role={role}
                mismatch={mismatch}
                isMainnet={isMainnet}
              />
              <DonatePanel
                data-tab="Donate"
                address={address}
                activeChain={activeChain}
                chainId={chainId}
                runtimeAddress={runtimeAddress}
                mismatch={mismatch}
                ready={ready}
                providerAvailable={providerAvailable}
                isMainnet={isMainnet}
                role={role}
                TARGET_CHAIN_ID={TARGET_CHAIN_ID}
                TARGET_CHAIN_LABEL={TARGET_CHAIN_LABEL}
                onDonationSuccess={handleDonationSuccess}
                setShowMainnetConfirm={setShowMainnetConfirm}
                showMainnetConfirm={showMainnetConfirm}
              />
              {role === 'beneficiary' && (
                <WithdrawPanel
                  data-tab="Withdraw"
                  address={address}
                  runtimeAddress={runtimeAddress}
                  activeChainId={activeChain?.id || TARGET_CHAIN_ID}
                  TARGET_CHAIN_ID={TARGET_CHAIN_ID}
                  role={role}
                  isBeneficiary={isBeneficiary}
                  isConnected={isConnected}
                  mismatch={mismatch}
                  onWithdrawSuccess={() => bump()}
                />
              )}
              <ActivityPanel
                data-tab="Activity"
                chainId={TARGET_CHAIN_ID}
              />
            </TabbedPanels>
          </>
        )}
        
        {/* Analytics modal */}
        <AnalyticsModal
          isOpen={analyticsOpen}
          onClose={() => setAnalyticsOpen(false)}
          chainId={activeChain?.id || TARGET_CHAIN_ID}
          contractAddress={runtimeAddress}
        />
      </section>
      
      <footer className="app-footer">
        DonationSplitter · Experimental UI · {new Date().getFullYear()}
      </footer>
    </div>
  );
}

export default App;