// electron/models/ProductModel.ts
import { getDatabase, generateId } from "../database/database";

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

export interface CreateProductData {
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

export interface UpdateProductData {
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

/**
 * Obtener todos los productos activos
 */
export const findAllProducts = (): Product[] => {
  const db = getDatabase();
  const query = "SELECT * FROM products WHERE is_active = 1 ORDER BY name ASC";
  return db.prepare(query).all() as Product[];
};

/**
 * Buscar producto por ID
 */
export const findProductById = (id: string): Product | null => {
  const db = getDatabase();
  const query = "SELECT * FROM products WHERE id = ?";
  const result = db.prepare(query).get(id) as Product | undefined;
  return result || null;
};

/**
 * Buscar producto por código de barras
 */
export const findProductByBarcode = (barcode: string): Product | null => {
  const db = getDatabase();
  const query = "SELECT * FROM products WHERE barcode = ? AND is_active = 1";
  const result = db.prepare(query).get(barcode) as Product | undefined;
  return result || null;
};

/**
 * Buscar productos por nombre (búsqueda parcial)
 */
export const searchProductsByName = (searchTerm: string): Product[] => {
  const db = getDatabase();
  const query = `
    SELECT * FROM products 
    WHERE is_active = 1 AND name LIKE ?
    ORDER BY name ASC
  `;
  return db.prepare(query).all(`%${searchTerm}%`) as Product[];
};

/**
 * Crear nuevo producto
 */
export const createProduct = (data: CreateProductData): Product => {
  const db = getDatabase();
  const id = generateId();

  db.prepare(
    `
    INSERT INTO products (
      id, name, price, cost, stock, min_stock, category,
      barcode, description, image_url, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `
  ).run(
    id,
    data.name,
    data.price,
    data.cost || 0,
    data.stock || 0,
    data.min_stock || 5,
    data.category || null,
    data.barcode || null,
    data.description || null,
    data.image_url || null
  );

  const product = findProductById(id);
  if (!product) {
    throw new Error("Error al crear el producto");
  }

  return product;
};

/**
 * Actualizar producto
 */
export const updateProduct = (id: string, data: UpdateProductData): boolean => {
  const db = getDatabase();

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.name !== undefined) {
    fields.push("name = ?");
    values.push(data.name);
  }
  if (data.price !== undefined) {
    fields.push("price = ?");
    values.push(data.price);
  }
  if (data.cost !== undefined) {
    fields.push("cost = ?");
    values.push(data.cost);
  }
  if (data.stock !== undefined) {
    fields.push("stock = ?");
    values.push(data.stock);
  }
  if (data.min_stock !== undefined) {
    fields.push("min_stock = ?");
    values.push(data.min_stock);
  }
  if (data.category !== undefined) {
    fields.push("category = ?");
    values.push(data.category || null);
  }
  if (data.barcode !== undefined) {
    fields.push("barcode = ?");
    values.push(data.barcode || null);
  }
  if (data.description !== undefined) {
    fields.push("description = ?");
    values.push(data.description || null);
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
    return false;
  }

  values.push(id);
  const query = `UPDATE products SET ${fields.join(", ")} WHERE id = ?`;
  const result = db.prepare(query).run(...values);

  return result.changes > 0;
};

/**
 * Eliminar producto (soft delete)
 */
export const deleteProduct = (id: string): boolean => {
  const db = getDatabase();
  const result = db
    .prepare("UPDATE products SET is_active = 0 WHERE id = ?")
    .run(id);
  return result.changes > 0;
};

/**
 * Actualizar stock de producto
 */
export const updateProductStock = (id: string, newStock: number): boolean => {
  const db = getDatabase();
  const result = db
    .prepare("UPDATE products SET stock = ? WHERE id = ?")
    .run(newStock, id);
  return result.changes > 0;
};

/**
 * Obtener categorías únicas
 */
export const findAllCategories = (): string[] => {
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
};

/**
 * Obtener productos con stock bajo
 */
export const findLowStockProducts = (): Product[] => {
  const db = getDatabase();
  const query = `
    SELECT * FROM products
    WHERE is_active = 1 AND stock <= min_stock AND stock > 0
    ORDER BY stock ASC
  `;
  return db.prepare(query).all() as Product[];
};

/**
 * Obtener productos sin stock
 */
export const findOutOfStockProducts = (): Product[] => {
  const db = getDatabase();
  const query = `
    SELECT * FROM products
    WHERE is_active = 1 AND stock = 0
    ORDER BY name ASC
  `;
  return db.prepare(query).all() as Product[];
};
