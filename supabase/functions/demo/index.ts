// demo — runs the staged demo dealership (tenants.is_demo).
//   reset        → CarSalesSoftware branding + fresh sample cars, customers, leads, deals…
//   personalize  → { profile } from site-scan: the prospect's name, logo, colors, phone, address and hours, their real
//                  inventory pulled from their website (Dealer Car Search, or any site that publishes vehicle JSON-LD),
//                  then fresh sample customers/leads/deals built around their cars.
//   reset_all    → nightly job (x-push-secret): reset every demo dealership.
// Auth: a signed-in owner/admin/manager OF A DEMO DEALERSHIP (only their own), or the internal push secret.
// It never touches a dealership that isn't marked is_demo.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type, apikey, x-client-info, x-push-secret", "content-type": "application/json" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 CarSalesAIOS-Demo/1.0";

const DEFAULT_BRAND = {
  name: "CarSalesSoftware Demo Motors", legal_name: "", tagline: "The AI operating system for car dealerships",
  phone: "(207) 222-7737", email: "contact@casperb2b.com", website: "https://carsalessoftware.com",
  address: { street: "1 Main St", city: "Salem", state: "NH", zip: "03079" },
  hours: { Monday: "9:00 AM – 7:00 PM", Tuesday: "9:00 AM – 7:00 PM", Wednesday: "9:00 AM – 7:00 PM", Thursday: "9:00 AM – 7:00 PM", Friday: "9:00 AM – 6:00 PM", Saturday: "9:00 AM – 5:00 PM", Sunday: "Closed" },
  logo_url: "https://assets.cdn.filesafe.space/C0zjPUHUreayXhYgJtbb/media/69dceaa61774270f1d6f7bb6.png",
  colors: { primary: "#1D6FE0", secondary: "#0F172A", accent: "#38BDF8" },
  social: {}, financing: {}, inventory_source: {},
};

const MAKES = ["Alfa Romeo", "Land Rover", "Mercedes-Benz", "Aston Martin", "Rolls-Royce", "Acura", "Audi", "BMW", "Buick", "Cadillac", "Chevrolet", "Chevy", "Chrysler", "Dodge", "Fiat", "Ford", "Genesis", "GMC", "Honda", "Hyundai", "Infiniti", "INFINITI", "Jaguar", "Jeep", "Kia", "Lexus", "Lincoln", "Maserati", "Mazda", "MINI", "Mitsubishi", "Nissan", "Porsche", "RAM", "Ram", "Subaru", "Tesla", "Toyota", "Volkswagen", "Volvo", "Scion", "Saturn", "Pontiac", "Mercury", "Hummer", "Smart", "Lucid", "Rivian", "Polestar"];
const text = (html: string) => html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ");
const grab = (t: string, re: RegExp) => { const m = t.match(re); return m ? m[1].trim() : null; };
const num = (s: unknown) => { if (s == null) return null; const n = parseInt(String(s).replace(/[^0-9]/g, ""), 10); return Number.isFinite(n) ? n : null; };
const cap = (s: string | null) => (s ? s.replace(/\b([A-Z])([A-Z]+)\b/g, (_, a, b) => a + b.toLowerCase()) : null);

async function get(url: string, ms = 12000): Promise<string | null> {
  try {
    const r = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" }, redirect: "follow", signal: AbortSignal.timeout(ms) });
    if (!r.ok) return null; return await r.text();
  } catch { return null; }
}

type V = { stock_number: string | null; vin: string | null; year: number | null; make: string | null; model: string | null; trim: string; mileage: number; price: number | null; exterior_color: string | null; interior_color: string | null; transmission: string | null; drivetrain: string | null; engine: string | null; images: string[]; source_url: string | null; body_style?: string | null; fuel_type?: string | null };

function splitName(name: string) {
  const year = num(grab(name, /\b((?:19|20)\d{2})\b/));
  let rest = name.replace(/^\s*(?:Used|New|Pre-Owned|Certified)?\s*(?:Pre-Owned\s*)?(?:19|20)\d{2}\s*/i, "").trim(), make: string | null = null;
  for (const mk of MAKES) if (rest.toLowerCase().startsWith(mk.toLowerCase())) { make = mk === "Chevy" ? "Chevrolet" : mk === "INFINITI" ? "Infiniti" : mk; rest = rest.slice(mk.length).trim(); break; }
  const parts = rest.split(/\s+/); const model = parts.shift() || null;
  return { year, make, model, trim: parts.join(" ") };
}

