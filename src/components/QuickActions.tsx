"use client";
import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { generateReceiptHTML } from "@/lib/print";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Zap, Printer } from "lucide-react";

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
      unit: item.isCustom ? item.unit : `${item.quantity || item.weight}`,
      lineTotal: item.lineTotal,
    }));
    const html = generateReceiptHTML(
      orderItems,
      grandTotal,
      discount,
      undefined,
      `ORD-${Date.now().toString(36).toUpperCase()}`,
    );
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.print();
    }
  };

  return (
    <Card className="py-0 gap-0">
      <CardHeader className="py-3 flex-row items-center gap-2">
        <CardTitle className="flex items-center gap-1 text-sm">
          <Zap className="w-4 h-4 text-amber-500" /> Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pb-5">
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

        <div className="grid grid-cols-2 gap-2.5">
          <Button
            variant="secondary"
            onClick={() => setShowDisc((v) => !v)}
            className="h-9 justify-center gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-100 dark:border-amber-800"
          >
            <Badge
              variant="outline"
              className="bg-white text-amber-800 border-amber-200 text-[10px]"
            >
              Shift + D
            </Badge>
            Discount
          </Button>

          <Button
            variant="secondary"
            onClick={holdOrder}
            className="h-9 justify-center gap-1.5 bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-100 dark:border-blue-800"
          >
            <Badge
              variant="outline"
              className="bg-white text-blue-800 border-blue-200 text-[10px]"
            >
              Shift + H
            </Badge>
            Hold Bill
          </Button>

          <Button
            variant="secondary"
            onClick={openCustomModal}
            className="h-9 justify-center gap-1.5 bg-orange-100 hover:bg-orange-200 text-orange-900 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-100 dark:border-orange-800"
          >
            <Badge
              variant="outline"
              className="bg-white text-orange-800 border-orange-200 text-[10px]"
            >
              Shift + X
            </Badge>
            Custom Item
          </Button>

          <Button
            variant="outline"
            onClick={handlePrintBill}
            className="h-9 justify-center gap-1.5"
          >
            <Badge variant="outline" className="text-[10px]">
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
