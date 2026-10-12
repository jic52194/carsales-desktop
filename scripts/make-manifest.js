// Builds release/web/manifest.json + copies web/dist so the desktop shell can auto-update.
// Usage: node scripts/make-manifest.js <version> [baseUrl]
const fs = require("fs");
const path = require("path");
const { createHash } = require("crypto");

const version = process.argv[2] || require("../package.json").version;
const baseUrl = process.argv[3] || "";
const dist = path.join(__dirname, "..", "web", "dist");
const out = path.join(__dirname, "..", "release", "web");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const files = [];
(function walk(dir, rel = "") {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name), r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) walk(abs, r);
    else {
      // release assets are flat: assets/index.js is uploaded as assets__index.js; `path` is where the shell writes it
      const flat = r.replace(/\//g, "__");
      fs.copyFileSync(abs, path.join(out, flat));
      files.push({ path: r, url: flat, sha256: createHash("sha256").update(fs.readFileSync(abs)).digest("hex"), bytes: fs.statSync(abs).size });
    }
  }
})(dist);
fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify({ version, builtAt: new Date().toISOString(), baseUrl, files }, null, 2));
console.log(`manifest ${version}: ${files.length} files → ${out}`);
