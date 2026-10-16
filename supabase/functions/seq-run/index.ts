// seq-run — the Automations engine. Runs every 5 minutes (pg_cron → private.call_fn, x-push-secret).
//   tick   → (1) scans that enroll customers on time-based plays: stalled deals, aged leads, new arrivals / price drops
//            (2) sends every due step: texts and emails through the dealership's GoHighLevel number, tasks to staff,
//                AI-written texts in the dealership's voice. Quiet hours, one-text-a-day throttle, STOP handling.
//   enroll → staff add a customer to a play from the app (user JWT; same dealership only).
// Plays and their steps come from plays.ts (copied from web/src/lib/plays.ts) + the dealership's edits (tenants.automations).
// Event enrollment and instant stops (reply / booked / bought / STOP) happen in the database (20261016_automations.sql).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { playFor, type PlayStep } from "./plays.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const PLATFORM_AI_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-4-5";
const API = "https://services.leadconnectorhq.com";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } });
const e164 = (s?: string | null) => { const d = (s ?? "").replace(/\D/g, ""); return d.length === 10 ? `+1${d}` : d.length === 11 && d.startsWith("1") ? `+${d}` : undefined; };
const money = (n?: number | null) => (n ? "$" + Math.round(n).toLocaleString("en-US") : "");
const vName = (v: any) => (v ? [v.year, v.make, v.model].filter(Boolean).join(" ") : "");
const vLink = (v: any) => `https://app.carsalessoftware.com/v/${v.id}`;
const MIN = 60e3, HOUR = 3600e3, DAY = 864e5;
const BUDGET_MS = 110e3, BATCH = 80;

// ── time (dealership-local; no tz column yet — derived from the state) ──
const TZ_BY_STATE: Record<string, string> = { CA: "America/Los_Angeles", WA: "America/Los_Angeles", OR: "America/Los_Angeles", NV: "America/Los_Angeles", AZ: "America/Phoenix", CO: "America/Denver", UT: "America/Denver", NM: "America/Denver", MT: "America/Denver", ID: "America/Denver", WY: "America/Denver", TX: "America/Chicago", IL: "America/Chicago", MN: "America/Chicago", WI: "America/Chicago", IA: "America/Chicago", MO: "America/Chicago", AR: "America/Chicago", LA: "America/Chicago", OK: "America/Chicago", KS: "America/Chicago", NE: "America/Chicago", SD: "America/Chicago", ND: "America/Chicago", AL: "America/Chicago", MS: "America/Chicago", TN: "America/Chicago", AK: "America/Anchorage", HI: "Pacific/Honolulu" };
const STATE_NAMES: Record<string, string> = { CALIFORNIA: "CA", WASHINGTON: "WA", OREGON: "OR", NEVADA: "NV", ARIZONA: "AZ", COLORADO: "CO", UTAH: "UT", "NEW MEXICO": "NM", MONTANA: "MT", IDAHO: "ID", WYOMING: "WY", TEXAS: "TX", ILLINOIS: "IL", MINNESOTA: "MN", WISCONSIN: "WI", IOWA: "IA", MISSOURI: "MO", ARKANSAS: "AR", LOUISIANA: "LA", OKLAHOMA: "OK", KANSAS: "KS", NEBRASKA: "NE", "SOUTH DAKOTA": "SD", "NORTH DAKOTA": "ND", ALABAMA: "AL", MISSISSIPPI: "MS", TENNESSEE: "TN", ALASKA: "AK", HAWAII: "HI" };
const tzOf = (t: any) => { const st = String(t.address?.state ?? "").trim().toUpperCase(); return TZ_BY_STATE[STATE_NAMES[st] ?? st] ?? "America/New_York"; };
function partsIn(tz: string, d: Date) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23" });
  const o: any = {}; for (const x of f.formatToParts(d)) o[x.type] = x.value; return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, min: +o.minute, wd: o.weekday as string };
}
function zoned(tz: string, y: number, m: number, d: number, h: number, min: number) {
  const guess = Date.UTC(y, m - 1, d, h, min); const p = partsIn(tz, new Date(guess));
  const off = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min) - guess; return new Date(guess - off);
}
/** Texting window: 9am–8pm Mon–Sat, noon–6pm Sunday (dealership time). */
const windowFor = (wd: string) => (wd === "Sun" ? [12, 18] : [9, 20]);
function inWindow(tz: string, d: Date) { const p = partsIn(tz, d); const [a, b] = windowFor(p.wd); const h = p.h + p.min / 60; return h >= a && h < b - 0.25; }
function nextWindow(tz: string, from: Date) {
  for (let i = 0; i < 3; i++) {
    const p = partsIn(tz, new Date(from.getTime() + i * DAY)); const [a] = windowFor(p.wd);
    const start = zoned(tz, p.y, p.m, p.d, a, 5 + Math.floor(Math.random() * 25));
    if (start.getTime() > from.getTime() && inWindow(tz, start)) return start;
  }
  return new Date(from.getTime() + 12 * HOUR);
}
const fmtWhen = (tz: string, d: Date) => new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(d);
const fmtClock = (tz: string, d: Date) => new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(d);

