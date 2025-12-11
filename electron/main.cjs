// electron/main.cjs
const { app, BrowserWindow } = require("electron");
const path = require("path");
const isDev = process.env.NODE_ENV === "development";

// Importar módulos de base de datos y handlers
const { getDatabase, closeDatabase } = require("./database/database");
const { registerIpcHandlers } = require("./ipc/ipcHandlers");

let mainWindow = null;

/**
 * Crear ventana principal
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    show: false, // No mostrar hasta que esté listo
    autoHideMenuBar: true,
    backgroundColor: "#1a1a2e",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Necesario para better-sqlite3
    },
  });

  // Mostrar cuando esté listo para evitar flash blanco
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();

    // Abrir DevTools en desarrollo
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Cargar la aplicación
  if (isDev) {
    // En desarrollo, cargar desde Vite dev server
    mainWindow.loadURL("http://localhost:5173").catch((err) => {
      console.error("Error loading dev server:", err);
      console.log("Make sure Vite dev server is running (npm run dev)");
    });
  } else {
    // En producción, cargar desde archivos compilados
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Manejar cierre de ventana
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/**
 * Inicialización de la aplicación
 */
app.whenReady().then(() => {
  console.log("🚀 App starting...");
  console.log("📍 Mode:", isDev ? "development" : "production");
  console.log("📂 User Data:", app.getPath("userData"));

  // 1. Inicializar base de datos
  try {
    getDatabase();
    console.log("✅ Database initialized");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    app.quit();
    return;
  }

  // 2. Registrar handlers IPC
  try {
    registerIpcHandlers();
    console.log("✅ IPC handlers registered");
  } catch (error) {
    console.error("❌ IPC handlers registration failed:", error);
    app.quit();
    return;
  }

  // 3. Crear ventana
  createWindow();

  // Recrear ventana en macOS cuando se hace clic en el dock
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  console.log("✅ App ready");
});

/**
 * Cerrar aplicación cuando todas las ventanas se cierran
 */
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

/**
 * Limpiar antes de salir
 */
app.on("before-quit", () => {
  console.log("🔒 Closing database...");
  closeDatabase();
  console.log("👋 Goodbye!");
});

/**
 * Manejo de errores no capturados
 */
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});
