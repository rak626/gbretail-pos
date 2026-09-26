"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Package, AlertTriangle, Boxes, Wallet } from "lucide-react";
import type { ProductStockFilter } from "./types";

type Props = {
  total: number;
  low: number;
  out: number;
  categories: number;
  stockValueSell?: number;
  stockValueCost?: number;
  showCost: boolean;
  activeFilter: ProductStockFilter;
  onSelectFilter: (f: ProductStockFilter) => void;
};

export default function InventoryStats({ total, low, out, categories, stockValueSell, stockValueCost, showCost, activeFilter, onSelectFilter }: Props) {
  const cards: Array<{
    key: ProductStockFilter | "total" | "value";
    label: string;
    value: string;
    sub?: string;
    icon: React.ReactNode;
    iconClass: string;
    active?: boolean;
    onClick?: () => void;
  }> = [
    {
      key: "total",
      label: "Total Products",
      value: String(total),
      sub: `${categories} categories`,
      icon: <Package className="w-5 h-5" />,
      iconClass: "bg-primary/10 border text-primary",
      active: activeFilter === "all",
      onClick: () => onSelectFilter("all"),
    },
    {
      key: "low",
      label: "Low Stock",
      value: String(low),
      sub: low > 0 ? "needs order" : "all healthy",
      icon: <AlertTriangle className="w-5 h-5" />,
      iconClass: "bg-amber-100 border border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300",
      active: activeFilter === "low",
      onClick: () => onSelectFilter(activeFilter === "low" ? "all" : "low"),
    },
    {
      key: "out",
      label: "Out of Stock",
      value: String(out),
      sub: out > 0 ? "restock now" : "nothing empty",
      icon: <Boxes className="w-5 h-5" />,
      iconClass: "bg-destructive/10 border border-destructive/20 text-destructive",
      active: activeFilter === "out",
      onClick: () => onSelectFilter(activeFilter === "out" ? "all" : "out"),
    },
    {
      key: "value",
      label: showCost ? "Stock Value (sell)" : "Stock Value",
      value: formatINR(stockValueSell ?? 0, { compact: true }),
      sub: showCost ? `cost ${formatINR(stockValueCost ?? 0, { compact: true })}` : undefined,
      icon: <Wallet className="w-5 h-5" />,
      iconClass: "bg-primary/10 border border-primary/20 text-primary",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Card
          key={c.key}
          className={cn(
            "py-0 gap-0 transition-shadow",
            c.onClick && "cursor-pointer hover:ring-1 hover:ring-primary/30",
            c.active && "ring-1 ring-primary/50 border-primary/40"
          )}
          onClick={c.onClick}
          title={c.onClick ? "Click to filter the table" : undefined}
          role={c.onClick ? "button" : undefined}
          tabIndex={c.onClick ? 0 : undefined}
          onKeyDown={c.onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); c.onClick?.(); } } : undefined}
        >
          <CardContent className="p-3 flex flex-row items-center gap-3">
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center shrink-0", c.iconClass)}>{c.icon}</div>
            <div className="min-w-0">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium truncate">{c.label}</div>
              <div className="text-xl font-black leading-none tabular-nums">{c.value}</div>
              {c.sub && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{c.sub}</div>}
            </div>
            {c.key === "total" && (
              <Badge variant="secondary" className="ml-auto hidden sm:flex shrink-0">{categories} cats</Badge>
            )}
            {(c.key === "low" || c.key === "out") && c.active && (
              <Badge className="ml-auto hidden sm:flex shrink-0">filtered</Badge>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
