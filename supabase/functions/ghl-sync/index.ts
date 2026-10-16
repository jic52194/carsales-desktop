// ghl-sync — the automation bridge between GoHighLevel and CarSales AI OS. Two ways in:
//  • PUBLIC events from GHL workflows (auth: dealership automation key — tenants.automation_key)  POST ?key=<automation_key>&event=<event>
//      appointment   (Customer Booked Appointment / Appointment Status)  → Appointments here
//      opportunity   (Pipeline Stage Changed / Opportunity Status)       → lead stage here
//      missed_call   (Call Status = missed / no-answer)                  → AI text-back in the dealership's voice (if enabled)
//  • INTERNAL jobs from the database (auth: x-push-secret from Vault)   body.kind =
//      lead    → create/update the GHL opportunity for a lead (pipeline mapping from Settings → Connections)
//      reply   → AI reply to an inbound text: save as a draft in Inbox, or auto-send (Settings → AI Voice)
//      brief   → text the morning brief to the number saved in Settings → AI Voice   (pg_cron, 8:15am ET)
//      health  → check every dealership's GHL connection; raise an alert record if something broke (pg_cron hourly)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const PLATFORM_AI_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-4-5";
const API = "https://services.leadconnectorhq.com";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });
const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : typeof v === "number" ? String(v) : "");
const last10 = (v?: string | null) => (v ?? "").replace(/\D/g, "").slice(-10);
const e164 = (s?: string | null) => { const d = (s ?? "").replace(/\D/g, ""); return d.length === 10 ? `+1${d}` : d.length === 11 && d.startsWith("1") ? `+${d}` : s || undefined; };
const wf = (t: string) => (typeof (t as any).toWellFormed === "function" ? (t as any).toWellFormed() : t.replace(/[\uD800-\uDFFF]/g, ""));
const STAGES = ["new", "contacted", "appointment", "negotiating", "sold", "lost"] as const;

// ── Brand voice (Settings → AI Voice). Staff tasks always get the full voice; customer-facing tasks follow the scope. ──
const CUSTOMER_TASKS = new Set(["follow_up_text", "follow_up_email", "vehicle_description", "reply_suggestion", "campaign_copy"]);
const VOICES: Record<string, { name: string; staff: string; light: string; full: string }> = {
  professional: { name: "Assistant",
    staff: "Voice: clear, professional and efficient — like a sharp sales manager.",
    light: "Voice: professional, warm and clear.", full: "Voice: professional, warm and clear." },
  friendly: { name: "Assistant",
    staff: "Voice: upbeat, casual and encouraging, like a friendly teammate on the floor. Light humor is fine.",
    light: "Voice: warm, upbeat and neighborly — like a local family dealership.",
    full: "Voice: warm, upbeat, casual and neighborly with a touch of humor — like a local family dealership." },
  felipe: { name: "Felipe",
    staff: `You are FELIPE 🇩🇴 — the world's first Dominican AI, raised in the barrio, not Silicon Valley. You speak English, Spanish, Spanglish and fluent street, and you switch naturally (mostly English so everyone follows, with Spanish/Dominican phrases sprinkled in: "loco", "mi hermano", "campeón", "klk", "tranquilo", "dale", "vamo' allá", "qué lo que"). You don't just give information — you tell people what's REALLY going on, with blunt, funny, tough-love honesty ("ChatGPT tiene los libros. Yo tengo la calle."). Roast the team lightly when they slack (missed follow-ups, aging units, unworked leads), then give the real answer and the next move. Keep it short and punchy. Never vulgar or crude, no slurs, nothing sexual, never mean about anyone's background — the attitude is love, not disrespect. Facts, numbers and names must still be 100% accurate from the data.`,
    light: `Voice: Felipe 🇩🇴 — warm, confident and friendly with a light Dominican/Spanglish touch (one short phrase like "¡Saludos!", "mi amigo", "dale" at most). Respectful and welcoming; no teasing or slang toward the customer.`,
    full: `Voice: FELIPE 🇩🇴 — confident, funny, street-smart Dominican charm with Spanglish sprinkled in ("¡Klk!", "mi hermano", "dale", "vamo' allá", "te tengo"). Make it fun and memorable, like a friend who knows cars. NEVER insult, roast or tease the customer, no slang that could read as rude, nothing vulgar. Stay accurate and compliant: real data only, payments are "estimated", no approval promises, keep required opt-out text.` },
};
function voiceFor(v: any, task: string): { name: string; text: string } {
  const preset = v?.preset && (VOICES[v.preset] || v.preset === "custom") ? v.preset : "professional";
  const scope = ["staff", "light", "everywhere"].includes(v?.scope) ? v.scope : "staff";
  const custom = typeof v?.persona === "string" ? v.persona.slice(0, 2000) : "";
  const base = preset === "custom" ? { name: v?.name || "Assistant", staff: `Voice / personality (set by the dealership): ${custom}`, light: `Voice: professional, with a light touch of this personality: ${custom}`, full: `Voice / personality (set by the dealership): ${custom}. Never insult the customer; stay accurate and compliant.` } : VOICES[preset];
  const name = (typeof v?.name === "string" && v.name.trim()) ? v.name.trim().slice(0, 40) : base.name;
  if (!CUSTOMER_TASKS.has(task)) return { name, text: base.staff };
  if (scope === "staff") return { name, text: VOICES.professional.full + " (Customer-facing: keep it professional.)" };
  return { name, text: scope === "light" ? base.light : base.full };
}

