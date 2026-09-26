"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { formatINR } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { isLowStock, isOutOfStock, lowStockThresholdOf, marginPctOf, marginOf, sellPriceOf, stockStatusOf } from "@/lib/stock";
import { Check, Copy, Minus, PackagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Product } from "./types";

type Props = {
  products: Product[];
  showCost: boolean;
  offline: boolean;
  offlineReason?: string;
  onAdjust: (p: Product, delta: number) => void;
  onRestock: (p: Product) => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  onOpenProduct: (p: Product) => void;
};

function BarcodeCell({ barcode }: { barcode?: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!barcode) return <span className="text-muted-foreground">—</span>;
  return (
    <button
      className="group inline-flex items-center gap-1.5 font-mono text-[13px] text-muted-foreground hover:text-foreground max-w-[150px]"
      title={`Barcode ${barcode} — click to copy`}
      onClick={() => {
        void navigator.clipboard?.writeText(barcode).then(
          () => { setCopied(true); setTimeout(() => setCopied(false), 1200); },
          () => {}
        );
      }}
    >
      <span className="truncate">{barcode}</span>
      {copied ? <Check className="w-3.5 h-3.5 text-primary shrink-0" /> : <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 shrink-0" />}
    </button>
  );
}

export default function ProductTable({ products, showCost, offline, offlineReason, onAdjust, onRestock, onEdit, onDelete, onOpenProduct }: Props) {
  return (
    <Table>
      <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
        <TableRow className="hover:bg-transparent border-b h-12">
          <TableHead className="text-[13px] font-semibold px-4 min-w-[220px]">Product</TableHead>
          <TableHead className="text-[13px] font-semibold whitespace-nowrap">Price {showCost && <span className="font-normal text-muted-foreground">/ margin</span>}</TableHead>
          <TableHead className="text-[13px] font-semibold text-center min-w-[190px]">Stock</TableHead>
          <TableHead className="text-[13px] font-semibold hidden xl:table-cell">Barcode</TableHead>
          <TableHead className="text-[13px] font-semibold text-right px-4">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((p) => {
          const stock = p.stockQuantity ?? 0;
          const unit = p.unit || "pcs";
          const threshold = lowStockThresholdOf(p);
          const isLow = isLowStock(p);
          const isOut = isOutOfStock(p);
          const status = stockStatusOf(p);
          const sell = sellPriceOf(p as unknown as Parameters<typeof sellPriceOf>[0]);
          const margin = marginOf(p as unknown as Parameters<typeof marginOf>[0]);
          const marginPct = marginPctOf(p as unknown as Parameters<typeof marginPctOf>[0]);
          const healthPct = threshold > 0 ? Math.min(100, Math.max(4, (stock / (threshold * 3)) * 100)) : stock > 0 ? 100 : 0;
          return (
            <TableRow key={p.id} className={cn("h-[68px]", isOut && "bg-destructive/[0.04]")}>
              <TableCell className="py-3 px-4 max-w-[320px]">
                <button className="font-semibold text-sm leading-tight line-clamp-1 text-left hover:text-primary hover:underline underline-offset-2" onClick={() => onOpenProduct(p)} title={`${p.name} — open details`}>
                  {p.name}
                </button>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", status === "out" ? "bg-destructive" : status === "low" ? "bg-amber-500" : "bg-emerald-500")} title={status === "out" ? "Out of stock" : status === "low" ? `Low — ${stock} ${unit} left` : "In stock"} />
                  <span className="text-xs text-muted-foreground">{p.category} • {unit}</span>
                  {p.is_loose ? (
                    <Badge variant="secondary" className="text-[11px] h-5 px-1.5">Loose /kg</Badge>
                  ) : null}
                  <span className="text-[11px] font-mono text-muted-foreground xl:hidden">{p.barcode ? `• ${p.barcode.slice(0, 8)}…` : ""}</span>
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap align-top py-3">
                <div className="text-sm font-bold tabular-nums">
                  {p.is_loose ? `${formatINR(p.rate_per_kg || 0)}/kg` : formatINR(p.price || 0)}
                </div>
                {showCost ? (
                  <div className="text-[11px] text-muted-foreground tabular-nums mt-0.5" title={`Buy ${(p as { costPrice?: number }).costPrice != null ? formatINR((p as { costPrice?: number }).costPrice ?? 0) : "—"} → Sell ${formatINR(sell)}`}>
                    buy {formatINR((p as { costPrice?: number }).costPrice ?? 0, { compact: true })} •{" "}
                    <span className={cn("font-medium", margin < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400")}>
                      +{formatINR(margin, { compact: true })}{marginPct != null ? ` (${marginPct.toFixed(0)}%)` : ""}
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground">{p.is_loose ? "per kg" : unit}</div>
                )}
              </TableCell>
              <TableCell className="text-center align-top py-3">
                <div className="flex items-center justify-center gap-1.5">
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => onAdjust(p, -1)} disabled={stock <= 0 || offline} title={offline ? offlineReason : "Correct stock −1 (for counting fixes; use Restock for new purchases)"}>
                    <Minus className="w-4 h-4" />
                  </Button>
                  <button
                    onClick={() => onRestock(p)}
                    disabled={offline}
                    title={offline ? offlineReason : `Restock ${p.name} — add purchase qty (now ${stock} ${unit}, warn at ≤ ${threshold})`}
                    className={cn(
                      "min-w-[64px] h-9 px-2 rounded-md border font-mono text-sm font-bold tabular-nums transition-colors",
                      isOut ? "bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/15"
                        : isLow ? "bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200/70 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-200"
                        : "bg-muted/40 border-border hover:border-primary/40 hover:text-primary"
                    )}
                  >
                    {stock}
                  </button>
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => onAdjust(p, 1)} disabled={offline} title={offline ? offlineReason : "Correct stock +1 (for counting fixes; use Restock for new purchases)"}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="mt-1.5 w-[132px] mx-auto">
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full", isOut ? "bg-destructive" : isLow ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${healthPct}%` }} />
                  </div>
                  <div className={cn("text-[11px] mt-0.5 tabular-nums", isOut ? "text-destructive font-semibold" : isLow ? "text-amber-700 dark:text-amber-300 font-semibold" : "text-muted-foreground")} title={`Warns at ≤ ${threshold} ${unit}. Never blocks sales.`}>
                    {isOut ? "Out — restock now" : isLow ? `Low • ${stock} ${unit} left` : `warn ≤ ${threshold}`}
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                <BarcodeCell barcode={p.barcode} />
              </TableCell>
              <TableCell className="text-right px-4 align-middle">
                <div className="flex justify-end gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 bg-primary/5 border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground"
                    onClick={() => onRestock(p)}
                    disabled={offline}
                    title={offline ? offlineReason : "Restock — add new purchase qty & update price if supplier cost changed"}
                  >
                    <PackagePlus className="w-4 h-4" /> <span className="hidden 2xl:inline">Restock</span>
                  </Button>
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => onEdit(p)} disabled={offline} title={offline ? offlineReason : "Edit name, category, barcode, prices"}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={() => onDelete(p)} disabled={offline} title={offline ? offlineReason : "Delete (soft — past orders keep history)"}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
