export const SHORTCUTS = {
  search: { key: "KeyS", shift: false, label: "Search" } as const,
  searchBarcode: { key: "KeyB", shift: true, label: "Barcode Scan" } as const,
  selectItem: { key: "Enter", shift: false, label: "Select" } as const,
  qtyUp: { key: "Equal", shift: false, label: "Qty +" } as const,
  qtyDown: { key: "Minus", shift: false, label: "Qty -" } as const,
  cash: { key: "k", shift: false, label: "Cash" } as const,
  khata: { key: "l", shift: false, label: "Khata" } as const,
  print: { key: "p", shift: false, label: "Print" } as const,
  searchFocus: { key: "KeyS", shift: true, label: "Search Focus" } as const,
  clearCart: { key: "KeyC", shift: true, label: "Clear Cart" } as const,
  holdOrder: { key: "KeyH", shift: true, label: "Hold Order" } as const,
  addDiscount: { key: "KeyD", shift: true, label: "Add Discount" } as const,
  addCustomItem: { key: "KeyX", shift: true, label: "Custom Item" } as const,
  upiPayment: { key: "KeyU", shift: true, label: "UPI" } as const,
  khataLookup: { key: "KeyL", shift: true, label: "Khata Lookup" } as const,
  refresh: { key: "KeyR", shift: true, label: "Refresh" } as const,
} as const;

export const BLOCKED_KEYS = new Set([
  "Escape", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  "ControlLeft", "ControlRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight",
  "ShiftLeft", "ShiftRight", "Control", "Alt", "Meta", "Shift", "Dead",
  "Home", "End", "PageUp", "PageDown",
]);

export type ShortcutAction = keyof typeof SHORTCUTS;

export function findShortcut(key: string, shift: boolean): typeof SHORTCUTS[keyof typeof SHORTCUTS] | null {
  for (const [actionName, shortcut] of Object.entries(SHORTCUTS)) {
    if (shortcut.key === key && shortcut.shift === shift) {
      return shortcut;
    }
  }
  return null;
}

export function validateShortcuts(): { valid: boolean; conflicts: string[] } {
  const seen = new Map<string, string>();
  const conflicts: string[] = [];

  for (const [action, shortcut] of Object.entries(SHORTCUTS)) {
    const identifier = `${shortcut.key}-${shortcut.shift}`;
    if (seen.has(identifier)) {
      conflicts.push(`${action} conflicts with ${seen.get(identifier)}`);
    } else {
      seen.set(identifier, action);
    }
  }

  return { valid: conflicts.length === 0, conflicts };
}
