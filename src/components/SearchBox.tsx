"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

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
  inputRef?: React.RefObject<HTMLInputElement | null>;
  disabled?: boolean;
  autoFocus?: boolean;
  variant?: "card" | "plain";
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
  inputRef: externalRef,
  disabled,
  autoFocus,
  variant = "card",
  onKeyDown,
}: SearchBoxProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue! : internalValue;

  const innerRef = useRef<HTMLInputElement>(null);
  const ref = (externalRef as React.RefObject<HTMLInputElement | null>) ?? innerRef;
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // focus-search shortcut same as product search
  useEffect(() => {
    const h = () => ref.current?.focus();
    window.addEventListener("focus-search", h);
    return () => window.removeEventListener("focus-search", h);
  }, [ref]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
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
      if (!trimmed || trimmed.length < 3) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        onClear?.();
        if (trimmed) onSearch("");
        return;
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSearch(trimmed);
        requestAnimationFrame(() => ref.current?.focus());
      }, debounceMs);
    },
    [onSearch, onClear, debounceMs, ref]
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
    if (trimmed.length < 3) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onClear?.();
      return;
    }
    // debounce non-empty >=3 chars
    triggerSearch(v);
  };

  const handleSearchClick = () => {
    if (value.startsWith(" ")) {
      onClear?.();
      return;
    }
    const trimmed = value.trim();
    if (!trimmed || trimmed.length < 3) {
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
    if (!trimmed || trimmed.length < 3) return;
    if (onFocusSearch) {
      onFocusSearch(trimmed);
    } else {
      onSearch(trimmed);
    }
  };

  const content = (
    <>
      {leftIcon && (
        <div className="w-7 h-7 rounded-md bg-primary/10 border flex items-center justify-center text-primary shrink-0 !min-h-0 !min-w-0">
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
          className="flex-1 border-0 shadow-none focus-visible:ring-0 h-7 !min-h-0 !min-w-0 text-sm"
          disabled={disabled}
          autoFocus={autoFocus}
        />
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0 !min-h-0 !min-w-0 h-7 w-7"
        onClick={handleSearchClick}
        aria-label="Search"
        type="button"
      >
        <Search className="w-3.5 h-3.5" />
      </Button>
    </>
  );

  if (variant === "plain") {
    return <div className="flex items-center gap-2 flex-1 min-w-0">{content}</div>;
  }

  return (
    <Card className="w-full py-0 border-primary/20 ring-1 ring-primary/5 rounded-xl shadow-sm">
      <CardContent className="p-1.5 flex flex-row items-center gap-2 !gap-2">{content}</CardContent>
    </Card>
  );
}
