"use client";

import { useAuthStore } from "@/store/authStore";
import type { ReceiptMeta } from "@/lib/print";

/**
 * Bill meta that is the same for every print in a session: cashier, counter
 * and session number. Callers merge this with bill-specific fields (bill no,
 * date, tender rows).
 */
export function useReceiptMeta(): Pick<ReceiptMeta, "cashier" | "counterNo" | "sessionNo"> {
  const user = useAuthStore((s) => s.user);
  const counters = useAuthStore((s) => s.counters);
  const selectedCounterId = useAuthStore((s) => s.selectedCounterId);

  const counterId = user?.counterId ?? selectedCounterId ?? null;
  const counter =
    user?.counter ?? counters.find((c) => c.id === counterId) ?? null;

  return {
    cashier: user?.name ?? null,
    counterNo: counter?.name ?? null,
    sessionNo: 1,
  };
}
