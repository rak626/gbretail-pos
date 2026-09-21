"use client";
import { useState, useEffect } from "react";
import { useCartStore } from "@/store/cartStore";
import { formatINR } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, X } from "lucide-react";

export default function CartTable() {
  const { items, removeItem, updateQty, clearCart, hasHydrated } = useCartStore();
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);
  const displayItems = hasHydrated && hasMounted ? items : [];
  const isEmpty = displayItems.length === 0;

  return (
    <Card className="flex flex-col overflow-hidden py-0 gap-0">
      <CardHeader className="flex flex-row items-center justify-between py-3 border-b bg-muted/20">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          Cart
          <Badge variant="secondary" className="font-normal" suppressHydrationWarning>{displayItems.length} item{displayItems.length!==1?"s":""}</Badge>
        </CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" onClick={clearCart} className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
            Clear Cart
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col min-h-[160px]">
        <ScrollArea className="flex-1 max-h-[320px]">
          {isEmpty ? (
            <div className="py-14 text-center">
              <div className="text-sm font-medium text-muted-foreground">No items in cart</div>
              <span className="text-xs text-muted-foreground">Search product above to add</span>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/30 backdrop-blur">
                <TableRow className="hover:bg-transparent border-b">
                  <TableHead className="w-10 text-xs text-center">#</TableHead>
                  <TableHead className="text-xs">Product</TableHead>
                  <TableHead className="w-24 text-xs text-center">Rate</TableHead>
                  <TableHead className="w-36 text-xs text-center">Qty</TableHead>
                  <TableHead className="w-28 text-xs text-right">Amount</TableHead>
                  <TableHead className="w-14 text-xs text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayItems.map((it, idx) => (
                  <TableRow key={idx} className="bg-card hover:bg-accent/50 border-b">
                    <TableCell className="w-10 text-xs text-center text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="min-w-0">
                      <div className="text-[13px] font-semibold leading-tight truncate">{it.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {it.quantity && !it.weight ? `${it.quantity} pcs` : it.weight ? `${it.weight} kg` : it.unit}
                      </div>
                      <div className="text-[11px] text-muted-foreground">Rate: {formatINR(it.price)}/{it.isCustom ? it.unit : "kg"}</div>
                    </TableCell>
                    <TableCell className="w-24 text-xs text-center tabular-nums">{formatINR(it.price)}</TableCell>
                    <TableCell className="w-36">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 rounded-full p-0 shrink-0"
                          onClick={() => updateQty(idx, Math.max(0, (it.quantity || 0) - 1))}
                          aria-label="Decrease"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="min-w-[32px] h-7 flex items-center justify-center rounded-full bg-muted border text-sm font-bold tabular-nums">
                          {it.quantity || it.weight || 0}
                        </span>
                        <Button
                          size="icon"
                          className="h-7 w-7 rounded-full p-0 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground"
                          onClick={() => updateQty(idx, (it.quantity || 0) + 1)}
                          aria-label="Increase"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="w-28 text-right font-bold text-[13px] tabular-nums">{formatINR(it.lineTotal)}</TableCell>
                    <TableCell className="w-14 text-center">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeItem(idx)}
                        className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        aria-label="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
