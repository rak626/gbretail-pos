"use client";
import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { useReceiptShop } from "@/hooks/useReceiptShop";
import { generateReceiptHTML, printReceiptHTML } from "@/lib/print";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Printer, ArrowUp } from "lucide-react";

export default function QuickActions() {
  const {
    items,
    discount,
    holdOrder,
    openCustomModal,
    applyDiscount,
    calculateGrandTotal,
  } = useCartStore();
  const [showDisc, setShowDisc] = useState(false);
  const [val, setVal] = useState("");
  const receiptShop = useReceiptShop();

  const doDisc = () => {
    const n = parseFloat(val);
    if (!isNaN(n) && n >= 0) applyDiscount(n);
    setShowDisc(false);
    setVal("");
  };

  const handlePrintBill = () => {
    const grandTotal = calculateGrandTotal();
    const orderItems = items.map((item) => ({
      name: item.name,
      qty: item.isCustom ? String(item.unit) : item.is_loose || item.weight ? `${item.weight ?? 0}` : `${item.quantity ?? 1}`,
      quantity: item.quantity ?? null,
      weight: item.weight ?? null,
      price: item.price,
      perUnit: item.isCustom ? item.unit : item.is_loose || item.weight ? "kg" : item.unit || "pcs",
      unit: item.unit,
      isCustom: item.isCustom,
      lineTotal: item.lineTotal,
    }));
    // Manual pre-bill print: explicitly unconfirmed (no server number invented).
    const html = generateReceiptHTML(
      orderItems,
      grandTotal,
      discount,
      undefined,
      `DRAFT — NOT SAVED`,
      receiptShop,
    );
    printReceiptHTML(html);
  };

  return (
    <Card className="py-0 gap-0 rounded-xl shadow-sm border">
      <CardContent className="space-y-2 p-2.5">
        {showDisc && (
          <div className="flex gap-2">
            <Input
              type="number"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder="Discount ₹"
              className="flex-1"
            />
            <Button onClick={doDisc} size="sm">
              Apply
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDisc(false)}
            >
              ✕
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setShowDisc((v) => !v)}
            className="flex-1 min-w-0 h-10 justify-center gap-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-100 dark:border-amber-800 whitespace-nowrap"
          >
            <Badge
              variant="outline"
              className="bg-white text-amber-800 border-amber-200 text-[10px] rounded-full gap-0.5 px-1.5 py-0"
            >
              <ArrowUp className="w-2.5 h-2.5" /> D
            </Badge>
            Discount
          </Button>

          <Button
            variant="secondary"
            onClick={holdOrder}
            className="flex-1 min-w-0 h-10 justify-center gap-1.5 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-100 dark:border-blue-800 whitespace-nowrap"
          >
            <Badge
              variant="outline"
              className="bg-white text-blue-800 border-blue-200 text-[10px] rounded-full gap-0.5 px-1.5 py-0"
            >
              <ArrowUp className="w-2.5 h-2.5" /> H
            </Badge>
            Hold Bill
          </Button>

          <Button
            variant="secondary"
            onClick={openCustomModal}
            className="flex-1 min-w-0 h-10 justify-center gap-1.5 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-900 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-100 dark:border-orange-800 whitespace-nowrap"
          >
            <Badge
              variant="outline"
              className="bg-white text-orange-800 border-orange-200 text-[10px] rounded-full gap-0.5 px-1.5 py-0"
            >
              <ArrowUp className="w-2.5 h-2.5" /> X
            </Badge>
            Custom Item
          </Button>

          <Button
            variant="outline"
            onClick={handlePrintBill}
            className="flex-1 min-w-0 h-10 justify-center gap-1.5 rounded-xl whitespace-nowrap"
          >
            <Badge variant="outline" className="text-[10px] rounded-full px-1.5 py-0">
              P
            </Badge>
            <Printer className="w-3 h-3" />
            Print Bill
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
