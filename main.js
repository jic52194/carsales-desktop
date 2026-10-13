// CarSales AI OS — Windows desktop shell (Electron)
//
// MODE 1 (default, "local"):  serves the bundled React build from web/dist over app://
// MODE 2 ("cloud"):           loads the live vibe-builder URL (CARSALES_REMOTE_URL), same
//                             pattern as timehub.exe loading timehub.company.
// Switch modes without reinstalling: edit %APPDATA%\CarSales AI OS\config.json
//   { "remoteUrl": "https://app.carsalessoftware.com" }
// or set the CARSALES_REMOTE_URL env var. Delete the key / unset to go back to local.

const { app, BrowserWindow, Tray, Menu, shell, protocol, net, nativeImage, ipcMain, powerMonitor, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");

const APP_NAME = "CarSales AI OS";
const APP_SCHEME = "app";
const APP_HOST = "carsales";
const BUNDLED_DIST = path.join(__dirname, "web", "dist");
const BUNDLED_VERSION = require("./package.json").version;
// Auto-update: the shell downloads the latest published web build (manifest + files) into userData
// and serves it instead of the bundled copy. Install once; every publish shows up on next launch.
const DEFAULT_UPDATE_URL = "https://github.com/jic52194/carsales-desktop/releases/latest/download/manifest.json";
// The live web app. Set "remoteUrl": "" in config.json to force the downloaded bundle instead.
const DEFAULT_LIVE_URL = "https://app.carsalessoftware.com/";
let DIST_DIR = BUNDLED_DIST;
let activeVersion = BUNDLED_VERSION;

app.setName(APP_NAME);
app.setAppUserModelId("com.carsalessoftware.desktop");
// Own profile folder (…/CarSalesSoftware/CarSales AI OS) so a stale pre-release portable build that is still
// running can never hold our single-instance lock or share our data.
try { app.setPath("userData", path.join(app.getPath("appData"), "CarSalesSoftware", APP_NAME)); } catch {}

// One-time cleanup: retire the pre-release portable build if it is still running (Windows only; path-specific).
function retireLegacyPortable() {
  if (process.platform !== "win32") return;
  try {
    const { execFile } = require("child_process");
    const ps = "Get-Process | Where-Object { $_.Path -and $_.Path -like '*CarSalesAIOS-win64-portable*' } | Stop-Process -Force";
    execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", ps], { windowsHide: true, timeout: 8000 }, () => {});
  } catch {}
}
retireLegacyPortable();

// ---------- config ----------
function readConfig() {
  const cfg = {};
  try {
    const p = path.join(app.getPath("userData"), "config.json");
    if (fs.existsSync(p)) Object.assign(cfg, JSON.parse(fs.readFileSync(p, "utf8")));
  } catch (e) {
    console.warn("config.json unreadable:", e.message);
  }
  if (process.env.CARSALES_REMOTE_URL) cfg.remoteUrl = process.env.CARSALES_REMOTE_URL;
  return cfg;
}

// ---------- live bundle (auto-update) ----------
function bundlesRoot() { return path.join(app.getPath("userData"), "bundles"); }
function currentBundleFile() { return path.join(app.getPath("userData"), "bundle.json"); }
function cmpVer(a, b) { const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number); for (let i = 0; i < 4; i++) { if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0); } return 0; }
function loadActiveBundle() {
  try {
    const cur = JSON.parse(fs.readFileSync(currentBundleFile(), "utf8"));
    const dir = path.join(bundlesRoot(), cur.version);
    if (cmpVer(cur.version, BUNDLED_VERSION) > 0 && fs.existsSync(path.join(dir, "index.html"))) { DIST_DIR = dir; activeVersion = cur.version; }
  } catch {}
  console.log(`[update] serving web build ${activeVersion} from ${DIST_DIR === BUNDLED_DIST ? "bundled" : "downloaded"}`);
}
async function sha256File(p) { const { createHash } = require("crypto"); return createHash("sha256").update(fs.readFileSync(p)).digest("hex"); }
async function checkForUpdates({ interactive = false } = {}) {
  const cfg = readConfig();
  const manifestUrl = cfg.updateUrl === null ? null : (cfg.updateUrl || DEFAULT_UPDATE_URL);
  if (!manifestUrl) return null;
  try {
    const res = await net.fetch(manifestUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`manifest HTTP ${res.status}`);
    const m = await res.json(); // { version, baseUrl, files: [{ path, sha256 }] }
    if (!m.version || !Array.isArray(m.files)) throw new Error("bad manifest");
    if (cmpVer(m.version, activeVersion) <= 0) { if (interactive) dialog.showMessageBox({ type: "info", title: APP_NAME, message: `You're on the latest version (${activeVersion}).` }); return null; }
    const base = (m.baseUrl || manifestUrl.replace(/manifest\.json$/, "")).replace(/\/?$/, "/");
    const dir = path.join(bundlesRoot(), m.version);
    fs.rmSync(dir, { recursive: true, force: true });
    for (const f of m.files) {
      const r = await net.fetch(base + (f.url || f.path), { cache: "no-store" });
      if (!r.ok) throw new Error(`${f.path}: HTTP ${r.status}`);
      const out = path.join(dir, f.path);
      if (!path.normalize(out).startsWith(dir)) throw new Error("bad path in manifest");
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
      if (f.sha256 && (await sha256File(out)) !== f.sha256) throw new Error(`${f.path}: checksum mismatch`);
    }
    if (!fs.existsSync(path.join(dir, "index.html"))) throw new Error("no index.html in update");
    fs.writeFileSync(currentBundleFile(), JSON.stringify({ version: m.version, installedAt: new Date().toISOString() }));
    // prune old bundles
    for (const d of fs.readdirSync(bundlesRoot())) if (d !== m.version) fs.rmSync(path.join(bundlesRoot(), d), { recursive: true, force: true });
    console.log(`[update] installed ${m.version}`);
    const { response } = await dialog.showMessageBox(mainWindow, { type: "info", title: APP_NAME, message: `Update ${m.version} is ready`, detail: "Restart to use the new version now, or it will load next time you open the app.", buttons: ["Restart now", "Later"], defaultId: 0 });
    if (response === 0) { quitting = true; app.relaunch(); app.exit(0); }
    return m.version;
  } catch (e) {
    console.warn("[update] skipped:", e.message);
    if (interactive) dialog.showMessageBox({ type: "warning", title: APP_NAME, message: "Could not check for updates", detail: e.message });
    return null;
  }
}

