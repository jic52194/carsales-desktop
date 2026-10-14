// voice-brain — live-call "brain" for GoHighLevel Voice AI Custom Actions (POST only).
// One URL per action:  .../functions/v1/voice-brain?key=<dealership intake key>&action=<action>
// Actions: search_inventory · vehicle_details · customer_lookup · create_lead · dealership_info
// Auth = the dealership's intake key (same key the website forms use; it can only read that dealership's
// public-facing data — available inventory, hours — and create a lead). Answers are short and speakable;
// every response carries `say`, a plain sentence the agent can read out, plus the structured data.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : typeof v === "number" ? String(v) : "");
const num = (v: unknown) => { const n = Number(String(v ?? "").replace(/[^0-9.]/g, "")); return Number.isFinite(n) && n > 0 ? n : null; };
const last10 = (v: string) => v.replace(/\D/g, "").slice(-10);
const money = (n: number | null) => (n ? "$" + Math.round(n).toLocaleString("en-US") : "call for price");
const miles = (n: number | null) => (n ? `${Math.round(n / 1000)}k miles` : "");
const MAKES = ["acura","audi","bmw","buick","cadillac","chevrolet","chevy","chrysler","dodge","fiat","ford","gmc","honda","hyundai","infiniti","jaguar","jeep","kia","land rover","lexus","lincoln","mazda","mercedes","mini","mitsubishi","nissan","porsche","ram","subaru","tesla","toyota","volkswagen","vw","volvo"];
const BODY: Record<string, string[]> = { suv: ["suv", "crossover", "sport utility"], truck: ["truck", "pickup"], sedan: ["sedan"], van: ["van", "minivan"], coupe: ["coupe"], hatchback: ["hatchback", "wagon"] };

