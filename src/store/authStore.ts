import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fetchCounters } from "@/lib/authApi";

export type AuthUser = {
  id: string;
  shopId: string | null;
  email: string;
  name: string;
  role: string;
  /** Owner-granted: STAFF with this flag can open + edit inventory */
  canManageInventory?: boolean;
  /** Owner-assigned till: STAFF bill on this counter (auto-attached at login) */
  counterId?: string | null;
  counter?: { id: string; name: string } | null;
  shop?: { id: string; name: string } | null;
};

export type Shop = {
  id: string;
  /** Human shop ID, GB-SHOP-1001… — shown in header/admin, immutable. */
  code?: string | null;
  name: string;
  address?: string | null;
  receiptName?: string | null;
  gstin?: string | null;
  upiId?: string | null;
  phone?: string | null;
  receiptFooter?: string | null;
};
export type Counter = { id: string; shopId: string; name: string; isActive: boolean };

type AuthState = {
  /** In-memory access token (Authorization header). Never persisted — refresh via httpOnly cookie. */
  accessToken: string | null;
  user: AuthUser | null;
  shop: Shop | null;
  counters: Counter[];
  selectedCounterId: string | null;
  hasHydrated: boolean;

  setAuth: (token: string, user: AuthUser, shop: Shop | null, counters?: Counter[]) => void;
  setToken: (token: string | null) => void;
  setCounters: (counters: Counter[]) => void;
  setSelectedCounter: (id: string | null) => void;
  setShop: (shop: Shop | null) => void;
  clearAuth: () => void;
  setHasHydrated: (v: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      shop: null,
      counters: [],
      selectedCounterId: null,
      hasHydrated: false,

      setAuth: (token, user, shop, counters) =>
        set(() => {
          // STAFF are bound to their assigned counter — ignore any persisted
          // or login-time choice so the header can never drift counters.
          const selectedCounterId =
            user.role === "STAFF"
              ? (user.counterId ?? null)
              : counters && counters.length
                ? counters[0]!.id
                : null;
          return {
            accessToken: token,
            user,
            shop: shop ?? (user.shop ?? null),
            counters: counters ?? [],
            selectedCounterId,
          };
        }),
      setToken: (token) => set({ accessToken: token }),
      setCounters: (counters) => set({ counters }),
      setSelectedCounter: (id) => set({ selectedCounterId: id }),
      setShop: (shop) => set({ shop }),
      clearAuth: () =>
        set(() => {
          return { accessToken: null, user: null, shop: null, counters: [], selectedCounterId: null };
        }),
      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: "gbretail-auth",
      // Tokens never persisted (XSS theft) — user/shop/counters only.
      // Access token lives in memory; refresh happens via httpOnly cookie.
      partialize: (s) => ({
        user: s.user,
        shop: s.shop,
        counters: s.counters,
        selectedCounterId: s.selectedCounterId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

/**
 * Re-sync the global counter list after a mutation (add/delete/restore).
 * Header pickers read this store, which is otherwise loaded only at login —
 * without this, newly created counters stay invisible until re-login.
 * Also heals the selection when the selected counter no longer exists.
 */
export async function refreshShopCounters(): Promise<void> {
  const { user, selectedCounterId } = useAuthStore.getState();
  if (!user?.shopId) return;
  try {
    const data = await fetchCounters(user.shopId);
    const list = data.counters ?? [];
    const patch: { counters: Counter[]; selectedCounterId?: string | null } = { counters: list };
    if (!list.some((c) => c.id === selectedCounterId)) {
      patch.selectedCounterId = list[0]?.id ?? null;
    }
    useAuthStore.setState(patch);
  } catch {
    // Keep the stale list — the calling page surfaces its own error state.
  }
}
