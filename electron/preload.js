// electron/preload.js
const { contextBridge, ipcRenderer } = require("electron");

/**
 * API expuesta al renderer de forma segura
 */
const electronAPI = {
  // ============================================
  // AUTH API
  // ============================================
  auth: {
    login: (username, password) =>
      ipcRenderer.invoke("auth:login", { username, password }),

    register: (data) => ipcRenderer.invoke("auth:register", data),

    verifyToken: (token) => ipcRenderer.invoke("auth:verifyToken", token),

    getUserById: (id) => ipcRenderer.invoke("auth:getUserById", id),

    getAllUsers: () => ipcRenderer.invoke("auth:getAllUsers"),

    changePassword: (userId, oldPassword, newPassword) =>
      ipcRenderer.invoke("auth:changePassword", {
        userId,
        oldPassword,
        newPassword,
      }),
  },

  // ============================================
  // PRODUCTS API
  // ============================================
  products: {
    getAll: (filters) => ipcRenderer.invoke("products:getAll", filters),

    getOne: (id) => ipcRenderer.invoke("products:getOne", id),

    getByBarcode: (barcode) =>
      ipcRenderer.invoke("products:getByBarcode", barcode),

    create: (data) => ipcRenderer.invoke("products:create", data),

    update: (id, data) => ipcRenderer.invoke("products:update", { id, data }),

    delete: (id) => ipcRenderer.invoke("products:delete", id),

    adjustStock: (productId, quantity, reason, userId) =>
      ipcRenderer.invoke("products:adjustStock", {
        productId,
        quantity,
        reason,
        userId,
      }),

    getCategories: () => ipcRenderer.invoke("products:getCategories"),

    getLowStock: () => ipcRenderer.invoke("products:getLowStock"),

    getOutOfStock: () => ipcRenderer.invoke("products:getOutOfStock"),

    getStats: () => ipcRenderer.invoke("products:getStats"),
  },

  // ============================================
  // SALES API
  // ============================================
  sales: {
    create: (data) => ipcRenderer.invoke("sales:create", data),

    getAll: (filters) => ipcRenderer.invoke("sales:getAll", filters),

    getById: (id) => ipcRenderer.invoke("sales:getById", id),

    getToday: () => ipcRenderer.invoke("sales:getToday"),

    cancel: (id, userId) => ipcRenderer.invoke("sales:cancel", { id, userId }),

    getMetrics: (from, to) =>
      ipcRenderer.invoke("sales:getMetrics", { from, to }),

    getTopProducts: (limit, from, to) =>
      ipcRenderer.invoke("sales:getTopProducts", { limit, from, to }),
  },
};

// Exponer API al renderer
contextBridge.exposeInMainWorld("electronAPI", electronAPI);

console.log("✅ Preload: electronAPI exposed to renderer");
