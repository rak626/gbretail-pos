"use client";

import { useCallback, useEffect, useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { formatINR } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { ReceiptText, Trash2, Undo2 } from "lucide-react";

/**
 * Kiosk held-bills viewer — list-only resume, no store migration.
 * Open via `open-held-bills` window event (Hold button when cart is empty,
 * F4 / Shift+H with empty cart). Esc closes via Dialog default.
 */
export default function HeldBillsDialog() {
  const [open, setOpen] = useState(false);
  const heldOrders = useCartStore((s) => s.heldOrders);
  const cartCount = useCartStore((s) => s.items.length);
  const resumeOrderByIndex = useCartStore((s) => s.resumeOrderByIndex);
  const discardHeldOrder = useCartStore((s) => s.discardHeldOrder);
  const clearHeldOrders = useCartStore((s) => s.clearHeldOrders);

  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener("open-held-bills", h);
    return () => window.removeEventListener("open-held-bills", h);
  }, []);

  const resume = useCallback(
    (idx: number) => {
      resumeOrderByIndex(idx);
      setOpen(false);
      // Return focus to scan so the cashier keeps billing without a mouse.
      setTimeout(() => window.dispatchEvent(new CustomEvent("focus-search")), 60);
    },
    [resumeOrderByIndex]
  );

  // Legacy empty parks (held [] before the empty-guard) — hide, offer one-tap cleanup.
  const visible = heldOrders
    .map((items, idx) => ({ items, idx }))
    .filter(({ items }) => items.length > 0);
  const ghostCount = heldOrders.length - visible.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptText className="w-4 h-4" />
            Held bills
            {visible.length > 0 && (
              <Badge variant="secondary" className="rounded-full">
                {visible.length}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {cartCount > 0
              ? "Resume merges into the current cart."
              : "Pick a bill to resume billing."}
          </DialogDescription>
        </DialogHeader>

        {visible.length === 0 ? (
          <div className="py-8 text-center">
            <div className="text-sm font-semibold">No held bills</div>
            <div className="text-xs text-muted-foreground mt-1">
              {ghostCount > 0
                ? `${ghostCount} empty ${ghostCount === 1 ? "entry" : "entries"} hidden — clear them below.`
                : "Hold the current bill with F4 to park it here."}
            </div>
            {ghostCount > 0 && (
              <Button variant="outline" size="sm" className="mt-4" onClick={clearHeldOrders}>
                Clear empty entries
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-2 max-h-[50vh] overflow-auto">
            {visible.map(({ items, idx }) => {
              const total = items.reduce((sum, it) => sum + (it.lineTotal || 0), 0);
              const preview = items
                .slice(0, 2)
                .map((it) => it.name)
                .join(" • ");
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-xl border bg-card p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold">Bill {idx + 1}</span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {items.length} {items.length === 1 ? "item" : "items"}
                      </span>
                      <span className="text-[14px] font-extrabold tabular-nums ml-auto">
                        {formatINR(total)}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {preview}
                      {items.length > 2 ? ` +${items.length - 2} more` : ""}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="h-9 shrink-0"
                    onClick={() => resume(idx)}
                    title="Resume this bill"
                  >
                    <Undo2 className="w-3.5 h-3.5" /> Resume
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => discardHeldOrder(idx)}
                    aria-label={`Delete held bill ${idx + 1}`}
                    title="Delete held bill"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {visible.length > 0 && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted-foreground">
              <Kbd>F4</Kbd> holds current • <Kbd>Esc</Kbd> closes
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={clearHeldOrders}
            >
              Clear all
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
