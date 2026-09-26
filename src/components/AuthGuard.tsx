"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { fetchMe } from "@/lib/authApi";

// Grants/roles go stale (owner revokes inventory, deactivation, shop changes) —
// revalidate at most this often on navigation + window focus.
const REVALIDATE_MS = 5 * 60 * 1000;

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const user = useAuthStore((s) => s.user);
  const [checking, setChecking] = useState(true);
  const lastValidatedRef = useRef(0);

  // Hard auth failures broadcast from apiClient (disabled account/shop, revoked
  // session): sign out centrally and land on login with the reason.
  useEffect(() => {
    const onRevoked = (e: Event) => {
      const reason = (e as CustomEvent<string>).detail || "SESSION_REVOKED";
      lastValidatedRef.current = 0;
      useAuthStore.getState().clearAuth();
      router.replace(`/login?reason=${encodeURIComponent(reason)}`);
    };
    window.addEventListener("auth:revoked", onRevoked);
    return () => window.removeEventListener("auth:revoked", onRevoked);
  }, [router]);

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
    // Validate when signed out OR when the last check is stale — grants, roles and
    // shop assignment refresh within REVALIDATE_MS instead of lingering till reload.
    const shouldValidate = !currentUser || !token || Date.now() - lastValidatedRef.current > REVALIDATE_MS;

    const doValidate = async () => {
      try {
        const data = await fetchMe();
        if (cancelled) return;
        lastValidatedRef.current = Date.now();
        const u = data.user as any;
        const shop = (data as any).shop ?? null;
        const counters = (data as any).counters ?? [];
        const newToken = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
        const storedRefresh = typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
        // Only update auth if user actually changed or missing, to avoid loop
        const state = useAuthStore.getState();
        const existingUserId = state.user?.id;
        if (!existingUserId || existingUserId !== u.id) {
          state.setAuth(newToken || token || "", u, shop, counters, storedRefresh ?? state.refreshToken ?? null);
        } else {
          // Same user: merge the FRESH profile (role, canManageInventory, counter,
          // shop assignment) so revoked grants apply without a reload.
          useAuthStore.setState({ user: u, counters, shop });
        }
      } catch (e) {
        if (!cancelled) {
          const code = (e as { code?: string })?.code;
          const reason = code === "ACCOUNT_DISABLED" || code === "SHOP_DISABLED" || code === "SESSION_REVOKED" || code === "REUSE_DETECTED" || code === "TOKEN_EXPIRED"
            ? `?reason=${encodeURIComponent(code)}`
            : "";
          useAuthStore.getState().clearAuth();
          router.replace(`/login${reason}`);
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

  // Revalidate on window focus when stale (owner changes apply while till sits open).
  useEffect(() => {
    const onFocus = () => {
      if (!hasHydrated || pathname === "/login") return;
      if (Date.now() - lastValidatedRef.current <= REVALIDATE_MS) return;
      const { user: u } = useAuthStore.getState();
      if (!u) return;
      lastValidatedRef.current = Date.now();
      fetchMe()
        .then((data) => {
          const fresh = (data as any).user;
          useAuthStore.setState({ user: fresh, shop: (data as any).shop ?? null, counters: (data as any).counters ?? [] });
        })
        .catch(() => {
          // leave stale session; next navigation revalidates (or 403s land centrally)
        });
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [hasHydrated, pathname]);

  // Role-based bounces must run as effects, not during render (React anti-pattern).
  const STAFF_BLOCKED = ["/customers", "/analytics", "/settings", "/admin", "/users"];
  const SUPER_BLOCKED = ["/orders", "/inventory"];
  const staffDenied =
    user?.role === "STAFF" &&
    (STAFF_BLOCKED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
      ((pathname === "/inventory" || pathname.startsWith("/inventory/")) && !(user as any)?.canManageInventory));
  const superDenied =
    user?.role === "SUPER_ADMIN" &&
    (pathname === "/" || SUPER_BLOCKED.some((p) => pathname === p || pathname.startsWith(`${p}/`)));

  useEffect(() => {
    if (!hasHydrated || checking || pathname === "/login" || !user) return;
    if (staffDenied) router.replace("/");
    else if (superDenied) router.replace("/admin");
  }, [hasHydrated, checking, pathname, user, staffDenied, superDenied, router]);

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
  if (staffDenied) return null;

  // SUPER_ADMIN is platform-level with no shop context: billing, orders and
  // inventory are owner & staff only. Ledger, Customers, Analytics,
  // Settings, Admin, Users stay accessible. Bounce the rest to /admin.
  if (superDenied) return null;

  return <>{children}</>;
}
