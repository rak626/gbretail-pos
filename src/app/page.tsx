"use client";

import { useEffect, useMemo, useCallback } from "react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useCartStore, initializeOfflineDetection } from "@/store/cartStore";
import AppShell from "@/components/AppShell";
import CustomerSection from "@/components/CustomerSection";
import SearchBar from "@/components/SearchBar";
import CartTable from "@/components/CartTable";
import BillSummary from "@/components/BillSummary";
import QuickActions from "@/components/QuickActions";
import PaymentMethods from "@/components/PaymentMethods";
import LooseItemModal from "@/components/LooseItemModal";
import CustomItemModal from "@/components/CustomItemModal";
import PaymentModal from "@/components/PaymentModal";
import AddCustomerDialog from "@/components/AddCustomerDialog";
import { products as staticProducts } from "@/data/products";
import { formatINR } from "@/lib/format";
import { isLowStock, isOutOfStock } from "@/lib/stock";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScanBarcode } from "lucide-react";
import type { Product } from "@/types";

export default function Home() {
  const looseItemModalOpen = useCartStore((s) => s.looseItemModalOpen);
  const customItemModalOpen = useCartStore((s) => s.customItemModalOpen);
  const paymentModalOpen = useCartStore((s) => s.paymentModalOpen);
  const addItem = useCartStore((s) => s.addItem);
  const openLooseModal = useCartStore((s) => s.openLooseModal);
  const productFreq = useCartStore((s) => s.productFreq);
  const recentIds = useCartStore((s) => s.recentIds);

  // Memoized — avoids sorting 30 items on every cart change / rerender
  const mostFrequent = useMemo(() => {
    return [...staticProducts].sort((a, b) => {
      const fa = productFreq[a.id] || 0;
      const fb = productFreq[b.id] || 0;
      if (fa !== fb) return fb - fa;
      return 0;
    });
  }, [productFreq]);

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
    <AppShell>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="grid grid-cols-12 gap-0 flex-1 min-h-0">
          {/* Left half: customer + search (small) + products */}
          <div className="col-span-12 lg:col-span-8 flex flex-col min-h-0 overflow-hidden lg:border-r bg-background">
            <div className="shrink-0 border-b bg-background flex items-center justify-between gap-2">
              <div className="w-full max-w-[520px] lg:max-w-[440px]">
                <CustomerSection compact hideScan />
              </div>
              <div className="hidden lg:flex shrink-0 items-center pr-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 h-7 rounded-full px-2.5 text-xs font-medium border shadow-none"
                  onClick={() => window.dispatchEvent(new CustomEvent("focus-barcode"))}
                >
                  <ScanBarcode className="w-3.5 h-3.5" /> Scan Barcode
                </Button>
              </div>
            </div>
            <div className="shrink-0 px-2.5 pt-2 pb-1.5">
              <SearchBar />
            </div>
            <div className="flex-1 overflow-auto px-2.5 pb-2.5 min-h-0 flex flex-col gap-3">
              {/* Row 1: Most frequent - 15 products */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-0.5">Most Frequent Products</h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {mostFrequent.slice(0, 30).map((p) => (
                    <Card
                      key={`freq-${p.id}`}
                      className="py-0 cursor-pointer hover:border-primary/50 hover:shadow-sm transition-colors"
                      onClick={() => handleProductClick(p)}
                    >
                      <CardContent className="p-2.5">
                        <div className="text-sm font-medium leading-tight truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                          <span>{formatINR((p as any).price || (p as any).rate_per_kg || 0)}</span>
                          {isOutOfStock(p as Product) && <span className="text-[10px] font-semibold text-destructive">Out</span>}
                          {!isOutOfStock(p as Product) && isLowStock(p as Product) && <span className="text-[10px] font-semibold text-amber-600">Low</span>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              {/* Row 2: Recently selected - 5 in one row */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-0.5">Recent Products</h3>
                <div className="grid grid-cols-5 gap-1.5">
                  {recentProducts.slice(0, 5).map((p) => (
                    <Card
                      key={`recent-${p.id}`}
                      className="py-0 cursor-pointer hover:border-primary/50 hover:shadow-sm transition-colors"
                      onClick={() => handleProductClick(p)}
                    >
                      <CardContent className="p-2.5">
                        <div className="text-[13px] font-medium leading-tight truncate">{p.name}</div>
                        <div className="text-[11px] text-muted-foreground mt-1 truncate">{formatINR((p as any).price || (p as any).rate_per_kg || 0)}</div>
                      </CardContent>
                    </Card>
                  ))}
                  {recentProducts.length === 0 &&
                    Array.from({ length: 5 }).map((_, i) => (
                      <Card key={`recent-empty-${i}`} className="py-0 border-dashed bg-muted/30">
                        <CardContent className="p-2.5">
                          <div className="text-[11px] text-muted-foreground leading-tight truncate">No recent</div>
                          <div className="text-[11px] text-muted-foreground/60 mt-1">—</div>
                        </CardContent>
                      </Card>
                    ))}
                  {recentProducts.length > 0 &&
                    recentProducts.length < 5 &&
                    Array.from({ length: 5 - recentProducts.length }).map((_, i) => (
                      <Card key={`recent-fill-${i}`} className="py-0 border-dashed bg-muted/20">
                        <CardContent className="p-2.5">
                          <div className="text-[11px] text-muted-foreground/60 truncate">—</div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            </div>
          </div>
          {/* Right half: only Cart (no customer/search overlapping) */}
          <div className="col-span-12 lg:col-span-4 flex flex-col min-h-0 overflow-auto bg-muted/20 p-2.5 gap-2.5">
            <CartTable />
            <BillSummary />
            <QuickActions />
            <PaymentMethods />
          </div>
        </div>
      </div>

      <footer className="shrink-0 h-6 px-4 flex items-center justify-between bg-card border-t text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground">GB RETAIL</span>
          <span className="opacity-60">|</span>
          <span>POS System</span>
        </div>
        <div className="flex items-center gap-1">
          Built for a Better Business <span className="text-destructive">♥</span>
        </div>
      </footer>

      {looseItemModalOpen && <LooseItemModal />}
      {customItemModalOpen && <CustomItemModal />}
      {paymentModalOpen && <PaymentModal />}
      <AddCustomerDialog />
    </AppShell>
  );
}
