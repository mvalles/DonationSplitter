// React context to force refetch after executing contract writes
import { createContext, useContext, useState } from 'react';

const RefetchContext = createContext<{ refetchKey: number; bump: () => void }>({ refetchKey: 0, bump: () => {} });

export function RefetchProvider({ children }: { children: React.ReactNode }) {
  const [refetchKey, setRefetchKey] = useState(0);
  const bump = () => setRefetchKey(k => k + 1);
  return (
    <RefetchContext.Provider value={{ refetchKey, bump }}>
      {children}
    </RefetchContext.Provider>
  );
}

export function useRefetchKey() {
  return useContext(RefetchContext);
}