function speak(v: any) { return `${v.year} ${v.make} ${v.model}${v.trim ? " " + v.trim : ""}, ${[miles(v.mileage), v.exterior_color].filter(Boolean).join(", ")}${v.mileage || v.exterior_color ? ", " : ""}${money(v.price)}, stock number ${v.stock_number}`; }

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const url = new URL(req.url);
  const key = str(url.searchParams.get("key") || req.headers.get("x-intake-key"), 64);
  const action = str(url.searchParams.get("action"), 40);
  if (!key) return json({ error: "missing key" }, 401);
  const { data: t } = await admin.from("tenants").select("id,name,phone,website,address,hours,financing,status").eq("intake_key", key).single();
  if (!t || t.status !== "active") return json({ error: "unknown dealership" }, 401);
  const b: any = await req.json().catch(() => ({}));
  const p: any = { ...(b.parameters ?? {}), ...(b.params ?? {}), ...(b.customData ?? {}), ...b };   // GHL sends collected parameters as JSON fields
  const callerPhone = str(p.phone || p.caller_phone || p.contact?.phone || p.from, 40);

  // light rate limit: 120 calls / 10 min per dealership
  const since = new Date(Date.now() - 10 * 60e3).toISOString();
  const { count } = await admin.from("intake_events").select("*", { count: "exact", head: true }).eq("tenant_id", t.id).eq("ip", "voice-ai").gte("created_at", since);
  if ((count ?? 0) >= 120) return json({ say: "Give me one second, our system is busy — let me have someone call you right back." }, 429);
  await admin.from("intake_events").insert({ tenant_id: t.id, ip: "voice-ai" });

  if (action === "dealership_info") {
    const a = t.address ?? {};
    const hours = Object.entries(t.hours ?? {}).map(([d, h]) => `${d} ${h}`).join("; ");
    return json({ say: `${t.name} is at ${[a.street, a.city, a.state].filter(Boolean).join(", ")}. Hours: ${hours}. Phone ${t.phone ?? ""}.`, name: t.name, address: a, hours: t.hours, phone: t.phone, website: t.website, financing_notes: t.financing?.notes ?? [] });
  }

  if (action === "search_inventory") {
    const q = str(p.query || p.vehicle || p.request || p.what_they_want, 200).toLowerCase();
    const maxPrice = num(p.max_price || p.budget) ?? (() => { const m = q.match(/(?:under|below|less than|max|up to)\s*\$?\s*(\d[\d,]*)\s*(k)?/); return m ? Number(m[1].replace(/,/g, "")) * (m[2] ? 1000 : 1) : null; })();
    const make = str(p.make, 30).toLowerCase() || MAKES.find((m) => q.includes(m)) || "";
    const model = str(p.model, 40).toLowerCase();
    const bodyKey = str(p.body_type, 20).toLowerCase() || Object.keys(BODY).find((k) => BODY[k].some((w) => q.includes(w))) || "";
    const minYear = num(p.min_year);
    let qb = admin.from("vehicles").select("stock_number,year,make,model,trim,body_style,mileage,price,exterior_color,drivetrain").eq("tenant_id", t.id).eq("status", "Available");
    if (maxPrice) qb = qb.lte("price", maxPrice);
    if (minYear) qb = qb.gte("year", minYear);
    const mk = make === "chevy" ? "chevrolet" : make === "vw" ? "volkswagen" : make;
    if (mk) qb = qb.ilike("make", `%${mk}%`);
    if (model) qb = qb.ilike("model", `%${model}%`);
    const { data } = await qb.order("price", { ascending: true }).limit(200);
    let rows = data ?? [];
    if (bodyKey) rows = rows.filter((v) => BODY[bodyKey].some((w) => (v.body_style ?? "").toLowerCase().includes(w)) || (bodyKey === "suv" && /awd|4wd|4x4/i.test(v.drivetrain ?? "")));
    if (!model && q) { const words = q.split(/\W+/).filter((w) => w.length > 2 && !["under", "below", "with", "the", "and", "for", "car", "cars", "less", "than", "something"].includes(w) && !MAKES.includes(w) && !BODY[w]); const hit = rows.filter((v) => words.some((w) => `${v.model} ${v.trim ?? ""}`.toLowerCase().includes(w))); if (hit.length) rows = hit; }
    const top = rows.slice(0, 5);
    if (!top.length) return json({ say: `I don't have an exact match on the lot right now${maxPrice ? " under " + money(maxPrice) : ""}. Inventory changes every day — I can have a salesperson text you options.`, count: 0, vehicles: [] });
    return json({ say: `I've got ${rows.length} that fit. ${top.slice(0, 3).map(speak).join(". ")}.`, count: rows.length, vehicles: top });
  }

  if (action === "vehicle_details") {
    const stock = str(p.stock_number || p.stock, 20).replace(/^#/, "");
    const q = str(p.query || p.vehicle, 120).toLowerCase();
    let v: any = null;
    if (stock) { const { data } = await admin.from("vehicles").select("*").eq("tenant_id", t.id).ilike("stock_number", `%${stock}%`).limit(1); v = data?.[0]; }
    if (!v && q) { const { data } = await admin.from("vehicles").select("*").eq("tenant_id", t.id).eq("status", "Available").limit(300); v = (data ?? []).find((x) => q.split(/\W+/).filter((w) => w.length > 2).every((w) => `${x.year} ${x.make} ${x.model} ${x.trim ?? ""} ${x.exterior_color ?? ""}`.toLowerCase().includes(w))); }
    if (!v) return json({ say: "I couldn't find that one — can you give me the year and model, or the stock number from the listing?", found: false });
    const feats = (v.features ?? []).slice(0, 6).join(", ");
    return json({ say: `${speak(v)}. ${[v.drivetrain, v.engine, v.transmission].filter(Boolean).join(", ")}.${feats ? " Highlights: " + feats + "." : ""} It's ${String(v.status).toLowerCase()}.`, found: true,
      vehicle: { stock_number: v.stock_number, year: v.year, make: v.make, model: v.model, trim: v.trim, mileage: v.mileage, price: v.price, exterior_color: v.exterior_color, interior_color: v.interior_color, drivetrain: v.drivetrain, engine: v.engine, transmission: v.transmission, mpg: v.mpg, status: v.status, features: (v.features ?? []).slice(0, 12), url: v.source_url } });
  }

  if (action === "customer_lookup") {
    const d = last10(callerPhone);
    if (d.length !== 10) return json({ say: "", known: false });
    const { data: cs } = await admin.from("customers").select("id,first_name,last_name,phone").eq("tenant_id", t.id).not("phone", "is", null);
    const c = cs?.find((x) => last10(x.phone ?? "") === d);
    if (!c) return json({ say: "", known: false });
    const { data: ls } = await admin.from("leads").select("stage,vehicle_id,created_at").eq("tenant_id", t.id).eq("customer_id", c.id).order("created_at", { ascending: false }).limit(1);
    let interest = "";
    if (ls?.[0]?.vehicle_id) { const { data: v } = await admin.from("vehicles").select("year,make,model,status").eq("id", ls[0].vehicle_id).single(); if (v) interest = `${v.year} ${v.make} ${v.model}${v.status !== "Available" ? ` (now ${String(v.status).toLowerCase()})` : ""}`; }
    return json({ say: `Returning customer: ${c.first_name}${interest ? `, last looked at the ${interest}` : ""}.`, known: true, first_name: c.first_name, last_name: c.last_name, vehicle_of_interest: interest || null, lead_stage: ls?.[0]?.stage ?? null });
  }

  if (action === "create_lead") {
    const first = str(p.first_name || p.name?.split?.(" ")[0] || p.contact?.firstName, 80) || "Caller";
    const last = str(p.last_name || (typeof p.name === "string" ? p.name.split(" ").slice(1).join(" ") : "") || p.contact?.lastName, 80);
    const email = str(p.email || p.contact?.email, 160).toLowerCase();
    const want = str(p.vehicle || p.vehicle_of_interest || p.query, 200);
    const stock = str(p.stock_number, 20).replace(/^#/, "");
    const notes = str(p.notes || p.summary || p.message, 1500);
    const when = str(p.preferred_time || p.appointment_time, 80);
    const d = last10(callerPhone);
    if (d.length !== 10 && !email) return json({ say: "What's the best number to reach you?", ok: false, error: "need phone or email" }, 400);
    let customerId: string | null = null;
    if (d.length === 10) { const { data } = await admin.from("customers").select("id,phone").eq("tenant_id", t.id).not("phone", "is", null); customerId = data?.find((x) => last10(x.phone ?? "") === d)?.id ?? null; }
    if (!customerId && email) { const { data } = await admin.from("customers").select("id").eq("tenant_id", t.id).ilike("email", email).limit(1); customerId = data?.[0]?.id ?? null; }
    if (!customerId) { const { data, error } = await admin.from("customers").insert({ tenant_id: t.id, first_name: first, last_name: last || null, phone: callerPhone || null, email: email || null, source: "Phone (AI)" }).select("id").single(); if (error) return json({ say: "Got it — someone will call you right back.", ok: false, error: error.message }, 500); customerId = data.id; }
    let vehicleId: string | null = null;
    if (stock) { const { data } = await admin.from("vehicles").select("id").eq("tenant_id", t.id).ilike("stock_number", `%${stock}%`).limit(1); vehicleId = data?.[0]?.id ?? null; }
    const body = [want && `Interested in: ${want}`, when && `Preferred time: ${when}`, notes].filter(Boolean).join(" · ");
    const { data: open } = await admin.from("leads").select("id").eq("tenant_id", t.id).eq("customer_id", customerId).not("stage", "in", "(sold,lost)").limit(1);
    let leadId = open?.[0]?.id ?? null;
    if (!leadId) { const { data: lead } = await admin.from("leads").insert({ tenant_id: t.id, customer_id: customerId, vehicle_id: vehicleId, stage: "new", source: "GoHighLevel · Phone AI", message: body || null, notes: body ? `Phone call (AI): ${body}` : "Phone call (AI)" }).select("id").single(); leadId = lead?.id ?? null; }
    else if (body) { await admin.from("leads").update({ notes: `Phone call (AI): ${body}`, ...(vehicleId ? { vehicle_id: vehicleId } : {}) }).eq("id", leadId); }
    await admin.from("records").insert({ tenant_id: t.id, kind: "message", data: { customerId, channel: "call", direction: "inbound", body: body ? `AI phone call — ${body}` : "AI phone call", at: new Date().toISOString(), via: "ghl-voice-ai" } });
    await admin.from("audit_log").insert({ tenant_id: t.id, action: "voice_ai_lead", entity: "lead", entity_id: leadId, details: { customerId, vehicleId } });
    return json({ say: `Perfect, ${first}. I've got you down${want ? " for the " + want : ""} and a salesperson will follow up${when ? " about " + when : " shortly"}.`, ok: true, lead_id: leadId });
  }

  return json({ error: "unknown action", actions: ["search_inventory", "vehicle_details", "customer_lookup", "create_lead", "dealership_info"] }, 400);
});
