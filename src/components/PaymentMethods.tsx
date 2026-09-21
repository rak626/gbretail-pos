"use client";
import { useState, useEffect } from "react";
import { useCartStore } from "@/store/cartStore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

export default function PaymentMethods() {
  const { openPaymentModal, items, hasHydrated } = useCartStore();
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);
  const shouldShow = hasHydrated && hasMounted;
  const isEmpty = !shouldShow ? true : items.length === 0;

  return (
    <Card className="py-0 gap-0">
      <CardHeader className="py-3 flex-row items-center gap-2">
        <CardTitle className="flex items-center gap-1 text-sm">
          <Wallet className="w-4 h-4 text-primary" />
          Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-5 space-y-3">
        <Button
          onClick={openPaymentModal}
          className="w-full h-11 justify-center gap-2 text-[14px] font-bold"
          disabled={isEmpty}
        >
          <Wallet className="w-4 h-4" />
          Payment
        </Button>
        <p className="text-[11px] text-muted-foreground text-center">
          Choose Cash, UPI, Khata or Split in next step
        </p>
      </CardContent>
    </Card>
  );
}
