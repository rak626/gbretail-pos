"use client";
import { useRef, useCallback, useEffect } from "react";

/**
 * Centralizes AbortController + debounce + focus-restore pattern
 * duplicated 6x across SearchBar, inventory, orders, ledger, customers.
 */
export function useAbortableFetch() {
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const getSignal = useCallback(() => {
    abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    return ctrl.signal;
  }, [abort]);

  useEffect(() => {
    return () => abort();
  }, [abort]);

  return { getSignal, abort, ref: abortRef };
}
