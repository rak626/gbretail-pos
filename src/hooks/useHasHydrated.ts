"use client";
import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cartStore";

/**
 * Avoid hydration mismatch by gating render until persisted store rehydrated.
 * Replaces repeated `hasHydrated && hasMounted` boilerplate in 6 components.
 */
export function useHasHydrated(): boolean {
  const hasHydrated = useCartStore((s) => s.hasHydrated);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return hasHydrated && mounted;
}
