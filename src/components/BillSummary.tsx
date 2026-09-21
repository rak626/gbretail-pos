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
    <Card className="py-0 gap-0">
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-1 text-sm">
          <Receipt className="w-4 h-4 text-primary" />
          Bill Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Items</span>
          <Badge variant="secondary" suppressHydrationWarning>{displayItems.length}</Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Quantity</span>
          <Badge variant="secondary" suppressHydrationWarning>{totalQty || displayItems.length}</Badge>
        </div>
        <div className="flex justify-between font-medium pb-1">
          <span>Sub Total</span>
          <span className="font-bold" suppressHydrationWarning>{formatINR(subtotal)}</span>
        </div>
        {displayDiscount > 0 && (
          <div className="flex justify-between text-primary">
            <span>Discount</span>
            <span className="font-bold" suppressHydrationWarning>- {formatINR(displayDiscount)}</span>
          </div>
        )}
      </CardContent>
      <Separator />
      <CardFooter className="bg-primary/5 border-0 py-3 flex items-center justify-between">
        <span className="font-bold text-primary text-sm">Grand Total</span>
        <span className="font-black text-primary text-xl tracking-tight" suppressHydrationWarning>
          {formatINR(grand)}
        </span>
      </CardFooter>
    </Card>
  );
}
