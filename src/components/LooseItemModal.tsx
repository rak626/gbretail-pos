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
  const [kg, setKg] = useState("");
  const [gram, setGram] = useState("");
  const [price, setPrice] = useState("");

  const isEditMode = editingLooseIndex !== null && editingLooseIndex !== undefined;
  const totalGrams = (parseInt(kg) || 0) * 1000 + (parseInt(gram) || 0);

  // Prefill when entering edit mode, clear when entering add mode
  useEffect(() => {
    if (!looseItemModalOpen || !looseProduct) {
      setKg("");
      setGram("");
      setPrice("");
      return;
    }
    if (isEditMode && items[editingLooseIndex!]) {
      const it = items[editingLooseIndex!];
      const grams = it.weight ? Math.round(it.weight * 1000) : 0;
      const p = it.lineTotal || 0;
      if (grams > 0) {
        splitGrams(grams);
        setPrice(String(p.toFixed(2)));
      } else {
        setKg("");
        setGram("");
        setPrice("");
      }
    } else {
      setKg("");
      setGram("");
      setPrice("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [looseItemModalOpen, looseProduct, isEditMode, editingLooseIndex, items]);

  if (!looseProduct) return null;

  const rate = looseProduct.price || looseProduct.rate_per_kg || 0;

  /** Split total grams into kg + gram fields (gram always 0–999). */
  function splitGrams(total: number) {
    if (!total || total <= 0) {
      setKg("");
      setGram("");
      return;
    }
    const k = Math.floor(total / 1000);
    const g = Math.round(total % 1000);
    setKg(k > 0 ? String(k) : "");
    setGram(String(g));
  }

  function syncPriceFromTotal(total: number) {
    if (total > 0) setPrice(String(calculatePriceFromWeight(total, rate)));
    else setPrice("");
  }

  const weightChips = useMemo(() => {
    const merged = new Set([...FIXED_WEIGHT_CHIPS, ...(looseProduct.preset_weights || [])]);
    return Array.from(merged).sort((a, b) => a - b);
  }, [looseProduct.preset_weights]);

  const priceChips = useMemo(() => {
    const merged = new Set([...FIXED_PRICE_CHIPS, ...(looseProduct.preset_prices || [])]);
    return Array.from(merged).sort((a, b) => a - b);
  }, [looseProduct.preset_prices]);

  const handlePresetWeight = (grams: number) => {
    splitGrams(grams);
    syncPriceFromTotal(grams);
  };

  const handlePresetPrice = (priceVal: number) => {
    const weight = calculateWeightFromPrice(priceVal, rate);
    setPrice(String(priceVal));
    splitGrams(Math.round(weight * 1000));
  };

  const onlyDigits = (v: string) => v.replace(/\D/g, "");

  const handleKgChange = (val: string) => {
    const clean = onlyDigits(val).slice(0, 4);
    const total = (parseInt(clean) || 0) * 1000 + (parseInt(gram) || 0);
    setKg(clean);
    syncPriceFromTotal(total);
  };

  const handleGramChange = (val: string) => {
    // Gram is always max 3 digits (0–999); kilos go in the kg box
    const clean = onlyDigits(val).slice(0, 3);
    const total = (parseInt(kg) || 0) * 1000 + (parseInt(clean) || 0);
    setGram(clean);
    syncPriceFromTotal(total);
  };

  const handlePriceChange = (val: string) => {
    const priceVal = parseFloat(val);
    if (!isNaN(priceVal) && priceVal > 0) {
      const weight = calculateWeightFromPrice(priceVal, rate);
      setPrice(val);
      splitGrams(Math.round(weight * 1000));
    } else {
      setPrice(val);
      setKg("");
      setGram("");
    }
  };

  const handleAddToCart = () => {
    const weight = totalGrams;
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
          costPrice: (looseProduct as any).costPrice ?? 0,
        });
      }
      setKg("");
      setGram("");
      setPrice("");
      closeLooseModal();
    }
  };

  const isUpdateDisabled = totalGrams <= 0 || !price || parseFloat(price) <= 0;

  const selectedGrams = totalGrams;
  const selectedPriceVal = parseFloat(price) || 0;

  return (
    <Dialog open={looseItemModalOpen} onOpenChange={(o) => !o && closeLooseModal()}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="text-[17px] pr-6 leading-tight flex items-center gap-2">
            {looseProduct.name}
            {isEditMode && <Badge variant="secondary" className="text-[11px]">Editing</Badge>}
          </DialogTitle>
          <DialogDescription className="text-[13px]">Rate: <span className="font-bold text-primary">{formatINR(rate)}/kg</span> {isEditMode && "• Tap a chip or type to adjust"}</DialogDescription>
        </DialogHeader>
        <div className="px-5 pb-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-[13px] font-semibold">Preset Weight</Label>
            <div className="flex flex-wrap gap-2">
              {weightChips.map((w) => {
                const active = selectedGrams === w;
                return (
                  <Button
                    key={w}
                    variant={active ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePresetWeight(w)}
                    className={`rounded-full h-9 text-[13px] px-4 touch-manipulation ${active ? "ring-2 ring-primary/20" : ""}`}
                  >
                    {w >= 1000 ? `${w / 1000} kg` : `${w}g`}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[13px] font-semibold">Preset Rupee</Label>
            <div className="flex flex-wrap gap-2">
              {priceChips.map((p) => {
                const active = selectedPriceVal === p;
                return (
                  <Button
                    key={p}
                    variant={active ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePresetPrice(p)}
                    className={`rounded-full h-9 text-[13px] px-4 touch-manipulation ${active ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "bg-blue-50 hover:bg-blue-100 border-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"}`}
                  >
                    {formatINR(p)}
                  </Button>
                );
              })}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="loose-kg" className="text-[13px]">Kilos (kg)</Label>
                <Input id="loose-kg" type="text" inputMode="numeric" value={kg} onChange={(e) => handleKgChange(e.target.value)} placeholder="0" className="h-11 text-[15px] font-semibold" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="loose-gram" className="text-[13px]">Grams (g, max 999)</Label>
                <Input id="loose-gram" type="text" inputMode="numeric" maxLength={3} value={gram} onChange={(e) => handleGramChange(e.target.value)} placeholder="0" className="h-11 text-[15px] font-semibold" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loose-price" className="text-[13px]">Target Amount (₹) — auto-converts to weight</Label>
              <Input id="loose-price" type="number" inputMode="decimal" value={price} onChange={(e) => handlePriceChange(e.target.value)} placeholder="e.g. 50" className="h-11 text-[15px] font-semibold" />
            </div>
            <div className="bg-primary/5 rounded-lg p-3 text-center border space-y-1">
              <div className="text-sm font-bold">
                {totalGrams > 0 ? `${(totalGrams / 1000).toFixed(3)} kg` : "0 kg"} • {totalGrams > 0 ? `${totalGrams} g` : "0 g"}
              </div>
              <div className="text-lg font-black text-primary">{formatINR(parseFloat(price || "0"))}</div>
              <div className="text-xs text-muted-foreground">@ {formatINR(rate)}/kg</div>
            </div>
          </div>
        </div>
        <DialogFooter className="p-4 gap-3 sm:justify-end">
          <Button variant="outline" onClick={closeLooseModal} className="h-11 px-6 min-w-[110px] text-sm">Cancel</Button>
          <Button onClick={handleAddToCart} disabled={isUpdateDisabled} className="h-11 px-6 min-w-[180px] text-sm">
            {isEditMode ? `UPDATE — ${formatINR(parseFloat(price || "0"))}` : `ADD TO CART — ${formatINR(parseFloat(price || "0"))}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