// ---------- app:// protocol (SPA with BrowserRouter fallback) ----------
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
  },
]);

function registerAppProtocol() {
  protocol.handle(APP_SCHEME, (request) => {
    const url = new URL(request.url);
    let rel = decodeURIComponent(url.pathname);
    if (rel === "/" || rel === "") rel = "/index.html";
    let abs = path.normalize(path.join(DIST_DIR, rel));
    // never escape dist
    if (!abs.startsWith(DIST_DIR)) abs = path.join(DIST_DIR, "index.html");
    // SPA fallback: any path that isn't a real file → index.html (react-router handles it)
    if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) abs = path.join(DIST_DIR, "index.html");
    return net.fetch(pathToFileURL(abs).toString());
  });
}

// ---------- window / tray ----------
let mainWindow = null;
let tray = null;
let quitting = false;

function createWindow() {
  const cfg = readConfig();
  if (cfg.remoteUrl === undefined) cfg.remoteUrl = DEFAULT_LIVE_URL;
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: APP_NAME,
    icon: path.join(__dirname, "build", "icon.png"),
    backgroundColor: "#0f172a",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: true,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  setTimeout(() => { if (mainWindow && !mainWindow.isVisible() && !quitting) mainWindow.show(); }, 6000);

  // Open external links in the system browser, keep the app inside the window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(`${APP_SCHEME}://`) || (cfg.remoteUrl && url.startsWith(cfg.remoteUrl))) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (e, url) => {
    const internal = url.startsWith(`${APP_SCHEME}://`) || (cfg.remoteUrl && url.startsWith(new URL(cfg.remoteUrl).origin));
    if (!internal) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  // Minimise-to-tray on close (same behaviour as timehub.exe)
  mainWindow.on("close", (e) => {
    if (!quitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  // TimeHub model: load the LIVE site so every web publish is instant. If the site can't be reached
  // (offline, DNS not ready yet), fall back silently to the last downloaded bundle.
  const live = cfg.remoteUrl;
  if (live) {
    probe(live).then((ok) => {
      if (ok) {
        mainWindow.loadURL(live);
        mainWindow.webContents.on("did-fail-load", (_e, code, _desc, url, isMain) => {
          if (code === -3 || !isMain) return;
          mainWindow.loadURL(`${APP_SCHEME}://${APP_HOST}/`);
        });
        startLiveWatch(live);
      } else {
        mainWindow.loadURL(`${APP_SCHEME}://${APP_HOST}/`);
      }
    });
  } else {
    mainWindow.loadURL(`${APP_SCHEME}://${APP_HOST}/`);
  }
}

/** Can we reach the live site right now? (3 s budget) */
async function probe(url) {
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 3000);
    const r = await net.fetch(url + (url.includes("?") ? "&" : "?") + "_probe=" + Date.now(), { method: "GET", signal: ctl.signal, cache: "no-store" });
    clearTimeout(t);
    return r.ok;
  } catch { return false; }
}

/** Re-check the live index.html every 60 s and on focus; when the bundle hash changes, reload once the user is idle. */
let liveHash = null, liveTimer = null;
function startLiveWatch(url) {
  const check = async () => {
    try {
      const r = await net.fetch(url + "?_v=" + Date.now(), { cache: "no-store" });
      const html = await r.text();
      const m = html.match(/assets\/index-([A-Za-z0-9_-]+)\.js/);
      const h = m ? m[1] : null;
      if (!h) return;
      if (liveHash === null) { liveHash = h; return; }
      if (h !== liveHash) {
        liveHash = h;
        const tryReload = () => {
          const idle = powerMonitor.getSystemIdleTime();
          if (!mainWindow) return;
          if (idle >= 60 || !mainWindow.isVisible() || !mainWindow.isFocused()) mainWindow.webContents.reload();
          else setTimeout(tryReload, 30000);
        };
        tryReload();
      }
    } catch {}
  };
  if (liveTimer) clearInterval(liveTimer);
  liveTimer = setInterval(check, 60000);
  check();
  if (mainWindow) mainWindow.on("focus", check);
}

function showWindow() {
  if (!mainWindow) return createWindow();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, "build", "icon.png")).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip(APP_NAME);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: `Open ${APP_NAME}`, click: showWindow },
      { label: "Reload", click: () => mainWindow && mainWindow.webContents.reload() },
      { label: "Check for updates…", click: () => checkForUpdates({ interactive: true }) },
      { label: `Version ${activeVersion}`, enabled: false },
      { type: "separator" },
      {
        label: "Start with Windows",
        type: "checkbox",
        checked: app.getLoginItemSettings().openAtLogin,
        click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
      },
      { type: "separator" },
      { label: "Quit", click: () => { quitting = true; app.quit(); } },
    ])
  );
  tray.on("click", showWindow);
  tray.on("double-click", showWindow);
}

