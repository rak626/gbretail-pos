"use client";

import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { formatINR } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function CustomItemModal() {
  const { customItemModalOpen, closeCustomModal, addItem } = useCartStore();
  const [name, setName] = useState("");
  const [quantityDesc, setQuantityDesc] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");

  const handleAdd = () => {
    const price = parseFloat(sellingPrice);
    const cost = parseFloat(costPrice) || 0;
    const qty = parseFloat(quantityDesc) || 1;
    if (!name.trim() || isNaN(price)) return;

    addItem({
      productId: `custom-${Date.now()}`,
      name: name.trim(),
      price,
      unit: quantityDesc || "pcs",
      quantity: 1,
      lineTotal: price * qty,
      isCustom: true,
      costPrice: cost,
    });

    setName("");
    setQuantityDesc("");
    setSellingPrice("");
    setCostPrice("");
    closeCustomModal();
  };

  const profitMargin = costPrice && sellingPrice
    ? ((parseFloat(sellingPrice) - parseFloat(costPrice)) / parseFloat(sellingPrice) * 100).toFixed(1)
    : null;

  return (
    <Dialog open={customItemModalOpen} onOpenChange={(o) => !o && closeCustomModal()}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-[17px]">Add Custom Item</DialogTitle>
          <DialogDescription className="text-[13px]">Create a custom product for this bill</DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6 space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="custom-name" className="text-[13px] font-semibold">Item Name *</Label>
            <Input id="custom-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Potato" className="h-11 text-[15px]" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="custom-qty" className="text-[13px] font-semibold">Quantity / Description</Label>
            <Input id="custom-qty" value={quantityDesc} onChange={(e) => setQuantityDesc(e.target.value)} placeholder="e.g., 2 kg" className="h-11 text-[15px]" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="custom-price" className="text-[13px] font-semibold">Selling Price (₹) *</Label>
            <Input id="custom-price" type="number" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} placeholder="Selling price" className="h-11 text-[15px] font-semibold tabular-nums" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="custom-cost" className="text-[13px] font-semibold">Cost Price (₹) <span className="text-muted-foreground font-normal">[Optional]</span></Label>
            <Input id="custom-cost" type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="Cost price (for margin)" className="h-11 text-[15px] tabular-nums" />
          </div>

          {profitMargin && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl p-2.5 text-xs flex items-center gap-2">
              Profit Margin: <Badge variant="secondary" className="bg-white text-primary border-primary/20 text-[11px]">{profitMargin}%</Badge>
            </div>
          )}
        </div>
        <DialogFooter className="p-5 gap-3 sm:justify-end">
          <Button variant="outline" onClick={closeCustomModal} className="h-11 px-6 min-w-[110px] text-sm">Cancel</Button>
          <Button onClick={handleAdd} className="h-11 px-6 min-w-[180px] text-sm">
            ADD TO CART — {formatINR(parseFloat(sellingPrice || "0"))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