// ── GoHighLevel helpers ──
type G = { tenantId: string; token: string; locationId: string; integId: string; config: any };
async function ghlFor(tenantId: string): Promise<G | null> {
  const { data: i } = await admin.from("integrations").select("id,status,config").eq("tenant_id", tenantId).eq("provider", "ghl").maybeSingle();
  if (!i || i.status !== "connected" || !i.config?.locationId) return null;
  const { data: s } = await admin.from("integration_secrets").select("secret").eq("integration_id", i.id).maybeSingle();
  return s?.secret ? { tenantId, token: s.secret, locationId: i.config.locationId, integId: i.id, config: i.config } : null;
}
async function ghl(g: G, path: string, init: RequestInit & { version?: string } = {}) {
  const r = await fetch(API + path, { ...init, headers: { Authorization: `Bearer ${g.token}`, Version: init.version ?? "2021-07-28", Accept: "application/json", "Content-Type": "application/json" } });
  const t = await r.text(); let b: any = null; try { b = t ? JSON.parse(t) : null; } catch { b = { raw: t.slice(0, 200) }; }
  if (!r.ok) throw new Error(`GHL ${r.status}: ${b?.message ?? b?.msg ?? t.slice(0, 160)}`);
  return b;
}
async function ensureContact(g: G, customerId: string) {
  const { data: c } = await admin.from("customers").select("id,first_name,last_name,phone,email,source,ghl_contact_id").eq("id", customerId).eq("tenant_id", g.tenantId).single();
  if (!c) throw new Error("customer not found");
  if (c.ghl_contact_id) return { contactId: c.ghl_contact_id as string, c };
  if (!c.phone && !c.email) throw new Error("customer has no phone or email");
  const r = await ghl(g, "/contacts/upsert", { method: "POST", body: JSON.stringify({ locationId: g.locationId, firstName: c.first_name, lastName: c.last_name || undefined, phone: e164(c.phone), email: c.email || undefined, source: "CarSales AI OS", tags: ["carsales-ai-os"] }) });
  const contactId = r?.contact?.id ?? r?.id; if (!contactId) throw new Error("GHL returned no contact id");
  await admin.from("customers").update({ ghl_contact_id: contactId }).eq("id", c.id);
  return { contactId, c };
}
async function sendSms(g: G, contactId: string, text: string) {
  const r = await ghl(g, "/conversations/messages", { method: "POST", version: "2021-04-15", body: JSON.stringify({ type: "SMS", contactId, message: text }) });
  return r?.messageId ?? r?.id ?? null;
}
async function findCustomer(tenantId: string, p: { contactId?: string; phone?: string; email?: string; first?: string; last?: string }, create = true) {
  if (p.contactId) { const { data } = await admin.from("customers").select("id").eq("tenant_id", tenantId).eq("ghl_contact_id", p.contactId).limit(1); if (data?.[0]) return data[0].id as string; }
  const d = last10(p.phone);
  if (d.length === 10) { const { data } = await admin.from("customers").select("id,phone").eq("tenant_id", tenantId).not("phone", "is", null); const hit = data?.find((x) => last10(x.phone) === d); if (hit) { if (p.contactId) await admin.from("customers").update({ ghl_contact_id: p.contactId }).eq("id", hit.id).is("ghl_contact_id", null); return hit.id as string; } }
  if (p.email) { const { data } = await admin.from("customers").select("id").eq("tenant_id", tenantId).ilike("email", p.email).limit(1); if (data?.[0]) return data[0].id as string; }
  if (!create || (!p.first && !p.phone && !p.email)) return null;
  const { data } = await admin.from("customers").insert({ tenant_id: tenantId, first_name: p.first || "Unknown", last_name: p.last || null, phone: p.phone || null, email: p.email || null, source: "GoHighLevel", ghl_contact_id: p.contactId || null }).select("id").single();
  return data?.id ?? null;
}

