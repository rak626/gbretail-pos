"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

/**
 * 15" laptop cheat-sheet — cashiers discover F2/F4/F9 without training.
 * Open via `?` key, keyboard icon in PosTopStrip, or `open-shortcut-help` event.
 */
const ROWS: Array<{ label: string; keys: string[] }> = [
  { label: "Focus scan / search", keys: ["F2"] },
  { label: "Navigate results + add", keys: ["↑", "↓", "Enter"] },
  { label: "Hold current order", keys: ["F4"] },
  { label: "Open payment", keys: ["F9"] },
  { label: "Discount", keys: ["Shift", "D"] },
  { label: "Custom item", keys: ["Shift", "X"] },
  { label: "Clear cart", keys: ["Shift", "C"] },
  { label: "Focus search", keys: ["Shift", "S"] },
  { label: "Close dropdown / dialog", keys: ["Esc"] },
  { label: "This help", keys: ["?"] },
];

export default function PosShortcutHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener("open-shortcut-help", h);
    return () => window.removeEventListener("open-shortcut-help", h);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Billing shortcuts</DialogTitle>
          <DialogDescription>15&quot; laptop — no mouse needed for a full bill.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          {ROWS.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 py-1 border-b last:border-0">
              <span className="text-[13px] text-muted-foreground">{row.label}</span>
              <KbdGroup>
                {row.keys.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </KbdGroup>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
