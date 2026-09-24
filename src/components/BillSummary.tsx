"use client";
import { useState, useEffect } from "react";
import { useCartStore } from "@/store/cartStore";
import { formatINR } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Receipt } from "lucide-react";

export default function BillSummary() {
  const { items, discount, calculateGrandTotal, hasHydrated } = useCartStore();
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);
  const shouldShow = hasHydrated && hasMounted;
  const displayItems = shouldShow ? items : [];
  const displayDiscount = shouldShow ? discount : 0;
  const subtotal = displayItems.reduce((s, i) => s + i.lineTotal, 0);
  const grand = shouldShow ? calculateGrandTotal() : 0;
  const totalQty = displayItems.reduce((s, i) => s + (i.quantity || 0), 0);

  return (
    <Card className="py-0 gap-0 rounded-xl shadow-sm border overflow-hidden">
      <CardHeader className="py-3 px-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <Receipt className="w-3.5 h-3.5" />
          </span>
          Bill Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 text-sm px-4">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-[13px]">Total Items</span>
          <Badge variant="secondary" className="rounded-full" suppressHydrationWarning>{displayItems.length}</Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-[13px]">Total Quantity</span>
          <Badge variant="secondary" className="rounded-full" suppressHydrationWarning>{totalQty || displayItems.length}</Badge>
        </div>
        <div className="flex justify-between font-medium py-2 items-center">
          <span className="text-[13px]">Sub Total</span>
          <span className="font-bold" suppressHydrationWarning>{formatINR(subtotal)}</span>
        </div>
        {displayDiscount > 0 && (
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900 rounded-lg px-2.5 py-2 -mx-1">
            <span className="font-medium">Discount</span>
            <span className="font-bold" suppressHydrationWarning>- {formatINR(displayDiscount)}</span>
          </div>
        )}
      </CardContent>
      <Separator />
      <CardFooter className="bg-emerald-600 dark:bg-emerald-600 text-white border-0 py-3.5 px-4 flex items-center justify-between">
        <span className="font-bold text-white text-sm">Grand Total</span>
        <span className="font-black text-white text-xl tracking-tight" suppressHydrationWarning>
          {formatINR(grand)}
        </span>
      </CardFooter>
    </Card>
  );
}