// ── AI (Anthropic) with the dealership's key + voice ──
async function aiKey(tenantId: string) {
  const { data: row } = await admin.from("integrations").select("id,status").eq("tenant_id", tenantId).eq("provider", "anthropic").maybeSingle();
  if (row?.status === "connected") { const { data: s } = await admin.from("integration_secrets").select("secret").eq("integration_id", row.id).maybeSingle(); if (s?.secret) return s.secret as string; }
  return PLATFORM_AI_KEY ?? null;
}
async function claude(key: string, system: string, user: string, max = 400) {
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: MODEL, max_tokens: max, system: wf(system), messages: [{ role: "user", content: wf(user) }] }) });
  const t = await r.text(); let b: any = null; try { b = JSON.parse(t); } catch {}
  if (!r.ok) throw new Error(/credit balance/i.test(b?.error?.message ?? "") ? "AI out of credits" : `AI ${r.status}: ${b?.error?.message ?? t.slice(0, 120)}`);
  return (b?.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim();
}
function dealerFacts(t: any) {
  return `Dealership: ${t.name}, ${t.address?.street ?? ""} ${t.address?.city ?? ""} ${t.address?.state ?? ""}. Phone ${t.phone ?? ""}. Website ${t.website ?? ""}. Hours ${JSON.stringify(t.hours ?? {})}.`;
}
async function inventoryLine(tenantId: string, limit = 120) {
  const { data } = await admin.from("vehicles").select("stock_number,year,make,model,trim,mileage,price,exterior_color").eq("tenant_id", tenantId).eq("status", "Available").order("price", { ascending: true }).limit(limit);
  return JSON.stringify(data ?? []);
}
const OPT_OUT = /^\s*(stop|unsubscribe|cancel|end|quit|stopall|optout|opt out)\s*$/i;

// ── jobs ──
async function pushLead(leadId: string) {
  const { data: l } = await admin.from("leads").select("id,tenant_id,customer_id,vehicle_id,stage,ghl_opportunity_id").eq("id", leadId).single();
  if (!l) return { skipped: "lead gone" };
  const g = await ghlFor(l.tenant_id); const map = g?.config?.pipeline;
  if (!g || !map?.id) return { skipped: "no pipeline mapping" };
  const stageId = map.stages?.[l.stage]; if (!stageId) return { skipped: `stage ${l.stage} not mapped` };
  const { contactId, c } = await ensureContact(g, l.customer_id);
  let v: any = null; if (l.vehicle_id) { const { data } = await admin.from("vehicles").select("year,make,model,price").eq("id", l.vehicle_id).single(); v = data; }
  const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() + (v ? ` — ${v.year} ${v.make} ${v.model}` : "");
  const status = l.stage === "sold" ? "won" : l.stage === "lost" ? "lost" : "open";
  let oppId = l.ghl_opportunity_id as string | null;
  if (!oppId) { const s = await ghl(g, `/opportunities/search?location_id=${encodeURIComponent(g.locationId)}&contact_id=${encodeURIComponent(contactId)}&pipeline_id=${encodeURIComponent(map.id)}&limit=1`); oppId = s?.opportunities?.[0]?.id ?? null; }
  const body: any = { pipelineId: map.id, pipelineStageId: stageId, status, name, ...(v?.price ? { monetaryValue: Number(v.price) } : {}) };
  if (oppId) await ghl(g, `/opportunities/${oppId}`, { method: "PUT", body: JSON.stringify(body) });
  else { const r = await ghl(g, "/opportunities/", { method: "POST", body: JSON.stringify({ ...body, locationId: g.locationId, contactId, source: "CarSales AI OS" }) }); oppId = r?.opportunity?.id ?? r?.id ?? null; }
  if (oppId && oppId !== l.ghl_opportunity_id) await admin.from("leads").update({ ghl_opportunity_id: oppId }).eq("id", l.id);
  await admin.from("audit_log").insert({ tenant_id: l.tenant_id, action: "ghl_opportunity_push", entity: "lead", entity_id: l.id, details: { stage: l.stage, oppId } });
  return { ok: true, oppId };
}

