import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

// Učitava podatke i osvežava ih na interval (samo dok je tab vidljiv)
export function usePoll(loader, intervalMs = 0, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const alive = useRef(true);

  const reload = useCallback(async () => {
    try {
      const d = await loaderRef.current();
      if (!alive.current) return d;
      setData(d); setError(null); setUpdatedAt(new Date());
      return d;
    } catch (e) {
      if (alive.current) setError(e);
      return null;
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    setLoading(true);
    reload();
    if (!intervalMs) return () => { alive.current = false; };
    const t = setInterval(() => { if (document.visibilityState === 'visible') reload(); }, intervalMs);
    return () => { alive.current = false; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, setData, error, loading, reload, updatedAt };
}

// Vrednost iz URL-a (?radnik=..., ?smena=...), da se paneli mogu otvoriti linkom i iz obaveštenja
export function useQueryParam(key) {
  const [params, setParams] = useSearchParams();
  const value = params.get(key);
  const set = useCallback((v) => {
    const next = new URLSearchParams(params);
    if (v === null || v === undefined || v === '') next.delete(key); else next.set(key, v);
    setParams(next, { replace: true });
  }, [params, setParams, key]);
  return [value, set];
}

export function useNow(ms = 30000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

// Prečica na tastaturi
export function useHotkey(match, handler) {
  const h = useRef(handler);
  h.current = handler;
  useEffect(() => {
    const onKey = (e) => { if (match(e)) { e.preventDefault(); h.current(e); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
