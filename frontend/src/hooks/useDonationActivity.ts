import { useEffect, useRef, useState, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { DONATION_SPLITTER_ABI, getDonationSplitterAddress, TARGET_CHAIN_ID as CONFIG_TARGET_CHAIN_ID } from '../config/contractInfo';
import type { AbiEvent } from 'viem';
import { decodeEventLog } from 'viem';

export interface DonationActivityItem {
  id: string; // txHash + logIndex
  type: 'donate' | 'withdraw';
  txHash: string;
  address: string; // donor o beneficiary
  amountWei: bigint;
  amountEth: number;
  blockNumber: bigint;
  logIndex: number;
  timestamp?: number; // epoch seconds
}

interface Options { limit?: number; pollMs?: number; chainId?: number }

const DONATION_RECORDED_EVENT = 'DonationRecorded';
const WITHDRAWN_EVENT = 'Withdrawn';

export function useDonationActivity({ limit = 50, pollMs = 15000, chainId }: Options = {}) {
  // Siempre anclar al chain configurado salvo override explícito
  const runtimeChainId = chainId || CONFIG_TARGET_CHAIN_ID;
  // Pedimos un public client para ese chain específicamente (evita depender del chain de la wallet si está en otro)
  const publicClient = usePublicClient({ chainId: runtimeChainId });
  const address = getDonationSplitterAddress(runtimeChainId);
  const [allItems, setAllItems] = useState<DonationActivityItem[]>([]); // almacenamiento completo cargado
  const [items, setItems] = useState<DonationActivityItem[]>([]); // vista (slice por limit)
  const [earliest, setEarliest] = useState<bigint | null>(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [hasMoreState, setHasMoreState] = useState(true);
  const earliestLoadedRef = useRef<bigint | null>(null); // bloque más antiguo actualmente en memoria
  const fullyExhaustedRef = useRef(false); // alcanzamos bloque 0
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blockCache = useRef<Map<bigint, number>>(new Map());
  // Siempre usamos una ventana “tail” desde el último bloque hacia atrás (evita perder logs en mismo bloque y simplifica)
  const windowSizeRef = useRef<bigint>(8_192n); // < 10000 para free tier
  const MIN_WINDOW = 500n;

  const fetchAll = useCallback(async (opts?: { silent?: boolean }) => {
    if (!publicClient) return;
    if (loading && !opts?.silent) {
      // Evitar solapar; pequeño debounce natural.
      return;
    }
    if (!opts?.silent) setLoading(true);
    if (!opts?.silent) setError(null);
    try {
      const latest = await publicClient.getBlockNumber();
  const span = windowSizeRef.current;
  const fromBlock = latest > span ? latest - span : 0n;
      const toBlock = latest;
      const eventDonation = DONATION_SPLITTER_ABI.find(e => e.type==='event' && e.name===DONATION_RECORDED_EVENT) as AbiEvent;
      const eventWithdraw = DONATION_SPLITTER_ABI.find(e => e.type==='event' && e.name===WITHDRAWN_EVENT) as AbiEvent;
      interface LogLite { transactionHash: string; logIndex: number | bigint; blockNumber: bigint; data: `0x${string}`; topics: readonly `0x${string}`[] }
      let donationLogs: LogLite[] = [];
      let withdrawnLogs: LogLite[] = [];
      try {
        donationLogs = await publicClient.getLogs({ address, event: eventDonation, fromBlock, toBlock });
        withdrawnLogs = await publicClient.getLogs({ address, event: eventWithdraw, fromBlock, toBlock });
      } catch (e) {
        const msg = (e as Error).message || '';
        if (msg.includes('10000') && windowSizeRef.current > MIN_WINDOW) {
          // Backoff: reducimos ventana y reintentamos una vez
            windowSizeRef.current = windowSizeRef.current / 2n;
            setLoading(false);
            return fetchAll();
        }
        throw e;
      }
  const merged: DonationActivityItem[] = [];
      function pushLog(l: LogLite, type: 'donate' | 'withdraw') {
        try {
          const topicsArr = l.topics as unknown as [`0x${string}`, ...`0x${string}`[]];
          const decoded = decodeEventLog({ abi: DONATION_SPLITTER_ABI, data: l.data as `0x${string}`, topics: topicsArr });
          if (type === 'donate') {
            const raw = decoded.args as unknown;
            let donor: string; let amount: bigint;
            const isObjDonation = (val: unknown): val is { donor: string; amount: bigint } => {
              return !!val && typeof val === 'object' && 'donor' in (val as Record<string, unknown>) && 'amount' in (val as Record<string, unknown>);
            };
            if (Array.isArray(raw)) {
              donor = raw[0] as string;
              amount = raw[1] as bigint;
            } else if (isObjDonation(raw)) {
              donor = raw.donor;
              amount = raw.amount;
            } else {
              return; // forma inesperada
            }
            merged.push({
              id: l.transactionHash + ':' + l.logIndex,
              type,
              txHash: l.transactionHash,
              address: donor,
              amountWei: amount,
              amountEth: Number(amount) / 1e18,
              blockNumber: l.blockNumber,
              logIndex: Number(l.logIndex)
            });
          } else {
            const rawW = decoded.args as unknown;
            let beneficiary: string; let amount: bigint;
            const isObjWithdraw = (val: unknown): val is { beneficiary: string; amount: bigint } => {
              return !!val && typeof val === 'object' && 'beneficiary' in (val as Record<string, unknown>) && 'amount' in (val as Record<string, unknown>);
            };
            if (Array.isArray(rawW)) {
              beneficiary = rawW[0] as string;
              amount = rawW[1] as bigint;
            } else if (isObjWithdraw(rawW)) {
              beneficiary = rawW.beneficiary;
              amount = rawW.amount;
            } else {
              return; // forma inesperada
            }
            merged.push({
              id: l.transactionHash + ':' + l.logIndex,
              type,
              txHash: l.transactionHash,
              address: beneficiary,
              amountWei: amount,
              amountEth: Number(amount) / 1e18,
              blockNumber: l.blockNumber,
              logIndex: Number(l.logIndex)
            });
          }
        } catch {/* ignore decode errors */}
      }
      donationLogs.forEach(l => pushLog(l, 'donate'));
      withdrawnLogs.forEach(l => pushLog(l, 'withdraw'));
      const byId = new Map<string, DonationActivityItem>();
      for (const it of merged) if (!byId.has(it.id)) byId.set(it.id, it);
      const dedup = Array.from(byId.values());
      dedup.sort((a,b) => (a.blockNumber === b.blockNumber ? b.logIndex - a.logIndex : Number(b.blockNumber - a.blockNumber)));
      for (const it of dedup) {
        if (!blockCache.current.has(it.blockNumber)) {
          try {
            const blk = await publicClient.getBlock({ blockNumber: it.blockNumber });
            blockCache.current.set(it.blockNumber, Number(blk.timestamp));
          } catch {/* ignore */}
        }
        it.timestamp = blockCache.current.get(it.blockNumber);
      }
      // Evitar set si no cambió
      const prevFirst = allItems[0]?.id;
      const nextFirst = dedup[0]?.id;
      if (prevFirst !== nextFirst || dedup.length !== allItems.length) {
        setAllItems(dedup);
      }
      // Derivar vista según limit
      setItems(dedup.slice(0, limit));
      // actualizar earliestLoadedRef
      if (dedup.length) {
        const minBlock = dedup.reduce((acc, it) => it.blockNumber < acc ? it.blockNumber : acc, dedup[0].blockNumber);
        earliestLoadedRef.current = minBlock;
        setEarliest(minBlock);
        if (minBlock === 0n) fullyExhaustedRef.current = true;
      }
      setHasMoreState(!fullyExhaustedRef.current);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [publicClient, address, limit, loading, MIN_WINDOW, allItems]);

  // Cargar una ventana más antigua y fusionar
  const loadOlder = useCallback(async (): Promise<number> => {
    if (!publicClient) return 0;
    if (loading) return 0;
    if (fullyExhaustedRef.current) return 0;
    setLoading(true); setError(null);
    try {
      const currentEarliest = earliestLoadedRef.current;
      // si todavía no hay items, simplemente delegamos a fetchAll
      if (!currentEarliest) {
        setLoading(false);
        await fetchAll();
        return 0;
      }
      const span = windowSizeRef.current;
      const toBlock = currentEarliest > 0n ? currentEarliest - 1n : 0n;
      if (toBlock === 0n && fullyExhaustedRef.current) { setLoading(false); return 0; }
      const fromBlock = toBlock > span ? toBlock - span : 0n;
      const eventDonation = DONATION_SPLITTER_ABI.find(e => e.type==='event' && e.name===DONATION_RECORDED_EVENT) as AbiEvent;
      const eventWithdraw = DONATION_SPLITTER_ABI.find(e => e.type==='event' && e.name===WITHDRAWN_EVENT) as AbiEvent;
      interface LogLite { transactionHash: string; logIndex: number | bigint; blockNumber: bigint; data: `0x${string}`; topics: readonly `0x${string}`[] }
      let donationLogs: LogLite[] = [];
      let withdrawnLogs: LogLite[] = [];
      try {
        donationLogs = await publicClient.getLogs({ address, event: eventDonation, fromBlock, toBlock });
        withdrawnLogs = await publicClient.getLogs({ address, event: eventWithdraw, fromBlock, toBlock });
      } catch (e) {
        const msg = (e as Error).message || '';
        if (msg.includes('10000') && windowSizeRef.current > MIN_WINDOW) {
          windowSizeRef.current = windowSizeRef.current / 2n;
          setLoading(false);
          return loadOlder();
        }
        throw e;
      }
      const merged: DonationActivityItem[] = [];
      function pushLog(l: LogLite, type: 'donate' | 'withdraw') {
        try {
          const topicsArr = l.topics as unknown as [`0x${string}`, ...`0x${string}`[]];
          const decoded = decodeEventLog({ abi: DONATION_SPLITTER_ABI, data: l.data as `0x${string}`, topics: topicsArr });
          if (type === 'donate') {
            const raw = decoded.args as unknown;
            let donor: string; let amount: bigint;
            const isObjDonation = (val: unknown): val is { donor: string; amount: bigint } => {
              return !!val && typeof val === 'object' && 'donor' in (val as Record<string, unknown>) && 'amount' in (val as Record<string, unknown>);
            };
            if (Array.isArray(raw)) { donor = raw[0] as string; amount = raw[1] as bigint; }
            else if (isObjDonation(raw)) { donor = raw.donor; amount = raw.amount; }
            else return;
            merged.push({ id: l.transactionHash+':'+l.logIndex, type, txHash: l.transactionHash, address: donor, amountWei: amount, amountEth: Number(amount)/1e18, blockNumber: l.blockNumber, logIndex: Number(l.logIndex) });
          } else {
            const rawW = decoded.args as unknown;
            let beneficiary: string; let amount: bigint;
            const isObjWithdraw = (val: unknown): val is { beneficiary: string; amount: bigint } => {
              return !!val && typeof val === 'object' && 'beneficiary' in (val as Record<string, unknown>) && 'amount' in (val as Record<string, unknown>);
            };
            if (Array.isArray(rawW)) { beneficiary = rawW[0] as string; amount = rawW[1] as bigint; }
            else if (isObjWithdraw(rawW)) { beneficiary = rawW.beneficiary; amount = rawW.amount; }
            else return;
            merged.push({ id: l.transactionHash+':'+l.logIndex, type, txHash: l.transactionHash, address: beneficiary, amountWei: amount, amountEth: Number(amount)/1e18, blockNumber: l.blockNumber, logIndex: Number(l.logIndex) });
          }
        } catch {/* ignore */}
      }
      donationLogs.forEach(l => pushLog(l, 'donate'));
      withdrawnLogs.forEach(l => pushLog(l, 'withdraw'));
      // fusionar con existentes
  const prevEarliest = earliestLoadedRef.current;
  const prevLength = allItems.length;
  const combined = [...allItems, ...merged];
      const byId = new Map<string, DonationActivityItem>();
      for (const it of combined) if (!byId.has(it.id)) byId.set(it.id, it);
      const dedup = Array.from(byId.values());
      dedup.sort((a,b) => (a.blockNumber === b.blockNumber ? b.logIndex - a.logIndex : Number(b.blockNumber - a.blockNumber)));
      for (const it of dedup) {
        if (!blockCache.current.has(it.blockNumber)) {
          try { const blk = await publicClient.getBlock({ blockNumber: it.blockNumber }); blockCache.current.set(it.blockNumber, Number(blk.timestamp)); } catch {/* ignore */}
        }
        it.timestamp = blockCache.current.get(it.blockNumber);
      }
  const prevTotal = allItems.length;
  setAllItems(dedup);
  setItems(dedup.slice(0, limit));
      if (dedup.length) {
        const minBlock = dedup.reduce((acc, it) => it.blockNumber < acc ? it.blockNumber : acc, dedup[0].blockNumber);
        earliestLoadedRef.current = minBlock;
        setEarliest(minBlock);
        if (minBlock === 0n) fullyExhaustedRef.current = true;
      }
      // Determinar si realmente avanzamos
      if (dedup.length === prevLength || earliestLoadedRef.current === prevEarliest) {
        // No se extendió más atrás: marcar agotado
        fullyExhaustedRef.current = true;
      }
      setHasMoreState(!fullyExhaustedRef.current);
      return dedup.length - prevTotal;
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
    return 0;
  }, [publicClient, address, allItems, limit, loading, fetchAll, MIN_WINDOW]);

  useEffect(() => {
    fetchAll();
    const id = setInterval(() => fetchAll({ silent:true }), pollMs); // silent polling
    return () => clearInterval(id);
  }, [fetchAll, pollMs]);

  // Re-derivar items al cambiar limit sin reconsultar
  useEffect(() => {
    setItems(allItems.slice(0, limit));
  }, [limit, allItems]);

  // Listener para refresco manual (e.g., tras donar)
  useEffect(() => {
    const handler = () => fetchAll({ silent:true });
    window.addEventListener('ds_activity_refresh', handler);
    return () => window.removeEventListener('ds_activity_refresh', handler);
  }, [fetchAll]);

  const refetch = async () => {
    // Si ya tenemos items, hacerlo silencioso para evitar flicker
    if (allItems.length) {
      setManualLoading(true);
      try { await fetchAll({ silent:true }); } finally { setManualLoading(false); }
    } else {
      setManualLoading(true);
      try { await fetchAll({ silent:false }); } finally { setManualLoading(false); }
    }
  };

  const fetchFullHistory = async (): Promise<number> => {
    // Intentamos traer todo sin límite estricto de 40, pero con guardián amplio (p.ej. 400 ventanas) para evitar loops infinitos.
    let loops = 0; let addedTotal = 0; const HARD_CAP = 400;
    while (!fullyExhaustedRef.current && loops < HARD_CAP) {
      const added = await loadOlder();
      if (!added) break; // loadOlder ya marca fullyExhausted si no avanza
      addedTotal += added;
      loops++;
      if (earliestLoadedRef.current === 0n) break;
    }
    return addedTotal;
  };

  return { items, total: allItems.length, earliest, loading: manualLoading || loading, manualLoading, error, refetch, loadOlder, fetchFullHistory, hasMore: hasMoreState };
}
