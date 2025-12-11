// electron/ipc/handlers.ts
import { ipcMain } from "electron";
import { authService } from "../services/AuthService";
import { productService } from "../services/ProductService";
import { salesService } from "../services/SalesService";
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductFilters,
} from "../services/ProductService";
import type { CreateSaleInput, SaleFilters } from "../services/SalesService";

/**
 * Registrar todos los handlers de IPC
 */
export function registerIPCHandlers(): void {
  // ============================================
  // AUTH HANDLERS
  // ============================================

  ipcMain.handle(
    "auth:login",
    async (_event, username: string, password: string) => {
      try {
        const result = await authService.loginUser(username, password);
        return { success: true, data: result };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Error en login",
        };
      }
    }
  );

  ipcMain.handle("auth:verify", async (_event, token: string) => {
    try {
      const user = authService.verifyToken(token);
      return { success: true, data: user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Token inválido",
      };
    }
  });

  // ============================================
  // PRODUCT HANDLERS
  // ============================================

  ipcMain.handle(
    "products:getAll",
    async (_event, filters?: ProductFilters) => {
      try {
        const products = productService.getAll(filters);
        return { success: true, data: products };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Error al obtener productos",
        };
      }
    }
  );

  ipcMain.handle("products:getOne", async (_event, id: string) => {
    try {
      const product = productService.getOne(id);
      return { success: true, data: product };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al obtener producto",
      };
    }
  });

  ipcMain.handle("products:getByBarcode", async (_event, barcode: string) => {
    try {
      const product = productService.getByBarcode(barcode);
      return { success: true, data: product };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al buscar producto",
      };
    }
  });

  ipcMain.handle(
    "products:create",
    async (_event, data: CreateProductInput) => {
      try {
        const product = productService.create(data);
        return { success: true, data: product };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Error al crear producto",
        };
      }
    }
  );

  ipcMain.handle(
    "products:update",
    async (_event, id: string, data: UpdateProductInput) => {
      try {
        const updated = productService.update(id, data);
        return { success: true, data: updated };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Error al actualizar producto",
        };
      }
    }
  );

  ipcMain.handle("products:delete", async (_event, id: string) => {
    try {
      const deleted = productService.delete(id);
      return { success: true, data: deleted };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al eliminar producto",
      };
    }
  });

  ipcMain.handle(
    "products:adjustStock",
    async (
      _event,
      productId: string,
      quantity: number,
      reason: string,
      userId: string
    ) => {
      try {
        productService.adjustStock(productId, quantity, reason, userId);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Error al ajustar stock",
        };
      }
    }
  );

  ipcMain.handle("products:getCategories", async () => {
    try {
      const categories = productService.getCategories();
      return { success: true, data: categories };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al obtener categorías",
      };
    }
  });

  ipcMain.handle("products:getLowStock", async () => {
    try {
      const products = productService.getLowStockProducts();
      return { success: true, data: products };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al obtener productos con stock bajo",
      };
    }
  });

  ipcMain.handle("products:getOutOfStock", async () => {
    try {
      const products = productService.getOutOfStockProducts();
      return { success: true, data: products };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al obtener productos sin stock",
      };
    }
  });

  ipcMain.handle("products:getStats", async () => {
    try {
      const stats = productService.getStats();
      return { success: true, data: stats };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al obtener estadísticas",
      };
    }
  });

  // ============================================
  // SALES HANDLERS
  // ============================================

  ipcMain.handle("sales:create", async (_event, data: CreateSaleInput) => {
    try {
      const result = salesService.create(data);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error al crear venta",
      };
    }
  });

  ipcMain.handle("sales:getAll", async (_event, filters?: SaleFilters) => {
    try {
      const sales = salesService.getAll(filters);
      return { success: true, data: sales };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al obtener ventas",
      };
    }
  });

  ipcMain.handle("sales:getById", async (_event, id: string) => {
    try {
      const sale = salesService.getById(id);
      return { success: true, data: sale };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al obtener venta",
      };
    }
  });

  ipcMain.handle("sales:getToday", async () => {
    try {
      const sales = salesService.getToday();
      return { success: true, data: sales };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al obtener ventas del día",
      };
    }
  });

  ipcMain.handle("sales:cancel", async (_event, id: string, userId: string) => {
    try {
      salesService.cancel(id, userId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al cancelar venta",
      };
    }
  });

  ipcMain.handle(
    "sales:getMetrics",
    async (_event, from?: string, to?: string) => {
      try {
        const metrics = salesService.getMetrics(from, to);
        return { success: true, data: metrics };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Error al obtener métricas",
        };
      }
    }
  );

  ipcMain.handle(
    "sales:getTopProducts",
    async (_event, limit?: number, from?: string, to?: string) => {
      try {
        const products = salesService.getTopProducts(limit, from, to);
        return { success: true, data: products };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Error al obtener productos más vendidos",
        };
      }
    }
  );

  console.log("✅ IPC handlers registered");
}
