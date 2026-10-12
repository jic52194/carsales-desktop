// Exposes a small, safe native bridge to the React app as window.carsalesNative
// (mirrors window.timehubNative in the TimeHub desktop app).
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("carsalesNative", {
  isDesktop: true,
  /** { isDesktop, version, platform, mode: "local" | "cloud" } */
  getInfo: () => ipcRenderer.invoke("native:info"),
  /** whole-computer idle seconds via Electron powerMonitor */
  getIdleSeconds: () => ipcRenderer.invoke("native:idleSeconds"),
  /** point the shell at the cloud app (vibe-published URL); pass null to go back to the bundled build */
  setRemoteUrl: (url) => ipcRenderer.invoke("native:setRemoteUrl", url),
  relaunch: () => ipcRenderer.send("native:relaunch"),
});
