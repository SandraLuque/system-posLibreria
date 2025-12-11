// electron/services/SalesService.ts
import { getDatabase, withTransaction, generateId } from "../database/database";

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

export interface SaleMetrics {
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

export class SalesService {
  /**
   * Crear nueva venta
   */
  create(data: CreateSaleInput): { sale: Sale; daily_number: number } {
    const db = getDatabase();

    if (!data.items || data.items.length === 0) {
      throw new Error("La venta debe tener al menos un producto");
    }

    if (data.total <= 0) {
      throw new Error("El total debe ser mayor a cero");
    }

    return withTransaction(db, () => {
      // 1. Generar número diario
      const today = new Date().toISOString().split("T")[0];
      const lastSale = db
        .prepare(
          `
        SELECT daily_number FROM sales
        WHERE DATE(created_at) = DATE(?)
        ORDER BY daily_number DESC
        LIMIT 1
      `
        )
        .get(today) as { daily_number: number } | undefined;

      const dailyNumber = lastSale ? lastSale.daily_number + 1 : 1;

      // 2. Insertar venta
      const saleId = generateId();
      db.prepare(
        `
        INSERT INTO sales (
          id, total, subtotal, tax, discount, payment_method,
          cashier_id, cashier_name, customer_name, notes, daily_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        saleId,
        data.total,
        data.subtotal,
        data.tax || 0,
        data.discount || 0,
        data.payment_method,
        data.cashier_id,
        data.cashier_name,
        data.customer_name || null,
        data.notes || null,
        dailyNumber
      );

      // 3. Preparar statements
      const insertItem = db.prepare(`
        INSERT INTO sale_items (
          id, sale_id, product_id, product_name,
          quantity, unit_price, total_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const getProductStock = db.prepare(
        "SELECT stock FROM products WHERE id = ?"
      );

      const updateStock = db.prepare(
        "UPDATE products SET stock = stock - ? WHERE id = ?"
      );

      const insertMovement = db.prepare(`
        INSERT INTO stock_movements (
          id, product_id, movement_type, quantity,
          previous_stock, new_stock, reference_id, created_by
        ) VALUES (?, ?, 'sale', ?, ?, ?, ?, ?)
      `);

      // 4. Procesar items
      for (const item of data.items) {
        // Verificar stock disponible
        const product = getProductStock.get(item.product_id) as
          | { stock: number }
          | undefined;

        if (!product) {
          throw new Error(`Producto "${item.product_name}" no encontrado`);
        }

        if (product.stock < item.quantity) {
          throw new Error(
            `Stock insuficiente para "${item.product_name}". ` +
              `Disponible: ${product.stock}, Solicitado: ${item.quantity}`
          );
        }

        // Insertar item de venta
        insertItem.run(
          generateId(),
          saleId,
          item.product_id,
          item.product_name,
          item.quantity,
          item.unit_price,
          item.total_price
        );

        // Actualizar stock
        const previousStock = product.stock;
        const newStock = previousStock - item.quantity;
        updateStock.run(item.quantity, item.product_id);

        // Registrar movimiento de stock
        insertMovement.run(
          generateId(),
          item.product_id,
          item.quantity,
          previousStock,
          newStock,
          saleId,
          data.cashier_id
        );
      }

      // 5. Retornar venta creada
      const sale = db
        .prepare("SELECT * FROM sales WHERE id = ?")
        .get(saleId) as Sale;

      return { sale, daily_number: dailyNumber };
    });
  }

  /**
   * Obtener todas las ventas (con filtros)
   */
  getAll(filters?: SaleFilters): Sale[] {
    const db = getDatabase();
    let query = "SELECT * FROM sales WHERE 1=1";
    const params: (string | number)[] = [];

    if (filters?.from) {
      query += " AND DATE(created_at) >= DATE(?)";
      params.push(filters.from);
    }

    if (filters?.to) {
      query += " AND DATE(created_at) <= DATE(?)";
      params.push(filters.to);
    }

    if (filters?.payment_method) {
      query += " AND payment_method = ?";
      params.push(filters.payment_method);
    }

    if (filters?.cashier) {
      query += " AND cashier_id = ?";
      params.push(filters.cashier);
    }

    if (filters?.status === "active") {
      query += " AND is_active = 1";
    } else if (filters?.status === "cancelled") {
      query += " AND is_active = 0";
    }

    query += " ORDER BY created_at DESC";

    return db.prepare(query).all(...params) as Sale[];
  }

  /**
   * Obtener venta por ID (con items)
   */
  getById(id: string): (Sale & { items: SaleItem[] }) | undefined {
    const db = getDatabase();

    const sale = db.prepare("SELECT * FROM sales WHERE id = ?").get(id) as
      | Sale
      | undefined;

    if (!sale) {
      return undefined;
    }

    const items = db
      .prepare("SELECT * FROM sale_items WHERE sale_id = ?")
      .all(id) as SaleItem[];

    return { ...sale, items };
  }

  /**
   * Obtener ventas del día actual
   */
  getToday(): Sale[] {
    const db = getDatabase();
    const today = new Date().toISOString().split("T")[0];

    const sales = db
      .prepare(
        `
      SELECT * FROM sales
      WHERE DATE(created_at) = DATE(?)
      ORDER BY created_at DESC
    `
      )
      .all(today) as Sale[];

    return sales;
  }

  /**
   * Cancelar venta
   */
  cancel(id: string, userId: string): void {
    const db = getDatabase();

    withTransaction(db, () => {
      // Verificar que existe y está activa
      const sale = db
        .prepare("SELECT * FROM sales WHERE id = ? AND is_active = 1")
        .get(id) as Sale | undefined;

      if (!sale) {
        throw new Error("Venta no encontrada o ya cancelada");
      }

      // Obtener items de la venta
      const items = db
        .prepare("SELECT * FROM sale_items WHERE sale_id = ?")
        .all(id) as SaleItem[];

      // Preparar statements
      const updateStock = db.prepare(
        "UPDATE products SET stock = stock + ? WHERE id = ?"
      );

      const getProductStock = db.prepare(
        "SELECT stock FROM products WHERE id = ?"
      );

      const insertMovement = db.prepare(`
        INSERT INTO stock_movements (
          id, product_id, movement_type, quantity,
          previous_stock, new_stock, reference_id, created_by, notes
        ) VALUES (?, ?, 'adjustment', ?, ?, ?, ?, ?, ?)
      `);

      // Revertir stock de cada producto
      for (const item of items) {
        const product = getProductStock.get(item.product_id) as
          | { stock: number }
          | undefined;

        if (product) {
          const previousStock = product.stock;
          const newStock = previousStock + item.quantity;

          // Actualizar stock
          updateStock.run(item.quantity, item.product_id);

          // Registrar movimiento
          insertMovement.run(
            generateId(),
            item.product_id,
            item.quantity,
            previousStock,
            newStock,
            id,
            userId,
            `Cancelación de venta #${sale.daily_number}`
          );
        }
      }

      // Marcar venta como cancelada
      db.prepare("UPDATE sales SET is_active = 0 WHERE id = ?").run(id);
    });
  }

  /**
   * Obtener métricas de ventas
   */
  getMetrics(from?: string, to?: string): SaleMetrics {
    const db = getDatabase();
    let query = `
      SELECT 
        COALESCE(SUM(CASE WHEN is_active = 1 THEN total ELSE 0 END), 0) as totalSales,
        COALESCE(COUNT(CASE WHEN is_active = 1 THEN 1 END), 0) as totalTickets,
        COALESCE(AVG(CASE WHEN is_active = 1 THEN total END), 0) as averageTicket,
        COALESCE(COUNT(CASE WHEN is_active = 0 THEN 1 END), 0) as cancelledSales
      FROM sales
      WHERE 1=1
    `;
    const params: string[] = [];

    if (from) {
      query += " AND DATE(created_at) >= DATE(?)";
      params.push(from);
    }

    if (to) {
      query += " AND DATE(created_at) <= DATE(?)";
      params.push(to);
    }

    const metrics = db.prepare(query).get(...params) as SaleMetrics;

    return metrics;
  }

  /**
   * Obtener productos más vendidos
   */
  getTopProducts(limit: number = 10, from?: string, to?: string): TopProduct[] {
    const db = getDatabase();
    let query = `
      SELECT 
        si.product_id,
        si.product_name,
        SUM(si.quantity) as quantity,
        SUM(si.total_price) as revenue
      FROM sale_items si
      INNER JOIN sales s ON si.sale_id = s.id
      WHERE s.is_active = 1
    `;
    const params: (string | number)[] = [];

    if (from) {
      query += " AND DATE(s.created_at) >= DATE(?)";
      params.push(from);
    }

    if (to) {
      query += " AND DATE(s.created_at) <= DATE(?)";
      params.push(to);
    }

    query += `
      GROUP BY si.product_id, si.product_name
      ORDER BY quantity DESC
      LIMIT ?
    `;
    params.push(limit);

    return db.prepare(query).all(...params) as TopProduct[];
  }
}

// Exportar instancia única
export const salesService = new SalesService();
