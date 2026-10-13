# Porting demo modules into the real app — conventions

The demo (web/_archive/pages/*.tsx) is mock UI. We are rebuilding each module as a REAL, per-dealership module on the live backend. Rules:

1. **No mock data. Ever.** No hard-coded customers, vehicles, numbers, "market" values, fake charts. If a number needs a vendor we don't have (KBB, MarketCheck, CARFAX history, lenders' APIs, GHL), show an honest empty state with a short note: "Connect <Provider> in Settings → Connections" and, where sensible, a manual-entry field. Empty states must say what to do next.
2. **Data sources (only these):**
   - `@/lib/store` — `useCollection("customers"|"leads"|"deals"|"tasks"|"appointments"|"activity")`, `insert/update/remove/get/list`, helpers `fullName, money, fmtDate, fmtDateTime, logActivity`. Types `Customer, Lead, Deal, Task, Appointment, Activity`.
   - `@/lib/inventory` — `useInventory()`, `upsertVehicle, deleteVehicle, getVehicle, uploadVehiclePhotos, vTitle, vPrice, vMiles, vImage, vDaysInStock`, type `Vehicle` (fields: id, stockNumber, vin, year, make, model, trim, bodyStyle, mileage, price, cost, exteriorColor, interiorColor, transmission, drivetrain, engine, fuelType, mpg, images[], sourceUrl, description, features[], status "Available"|"Pending"|"Sold"|…, source, addedAt, updatedAt).
   - `@/lib/records` — generic per-dealership records: `useRecords<T>(kind)`, `addRecord(kind, data, userId)`, `updateRecord(kind, id, patch)`, `removeRecord(kind, id)`, `listRecords/getRecord`. Each record is `{ id, kind, createdAt, updatedAt, createdBy, data: T }`. Use ONE kind per module (string, snake_case, e.g. "appraisal", "recon", "lender", "template", "spiff", "service_ticket"). Define a TS interface for `data`.
   - `@/lib/auth` — `useAuth()` → `{ user, role, hasPermission(roles[]) }`, `useUsers()` (dealership staff: id, fullName, role, username). Roles: super_admin, owner, admin, manager, sales, f_and_i, service, inventory, web, technician, porter.
   - `@/lib/tenant` — `useTenant()` (name, phone, website, address, colors, logoUrl, hours, financing, disclaimers).
   - `@/lib/ai` — `askAi(task, { messages, context })` for any "AI" feature; wrap in try/catch and on `AiNotConfigured` show "AI assistant isn't set up yet — add the Anthropic key in Settings". Never fake AI output.
   - `@/lib/calculations` — `calculateDeal`, `formatCurrency`.
   - `@/lib/csv` — `downloadCsv(name, rows)`.
3. **UI:** shadcn components from `@/components/ui/*`, lucide icons, `toast` from sonner. Page shell: `<div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">` with `<h1 className="text-3xl font-black">Title</h1>` + one-line `<p className="text-muted-foreground">`. Works at 390px (no fixed widths, tables inside `overflow-x-auto`). Recharts is available for real data charts only.
4. **Writes:** every create/update goes through the libs above (they persist to Supabase and cache). Use `logActivity(action, entity, id, details, user.id)` for notable actions. Destructive actions need a confirm dialog.
5. **Files:** write the new page to `web/src/pages/<Name>.tsx` (default export). Do NOT edit App.tsx, modules.ts, or any lib — report the route you want (`/path`), label, lucide icon name, nav group, and roles in your final message.
6. **Must typecheck:** run `cd web && npx tsc --noEmit -p .` before finishing and fix errors in your files only.
7. Keep each page roughly 150–350 lines. Port the demo's *purpose and workflow*, not its decorative widgets. Cut anything that cannot be real.
