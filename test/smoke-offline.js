// Container can't reach Supabase (egress policy) — verify the shell + login screen + graceful network error.
const { _electron: electron } = require("playwright"); const path = require("path"); const fs = require("fs"); const os = require("os");
fs.rmSync(path.join(os.homedir(), ".config", "CarSales AI OS"), { recursive: true, force: true });
(async () => {
  const app = await electron.launch({ args: [path.join(__dirname, ".."), "--no-sandbox"] });
  const page = await app.firstWindow(); const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.waitForTimeout(2500);
  console.log("title:", await page.title(), "| login form:", await page.locator("#username").count());
  await page.fill("#username", "jared.casper"); await page.fill("#password", "123456"); await page.click('button[type="submit"]'); await page.waitForTimeout(4000);
  console.log("error shown:", (await page.locator(".text-destructive").first().textContent().catch(() => "none"))?.trim());
  await page.screenshot({ path: path.join(__dirname, "..", "release", "smoke", "login-supabase.png") });
  console.log("pageerrors:", errors.length ? errors : "none");
  await app.close();
})().catch((e) => { console.error("FAILED", e.message); process.exit(1); });