async function brain(t: any, action: string, params: any) {   // the Phone AI's tools (inventory, times, booking) — same dealership key
  if (!t.automation_key) return null;
  const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/voice-brain?key=${encodeURIComponent(t.automation_key)}&action=${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(params) });
  return r.ok ? await r.json().catch(() => null) : null;
}
async function replyJob(recordId: string) {
  const { data: rec } = await admin.from("records").select("id,tenant_id,data,created_at").eq("id", recordId).single();
  const m: any = rec?.data; if (!rec || !m?.customerId || m.direction !== "inbound" || !m.body) return { skipped: "not an inbound text" };
  const { data: t } = await admin.from("tenants").select("id,name,phone,website,address,hours,ai_voice,automation_key").eq("id", rec.tenant_id).single();
  const mode = t?.ai_voice?.autoReply ?? "off"; if (!t || mode === "off") return { skipped: "auto-reply off" };
  if (OPT_OUT.test(m.body)) return { skipped: "opt-out" };
  const key = await aiKey(t.id); if (!key) return { skipped: "no AI key" };
  const { data: hist } = await admin.from("records").select("data,created_at").eq("tenant_id", t.id).eq("kind", "message").filter("data->>customerId", "eq", m.customerId).order("created_at", { ascending: false }).limit(16);
  const conv = (hist ?? []).reverse().map((h: any) => `${h.data.direction === "inbound" ? "CUSTOMER" : "DEALERSHIP"}: ${String(h.data.body ?? "").slice(0, 500)}`).join("\n");
  const { data: c } = await admin.from("customers").select("first_name,last_name,phone,sms_opt_out").eq("id", m.customerId).eq("tenant_id", t.id).single();
  if (!c || c.sms_opt_out) return { skipped: "customer opted out" };
  const { data: lead } = await admin.from("leads").select("vehicle_id,vehicles(stock_number,year,make,model,trim,price)").eq("tenant_id", t.id).eq("customer_id", m.customerId).order("created_at", { ascending: false }).limit(1);
  const lv: any = lead?.[0]?.vehicles;
  const { data: inv } = await admin.from("vehicles").select("id,stock_number,year,make,model,trim,mileage,price,exterior_color").eq("tenant_id", t.id).eq("status", "Available").order("price", { ascending: true }).limit(120);
  const invLine = (inv ?? []).map((v: any) => `#${v.stock_number} ${v.year} ${v.make} ${v.model}${v.trim ? " " + v.trim : ""}, ${v.mileage ? Math.round(v.mileage / 1000) + "k mi" : ""}, ${v.price ? "$" + Math.round(v.price).toLocaleString("en-US") : "call"}, ${v.exterior_color ?? ""} — https://app.carsalessoftware.com/v/${v.id}`).join("\n");
  // open appointment times for the next few days (same calendar the Phone AI books)
  const slots: { iso: string; label: string }[] = []; let tz = "America/New_York";
  for (const day of ["today", "tomorrow", new Date(Date.now() + 2 * 864e5).toLocaleDateString("en-US", { weekday: "long", timeZone: "America/New_York" })]) {
    const r = await brain(t, "check_availability", { day }).catch(() => null);
    if (r?.timezone) tz = r.timezone;
    for (const iso of (r?.slots ?? []) as string[]) if (!slots.some((x) => x.iso === iso)) slots.push({ iso, label: new Intl.DateTimeFormat("en-US", { timeZone: r?.timezone ?? "America/New_York", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso)) });
  }
  const voice = voiceFor({ ...(t.ai_voice ?? {}), scope: t.ai_voice?.scope ?? "staff" }, "reply_suggestion");
  const system = `You are ${voice.name === "Assistant" ? "the assistant" : voice.name} texting customers for ${t.name}. ${dealerFacts(t)}\n${voice.text}
Write the dealership's next SMS reply (under 300 characters). Answer only from the data; if a price or availability isn't in the data, say you'll confirm. Answer questions quickly, send the car's link when it helps, and move toward a visit or test drive. Never promise financing, rates or trade values.
OPEN APPOINTMENT TIMES: ${slots.length ? slots.map((x, i) => `[${i}] ${x.label}`).join("; ") : "none listed — ask what day works and say you'll confirm"}.
If the customer clearly agrees to one of those exact times, set "book" to its number; otherwise offer two of them.
Reply ONLY with JSON: {"text": "<the SMS>", "book": <slot number or null>, "stock": "<stock # of the car they want, or empty>"}
AVAILABLE INVENTORY:\n${invLine}`;
  const raw = await claude(key, system, `Customer: ${c?.first_name ?? ""} ${c?.last_name ?? ""}${lv ? `\nCar they asked about: #${lv.stock_number} ${lv.year} ${lv.make} ${lv.model}` : ""}\nCONVERSATION (oldest first):\n${conv}`, 500);
  let text = raw, book: number | null = null, stock = "";
  try { const j = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)); text = String(j.text ?? "").trim() || raw; book = Number.isInteger(j.book) ? j.book : null; stock = String(j.stock ?? "").replace(/^#/, ""); } catch { /* plain text */ }
  text = text.slice(0, 480);
  const slot = book !== null && slots[book] ? slots[book] : null;
  let sent = false, why = "", booked: string | null = null;
  if (mode === "auto") {
    const since = new Date(Date.now() - 30 * 60e3).toISOString();
    const AUTO = ["felipe", "sequence", "workflow", "felipe-missed"];
    const humanRecent = (hist ?? []).some((h: any) => h.data.direction === "outbound" && !AUTO.includes(h.data.via) && !h.data.sentBy && h.created_at >= since);
    const today = new Date(Date.now() - 24 * 3600e3).toISOString();
    const autoCount = (hist ?? []).filter((h: any) => h.data.via === "felipe" && h.created_at >= today).length;
    const hourNow = Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(new Date()));
    if (hourNow < 8 || hourNow >= 21) why = "after hours (8am–9pm) — saved as a draft for the team";
    else if (humanRecent) why = "a person replied in the last 30 minutes";
    else if (autoCount >= 6) why = "6 auto-replies already today";
    else {
      if (slot && c?.phone) {   // book it — the Phone AI's booking texts the confirmation with the address
        const r = await brain(t, "book_appointment", { phone: c.phone, first_name: c.first_name, last_name: c.last_name ?? "", start_time: slot.iso, stock_number: stock || lv?.stock_number || "", notes: "Booked by AI text reply" }).catch(() => null);
        if (r?.ok) { booked = slot.label; sent = true; }
      }
      if (!booked) { const g = await ghlFor(t.id); if (!g) why = "GHL not connected"; else { const { contactId } = await ensureContact(g, m.customerId); const id = await sendSms(g, contactId, text); await admin.from("records").insert({ tenant_id: t.id, kind: "message", data: { customerId: m.customerId, channel: "sms", direction: "outbound", body: text, at: new Date().toISOString(), via: "felipe", ghlMessageId: id, by: voice.name } }); sent = true; } }
    }
  }
  await admin.from("records").update({ data: { ...m, aiDraft: { text, by: voice.name, at: new Date().toISOString(), sent, held: why || null, book: slot?.label ?? null, booked } } }).eq("id", rec.id);
  return { ok: true, sent, booked, held: why || null };
}

