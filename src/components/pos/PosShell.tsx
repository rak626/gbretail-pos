"use client";

import PosTopStrip from "@/components/pos/PosTopStrip";

/**
 * Kiosk / cashier shell — no sidebar, slim top strip, touch-first.
 * The `kiosk` class scopes large touch targets + locked viewport so the
 * admin console keeps normal dense desktop sizing.
 */
export default function PosShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="kiosk h-screen flex flex-col bg-muted/40">
      <PosTopStrip />
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
