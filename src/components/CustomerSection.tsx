"use client";

import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Trash2, Users, Eye, ScanBarcode } from "lucide-react";
import CustomerDrawer from "@/components/customers/CustomerDrawer";

export default function CustomerSection({ compact, hideScan }: { compact?: boolean; hideScan?: boolean }) {
  const { currentCustomer, setCurrentCustomer, openAddCustomerModal } = useCartStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleClear = () => {
    setCurrentCustomer(null);
  };

  const isWalking = !currentCustomer;

  return (
    <>
      <div className={compact ? "flex items-center justify-between gap-2 py-1.5 px-3" : "flex items-center justify-between gap-3 py-2 px-2.5"}>
        {/* Left: icon + name */}
        <div className={compact ? "flex items-center gap-2 min-w-0 flex-1" : "flex items-center gap-3 min-w-0 flex-1"}>
          <div className={compact ? "w-7 h-7 rounded-md border bg-card flex items-center justify-center shrink-0 text-muted-foreground" : "w-8 h-8 rounded-lg border bg-card flex items-center justify-center shrink-0 text-muted-foreground"}>
            <Users className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
          </div>

          {isWalking ? (
            <div className="min-w-0 leading-tight">
              <div className={compact ? "font-medium text-[13px] leading-none truncate" : "font-medium text-[14px] leading-none truncate"}>Walking customer</div>
              <div className={compact ? "text-[11px] text-muted-foreground leading-none mt-0.5" : "text-xs text-muted-foreground leading-none mt-0.5"}>No customer selected</div>
            </div>
          ) : (
            <button
              type="button"
              className="min-w-0 text-left flex-1 flex flex-col justify-center hover:opacity-80 transition-opacity"
              onClick={() => setDrawerOpen(true)}
              title="View customer details"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={compact ? "font-medium text-[13px] leading-none truncate" : "font-medium text-[14px] leading-none truncate"}>{currentCustomer.name}</span>
                <Eye className="w-3 h-3 text-muted-foreground shrink-0 hidden sm:block" />
                {currentCustomer.balance > 0 && (
                  <Badge variant="destructive" className="text-[10px] h-4 px-1.5 ml-1">Due ₹{currentCustomer.balance.toFixed(0)}</Badge>
                )}
              </div>
              <div className={compact ? "flex items-center gap-1 text-[11px] text-muted-foreground leading-none mt-0.5 min-w-0" : "flex items-center gap-1.5 text-xs text-muted-foreground leading-none mt-0.5 min-w-0"}>
                {currentCustomer.phone ? (
                  <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {currentCustomer.phone}</span>
                ) : (
                  <span>No phone</span>
                )}
                <span className="hidden sm:inline">• {currentCustomer.balance > 0 ? `Due ₹${currentCustomer.balance.toFixed(0)}` : "No dues"}</span>
              </div>
            </button>
          )}
        </div>

        {/* Right: action */}
        <div className={compact ? "flex items-center gap-1.5 shrink-0" : "flex items-center gap-2 shrink-0"}>
          {!isWalking && (
            <Button
              variant="ghost"
              size="icon-sm"
              className={compact ? "h-6 w-6 rounded-full shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10" : "h-7 w-7 rounded-full shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"}
              onClick={handleClear}
              aria-label="Clear customer"
              title="Switch to walking customer"
            >
              <Trash2 className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className={compact ? "h-7 rounded-full px-3 text-xs font-medium border shadow-none" : "h-8 rounded-full px-4 text-sm font-medium border shadow-none"}
            onClick={openAddCustomerModal}
          >
            {isWalking ? "Select customer" : "Change"}
          </Button>
          {!hideScan && (
            <Button
              variant="outline"
              size="sm"
              className={compact ? "hidden lg:inline-flex gap-1 h-7 rounded-full px-2.5 text-xs font-medium border shadow-none" : "hidden lg:inline-flex gap-1.5 h-8 rounded-full px-3 text-sm font-medium border shadow-none"}
              onClick={() => window.dispatchEvent(new CustomEvent("focus-barcode"))}
            >
              <ScanBarcode className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} /> Scan Barcode
            </Button>
          )}
        </div>
      </div>

      {currentCustomer && (
        <CustomerDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          customerId={currentCustomer.id}
          onUpdated={() => {}}
          onDeleted={() => {
            setCurrentCustomer(null);
          }}
        />
      )}
    </>
  );
}
