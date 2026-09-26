"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useProductSearch } from "@/hooks/useProductSearch";
import { SEARCH_MIN_CHARS } from "@/components/SearchBox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { formatINR } from "@/lib/utils";
import { isLowStock, isOutOfStock } from "@/lib/stock";
import { Loader2, Search } from "lucide-react";

const LISTBOX_ID = "pos-palette-listbox";
const optionId = (idx: number) => `pos-palette-opt-${idx}`;

/**
 * Billing-only spotlight search (F2) — macOS Spotlight style.
 * Single floating bar centered on screen with dim backdrop; results attach
 * below inside the same surface. Select/Esc closes and returns focus to
 * the inline hero box. Shared logic via useProductSearch — admin/inventory
 * search boxes are untouched.
 */
export default function SearchPalette() {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const closeReturnFocus = useCallback(() => {
    setOpen(false);
    // Land back in the inline hero box (it mirrors the query).
    setTimeout(() => window.dispatchEvent(new CustomEvent("focus-search")), 60);
  }, []);

  const {
    searchQuery,
    results,
    show,
    activeIndex,
    setActiveIndex,
    searching,
    listRef,
    add,
    handleImmediate,
    handleDebouncedSearch,
    handleKeyDown,
  } = useProductSearch({ onAdd: closeReturnFocus });

  useEffect(() => {
    const h = () => {
      setOpen(true);
      // Focus after the dialog mounts.
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select?.();
      }, 60);
    };
    window.addEventListener("open-search-palette", h);
    return () => window.removeEventListener("open-search-palette", h);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = (v: string) => {
    handleImmediate(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = v.trim();
    if (
      !trimmed ||
      trimmed.length < SEARCH_MIN_CHARS ||
      trimmed.startsWith(" ")
    )
      return;
    debounceRef.current = setTimeout(() => handleDebouncedSearch(trimmed), 300);
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Palette-level Esc: dropdown already closed → close the palette.
    if (e.key === "Escape" && (!show || results.length === 0)) {
      e.preventDefault();
      e.stopPropagation();
      closeReturnFocus();
      return;
    }
    // Dropdown open + Esc → close the list only, keep the palette.
    const listOpen = show && results.length > 0;
    handleKeyDown(e);
    if (e.key === "Escape" && listOpen) e.stopPropagation();
  };

  const hasQuery = searchQuery.trim().length > 0;
  const showResults = searching || results.length > 0 || hasQuery;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) closeReturnFocus();
        else setOpen(true);
      }}
    >
      <DialogContent
        className="sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl border bg-popover/95 shadow-2xl backdrop-blur-xl"
        style={{
          top: "20vh",
          transform: "translate(0, 0)",
          translate: "-50% 0",
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Search products</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-3 px-5 h-[68px]">
          {searching ? (
            <Loader2
              className="w-6 h-6 animate-spin text-muted-foreground shrink-0"
              aria-hidden
            />
          ) : (
            <Search
              className="w-6 h-6 text-muted-foreground shrink-0"
              aria-hidden
            />
          )}
          <Input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Scan barcode or type product name..."
            className="flex-1 border-0 shadow-none focus-visible:ring-0 h-full text-xl bg-transparent dark:bg-transparent px-0"
            role="combobox"
            aria-expanded={show}
            aria-controls={LISTBOX_ID}
            aria-activedescendant={
              activeIndex >= 0 && activeIndex < results.length
                ? optionId(activeIndex)
                : undefined
            }
            autoComplete="off"
          />
        </div>

        {showResults && (
          <div className="border-t">
            <Command shouldFilter={false} className="bg-transparent">
              <CommandList
                ref={listRef}
                id={LISTBOX_ID}
                role="listbox"
                aria-label="Product suggestions"
                className="max-h-[45vh]"
              >
                {searching && results.length === 0 ? (
                  <div
                    className="py-8 text-center text-sm text-muted-foreground"
                    role="status"
                  >
                    Searching…
                  </div>
                ) : results.length > 0 ? (
                  <CommandGroup className="p-2">
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
                        className={`flex justify-between items-center gap-3 py-3 px-3 rounded-xl aria-selected:bg-accent ${activeIndex === idx ? "bg-accent text-accent-foreground" : ""}`}
                      >
                        <span className="text-[16px] font-semibold flex items-center gap-2 min-w-0 flex-1">
                          <span className="truncate">{p.name}</span>
                          <Badge
                            variant="secondary"
                            className="text-xs shrink-0"
                          >
                            {p.category}
                          </Badge>
                          {p.stockQuantity != null &&
                            !isOutOfStock(p) &&
                            !isLowStock(p) && (
                              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                                {p.stockQuantity} left
                              </span>
                            )}
                          {isOutOfStock(p) && (
                            <Badge
                              variant="destructive"
                              className="text-xs shrink-0"
                            >
                              Out
                              {typeof p.stockQuantity === "number"
                                ? ` • ${p.stockQuantity}`
                                : ""}
                            </Badge>
                          )}
                          {!isOutOfStock(p) && isLowStock(p) && (
                            <Badge className="text-xs shrink-0 bg-amber-100 text-amber-800 border-amber-200">
                              Low • {p.stockQuantity}
                            </Badge>
                          )}
                        </span>
                        <span className="text-[17px] font-extrabold tabular-nums text-primary shrink-0 ml-2">
                          {p.is_loose
                            ? `${formatINR(p.rate_per_kg || 0)}/kg`
                            : formatINR(p.price || 0)}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : (
                  <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
                    No products found for &ldquo;{searchQuery.trim()}&rdquo;
                  </CommandEmpty>
                )}
              </CommandList>
            </Command>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
