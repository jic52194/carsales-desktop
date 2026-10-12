# CarSales AI OS — Windows desktop app (CarSalesSoftware.com)

Electron shell around the CarSales AI OS React app. Same pattern as `timehub-desktop`.

## Layout
- `main.js` / `preload.js` — Electron shell. Serves `web/dist` over `app://carsales/` (SPA fallback), tray, single-instance, `window.carsalesNative` bridge.
- `web/` — the React app (Vite + shadcn). Exported from the vibe builder, extended with:
  - `src/lib/tenant.ts` — multi-tenant config, theming (`applyTenantTheme`), onboarding state
  - `src/tenants/bestprice.ts` + `bestprice-inventory.json` — tenant #1 (Best Price Auto Sales, 167 units)
  - `src/lib/inventory.ts` — tenant-scoped inventory store (localStorage now; Supabase next)
  - `src/pages/Onboarding.tsx` — first-run wizard (dealer info → branding → inventory → connections)
- `supabase/migrations/0001_core.sql` — multi-tenant schema + RLS (project `suooupofqybiojouttxe`, partially applied — see project notes)
- `test/smoke.js` — headless Electron smoke test (`xvfb-run -a node test/smoke.js`)
- `.github/workflows/release.yml` — builds `CarSalesAIOS-Setup.exe` on push (windows-latest)

## Dev
```
npm install && npm run web:install
npm run web:build
npm start
```

## Cloud mode (later)
Set `%APPDATA%\CarSales AI OS\config.json` → `{ "remoteUrl": "https://app.carsalessoftware.com" }` (or env `CARSALES_REMOTE_URL`) and the shell loads the vibe-published cloud app instead of the bundled build.
