"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useCartStore } from "@/store/cartStore";
import { products as staticProducts } from "@/data/products";
import type { Product } from "@/db/database";
import { formatINR } from "@/lib/utils";
import { fetchProducts } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import SearchBox from "@/components/SearchBox";
import { Barcode } from "lucide-react";

export default function SearchBar() {
  const { searchQuery, setSearchQuery, openLooseModal, addItem } = useCartStore();
  const [results, setResults] = useState<Product[]>([]);
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const doSearchApi = useCallback(async (trimmed: string, local: Product[]) => {
    if (trimmed.startsWith(" ") || !trimmed || trimmed.length < 3) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const api = await fetchProducts({ search: trimmed, limit: 10 }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (api.length > 0) {
        setResults(api as unknown as Product[]);
      } else if (local.length === 0) {
        setResults([]);
      }
      setShow(true);
      requestAnimationFrame(() => ref.current?.focus());
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setShow(true);
    }
  }, []);

  const handleImmediate = (v: string) => {
    setSearchQuery(v);
    if (v.startsWith(" ")) {
      if (abortRef.current) abortRef.current.abort();
      setResults([]);
      setShow(false);
      return;
    }
    const trimmed = v.trim();
    if (!trimmed || trimmed.length < 3) {
      if (abortRef.current) abortRef.current.abort();
      setResults([]);
      setShow(false);
      return;
    }
    const local = staticProducts
      .filter((p) => p.name.toLowerCase().includes(trimmed.toLowerCase()) || (p.barcode ?? "").includes(trimmed))
      .slice(0, 10) as unknown as Product[];
    setResults(local);
    setShow(true);
    requestAnimationFrame(() => ref.current?.focus());
  };

  const handleDebouncedSearch = (trimmed: string) => {
    if (!trimmed || trimmed.length < 3 || trimmed.startsWith(" ")) {
      setResults([]);
      setShow(false);
      return;
    }
    const local = staticProducts
      .filter((p) => p.name.toLowerCase().includes(trimmed.toLowerCase()) || (p.barcode ?? "").includes(trimmed))
      .slice(0, 10) as unknown as Product[];
    doSearchApi(trimmed, local);
  };

  const handleClear = () => {
    if (abortRef.current) abortRef.current.abort();
    setResults([]);
    setShow(false);
  };

  const handleFocusSearch = (q: string) => {
    if (q.startsWith(" ")) return;
    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 3) return;
    if (results.length > 0) {
      setShow(true);
      return;
    }
    const local = staticProducts
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

  const add = (p: Product) => {
    if (p.is_loose) openLooseModal({ ...p, price: p.rate_per_kg || 0, unit: "kg" } as Product);
    else addItem({ productId: p.id, name: p.name, price: p.price || 0, unit: "pcs", quantity: 1, lineTotal: p.price || 0, isCustom: false, is_loose: false, category: p.category });
    setSearchQuery("");
    setResults([]);
    setShow(false);
  };

  return (
    <Popover
      open={show}
      onOpenChange={(open) => {
        if (open && (!searchQuery.trim() || searchQuery.trim().length < 3 || searchQuery.startsWith(" "))) return;
        setShow(open);
      }}
      modal={false}
    >
      <PopoverTrigger render={<div className="w-full" />} nativeButton={false}>
          <SearchBox
            placeholder="Search product or barcode..."
            leftIcon={<Barcode className="w-4 h-4" />}
            value={searchQuery}
            onValueChange={handleImmediate}
            onSearch={handleDebouncedSearch}
            onClear={handleClear}
            onFocusSearch={handleFocusSearch}
            inputRef={ref}
          />
      </PopoverTrigger>
      <PopoverContent className="w-[var(--anchor-width)] p-0" align="start" sideOffset={6}>
        <Command shouldFilter={false} className="rounded-lg">
          <CommandList>
            {results.length > 0 ? (
              <CommandGroup>
                {results.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={p.name}
                    onSelect={() => add(p)}
                    className="flex justify-between items-center py-2.5 px-3 aria-selected:bg-accent"
                  >
                    <span className="text-sm font-medium flex items-center gap-2 min-w-0">
                      <span className="truncate">{p.name}</span>
                      <Badge variant="secondary" className="text-xs shrink-0">{p.category}</Badge>
                    </span>
                    <span className="text-sm font-bold text-primary shrink-0 ml-2">{p.is_loose ? `${formatINR(p.rate_per_kg || 0)}/kg` : formatINR(p.price || 0)}</span>
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
