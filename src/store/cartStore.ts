import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/db/database";

export interface CartItem {
  productId?: string;
  name: string;
  price: number;
  unit: string;
  quantity?: number;
  weight?: number;
  lineTotal: number;
  isCustom: boolean;
  costPrice?: number;
  category?: string;
  preset_weights?: number[];
  preset_prices?: number[];
}

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
  customItemModalOpen: boolean;
  paymentModalOpen: boolean;
  addCustomerModalOpen: boolean;
  printReceipt: boolean;
  activeModal: string | null;
  hasHydrated: boolean;

  addItem: (item: CartItem) => void;
  removeItem: (index: number) => void;
  updateQty: (index: number, qty: number) => void;
  updateWeight: (index: number, weight: number) => void;
  applyDiscount: (amount: number) => void;
  clearCart: () => void;
  holdOrder: () => void;
  resumeOrder: (items: CartItem[]) => void;
  setCurrentCustomer: (customer: CartState["currentCustomer"]) => void;
  setOffline: (offline: boolean) => void;
  setSearchQuery: (query: string) => void;
  setActiveCategory: (category: string) => void;
  openLooseModal: (product: Product) => void;
  closeLooseModal: () => void;
  openCustomModal: () => void;
  closeCustomModal: () => void;
  openPaymentModal: () => void;
  closePaymentModal: () => void;
  openAddCustomerModal: () => void;
  closeAddCustomerModal: () => void;
  calculateGrandTotal: () => number;
  setHasHydrated: (v: boolean) => void;
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
      customItemModalOpen: false,
      paymentModalOpen: false,
      addCustomerModalOpen: false,
      printReceipt: false,
      activeModal: null,
      hasHydrated: false,

      addItem: (item) =>
        set((state) => ({
          items: [...state.items, item],
          activeModal: null,
          looseItemModalOpen: false,
          customItemModalOpen: false,
          paymentModalOpen: false,
          addCustomerModalOpen: false,
          printReceipt: false,
        })),

      removeItem: (index) =>
        set((state) => ({
          items: state.items.filter((_, i) => i !== index),
        })),

      updateQty: (index, qty) =>
        set((state) => {
          const items = [...state.items];
          if (items[index]) {
            items[index] = {
              ...items[index],
              quantity: qty,
              lineTotal: items[index].price * qty,
            };
          }
          return { items };
        }),

      updateWeight: (index, weight) =>
        set((state) => {
          const items = [...state.items];
          if (items[index]) {
            const rate = items[index].price;
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
        set((state) => ({
          items: [...state.items, ...items],
          heldOrders: state.heldOrders.filter(
            (_, i) => i !== state.heldOrders.indexOf(items)
          ),
        })),

      setCurrentCustomer: (customer) => set({ currentCustomer: customer }),
      setOffline: (offline) => set({ isOffline: offline }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setActiveCategory: (category) => set({ activeCategory: category }),

      openLooseModal: (product) =>
        set({ looseItemModalOpen: true, looseProduct: product, activeModal: "loose" }),
      closeLooseModal: () =>
        set({ looseItemModalOpen: false, looseProduct: null, activeModal: null }),

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
    }),
    {
      name: "gbretail-cart",
      partialize: (state) => ({
        items: state.items,
        discount: state.discount,
        heldOrders: state.heldOrders,
        currentCustomer: state.currentCustomer,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export function initializeOfflineDetection() {
  const store = useCartStore.getState();
  store.setOffline(!navigator.onLine);

  window.addEventListener("online", () => store.setOffline(false));
  window.addEventListener("offline", () => store.setOffline(true));
}
