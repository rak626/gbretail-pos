import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product, CartItem } from "@/types";
import { PRODUCT } from "@/config/constants";

export type { CartItem } from "@/types";

interface CartState {
  items: CartItem[];
  discount: number;
  heldOrders: CartItem[][];
  currentCustomer: { id: string; name: string; phone: string; balance: number; createdAt: number; updatedAt: number } | null;
  isOffline: boolean;
  searchQuery: string;
  activeCategory: string;
  looseItemModalOpen: boolean;
  looseProduct: Product | null;
  editingLooseIndex: number | null;
  customItemModalOpen: boolean;
  paymentModalOpen: boolean;
  addCustomerModalOpen: boolean;
  printReceipt: boolean;
  activeModal: string | null;
  hasHydrated: boolean;
  productFreq: Record<string, number>;
  recentIds: string[];

  addItem: (item: CartItem) => void;
  removeItem: (index: number) => void;
  updateQty: (index: number, qty: number) => void;
  updateWeight: (index: number, weight: number) => void;
  applyDiscount: (amount: number) => void;
  clearCart: () => void;
  holdOrder: () => void;
  resumeOrder: (items: CartItem[]) => void;
  resumeOrderByIndex: (index: number) => void;
  setCurrentCustomer: (customer: CartState["currentCustomer"]) => void;
  setOffline: (offline: boolean) => void;
  setSearchQuery: (query: string) => void;
  setActiveCategory: (category: string) => void;
  openLooseModal: (product: Product) => void;
  openLooseEditModal: (index: number) => void;
  closeLooseModal: () => void;
  openCustomModal: () => void;
  closeCustomModal: () => void;
  openPaymentModal: () => void;
  closePaymentModal: () => void;
  openAddCustomerModal: () => void;
  closeAddCustomerModal: () => void;
  calculateGrandTotal: () => number;
  setHasHydrated: (v: boolean) => void;
  recordRecentOnSale: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      discount: 0,
      heldOrders: [],
      currentCustomer: null,
      isOffline: false,
      searchQuery: "",
      activeCategory: "All",
      looseItemModalOpen: false,
      looseProduct: null,
      editingLooseIndex: null,
      customItemModalOpen: false,
      paymentModalOpen: false,
      addCustomerModalOpen: false,
      printReceipt: false,
      activeModal: null,
      hasHydrated: false,
      productFreq: {},
      recentIds: [],

      addItem: (item) =>
        set((state) => {
          const id = item.productId;
          let nextFreq = state.productFreq;
          if (id) {
            nextFreq = { ...state.productFreq, [id]: (state.productFreq[id] || 0) + 1 };
            // Cap freq map to prevent unbounded localStorage growth
            if (Object.keys(nextFreq).length > PRODUCT.MAX_FREQ_KEYS) {
              const entries = Object.entries(nextFreq).sort((a, b) => b[1] - a[1]);
              nextFreq = Object.fromEntries(entries.slice(0, PRODUCT.MAX_FREQ_KEYS));
            }
          }
          return {
            items: [...state.items, item],
            productFreq: nextFreq,
            activeModal: null,
            looseItemModalOpen: false,
            customItemModalOpen: false,
            paymentModalOpen: false,
            addCustomerModalOpen: false,
            printReceipt: false,
          };
        }),

      removeItem: (index) =>
        set((state) => ({
          items: state.items.filter((_, i) => i !== index),
        })),

      updateQty: (index, qty) =>
        set((state) => {
          // Auto-remove when qty <= 0 — prevents ghost 0-qty items
          if (qty <= 0) {
            return { items: state.items.filter((_, i) => i !== index) };
          }
          const items = [...state.items];
          if (items[index]) {
            items[index] = {
              ...items[index],
              quantity: qty,
              weight: undefined,
              lineTotal: items[index].price * qty,
            };
          }
          return { items };
        }),

      updateWeight: (index, weight) =>
        set((state) => {
          // Guard 0/negative weight → remove
          if (weight <= 0) {
            return { items: state.items.filter((_, i) => i !== index) };
          }
          const items = [...state.items];
          if (items[index]) {
            const rate = items[index].price;
            // Guard divide safety: rate must be >0
            if (rate <= 0) return { items };
            items[index] = {
              ...items[index],
              weight,
              quantity: 0,
              lineTotal: weight * rate,
            };
          }
          return { items };
        }),

      applyDiscount: (amount) => set({ discount: amount }),

      clearCart: () =>
        set({
          items: [],
          discount: 0,
          currentCustomer: null,
          activeModal: null,
          looseItemModalOpen: false,
          customItemModalOpen: false,
          paymentModalOpen: false,
          addCustomerModalOpen: false,
          printReceipt: false,
        }),

