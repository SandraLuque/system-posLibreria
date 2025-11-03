// preload.js (CommonJS)
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Login bridge
  loginSuccess: () => ipcRenderer.send("login-success"),

  // message 1 bridge
  sendMessage: (msg) => ipcRenderer.send("message", msg),

  onMessageReply: (callback) => {
    ipcRenderer.on("message-reply", (_event, data) => callback(data));
  },

  // message 2 bridge
  sendMessagePrivate: (msg) => ipcRenderer.send("message_private", msg),

  onMessageReplyPrivate: (callback) => {
    ipcRenderer.on("message_private-reply", (_event, data) => callback(data));
  },
});
