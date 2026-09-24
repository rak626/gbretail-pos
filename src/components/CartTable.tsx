"use client";
import { useState, useEffect } from "react";
import { useCartStore } from "@/store/cartStore";
import { formatINR } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Minus, Plus, Trash2, ShoppingBag, PackageOpen, ScanLine } from "lucide-react";

export default function CartTable() {
  const { items, removeItem, updateQty, clearCart, hasHydrated, openLooseEditModal } = useCartStore();
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);
  const displayItems = hasHydrated && hasMounted ? items : [];
  const isEmpty = displayItems.length === 0;

  const formatLooseQty = (weight?: number) => {
    if (!weight || weight <= 0) return "0 g";
    if (weight >= 1) return `${weight.toFixed(3)} kg`;
    const g = Math.round(weight * 1000);
    return `${g} g`;
  };

  const getPerUnitText = (it: (typeof items)[number]) => {
    if (it.isCustom) {
      const u = it.unit?.toLowerCase();
      if (u === "pcs" || u === "pc" || u === "pcs.") return "per pc";
      if (u === "pack" || u === "pkt" || u === "packet") return "per pack";
      return `per ${it.unit}`;
    }
    const isLoose = !!it.is_loose || (!!it.weight && it.weight > 0);
    if (isLoose) return "per kg";
    const u = it.unit?.toLowerCase();
    if (u === "kg" || u === "g") return "per kg";
    if (u === "pcs" || u === "pc") return "per pc";
    return "per pack";
  };

  return (
    <Card className="flex flex-col overflow-hidden py-0 gap-0 rounded-xl shadow-sm border">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b bg-muted/20">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <ShoppingBag className="w-3.5 h-3.5" />
          </span>
          Cart
          <Badge variant="secondary" className="font-bold rounded-full px-2.5" suppressHydrationWarning>{displayItems.length}</Badge>
          <span className="hidden sm:inline text-xs font-normal text-muted-foreground -ml-1">{displayItems.length===1?"item":"items"}</span>
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={clearCart} className="h-7 text-xs gap-1.5 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10">
          Clear
        </Button>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col min-h-[160px]">
        <ScrollArea className="flex-1 max-h-[420px] lg:max-h-[520px]">
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
                <ScanLine className="w-3.5 h-3.5" /> Press <kbd className="px-1 py-0.5 bg-card border rounded text-[10px]">F2</kbd> to scan
              </span>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/30 backdrop-blur">
                <TableRow className="hover:bg-transparent border-b">
                  <TableHead className="w-10 text-xs text-center">#</TableHead>
                  <TableHead className="text-xs">Product</TableHead>
                  <TableHead className="w-24 text-xs text-center">Rate</TableHead>
                  <TableHead className="w-36 text-xs text-center">Quantity</TableHead>
                  <TableHead className="w-28 text-xs text-right">Price</TableHead>
                  <TableHead className="w-14 text-xs text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayItems.map((it, idx) => {
                  const isLoose = !!it.is_loose || (!!it.weight && it.weight > 0);
                  const isCustom = !!it.isCustom;
                  const handleLooseEdit = () => openLooseEditModal(idx);
                  return (
                  <TableRow key={idx} className="bg-card hover:bg-accent/50 border-b">
                    <TableCell className="w-10 text-xs text-center text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="min-w-0">
                      <div className="text-[13px] font-semibold leading-tight truncate flex items-center gap-1.5">
                        <span className="truncate">{it.name}</span>
                        {isCustom && <Badge variant="outline" className="text-[9px] h-4 px-1 bg-amber-50 text-amber-700 border-amber-200 shrink-0">External</Badge>}
                        {isLoose && !isCustom && <Badge variant="secondary" className="text-[9px] h-4 px-1 shrink-0">Loose</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="w-24 text-center leading-tight">
                      <div className="text-xs font-medium tabular-nums">{formatINR(it.price)}</div>
                      <div className="text-[11px] text-muted-foreground">{getPerUnitText(it)}</div>
                    </TableCell>
                    <TableCell className="w-36">
                      {isLoose && !isCustom ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-full p-0 shrink-0 !min-h-0 !min-w-0"
                            onClick={handleLooseEdit}
                            aria-label="Decrease loose"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span
                            onClick={handleLooseEdit}
                            className="min-w-[64px] h-7 flex items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tabular-nums cursor-pointer hover:bg-primary/15 transition-colors px-2 touch-manipulation"
                            title="Tap to edit weight"
                          >
                            {formatLooseQty(it.weight)}
                          </span>
                          <Button
                            size="icon"
                            className="h-7 w-7 rounded-full p-0 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground !min-h-0 !min-w-0"
                            onClick={handleLooseEdit}
                            aria-label="Increase loose"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : isCustom ? (
                        <div className="flex items-center justify-center">
                          <Badge variant="outline" className="text-[11px]">—</Badge>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-full p-0 shrink-0 !min-h-0 !min-w-0"
                            onClick={() => updateQty(idx, Math.max(0, (it.quantity || 0) - 1))}
                            aria-label="Decrease"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="min-w-[32px] h-7 flex items-center justify-center rounded-full bg-muted border text-sm font-bold tabular-nums">
                            {it.quantity || 0}
                          </span>
                          <Button
                            size="icon"
                            className="h-7 w-7 rounded-full p-0 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground !min-h-0 !min-w-0"
                            onClick={() => updateQty(idx, (it.quantity || 0) + 1)}
                            aria-label="Increase"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="w-28 text-right font-bold text-[13px] tabular-nums">{formatINR(it.lineTotal)}</TableCell>
                    <TableCell className="w-14 text-center">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeItem(idx)}
                        className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 !min-h-0 !min-w-0"
                        aria-label="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
