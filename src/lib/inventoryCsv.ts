import type { Product } from "@/types";

function esc(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Client-side CSV export — no backend needed. Owner-only cost columns included by caller. */
export function productsToCsv(products: Product[], includeCost: boolean): string {
  const headers = includeCost
    ? ["name", "category", "type", "sellPrice", "costPrice", "margin", "stock", "unit", "warnAt", "barcode"]
    : ["name", "category", "type", "sellPrice", "stock", "unit", "barcode"];
  const lines = [headers.join(",")];
  for (const p of products) {
    const sell = p.is_loose ? (p.rate_per_kg ?? "") : (p.price ?? "");
    const row = includeCost
      ? [p.name, p.category, p.is_loose ? "loose" : "packaged", sell, (p as { costPrice?: unknown }).costPrice ?? "", sell !== "" && (p as { costPrice?: number }).costPrice != null ? Number(sell) - Number((p as { costPrice?: number }).costPrice ?? 0) : "", p.stockQuantity ?? "", p.unit ?? "", p.lowStockThreshold ?? "", p.barcode ?? ""]
      : [p.name, p.category, p.is_loose ? "loose" : "packaged", sell, p.stockQuantity ?? "", p.unit ?? "", p.barcode ?? ""];
    lines.push(row.map(esc).join(","));
  }
  return lines.join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export type ImportPreview = {
  rows: Array<Record<string, string>>;
  errors: string[];
};

/** Minimal CSV parser for New SKU bulk preview (comma-separated, quoted supported). */
export function parseInventoryCsv(text: string): ImportPreview {
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { rows: [], errors: ["CSV needs a header row + at least 1 product row"] };
  const split = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; }
          else quoted = false;
        } else cur += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ",") { out.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    out.push(cur.trim());
    return out;
  };
  const headers = split(lines[0]).map((h) => h.toLowerCase());
  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < Math.min(lines.length, 501); i++) {
    const cells = split(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = cells[idx] ?? ""; });
    if (!row.name) {
      errors.push(`Row ${i + 1}: missing name — skipped`);
      continue;
    }
    rows.push(row);
  }
  if (lines.length > 501) errors.push("Only first 500 rows imported — split larger files");
  return { rows, errors };
}
