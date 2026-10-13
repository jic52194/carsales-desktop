// sync-inventory — pulls a dealer's live inventory from their Dealer Car Search website into `vehicles`.
// Auth: either header `x-sync-key` (nightly pg_cron job) or a signed-in admin/manager/inventory user's JWT ("Sync now").
// Never exposes the service role key; all writes are server-side.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const UA = "Mozilla/5.0 (compatible; CarSalesAIOS-InventorySync/1.0; +https://carsalessoftware.com)";
const MAKES = ["Alfa Romeo", "Land Rover", "Mercedes-Benz", "Aston Martin", "Rolls-Royce", "Acura", "Audi", "BMW", "Buick", "Cadillac", "Chevrolet", "Chrysler", "Dodge", "Fiat", "Ford", "Genesis", "GMC", "Honda", "Hyundai", "Infiniti", "Jaguar", "Jeep", "Kia", "Lexus", "Lincoln", "Maserati", "Mazda", "MINI", "Mitsubishi", "Nissan", "Porsche", "RAM", "Ram", "Subaru", "Tesla", "Toyota", "Volkswagen", "Volvo", "Scion", "Saturn", "Pontiac", "Mercury", "Hummer", "Smart", "Lucid", "Rivian", "Polestar"];

const text = (html: string) => html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ");
const grab = (t: string, re: RegExp) => { const m = t.match(re); return m ? m[1].trim() : null; };
const num = (s: string | null) => (s ? parseInt(s.replace(/[^0-9]/g, ""), 10) : null);
const title = (s: string | null) => (s ? s.replace(/\b([A-Z])([A-Z]+)\b/g, (_, a, b) => a + b.toLowerCase()) : null);

async function fetchHtml(url: string): Promise<string> {
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "text/html" } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return await r.text();
}

