"use client";

import { useEffect, useRef } from "react";
import { Search } from "lucide-react";

/**
 * Billing-only compact search trigger (kiosk).
 * Icon-only button — all product search lives in the F2 spotlight palette.
 * Listens for `focus-search` so palette close / held-resume lands here.
 */
export default function ProductSearchTrigger() {
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const h = () => btnRef.current?.focus();
    window.addEventListener("focus-search", h);
    return () => window.removeEventListener("focus-search", h);
  }, []);

  const open = () => window.dispatchEvent(new CustomEvent("open-search-palette"));

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={open}
      title="Search products (F2)"
      aria-label="Search products (F2)"
      className="shrink-0 w-9 h-9 rounded-full border bg-card shadow-sm flex items-center justify-center text-muted-foreground transition-all hover:text-primary hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-95"
    >
      <Search className="w-4 h-4" aria-hidden />
    </button>
  );
}
