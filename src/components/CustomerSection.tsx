"use client";

import { useCartStore } from "@/store/cartStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Phone, X, Users, ScanBarcode } from "lucide-react";

export default function CustomerSection() {
  const { currentCustomer, setCurrentCustomer, openAddCustomerModal } = useCartStore();

  const handleClear = () => {
    setCurrentCustomer(null);
  };

  const isWalking = !currentCustomer;

  return (
    <Card className="py-0 gap-0">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="flex items-center shrink-0 gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border flex items-center justify-center text-primary">
            <Users className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm hidden sm:block">Customer</span>
        </div>

        <div className="flex-1 min-w-0">
          {isWalking ? (
            <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/30 text-sm">
              <div className="w-7 h-7 rounded-full bg-muted border flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm leading-none">Walking Customer</div>
                <div className="text-[11px] text-muted-foreground">No customer selected — walk-in sale</div>
              </div>
              <Badge variant="outline" className="hidden sm:flex text-[11px]">Default</Badge>
            </div>
          ) : (
            <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-primary/5 border-primary/20 text-sm">
              <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="font-semibold truncate">{currentCustomer.name}</span>
                {currentCustomer.phone ? (
                  <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3" /> {currentCustomer.phone}
                  </span>
                ) : (
                  <span className="hidden sm:inline text-xs text-muted-foreground">No phone</span>
                )}
                {currentCustomer.balance > 0 && (
                  <Badge variant="secondary" className="text-[11px] hidden sm:flex">
                    Due: ₹{currentCustomer.balance.toFixed(2)}
                  </Badge>
                )}
                {currentCustomer.balance > 0 && (
                  <Badge variant="destructive" className="text-[11px] sm:hidden">
                    ₹{currentCustomer.balance.toFixed(0)}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                className="h-6 w-6 rounded-full shrink-0 hover:bg-destructive/10 hover:text-destructive"
                onClick={handleClear}
                aria-label="Clear customer"
                title="Switch to Walking Customer"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        <Button
          variant={isWalking ? "default" : "outline"}
          className="shrink-0 gap-2"
          onClick={openAddCustomerModal}
        >
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">{isWalking ? "Select Customer" : "Change"}</span>
          <span className="sm:hidden">{isWalking ? "Select" : "Change"}</span>
        </Button>

        <Button
          variant="outline"
          className="hidden lg:flex gap-2 shrink-0"
          onClick={() => window.dispatchEvent(new CustomEvent("focus-barcode"))}
        >
          <ScanBarcode className="w-4 h-4" /> Scan Barcode
        </Button>
      </CardContent>
    </Card>
  );
}
