"use client";

import { useEffect } from "react";
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

export default function Home() {
  const { looseItemModalOpen, customItemModalOpen, paymentModalOpen } =
    useCartStore();

  useEffect(() => {
    initializeOfflineDetection();
    // Warm up API — check health via backend, fallback silently if DB not configured
    const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
    fetch(`${base}/api/health`).catch(() => {});
  }, []);

  useKeyboardShortcuts();

  return (
    <AppShell>
      <div className="flex-1 flex flex-col gap-3 p-3 overflow-auto min-h-0">
        <CustomerSection />
        <SearchBar />

        <div className="grid grid-cols-12 gap-3 items-start">
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-3">
            <CartTable />
          </div>
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">
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
