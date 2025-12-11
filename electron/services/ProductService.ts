// electron/services/ProductService.ts
import { getDatabase, withTransaction, generateId } from "../database/database";

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
  is_active: number;
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

export interface ProductStats {
  total: number;
  active: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
}

export class ProductService {
  /**
   * Obtener todos los productos
   */
  getAll(filters?: ProductFilters): Product[] {
    const db = getDatabase();
    let query = "SELECT * FROM products WHERE is_active = 1";
    const params: (string | number)[] = [];

    if (filters?.category) {
      query += " AND category = ?";
      params.push(filters.category);
    }

    if (filters?.search) {
      query += " AND (name LIKE ? OR barcode LIKE ? OR category LIKE ?)";
      const searchParam = `%${filters.search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (filters?.inStock) {
      query += " AND stock > 0";
    }

    if (filters?.lowStock) {
      query += " AND stock <= min_stock AND stock > 0";
    }

    query += " ORDER BY name ASC";

    return db.prepare(query).all(...params) as Product[];
  }

  /**
   * Obtener producto por ID
   */
  getOne(id: string): Product | undefined {
    const db = getDatabase();

    const product = db
      .prepare("SELECT * FROM products WHERE id = ?")
      .get(id) as Product | undefined;

    return product;
  }

  /**
   * Obtener producto por código de barras
   */
  getByBarcode(barcode: string): Product | undefined {
    const db = getDatabase();

    const product = db
      .prepare("SELECT * FROM products WHERE barcode = ? AND is_active = 1")
      .get(barcode) as Product | undefined;

    return product;
  }

  /**
   * Crear nuevo producto
   */
  create(data: CreateProductInput): Product {
    const db = getDatabase();
    const id = generateId();

    // Validar datos
    if (!data.name || data.name.trim().length === 0) {
      throw new Error("El nombre del producto es requerido");
    }

    if (data.price === undefined || data.price < 0) {
      throw new Error("El precio debe ser un valor positivo");
    }

    // Verificar código de barras único
    if (data.barcode) {
      const existing = this.getByBarcode(data.barcode);
      if (existing) {
        throw new Error("Ya existe un producto con ese código de barras");
      }
    }

    // Insertar producto
    db.prepare(
      `
      INSERT INTO products (
        id, name, price, cost, stock, min_stock, category,
        barcode, description, image_url, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `
    ).run(
      id,
      data.name.trim(),
      data.price,
      data.cost || 0,
      data.stock || 0,
      data.min_stock || 5,
      data.category?.trim() || null,
      data.barcode?.trim() || null,
      data.description?.trim() || null,
      data.image_url || null
    );

    const product = this.getOne(id);
    if (!product) {
      throw new Error("Error al crear el producto");
    }

    return product;
  }

  /**
   * Actualizar producto
   */
  update(id: string, data: UpdateProductInput): boolean {
    const db = getDatabase();

    // Verificar que existe
    const existing = this.getOne(id);
    if (!existing) {
      throw new Error("Producto no encontrado");
    }

    // Construir query dinámicamente
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw new Error("El nombre no puede estar vacío");
      }
      fields.push("name = ?");
      values.push(data.name.trim());
    }

    if (data.price !== undefined) {
      if (data.price < 0) {
        throw new Error("El precio no puede ser negativo");
      }
      fields.push("price = ?");
      values.push(data.price);
    }

    if (data.cost !== undefined) {
      fields.push("cost = ?");
      values.push(data.cost);
    }

    if (data.stock !== undefined) {
      if (data.stock < 0) {
        throw new Error("El stock no puede ser negativo");
      }
      fields.push("stock = ?");
      values.push(data.stock);
    }

    if (data.min_stock !== undefined) {
      fields.push("min_stock = ?");
      values.push(data.min_stock);
    }

    if (data.category !== undefined) {
      fields.push("category = ?");
      values.push(data.category?.trim() || null);
    }

    if (data.barcode !== undefined) {
      // Verificar código de barras único
      if (data.barcode) {
        const duplicate = db
          .prepare("SELECT id FROM products WHERE barcode = ? AND id != ?")
          .get(data.barcode, id);

        if (duplicate) {
          throw new Error("Ya existe otro producto con ese código de barras");
        }
      }
      fields.push("barcode = ?");
      values.push(data.barcode?.trim() || null);
    }

    if (data.description !== undefined) {
      fields.push("description = ?");
      values.push(data.description?.trim() || null);
    }

    if (data.image_url !== undefined) {
      fields.push("image_url = ?");
      values.push(data.image_url || null);
    }

    if (data.is_active !== undefined) {
      fields.push("is_active = ?");
      values.push(data.is_active ? 1 : 0);
    }

    if (fields.length === 0) {
      return false; // Nada que actualizar
    }

    // Agregar ID al final
    values.push(id);

    const query = `UPDATE products SET ${fields.join(", ")} WHERE id = ?`;
    const result = db.prepare(query).run(...values);

    return result.changes > 0;
  }

  /**
   * Eliminar producto (soft delete)
   */
  delete(id: string): boolean {
    const db = getDatabase();

    const result = db
      .prepare("UPDATE products SET is_active = 0 WHERE id = ?")
      .run(id);

    return result.changes > 0;
  }

  /**
   * Ajustar stock de producto
   */
  adjustStock(
    productId: string,
    quantity: number,
    reason: string,
    userId: string
  ): void {
    const db = getDatabase();

    withTransaction(db, () => {
      // Obtener producto actual
      const product = this.getOne(productId);
      if (!product) {
        throw new Error("Producto no encontrado");
      }

      const previousStock = product.stock;
      const newStock = previousStock + quantity;

      if (newStock < 0) {
        throw new Error("El stock no puede ser negativo");
      }

      // Actualizar stock
      db.prepare("UPDATE products SET stock = ? WHERE id = ?").run(
        newStock,
        productId
      );

      // Registrar movimiento
      db.prepare(
        `
        INSERT INTO stock_movements (
          id, product_id, movement_type, quantity, previous_stock, 
          new_stock, notes, created_by
        ) VALUES (?, ?, 'adjustment', ?, ?, ?, ?, ?)
      `
      ).run(
        generateId(),
        productId,
        quantity,
        previousStock,
        newStock,
        reason,
        userId
      );
    });
  }

  /**
   * Obtener categorías únicas
   */
  getCategories(): string[] {
    const db = getDatabase();

    const categories = db
      .prepare(
        `
      SELECT DISTINCT category 
      FROM products 
      WHERE category IS NOT NULL AND is_active = 1
      ORDER BY category ASC
    `
      )
      .all() as Array<{ category: string }>;

    return categories.map((c) => c.category);
  }

  /**
   * Obtener productos con stock bajo
   */
  getLowStockProducts(): Product[] {
    const db = getDatabase();

    const products = db
      .prepare(
        `
      SELECT * FROM products
      WHERE is_active = 1 AND stock <= min_stock AND stock > 0
      ORDER BY stock ASC
    `
      )
      .all() as Product[];

    return products;
  }

  /**
   * Obtener productos sin stock
   */
  getOutOfStockProducts(): Product[] {
    const db = getDatabase();

    const products = db
      .prepare(
        `
      SELECT * FROM products
      WHERE is_active = 1 AND stock = 0
      ORDER BY name ASC
    `
      )
      .all() as Product[];

    return products;
  }

  /**
   * Obtener estadísticas de productos
   */
  getStats(): ProductStats {
    const db = getDatabase();

    const stats = db
      .prepare(
        `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN stock <= min_stock AND stock > 0 AND is_active = 1 THEN 1 ELSE 0 END) as lowStock,
        SUM(CASE WHEN stock = 0 AND is_active = 1 THEN 1 ELSE 0 END) as outOfStock,
        SUM(CASE WHEN is_active = 1 THEN stock * price ELSE 0 END) as totalValue
      FROM products
    `
      )
      .get() as ProductStats;

    return stats;
  }
}

// Exportar instancia única
export const productService = new ProductService();
