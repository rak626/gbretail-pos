"use client";

import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { formatINR, formatQty } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Minus, Plus, X, Trash2 } from "lucide-react";

export default function CartPanel() {
  const {
    items,
    discount,
    applyDiscount,
    removeItem,
    updateQty,
    holdOrder,
    openCustomModal,
    openPaymentModal,
    openLooseEditModal,
    calculateGrandTotal,
  } = useCartStore();

  const formatLoose = (w?: number) => {
    if (!w || w <= 0) return "0 g";
    if (w >= 1) return `${w.toFixed(3)} kg`;
    return `${Math.round(w * 1000)} g`;
  };

  const getRateLabel = (it: (typeof items)[number]) => {
    if (it.isCustom) {
      const u = it.unit?.toLowerCase();
      if (u === "pcs" || u === "pc") return `${formatINR(it.price)} / pc`;
      if (u === "pack" || u === "pkt") return `${formatINR(it.price)} / pack`;
      return `${formatINR(it.price)} / ${it.unit}`;
    }
    const isLoose = !!it.is_loose || (!!it.weight && it.weight > 0);
    if (isLoose) return `${formatINR(it.price)}/kg`;
    const u = it.unit?.toLowerCase();
    if (u === "pcs" || u === "pc") return `${formatINR(it.price)} / pc`;
    return `${formatINR(it.price)} / pack`;
  };

  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [discountValue, setDiscountValue] = useState("");

  const handleApplyDiscount = () => {
    const val = parseFloat(discountValue);
    if (!isNaN(val) && val > 0) {
      applyDiscount(val);
    }
    setShowDiscountInput(false);
    setDiscountValue("");
  };

  const grandTotal = calculateGrandTotal();

  return (
    <Card className="flex flex-col h-full py-0 gap-0 overflow-hidden">
      <CardHeader className="py-3 border-b">
        <CardTitle className="text-sm flex items-center justify-between">
          Cart
          <Badge variant="secondary">{items.length} items</Badge>
        </CardTitle>
      </CardHeader>

      <ScrollArea className="flex-1">
        <CardContent className="p-3 space-y-3">
          {items.length === 0 && (
            <div className="text-center text-muted-foreground py-12 text-sm">
              No items in cart
            </div>
          )}
          {items.map((item, index) => {
            const isLoose = !!item.is_loose || (!!item.weight && item.weight > 0);
            const isCustom = !!item.isCustom;
            return (
            <Card key={index} className="py-0">
              <CardContent className="p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate flex items-center gap-1.5">
                      <span className="truncate">{item.name}</span>
                      {isCustom && <Badge variant="outline" className="text-[9px] h-4 px-1 bg-amber-50 text-amber-700 border-amber-200 shrink-0">External</Badge>}
                      {isLoose && !isCustom && <Badge variant="secondary" className="text-[9px] h-4 px-1 shrink-0">Loose</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isCustom ? (
                        <span>{item.unit || ""}</span>
                      ) : isLoose ? (
                        <span>{formatLoose(item.weight)}</span>
                      ) : (
                        <span>{item.quantity || 0} pcs</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Rate: {getRateLabel(item)}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon-xs" onClick={() => removeItem(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {isLoose && !isCustom ? (
                  <div className="flex gap-2 mt-2 items-center">
                    <Button variant="outline" size="icon-xs" onClick={() => openLooseEditModal(index)}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <Badge onClick={() => openLooseEditModal(index)} variant="outline" className="flex-1 justify-center font-mono text-xs bg-primary/10 border-primary/20 text-primary cursor-pointer hover:bg-primary/15 touch-manipulation">{formatLoose(item.weight)}</Badge>
                    <Button variant="outline" size="icon-xs" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => openLooseEditModal(index)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                ) : !isCustom ? (
                  <div className="flex gap-2 mt-2 items-center">
                    <Button variant="outline" size="icon-xs" onClick={() => updateQty(index, (item.quantity || 0) + 1)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Badge variant="outline" className="flex-1 justify-center font-mono text-xs">{item.quantity || 0}</Badge>
                    <Button variant="outline" size="icon-xs" onClick={() => updateQty(index, Math.max(0, (item.quantity || 0) - 1))}>
                      <Minus className="w-3 h-3" />
                    </Button>
                  </div>
                ) : null}
                <div className="text-right font-bold text-sm mt-1">{formatINR(item.lineTotal)}</div>
              </CardContent>
            </Card>
            );
          })}
        </CardContent>
      </ScrollArea>

      <CardFooter className="flex-col gap-3 p-3 border-t bg-muted/20">
        {showDiscountInput && (
          <div className="flex gap-2 w-full">
            <Input
              type="number"
              placeholder="Discount ₹"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="flex-1 h-8"
            />
            <Button size="sm" onClick={handleApplyDiscount}>OK</Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowDiscountInput(false); setDiscountValue(""); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="flex gap-2 w-full">
          <Button variant="secondary" className="flex-1" size="sm" onClick={() => { setShowDiscountInput(true); setDiscountValue(""); }}>
            Discount
          </Button>
          <Button variant="secondary" className="flex-1" size="sm" onClick={holdOrder}>
            Hold
          </Button>
          <Button variant="outline" className="flex-1" size="sm" onClick={openCustomModal}>
            Custom
          </Button>
        </div>

        <Separator />

        <div className="w-full space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-bold text-sm">Grand Total</span>
            <span className="font-black text-lg text-primary">{formatINR(grandTotal)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button onClick={() => openPaymentModal()} size="sm">Cash</Button>
            <Button onClick={() => openPaymentModal()} variant="secondary" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">UPI</Button>
            <Button onClick={() => openPaymentModal()} variant="secondary" size="sm" className="bg-violet-600 hover:bg-violet-700 text-white">Khata</Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
