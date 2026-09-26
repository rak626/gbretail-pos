"use client";

import type { ProductStockFilter, ProductSortBy } from "@/lib/api";
import type { Product } from "@/db/database";

export type { ProductStockFilter, ProductSortBy };
export type { Product };

export type ProductForm = {
  name: string;
  category: string;
  is_loose: boolean;
  price: string;
  costPrice: string;
  rate_per_kg: string;
  barcode: string;
  unit: string;
  stockQuantity: string;
  lowStockThreshold: string;
  description: string;
};

export const emptyProductForm: ProductForm = {
  name: "",
  category: "Staples",
  is_loose: false,
  price: "",
  costPrice: "",
  rate_per_kg: "",
  barcode: "",
  unit: "pcs",
  stockQuantity: "100",
  lowStockThreshold: "10",
  description: "",
};

export const SORT_OPTIONS: Array<{ value: ProductSortBy; label: string }> = [
  { value: "name", label: "Name A–Z" },
  { value: "stock", label: "Stock: low first" },
  { value: "price", label: "Price: low first" },
  { value: "category", label: "Category" },
  { value: "recent", label: "Recently updated" },
];

export const STOCK_FILTERS: Array<{ value: ProductStockFilter; label: string }> = [
  { value: "all", label: "All stock" },
  { value: "in", label: "In stock" },
  { value: "low", label: "Low" },
  { value: "out", label: "Out" },
];
