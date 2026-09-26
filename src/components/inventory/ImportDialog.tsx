"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { parseInventoryCsv } from "@/lib/inventoryCsv";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  importing: boolean;
  progress: string;
  onImport: (rows: Array<Record<string, string>>) => void;
};

export default function ImportDialog({ open, onOpenChange, importing, progress, onImport }: Props) {
  const [text, setText] = useState("");
  const preview = text.trim() ? parseInventoryCsv(text) : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden max-h-[calc(100%-3rem)] flex flex-col">
        <DialogHeader className="p-5 pb-3 shrink-0">
          <DialogTitle className="text-[15px]">Import SKUs from CSV</DialogTitle>
          <DialogDescription className="text-[12px]">
            Header: <span className="font-mono">name, category, type, sellPrice, costPrice, stock, unit, barcode</span> — type is <span className="font-mono">packaged</span> or <span className="font-mono">loose</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 pb-4 space-y-3 overflow-auto">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"name, category, type, sellPrice, costPrice, stock, unit, barcode\nTata Salt 1kg, Staples, packaged, 28, 22, 100, pcs, 8901001\nSugar, Staples, loose, 48, 40, 50, kg,"}
            className="min-h-[140px] font-mono text-xs"
            rows={7}
          />
          <label className="text-xs text-muted-foreground block">
            Or pick a .csv file:{" "}
            <input
              type="file"
              accept=".csv,text/csv"
              className="text-xs"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                void f.text().then(setText);
              }}
            />
          </label>
          {preview && (
            <div className="text-xs space-y-1.5">
              <div className="flex gap-2 items-center">
                <Badge variant="secondary">{preview.rows.length} ready</Badge>
                {preview.errors.map((er, i) => (
                  <span key={i} className="text-destructive">{er}</span>
                ))}
              </div>
              {preview.rows.slice(0, 5).map((r, i) => (
                <div key={i} className="rounded border px-2 py-1 font-mono truncate">
                  {r.name} • {r.category || "Staples"} • {r.type || "packaged"} • ₹{r.sellprice || r.sellPrice || "?"} / buy ₹{r.costprice || r.costPrice || "?"}
                </div>
              ))}
              {preview.rows.length > 5 && <div className="text-muted-foreground">…and {preview.rows.length - 5} more</div>}
            </div>
          )}
          {progress && <div className="text-xs font-medium text-primary">{progress}</div>}
        </div>
        <DialogFooter className="p-4 gap-3 sm:justify-end border-t shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>Cancel</Button>
          <Button disabled={importing || !preview || preview.rows.length === 0} onClick={() => preview && onImport(preview.rows)}>
            {importing ? "Importing…" : `Import ${preview?.rows.length ?? 0} SKUs`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
