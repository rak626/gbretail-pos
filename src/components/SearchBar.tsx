"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useCartStore } from "@/store/cartStore";
import { useCatalogStore } from "@/store/catalogStore";
import type { Product } from "@/db/database";
import { formatINR } from "@/lib/utils";
import { isLowStock, isOutOfStock } from "@/lib/stock";
import { fetchProducts } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import SearchBox, { SEARCH_MIN_CHARS } from "@/components/SearchBox";
import { Barcode } from "lucide-react";

const LISTBOX_ID = "pos-search-listbox";
const optionId = (idx: number) => `pos-search-opt-${idx}`;

export default function SearchBar({ size = "default" }: { size?: "default" | "hero" }) {
  const { searchQuery, setSearchQuery, openLooseModal, addItem } = useCartStore();
  const catalog = useCatalogStore((s) => s.products);
  const loadCatalog = useCatalogStore((s) => s.loadCatalog);
  useEffect(() => { loadCatalog(); }, [loadCatalog]);
  // 15" laptop: hero search grabs focus on mount so scanner + typing work instantly.
  useEffect(() => {
    if (size === "hero") {
      const t = setTimeout(() => ref.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [size]);
  const [results, setResults] = useState<Product[]>([]);
  const [show, setShow] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [searching, setSearching] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

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

  const handleImmediate = (v: string) => {
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
  };

  const handleDebouncedSearch = (trimmed: string) => {
    if (!trimmed || trimmed.length < SEARCH_MIN_CHARS || trimmed.startsWith(" ")) {
      setResults([]);
      setShow(false);
      return;
    }
    const local = catalog
      .filter((p) => p.name.toLowerCase().includes(trimmed.toLowerCase()) || (p.barcode ?? "").includes(trimmed))
      .slice(0, 10) as unknown as Product[];
    doSearchApi(trimmed, local);
  };

  const handleClear = () => {
    if (abortRef.current) abortRef.current.abort();
    setResults([]);
    setShow(false);
    setSearching(false);
  };

  const handleFocusSearch = (q: string) => {
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
    doSearchApi(trimmed, local);
  };

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  useEffect(() => {
    if (show && results.length > 0) setActiveIndex(0);
    else setActiveIndex(-1);
  }, [show, results]);

  const add = (p: Product) => {
    if (p.is_loose) openLooseModal({ ...p, price: p.rate_per_kg || 0, unit: "kg" } as Product);
    else addItem({ productId: p.id, name: p.name, price: p.price || 0, unit: "pcs", quantity: 1, lineTotal: p.price || 0, isCustom: false, is_loose: false, category: p.category, costPrice: (p as any).costPrice ?? 0 });
    setSearchQuery("");
    setResults([]);
    setShow(false);
  };

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
        setActiveIndex((prev) => {
          const next = prev < results.length - 1 ? prev + 1 : 0;
          requestAnimationFrame(() => {
            const el = listRef.current?.querySelector(`[data-index="${next}"]`);
            el?.scrollIntoView({ block: "nearest" });
          });
          return next;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = prev > 0 ? prev - 1 : results.length - 1;
          requestAnimationFrame(() => {
            const el = listRef.current?.querySelector(`[data-index="${next}"]`);
            el?.scrollIntoView({ block: "nearest" });
          });
          return next;
        });
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
    [show, results, activeIndex, add]
  );

  return (
    <Popover
      open={show}
      onOpenChange={(open) => {
        if (open && (!searchQuery.trim() || searchQuery.trim().length < SEARCH_MIN_CHARS || searchQuery.startsWith(" "))) return;
        setShow(open);
      }}
      modal={false}
    >
      <PopoverTrigger render={<div className="w-full" />} nativeButton={false}>
          <SearchBox
            placeholder="Scan barcode or type product name..."
            leftIcon={<Barcode className="w-5 h-5" />}
            value={searchQuery}
            onValueChange={handleImmediate}
            onSearch={handleDebouncedSearch}
            onClear={handleClear}
            onFocusSearch={handleFocusSearch}
            inputRef={ref}
            onKeyDown={handleKeyDown}
            size={size}
            loading={searching}
            combobox={{
              expanded: show,
              controlsId: LISTBOX_ID,
              activeId: activeIndex >= 0 && activeIndex < results.length ? optionId(activeIndex) : null,
            }}
          />
      </PopoverTrigger>
      <PopoverContent className="w-[var(--anchor-width)] p-0" align="start" sideOffset={6} initialFocus={false}>
        <Command shouldFilter={false} className="rounded-lg">
          <CommandList ref={listRef} id={LISTBOX_ID} role="listbox" aria-label="Product suggestions">
            {searching && results.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground" role="status">Searching…</div>
            ) : results.length > 0 ? (
              <CommandGroup>
                {results.map((p, idx) => (
                  <CommandItem
                    key={p.id}
                    id={optionId(idx)}
                    role="option"
                    value={p.name}
                    data-index={idx}
                    onSelect={() => add(p)}
                    onMouseMove={() => setActiveIndex(idx)}
                    data-selected={activeIndex === idx ? "true" : undefined}
                    aria-selected={activeIndex === idx}
                    className={`flex justify-between items-center gap-3 py-2.5 px-3 aria-selected:bg-accent ${activeIndex === idx ? "bg-accent text-accent-foreground" : ""}`}
                  >
                    <span className="text-sm font-medium flex items-center gap-2 min-w-0 flex-1">
                      <span className="truncate">{p.name}</span>
                      <Badge variant="secondary" className="text-[11px] shrink-0">{p.category}</Badge>
                      {p.stockQuantity != null && !isOutOfStock(p) && !isLowStock(p) && (
                        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{p.stockQuantity} left</span>
                      )}
                      {isOutOfStock(p) && <Badge variant="destructive" className="text-[11px] shrink-0">Out{typeof p.stockQuantity === "number" ? ` • ${p.stockQuantity}` : ""}</Badge>}
                      {!isOutOfStock(p) && isLowStock(p) && <Badge className="text-[11px] shrink-0 bg-amber-100 text-amber-800 border-amber-200">Low • {p.stockQuantity}</Badge>}
                    </span>
                    <span className="text-[15px] font-bold tabular-nums text-primary shrink-0 ml-2">{p.is_loose ? `${formatINR(p.rate_per_kg || 0)}/kg` : formatINR(p.price || 0)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : (
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                No products found for &ldquo;{searchQuery}&rdquo;
              </CommandEmpty>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
