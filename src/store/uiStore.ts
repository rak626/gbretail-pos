// DEPRECATED — UI transient state lives in cartStore (looseItemModalOpen,
// customItemModalOpen, paymentModalOpen, ...). This store has no usages
// (grep useUIStore -> only definition) and is kept to avoid breaking imports.
// New code must use useCartStore. Do not add new state here.
import { create } from "zustand";

interface UIState {
  looseItemModalOpen: boolean;
  looseProductId: string | null; // decoupled from Product type to avoid circular
  editingLooseIndex: number | null;
  customItemModalOpen: boolean;
  paymentModalOpen: boolean;
  addCustomerModalOpen: boolean;
  activeModal: string | null;
  hasHydrated: boolean;

  openLooseModal: (productId: string) => void;
  openLooseEditModal: (index: number) => void;
  closeLooseModal: () => void;
  openCustomModal: () => void;
  closeCustomModal: () => void;
  openPaymentModal: () => void;
  closePaymentModal: () => void;
  openAddCustomerModal: () => void;
  closeAddCustomerModal: () => void;
  setHasHydrated: (v: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  looseItemModalOpen: false,
  looseProductId: null,
  editingLooseIndex: null,
  customItemModalOpen: false,
  paymentModalOpen: false,
  addCustomerModalOpen: false,
  activeModal: null,
  hasHydrated: false,

  openLooseModal: (productId) => set({ looseItemModalOpen: true, looseProductId: productId, editingLooseIndex: null, activeModal: "loose" }),
  openLooseEditModal: (index) => set({ looseItemModalOpen: true, editingLooseIndex: index, activeModal: "loose" }),
  closeLooseModal: () => set({ looseItemModalOpen: false, looseProductId: null, editingLooseIndex: null, activeModal: null }),
  openCustomModal: () => set({ customItemModalOpen: true, activeModal: "custom" }),
  closeCustomModal: () => set({ customItemModalOpen: false, activeModal: null }),
  openPaymentModal: () => set({ paymentModalOpen: true }),
  closePaymentModal: () => set({ paymentModalOpen: false }),
  openAddCustomerModal: () => set({ addCustomerModalOpen: true, activeModal: "addCustomer" }),
  closeAddCustomerModal: () => set({ addCustomerModalOpen: false, activeModal: null }),
  setHasHydrated: (v) => set({ hasHydrated: v }),
}));
