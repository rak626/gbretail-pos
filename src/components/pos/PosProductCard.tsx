"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatINR } from "@/lib/format";
import { isLowStock, isOutOfStock } from "@/lib/stock";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";
import { Plus } from "lucide-react";

const CATEGORY_DOT: Record<string, string> = {
  Staples: "bg-primary",
  "Loose Items": "bg-primary",
  Packaged: "bg-blue-500",
  Snacks: "bg-amber-500",
  Dairy: "bg-sky-500",
  Vegetables: "bg-emerald-500",
  Spices: "bg-orange-500",
};

function dotFor(category?: string | null) {
  if (!category) return "bg-muted-foreground";
  return CATEGORY_DOT[category] ?? "bg-violet-500";
}

type Props = {
  product: Product;
  onAdd: (p: Product) => void;
};

/**
 * Fatigue-free product tile: big tap target, scannable price,
 * category dot + stock dot, full-card tap adds to cart.
 */
export default function PosProductCard({ product: p, onAdd }: Props) {
  const out = isOutOfStock(p as Product);
  const low = !out && isLowStock(p as Product);
  const price = (p as any).price || (p as any).rate_per_kg || 0;

  return (
    <Card
      className={cn(
        "py-0 cursor-pointer transition-all hover:border-primary/40 hover:-translate-y-px active:translate-y-0 active:scale-[0.98] rounded-2xl",
        out && "opacity-60 pointer-events-none"
      )}
      onClick={() => !out && onAdd(p)}
      aria-disabled={out}
    >
      <CardContent className="p-3.5 min-h-[102px] flex flex-col justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <span className={cn("mt-1.5 w-2 h-2 rounded-full shrink-0", dotFor(p.category))} />
          <div className="text-[15px] font-semibold leading-snug line-clamp-2 flex-1 min-h-[40px]">{p.name}</div>
          <span className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
            <Plus className="w-5 h-5" />
          </span>
        </div>
        <div className="flex items-center gap-2 pl-4">
          <span className="text-[18px] font-extrabold tabular-nums tracking-tight">{formatINR(price)}</span>
          {p.is_loose && <span className="text-[12px] text-muted-foreground font-semibold">/kg</span>}
          {out && (
            <span className="ml-auto flex items-center gap-1 text-[11px] font-bold text-destructive">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive" /> Out{typeof p.stockQuantity === "number" ? ` • ${p.stockQuantity}` : ""}
            </span>
          )}
          {low && (
            <span className="ml-auto flex items-center gap-1 text-[11px] font-bold text-amber-600">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Low{typeof p.stockQuantity === "number" ? ` • ${p.stockQuantity} left` : ""}
            </span>
          )}
          {!out && !low && typeof p.stockQuantity === "number" && (
            <span className="ml-auto text-[11px] font-medium text-muted-foreground tabular-nums">{p.stockQuantity} left</span>
          )}
          {!out && !low && p.stockQuantity == null && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
        </div>
      </CardContent>
    </Card>
  );
}
