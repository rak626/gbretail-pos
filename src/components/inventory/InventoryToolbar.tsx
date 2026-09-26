"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import SearchBox from "@/components/SearchBox";
import { cn } from "@/lib/utils";
import { ArrowDownWideNarrow, Download, Plus, Search, Upload } from "lucide-react";
import type { ProductSortBy, ProductStockFilter } from "./types";
import { SORT_OPTIONS, STOCK_FILTERS } from "./types";

type Props = {
  search: string;
  onSearchChange: (v: string) => void;
  onSearch: (trimmed: string) => void;
  onClearSearch: () => void;
  onFocusSearch: (q: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  categories: string[];
  category: string;
  onCategory: (c: string) => void;
  stockFilter: ProductStockFilter;
  onStockFilter: (f: ProductStockFilter) => void;
  sortBy: ProductSortBy;
  sortOrder: "asc" | "desc";
  onSort: (by: ProductSortBy, order: "asc" | "desc") => void;
  onAdd: () => void;
  onExport: () => void;
  onImportClick: () => void;
  offline: boolean;
  offlineReason?: string;
  resultCount: number;
};

export default function InventoryToolbar(p: Props) {
  const sortValue = `${p.sortBy}:${p.sortOrder}`;
  const sortLabel =
    sortValue === "name:desc" ? "Name Z–A"
    : sortValue === "stock:desc" ? "Stock: high first"
    : sortValue === "price:desc" ? "Price: high first"
    : (SORT_OPTIONS.find((o) => o.value === p.sortBy)?.label ?? "Sort");
  return (
    <Card className="py-0 border-primary/20 ring-1 ring-primary/5">
      <CardContent className="p-2 space-y-2.5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2 h-10 px-2 rounded-md border border-input bg-background focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 flex-1 min-w-0">
            <SearchBox
              placeholder="Search name, barcode or category… (min 2 chars, USB scanner ready)"
              leftIcon={<Search className="w-4 h-4" />}
              value={p.search}
              onValueChange={p.onSearchChange}
              onSearch={p.onSearch}
              onClear={p.onClearSearch}
              onFocusSearch={p.onFocusSearch}
              inputRef={p.searchRef}
              variant="plain"
              minChars={2}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Select
              value={sortValue}
              onValueChange={(v) => {
                if (!v) return;
                const [by, order] = (v as string).split(":") as [ProductSortBy, "asc" | "desc"];
                p.onSort(by, order);
              }}
            >
              <SelectTrigger className="h-10 min-w-[170px] text-sm" aria-label="Sort products">
                <ArrowDownWideNarrow className="w-4 h-4 text-muted-foreground" />
                <SelectValue>{sortLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={`${o.value}:asc`}>
                    {o.label}
                  </SelectItem>
                ))}
                <SelectItem value="name:desc">Name Z–A</SelectItem>
                <SelectItem value="stock:desc">Stock: high first</SelectItem>
                <SelectItem value="price:desc">Price: high first</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="h-10 px-3" onClick={p.onExport} title="Download current view as CSV">
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button variant="outline" className="h-10 px-3" onClick={p.onImportClick} disabled={p.offline} title={p.offline ? p.offlineReason : "Bulk add from CSV"}>
              <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Import</span>
            </Button>
            <Button onClick={p.onAdd} disabled={p.offline} title={p.offline ? p.offlineReason : "Create a brand-new SKU"} className="h-10 px-5 shrink-0">
              <Plus className="w-4 h-4" /> New SKU
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <ScrollArea className="flex-1 min-w-0">
            <div className="flex gap-2 pb-1" role="tablist" aria-label="Categories">
              {p.categories.map((cat) => (
                <Button
                  key={cat}
                  variant={p.category === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => p.onCategory(cat)}
                  className="whitespace-nowrap h-8"
                  role="tab"
                  aria-selected={p.category === cat}
                >
                  {cat}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Stock status">
            {STOCK_FILTERS.map((f) => (
              <Button
                key={f.value}
                variant={p.stockFilter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => p.onStockFilter(f.value)}
                className={cn("h-7 text-xs", p.stockFilter === f.value && f.value === "low" && "bg-amber-500 hover:bg-amber-500/90", p.stockFilter === f.value && f.value === "out" && "bg-destructive hover:bg-destructive/90")}
              >
                {f.label}
              </Button>
            ))}
          </div>
          <span className="text-[11px] text-muted-foreground ml-auto tabular-nums">
            {p.resultCount} shown • USB scanner: scan → Enter searches
          </span>
          {(p.stockFilter !== "all" || p.search) && (
            <Badge variant="secondary" className="text-[11px]">
              filtered
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