// ── GoHighLevel ──
type G = { token: string; locationId: string };
const gCache = new Map<string, G | null>();
async function ghlFor(tenantId: string): Promise<G | null> {
  if (gCache.has(tenantId)) return gCache.get(tenantId)!;
  const { data: i } = await admin.from("integrations").select("id,status,config").eq("tenant_id", tenantId).eq("provider", "ghl").maybeSingle();
  let g: G | null = null;
  if (i && i.status === "connected" && i.config?.locationId) { const { data: s } = await admin.from("integration_secrets").select("secret").eq("integration_id", i.id).maybeSingle(); if (s?.secret) g = { token: s.secret, locationId: i.config.locationId }; }
  gCache.set(tenantId, g); return g;
}
async function ghl(g: G, path: string, init: RequestInit & { version?: string } = {}) {
  const r = await fetch(API + path, { ...init, headers: { Authorization: `Bearer ${g.token}`, Version: init.version ?? "2021-07-28", Accept: "application/json", "Content-Type": "application/json" } });
  const t = await r.text(); let b: any = null; try { b = t ? JSON.parse(t) : null; } catch { b = {}; }
  if (!r.ok) throw new Error(`GHL ${r.status}: ${b?.message ?? t.slice(0, 120)}`); return b;
}
async function contactFor(g: G, c: any) {
  if (c.ghl_contact_id) return c.ghl_contact_id as string;
  const r = await ghl(g, "/contacts/upsert", { method: "POST", body: JSON.stringify({ locationId: g.locationId, firstName: c.first_name, lastName: c.last_name || undefined, phone: e164(c.phone), email: c.email || undefined, source: "CarSales AI OS", tags: ["carsales-ai-os"] }) });
  const id = r?.contact?.id ?? r?.id; if (!id) throw new Error("GHL returned no contact id");
  await admin.from("customers").update({ ghl_contact_id: id }).eq("id", c.id); c.ghl_contact_id = id;
  return id as string;
}

