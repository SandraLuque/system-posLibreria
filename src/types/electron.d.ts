// src/types/electron.d.ts

/**
 * Tipos para el API de Electron expuesto al renderer
 */

export interface User {
  id: string;
  username: string;
  role: "admin" | "cashier";
  full_name: string;
  is_active: boolean;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface RegisterInput {
  username: string;
  password: string;
  full_name: string;
  role: "admin" | "cashier";
}

export interface Product {
  id: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  min_stock: number;
  category?: string;
  barcode?: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductInput {
  name: string;
  price: number;
  cost?: number;
  stock?: number;
  min_stock?: number;
  category?: string;
  barcode?: string;
  description?: string;
  image_url?: string;
}

export interface UpdateProductInput {
  name?: string;
  price?: number;
  cost?: number;
  stock?: number;
  min_stock?: number;
  category?: string;
  barcode?: string;
  description?: string;
  image_url?: string;
  is_active?: boolean;
}

export interface ProductFilters {
  category?: string;
  search?: string;
  inStock?: boolean;
  lowStock?: boolean;
}

export interface Sale {
  id: string;
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  payment_method: "cash" | "card" | "transfer";
  cashier_id: string;
  cashier_name: string;
  customer_name?: string;
  notes?: string;
  daily_number: number;
  is_active: boolean;
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface CreateSaleInput {
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  subtotal: number;
  total: number;
  tax?: number;
  discount?: number;
  payment_method: "cash" | "card" | "transfer";
  cashier_id: string;
  cashier_name: string;
  customer_name?: string;
  notes?: string;
}

export interface SaleFilters {
  from?: string;
  to?: string;
  payment_method?: string;
  cashier?: string;
  status?: "active" | "cancelled";
}

export interface ProductStats {
  total: number;
  active: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
}

export interface SalesMetrics {
  totalSales: number;
  totalTickets: number;
  averageTicket: number;
  cancelledSales: number;
}

export interface TopProduct {
  product_id: string;
  product_name: string;
  quantity: number;
  revenue: number;
}

/**
 * Interface del API de Electron
 */
export interface ElectronAPI {
  auth: {
    login: (username: string, password: string) => Promise<LoginResponse>;
    register: (data: RegisterInput) => Promise<{ success: boolean }>;
    verifyToken: (token: string) => Promise<any>;
    getUserById: (id: string) => Promise<User>;
    getAllUsers: () => Promise<User[]>;
    changePassword: (
      userId: string,
      oldPassword: string,
      newPassword: string
    ) => Promise<{ success: boolean }>;
  };

  products: {
    getAll: (filters?: ProductFilters) => Promise<Product[]>;
    getOne: (id: string) => Promise<Product>;
    getByBarcode: (barcode: string) => Promise<Product>;
    create: (data: CreateProductInput) => Promise<Product>;
    update: (
      id: string,
      data: UpdateProductInput
    ) => Promise<{ success: boolean }>;
    delete: (id: string) => Promise<{ success: boolean }>;
    adjustStock: (
      productId: string,
      quantity: number,
      reason: string,
      userId: string
    ) => Promise<{ success: boolean }>;
    getCategories: () => Promise<string[]>;
    getLowStock: () => Promise<Product[]>;
    getOutOfStock: () => Promise<Product[]>;
    getStats: () => Promise<ProductStats>;
  };

  sales: {
    create: (
      data: CreateSaleInput
    ) => Promise<{ sale: Sale; daily_number: number }>;
    getAll: (filters?: SaleFilters) => Promise<Sale[]>;
    getById: (id: string) => Promise<Sale & { items: SaleItem[] }>;
    getToday: () => Promise<Sale[]>;
    cancel: (id: string, userId: string) => Promise<{ success: boolean }>;
    getMetrics: (from?: string, to?: string) => Promise<SalesMetrics>;
    getTopProducts: (
      limit?: number,
      from?: string,
      to?: string
    ) => Promise<TopProduct[]>;
  };
}

/**
 * Declaración global para window.electronAPI
 */
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
