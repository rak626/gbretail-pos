"use client";

import { useAuthStore } from "@/store/authStore";
import PosShell from "@/components/pos/PosShell";
import AdminShell from "@/components/admin/AdminShell";

/**
 * Shell switch for billing routes: staff get the kiosk chrome,
 * owners get the admin console chrome around the SAME billing content.
 * (SUPER_ADMIN never reaches here — AuthGuard bounces to /admin.)
 */
export default function PosShellSelector({ children }: { children: React.ReactNode }) {
  const role = useAuthStore((s) => s.user?.role);
  if (role === "SHOP_OWNER") return <AdminShell>{children}</AdminShell>;
  return <PosShell>{children}</PosShell>;
}
