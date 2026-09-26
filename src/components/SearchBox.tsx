"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";

/** Spec default: start suggesting after 2 characters. */
export const SEARCH_MIN_CHARS = 2;

type ComboboxA11y = {
  /** Whether the suggestion dropdown is currently open */
  expanded: boolean;
  /** id of the listbox element showing suggestions */
  controlsId?: string;
  /** id of the highlighted option, if any */
  activeId?: string | null;
};

type SearchBoxProps = {
  placeholder?: string;
  leftIcon?: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onSearch: (query: string) => void;
  onClear?: () => void;
  onFocusSearch?: (query: string) => void;
  debounceMs?: number;
  /** Minimum trimmed characters before searching (default SEARCH_MIN_CHARS). */
  minChars?: number;
  /** Shows a spinner while suggestions are being fetched. */
  loading?: boolean;
  /** ARIA combobox wiring for dropdown usages (off for plain filters). */
  combobox?: ComboboxA11y;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  disabled?: boolean;
  autoFocus?: boolean;
  variant?: "card" | "plain";
  size?: "default" | "hero";
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
};

export default function SearchBox({
  placeholder = "Search...",
  leftIcon,
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  onSearch,
  onClear,
  onFocusSearch,
  debounceMs = 300,
  minChars = SEARCH_MIN_CHARS,
  loading = false,
  combobox,
  inputRef: externalRef,
  disabled,
  autoFocus,
  variant = "card",
  size = "default",
  onKeyDown,
}: SearchBoxProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue! : internalValue;

  const innerRef = useRef<HTMLInputElement>(null);
  const ref = (externalRef as React.RefObject<HTMLInputElement | null>) ?? innerRef;
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  // F2 pulse — visible "scan ready" feedback for the counter guy.
  const [pulse, setPulse] = useState(false);
  const pulseTimer = useRef<NodeJS.Timeout | null>(null);

  // focus-search shortcut same as product search
  // F2 / scanner guns dispatch focus-search or focus-barcode — both land here.
  useEffect(() => {
    const h = () => {
      ref.current?.focus();
      ref.current?.select?.();
      // Re-triggerable pulse: rapid F2 presses still flash.
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
      setPulse(true);
      pulseTimer.current = setTimeout(() => setPulse(false), 450);
    };
    window.addEventListener("focus-search", h);
    window.addEventListener("focus-barcode", h);
    return () => {
      window.removeEventListener("focus-search", h);
      window.removeEventListener("focus-barcode", h);
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
    };
  }, [ref]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
    };
  }, []);

  const triggerSearch = useCallback(
    (q: string) => {
      // ignore beginning space
      if (q.startsWith(" ")) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        onClear?.();
        return;
      }
      const trimmed = q.trim();
      if (!trimmed || trimmed.length < minChars) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        onClear?.();
        if (trimmed) onSearch("");
        return;
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSearch(trimmed);
      }, debounceMs);
    },
    [onSearch, onClear, debounceMs, minChars]
  );

  const handleChange = (v: string) => {
    if (!isControlled) setInternalValue(v);
    onValueChange?.(v);
    // ignore beginning space or blank string
    if (v.startsWith(" ") || !v.trim()) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onClear?.();
      if (v.trim()) onSearch("");
      else onSearch("");
      return;
    }
    const trimmed = v.trim();
    if (trimmed.length < minChars) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onClear?.();
      return;
    }
    // debounce non-empty query at/above minChars
    triggerSearch(v);
  };

  const handleSearchClick = () => {
    if (value.startsWith(" ")) {
      onClear?.();
      return;
    }
    const trimmed = value.trim();
    if (!trimmed || trimmed.length < minChars) {
      onClear?.();
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onSearch(trimmed);
    requestAnimationFrame(() => ref.current?.focus());
  };

  const handleFocus = () => {
    if (value.startsWith(" ")) return;
    const trimmed = value.trim();
    if (!trimmed || trimmed.length < minChars) return;
    if (onFocusSearch) {
      onFocusSearch(trimmed);
    } else {
      onSearch(trimmed);
    }
  };

  const content = (
    <>
      {leftIcon && (
        <div
          className={
            size === "hero"
              ? "w-10 h-10 rounded-xl bg-primary/10 border flex items-center justify-center text-primary shrink-0 !min-h-0 !min-w-0"
              : "w-7 h-7 rounded-md bg-primary/10 border flex items-center justify-center text-primary shrink-0 !min-h-0 !min-w-0"
          }
        >
          {leftIcon}
        </div>
      )}
      <div className="flex-1 relative flex items-center min-w-0">
        <Input
          ref={ref}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={
            size === "hero"
              ? "flex-1 border-0 shadow-none focus-visible:ring-0 h-10 !min-h-0 !min-w-0 text-[16px]"
              : "flex-1 border-0 shadow-none focus-visible:ring-0 h-7 !min-h-0 !min-w-0 text-sm"
          }
          disabled={disabled}
          autoFocus={autoFocus}
          role={combobox ? "combobox" : undefined}
          aria-autocomplete={combobox ? "list" : undefined}
          aria-expanded={combobox ? combobox.expanded : undefined}
          aria-controls={combobox?.controlsId}
          aria-activedescendant={combobox?.activeId ?? undefined}
        />
      </div>
      {size === "hero" ? (
        <Kbd className={`shrink-0 hidden sm:inline-flex transition-colors duration-200 ${pulse ? "bg-primary text-primary-foreground border-primary" : ""}`}>
          F2
        </Kbd>
      ) : null}
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0 !min-h-0 !min-w-0 h-7 w-7"
        onClick={handleSearchClick}
        aria-label={loading ? "Searching" : "Search"}
        type="button"
        disabled={disabled || loading}
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
            <span className="sr-only">Searching…</span>
          </>
        ) : (
          <Search className="w-3.5 h-3.5" />
        )}
      </Button>
    </>
  );

  if (variant === "plain") {
    return <div className="flex items-center gap-2 flex-1 min-w-0">{content}</div>;
  }

  if (size === "hero") {
    return (
      <div
        className={`w-full rounded-2xl border bg-card shadow-sm ring-1 transition-all duration-200 motion-safe:transition-all ${
          pulse
            ? "motion-safe:scale-[1.015] ring-2 ring-primary/50 shadow-md"
            : "ring-primary/10 focus-within:ring-2 focus-within:ring-primary/40 focus-within:shadow-md"
        }`}
      >
        <div className="px-3 py-2 flex flex-row items-center gap-2.5">{content}</div>
      </div>
    );
  }

  return (
    <Card className="w-full py-0 border-primary/20 ring-1 ring-primary/5 rounded-xl shadow-sm">
      <CardContent className="p-1.5 flex flex-row items-center gap-2 !gap-2">{content}</CardContent>
    </Card>
  );
}
