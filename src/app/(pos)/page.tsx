"use client";

import { useEffect, useMemo, useCallback, useState } from "react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useCartStore, initializeOfflineDetection } from "@/store/cartStore";
import CustomerSection from "@/components/CustomerSection";
import SearchBar from "@/components/SearchBar";
import CartTable from "@/components/CartTable";
import PosProductCard from "@/components/pos/PosProductCard";
import PosPayFooter from "@/components/pos/PosPayFooter";
import LooseItemModal from "@/components/LooseItemModal";
import CustomItemModal from "@/components/CustomItemModal";
import PaymentModal from "@/components/PaymentModal";
import AddCustomerDialog from "@/components/AddCustomerDialog";
import { products as staticProducts } from "@/data/products";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

export default function Home() {
  const looseItemModalOpen = useCartStore((s) => s.looseItemModalOpen);
  const customItemModalOpen = useCartStore((s) => s.customItemModalOpen);
  const paymentModalOpen = useCartStore((s) => s.paymentModalOpen);
  const addItem = useCartStore((s) => s.addItem);
  const openLooseModal = useCartStore((s) => s.openLooseModal);
  const productFreq = useCartStore((s) => s.productFreq);
  const recentIds = useCartStore((s) => s.recentIds);
  const [category, setCategory] = useState<string>("All");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of staticProducts) if ((p as any).category) set.add((p as any).category);
    return ["All", ...Array.from(set).sort()];
  }, []);

  // Memoized — avoids sorting on every cart change / rerender
  const mostFrequent = useMemo(() => {
    const filtered =
      category === "All" ? [...staticProducts] : staticProducts.filter((p) => (p as any).category === category);
    return filtered.sort((a, b) => {
      const fa = productFreq[a.id] || 0;
      const fb = productFreq[b.id] || 0;
      if (fa !== fb) return fb - fa;
      return 0;
    });
  }, [productFreq, category]);

  const recentProducts = useMemo(() => {
    return recentIds.map((id) => staticProducts.find((p) => p.id === id)).filter(Boolean) as typeof staticProducts;
  }, [recentIds]);

  const handleProductClick = useCallback(
    (p: Product) => {
      if (p.is_loose) {
        openLooseModal(p);
      } else {
        addItem({
          productId: p.id,
          name: p.name,
          price: p.price || p.rate_per_kg || 0,
          unit: "pcs",
          quantity: 1,
          lineTotal: p.price || p.rate_per_kg || 0,
          isCustom: false,
          is_loose: false,
          category: p.category,
          costPrice: p.costPrice ?? 0,
        });
      }
    },
    [addItem, openLooseModal]
  );

  useEffect(() => {
    const cleanup = initializeOfflineDetection();
    // Warm up API — check health via backend, fallback silently if DB not configured
    const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
    fetch(`${base}/api/health`).catch(() => {});
    return cleanup;
  }, []);

  useKeyboardShortcuts();

  return (
    <>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="grid grid-cols-12 gap-0 flex-1 min-h-0">
          {/* Left: customer + hero search + category chips + products */}
          <div className="col-span-12 lg:col-span-8 flex flex-col min-h-0 overflow-hidden lg:border-r bg-background">
            <div className="shrink-0 border-b bg-background px-3 py-1.5">
              <CustomerSection compact hideScan />
            </div>
            <div className="shrink-0 px-3 pt-3 pb-2">
              <SearchBar size="hero" />
            </div>
            <div className="shrink-0 px-3 pb-2 flex gap-1.5 overflow-x-auto">
              {categories.map((c) => (
                <Button
                  key={c}
                  variant={category === c ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategory(c)}
                  className={cn("h-9 rounded-full px-4 text-[13px] font-semibold shrink-0", category !== c && "bg-card")}
                >
                  {c}
                </Button>
              ))}
            </div>
            <div className="flex-1 overflow-auto px-3 pb-3 min-h-0 flex flex-col gap-4">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-0.5">
                  {category === "All" ? "Most frequent" : category}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                  {mostFrequent.slice(0, 12).map((p) => (
                    <PosProductCard key={`freq-${p.id}`} product={p as unknown as Product} onAdd={handleProductClick} />
                  ))}
                </div>
              </div>
              {recentProducts.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-0.5">Recent</h3>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {recentProducts.slice(0, 8).map((p) => (
                      <button
                        key={`recent-${p.id}`}
                        onClick={() => handleProductClick(p as unknown as Product)}
                        className="shrink-0 h-11 px-4 rounded-full bg-card border text-[13px] font-semibold hover:border-primary/40 active:scale-[0.98] transition-all whitespace-nowrap"
                      >
                        {(p as any).name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Right: cart + merged pay footer */}
          <div className="col-span-12 lg:col-span-4 flex flex-col min-h-0 overflow-hidden bg-card lg:bg-muted/20 border-t lg:border-t-0 p-3 gap-3">
            <div className="flex-1 min-h-0 overflow-auto flex flex-col">
              <CartTable />
            </div>
            <PosPayFooter />
          </div>
        </div>
      </div>

      {looseItemModalOpen && <LooseItemModal />}
      {customItemModalOpen && <CustomItemModal />}
      {paymentModalOpen && <PaymentModal />}
      <AddCustomerDialog />
    </>
  );
}
