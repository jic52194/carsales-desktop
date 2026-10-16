// voice-brain — live-call "brain" for GoHighLevel Voice AI Custom Actions (POST only).
// One URL per action:  .../functions/v1/voice-brain?key=<dealership automation key>&action=<action>
// Actions: search_inventory · vehicle_details · send_link · check_availability · book_appointment · customer_lookup · create_lead · dealership_info
// Auth = the dealership's private automation key (tenants.automation_key — never in public website forms). It can read that dealership's
// available inventory, hours and a caller's name by phone, and create leads. Answers are short and speakable;
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


// ── GoHighLevel (texting + calendar) — same stored connection the app uses ──
const API = "https://services.leadconnectorhq.com";
const e164 = (s?: string | null) => { const d = (s ?? "").replace(/\D/g, ""); return d.length === 10 ? `+1${d}` : d.length === 11 && d.startsWith("1") ? `+${d}` : undefined; };
type G = { token: string; locationId: string; config: any };
async function ghlFor(tenantId: string): Promise<G | null> {
  const { data: i } = await admin.from("integrations").select("id,status,config").eq("tenant_id", tenantId).eq("provider", "ghl").maybeSingle();
  if (!i || i.status !== "connected" || !i.config?.locationId) return null;
  const { data: sec } = await admin.from("integration_secrets").select("secret").eq("integration_id", i.id).maybeSingle();
  return sec?.secret ? { token: sec.secret, locationId: i.config.locationId, config: i.config } : null;
}
async function ghl(g: G, path: string, init: RequestInit & { version?: string } = {}) {
  const r = await fetch(API + path, { ...init, headers: { Authorization: `Bearer ${g.token}`, Version: init.version ?? "2021-07-28", Accept: "application/json", "Content-Type": "application/json" }, signal: AbortSignal.timeout(9000) });
  const t = await r.text(); let b: any = null; try { b = t ? JSON.parse(t) : null; } catch { b = null; }
  if (!r.ok) throw new Error(`GHL ${r.status}: ${b?.message ?? t.slice(0, 120)}`);
  return b;
}
async function contactFor(g: G, tenantId: string, customerId: string) {
  const { data: c } = await admin.from("customers").select("id,first_name,last_name,phone,email,ghl_contact_id").eq("id", customerId).eq("tenant_id", tenantId).single();
  if (!c) throw new Error("customer not found");
  if (c.ghl_contact_id) return c.ghl_contact_id as string;
  const r = await ghl(g, "/contacts/upsert", { method: "POST", body: JSON.stringify({ locationId: g.locationId, firstName: c.first_name, lastName: c.last_name || undefined, phone: e164(c.phone), email: c.email || undefined, source: "CarSales AI OS · Phone AI", tags: ["carsales-ai-os", "voice-ai"] }) });
  const id = r?.contact?.id ?? r?.id; if (!id) throw new Error("no contact id");
  await admin.from("customers").update({ ghl_contact_id: id }).eq("id", c.id);
  return id as string;
}
async function textCustomer(tenantId: string, customerId: string, text: string) {
  const g = await ghlFor(tenantId); if (!g) return { sent: false, why: "not connected" };
  try {
    const contactId = await contactFor(g, tenantId, customerId);
    const r = await ghl(g, "/conversations/messages", { method: "POST", version: "2021-04-15", body: JSON.stringify({ type: "SMS", contactId, message: text }) });
    await admin.from("records").insert({ tenant_id: tenantId, kind: "message", data: { customerId, channel: "sms", direction: "outbound", body: text, at: new Date().toISOString(), via: "ghl", by: null, ghlMessageId: r?.messageId ?? null, sentBy: "Phone AI" } });
    return { sent: true };
  } catch (e) { return { sent: false, why: (e as Error).message }; }
}