async function crawlListing(site: string): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let page = 1; page <= 30; page++) {
    const html = await fetchHtml(`${site}/newandusedcars?clearall=1&pagesize=24&page=${page}`);
    const found = [...html.matchAll(/\/vdp\/(\d+)\//g)].map((m) => m[1]);
    const before = ids.size;
    found.forEach((id) => ids.add(id));
    if (found.length === 0 || ids.size === before) break;
  }
  return ids;
}

function parseVdp(html: string, vdpId: string, dealerId: string | null) {
  const t = text(html);
  const h1 = grab(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const heading = (h1 ? text(h1) : grab(html, /<title>([^<]*)<\/title>/i) || "").replace(/\s*[|-]\s*Best.*$/i, "").trim();
  const year = num(grab(heading, /\b((?:19|20)\d{2})\b/));
  let make: string | null = null, rest = heading.replace(/^\s*(?:Used|New|Certified)?\s*(?:19|20)\d{2}\s*/i, "");
  for (const mk of MAKES) if (rest.toLowerCase().startsWith(mk.toLowerCase())) { make = mk; rest = rest.slice(mk.length).trim(); break; }
  const parts = rest.split(/\s+/);
  const model = parts.shift() || null;
  const trim = parts.join(" ") || "";
  const city = grab(t, /City\s+(\d{1,3})\b/), hwy = grab(t, /Hwy\s+(\d{1,3})\b/);
  const price = /Get ePrice|Call for Price/i.test(t) && !/Retail Price\s*\$/i.test(t) ? null : num(grab(t, /(?:Retail|Internet|Sale|Our)\s*Price\s*\$\s*([\d,]+)/i) ?? grab(t, /\$\s*([\d,]{4,})/));
  const imgRe = dealerId ? new RegExp(`https?://imagescdn\\.dealercarsearch\\.com/Media/${dealerId}/${vdpId}/[^"'\\s)]+\\.(?:jpg|jpeg|png|webp)`, "gi") : /https?:\/\/imagescdn\.dealercarsearch\.com\/Media\/\d+\/\d+\/[^"'\s)]+\.(?:jpg|jpeg|png|webp)/gi;
  const images = [...new Set([...html.matchAll(imgRe)].map((m) => m[0].replace(/^http:/, "https:")))].filter((u) => !/nophoto|placeholder|thumb_/i.test(u)).slice(0, 40);
  return {
    stock_number: grab(t, /Stock\s*#?:?\s*([A-Za-z0-9-]+)/i), vin: grab(t, /\bVIN:?\s*([A-HJ-NPR-Z0-9]{17})\b/i)?.toUpperCase() ?? null,
    year, make, model, trim, mileage: num(grab(t, /Mileage:?\s*([\d,]+)/i)) ?? 0, price,
    exterior_color: title(grab(t, /\bColor:?\s*([A-Za-z][A-Za-z ]{1,30}?)\s+(?:Interior|Transmission|Engine|Stock|Vin|Mileage)/i)),
    interior_color: title(grab(t, /Interior Color:?\s*([A-Za-z][A-Za-z ]{1,30}?)\s+(?:Transmission|Engine|Stock|Vin|Mileage|Drive)/i)),
    transmission: grab(t, /Transmission:?\s*([A-Za-z0-9 ]{3,30}?)\s+(?:Drive|Engine|Cylinders|Stock|Vin|Mileage|Color)/i),
    drivetrain: grab(t, /Drive\s*Train:?\s*([A-Za-z0-9]{2,5})\b/i), engine: grab(t, /Engine:?\s*(\d\.\dL[^ ]*)/i),
    mpg: city && hwy ? `City ${city} / Hwy ${hwy}` : null, images, heading,
  };
}

async function syncTenant(tenant: any, log: string[]) {
  const site = String(tenant.website || "").replace(/\/+$/, "");
  const dealerId = tenant.inventory_source?.dealerId ?? null;
  const counts = { added: 0, updated: 0, sold: 0, errors: 0 };
  const { data: run } = await admin.from("sync_runs").insert({ tenant_id: tenant.id, source: site }).select().single();
  try {
    const liveIds = await crawlListing(site);
    log.push(`listing: ${liveIds.size} vehicles on ${site}`);
    if (liveIds.size < 5) throw new Error("listing returned too few vehicles — aborting so nothing gets marked sold by mistake");
    const { data: existing } = await admin.from("vehicles").select("id,external_id,stock_number,vin,status,price,mileage,images").eq("tenant_id", tenant.id);
    const byExt = new Map((existing ?? []).filter((v) => v.external_id).map((v) => [v.external_id!.replace(/^bp-/, ""), v]));
    const byStock = new Map((existing ?? []).map((v) => [v.stock_number.toLowerCase(), v]));
    const queue = [...liveIds];
    const worker = async () => {
      while (queue.length) {
        const vdpId = queue.shift()!;
        try {
          const html = await fetchHtml(`${site}/vdp/${vdpId}/`);
          const p = parseVdp(html, vdpId, dealerId);
          if (!p.stock_number || !p.year || !p.make || !p.model) { counts.errors++; log.push(`skip ${vdpId}: could not parse (${p.heading})`); continue; }
          const cur = byExt.get(vdpId) ?? byStock.get(p.stock_number.toLowerCase());
          const row: any = { price: p.price, mileage: p.mileage, last_synced_at: new Date().toISOString(), external_id: `bp-${vdpId}`, source_url: `${site}/vdp/${vdpId}/` };
          if (p.images.length) row.images = p.images;
          if (cur) {
            if (cur.status === "Sold" && !cur.sold_at) row.status = "Available";
            const { error } = await admin.from("vehicles").update(row).eq("id", cur.id);
            if (error) throw error; counts.updated++;
          } else {
            const { error } = await admin.from("vehicles").insert({ tenant_id: tenant.id, stock_number: p.stock_number, vin: p.vin, year: p.year, make: p.make, model: p.model, trim: p.trim, mileage: p.mileage, price: p.price, exterior_color: p.exterior_color, interior_color: p.interior_color, transmission: p.transmission, drivetrain: p.drivetrain, engine: p.engine, mpg: p.mpg, images: p.images, status: "Available", source: `${site.replace(/^https?:\/\//, "")} (Dealer Car Search) — synced`, ...row });
            if (error) throw error; counts.added++; log.push(`added ${p.year} ${p.make} ${p.model} #${p.stock_number}`);
          }
        } catch (e) { counts.errors++; log.push(`error ${vdpId}: ${(e as Error).message}`); }
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    // units that came from the website and are no longer listed → Sold
    for (const v of existing ?? []) {
      const ext = v.external_id?.replace(/^bp-/, "");
      if (ext && !liveIds.has(ext) && v.status !== "Sold") {
        await admin.from("vehicles").update({ status: "Sold", sold_at: new Date().toISOString(), last_synced_at: new Date().toISOString() }).eq("id", v.id);
        counts.sold++; log.push(`sold/removed #${v.stock_number}`);
      }
    }
    await admin.from("sync_runs").update({ finished_at: new Date().toISOString(), status: counts.errors && !counts.added && !counts.updated ? "failed" : "ok", ...counts, log: log.slice(-200) }).eq("id", run!.id);
  } catch (e) {
    log.push(`fatal: ${(e as Error).message}`);
    await admin.from("sync_runs").update({ finished_at: new Date().toISOString(), status: "failed", ...counts, errors: counts.errors + 1, log: log.slice(-200) }).eq("id", run!.id);
  }
  return counts;
}

Deno.serve(async (req) => {
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type, x-sync-key", "content-type": "application/json" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  let tenantFilter: string | null = null;
  // auth path 1: scheduled job with shared secret
  const key = req.headers.get("x-sync-key");
  const { data: cfg } = await admin.from("sync_config").select("secret").eq("id", 1).single();
  let authorized = !!key && !!cfg && key === cfg.secret;
  // auth path 2: signed-in admin/manager/inventory user → their own tenant only
  if (!authorized) {
    const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (jwt) {
      const { data: { user } } = await createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } } }).auth.getUser();
      if (user) {
        const { data: p } = await admin.from("profiles").select("tenant_id, role, is_active").eq("id", user.id).single();
        if (p?.is_active && ["super_admin", "owner", "admin", "manager", "inventory"].includes(p.role)) { authorized = true; tenantFilter = p.tenant_id; }
      }
    }
  }
  if (!authorized) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });

  let q = admin.from("tenants").select("id,name,website,inventory_source").eq("status", "active").not("website", "is", null);
  if (tenantFilter) q = q.eq("id", tenantFilter);
  const { data: tenants } = await q;
  const results: any[] = [];
  for (const t of tenants ?? []) {
    if (t.inventory_source?.platform !== "Dealer Car Search") continue;
    const log: string[] = [];
    const counts = await syncTenant(t, log);
    results.push({ tenant: t.name, ...counts, log: log.slice(-20) });
  }
  return new Response(JSON.stringify({ ok: true, results }), { headers: cors });
});
