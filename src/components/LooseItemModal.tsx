"use client";

import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { formatINR, calculatePriceFromWeight, calculateWeightFromPrice } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function LooseItemModal() {
  const { looseProduct, looseItemModalOpen, closeLooseModal, addItem } = useCartStore();
  const [weightGrams, setWeightGrams] = useState("");
  const [price, setPrice] = useState("");

  if (!looseProduct) return null;

  const rate = looseProduct.price || looseProduct.rate_per_kg || 0;

  const handlePresetWeight = (grams: number) => {
    const totalPrice = calculatePriceFromWeight(grams, rate);
    setWeightGrams(String(grams));
    setPrice(String(totalPrice));
  };

  const handlePresetPrice = (priceVal: number) => {
    const weight = calculateWeightFromPrice(priceVal, rate);
    setPrice(String(priceVal));
    setWeightGrams(String(weight * 1000));
  };

  const handleWeightChange = (val: string) => {
    const grams = parseFloat(val);
    if (!isNaN(grams) && grams > 0) {
      const totalPrice = calculatePriceFromWeight(grams, rate);
      setWeightGrams(val);
      setPrice(totalPrice.toFixed(2));
    } else {
      setWeightGrams(val);
      setPrice("");
    }
  };

  const handlePriceChange = (val: string) => {
    const priceVal = parseFloat(val);
    if (!isNaN(priceVal) && priceVal > 0) {
      const weight = calculateWeightFromPrice(priceVal, rate);
      setPrice(val);
      setWeightGrams((weight * 1000).toFixed(0));
    } else {
      setPrice(val);
      setWeightGrams("");
    }
  };

  const handleAddToCart = () => {
    const weight = parseFloat(weightGrams);
    const totalPrice = parseFloat(price);
    if (weight > 0 && totalPrice > 0) {
      addItem({
        productId: looseProduct.id,
        name: looseProduct.name,
        price: rate,
        unit: looseProduct.category || "kg",
        quantity: 0,
        weight: weight / 1000,
        lineTotal: totalPrice,
        isCustom: false,
      });
      setWeightGrams("");
      setPrice("");
      closeLooseModal();
    }
  };

  return (
    <Dialog open={looseItemModalOpen} onOpenChange={(o) => !o && closeLooseModal()}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="text-[14px] pr-6 leading-tight">{looseProduct.name}</DialogTitle>
          <DialogDescription className="text-[11px]">Rate: <span className="font-bold text-primary">{formatINR(rate)}/kg</span></DialogDescription>
        </DialogHeader>
        <div className="px-5 pb-6 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[11px]">Preset Weight</Label>
            <div className="flex flex-wrap gap-1">
              {(looseProduct.preset_weights || []).map((w) => (
                <Button key={w} variant="outline" size="sm" onClick={() => handlePresetWeight(w)} className="rounded-full h-6 text-[11px] px-2.5">
                  {w >= 1000 ? `${w / 1000} kg` : `${w}g`}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px]">Preset Price</Label>
            <div className="flex flex-wrap gap-1">
              {(looseProduct.preset_prices || []).map((p) => (
                <Button key={p} variant="outline" size="sm" onClick={() => handlePresetPrice(p)} className="rounded-full h-6 text-[11px] px-2.5 bg-blue-50 hover:bg-blue-100 border-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                  {formatINR(p)}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-2.5">
            <div className="space-y-1">
              <Label htmlFor="loose-weight" className="text-[11px]">Weight (g)</Label>
              <Input id="loose-weight" type="number" value={weightGrams} onChange={(e) => handleWeightChange(e.target.value)} placeholder="Enter grams" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="loose-price" className="text-[11px]">Price (₹)</Label>
              <Input id="loose-price" type="number" value={price} onChange={(e) => handlePriceChange(e.target.value)} placeholder="Enter price" className="h-8 text-xs" />
            </div>
            <div className="bg-primary/5 rounded-lg p-2.5 text-center border">
              <div className="text-[11px] font-medium">
                {weightGrams ? `${(parseFloat(weightGrams) / 1000).toFixed(3)} kg` : "0 kg"} | {formatINR(parseFloat(price || "0"))}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="p-4 gap-3 sm:justify-end">
          <Button variant="outline" onClick={closeLooseModal} className="h-9 px-6 min-w-[96px]">Cancel</Button>
          <Button onClick={handleAddToCart} className="h-9 px-6 min-w-[160px]">
            ADD TO CART — {formatINR(parseFloat(price || "0"))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