// ── AI ──
async function aiKey(tenantId: string) {
  const { data: row } = await admin.from("integrations").select("id,status").eq("tenant_id", tenantId).eq("provider", "anthropic").maybeSingle();
  if (row?.status === "connected") { const { data: s } = await admin.from("integration_secrets").select("secret").eq("integration_id", row.id).maybeSingle(); if (s?.secret) return s.secret as string; }
  return PLATFORM_AI_KEY ?? null;
}
async function claude(key: string, system: string, user: string) {
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: MODEL, max_tokens: 300, system, messages: [{ role: "user", content: user }] }) });
  const b: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`AI ${r.status}: ${b?.error?.message ?? ""}`);
  return (b?.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim().replace(/^["']|["']$/g, "");
}

// ── caches per tick ──
const tCache = new Map<string, any>();
async function tenant(id: string) {
  if (!tCache.has(id)) { const { data } = await admin.from("tenants").select("id,name,phone,website,address,hours,ai_voice,automations,is_demo,status").eq("id", id).single(); tCache.set(id, data); }
  return tCache.get(id);
}
const pCache = new Map<string, any>();
async function profile(id?: string | null) {
  if (!id) return null; if (!pCache.has(id)) { const { data } = await admin.from("profiles").select("id,full_name,is_active").eq("id", id).maybeSingle(); pCache.set(id, data); }
  return pCache.get(id);
}
async function managerOf(tenantId: string) {
  const { data } = await admin.from("profiles").select("id,role").eq("tenant_id", tenantId).eq("is_active", true).in("role", ["manager", "admin", "owner"]);
  const rank = (r: string) => (r === "manager" ? 1 : r === "admin" ? 2 : 3);
  return (data ?? []).sort((a, b) => rank(a.role) - rank(b.role))[0]?.id ?? null;
}

// ── one enrollment ──
async function finish(e: any, status: string, reason: string, extra: any = {}) {
  await admin.from("enrollments").update({ status, stop_reason: reason, next_at: null, ...extra }).eq("id", e.id).eq("status", "active");
  return { id: e.id, status, reason };
}
async function similar(tenantId: string, v: any, limit = 3) {
  let q = admin.from("vehicles").select("id,year,make,model,trim,mileage,price,body_style").eq("tenant_id", tenantId).eq("status", "Available").limit(40);
  if (v?.make) q = q.ilike("make", v.make);
  const { data } = await q;
  const rows = (data ?? []).filter((x) => x.id !== v?.id);
  const score = (x: any) => (v?.model && x.model?.toLowerCase() === v.model.toLowerCase() ? 0 : 1) + (v?.price && x.price ? Math.abs(x.price - v.price) / v.price : 1);
  let out = rows.sort((a, b) => score(a) - score(b)).slice(0, limit);
  if (out.length < limit) { const { data: more } = await admin.from("vehicles").select("id,year,make,model,trim,mileage,price,body_style").eq("tenant_id", tenantId).eq("status", "Available").order("added_at", { ascending: false }).limit(limit); out = [...out, ...(more ?? []).filter((x) => x.id !== v?.id && !out.some((o) => o.id === x.id))].slice(0, limit); }
  return out;
}

async function processOne(e: any, started: number) {
  const t = await tenant(e.tenant_id);
  if (!t || t.status !== "active") return finish(e, "stopped", "Dealership not active");
  const play = playFor(e.play, t.automations);
  if (!play) return finish(e, "stopped", "Unknown play");
  if (!play.enabled) return finish(e, "stopped", "Play turned off");
  const tz = tzOf(t), now = new Date();
  const { data: c } = await admin.from("customers").select("id,first_name,last_name,phone,email,sms_opt_out,owner_id,ghl_contact_id").eq("id", e.customer_id).eq("tenant_id", e.tenant_id).maybeSingle();
  if (!c) return finish(e, "stopped", "Customer removed");
  if (c.sms_opt_out) return finish(e, "opted_out", "Opted out");
  const ctx = { ...(e.context ?? {}) };
  if (!ctx.anchor_at) ctx.anchor_at = e.next_at ?? e.created_at;
  const anchor = new Date(ctx.anchor_at);

  // live checks
  let appt: any = null;
  if (e.appointment_id) { const { data } = await admin.from("appointments").select("id,starts_at,status,type,vehicle_id,assigned_to").eq("id", e.appointment_id).maybeSingle(); appt = data; }
  if (e.play === "appointment") {
    if (!appt) return finish(e, "stopped", "Appointment removed");
    if (["cancelled", "showed", "no_show"].includes(appt.status)) return finish(e, "completed", `Appointment ${appt.status.replace("_", "-")}`);
  }
  if (e.play === "stalled_deal" && e.deal_id) {
    const { data: d } = await admin.from("deals").select("status,updated_at").eq("id", e.deal_id).maybeSingle();
    if (!d || !["working", "pending_approval", "approved"].includes(d.status)) return finish(e, "completed", "Deal changed status");
    if (new Date(d.updated_at).getTime() > new Date(e.created_at).getTime() + 2 * MIN) return finish(e, "completed", "Deal was worked");
  }
  if (e.play !== "sold" && e.play !== "appointment") {   // bought recently (here or on another lead) → no "still shopping?" texts
    const since = new Date(Math.min(new Date(e.created_at).getTime(), Date.now() - 45 * DAY)).toISOString();
    const { data: bought } = await admin.from("deals").select("id").eq("tenant_id", e.tenant_id).eq("customer_id", c.id).in("status", ["funded", "delivered"]).gte("updated_at", since).limit(1);
    if (bought?.length) return finish(e, "completed", "Bought a car");
  }
  if (e.step === 0 && !(e.log ?? []).length && e.play !== "appointment" && e.play !== "sold") {   // they texted us just before (e.g. a lead created by their own text)
    const { data: recent } = await admin.from("records").select("id").eq("tenant_id", e.tenant_id).eq("kind", "message").eq("data->>customerId", c.id).eq("data->>direction", "inbound").gte("created_at", new Date(new Date(e.created_at).getTime() - 30 * MIN).toISOString()).limit(1);
    if (recent?.length) return finish(e, "replied", "Customer texted first — answer them in the Inbox");
  }

  // the next step that still applies
  const dueOf = (st: PlayStep) => new Date((st.anchor === "appointment" && appt ? new Date(appt.starts_at).getTime() : anchor.getTime()) + st.at * MIN);
  let i = e.step, st: (PlayStep & { off: boolean }) | null = null, due = now;
  const skipped: string[] = [];
  for (; i < play.steps.length; i++) {
    const s = play.steps[i];
    if (s.off) { skipped.push(s.id); continue; }
    if (s.minLead && appt && new Date(appt.starts_at).getTime() - new Date(e.created_at).getTime() < s.minLead * MIN) { skipped.push(s.id); continue; }
    const d = dueOf(s);
    if (s.anchor === "appointment" && s.kind !== "task" && d.getTime() < now.getTime() - 45 * MIN) { skipped.push(s.id); continue; }
    if (/\{review_link\}/.test(s.body) && !t.automations?.reviewLink) { skipped.push(s.id); continue; }
    st = s; due = d; break;
  }
  if (!st) return finish(e, "completed", "Finished every step", { step: play.steps.length, context: ctx });
  const isMsg = st.kind !== "task";
  let when = due;
  if (when.getTime() > now.getTime()) {
    if (isMsg && !inWindow(tz, when)) when = nextWindow(tz, when);
    await admin.from("enrollments").update({ step: i, next_at: when.toISOString(), context: ctx }).eq("id", e.id).eq("status", "active");
    return { id: e.id, waiting: st.id, until: when.toISOString() };
  }
  if (isMsg && !inWindow(tz, now)) {
    const nw = nextWindow(tz, now);
    await admin.from("enrollments").update({ step: i, next_at: nw.toISOString(), context: ctx }).eq("id", e.id).eq("status", "active");
    return { id: e.id, quiet: true, until: nw.toISOString() };
  }
  // one automated message per customer per day (urgent plays — new lead, appointment — are exempt)
  if (isMsg && !play.urgent) {
    const cap = Math.max(1, Number(t.automations?.dailyCap) || 1);
    const { data: sent } = await admin.from("records").select("created_at").eq("tenant_id", e.tenant_id).eq("kind", "message").eq("data->>customerId", c.id).eq("data->>via", "sequence").gte("created_at", new Date(now.getTime() - 20 * HOUR).toISOString()).order("created_at", { ascending: true });
    if ((sent?.length ?? 0) >= cap) {
      let nx = new Date(new Date(sent![0].created_at).getTime() + 20 * HOUR + 10 * MIN); if (!inWindow(tz, nx)) nx = nextWindow(tz, nx);
      await admin.from("enrollments").update({ step: i, next_at: nx.toISOString(), context: ctx }).eq("id", e.id).eq("status", "active");
      return { id: e.id, throttled: true, until: nx.toISOString() };
    }
  }

  // ── build the message ──
  let vehicle: any = null;
  const vid = e.vehicle_id ?? appt?.vehicle_id;
  if (vid) { const { data } = await admin.from("vehicles").select("id,year,make,model,trim,mileage,price,exterior_color,body_style,status").eq("id", vid).maybeSingle(); vehicle = data; }
  let arrival: any = null;
  if (ctx.arrival_vehicle_id) { const { data } = await admin.from("vehicles").select("id,year,make,model,trim,mileage,price,status").eq("id", ctx.arrival_vehicle_id).maybeSingle(); arrival = data; if (!arrival || arrival.status !== "Available") return finish(e, "completed", "Vehicle no longer available"); }
  const ownerId = e.owner_id ?? c.owner_id ?? null;
  const owner = await profile(ownerId);
  const sp = owner?.is_active && owner?.full_name ? String(owner.full_name).split(" ")[0] : "the team";
  const a = t.address ?? {};
  const vars: Record<string, string> = {
    first_name: c.first_name && c.first_name !== "Unknown" ? c.first_name : "there", customer: [c.first_name, c.last_name].filter(Boolean).join(" ") || "the customer",
    dealership: t.name, salesperson: sp, vehicle: vName(vehicle) || "car", about_vehicle: vehicle ? ` on the ${vName(vehicle)}` : "",
    link: vehicle ? vLink(vehicle) : (t.website ?? ""), phone: t.phone ?? "", address: [a.street, a.city].filter(Boolean).join(", "),
    appt_time: appt ? fmtWhen(tz, new Date(appt.starts_at)) : "", appt_clock: appt ? fmtClock(tz, new Date(appt.starts_at)) : "",
    review_link: t.automations?.reviewLink ?? "", arrival: arrival ? [arrival.year, arrival.make, arrival.model, arrival.trim].filter(Boolean).join(" ") : "",
    arrival_price: arrival?.price ? (ctx.reason === "price_drop" ? ` — now ${money(arrival.price)}` : ` for ${money(arrival.price)}`) : "", arrival_link: arrival ? vLink(arrival) : "",
    arrival_reason: ctx.reason === "price_drop" ? "dropped the price on the" : "got in a",
  };
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "").replace(/[ \t]+/g, " ").replace(/ ([,.!?])/g, "$1").trim();
  let body = fill(st.body), subject = st.subject ? fill(st.subject) : undefined, kind = st.kind, aiUsed = false, aiNote = "";

  if (kind === "ai") {
    kind = "sms";
    try {
      const key = await aiKey(e.tenant_id);
      if (key) {
        const pool = await similar(e.tenant_id, vehicle, 3);
        const inv = pool.map((x) => `${vName(x)}${x.trim ? " " + x.trim : ""}, ${x.mileage ? Math.round(x.mileage / 1000) + "k mi, " : ""}${money(x.price) || "call for price"} — ${vLink(x)}`).join("\n");
        const scope = t.ai_voice?.scope ?? "staff", preset = t.ai_voice?.preset ?? "professional";
        const tone = scope === "staff" ? "Professional, warm and clear." : preset === "friendly" ? "Warm, upbeat and neighborly." : preset === "felipe" ? "Warm and confident with at most one light Spanish phrase." : preset === "custom" && t.ai_voice?.persona ? `Lightly in this voice: ${String(t.ai_voice.persona).slice(0, 300)}` : "Professional, warm and clear.";
        const system = `You write one SMS from ${sp === "the team" ? "the sales team" : sp} at ${t.name} (${vars.address}; phone ${t.phone ?? ""}) to a car shopper. ${tone}
Rules: under 300 characters; sound like a real person, not a bot; use only the facts given; never promise financing, approval, rates, payments or trade values; no emojis unless the voice calls for one; include at most one link; end with an easy question. Output only the message text.`;
        const user = `GOAL: ${st.intent}\nPLAY: ${play.name}\nCUSTOMER FIRST NAME: ${vars.first_name}\nCAR THEY LOOKED AT: ${vehicle ? `${vName(vehicle)}${vehicle.trim ? " " + vehicle.trim : ""} ${money(vehicle.price)} ${vLink(vehicle)} (${vehicle.status})` : "unknown"}\nIN STOCK NOW:\n${inv || "(none listed)"}`;
        const out = await claude(key, system, user);
        if (out && out.length > 10) { body = out.slice(0, 480); aiUsed = true; }
      } else aiNote = "no AI key — sent the written text";
    } catch (err) { aiNote = `AI unavailable (${(err as Error).message.slice(0, 80)}) — sent the written text`; }
  }

  // ── last check right before sending: still running, still opted in (a STOP or reply can land while the AI writes) ──
  const [{ data: live }, { data: oc }] = await Promise.all([
    admin.from("enrollments").select("status").eq("id", e.id).maybeSingle(),
    admin.from("customers").select("sms_opt_out").eq("id", c.id).maybeSingle(),
  ]);
  if (live?.status !== "active") return { id: e.id, skipped: `now ${live?.status ?? "gone"}` };
  if (oc?.sms_opt_out && isMsg) return finish(e, "opted_out", "Opted out");

  // ── send ──
  let result = "", sent = false;
  if (kind === "task") {
    const assignee = st.assign === "manager" ? (await managerOf(e.tenant_id)) ?? ownerId : ownerId ?? (await managerOf(e.tenant_id));
    await admin.from("tasks").insert({ tenant_id: e.tenant_id, assigned_to: assignee, title: body.slice(0, 200), due_at: now.toISOString(), status: "open", priority: e.play === "new_lead" || e.play === "stalled_deal" ? "high" : "normal", related_type: e.deal_id ? "deal" : e.lead_id ? "lead" : "customer", related_id: e.deal_id ?? e.lead_id ?? c.id, notes: `Automation: ${play.name}` });
    result = "task created"; sent = true;
  } else {
    if (kind === "sms" && !c.phone) { result = "skipped: no mobile number"; }
    else if (kind === "email" && !c.email) { result = "skipped: no email"; }
    else {
      if (kind === "sms") {
        const { count } = await admin.from("records").select("*", { count: "exact", head: true }).eq("tenant_id", e.tenant_id).eq("kind", "message").eq("data->>customerId", c.id).eq("data->>direction", "outbound").in("data->>via", ["sequence", "workflow"]);
        if (!count) body = `${body} Reply STOP to opt out.`;
        if (e.play === "appointment" && st.id === "c0") {   // already confirmed by the Phone AI / a person in the last 15 min
          const { data: just } = await admin.from("records").select("id").eq("tenant_id", e.tenant_id).eq("kind", "message").eq("data->>customerId", c.id).eq("data->>direction", "outbound").or("data->>via.is.null,data->>via.neq.sequence").gte("created_at", new Date(now.getTime() - 15 * MIN).toISOString()).limit(1);
          if (just?.length) result = "skipped: already confirmed";
        }
      }
      if (!result) {
        let ghlId: string | null = null, simulated = false, why = "";
        if (t.is_demo) simulated = true;
        else {
          const g = await ghlFor(e.tenant_id);
          if (!g) why = "GoHighLevel not connected";
          else {
            try {
              const contactId = await contactFor(g, c);
              const r = kind === "email"
                ? await ghl(g, "/conversations/messages", { method: "POST", version: "2021-04-15", body: JSON.stringify({ type: "Email", contactId, subject: subject ?? `${t.name}`, html: body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>") }) })
                : await ghl(g, "/conversations/messages", { method: "POST", version: "2021-04-15", body: JSON.stringify({ type: "SMS", contactId, message: body }) });
              ghlId = r?.messageId ?? r?.id ?? null;
            } catch (err) { why = (err as Error).message.slice(0, 160); }
          }
        }
        if (why) {
          await admin.from("tasks").insert({ tenant_id: e.tenant_id, assigned_to: ownerId ?? (await managerOf(e.tenant_id)), title: `${kind === "email" ? "Email" : "Text"} ${vars.customer}: ${body.slice(0, 110)}`, due_at: now.toISOString(), status: "open", priority: "normal", related_type: "customer", related_id: c.id, notes: `Automation "${play.name}" couldn't send automatically (${why}). Send this:\n${subject ? `Subject: ${subject}\n` : ""}${body}` });
          result = `task: ${why}`;
        } else {
          await admin.from("records").insert({ tenant_id: e.tenant_id, kind: "message", data: { customerId: c.id, channel: kind, direction: "outbound", body, subject: subject ?? null, at: now.toISOString(), via: "sequence", play: e.play, by: `Automation · ${play.name}`, ai: aiUsed, ghlMessageId: ghlId, simulated } });
          result = simulated ? "sent (demo — not really texted)" : "sent"; sent = true;
        }
      }
    }
  }
  const log = [...(e.log ?? []), { step: st.id, at: now.toISOString(), kind: st.kind, result, ...(aiNote ? { note: aiNote } : {}), ...(skipped.length ? { skipped } : {}), ...(isMsg && sent ? { text: body.slice(0, 300) } : {}) }].slice(-30);
  // schedule the step after this one (the next tick works out its exact time)
  const nextIdx = i + 1;
  const done = nextIdx >= play.steps.length;
  await admin.from("enrollments").update({ step: nextIdx, next_at: done ? null : new Date(now.getTime() + 2 * MIN).toISOString(), status: done ? "completed" : "active", stop_reason: done ? "Finished every step" : null, log, context: ctx }).eq("id", e.id).eq("status", "active");
  return { id: e.id, step: st.id, result };
}

// ── scans: time-based enrollment ──
async function enroll(row: any) {
  const { error } = await admin.from("enrollments").insert(row);
  return !error;
}
async function scans(minute: number) {
  const { data: ts } = await admin.from("tenants").select("id,automations,status").eq("status", "active");
  const out: any = {};
  for (const t of ts ?? []) {
    const on = (k: string) => !!t.automations?.plays?.[k]?.enabled;
    const n = { stalled: 0, aged: 0, arrival: 0 };
    // stalled deals: no activity for 3 days
    if (on("stalled_deal")) {
      const { data: deals } = await admin.from("deals").select("id,customer_id,vehicle_id,salesperson_id,updated_at").eq("tenant_id", t.id).in("status", ["working", "pending_approval", "approved"]).lt("updated_at", new Date(Date.now() - 3 * DAY).toISOString()).gt("updated_at", new Date(Date.now() - 30 * DAY).toISOString()).limit(60);
      if (deals?.length) {
        const { data: ex } = await admin.from("enrollments").select("deal_id,created_at").eq("play", "stalled_deal").in("deal_id", deals.map((d) => d.id));
        for (const d of deals) {
          if ((ex ?? []).some((x) => x.deal_id === d.id && x.created_at > d.updated_at)) continue;
          if (await enroll({ tenant_id: t.id, play: "stalled_deal", customer_id: d.customer_id, deal_id: d.id, vehicle_id: d.vehicle_id, owner_id: d.salesperson_id, next_at: new Date(Date.now() + n.stalled * 3 * MIN).toISOString(), context: { scan: true } })) n.stalled++;
        }
      }
    }
    // aged leads: once an hour, open leads quiet for 30+ days
    if (on("aged_lead") && minute < 5) {
      const { data: leads } = await admin.from("leads").select("id,customer_id,vehicle_id,assigned_to,updated_at").eq("tenant_id", t.id).in("stage", ["new", "contacted", "appointment", "negotiating"]).lt("updated_at", new Date(Date.now() - 30 * DAY).toISOString()).gt("created_at", new Date(Date.now() - 365 * DAY).toISOString()).order("updated_at", { ascending: false }).limit(150);
      if (leads?.length) {
        const ids = [...new Set(leads.map((l) => l.customer_id))];
        const [{ data: ex }, { data: opted }] = await Promise.all([
          admin.from("enrollments").select("customer_id,play,status,created_at").eq("tenant_id", t.id).in("customer_id", ids).gt("created_at", new Date(Date.now() - 120 * DAY).toISOString()),
          admin.from("customers").select("id").in("id", ids).eq("sms_opt_out", true),
        ]);
        const skip = new Set([...(opted ?? []).map((o) => o.id), ...(ex ?? []).filter((x) => x.status === "active" || x.play === "aged_lead" || x.created_at > new Date(Date.now() - 30 * DAY).toISOString()).map((x) => x.customer_id)]);
        for (const l of leads) {
          if (skip.has(l.customer_id) || n.aged >= 40) continue; skip.add(l.customer_id);
          if (await enroll({ tenant_id: t.id, play: "aged_lead", customer_id: l.customer_id, lead_id: l.id, vehicle_id: l.vehicle_id, owner_id: l.assigned_to, next_at: new Date(Date.now() + n.aged * 7 * MIN).toISOString(), context: { scan: true } })) n.aged++;
        }
      }
    }
    // new arrivals & price drops that match what a customer looked at
    if (on("new_arrival")) {
      const since = new Date(Date.now() - 36 * HOUR).toISOString();
      const [{ data: added }, { data: dropped }] = await Promise.all([
        admin.from("vehicles").select("id,make,model,body_style").eq("tenant_id", t.id).eq("status", "Available").gt("added_at", since).limit(60),
        admin.from("vehicles").select("id,make,model,body_style").eq("tenant_id", t.id).eq("status", "Available").gt("price_dropped_at", since).limit(40),
      ]);
      // a bulk import (>40 new) or a whole-lot repricing (>15 drops) isn't "news" — skip it rather than text everyone
      const cand = [...((added?.length ?? 0) > 40 ? [] : (added ?? []).map((v) => ({ ...v, reason: "arrival" }))), ...((dropped?.length ?? 0) > 15 ? [] : (dropped ?? []).map((v) => ({ ...v, reason: "price_drop" })))];
      if (cand.length) {
        const { data: done } = await admin.from("records").select("data").eq("tenant_id", t.id).eq("kind", "arrival_match").in("data->>vehicleId", cand.map((v) => v.id));
        const doneKeys = new Set((done ?? []).map((r: any) => `${r.data.vehicleId}:${r.data.reason}`));
        const { data: leads } = await admin.from("leads").select("customer_id,assigned_to,vehicle_id,stage,vehicles(id,make,model,body_style)").eq("tenant_id", t.id).neq("stage", "sold").gt("created_at", new Date(Date.now() - 365 * DAY).toISOString()).not("vehicle_id", "is", null).limit(1000);
        for (const v of cand) {
          if (doneKeys.has(`${v.id}:${v.reason}`) || !v.make) continue;
          const lc = (s?: string | null) => (s ?? "").toLowerCase();
          const hits = (leads ?? []).filter((l: any) => l.vehicles && l.vehicles.id !== v.id && lc(l.vehicles.make) === lc(v.make) && ((v.model && lc(l.vehicles.model) === lc(v.model)) || (v.body_style && lc(l.vehicles.body_style) === lc(v.body_style))));
          const custs = [...new Map(hits.map((h: any) => [h.customer_id, h])).values()].slice(0, 25);
          if (custs.length) {
            const ids = custs.map((h: any) => h.customer_id);
            const [{ data: recent }, { data: opted }] = await Promise.all([
              admin.from("enrollments").select("customer_id").eq("tenant_id", t.id).eq("play", "new_arrival").in("customer_id", ids).gt("created_at", new Date(Date.now() - 14 * DAY).toISOString()),
              admin.from("customers").select("id").in("id", ids).eq("sms_opt_out", true),
            ]);
            const skip = new Set([...(recent ?? []).map((r) => r.customer_id), ...(opted ?? []).map((o) => o.id)]);
            for (const h of custs as any[]) {
              if (skip.has(h.customer_id) || n.arrival >= 40) continue; skip.add(h.customer_id);
              if (await enroll({ tenant_id: t.id, play: "new_arrival", customer_id: h.customer_id, vehicle_id: h.vehicle_id, owner_id: h.assigned_to, next_at: new Date(Date.now() + n.arrival * 2 * MIN).toISOString(), context: { arrival_vehicle_id: v.id, reason: v.reason, scan: true } })) n.arrival++;
            }
          }
          await admin.from("records").insert({ tenant_id: t.id, kind: "arrival_match", data: { vehicleId: v.id, reason: v.reason, matched: custs.length, at: new Date().toISOString() } });
        }
      }
    }
    if (n.stalled || n.aged || n.arrival) out[t.id] = n;
  }
  return out;
}

function clearCaches() { gCache.clear(); tCache.clear(); pCache.clear(); }
async function tick() {
  clearCaches();
  const started = Date.now();
  const minute = new Date().getUTCMinutes();
  const scanned = await scans(minute).catch((e) => ({ error: (e as Error).message }));
  const { data: due } = await admin.from("enrollments").select("*").eq("status", "active").lte("next_at", new Date().toISOString()).order("next_at", { ascending: true }).limit(BATCH);
  const results: any[] = [];
  for (const e of due ?? []) {
    if (Date.now() - started > BUDGET_MS) break;
    // claim it so an overlapping run can't send the same step twice
    const { data: claimed } = await admin.from("enrollments").update({ next_at: new Date(Date.now() + 15 * MIN).toISOString() }).eq("id", e.id).eq("status", "active").eq("next_at", e.next_at).select("id");
    if (!claimed?.length) continue;
    try { results.push(await processOne(e, started)); }
    catch (err) {
      results.push({ id: e.id, error: (err as Error).message });
      await admin.from("enrollments").update({ next_at: new Date(Date.now() + 30 * MIN).toISOString(), log: [...(e.log ?? []), { at: new Date().toISOString(), error: (err as Error).message.slice(0, 200) }].slice(-30) }).eq("id", e.id);
    }
  }
  return { ok: true, scanned, processed: results.length, results: results.slice(0, 40) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const b: any = await req.json().catch(() => ({}));
  const secret = req.headers.get("x-push-secret");
  if (secret) {
    const { data: ok } = await admin.rpc("ghl_push_secret_ok", { p: secret });
    if (!ok) return json({ error: "unauthorized" }, 401);
    if (b.action === "tick") return json(await tick());
    if (b.action === "process" && b.enrollment_id) {
      clearCaches();
      const { data: e } = await admin.from("enrollments").select("*").eq("id", b.enrollment_id).eq("status", "active").maybeSingle();
      if (!e) return json({ error: "not running" });
      const { data: claimed } = await admin.from("enrollments").update({ next_at: new Date(Date.now() + 15 * MIN).toISOString() }).eq("id", e.id).eq("status", "active").eq("next_at", e.next_at).select("id");
      return json(claimed?.length ? await processOne(e, Date.now()) : { error: "busy" });
    }
    return json({ error: "unknown action" }, 400);
  }
  // from the app: staff enroll a customer by hand
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u } = await admin.auth.getUser(token);
  if (!u?.user) return json({ error: "sign in" }, 401);
  clearCaches();
  const { data: me } = await admin.from("profiles").select("tenant_id,is_active,role").eq("id", u.user.id).single();
  if (!me?.is_active) return json({ error: "no access" }, 403);
  if (b.action === "enroll") {
    if (!["owner", "admin", "manager", "sales", "f_and_i", "super_admin"].includes(me.role)) return json({ error: "Your role can't add customers to plays" }, 403);
    if (!["aged_lead", "lost_lead", "be_back", "dead_deal", "no_show", "new_lead"].includes(String(b.play))) return json({ error: "That play starts on its own" }, 400);
    const t = await tenant(me.tenant_id);
    const play = playFor(String(b.play), t?.automations);
    if (!play) return json({ error: "Unknown play" }, 400);
    if (!play.enabled) return json({ error: `Turn on "${play.name}" first` }, 400);
    const { data: c } = await admin.from("customers").select("id,sms_opt_out,owner_id").eq("id", String(b.customer_id)).eq("tenant_id", me.tenant_id).maybeSingle();
    if (!c) return json({ error: "Customer not found" }, 404);
    if (c.sms_opt_out) return json({ error: "This customer opted out of texts" }, 400);
    const { data: lead } = await admin.from("leads").select("id,vehicle_id").eq("tenant_id", me.tenant_id).eq("customer_id", c.id).order("created_at", { ascending: false }).limit(1);
    if (b.vehicle_id) { const { data: v } = await admin.from("vehicles").select("id").eq("id", String(b.vehicle_id)).eq("tenant_id", me.tenant_id).maybeSingle(); if (!v) return json({ error: "Vehicle not found" }, 404); }
    const { error } = await admin.from("enrollments").insert({ tenant_id: me.tenant_id, play: play.key, customer_id: c.id, lead_id: lead?.[0]?.id ?? null, vehicle_id: b.vehicle_id ?? lead?.[0]?.vehicle_id ?? null, owner_id: c.owner_id ?? u.user.id, next_at: new Date().toISOString(), context: { manual: true, by: u.user.id } });
    if (error) return json({ error: /duplicate|unique/i.test(error.message) ? "Already in this play" : error.message }, 400);
    await admin.from("audit_log").insert({ tenant_id: me.tenant_id, action: "automation_enroll", entity: "customer", entity_id: c.id, details: { play: play.key } });
    return json({ ok: true });
  }
  return json({ error: "unknown action" }, 400);
});
