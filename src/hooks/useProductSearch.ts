"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useCartStore } from "@/store/cartStore";
import { useCatalogStore } from "@/store/catalogStore";
import type { Product } from "@/db/database";
import { fetchProducts } from "@/lib/api";
import { isOutOfStock } from "@/lib/stock";
import { SEARCH_MIN_CHARS } from "@/components/SearchBox";

/**
 * Shared billing product-search logic (POS only).
 * Used by the inline hero SearchBar AND the F2 spotlight palette —
 * same instant local + debounced API search, exact-barcode fast path,
 * arrow navigation and Enter-to-add in both places.
 */
export function useProductSearch(opts?: { onAdd?: () => void }) {
  const { searchQuery, setSearchQuery, openLooseModal, addItem } = useCartStore();
  const catalog = useCatalogStore((s) => s.products);
  const loadCatalog = useCatalogStore((s) => s.loadCatalog);
  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const [results, setResults] = useState<Product[]>([]);
  const [show, setShow] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [searching, setSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const onAddRef = useRef(opts?.onAdd);
  onAddRef.current = opts?.onAdd;

  const doSearchApi = useCallback(async (trimmed: string, local: Product[]) => {
    if (trimmed.startsWith(" ") || !trimmed || trimmed.length < SEARCH_MIN_CHARS) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSearching(true);
    try {
      const api = await fetchProducts({ search: trimmed, limit: 10 }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (api.length > 0) {
        setResults(api as unknown as Product[]);
      } else if (local.length === 0) {
        setResults([]);
      }
      setShow(true);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setShow(true);
    } finally {
      if (abortRef.current === controller) setSearching(false);
    }
  }, []);

  const add = useCallback((p: Product) => {
    if (p.is_loose) openLooseModal({ ...p, price: p.rate_per_kg || 0, unit: "kg" } as unknown as Parameters<typeof openLooseModal>[0]);
    else addItem({ productId: p.id, name: p.name, price: p.price || 0, unit: "pcs", quantity: 1, lineTotal: p.price || 0, isCustom: false, is_loose: false, category: p.category, costPrice: (p as unknown as { costPrice?: number }).costPrice ?? 0 });
    setSearchQuery("");
    setResults([]);
    setShow(false);
    onAddRef.current?.();
  }, [openLooseModal, addItem, setSearchQuery]);

  const handleImmediate = useCallback((v: string) => {
    setSearchQuery(v);
    if (v.startsWith(" ")) {
      if (abortRef.current) abortRef.current.abort();
      setResults([]);
      setShow(false);
      setSearching(false);
      return;
    }
    const trimmed = v.trim();
    if (!trimmed || trimmed.length < SEARCH_MIN_CHARS) {
      if (abortRef.current) abortRef.current.abort();
      setResults([]);
      setShow(false);
      setSearching(false);
      return;
    }
    // Exact barcode hit → add instantly, no dropdown dwell (scanner guns send full code + Enter).
    const exact = catalog.find((p) => (p.barcode ?? "") === trimmed) as unknown as Product | undefined;
    if (exact && !exact.is_loose && !isOutOfStock(exact)) {
      add(exact);
      return;
    }
    const local = catalog
      .filter((p) => p.name.toLowerCase().includes(trimmed.toLowerCase()) || (p.barcode ?? "").includes(trimmed))
      .slice(0, 10) as unknown as Product[];
    setResults(local);
    setShow(true);
  }, [catalog, add, setSearchQuery]);

  const handleDebouncedSearch = useCallback((trimmed: string) => {
    if (!trimmed || trimmed.length < SEARCH_MIN_CHARS || trimmed.startsWith(" ")) {
      setResults([]);
      setShow(false);
      return;
    }
    const local = catalog
      .filter((p) => p.name.toLowerCase().includes(trimmed.toLowerCase()) || (p.barcode ?? "").includes(trimmed))
      .slice(0, 10) as unknown as Product[];
    void doSearchApi(trimmed, local);
  }, [catalog, doSearchApi]);

  const handleClear = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setResults([]);
    setShow(false);
    setSearching(false);
  }, []);

  const handleFocusSearch = useCallback((q: string) => {
    if (q.startsWith(" ")) return;
    const trimmed = q.trim();
    if (!trimmed || trimmed.length < SEARCH_MIN_CHARS) return;
    if (results.length > 0) {
      setShow(true);
      return;
    }
    const local = catalog
      .filter((p) => p.name.toLowerCase().includes(trimmed.toLowerCase()) || (p.barcode ?? "").includes(trimmed))
      .slice(0, 10) as unknown as Product[];
    setResults(local);
    setShow(true);
    void doSearchApi(trimmed, local);
  }, [catalog, doSearchApi, results.length]);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  useEffect(() => {
    if (show && results.length > 0) setActiveIndex(0);
    else setActiveIndex(-1);
  }, [show, results]);

  const moveActive = useCallback((delta: 1 | -1) => {
    setActiveIndex((prev) => {
      if (results.length === 0) return -1;
      const next = prev < 0 ? 0 : (prev + delta + results.length) % results.length;
      requestAnimationFrame(() => {
        const el = listRef.current?.querySelector(`[data-index="${next}"]`);
        el?.scrollIntoView({ block: "nearest" });
      });
      return next;
    });
  }, [results.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "F2") {
        e.preventDefault();
        (e.currentTarget as HTMLInputElement)?.select?.();
        return;
      }
      if (!show || results.length === 0) {
        if (e.key === "ArrowDown" && results.length > 0) {
          e.preventDefault();
          setShow(true);
        } else if (e.key === "Enter") {
          // Scanner fallback: full barcode + Enter with no dropdown yet → exact match add.
          const q = (e.currentTarget as HTMLInputElement)?.value?.trim() ?? "";
          if (q) {
            const exact = catalog.find((p) => (p.barcode ?? "") === q) as unknown as Product | undefined;
            if (exact && !exact.is_loose && !isOutOfStock(exact)) {
              e.preventDefault();
              add(exact);
            }
          }
        }
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveActive(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        moveActive(-1);
      } else if (e.key === "Enter") {
        if (activeIndex >= 0 && activeIndex < results.length) {
          e.preventDefault();
          add(results[activeIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShow(false);
        setActiveIndex(-1);
      }
    },
    [show, results, activeIndex, add, catalog, moveActive]
  );

  return {
    searchQuery,
    results,
    show,
    setShow,
    activeIndex,
    setActiveIndex,
    searching,
    listRef,
    add,
    handleImmediate,
    handleDebouncedSearch,
    handleClear,
    handleFocusSearch,
    handleKeyDown,
  };
}
