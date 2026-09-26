"use client";

import { useEffect, useCallback } from "react";
import { SHORTCUTS, findShortcut, BLOCKED_KEYS } from "@/config/shortcuts.config";
import { useCartStore } from "@/store/cartStore";

export function useKeyboardShortcuts() {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;

      const key = e.code;
      const shift = e.shiftKey;

      const shortcut = findShortcut(key, shift);
      if (!shortcut) return;

      if (BLOCKED_KEYS.has(key) && !shift) return;

      e.preventDefault();

      // Use fresh state on every keypress — no stale closure over store.
      const store = useCartStore.getState();
      switch (shortcut.label) {
        case "Search Focus":
          window.dispatchEvent(new CustomEvent("focus-search"));
          break;
        case "Barcode Scan":
          window.dispatchEvent(new CustomEvent("focus-barcode"));
          break;
        case "Clear Cart":
          store.clearCart();
          break;
        case "Hold Order":
          store.holdOrder();
          break;
        case "Add Discount":
          // Focus discount input instead of no-op applyDiscount(0).
          window.dispatchEvent(new CustomEvent("focus-discount"));
          break;
        case "Custom Item":
          store.openCustomModal();
          break;
        case "UPI":
        case "Khata Lookup":
        case "Print":
        case "Cash":
        case "Khata":
          // Payment modal lets user pick final method; hint it via event detail.
          window.dispatchEvent(new CustomEvent("open-payment", { detail: shortcut.label }));
          store.openPaymentModal();
          break;
        case "Refresh":
          window.location.reload();
          break;
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