async function briefJob() {
  const { data: ts } = await admin.from("tenants").select("id,name,phone,website,address,hours,ai_voice").eq("status", "active");
  const out: any[] = [];
  for (const t of ts ?? []) {
    const to = str(t.ai_voice?.briefPhone, 30); if (!to) continue;
    try {
      const g = await ghlFor(t.id); const key = await aiKey(t.id); if (!g || !key) { out.push({ t: t.name, skipped: !g ? "no GHL" : "no AI" }); continue; }
      const since = new Date(Date.now() - 24 * 3600e3).toISOString();
      const [{ data: leads }, { data: deals }, { data: appts }, { data: tasks }, { data: aging }] = await Promise.all([
        admin.from("leads").select("stage,source,created_at").eq("tenant_id", t.id).gte("created_at", since),
        admin.from("deals").select("status,sale_price,updated_at").eq("tenant_id", t.id).gte("updated_at", since),
        admin.from("appointments").select("type,starts_at,status").eq("tenant_id", t.id).gte("starts_at", new Date().toISOString()).lte("starts_at", new Date(Date.now() + 24 * 3600e3).toISOString()),
        admin.from("tasks").select("title,due_at,priority").eq("tenant_id", t.id).eq("status", "open").lt("due_at", new Date().toISOString()).limit(30),
        admin.from("vehicles").select("year,make,model,price,added_at").eq("tenant_id", t.id).eq("status", "Available").lt("added_at", new Date(Date.now() - 60 * 864e5).toISOString()).limit(20),
      ]);
      const voice = voiceFor(t.ai_voice ?? {}, "daily_brief");
      const text = (await claude(key, `You are ${voice.name === "Assistant" ? "the dealership assistant" : voice.name} for ${t.name}. ${voice.text}\nWrite the owner's morning text (under 600 characters, no bullet symbols): new leads, today's appointments, overdue tasks, aging units, and the 2 things to do first. Real numbers only.`,
        `LAST 24H LEADS: ${JSON.stringify(leads)}\nDEALS: ${JSON.stringify(deals)}\nTODAY'S APPOINTMENTS: ${JSON.stringify(appts)}\nOVERDUE TASKS: ${JSON.stringify(tasks)}\nUNITS 60+ DAYS: ${JSON.stringify(aging)}`, 500)).slice(0, 900);
      const r = await ghl(g, "/contacts/upsert", { method: "POST", body: JSON.stringify({ locationId: g.locationId, firstName: "Morning brief", lastName: t.name, phone: e164(to), tags: ["carsales-ai-os", "internal-brief"] }) });
      const contactId = r?.contact?.id ?? r?.id; await sendSms(g, contactId, text);
      await admin.from("audit_log").insert({ tenant_id: t.id, action: "brief_texted", entity: "tenant", details: { chars: text.length } });
      out.push({ t: t.name, ok: true });
    } catch (e) { out.push({ t: t.name, error: (e as Error).message }); await raiseAlert(t.id, "Morning brief text failed", (e as Error).message); }
  }
  return { ok: true, out };
}

