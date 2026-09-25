"use client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableRow, TableCell } from "@/components/ui/table";
import { Minus, Plus, Trash2 } from "lucide-react";
import { formatINR, formatLooseQty, getPerUnitText } from "@/lib/format";
import type { CartItem } from "@/types";

interface CartRowProps {
  item: CartItem;
  index: number;
  onUpdateQty: (idx: number, qty: number) => void;
  onRemove: (idx: number) => void;
  onLooseEdit: (idx: number) => void;
}

export function CartRow({ item, index, onUpdateQty, onRemove, onLooseEdit }: CartRowProps) {
  const isLoose = !!item.is_loose || (!!item.weight && item.weight > 0);
  const isCustom = !!item.isCustom;

  return (
    <TableRow className="bg-card hover:bg-accent/50 border-b">
      <TableCell className="w-10 text-xs text-center text-muted-foreground">{index + 1}</TableCell>
      <TableCell className="min-w-0">
        <div className="text-[13px] font-semibold leading-tight truncate flex items-center gap-1.5">
          <span className="truncate">{item.name}</span>
          {isCustom && <Badge variant="outline" className="text-[9px] h-4 px-1 bg-amber-50 text-amber-700 border-amber-200 shrink-0">External</Badge>}
          {isLoose && !isCustom && <Badge variant="secondary" className="text-[9px] h-4 px-1 shrink-0">Loose</Badge>}
        </div>
      </TableCell>
      <TableCell className="w-24 text-center leading-tight">
        <div className="text-xs font-medium tabular-nums">{formatINR(item.price)}</div>
        <div className="text-[11px] text-muted-foreground">{getPerUnitText(item)}</div>
      </TableCell>
      <TableCell className="w-36">
        {isLoose && !isCustom ? (
          <div className="flex items-center justify-center gap-1.5">
            <Button variant="outline" size="icon" className="h-7 w-7 rounded-full p-0 shrink-0" onClick={() => onLooseEdit(index)} aria-label="Edit loose weight">
              <Minus className="w-3 h-3" />
            </Button>
            <span onClick={() => onLooseEdit(index)} className="min-w-[64px] h-7 flex items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tabular-nums cursor-pointer hover:bg-primary/15 px-2" title="Tap to edit weight">
              {formatLooseQty(item.weight)}
            </span>
            <Button size="icon" className="h-7 w-7 rounded-full p-0 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => onLooseEdit(index)} aria-label="Edit loose weight">
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        ) : isCustom ? (
          <div className="flex items-center justify-center"><Badge variant="outline" className="text-[11px]">—</Badge></div>
        ) : (
          <div className="flex items-center justify-center gap-1.5">
            <Button variant="outline" size="icon" className="h-7 w-7 rounded-full p-0 shrink-0" onClick={() => onUpdateQty(index, Math.max(0, (item.quantity || 0) - 1))} aria-label="Decrease quantity">
              <Minus className="w-3 h-3" />
            </Button>
            <span className="min-w-[32px] h-7 flex items-center justify-center rounded-full bg-muted border text-sm font-bold tabular-nums">
              {item.quantity || 0}
            </span>
            <Button size="icon" className="h-7 w-7 rounded-full p-0 shrink-0 bg-primary hover:bg-primary/90" onClick={() => onUpdateQty(index, (item.quantity || 0) + 1)} aria-label="Increase quantity">
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        )}
      </TableCell>
      <TableCell className="w-28 text-right font-bold text-[13px] tabular-nums">{formatINR(item.lineTotal)}</TableCell>
      <TableCell className="w-14 text-center">
        <Button variant="ghost" size="icon" onClick={() => onRemove(index)} className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10" aria-label={`Remove ${item.name}`}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