// ---------- IPC exposed via preload (window.carsalesNative) ----------
ipcMain.handle("native:info", () => ({
  isDesktop: true,
  version: app.getVersion(),
  webVersion: activeVersion,
  platform: process.platform,
  mode: (readConfig().remoteUrl === undefined ? DEFAULT_LIVE_URL : readConfig().remoteUrl) ? "cloud" : "local",
}));
ipcMain.handle("native:idleSeconds", () => powerMonitor.getSystemIdleTime());
ipcMain.handle("native:setRemoteUrl", (_e, url) => {
  const p = path.join(app.getPath("userData"), "config.json");
  const cfg = readConfig();
  if (url) cfg.remoteUrl = url; else delete cfg.remoteUrl;
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(cfg, null, 2));
  return cfg;
});
ipcMain.on("native:relaunch", () => { app.relaunch(); quitting = true; app.exit(0); });

// ---------- lifecycle ----------
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", showWindow);

  app.whenReady().then(() => {
    loadActiveBundle();
    registerAppProtocol();
    createWindow();
    createTray();
    setTimeout(() => checkForUpdates(), 4000);
    setInterval(() => checkForUpdates(), 6 * 60 * 60 * 1000);
  });

  app.on("activate", showWindow);
  app.on("before-quit", () => { quitting = true; });
  app.on("window-all-closed", () => { /* stay in tray */ });
}
