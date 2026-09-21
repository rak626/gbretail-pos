"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarState {
  collapsed: boolean;
  mobileOpen: boolean;
  hasHydrated: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (v: boolean) => void;
  toggleMobile: () => void;
  setMobileOpen: (v: boolean) => void;
  closeMobile: () => void;
  setHasHydrated: (v: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      mobileOpen: false,
      hasHydrated: false,
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
      setCollapsed: (v) => set({ collapsed: v }),
      toggleMobile: () => set((s) => ({ mobileOpen: !s.mobileOpen })),
      setMobileOpen: (v) => set({ mobileOpen: v }),
      closeMobile: () => set({ mobileOpen: false }),
      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: "gbretail-sidebar",
      partialize: (state) => ({ collapsed: state.collapsed }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
