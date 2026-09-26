"use client";

import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { formatINR } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { BadgePercent, Pause, Plus } from "lucide-react";

/**
 * Merged totals + actions footer for kiosk.
 * One dominant Pay button showing the amount; secondary actions are
 * neutral (no rainbow) to reduce visual noise during long shifts.
 */
export default function PosPayFooter() {
  const items = useCartStore((s) => s.items);
  const heldOrders = useCartStore((s) => s.heldOrders);
  const discount = useCartStore((s) => s.discount);
  const applyDiscount = useCartStore((s) => s.applyDiscount);
  const holdOrder = useCartStore((s) => s.holdOrder);
  const openCustomModal = useCartStore((s) => s.openCustomModal);
  const openPaymentModal = useCartStore((s) => s.openPaymentModal);
  const calculateGrandTotal = useCartStore((s) => s.calculateGrandTotal);

  const [showDisc, setShowDisc] = useState(false);
  const [val, setVal] = useState("");

  const grand = calculateGrandTotal();
  const count = items.length;
  const empty = count === 0;
  const holdDisabled = empty && heldOrders.length === 0;

  const doDisc = () => {
    const n = parseFloat(val);
    if (!isNaN(n) && n >= 0) applyDiscount(n);
    setShowDisc(false);
    setVal("");
  };

  const handleHold = () => {
    // Empty cart → show held list instead of parking an empty bill.
    if (items.length === 0) {
      window.dispatchEvent(new CustomEvent("open-held-bills"));
      return;
    }
    holdOrder();
  };

  return (
    <Card className="py-0 gap-0 rounded-2xl border overflow-hidden shrink-0">
      <CardContent className="p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-muted-foreground font-medium">
            {count} {count === 1 ? "item" : "items"}
            {discount > 0 && <span className="text-primary font-semibold"> • −{formatINR(discount)} off</span>}
            {heldOrders.length > 0 && (
              <button
                type="button"
                className="text-amber-600 font-semibold hover:underline"
                title="View held bills"
                onClick={() => window.dispatchEvent(new CustomEvent("open-held-bills"))}
              > • {heldOrders.filter((h) => h.length > 0).length || heldOrders.length} held</button>
            )}
          </span>
          <span className="text-[13px] text-muted-foreground font-medium">
            Total <span className="text-foreground font-black text-[24px] tabular-nums tracking-tight ml-1">{formatINR(grand)}</span>
          </span>
        </div>

        {showDisc && (
          <div className="flex gap-2">
            <Input
              type="number"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder="Discount ₹"
              className="flex-1 h-11 text-[15px]"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && doDisc()}
            />
            <Button onClick={doDisc} className="h-11 px-5">
              Apply
            </Button>
            <Button variant="ghost" className="h-11 w-11" onClick={() => setShowDisc(false)}>
              ✕
            </Button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            onClick={() => setShowDisc((v) => !v)}
            className="h-12 rounded-xl text-[13px] font-semibold gap-1.5"
            title="Discount (Shift+D)"
          >
            <BadgePercent className="w-4 h-4" /> Discount
          </Button>
          <Button variant="outline" onClick={handleHold} disabled={holdDisabled} className="h-12 rounded-xl text-[13px] font-semibold gap-1.5" title={empty ? "View held bills (F4)" : "Hold order (F4)"}>
            <Pause className="w-4 h-4" /> Hold{heldOrders.length > 0 ? ` (${heldOrders.length})` : ""}
            <Kbd className="hidden xl:inline-flex ml-1">F4</Kbd>
          </Button>
          <Button variant="outline" onClick={openCustomModal} className="h-12 rounded-xl text-[13px] font-semibold gap-1.5" title="Custom item (Shift+X)">
            <Plus className="w-4 h-4" /> Custom
          </Button>
        </div>

        <Button onClick={openPaymentModal} disabled={empty} className="w-full h-[68px] rounded-2xl text-[19px] font-bold gap-2" title="Pay (F9)">
          {empty ? "Payment" : `Pay ${formatINR(grand)}`}
          {!empty && <Kbd className="hidden xl:inline-flex ml-1 border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground">F9</Kbd>}
        </Button>
      </CardContent>
    </Card>
  );
}
