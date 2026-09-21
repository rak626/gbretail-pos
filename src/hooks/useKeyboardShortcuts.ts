"use client";

import { useEffect, useCallback } from "react";
import { SHORTCUTS, findShortcut, BLOCKED_KEYS } from "@/config/shortcuts.config";
import { useCartStore } from "@/store/cartStore";

export function useKeyboardShortcuts() {
  const store = useCartStore();

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
          store.applyDiscount(0);
          break;
        case "Custom Item":
          store.openCustomModal();
          break;
        case "UPI":
          store.openPaymentModal();
          break;
        case "Khata Lookup":
          store.openPaymentModal();
          break;
        case "Print":
          store.openPaymentModal();
          break;
        case "Refresh":
          window.location.reload();
          break;
        case "Cash":
          store.openPaymentModal();
          break;
        case "Khata":
          store.openPaymentModal();
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
