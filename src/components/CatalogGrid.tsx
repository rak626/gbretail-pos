"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useCartStore } from "@/store/cartStore";
import { products as staticProducts } from "@/data/products";
import type { Product } from "@/db/database";
import { formatINR } from "@/lib/utils";
import { fetchProducts } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import SearchBox from "@/components/SearchBox";
import { Search, Barcode } from "lucide-react";

const CATEGORIES = ["All", "Staples", "Loose Items", "Packaged", "Snacks", "Dairy", "Vegetables", "Spices"] as const;

export default function CatalogGrid() {
  const { searchQuery, activeCategory, setSearchQuery, setActiveCategory, openLooseModal, addItem } =
    useCartStore();
  const [products, setProducts] = useState<Product[]>(staticProducts as unknown as Product[]);
  const abortRef = useRef<AbortController | null>(null);

  const doFetch = useCallback(async (q: string, cat: string) => {
    if (q && (q.startsWith(" ") || q.trim().length < 3)) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const p = await fetchProducts(
        { search: q?.trim() || undefined, category: cat, limit: 10 },
        { signal: controller.signal }
      );
      if (controller.signal.aborted) return;
      setProducts(p as unknown as Product[]);
    } catch {
      if ((controller.signal as AbortSignal).aborted) return;
      setProducts(staticProducts as unknown as Product[]);
    }
  }, []);

  useEffect(() => {
    // initial load handled via doFetch with debounce via SearchBox
    doFetch(searchQuery, activeCategory);
    return () => abortRef.current?.abort();
  }, [activeCategory]);

  const handleImmediate = (v: string) => {
    if (v.startsWith(" ")) return;
    setSearchQuery(v);
  };

  const handleDebouncedSearch = (trimmed: string) => {
    if (!trimmed || trimmed.length < 3 || trimmed.startsWith(" ")) return;
    doFetch(trimmed, activeCategory);
  };

  const handleClearSearch = () => {
    if (abortRef.current) abortRef.current.abort();
    doFetch("", activeCategory);
  };

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.trim();
    if (!q || q.length < 3 || q.startsWith(" ")) return true;
    const matchesSearch =
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      (p.barcode?.includes(q) ?? false);
    if (activeCategory === "All") return true;
    if (activeCategory === "Loose Items") return p.is_loose;
    return p.category === activeCategory;
  });

  const handleAddProduct = (product: Product) => {
    if (product.is_loose) {
      openLooseModal({
        ...product,
        price: product.rate_per_kg || 0,
        unit: "kg",
      });
    } else {
      addItem({
        productId: product.id,
        name: product.name,
        price: product.price || 0,
        unit: "pcs",
        quantity: 1,
        lineTotal: product.price || 0,
        isCustom: false,
      });
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden gap-3">
      <Card className="py-0 border-primary/20 ring-1 ring-primary/5">
        <CardContent className="p-1.5 space-y-3">
          <SearchBox
            placeholder="Search product or barcode..."
            leftIcon={<Barcode className="w-4 h-4" />}
            value={searchQuery}
            onValueChange={handleImmediate}
            onSearch={handleDebouncedSearch}
            onClear={handleClearSearch}
            variant="plain"
          />
          <ScrollArea>
            <div className="flex gap-2 pb-2">
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat}
                  variant={activeCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(cat)}
                  className="whitespace-nowrap"
                >
                  {cat}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 p-1">
          {filteredProducts.map((product) => (
            <Card
              key={product.id}
              className="py-0 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all active:scale-[0.98] border-2"
              onClick={() => handleAddProduct(product)}
            >
              <CardContent className="p-4">
                <div className="font-medium text-sm leading-tight mb-1 line-clamp-2 min-h-[2.5rem]">
                  {product.name}
                </div>
                <div className="text-primary font-bold">
                  {product.is_loose
                    ? formatINR(product.rate_per_kg || 0) + "/kg"
                    : formatINR(product.price || 0)}
                </div>
                {product.is_loose && (
                  <Badge variant="secondary" className="mt-1 text-xs">Tap to select weight</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
