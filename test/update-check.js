const { _electron: electron } = require("playwright"); const path = require("path"); const fs=require("fs"); const os=require("os");
(async () => {
  const app = await electron.launch({ args: [path.join(__dirname, ".."), "--no-sandbox"], env: { ...process.env, NO_PROXY: "127.0.0.1", no_proxy: "127.0.0.1" } });
  const page = await app.firstWindow(); await page.waitForTimeout(9000);
  const ud = path.join(os.homedir(), ".config", "CarSales AI OS");
  console.log("bundle.json:", fs.existsSync(path.join(ud, "bundle.json")) ? fs.readFileSync(path.join(ud, "bundle.json"), "utf8") : "MISSING");
  console.log("bundles:", fs.existsSync(path.join(ud, "bundles")) ? fs.readdirSync(path.join(ud, "bundles")) : []);
  await app.close();
  // relaunch → should serve downloaded bundle
  const app2 = await electron.launch({ args: [path.join(__dirname, ".."), "--no-sandbox"] });
  const p2 = await app2.firstWindow(); await p2.waitForTimeout(2500);
  console.log("native info:", JSON.stringify(await p2.evaluate(() => window.carsalesNative.getInfo())));
  await app2.close();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