      holdOrder: () =>
        set((state) => ({
          heldOrders: [...state.heldOrders, state.items],
          items: [],
          discount: 0,
          currentCustomer: null,
          activeModal: null,
          looseItemModalOpen: false,
          customItemModalOpen: false,
          paymentModalOpen: false,
          addCustomerModalOpen: false,
          printReceipt: false,
        })),

      resumeOrder: (items) =>
        set((state) => {
          // Legacy: called with items array — find by reference, fallback to index param
          const idx = state.heldOrders.indexOf(items);
          if (idx === -1) {
            // If not found (new array copy), do not mutate heldOrders — just append items
            return { items: [...state.items, ...items] };
          }
          return {
            items: [...state.items, ...items],
            heldOrders: state.heldOrders.filter((_, i) => i !== idx),
          };
        }),
      // Preferred: resume by index (avoids reference equality bug)
      resumeOrderByIndex: (index: number) =>
        set((state) => {
          const held = state.heldOrders[index];
          if (!held) return {};
          return {
            items: [...state.items, ...held],
            heldOrders: state.heldOrders.filter((_, i) => i !== index),
          };
        }),

      setCurrentCustomer: (customer) => set({ currentCustomer: customer }),
      setOffline: (offline) => set({ isOffline: offline }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setActiveCategory: (category) => set({ activeCategory: category }),

      openLooseModal: (product) =>
        set({ looseItemModalOpen: true, looseProduct: product, editingLooseIndex: null, activeModal: "loose" }),
      openLooseEditModal: (index) =>
        set((state) => {
          const item = state.items[index];
          if (!item) return {};
          // reconstruct a Product-like object from cart item for editing
          const prod: Product = {
            id: item.productId || `edit-${index}`,
            name: item.name,
            is_loose: true,
            rate_per_kg: item.price,
            price: item.price,
            costPrice: item.costPrice ?? 0,
            category: item.category || "Loose Items",
            preset_weights: item.preset_weights,
            preset_prices: item.preset_prices,
          } as Product;
          // store weight in looseProduct + index for edit mode
          return { looseItemModalOpen: true, looseProduct: prod, editingLooseIndex: index, activeModal: "loose" };
        }),
      closeLooseModal: () =>
        set({ looseItemModalOpen: false, looseProduct: null, editingLooseIndex: null, activeModal: null }),

      openCustomModal: () =>
        set({ customItemModalOpen: true, activeModal: "custom" }),
      closeCustomModal: () =>
        set({ customItemModalOpen: false, activeModal: null }),

      openPaymentModal: () => set({ paymentModalOpen: true }),
      closePaymentModal: () => set({ paymentModalOpen: false }),

      openAddCustomerModal: () => set({ addCustomerModalOpen: true, activeModal: "addCustomer" }),
      closeAddCustomerModal: () => set({ addCustomerModalOpen: false, activeModal: null }),

      calculateGrandTotal: () => {
        const state = get();
        const subtotal = state.items.reduce((sum, item) => sum + item.lineTotal, 0);
        return Math.max(0, subtotal - state.discount);
      },
      setHasHydrated: (v) => set({ hasHydrated: v }),
      recordRecentOnSale: () =>
        set((state) => {
          let recent = [...state.recentIds];
          for (const item of state.items) {
            const id = item.productId;
            if (!id) continue;
            recent = [id, ...recent.filter((r) => r !== id)];
          }
          return { recentIds: recent.slice(0, PRODUCT.MAX_RECENT) };
        }),
    }),
    {
      name: "gbretail-cart",
      partialize: (state) => ({
        items: state.items,
        discount: state.discount,
        heldOrders: state.heldOrders,
        currentCustomer: state.currentCustomer,
        productFreq: state.productFreq,
        recentIds: state.recentIds,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export function initializeOfflineDetection(): () => void {
  const store = useCartStore.getState();
  store.setOffline(!navigator.onLine);

  const onOnline = () => store.setOffline(false);
  const onOffline = () => store.setOffline(true);
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  // Return cleanup for useEffect
  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
}

// Selectors — prefer these over subscribing to entire store to avoid rerenders
export const selectCartItems = (s: CartState) => s.items;
export const selectCartCount = (s: CartState) => s.items.length;
export const selectGrandTotal = (s: CartState) => {
  const subtotal = s.items.reduce((sum, it) => sum + it.lineTotal, 0);
  return Math.max(0, subtotal - s.discount);
};
export const selectHeldOrders = (s: CartState) => s.heldOrders;
