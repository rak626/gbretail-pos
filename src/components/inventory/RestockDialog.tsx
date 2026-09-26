"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatINR } from "@/lib/utils";
import { isLowStock, isOutOfStock, lowStockThresholdOf } from "@/lib/stock";
import { PackagePlus } from "lucide-react";
import type { Product } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: Product | null;
  qty: string;
  setQty: (v: string) => void;
  price: string;
  setPrice: (v: string) => void;
  rate: string;
  setRate: (v: string) => void;
  cost: string;
  setCost: (v: string) => void;
  saving: boolean;
  error: string;
  offline: boolean;
  offlineReason?: string;
  onSave: () => void;
};

export default function RestockDialog({ open, onOpenChange, product, qty, setQty, price, setPrice, rate, setRate, cost, setCost, saving, error, offline, offlineReason, onSave }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="text-[15px] flex items-center gap-2">
            <PackagePlus className="w-4 h-4 text-primary" /> Restock — add purchase quantity
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Existing SKU only. Stock adds up; update prices only if supplier cost changed.
          </DialogDescription>
        </DialogHeader>
        {product && (
          <div className="px-5 pb-5 space-y-3">
            <Card className="py-0 bg-muted/20">
              <CardContent className="p-3 space-y-1.5">
                <div className="font-semibold text-sm leading-tight">{product.name}</div>
                <div className="flex flex-wrap gap-2 text-xs items-center">
                  <Badge variant="outline" className="text-[11px]">{product.category}</Badge>
                  <Badge variant={product.is_loose ? "secondary" : "outline"} className="text-[11px]">{product.is_loose ? "Loose • per kg" : "Packaged"}</Badge>
                  <span className="text-muted-foreground">Now:</span>
                  <Badge variant={isOutOfStock(product) ? "destructive" : isLowStock(product) ? "secondary" : "outline"} className="font-mono text-xs">
                    {product.stockQuantity ?? 0} {product.unit || "pcs"}
                  </Badge>
                  <span className="text-muted-foreground">warn ≤ {lowStockThresholdOf(product)}</span>
                </div>
                <div className="text-xs">
                  <span className="text-muted-foreground">Current {product.is_loose ? "rate" : "price"}:</span>{" "}
                  <span className="font-bold">{product.is_loose ? `${formatINR(product.rate_per_kg || 0)}/kg` : formatINR(product.price || 0)}</span>
                  {(product as { costPrice?: number }).costPrice != null && (
                    <span className="text-muted-foreground"> • buy {formatINR((product as { costPrice?: number }).costPrice ?? 0)}</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-1">
              <Label className="text-[12px]">Add quantity * <span className="text-muted-foreground font-normal">({product.unit || "pcs"})</span></Label>
              <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g., 40" className="h-10 text-sm" autoFocus />
              {qty && !isNaN(Number(qty)) && Number(qty) > 0 && (
                <div className="text-[12px] font-medium text-primary tabular-nums">
                  New stock: {product.stockQuantity ?? 0} + {Number(qty)} = {(product.stockQuantity ?? 0) + Number(qty)} {product.unit || "pcs"}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {product.is_loose ? (
                <div className="space-y-1">
                  <Label className="text-[12px]">New rate ₹/kg</Label>
                  <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder={String(product.rate_per_kg ?? "")} className="h-10 text-sm" />
                </div>
              ) : (
                <div className="space-y-1">
                  <Label className="text-[12px]">New sell price ₹</Label>
                  <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={String(product.price ?? "")} className="h-10 text-sm" />
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-[12px]">New buy price ₹</Label>
                <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder={String((product as { costPrice?: number }).costPrice ?? "")} className="h-10 text-sm" />
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground">Leave a price blank to keep it unchanged. Changing buy price fixes future profit.</div>

            <div className="rounded-lg bg-primary/5 border border-primary/20 px-2.5 py-2 text-[11px] space-y-1">
              <div>• <span className="font-medium">− / +</span> in table = counting correction (±1).</div>
              <div>• <span className="font-medium">Restock</span> = new supplier purchase (adds 40, 100…).</div>
              <div>• <span className="font-medium">Edit</span> = fix name / barcode typo.</div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-2.5 py-1.5 text-xs font-medium text-destructive">{error}</div>
            )}
          </div>
        )}
        <DialogFooter className="p-4 gap-3 sm:justify-end border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="h-10 px-6 min-w-[96px]">Cancel</Button>
          <Button onClick={onSave} disabled={saving || offline} title={offline ? offlineReason : undefined} className="h-10 px-6 min-w-[150px]">
            {saving ? "Restocking…" : `Add ${qty ? Number(qty) : ""} to stock`.trim() || "Add to stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
