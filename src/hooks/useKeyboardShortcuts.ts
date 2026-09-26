"use client";

import { useEffect, useCallback } from "react";
import { SHORTCUTS, findShortcut, BLOCKED_KEYS } from "@/config/shortcuts.config";
import { useCartStore } from "@/store/cartStore";

export function useKeyboardShortcuts() {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inField = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";

      // F-keys work everywhere (even inside search) — this is what the POS UI advertises.
      // F2 = focus scan/search, F3 = select customer, F4 = hold, F9 = pay, ? = shortcut help.
      if (e.key === "F2") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("focus-search"));
        return;
      }
      if (e.key === "F3") {
        e.preventDefault();
        useCartStore.getState().openAddCustomerModal();
        return;
      }
      if (e.key === "F4") {
        e.preventDefault();
        const s = useCartStore.getState();
        // Empty cart → view held bills instead of parking an empty one.
        if (s.items.length === 0 && s.heldOrders.length > 0) {
          window.dispatchEvent(new CustomEvent("open-held-bills"));
          return;
        }
        s.holdOrder();
        return;
      }
      if (e.key === "F9") {
        e.preventDefault();
        useCartStore.getState().openPaymentModal();
        return;
      }
      if ((e.key === "?" || (e.shiftKey && e.code === "Slash")) && !inField) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("open-shortcut-help"));
        return;
      }
      if (inField) return;

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
          if (store.items.length === 0 && store.heldOrders.length > 0) {
            window.dispatchEvent(new CustomEvent("open-held-bills"));
          } else {
            store.holdOrder();
          }
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
