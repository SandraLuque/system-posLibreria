// electron/database/database.ts
import Database from "better-sqlite3";
import { app } from "electron";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

let db: Database | null = null;

/**
 * Obtiene la instancia de la base de datos
 */
export function getDatabase(): Database {
  if (db) return db;

  // Ubicación de la base de datos
  const userDataPath = app.getPath("userData");
  const dbPath = join(userDataPath, "pos.db");

  // Crear directorio si no existe
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true });
  }

  console.log("📂 Database path:", dbPath);

  // Inicializar base de datos
  db = new Database(dbPath, {
    verbose: process.env.NODE_ENV === "development" ? console.log : undefined,
  });

  // Configuraciones de rendimiento
  db.pragma("journal_mode = WAL"); // Write-Ahead Logging
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  db.pragma("cache_size = -64000"); // 64MB cache
  db.pragma("temp_store = MEMORY");

  console.log("✅ Database initialized");

  // Ejecutar migraciones
  runMigrations(db);

  return db;
}

/**
 * Cierra la conexión a la base de datos
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log("🔒 Database closed");
  }
}

/**
 * Ejecuta transacciones de forma segura
 */
export function withTransaction<T>(db: Database, callback: () => T): T {
  const transaction = db.transaction(callback);
  return transaction();
}

/**
 * Sistema de migraciones
 */
function runMigrations(db: Database): void {
  // Crear tabla de versiones de schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
      description TEXT
    )
  `);

  // Obtener versión actual
  const currentVersion = db
    .prepare("SELECT COALESCE(MAX(version), 0) as version FROM schema_version")
    .get() as { version: number };

  console.log(`📊 Current schema version: ${currentVersion.version}`);

  // Lista de migraciones
  const migrations = [
    {
      version: 1,
      description: "Initial schema",
      up: migration_001_initial_schema,
    },
    {
      version: 2,
      description: "Add triggers for timestamps",
      up: migration_002_add_triggers,
    },
  ];

  // Ejecutar migraciones pendientes
  for (const migration of migrations) {
    if (migration.version > currentVersion.version) {
      console.log(
        `⬆️  Applying migration ${migration.version}: ${migration.description}`
      );

      const transaction = db.transaction(() => {
        migration.up(db);
        db.prepare(
          "INSERT INTO schema_version (version, description) VALUES (?, ?)"
        ).run(migration.version, migration.description);
      });

      transaction();
      console.log(`✅ Migration ${migration.version} applied`);
    }
  }

  console.log("🎉 All migrations completed");
}

/**
 * Migración 001: Schema inicial
 */
function migration_001_initial_schema(db: Database): void {
  // ============================================
  // TABLA: users
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'cashier')) NOT NULL,
      full_name TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Índices para users
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
  `);

  // ============================================
  // TABLA: products
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      cost REAL DEFAULT 0,
      stock INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 5,
      category TEXT,
      barcode TEXT UNIQUE,
      description TEXT,
      image_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Índices para products
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
    CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
  `);

  // ============================================
  // TABLA: product_images
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_images (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      image_url TEXT NOT NULL,
      image_name TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  // Índices para product_images
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
    CREATE INDEX IF NOT EXISTS idx_product_images_primary ON product_images(is_primary);
  `);

  // ============================================
  // TABLA: sales
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      total REAL NOT NULL,
      subtotal REAL NOT NULL,
      tax REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      payment_method TEXT CHECK(payment_method IN ('cash', 'card', 'transfer')) NOT NULL,
      cashier_id TEXT NOT NULL,
      cashier_name TEXT NOT NULL,
      customer_name TEXT,
      notes TEXT,
      daily_number INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cashier_id) REFERENCES users(id)
    )
  `);

  // Índices para sales
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sales_cashier ON sales(cashier_id);
    CREATE INDEX IF NOT EXISTS idx_sales_payment ON sales(payment_method);
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at);
    CREATE INDEX IF NOT EXISTS idx_sales_active ON sales(is_active);
    CREATE INDEX IF NOT EXISTS idx_sales_daily ON sales(daily_number, created_at);
  `);

  // ============================================
  // TABLA: sale_items
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Índices para sale_items
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_composite ON sale_items(sale_id, product_id);
  `);

  // ============================================
  // TABLA: stock_movements
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      movement_type TEXT CHECK(movement_type IN ('sale', 'adjustment', 'restock')) NOT NULL,
      quantity INTEGER NOT NULL,
      previous_stock INTEGER NOT NULL,
      new_stock INTEGER NOT NULL,
      reference_id TEXT,
      notes TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Índices para stock_movements
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_composite ON stock_movements(product_id, movement_type);
  `);

  // ============================================
  // TABLA: settings
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL,
      setting_type TEXT DEFAULT 'string',
      description TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ============================================
  // DATOS INICIALES
  // ============================================

  // Usuario admin por defecto (password: admin123)
  // Hash generado con bcrypt rounds=10
  db.prepare(
    `
    INSERT OR IGNORE INTO users (id, username, password_hash, role, full_name)
    VALUES (?, ?, ?, ?, ?)
  `
  ).run(
    "admin-001",
    "admin",
    "$2b$10$YourHashedPasswordHere", // Cambiar por hash real
    "admin",
    "Administrador"
  );

  // Settings por defecto
  const defaultSettings = [
    ["business_name", "POS Tiabaya", "string", "Nombre del negocio"],
    ["currency", "S/", "string", "Símbolo de moneda"],
    ["tax_rate", "0", "number", "Tasa de impuesto (%)"],
    [
      "receipt_footer",
      "Gracias por su compra",
      "string",
      "Pie de página del ticket",
    ],
    ["low_stock_alert", "5", "number", "Alerta de stock bajo"],
  ];

  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (setting_key, setting_value, setting_type, description)
    VALUES (?, ?, ?, ?)
  `);

  for (const [key, value, type, description] of defaultSettings) {
    insertSetting.run(key, value, type, description);
  }

  console.log("✅ Initial data inserted");
}

/**
 * Migración 002: Triggers para timestamps
 */
function migration_002_add_triggers(db: Database): void {
  // Trigger para actualizar updated_at en products
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_products_timestamp 
    AFTER UPDATE ON products
    FOR EACH ROW
    BEGIN
      UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);

  // Trigger para actualizar updated_at en settings
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_settings_timestamp 
    AFTER UPDATE ON settings
    FOR EACH ROW
    BEGIN
      UPDATE settings SET updated_at = CURRENT_TIMESTAMP WHERE setting_key = NEW.setting_key;
    END;
  `);

  console.log("✅ Triggers created");
}

/**
 * Genera un ID único
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
