import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AuthUser = {
  id: string;
  shopId: string | null;
  email: string;
  name: string;
  role: string;
  /** Owner-granted: STAFF with this flag can open + edit inventory */
  canManageInventory?: boolean;
  shop?: { id: string; name: string } | null;
};

export type Shop = { id: string; name: string; address?: string | null };
export type Counter = { id: string; shopId: string; name: string; isActive: boolean };

type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
  shop: Shop | null;
  counters: Counter[];
  selectedCounterId: string | null;
  hasHydrated: boolean;

  setAuth: (token: string, user: AuthUser, shop: Shop | null, counters?: Counter[]) => void;
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
          if (typeof window !== "undefined") localStorage.setItem("accessToken", token);
          return {
            accessToken: token,
            user,
            shop: shop ?? (user.shop ?? null),
            counters: counters ?? [],
            selectedCounterId: counters && counters.length ? counters[0].id : null,
          };
        }),
      setCounters: (counters) => set({ counters }),
      setSelectedCounter: (id) => set({ selectedCounterId: id }),
      setShop: (shop) => set({ shop }),
      clearAuth: () =>
        set(() => {
          if (typeof window !== "undefined") {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
          }
          return { accessToken: null, user: null, shop: null, counters: [], selectedCounterId: null };
        }),
      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: "gbretail-auth",
      partialize: (s) => ({
        user: s.user,
        shop: s.shop,
        counters: s.counters,
        selectedCounterId: s.selectedCounterId,
        accessToken: s.accessToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        if (state?.accessToken && typeof window !== "undefined") {
          localStorage.setItem("accessToken", state.accessToken);
        }
      },
    }
  )
);