// ── customers / vehicles ──
async function customerByPhone(tenantId: string, phone: string) {
  const d = last10(phone); if (d.length !== 10) return null;
  const { data } = await admin.from("customers").select("id,first_name,last_name,phone").eq("tenant_id", tenantId).not("phone", "is", null);
  return data?.find((x) => last10(x.phone ?? "") === d) ?? null;
}
async function ensureCustomer(tenantId: string, phone: string, first: string, last: string, email = "") {
  const c = await customerByPhone(tenantId, phone);
  if (c) { if (first && first !== "Caller" && (c.first_name === "Caller" || c.first_name === "Unknown")) await admin.from("customers").update({ first_name: first, last_name: last || "" }).eq("id", c.id); return c.id as string; }
  const { data, error } = await admin.from("customers").insert({ tenant_id: tenantId, first_name: first || "Caller", last_name: last || "", phone: phone || null, email: email || null, source: "Phone (AI)" }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}
async function findVehicle(tenantId: string, p: any) {
  const stock = str(p.stock_number || p.stock, 20).replace(/^#/, "");
  const q = str(p.query || p.vehicle || p.vehicle_of_interest, 120).toLowerCase();
  if (stock) { const { data } = await admin.from("vehicles").select("*").eq("tenant_id", tenantId).ilike("stock_number", `%${stock}%`).limit(1); if (data?.[0]) return data[0]; }
  if (q) {
    const words = q.split(/\W+/).filter((w) => w.length > 1 && !["the", "a", "an", "one", "car"].includes(w));
    const { data } = await admin.from("vehicles").select("*").eq("tenant_id", tenantId).eq("status", "Available").limit(400);
    const hay = (x: any) => `${x.year} ${x.make} ${x.model} ${x.trim ?? ""} ${x.exterior_color ?? ""}`.toLowerCase();
    return (data ?? []).find((x) => words.every((w) => hay(x).includes(w))) ?? (data ?? []).find((x) => words.filter((w) => hay(x).includes(w)).length >= Math.max(2, words.length - 1)) ?? null;
  }
  return null;
}
const vName = (v: any) => `${v.year} ${v.make} ${v.model}`;
const vLink = (v: any, _t?: any) => `https://app.carsalessoftware.com/v/${v.id}`;   // branded public page: photos, price, call + book a test drive

// ── time: dealership-local times (no tz column yet — derived from the state) ──
const TZ_BY_STATE: Record<string, string> = { CA: "America/Los_Angeles", WA: "America/Los_Angeles", OR: "America/Los_Angeles", NV: "America/Los_Angeles", AZ: "America/Phoenix", CO: "America/Denver", UT: "America/Denver", NM: "America/Denver", MT: "America/Denver", ID: "America/Denver", WY: "America/Denver", TX: "America/Chicago", IL: "America/Chicago", MN: "America/Chicago", WI: "America/Chicago", IA: "America/Chicago", MO: "America/Chicago", AR: "America/Chicago", LA: "America/Chicago", OK: "America/Chicago", KS: "America/Chicago", NE: "America/Chicago", SD: "America/Chicago", ND: "America/Chicago", AL: "America/Chicago", MS: "America/Chicago", TN: "America/Chicago", AK: "America/Anchorage", HI: "Pacific/Honolulu" };
const tzOf = (t: any) => TZ_BY_STATE[String(t.address?.state ?? "").toUpperCase()] ?? "America/New_York";
function partsIn(tz: string, d: Date) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "long", hourCycle: "h23" });
  const o: any = {}; for (const x of f.formatToParts(d)) o[x.type] = x.value; return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, min: +o.minute, weekday: o.weekday as string };
}
function zoned(tz: string, y: number, m: number, d: number, h: number, min: number) {   // local wall time → UTC Date
  const guess = Date.UTC(y, m - 1, d, h, min); const p = partsIn(tz, new Date(guess));
  const off = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min) - guess; return new Date(guess - off);
}
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function dayFrom(tz: string, s: string): { y: number; m: number; d: number } | null {
  const now = partsIn(tz, new Date()); const base = Date.UTC(now.y, now.m - 1, now.d);
  const t = s.toLowerCase().trim(); if (!t) return null;
  const iso = t.match(/(\d{4})-(\d{2})-(\d{2})/); if (iso) return { y: +iso[1], m: +iso[2], d: +iso[3] };
  const md = t.match(/\b(\d{1,2})\/(\d{1,2})\b/); if (md) { const yy = +md[1] < now.m ? now.y + 1 : now.y; return { y: yy, m: +md[1], d: +md[2] }; }
  let add = -1; if (/\btoday\b|tonight/.test(t)) add = 0; else if (/tomorrow/.test(t)) add = 1;
  else { const i = DAYS.findIndex((x) => t.includes(x.toLowerCase()) || t.includes(x.slice(0, 3).toLowerCase())); if (i >= 0) { const cur = DAYS.indexOf(now.weekday); add = (i - cur + 7) % 7 || (/next/.test(t) ? 7 : 0); if (add === 0 && !/today/.test(t)) add = 7 * (now.h >= 17 ? 1 : 0); } }
  if (add < 0) return null; const dt = new Date(base + add * 864e5); return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}
