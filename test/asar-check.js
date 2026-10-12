const { _electron: electron } = require("playwright"); const path = require("path");
(async () => {
  const app = await electron.launch({ args: [path.join(__dirname, "..", "release", "win-unpacked", "resources", "app.asar"), "--no-sandbox"], executablePath: require("electron") });
  const t = setTimeout(() => { console.log("NO WINDOW within 15s (ready-to-show never fired?)"); process.exit(2); }, 15000);
  const page = await app.firstWindow(); clearTimeout(t);
  await page.waitForTimeout(2500);
  console.log("url:", page.url(), "| title:", await page.title(), "| has #username:", await page.locator("#username").count());
  await app.close();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