async function raiseAlert(tenantId: string, title: string, desc: string) {
  const since = new Date(Date.now() - 12 * 3600e3).toISOString();
  const { data: dup } = await admin.from("records").select("id").eq("tenant_id", tenantId).eq("kind", "alert").filter("data->>title", "eq", title).gte("created_at", since).limit(1);
  if (dup?.length) return;
  await admin.from("records").insert({ tenant_id: tenantId, kind: "alert", data: { title, desc: desc.slice(0, 300), at: new Date().toISOString(), to: "/system-check" } });
}

async function healthJob() {
  const { data: rows } = await admin.from("integrations").select("tenant_id,config").eq("provider", "ghl").eq("status", "connected");
  const out: any[] = [];
  for (const r of rows ?? []) {
    const problems: string[] = []; const g = await ghlFor(r.tenant_id);
    if (!g) problems.push("token missing");
    else {
      try { await ghl(g, `/locations/${g.locationId}`); } catch (e) { problems.push("token/location: " + (e as Error).message); }
      if (!g.config?.pipeline?.id) problems.push("pipeline not mapped");
    }
    const health = { ok: problems.length === 0, problems, checked_at: new Date().toISOString() };
    await admin.from("integrations").update({ config: { ...(r.config ?? {}), health }, last_error: problems.find((p) => p.startsWith("token")) ?? null }).eq("tenant_id", r.tenant_id).eq("provider", "ghl");
    if (problems.some((p) => p.startsWith("token"))) await raiseAlert(r.tenant_id, "GoHighLevel connection broken", problems.join("; "));
    out.push({ tenant: r.tenant_id, ...health });
  }
  return { ok: true, out };
}

