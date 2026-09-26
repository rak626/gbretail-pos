"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatINR } from "@/lib/utils";
import type { Product, ProductForm } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Product | null;
  form: ProductForm;
  setForm: React.Dispatch<React.SetStateAction<ProductForm>>;
  formError: string;
  saving: boolean;
  offline: boolean;
  offlineReason?: string;
  categories: string[];
  onSave: () => void;
};

export default function ProductDialog({ open, onOpenChange, editing, form, setForm, formError, saving, offline, offlineReason, categories, onSave }: Props) {
  const sell = form.is_loose ? Number(form.rate_per_kg) || 0 : Number(form.price) || 0;
  const cost = Number(form.costPrice) || 0;
  const margin = sell - cost;
  const showMargin = sell > 0 && form.costPrice.trim() !== "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <DialogContent className="sm:max-w-[540px] p-0 gap-0 overflow-hidden max-h-[calc(100%-3rem)] flex flex-col">
        <DialogHeader className="p-5 pb-3 shrink-0">
          <DialogTitle className="text-[17px]">{editing ? "Edit product" : "New SKU"}</DialogTitle>
          <DialogDescription className="text-[13px]">
            {editing ? "Fix name, category, barcode or prices — stock changes belong in Restock." : "Brand-new item first time in shop. For existing items use Restock instead."}
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 pb-5 space-y-4 overflow-auto">
          <div className="space-y-1.5">
            <Label className="text-[13px]">Product name *</Label>
            <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="e.g., Tata Salt 1kg" className="h-10 text-sm" autoFocus />
            {form.is_loose && (
              <div className="text-xs text-muted-foreground">One item, multiple rates? Create one product per rate — e.g. “Sugar – Economy @ ₹40/kg” and “Sugar – Premium @ ₹50/kg”. Each keeps its own stock.</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Category *</Label>
              <Input value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))} placeholder="e.g., Staples" className="h-10 text-sm" list="inventory-categories" />
              <datalist id="inventory-categories">
                {categories.filter((c) => c !== "All" && c !== "Loose Items").map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Unit</Label>
              <Input value={form.unit} onChange={(e) => setForm((s) => ({ ...s, unit: e.target.value }))} placeholder="pcs / kg / bag" className="h-10 text-sm" />
            </div>
          </div>

          <div className="flex items-center gap-2.5 py-0.5">
            <div className="flex items-center gap-1.5">
              <Checkbox id="is_loose" checked={form.is_loose} onCheckedChange={(checked) => setForm((s) => ({ ...s, is_loose: checked === true }))} />
              <Label htmlFor="is_loose" className="text-[13px] font-medium cursor-pointer">Loose item (sold by weight)</Label>
            </div>
            <Badge variant="outline" className="text-[11px] h-5 px-1.5">{form.is_loose ? "Loose" : "Packaged"}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {form.is_loose ? (
              <div className="space-y-1.5">
                <Label className="text-[13px]">Rate per kg (₹) *</Label>
                <Input type="number" value={form.rate_per_kg} onChange={(e) => setForm((s) => ({ ...s, rate_per_kg: e.target.value }))} placeholder="e.g., 48" className="h-10 text-sm" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-[13px]">Selling price (₹) *</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} placeholder="e.g., 28" className="h-10 text-sm" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-[13px]">Buying price (₹) *</Label>
              <Input type="number" value={form.costPrice} onChange={(e) => setForm((s) => ({ ...s, costPrice: e.target.value }))} placeholder="e.g., 22" className="h-10 text-sm" />
            </div>
          </div>
          {showMargin && (
            <div className="rounded-lg bg-muted/40 border px-2.5 py-1.5 text-[13px] tabular-nums">
              Margin: <span className={margin < 0 ? "text-destructive font-semibold" : "text-emerald-600 dark:text-emerald-400 font-semibold"}>{formatINR(margin)} ({sell > 0 ? ((margin / sell) * 100).toFixed(1) : "0"}%)</span>
              <span className="text-muted-foreground"> — sell {formatINR(sell)} minus buy {formatINR(cost)}</span>
            </div>
          )}
          {!showMargin && <div className="text-xs text-muted-foreground -mt-2">Buying price is mandatory — profit = sell − buy, used in Analytics.</div>}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Barcode <span className="text-muted-foreground font-normal">(scan or type)</span></Label>
              <Input value={form.barcode} onChange={(e) => setForm((s) => ({ ...s, barcode: e.target.value }))} placeholder="8901…" className="h-10 font-mono text-[13px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Opening stock *</Label>
              <Input type="number" value={form.stockQuantity} onChange={(e) => setForm((s) => ({ ...s, stockQuantity: e.target.value }))} placeholder="100" className="h-10 text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px]">Low-stock warning at * <span className="text-muted-foreground font-normal">(in {form.unit.trim() || "pcs"} — warn only, never blocks sales)</span></Label>
            <Input type="number" value={form.lowStockThreshold} onChange={(e) => setForm((s) => ({ ...s, lowStockThreshold: e.target.value }))} placeholder="10" className="h-10 text-sm" />
          </div>

          {formError && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-2.5 py-1.5 text-[13px] font-medium text-destructive">{formError}</div>
          )}
        </div>
        <DialogFooter className="p-4 gap-3 sm:justify-end border-t shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="h-11 px-6 min-w-[110px] text-sm">Cancel</Button>
          <Button onClick={onSave} disabled={saving || offline} title={offline ? offlineReason : undefined} className="h-11 px-6 min-w-[150px] text-sm">
            {saving ? (editing ? "Saving…" : "Adding…") : editing ? "Save changes" : "Add SKU"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
