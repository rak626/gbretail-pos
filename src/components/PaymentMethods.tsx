"use client";
import { useState, useEffect } from "react";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/button";

export default function PaymentMethods() {
  const { openPaymentModal, items, hasHydrated } = useCartStore();
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);
  const shouldShow = hasHydrated && hasMounted;
  const isEmpty = !shouldShow ? true : items.length === 0;

  return (
    <Button
      onClick={openPaymentModal}
      className="w-full h-12 justify-center gap-2 text-[15px] font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700"
      disabled={isEmpty}
    >
      Payment
    </Button>
  );
}
