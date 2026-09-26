"use client";
import { useCartStore } from "@/store/cartStore";
import { useHasHydrated } from "@/hooks/useHasHydrated";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingBag, PackageOpen, ScanLine } from "lucide-react";
import { CartRow } from "@/components/cart/CartRow";
import { Kbd } from "@/components/ui/kbd";

export default function CartTable() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQty = useCartStore((s) => s.updateQty);
  const clearCart = useCartStore((s) => s.clearCart);
  const openLooseEditModal = useCartStore((s) => s.openLooseEditModal);
  const hydrated = useHasHydrated();
  const displayItems = hydrated ? items : [];
  const isEmpty = displayItems.length === 0;

  return (
    <Card className="flex flex-col overflow-hidden py-0 gap-0 rounded-2xl border flex-1 min-h-0">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b bg-muted/20">
        <CardTitle className="text-[15px] font-bold flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
            <ShoppingBag className="w-4 h-4" />
          </span>
          Cart
          <Badge variant="secondary" className="font-bold rounded-full px-2.5 text-[13px]" suppressHydrationWarning>{displayItems.length}</Badge>
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={clearCart} className="h-9 text-[13px] gap-1.5 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10 px-3">
          Clear
        </Button>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col min-h-[160px]">
        <ScrollArea className="flex-1 min-h-[200px]">
          {isEmpty ? (
            <div className="py-10 px-6 text-center flex flex-col items-center justify-center min-h-[280px]">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 border-2 border-dashed flex items-center justify-center mb-4">
                <div className="w-10 h-10 rounded-xl bg-card border shadow-sm flex items-center justify-center">
                  <PackageOpen className="w-5 h-5 text-muted-foreground/60" />
                </div>
              </div>
              <div className="text-sm font-semibold">No items in cart</div>
              <span className="text-xs text-muted-foreground mt-1">Scan a barcode or search product above to add</span>
              <span className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 text-[11px] font-medium">
                <ScanLine className="w-3.5 h-3.5" /> Press <Kbd className="bg-card">F2</Kbd> to scan
              </span>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/30 backdrop-blur">
                <TableRow className="hover:bg-transparent border-b">
                  <TableHead className="text-xs min-w-0">Product</TableHead>
                  <TableHead className="w-20 text-xs text-center">Rate</TableHead>
                  <TableHead className="w-36 text-xs text-center">Quantity</TableHead>
                  <TableHead className="w-24 text-xs text-right">Price</TableHead>
                  <TableHead className="w-12 text-xs text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayItems.map((it, idx) => (
                  <CartRow key={`${it.productId || it.name}-${idx}`} item={it} index={idx} onUpdateQty={updateQty} onRemove={removeItem} onLooseEdit={openLooseEditModal} />
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
