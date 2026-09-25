"use client";

import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { formatINR } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BadgePercent, Pause, Plus } from "lucide-react";

/**
 * Merged totals + actions footer for kiosk.
 * One dominant Pay button showing the amount; secondary actions are
 * neutral (no rainbow) to reduce visual noise during long shifts.
 */
export default function PosPayFooter() {
  const items = useCartStore((s) => s.items);
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

  const doDisc = () => {
    const n = parseFloat(val);
    if (!isNaN(n) && n >= 0) applyDiscount(n);
    setShowDisc(false);
    setVal("");
  };

  return (
    <Card className="py-0 gap-0 rounded-2xl border overflow-hidden shrink-0">
      <CardContent className="p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-muted-foreground font-medium">
            {count} {count === 1 ? "item" : "items"}
            {discount > 0 && <span className="text-primary font-semibold"> • −{formatINR(discount)} off</span>}
          </span>
          <span className="text-[13px] text-muted-foreground font-medium">
            Total <span className="text-foreground font-black text-[20px] tabular-nums tracking-tight ml-1">{formatINR(grand)}</span>
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
          >
            <BadgePercent className="w-4 h-4" /> Discount
          </Button>
          <Button variant="outline" onClick={holdOrder} className="h-12 rounded-xl text-[13px] font-semibold gap-1.5">
            <Pause className="w-4 h-4" /> Hold
          </Button>
          <Button variant="outline" onClick={openCustomModal} className="h-12 rounded-xl text-[13px] font-semibold gap-1.5">
            <Plus className="w-4 h-4" /> Custom
          </Button>
        </div>

        <Button onClick={openPaymentModal} disabled={empty} className="w-full h-16 rounded-2xl text-[18px] font-bold gap-2">
          {empty ? "Payment" : `Pay ${formatINR(grand)}`}
        </Button>
      </CardContent>
    </Card>
  );
}
