const { _electron: electron } = require("playwright"); const path = require("path"); const fs=require("fs"); const os=require("os");
fs.rmSync(path.join(os.homedir(), ".config", "CarSales AI OS"), { recursive: true, force: true });
(async () => { const app = await electron.launch({ args: [path.join(__dirname, ".."), "--no-sandbox"] }); const page = await app.firstWindow(); await page.waitForTimeout(2500);
  await page.setViewportSize({ width: 1200, height: 800 }); await page.screenshot({ path: path.join(__dirname, "..", "release", "smoke", "login-v13.png") }); await app.close(); })();
