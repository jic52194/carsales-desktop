// Headless smoke test: login → onboarding (super-admin preview) → dashboard → core pages → create customer/lead/deal.
// Run: xvfb-run -a node test/smoke.js
const { _electron: electron } = require("playwright");
const path = require("path");
const fs = require("fs");
const os = require("os");

const OUT = path.join(__dirname, "..", "release", "smoke");
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
// fresh profile every run
fs.rmSync(path.join(os.homedir(), ".config", "CarSales AI OS"), { recursive: true, force: true });
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`) });
const R = []; const ok = (k, v) => R.push([k, v]);

(async () => {
  const app = await electron.launch({ args: [path.join(__dirname, ".."), "--no-sandbox"] });
  const page = await app.firstWindow();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  await page.waitForLoadState("domcontentloaded"); await page.waitForTimeout(2000);
  ok("title", await page.title()); ok("native", await page.evaluate(() => !!window.carsalesNative));
  await shot(page, "01-login");

  // wrong password rejected
  await page.fill("#username", "Jared.Casper"); await page.fill("#password", "wrong"); await page.click('button[type="submit"]'); await page.waitForTimeout(600);
  ok("bad-login-rejected", await page.locator("text=Invalid username or password").count() === 1);
  await page.fill("#password", "123456"); await page.click('button[type="submit"]'); await page.waitForTimeout(1800);
  ok("after-login-url", page.url()); await shot(page, "02-onboarding");

  for (let i = 0; i < 4; i++) { const b = page.locator('button:has-text("Continue")'); if (await b.count()) { await b.first().click(); await page.waitForTimeout(400); await shot(page, `03-onboard-${i + 2}`); } }
  const fin = page.locator('button:has-text("Finish preview"), button:has-text("Confirm & launch")'); ok("finish-button", await fin.first().textContent());
  await fin.first().click(); await page.waitForTimeout(1500);
  ok("dashboard-url", page.url()); await shot(page, "04-dashboard");
  ok("dashboard-greeting", (await page.locator("h1").first().textContent())?.trim());

  const go = async (r) => { await page.evaluate((r) => { window.location.href = `app://carsales${r}`; }, r); await page.waitForTimeout(1500); };
  for (const r of ["/inventory", "/customers", "/leads", "/desking", "/deals", "/tasks", "/appointments", "/reports", "/settings"]) {
    await go(r); ok(`route ${r}`, `${page.url().replace("app://carsales", "")} :: ${(await page.locator("h1").first().textContent())?.trim()}`); await shot(page, `05${r.replace(/\//g, "-")}`);
  }
  ok("inventory-count", await page.evaluate(() => JSON.parse(localStorage.getItem("vibe_inventory") || "[]").length));

  // create customer → lead → deal
  await go("/customers?new=1"); await page.waitForTimeout(600);
  await page.fill('input[value=""] >> nth=0', "Test"); // first name
  const inputs = page.locator('[role="dialog"] input'); await inputs.nth(0).fill("Taylor"); await inputs.nth(1).fill("Buyer"); await inputs.nth(2).fill("978-555-0100");
  await page.click('button:has-text("Add customer") >> nth=-1'); await page.waitForTimeout(600);
  ok("customer-created", await page.locator("text=Taylor Buyer").count() > 0); await shot(page, "06-customer");
  await go("/leads"); await page.click('button:has-text("New lead")'); await page.waitForTimeout(400);
  await page.locator('[role="dialog"] button[role="combobox"]').first().click(); await page.locator('[role="option"]').first().click();
  await page.click('button:has-text("Create lead")'); await page.waitForTimeout(600);
  ok("lead-created", await page.locator("text=Taylor Buyer").count() > 0); await shot(page, "07-lead");
  await go("/desking"); await page.locator('button[role="combobox"]').nth(0).click(); await page.locator('[role="option"]').first().click();
  await page.locator('button[role="combobox"]').nth(1).click(); await page.locator('[role="option"]').first().click(); await page.waitForTimeout(400);
  ok("desking-payment", (await page.locator("text=/\\$[0-9,]+\\.[0-9]{2}\\/mo|\\$[0-9,]+/mo/").first().textContent().catch(() => "?")));
  await shot(page, "08-desking");
  await page.click('button:has-text("Save")'); await page.waitForTimeout(1200);
  ok("deal-saved-url", page.url().replace("app://carsales", "")); await shot(page, "09-deal");
  ok("vdp", await (async () => { await go("/inventory/bp-24055449"); return (await page.locator("h1").first().textContent())?.trim(); })());
  // sign out → login screen again
  await go("/"); await page.click('button[title="Sign out"]'); await page.waitForTimeout(800);
  ok("signed-out", await page.locator("#username").count() === 1);
  ok("errors", errors.length ? errors.join("\n   ") : "none");
  console.log(R.map(([k, v]) => `${k}: ${v}`).join("\n"));
  await app.close();
})().catch((e) => { console.error("SMOKE FAILED", e); console.log(R.map(([k, v]) => `${k}: ${v}`).join("\n")); process.exit(1); });
