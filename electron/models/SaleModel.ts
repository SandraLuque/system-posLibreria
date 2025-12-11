// electron/models/SaleModel.ts
import { getDatabase, generateId } from "../database/database";

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
  is_active: number;
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

export interface CreateSaleData {
  total: number;
  subtotal: number;
  tax?: number;
  discount?: number;
  payment_method: "cash" | "card" | "transfer";
  cashier_id: string;
  cashier_name: string;
  customer_name?: string;
  notes?: string;
  daily_number: number;
}

export interface CreateSaleItemData {
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface SaleWithItems extends Sale {
  items: SaleItem[];
}

/**
 * Crear nueva venta
 */
export const createSale = (data: CreateSaleData): Sale => {
  const db = getDatabase();
  const id = generateId();

  db.prepare(
    `
    INSERT INTO sales (
      id, total, subtotal, tax, discount, payment_method,
      cashier_id, cashier_name, customer_name, notes, daily_number
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    id,
    data.total,
    data.subtotal,
    data.tax || 0,
    data.discount || 0,
    data.payment_method,
    data.cashier_id,
    data.cashier_name,
    data.customer_name || null,
    data.notes || null,
    data.daily_number
  );

  const sale = findSaleById(id);
  if (!sale) {
    throw new Error("Error al crear la venta");
  }

  return sale;
};

/**
 * Crear item de venta
 */
export const createSaleItem = (data: CreateSaleItemData): SaleItem => {
  const db = getDatabase();
  const id = generateId();

  db.prepare(
    `
    INSERT INTO sale_items (
      id, sale_id, product_id, product_name,
      quantity, unit_price, total_price
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    id,
    data.sale_id,
    data.product_id,
    data.product_name,
    data.quantity,
    data.unit_price,
    data.total_price
  );

  const item = db.prepare("SELECT * FROM sale_items WHERE id = ?").get(id) as
    | SaleItem
    | undefined;

  if (!item) {
    throw new Error("Error al crear el item de venta");
  }

  return item;
};

/**
 * Buscar venta por ID
 */
export const findSaleById = (id: string): Sale | null => {
  const db = getDatabase();
  const result = db.prepare("SELECT * FROM sales WHERE id = ?").get(id) as
    | Sale
    | undefined;
  return result || null;
};

/**
 * Buscar venta con items por ID
 */
export const findSaleWithItemsById = (id: string): SaleWithItems | null => {
  const db = getDatabase();
  const sale = findSaleById(id);

  if (!sale) {
    return null;
  }

  const items = db
    .prepare("SELECT * FROM sale_items WHERE sale_id = ?")
    .all(id) as SaleItem[];

  return { ...sale, items };
};

/**
 * Obtener todas las ventas
 */
export const findAllSales = (): Sale[] => {
  const db = getDatabase();
  const query = "SELECT * FROM sales ORDER BY created_at DESC";
  return db.prepare(query).all() as Sale[];
};

/**
 * Obtener ventas activas
 */
export const findActiveSales = (): Sale[] => {
  const db = getDatabase();
  const query =
    "SELECT * FROM sales WHERE is_active = 1 ORDER BY created_at DESC";
  return db.prepare(query).all() as Sale[];
};

/**
 * Obtener ventas por fecha
 */
export const findSalesByDate = (date: string): Sale[] => {
  const db = getDatabase();
  const query = `
    SELECT * FROM sales 
    WHERE DATE(created_at) = DATE(?)
    ORDER BY created_at DESC
  `;
  return db.prepare(query).all(date) as Sale[];
};

/**
 * Obtener ventas entre fechas
 */
export const findSalesByDateRange = (from: string, to: string): Sale[] => {
  const db = getDatabase();
  const query = `
    SELECT * FROM sales 
    WHERE DATE(created_at) BETWEEN DATE(?) AND DATE(?)
    ORDER BY created_at DESC
  `;
  return db.prepare(query).all(from, to) as Sale[];
};

/**
 * Obtener ventas por cajero
 */
export const findSalesByCashier = (cashierId: string): Sale[] => {
  const db = getDatabase();
  const query = `
    SELECT * FROM sales 
    WHERE cashier_id = ?
    ORDER BY created_at DESC
  `;
  return db.prepare(query).all(cashierId) as Sale[];
};

/**
 * Obtener items de una venta
 */
export const findSaleItems = (saleId: string): SaleItem[] => {
  const db = getDatabase();
  const query = "SELECT * FROM sale_items WHERE sale_id = ?";
  return db.prepare(query).all(saleId) as SaleItem[];
};

/**
 * Cancelar venta (soft delete)
 */
export const cancelSale = (id: string): boolean => {
  const db = getDatabase();
  const result = db
    .prepare("UPDATE sales SET is_active = 0 WHERE id = ?")
    .run(id);
  return result.changes > 0;
};

/**
 * Obtener último número diario de venta
 */
export const getLastDailyNumber = (date: string): number => {
  const db = getDatabase();
  const result = db
    .prepare(
      `
    SELECT daily_number FROM sales
    WHERE DATE(created_at) = DATE(?)
    ORDER BY daily_number DESC
    LIMIT 1
  `
    )
    .get(date) as { daily_number: number } | undefined;

  return result ? result.daily_number : 0;
};

/**
 * Obtener total de ventas por método de pago
 */
export const getSalesByPaymentMethod = (
  from: string,
  to: string
): Array<{
  payment_method: string;
  total: number;
  count: number;
}> => {
  const db = getDatabase();
  const query = `
    SELECT 
      payment_method,
      SUM(total) as total,
      COUNT(*) as count
    FROM sales
    WHERE is_active = 1
      AND DATE(created_at) BETWEEN DATE(?) AND DATE(?)
    GROUP BY payment_method
  `;
  return db.prepare(query).all(from, to) as Array<{
    payment_method: string;
    total: number;
    count: number;
  }>;
};

/**
 * Obtener ventas del día actual
 */
export const findTodaySales = (): Sale[] => {
  const today = new Date().toISOString().split("T")[0];
  return findSalesByDate(today);
};