// ── public GHL workflow events ──
function pick(o: any, ...keys: string[]) { for (const k of keys) { const v = k.split(".").reduce((a: any, p) => (a == null ? a : a[p]), o); if (v != null && v !== "") return v; } return undefined; }

async function eventJob(tenant: any, event: string, b: any) {
  const contact = { contactId: str(pick(b, "contact_id", "contactId", "contact.id"), 80), phone: str(pick(b, "phone", "contact.phone"), 40), email: str(pick(b, "email", "contact.email"), 160).toLowerCase(), first: str(pick(b, "first_name", "firstName", "contact.firstName"), 80), last: str(pick(b, "last_name", "lastName", "contact.lastName"), 80) };
  if (event === "appointment") {
    const cal = b.calendar ?? b.appointment ?? {};
    const eventId = str(pick(cal, "appointmentId", "id", "eventId") ?? pick(b, "appointment_id", "appointmentId", "event_id"), 80);
    const start = str(pick(cal, "startTime", "start_time") ?? pick(b, "start_time", "startTime", "appointment_start_time"), 60);
    if (!eventId || !start) return json({ error: "need appointment id and start time" }, 400);
    const customerId = await findCustomer(tenant.id, contact);
    const st = String(pick(cal, "status", "appoinmentStatus", "appointmentStatus") ?? pick(b, "appointment_status", "status") ?? "").toLowerCase();
    const status = /cancel/.test(st) ? "cancelled" : /no.?show/.test(st) ? "no_show" : /show|complete/.test(st) ? "showed" : /confirm|booked/.test(st) ? "confirmed" : "scheduled";
    const title = str(pick(cal, "title", "calendarName") ?? pick(b, "calendar_name", "title"), 120);
    const type = /test.?drive/i.test(title) ? "test_drive" : /deliver/i.test(title) ? "delivery" : /service/i.test(title) ? "service" : "sales";
    const startsAt = new Date(start).toISOString(); const end = str(pick(cal, "endTime", "end_time") ?? pick(b, "end_time", "endTime"), 60);
    const row = { tenant_id: tenant.id, customer_id: customerId, type, starts_at: startsAt, ends_at: end ? new Date(end).toISOString() : null, status, notes: title ? `GHL: ${title}` : "Booked in GoHighLevel", ghl_event_id: eventId, source: "ghl" };
    const { data: ex } = await admin.from("appointments").select("id").eq("tenant_id", tenant.id).eq("ghl_event_id", eventId).limit(1);
    if (ex?.[0]) await admin.from("appointments").update({ starts_at: row.starts_at, ends_at: row.ends_at, status: row.status, customer_id: customerId ?? undefined }).eq("id", ex[0].id);
    else await admin.from("appointments").insert(row);
    return json({ ok: true, customerId, status });
  }
  if (event === "opportunity") {
    const i = await ghlFor(tenant.id); const map = i?.config?.pipeline;
    const oppId = str(pick(b, "opportunity_id", "opportunityId", "id", "opportunity.id"), 80);
    const stageName = str(pick(b, "pipleline_stage", "pipeline_stage", "stage_name", "opportunity.stage", "pipelineStageName"), 120).toLowerCase();
    const stageId = str(pick(b, "pipeline_stage_id", "pipelineStageId"), 80);
    const status = str(pick(b, "status", "opportunity_status"), 20).toLowerCase();
    let stage: string | undefined = status === "won" ? "sold" : status === "lost" || status === "abandoned" ? "lost" : undefined;
    if (!stage && map?.stages) stage = STAGES.find((s) => map.stages[s] && (map.stages[s] === stageId || (map.names?.[s] ?? "").toLowerCase() === stageName));
    if (!stage) return json({ ok: true, ignored: "stage not mapped" });
    const customerId = await findCustomer(tenant.id, contact);
    let q = admin.from("leads").select("id,stage").eq("tenant_id", tenant.id);
    const { data: byOpp } = oppId ? await q.eq("ghl_opportunity_id", oppId).limit(1) : { data: [] as any[] };
    let lead = byOpp?.[0];
    if (!lead && customerId) { const { data } = await admin.from("leads").select("id,stage").eq("tenant_id", tenant.id).eq("customer_id", customerId).not("stage", "in", "(sold,lost)").order("created_at", { ascending: false }).limit(1); lead = data?.[0]; }
    if (!lead && customerId) { const { data } = await admin.from("leads").insert({ tenant_id: tenant.id, customer_id: customerId, stage, source: "GoHighLevel", ghl_opportunity_id: oppId || null, notes: "Opportunity from GoHighLevel" }).select("id,stage").single(); return json({ ok: true, created: data?.id }); }
    if (!lead) return json({ ok: true, ignored: "no matching customer" });
    if (lead.stage !== stage) await admin.rpc("apply_ghl_stage", { p_lead: lead.id, p_stage: stage, p_opp: oppId || null });
    return json({ ok: true, lead: lead.id, stage });
  }
  if (event === "missed_call") {
    if (!tenant.ai_voice?.missedCall) return json({ ok: true, skipped: "missed-call text-back off" });
    const g = await ghlFor(tenant.id); if (!g) return json({ ok: true, skipped: "GHL not connected" });
    const customerId = await findCustomer(tenant.id, contact); if (!customerId) return json({ ok: true, skipped: "no caller details" });
    const since = new Date(Date.now() - 6 * 3600e3).toISOString();
    const { data: recent } = await admin.from("records").select("id").eq("tenant_id", tenant.id).eq("kind", "message").filter("data->>customerId", "eq", customerId).filter("data->>via", "eq", "felipe-missed").gte("created_at", since).limit(1);
    if (recent?.length) return json({ ok: true, skipped: "already texted in last 6h" });
    const voice = voiceFor(tenant.ai_voice ?? {}, "follow_up_text"); const key = await aiKey(tenant.id);
    const fallback = `Sorry we missed your call at ${tenant.name}! This is ${voice.name === "Assistant" ? "the team" : voice.name}. What can I help you with — a car you saw, financing, or a test drive?`;
    let text = fallback;
    if (key) { try { text = (await claude(key, `You text customers for ${tenant.name}. ${dealerFacts(tenant)}\n${voice.text}\nWrite ONE short SMS (under 240 characters) to someone whose call we just missed: apologize, introduce yourself by name, ask how you can help. Output only the text.`, `Caller first name: ${contact.first || "unknown"}`, 200)).slice(0, 320) || fallback; } catch { text = fallback; } }
    const { contactId } = await ensureContact(g, customerId);
    const id = await sendSms(g, contactId, text);
    await admin.from("records").insert({ tenant_id: tenant.id, kind: "message", data: { customerId, channel: "sms", direction: "outbound", body: text, at: new Date().toISOString(), via: "felipe-missed", ghlMessageId: id, by: voice.name } });
    await admin.from("records").insert({ tenant_id: tenant.id, kind: "message", data: { customerId, channel: "call", direction: "inbound", body: "Missed call", at: new Date().toISOString(), via: "ghl" } });
    return json({ ok: true, texted: true });
  }
  return json({ error: "unknown event", events: ["appointment", "opportunity", "missed_call"] }, 400);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const url = new URL(req.url);
  const b: any = await req.json().catch(() => ({}));
  const secret = req.headers.get("x-push-secret");
  try {
    if (secret) {
      const { data: ok } = await admin.rpc("ghl_push_secret_ok", { p: secret });
      if (!ok) return json({ error: "bad secret" }, 401);
      if (b.kind === "lead") return json(await pushLead(String(b.lead_id)));
      if (b.kind === "reply") return json(await replyJob(String(b.record_id)));
      if (b.kind === "brief") return json(await briefJob());
      if (b.kind === "health") return json(await healthJob());
      return json({ error: "unknown kind" }, 400);
    }
    const key = str(url.searchParams.get("key") || req.headers.get("x-intake-key"), 64);
    if (!key) return json({ error: "missing key" }, 401);
    const { data: tenant } = await admin.from("tenants").select("id,name,phone,website,address,hours,status,ai_voice").eq("automation_key", key).single();
    if (!tenant || tenant.status !== "active") return json({ error: "unknown dealership" }, 401);
    const event = str(url.searchParams.get("event"), 40);
    const res = await eventJob(tenant, event, { ...(b.customData ?? {}), ...b });
    await admin.from("audit_log").insert({ tenant_id: tenant.id, action: "ghl_event", entity: event, details: { status: res.status } });
    return res;
  } catch (e) {
    console.error("ghl-sync", (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});