// ---- Dealer Car Search sites (/newandusedcars + /vdp/<id>/) ----
async function dcsInventory(site: string, limit: number): Promise<V[]> {
  const ids: string[] = [];
  for (let page = 1; page <= 3 && ids.length < limit; page++) {
    const html = await get(`${site}/newandusedcars?clearall=1&pagesize=24&page=${page}`); if (!html) break;
    const found = [...html.matchAll(/\/vdp\/(\d+)\//g)].map((m) => m[1]).filter((id) => !ids.includes(id));
    if (!found.length) break; ids.push(...new Set(found));
  }
  const out: V[] = []; const queue = ids.slice(0, limit);
  const worker = async () => {
    while (queue.length) {
      const id = queue.shift()!; const html = await get(`${site}/vdp/${id}/`, 10000); if (!html) continue;
      const t = text(html);
      const h1 = grab(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
      const heading = (h1 ? text(h1) : grab(html, /<title>([^<]*)<\/title>/i) || "").replace(/\s*[|]\s*.*$/, "").trim();
      const n = splitName(heading);
      const price = /Call for Price|Get ePrice/i.test(t) && !/Price\s*\$/i.test(t) ? null : num(grab(t, /(?:Retail|Internet|Sale|Our|Cash)\s*Price:?\s*\$\s*([\d,]+)/i) ?? grab(t, /\$\s*([\d,]{4,})/));
      const images = [...new Set([...html.matchAll(/https?:\/\/imagescdn\.dealercarsearch\.com\/Media\/\d+\/\d+\/[^"'\s)]+\.(?:jpg|jpeg|png|webp)/gi)].map((m) => m[0].replace(/^http:/, "https:")))].filter((u) => !/nophoto|placeholder|thumb_/i.test(u)).slice(0, 30);
      out.push({ ...n, stock_number: grab(t, /Stock\s*#?:?\s*([A-Za-z0-9-]+)/i), vin: grab(t, /\bVIN:?\s*([A-HJ-NPR-Z0-9]{17})\b/i)?.toUpperCase() ?? null,
        mileage: num(grab(t, /Mileage:?\s*([\d,]+)/i)) ?? 0, price,
        exterior_color: cap(grab(t, /\bColor:?\s*([A-Za-z][A-Za-z ]{1,30}?)\s+(?:Interior|Transmission|Engine|Stock|Vin|Mileage)/i)),
        interior_color: cap(grab(t, /Interior Color:?\s*([A-Za-z][A-Za-z ]{1,30}?)\s+(?:Transmission|Engine|Stock|Vin|Mileage|Drive)/i)),
        transmission: grab(t, /Transmission:?\s*([A-Za-z0-9 ]{3,30}?)\s+(?:Drive|Engine|Cylinders|Stock|Vin|Mileage|Color)/i),
        drivetrain: grab(t, /Drive\s*Train:?\s*([A-Za-z0-9]{2,5})\b/i), engine: grab(t, /Engine:?\s*(\d\.\dL[^ ]*)/i), images, source_url: `${site}/vdp/${id}/` });
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  return out;
}

// ---- any site that publishes schema.org vehicles (Dealer.com, DealerOn, Dealer Inspire, Frazer, many others) ----
function ldNodes(html: string): any[] {
  const out: any[] = [];
  const walk = (n: any) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    out.push(n);
    if (n["@graph"]) walk(n["@graph"]);
    if (n.itemListElement) walk(n.itemListElement);
    if (n.item) walk(n.item);
    if (n.offers?.itemOffered) walk(n.offers.itemOffered);
  };
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { walk(JSON.parse(m[1].trim())); } catch { /* skip bad block */ }
  }
  return out;
}
const isVehicle = (n: any) => { const t = [].concat(n["@type"] ?? []).join(" "); return /\b(Car|Vehicle|Automobile|MotorizedBicycle)\b/i.test(t) || (/Product/i.test(t) && (n.vehicleIdentificationNumber || n.mileageFromOdometer || n.modelDate || n.vehicleModelDate)); };
function fromLd(n: any, base: string): V {
  const nm = String(n.name ?? "");
  const s = splitName(nm);
  const brand = typeof n.brand === "string" ? n.brand : n.brand?.name ?? n.manufacturer?.name ?? n.manufacturer ?? null;
  const offer = Array.isArray(n.offers) ? n.offers[0] : n.offers;
  const imgs = [].concat(n.image ?? []).map((i: any) => (typeof i === "string" ? i : i?.url || i?.contentUrl)).filter(Boolean).map((u: string) => { try { return new URL(u, base).href; } catch { return null; } }).filter(Boolean) as string[];
  const url = n.url || offer?.url || null;
  return {
    year: num(n.vehicleModelDate ?? n.modelDate ?? n.productionDate) ?? s.year, make: brand ? String(brand) : s.make,
    model: (typeof n.model === "string" ? n.model : n.model?.name) ?? s.model, trim: n.vehicleConfiguration ?? s.trim ?? "",
    stock_number: n.sku ?? n.productID ?? null, vin: (n.vehicleIdentificationNumber ?? "").toString().toUpperCase() || null,
    mileage: num(n.mileageFromOdometer?.value ?? n.mileageFromOdometer) ?? 0, price: num(offer?.price ?? offer?.lowPrice),
    exterior_color: n.color ?? null, interior_color: n.vehicleInteriorColor ?? null, transmission: n.vehicleTransmission ?? null,
    drivetrain: n.driveWheelConfiguration ? String(n.driveWheelConfiguration).replace(/^https?:\/\/schema\.org\//, "") : null,
    engine: typeof n.vehicleEngine === "string" ? n.vehicleEngine : n.vehicleEngine?.name ?? null, body_style: n.bodyType ?? null,
    fuel_type: n.fuelType ?? null, images: imgs.slice(0, 30), source_url: url ? (() => { try { return new URL(url, base).href; } catch { return null; } })() : null,
  };
}
async function ldInventory(site: string, inventoryUrl: string, limit: number): Promise<V[]> {
  const tries = [inventoryUrl, `${site}/used-inventory/index.htm`, `${site}/used-vehicles/`, `${site}/inventory`, site].filter(Boolean);
  const seen = new Set<string>(); const out: V[] = []; const deadline = Date.now() + 25000;   // keep the demo snappy
  const pages = await Promise.all([...new Set(tries)].map(async (u) => ({ u, html: await get(u, 9000) })));
  for (const { u, html } of pages) {
    if (!html || Date.now() > deadline) continue;
    for (const n of ldNodes(html).filter(isVehicle)) {
      const v = fromLd(n, u); const key = v.vin || `${v.year}${v.make}${v.model}${v.price}${v.mileage}`;
      if (!v.year || !v.make || !v.model || seen.has(key)) continue; seen.add(key); out.push(v);
      if (out.length >= limit) return out;
    }
    if (out.length >= 8) break;
  }
  return out;
}

async function wipe(tenant: string) {
  await admin.from("records").delete().eq("tenant_id", tenant).not("kind", "in", "(dashboard,notif_pref,workflow)");
  for (const t of ["tasks", "appointments", "deals", "leads", "customers", "vehicles"]) {
    const { error } = await admin.from(t).delete().eq("tenant_id", tenant); if (error) throw new Error(`clear ${t}: ${error.message}`);
  }
}

async function reset(tenant: string) {
  await admin.from("tenants").update(DEFAULT_BRAND).eq("id", tenant).eq("is_demo", true);
  await wipe(tenant);
  const { data, error } = await admin.rpc("demo_build_svc", { p_tenant: tenant, p_keep_vehicles: false }); if (error) throw error;
  return data;
}

async function personalize(tenant: string, p: any) {
  const site = String(p.website || "").replace(/\/+$/, "");
  const brand: any = {
    name: String(p.name || "").trim() || "Your Dealership", tagline: p.tagline || null, phone: p.phone || DEFAULT_BRAND.phone, email: p.email || null,
    website: site || null, address: { street: p.address?.street || "", city: p.address?.city || "", state: p.address?.state || "", zip: p.address?.zip || "" },
    hours: p.hours && Object.keys(p.hours).length ? p.hours : DEFAULT_BRAND.hours, logo_url: p.logoUrl || p.ogImage || "",
    colors: { primary: p.colors?.primary || DEFAULT_BRAND.colors.primary, secondary: p.colors?.secondary || DEFAULT_BRAND.colors.secondary, accent: p.colors?.accent || DEFAULT_BRAND.colors.accent },
    social: p.social ?? {}, financing: p.creditAppUrl ? { creditAppUrl: p.creditAppUrl, notes: [] } : {}, inventory_source: {},   // never nightly-synced
  };
  // inventory first (before anything is cleared) so a failed read leaves the demo intact
  let cars: V[] = []; let how = "";
  if (site) {
    const dcs = p.inventory?.code === "dcs" || /dealercarsearch/i.test(`${p.logoUrl} ${p.inventory?.platform}`);
    if (dcs) { cars = await dcsInventory(site, 40); how = "Dealer Car Search"; }
    if (cars.length < 3) { const ld = await ldInventory(site, p.inventoryUrl || "", 60); if (ld.length > cars.length) { cars = ld; how = "website listings"; } }
  }
  cars = cars.filter((c) => c.year && c.make && c.model);
  await admin.from("tenants").update(brand).eq("id", tenant).eq("is_demo", true);
  await wipe(tenant);
  let imported = 0;
  if (cars.length >= 3) {
    const rows = cars.map((c, i) => ({
      tenant_id: tenant, stock_number: (c.stock_number || `D${String(i + 1).padStart(4, "0")}`).slice(0, 30), vin: c.vin, year: c.year, make: c.make, model: c.model, trim: c.trim || "",
      body_style: c.body_style ?? null, mileage: c.mileage ?? 0, price: c.price, cost: c.price ? Math.round((c.price * (0.74 + ((i * 37) % 12) / 100)) / 100) * 100 : null,
      exterior_color: c.exterior_color, interior_color: c.interior_color, transmission: c.transmission, drivetrain: c.drivetrain, engine: c.engine, fuel_type: c.fuel_type ?? null,
      images: c.images, source_url: c.source_url, status: "Available", source: "demo", added_at: new Date(Date.now() - ((i * 53) % 110) * 86400000).toISOString(),
    }));
    // stock numbers must be unique per dealership
    const seen = new Set<string>(); rows.forEach((r, i) => { let s = r.stock_number; while (seen.has(s.toLowerCase())) s = `${r.stock_number}-${i}`; seen.add(s.toLowerCase()); r.stock_number = s; });
    const { error } = await admin.from("vehicles").insert(rows); if (error) throw new Error(`cars: ${error.message}`);
    imported = rows.length;
  }
  const { error } = await admin.rpc("demo_build_svc", { p_tenant: tenant, p_keep_vehicles: imported >= 3 }); if (error) throw error;
  return { ok: true, name: brand.name, imported, how: imported ? how : "", sample: imported < 3 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  let body: any = {}; try { body = await req.json(); } catch { /* empty */ }
  const action = String(body.action || "");
  try {
    const secret = req.headers.get("x-push-secret");
    if (secret) {
      const { data: ok } = await admin.rpc("ghl_push_secret_ok", { p: secret }); if (!ok) return json({ error: "bad secret" }, 401);
      if (action === "reset_all") {
        const { data: ts } = await admin.from("tenants").select("id,name").eq("is_demo", true);
        const results = []; for (const t of ts ?? []) { try { results.push({ tenant: t.name, ...(await reset(t.id)) }); } catch (e) { results.push({ tenant: t.name, error: (e as Error).message }); } }
        return json({ ok: true, results });
      }
      if (body.tenant_id && (action === "reset" || action === "personalize")) {
        const { data: t } = await admin.from("tenants").select("id").eq("id", body.tenant_id).eq("is_demo", true).maybeSingle(); if (!t) return json({ error: "not a demo dealership" }, 400);
        return json(action === "reset" ? await reset(t.id) : await personalize(t.id, body.profile ?? {}));
      }
      return json({ error: "unknown action" }, 400);
    }
    const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "unauthorized" }, 401);
    const { data: { user } } = await createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false } }).auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: prof } = await admin.from("profiles").select("tenant_id,role,is_active").eq("id", user.id).single();
    if (!prof?.is_active || !["owner", "admin", "manager", "super_admin"].includes(prof.role)) return json({ error: "Only a manager can change the demo" }, 403);
    const { data: t } = await admin.from("tenants").select("id").eq("id", prof.tenant_id).eq("is_demo", true).maybeSingle();
    if (!t) return json({ error: "This only works in the demo dealership" }, 403);
    if (action === "reset") return json(await reset(t.id));
    if (action === "personalize") return json(await personalize(t.id, body.profile ?? {}));
    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message || "Something went wrong" }, 500);
  }
});
