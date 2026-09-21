"use client";

import { useState, useEffect, useMemo } from "react";
import { useCartStore } from "@/store/cartStore";
import { formatINR, calculatePriceFromWeight, calculateWeightFromPrice } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const FIXED_WEIGHT_CHIPS = [100, 200, 250, 500, 1000, 2000];
const FIXED_PRICE_CHIPS = [10, 20, 50, 100];

export default function LooseItemModal() {
  const { looseProduct, looseItemModalOpen, editingLooseIndex, closeLooseModal, addItem, updateWeight, items } = useCartStore();
  const [weightGrams, setWeightGrams] = useState("");
  const [price, setPrice] = useState("");

  const isEditMode = editingLooseIndex !== null && editingLooseIndex !== undefined;

  // Prefill when entering edit mode, clear when entering add mode
  useEffect(() => {
    if (!looseItemModalOpen || !looseProduct) {
      setWeightGrams("");
      setPrice("");
      return;
    }
    if (isEditMode && items[editingLooseIndex!]) {
      const it = items[editingLooseIndex!];
      const grams = it.weight ? Math.round(it.weight * 1000) : 0;
      const p = it.lineTotal || 0;
      if (grams > 0) {
        setWeightGrams(String(grams));
        setPrice(String(p.toFixed(2)));
      } else {
        setWeightGrams("");
        setPrice("");
      }
    } else {
      setWeightGrams("");
      setPrice("");
    }
  }, [looseItemModalOpen, looseProduct, isEditMode, editingLooseIndex, items]);

  if (!looseProduct) return null;

  const rate = looseProduct.price || looseProduct.rate_per_kg || 0;

  const weightChips = useMemo(() => {
    const merged = new Set([...FIXED_WEIGHT_CHIPS, ...(looseProduct.preset_weights || [])]);
    return Array.from(merged).sort((a, b) => a - b);
  }, [looseProduct.preset_weights]);

  const priceChips = useMemo(() => {
    const merged = new Set([...FIXED_PRICE_CHIPS, ...(looseProduct.preset_prices || [])]);
    return Array.from(merged).sort((a, b) => a - b);
  }, [looseProduct.preset_prices]);

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
      if (isEditMode && editingLooseIndex !== null) {
        const weightKg = weight / 1000;
        updateWeight(editingLooseIndex, weightKg);
        // ensure lineTotal is accurate if rate calc drifted
        // updateWeight already sets lineTotal = weightKg * rate, which matches totalPrice when conversion is correct
      } else {
        addItem({
          productId: looseProduct.id,
          name: looseProduct.name,
          price: rate,
          unit: "kg",
          quantity: 0,
          weight: weight / 1000,
          lineTotal: totalPrice,
          isCustom: false,
          is_loose: true,
          category: looseProduct.category,
          preset_weights: looseProduct.preset_weights,
          preset_prices: looseProduct.preset_prices,
        });
      }
      setWeightGrams("");
      setPrice("");
      closeLooseModal();
    }
  };

  const isUpdateDisabled = !weightGrams || !price || parseFloat(weightGrams) <= 0 || parseFloat(price) <= 0;

  const selectedGrams = parseFloat(weightGrams) || 0;
  const selectedPriceVal = parseFloat(price) || 0;

  return (
    <Dialog open={looseItemModalOpen} onOpenChange={(o) => !o && closeLooseModal()}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="text-[14px] pr-6 leading-tight flex items-center gap-2">
            {looseProduct.name}
            {isEditMode && <Badge variant="secondary" className="text-[10px]">Editing</Badge>}
          </DialogTitle>
          <DialogDescription className="text-[11px]">Rate: <span className="font-bold text-primary">{formatINR(rate)}/kg</span> {isEditMode && "• Tap a chip or type to adjust"}</DialogDescription>
        </DialogHeader>
        <div className="px-5 pb-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold">Preset Weight</Label>
            <div className="flex flex-wrap gap-1.5">
              {weightChips.map((w) => {
                const active = selectedGrams === w;
                return (
                  <Button
                    key={w}
                    variant={active ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePresetWeight(w)}
                    className={`rounded-full h-7 text-[11px] px-3 touch-manipulation ${active ? "ring-2 ring-primary/20" : ""}`}
                  >
                    {w >= 1000 ? `${w / 1000} kg` : `${w}g`}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold">Preset Rupee</Label>
            <div className="flex flex-wrap gap-1.5">
              {priceChips.map((p) => {
                const active = selectedPriceVal === p;
                return (
                  <Button
                    key={p}
                    variant={active ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePresetPrice(p)}
                    className={`rounded-full h-7 text-[11px] px-3 touch-manipulation ${active ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "bg-blue-50 hover:bg-blue-100 border-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"}`}
                  >
                    {formatINR(p)}
                  </Button>
                );
              })}
            </div>
          </div>

          <Separator />

          <div className="space-y-2.5">
            <div className="space-y-1">
              <Label htmlFor="loose-weight" className="text-[11px]">Custom Weight (g)</Label>
              <Input id="loose-weight" type="number" inputMode="numeric" value={weightGrams} onChange={(e) => handleWeightChange(e.target.value)} placeholder="e.g. 375" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="loose-price" className="text-[11px]">Target Amount (₹) — auto-converts to weight</Label>
              <Input id="loose-price" type="number" inputMode="decimal" value={price} onChange={(e) => handlePriceChange(e.target.value)} placeholder="e.g. 50" className="h-9 text-sm" />
            </div>
            <div className="bg-primary/5 rounded-lg p-3 text-center border space-y-1">
              <div className="text-xs font-bold">
                {weightGrams ? `${(parseFloat(weightGrams) / 1000).toFixed(3)} kg` : "0 kg"} • {weightGrams ? `${weightGrams} g` : "0 g"}
              </div>
              <div className="text-sm font-black text-primary">{formatINR(parseFloat(price || "0"))}</div>
              <div className="text-[11px] text-muted-foreground">@ {formatINR(rate)}/kg</div>
            </div>
          </div>
        </div>
        <DialogFooter className="p-4 gap-3 sm:justify-end">
          <Button variant="outline" onClick={closeLooseModal} className="h-9 px-6 min-w-[96px]">Cancel</Button>
          <Button onClick={handleAddToCart} disabled={isUpdateDisabled} className="h-9 px-6 min-w-[160px]">
            {isEditMode ? `UPDATE — ${formatINR(parseFloat(price || "0"))}` : `ADD TO CART — ${formatINR(parseFloat(price || "0"))}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
