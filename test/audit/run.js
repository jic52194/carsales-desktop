// Click-through audit of the built web app (web/dist) in headless Chromium, offline, seeded from cache.
// Usage: node test/audit/run.js  → writes test/audit/out/findings.json + screenshots
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const seed = require("./seed");
const DIST = path.join(__dirname, "..", "..", "web", "dist"), OUT = path.join(__dirname, "out");
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".webmanifest": "application/manifest+json", ".ico": "image/x-icon" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); let f = path.join(DIST, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, "index.html");
  res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
});
const PORT = 8099, BASE = `http://localhost:${PORT}`;
const EXTRA = ["/system-check","/my-dashboard","/notifications","/follow-up","/bdc","/test-drives","/appraisals","/rescue","/credit-apps","/lenders","/compliance","/title-reg","/warranty","/bhph","/aging","/pricing","/recon","/photos","/lot","/acquisition","/wholesale","/auctions","/floorplan","/inbox","/templates","/campaigns","/videos","/website","/kiosk","/service","/service/reminders","/service/bay","/parts","/doc","/accounting","/accounts-payable","/leaderboard","/pay-plans","/hr","/command","/metrics","/report-builder","/heatmap","/workflows","/security","/deals/d1000000-0000-4000-8000-000000000001/jacket"];
const ROUTES = [...EXTRA, "/", "/tasks", "/appointments", "/customers", "/customers/c1000000-0000-4000-8000-000000000001", "/leads", "/desking", "/deals", "/inventory", "/inventory/528c0da7-d581-4559-bf41-254fe69b020f", "/reports", "/settings", "/dealerships", "/onboarding", "/nope-404"];
const UNSAFE = /delete|remove|archive|suspend|deactivate|approve|reject|submit|send|save|create|import|pay|publish|invite|reset|sign out|log out|clock|start|end|exit|confirm|connect|disconnect|sync now|mark|move|add (customer|vehicle|user|dealership)|new deal|finish|launch|done|delivered|funded|dead|restart|check for updates|export|download|copy|upload|take ownership|follow up|schedule|book/i;
const SMELLS = /\bundefined\b|\bNaN\b|\bnull\b|Invalid Date|\[object Object\]|lorem ipsum|TODO|FIXME/;

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const findings = [], inventory = [];
  const note = (f) => findings.push(f);
  for (const [role, width] of [["super_admin", 1280], ["owner", 1280], ["owner", 390]]) {
    {
      const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 800 }, deviceScaleFactor: 1 });
      const ls = seed(role);
      await ctx.addInitScript((ls) => { for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v); }, ls);
      // offline: every supabase call fails fast
      await ctx.route((u) => !u.href.startsWith(BASE), (r) => r.abort("failed"));
      const page = await ctx.newPage();
      const errs = []; page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => { if (m.type() === "error" && !/supabase|Failed to load resource|net::ERR|fetch/i.test(m.text())) errs.push(m.text()); });
      const snap = async () => page.evaluate(() => ({ url: location.pathname + location.search, h1: document.querySelector("h1")?.innerText?.trim() || "", dialog: !!document.querySelector("[role=dialog]"), text: document.body.innerText.length + ":" + document.body.innerText.slice(0, 400), len: document.body.innerText.length }));
      for (const r of ROUTES) {
        errs.length = 0;
        await page.goto(BASE + r, { waitUntil: "domcontentloaded" }).catch(() => {}); await page.waitForTimeout(900);
        const s = await snap();
        const smells = await page.evaluate((re) => { const t = document.body.innerText; const m = t.match(new RegExp(re, "g")); return m ? [...new Set(m)] : []; }, SMELLS.source);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
        const els = await page.evaluate(() => Array.from(document.querySelectorAll("a,button,[role=tab],[role=menuitem]")).filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; }).map((e, i) => ({ i, nav: !!e.closest("[data-sidebar], aside, nav"), text: (e.innerText || e.getAttribute("aria-label") || e.title || "").trim().slice(0, 60), tag: e.tagName.toLowerCase(), href: e.getAttribute("href"), disabled: e.disabled || e.getAttribute("aria-disabled") === "true", role: e.getAttribute("role") })));
        inventory.push({ role, width, route: r, h1: s.h1, url: s.url, elements: els.length, errors: [...errs], smells, overflow });
        if (r !== "/nope-404" && (!s.h1 && !s.dialog)) note({ sev: "P1", role, width, page: r, element: "(page)", now: `no main heading rendered (text: ${s.text.slice(0, 80)})`, should: "page renders a heading and content", type: "blank" });
        if (r === "/nope-404" && !/not found|404/i.test(s.text)) note({ sev: "P2", role, width, page: r, element: "(page)", now: "unknown route shows: " + s.text.slice(0, 60), should: "friendly 404 with a link home", type: "broken" });
        if (errs.length) note({ sev: "P1", role, width, page: r, element: "(console)", now: errs.slice(0, 3).join(" | ").slice(0, 200), should: "no JS errors", type: "error" });
        if (smells.length) note({ sev: "P2", role, width, page: r, element: "(text)", now: "page text contains " + smells.join(", "), should: "no placeholder/undefined text", type: "smell" });
        if (overflow) note({ sev: "P2", role, width, page: r, element: "(layout)", now: "horizontal overflow at " + width + "px", should: "no horizontal scroll", type: "mobile" });
        await page.screenshot({ path: path.join(OUT, `${role}-${width}${r.replace(/[\/:]/g, "_") || "_home"}.png`), fullPage: width === 390 });
        if (process.env.CLICKS === "0" || width !== 1280 || r === "/nope-404" || role !== "super_admin") continue;
        const seenNav = new Set();
        console.log("clicking", r, els.length);
        // click the safe ones
        for (const el of els) {
          if (!el.text && !el.href) continue;
          if (el.nav && r !== "/") continue;
          if (el.disabled) { if (!/sync|connect/i.test(el.text)) note({ sev: "P2", role, width, page: r, element: el.text, now: "disabled with no explanation", should: "hide it or explain why it's disabled", type: "sense" }); continue; }
          if (UNSAFE.test(el.text)) { inventory.push({ role, route: r, skipped: el.text }); continue; }
          if (el.href && /^(https?:|mailto:|tel:|sms:)/.test(el.href)) continue; // external — not clicked
          await page.goto(BASE + r, { waitUntil: "domcontentloaded" }).catch(() => {}); await page.waitForTimeout(500);
          const before = await snap();
          if (/^(csv|print|export)$/i.test(el.text.trim())) { inventory.push({ role, route: r, skipped: el.text + " (download/print)" }); continue; }
          const handle = await page.evaluateHandle((i) => Array.from(document.querySelectorAll("a,button,[role=tab],[role=menuitem]")).filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== "hidden"; })[i], el.i);
          const e = handle.asElement(); if (!e) continue;
          errs.length = 0;
          const clsBefore = await e.evaluate((x) => x.className + "|" + x.getAttribute("aria-pressed") + "|" + x.getAttribute("data-state"));
          try { await e.scrollIntoViewIfNeeded(); await e.click({ timeout: 2000 }); } catch (ex) { note({ sev: "P2", role, width, page: r, element: el.text, now: "could not be clicked: " + ex.message.split("\n")[0].slice(0, 80), should: "clickable", type: "dead" }); continue; }
          await page.waitForTimeout(700);
          const after = await snap();
          const clsAfter = await e.evaluate((x) => x.className + "|" + x.getAttribute("aria-pressed") + "|" + x.getAttribute("data-state")).catch(() => clsBefore);
          const fullText = await page.evaluate(() => document.body.innerText).catch(() => "");
          const changed = before.url !== after.url || before.h1 !== after.h1 || before.dialog !== after.dialog || before.text !== after.text || clsBefore !== clsAfter || fullText.length !== before.len;
          if (!changed) note({ sev: "P1", role, width, page: r, element: `${el.tag}: ${el.text}${el.href ? ` (${el.href})` : ""}`, now: "click changes nothing (same URL, heading, no dialog, no content change)", should: "navigate, open, or give feedback", type: "dead" });
          if (el.href && before.url !== after.url && !after.h1 && !after.dialog) note({ sev: "P1", role, width, page: r, element: `${el.text} → ${el.href}`, now: "lands on a page with no heading", should: "a real page", type: "broken" });
          if (/not found|404/i.test(after.text) && !/404|nope/.test(after.url) === false) {}
          if (/Page not found|404/i.test(after.text)) note({ sev: "P1", role, width, page: r, element: `${el.text} → ${el.href}`, now: "lands on 404", should: "a real page", type: "broken" });
          if (errs.length) note({ sev: "P1", role, width, page: r, element: el.text, now: "JS error after click: " + errs[0].slice(0, 160), should: "no errors", type: "error" });
          if (after.dialog) await page.keyboard.press("Escape").catch(() => {});
        }
      }
      await ctx.close();
    }
  }
  fs.writeFileSync(path.join(OUT, "findings.json"), JSON.stringify({ findings, inventory }, null, 2));
  console.log("findings:", findings.length, "pages:", inventory.filter((i) => i.route).length);
  for (const f of findings) console.log(`${f.sev} [${f.role}@${f.width}] ${f.page} :: ${f.element} :: ${f.now}`);
  await browser.close(); server.close();
})().catch((e) => { console.error(e); process.exit(1); });
