// lead-intake — public endpoint for a dealership's website forms ("Check availability", "Contact us").
// Auth: the dealership's intake_key (safe to embed: it can only create a lead for that one dealership).
// Rate-limited per IP; honeypot field; creates/matches a customer and opens a lead.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type, x-intake-key, apikey, authorization, x-client-info", "access-control-allow-methods": "POST, OPTIONS", "content-type": "application/json" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });
const clean = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const ct = req.headers.get("content-type") || "";
  const body: Record<string, unknown> = ct.includes("application/json") ? await req.json().catch(() => ({})) : Object.fromEntries((await req.formData().catch(() => new FormData())).entries());
  const key = clean(req.headers.get("x-intake-key") || body.key, 64);
  if (!key) return json({ error: "missing key" }, 401);
  const { data: tenant } = await admin.from("tenants").select("id,name,status").eq("intake_key", key).single();
  if (!tenant || tenant.status !== "active") return json({ error: "unknown dealership" }, 401);

  // honeypot + rate limit (20 / 10 min per IP per dealership)
  if (clean(body.website_url)) return json({ ok: true });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const since = new Date(Date.now() - 10 * 60e3).toISOString();
  const { count } = await admin.from("intake_events").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("ip", ip).gte("created_at", since);
  if ((count ?? 0) >= 20) return json({ error: "too many requests" }, 429);
  await admin.from("intake_events").insert({ tenant_id: tenant.id, ip });

  const first = clean(body.first_name || body.firstName || (clean(body.name).split(" ")[0]), 80);
  const last = clean(body.last_name || body.lastName || clean(body.name).split(" ").slice(1).join(" "), 80);
  const phone = clean(body.phone, 40), email = clean(body.email, 120).toLowerCase();
  const message = clean(body.message || body.comments, 2000);
  const stock = clean(body.stock_number || body.stock, 40), vin = clean(body.vin, 17).toUpperCase();
  const source = clean(body.source, 60) || "Website";
  const pageUrl = clean(body.page_url || req.headers.get("referer"), 500);
  if (!first || (!phone && !email)) return json({ error: "name and a phone or email are required" }, 400);

  // match an existing customer by phone/email, else create
  let customerId: string | null = null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) { const { data } = await admin.from("customers").select("id,phone").eq("tenant_id", tenant.id).not("phone", "is", null); customerId = data?.find((c) => c.phone?.replace(/\D/g, "").endsWith(digits.slice(-10)))?.id ?? null; }
  if (!customerId && email) { const { data } = await admin.from("customers").select("id").eq("tenant_id", tenant.id).ilike("email", email).limit(1); customerId = data?.[0]?.id ?? null; }
  if (!customerId) {
    const { data, error } = await admin.from("customers").insert({ tenant_id: tenant.id, first_name: first, last_name: last, phone: phone || null, email: email || null, source }).select("id").single();
    if (error) return json({ error: error.message }, 500);
    customerId = data.id;
  }
  let vehicleId: string | null = null;
  if (stock || vin) { const q = admin.from("vehicles").select("id").eq("tenant_id", tenant.id); const { data } = stock ? await q.ilike("stock_number", stock).limit(1) : await q.eq("vin", vin).limit(1); vehicleId = data?.[0]?.id ?? null; }

  const { data: lead, error: e2 } = await admin.from("leads").insert({ tenant_id: tenant.id, customer_id: customerId, vehicle_id: vehicleId, stage: "new", source, notes: message || null, message: message || null, source_url: pageUrl || null }).select("id").single();
  if (e2) return json({ error: e2.message }, 500);
  await admin.from("audit_log").insert({ tenant_id: tenant.id, action: "lead_intake", entity: "lead", entity_id: lead.id, details: { source, ip, vehicleId } });
  const wantsRedirect = clean(body.redirect, 500);
  if (wantsRedirect && !ct.includes("application/json")) return new Response(null, { status: 303, headers: { Location: wantsRedirect } });
  return json({ ok: true, lead_id: lead.id, dealership: tenant.name });
});
