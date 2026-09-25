"use client";

import { TrendingUp, TrendingDown } from "lucide-react";

export const COLORS = ["#16a34a", "#2563eb", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];
export const PAY_COLORS: Record<string, string> = { cash: "#16a34a", upi: "#2563eb", khata: "#f59e0b", split: "#8b5cf6" };

export function Delta({ value }: { value: number | null | undefined }) {
  // Invisible placeholder when no baseline — reserves the line so KPI cards
  // stay equal height instead of showing a broken-looking "—".
  if (value == null || isNaN(value)) return <span className="text-[11px] text-transparent select-none" aria-hidden>—</span>;
  const up = value > 0;
  const down = value < 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${up ? "text-primary" : down ? "text-destructive" : "text-muted-foreground"}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : down ? <TrendingDown className="w-3 h-3" /> : null}
      {value > 0 ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}