function timeFrom(s: string): { h: number; min: number } | null {
  const t = s.toLowerCase(); if (/noon/.test(t)) return { h: 12, min: 0 };
  const m = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\b/); if (!m) return null;
  let h = +m[1]; const min = m[2] ? +m[2] : 0; const ap = m[3]?.[0];
  if (ap === "p" && h < 12) h += 12; if (ap === "a" && h === 12) h = 0; if (!ap && h >= 1 && h <= 7) h += 12;   // "at 3" on a lot means 3 PM
  return h <= 23 && min <= 59 ? { h, min } : null;
}
function hoursFor(t: any, weekday: string): { open: number; close: number } | null {   // minutes from midnight
  const raw = String((t.hours ?? {})[weekday] ?? ""); if (!raw || /closed|appointment/i.test(raw)) return null;
  const xs = [...raw.matchAll(/(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m/gi)].map((m) => ((+m[1] % 12) + (m[3].toLowerCase() === "p" ? 12 : 0)) * 60 + (m[2] ? +m[2] : 0));
  return xs.length >= 2 ? { open: xs[0], close: xs[1] } : null;
}
const sayTime = (tz: string, d: Date) => new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", hour: "numeric", minute: "2-digit" }).format(d).replace(":00", "");
async function calendarFor(g: G | null) {
  if (!g) return null;
  if (g.config?.voiceCalendarId) return g.config.voiceCalendarId as string;
  try { const r = await ghl(g, `/calendars/?locationId=${encodeURIComponent(g.locationId)}`); const cals = (r?.calendars ?? []).filter((c: any) => c.isActive !== false); return (cals.find((c: any) => /test|drive|sales|appoint|showroom|visit/i.test(c.name)) ?? cals[0])?.id ?? null; } catch { return null; }
}
async function openSlots(t: any, day: { y: number; m: number; d: number }, g: G | null, cal: string | null): Promise<Date[]> {
  const tz = tzOf(t); const start = zoned(tz, day.y, day.m, day.d, 0, 0); const end = new Date(start.getTime() + 864e5 - 1);
  if (g && cal) {
    try { const r = await ghl(g, `/calendars/${encodeURIComponent(cal)}/free-slots?startDate=${start.getTime()}&endDate=${end.getTime()}&timezone=${encodeURIComponent(tz)}`);
      const out: Date[] = []; for (const [k, v] of Object.entries(r ?? {})) if (k !== "traceId" && (v as any)?.slots) out.push(...(v as any).slots.map((x: string) => new Date(x)));
      return out.filter((d) => d.getTime() > Date.now() + 45 * 60e3).sort((a, b) => a.getTime() - b.getTime()); } catch { /* fall back to store hours */ }
  }
  const wd = partsIn(tz, new Date(start.getTime() + 12 * 3600e3)).weekday; const h = hoursFor(t, wd); if (!h) return [];
  const { data: booked } = await admin.from("appointments").select("starts_at").eq("tenant_id", t.id).gte("starts_at", start.toISOString()).lte("starts_at", end.toISOString()).not("status", "in", "(cancelled,no_show)");
  const taken = new Map<number, number>(); for (const b of booked ?? []) { const k = Math.floor(Date.parse(b.starts_at) / 18e5); taken.set(k, (taken.get(k) ?? 0) + 1); }
  const out: Date[] = [];
  for (let mins = h.open; mins + 60 <= h.close; mins += 30) { const d = zoned(tz, day.y, day.m, day.d, Math.floor(mins / 60), mins % 60); if (d.getTime() > Date.now() + 45 * 60e3 && (taken.get(Math.floor(d.getTime() / 18e5)) ?? 0) < 2) out.push(d); }
  return out;
}
function pickSpread(xs: Date[], n = 3) { if (xs.length <= n) return xs; const out = [xs[0]]; const step = (xs.length - 1) / (n - 1); for (let i = 1; i < n; i++) out.push(xs[Math.round(i * step)]); return out; }

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const url = new URL(req.url);
  const key = str(url.searchParams.get("key") || req.headers.get("x-intake-key"), 64);
  const action = str(url.searchParams.get("action"), 40);
  if (!key) return json({ error: "missing key" }, 401);
  const { data: t } = await admin.from("tenants").select("id,name,phone,website,address,hours,financing,status").eq("automation_key", key).single();
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
    const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const hours = Object.entries(t.hours ?? {}).sort(([x], [y]) => DAYS.indexOf(x) - DAYS.indexOf(y)).map(([d, h]) => `${d} ${h}`).join("; ");
    return json({ say: `${t.name} is at ${[a.street, a.city, a.state].filter(Boolean).join(", ")}. Hours: ${hours}. Phone ${t.phone ?? ""}.`, name: t.name, address: a, hours: t.hours, phone: t.phone, website: t.website, financing_notes: t.financing?.notes ?? [] });
  }

  if (action === "search_inventory") {
    const q = str(p.query || p.vehicle || p.request || p.what_they_want, 200).toLowerCase();
    const maxPrice = num(p.max_price || p.budget) ?? (() => { const m = q.match(/(?:under|below|less than|max|up to)\s*\$?\s*(\d[\d,]*)\s*(k)?/); return m ? Number(m[1].replace(/,/g, "")) * (m[2] ? 1000 : 1) : null; })();
    const make = str(p.make, 30).toLowerCase() || MAKES.find((m) => q.includes(m)) || "";
    const model = str(p.model, 40).toLowerCase();
    const bodyKey = str(p.body_type, 20).toLowerCase() || Object.keys(BODY).find((k) => BODY[k].some((w) => q.includes(w))) || "";
    const minYear = num(p.min_year);
    let qb = admin.from("vehicles").select("id,stock_number,year,make,model,trim,body_style,mileage,price,exterior_color,drivetrain").eq("tenant_id", t.id).eq("status", "Available");
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
    return json({ say: `I've got ${rows.length} that fit. ${top.slice(0, 3).map(speak).join(". ")}. Want me to text you the link to any of them?`, count: rows.length, vehicles: top.map((v) => ({ ...v, url: vLink(v) })) });
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
      vehicle: { stock_number: v.stock_number, year: v.year, make: v.make, model: v.model, trim: v.trim, mileage: v.mileage, price: v.price, exterior_color: v.exterior_color, interior_color: v.interior_color, drivetrain: v.drivetrain, engine: v.engine, transmission: v.transmission, mpg: v.mpg, status: v.status, features: (v.features ?? []).slice(0, 12), url: vLink(v) } });
  }


  if (action === "send_link") {
    if (last10(callerPhone).length !== 10) return json({ say: "What's the best cell number to text it to?", sent: false });
    const v = await findVehicle(t.id, p);
    if (!v) return json({ say: "Which one should I send — the year and model, or the stock number?", sent: false });
    const url = vLink(v, t);
    const first = str(p.first_name || p.contact?.firstName, 80);
    const customerId = await ensureCustomer(t.id, callerPhone, first || "Caller", str(p.last_name, 80));
    const hourAgo = new Date(Date.now() - 3600e3).toISOString();
    const { count } = await admin.from("records").select("*", { count: "exact", head: true }).eq("tenant_id", t.id).eq("kind", "message").eq("data->>customerId", customerId).eq("data->>sentBy", "Phone AI").gte("created_at", hourAgo);
    if ((count ?? 0) >= 4) return json({ say: "I've already texted you a few — check your messages, and a salesperson can send more.", sent: false });
    const text = `${first ? `Hi ${first}! ` : ""}Here's the ${vName(v)}${v.trim ? " " + v.trim : ""}${v.price ? ` (${money(v.price)})` : ""} from ${t.name}: ${url}`.trim();
    const r = await textCustomer(t.id, customerId, text);
    await admin.from("audit_log").insert({ tenant_id: t.id, action: "voice_ai_link", entity: "vehicle", entity_id: v.id, details: { customerId, sent: r.sent, why: r.why ?? null } });
    return json(r.sent ? { say: `Done — I just texted you the link to the ${vName(v)}.`, sent: true, url } : { say: `I'll have a salesperson text you the link to the ${vName(v)} right after we hang up.`, sent: false, url });
  }

  if (action === "check_availability") {
    const tz = tzOf(t);
    const g = await ghlFor(t.id); const cal = await calendarFor(g);
    const asked = str(p.day || p.date || p.preferred_time || p.when, 80);
    let day = dayFrom(tz, asked);
    let slots: Date[] = [];
    if (day) slots = await openSlots(t, day, g, cal);
    else { for (let i = 0; i < 7 && !slots.length; i++) { const now = partsIn(tz, new Date(Date.now() + i * 864e5)); day = { y: now.y, m: now.m, d: now.d }; slots = await openSlots(t, day, g, cal); } }
    const want = timeFrom(asked);
    if (want && day && slots.length) { const target = zoned(tz, day.y, day.m, day.d, want.h, want.min).getTime(); const exact = slots.find((s) => Math.abs(s.getTime() - target) < 60e3); if (exact) return json({ say: `${sayTime(tz, exact)} is open. Want me to lock that in?`, slots: [exact.toISOString()], timezone: tz }); slots = [...slots].sort((a, b) => Math.abs(a.getTime() - target) - Math.abs(b.getTime() - target)).slice(0, 3).sort((a, b) => a.getTime() - b.getTime()); }
    if (!slots.length) return json({ say: `We're booked up${asked ? " then" : ""}. What other day works for you?`, slots: [], timezone: tz });
    const pick = want ? slots : pickSpread(slots);
    return json({ say: `I can do ${pick.map((d, i) => (i === 0 ? sayTime(tz, d) : sayTime(tz, d).replace(/^\w+ /, ""))).join(", ").replace(/, ([^,]*)$/, " or $1")}. Which works best?`, slots: pick.map((d) => d.toISOString()), timezone: tz });
  }

  if (action === "book_appointment") {
    const tz = tzOf(t);
    if (last10(callerPhone).length !== 10) return json({ say: "What's the best cell number for the confirmation text?", ok: false });
    const first = str(p.first_name || p.name?.split?.(" ")[0] || p.contact?.firstName, 80);
    if (!first) return json({ say: "And who should I put it under — your first name?", ok: false });
    const last = str(p.last_name || (typeof p.name === "string" ? p.name.split(" ").slice(1).join(" ") : ""), 80);
    let start: Date | null = null;
    const isoIn = str(p.start_time || p.appointment_time || p.datetime, 60);
    if (isoIn && !Number.isNaN(Date.parse(isoIn)) && /\d{4}-\d{2}-\d{2}T/.test(isoIn)) start = new Date(isoIn);
    if (!start) { const words = str(p.day || p.date || p.when || p.preferred_time || isoIn, 80) + " " + str(p.time, 40); const dd = dayFrom(tz, words); const tt = timeFrom(str(p.time, 40) || words); if (dd && tt) start = zoned(tz, dd.y, dd.m, dd.d, tt.h, tt.min); }
    if (!start) return json({ say: "What day and time works best for you?", ok: false });
    if (start.getTime() < Date.now() + 30 * 60e3) return json({ say: "That time's already passed or too close — what's the next time that works?", ok: false });
    const lp = partsIn(tz, start); const h = hoursFor(t, lp.weekday); const mins = lp.h * 60 + lp.min;
    if (h && (mins < h.open || mins + 30 > h.close)) return json({ say: `We're open ${String((t.hours ?? {})[lp.weekday])} on ${lp.weekday}. What time in there works?`, ok: false });
    if (!h && Object.keys(t.hours ?? {}).length && /closed/i.test(String((t.hours ?? {})[lp.weekday] ?? ""))) return json({ say: `We're closed on ${lp.weekday}. What other day works?`, ok: false });
    const v = await findVehicle(t.id, p);
    const customerId = await ensureCustomer(t.id, callerPhone, first, last, str(p.email, 160).toLowerCase());
    const type = /deliver/i.test(str(p.type, 30)) ? "delivery" : /service/i.test(str(p.type, 30)) ? "service" : v ? "test_drive" : "sales";
    const end = new Date(start.getTime() + 60 * 60e3);
    const g = await ghlFor(t.id); const cal = await calendarFor(g);
    let eventId: string | null = null;
    if (g && cal) {
      try {
        const contactId = await contactFor(g, t.id, customerId);
        const r = await ghl(g, "/calendars/events/appointments", { method: "POST", body: JSON.stringify({ calendarId: cal, locationId: g.locationId, contactId, startTime: start.toISOString(), endTime: end.toISOString(), title: `${first} ${last}`.trim() + ` — ${type === "test_drive" ? "Test drive" : "Visit"}${v ? ` · ${vName(v)}` : ""}`, appointmentStatus: "confirmed", ignoreDateRange: false, toNotify: false }) });
        eventId = r?.id ?? r?.event?.id ?? null;
      } catch (e) { await admin.from("audit_log").insert({ tenant_id: t.id, action: "voice_ai_book_ghl_failed", entity: "appointment", details: { error: (e as Error).message } }); }
    }
    const notes = [`Booked by the Phone AI`, v && `Vehicle: ${vName(v)} #${v.stock_number}`, str(p.notes, 400)].filter(Boolean).join(" · ");
    let apptId: string | null = null;
    if (eventId) { const { data: ex } = await admin.from("appointments").select("id").eq("tenant_id", t.id).eq("ghl_event_id", eventId).limit(1); apptId = ex?.[0]?.id ?? null; }
    if (apptId) await admin.from("appointments").update({ vehicle_id: v?.id ?? null, type, notes }).eq("id", apptId);
    else { const { data: a, error } = await admin.from("appointments").insert({ tenant_id: t.id, customer_id: customerId, vehicle_id: v?.id ?? null, type, starts_at: start.toISOString(), ends_at: end.toISOString(), status: "confirmed", source: eventId ? "ghl" : "voice-ai", ghl_event_id: eventId, notes }).select("id").single(); if (error) return json({ say: "I'm having trouble with the calendar — a salesperson will call you right back to lock in the time.", ok: false, error: error.message }, 500); apptId = a.id; }
    // the lead moves to Appointment
    const { data: open } = await admin.from("leads").select("id,stage").eq("tenant_id", t.id).eq("customer_id", customerId).not("stage", "in", "(sold,lost)").limit(1);
    if (open?.[0]) await admin.from("leads").update({ stage: "appointment", ...(v ? { vehicle_id: v.id } : {}) }).eq("id", open[0].id);
    else await admin.from("leads").insert({ tenant_id: t.id, customer_id: customerId, vehicle_id: v?.id ?? null, stage: "appointment", source: "GoHighLevel · Phone AI", notes: `Phone call (AI): booked ${sayTime(tz, start)}${v ? ` for the ${vName(v)}` : ""}` });
    const a = t.address ?? {};
    const when = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(start);
    const sms = `You're booked, ${first}! ${when} at ${t.name}${a.street ? `, ${a.street}, ${a.city ?? ""}` : ""}.${v ? ` We'll have the ${vName(v)} pulled up front: ${vLink(v, t)}` : ""} Questions? Call ${t.phone ?? "us"}.`.replace(/\s+/g, " ");
    const r = await textCustomer(t.id, customerId, sms);
    await admin.from("records").insert({ tenant_id: t.id, kind: "message", data: { customerId, channel: "call", direction: "inbound", body: `AI phone call — booked ${when}${v ? ` · ${vName(v)}` : ""}`, at: new Date().toISOString(), via: "ghl-voice-ai" } });
    await admin.from("audit_log").insert({ tenant_id: t.id, action: "voice_ai_booked", entity: "appointment", entity_id: apptId, details: { customerId, vehicle: v?.id ?? null, ghl: !!eventId, texted: r.sent } });
    return json({ say: `You're all set for ${sayTime(tz, start)}${v ? ` to see the ${vName(v)}` : ""}.${r.sent ? " I just texted you the details and the address." : ""} Anything else I can help with?`, ok: true, appointment_id: apptId, start_time: start.toISOString(), texted: r.sent });
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
    return json({ say: `Perfect, ${first}. I've got you down${want ? (/^(a|an|the)\s/i.test(want) ? " for " : " for the ") + want : ""} and a salesperson will follow up${when ? " about " + when : " shortly"}.`, ok: true, lead_id: leadId });
  }

  return json({ error: "unknown action", actions: ["search_inventory", "vehicle_details", "send_link", "check_availability", "book_appointment", "customer_lookup", "create_lead", "dealership_info"] }, 400);
});
