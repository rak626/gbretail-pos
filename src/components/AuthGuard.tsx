"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { fetchMe } from "@/lib/authApi";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const user = useAuthStore((s) => s.user);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!hasHydrated) return;
    if (pathname === "/login") {
      setChecking(false);
      return;
    }
    // prevent re-running validation loop when user updates — run once per mount/path
    let cancelled = false;
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    const { user: currentUser } = useAuthStore.getState();
    // if we already have a user and token, just mark not checking — avoid re-validating every render
    // Do a single lightweight validation only on first mount
    const shouldValidate = !currentUser || !token;

    const doValidate = async () => {
      try {
        const data = await fetchMe();
        if (cancelled) return;
        const u = data.user as any;
        const shop = (data as any).shop ?? null;
        const counters = (data as any).counters ?? [];
        const newToken = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
        // Only update auth if user actually changed or missing, to avoid loop
        const state = useAuthStore.getState();
        const existingUserId = state.user?.id;
        if (!existingUserId || existingUserId !== u.id) {
          state.setAuth(newToken || token || "", u, shop, counters);
        } else if (JSON.stringify(state.counters) !== JSON.stringify(counters) || state.shop?.id !== shop?.id) {
          // update counters/shop without touching token if already same user
          useAuthStore.setState({ counters, shop });
        }
      } catch {
        if (!cancelled) {
          useAuthStore.getState().clearAuth();
          router.replace("/login");
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    if (shouldValidate) {
      doValidate();
    } else {
      // already authenticated — no need to hit /auth/me every render
      setChecking(false);
    }
    return () => {
      cancelled = true;
    };
  }, [hasHydrated, pathname, router]);

  if (pathname === "/login") return <>{children}</>;

  if (!hasHydrated || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <div className="text-sm text-muted-foreground">Checking authentication...</div>
      </div>
    );
  }

  // if no user after check, will redirect, show guard
  if (!user) return null;

  // STAFF is shop floor only: billing/orders/ledger always, inventory only when the
  // owner granted it. Bounce everything else to /
  const STAFF_BLOCKED = ["/customers", "/analytics", "/settings", "/admin", "/users"];
  if (user.role === "STAFF") {
    const staffDenied =
      STAFF_BLOCKED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
      ((pathname === "/inventory" || pathname.startsWith("/inventory/")) && !(user as any)?.canManageInventory);
    if (staffDenied) {
      router.replace("/");
      return null;
    }
    return <>{children}</>;
  }

  // SUPER_ADMIN is platform-level with no shop context: billing, orders and
  // inventory are owner & staff only. Ledger, Customers, Analytics,
  // Settings, Admin, Users stay accessible. Bounce the rest to /admin.
  const SUPER_BLOCKED = ["/orders", "/inventory"];
  const superDenied = pathname === "/" || SUPER_BLOCKED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (user.role === "SUPER_ADMIN" && superDenied) {
    router.replace("/admin");
    return null;
  }

  return <>{children}</>;
}
