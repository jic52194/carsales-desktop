// ghl — the dealership's GoHighLevel sub-account, used from inside CarSales AI OS.
// Auth: signed-in staff JWT. The Private Integration token stays server-side (integration_secrets).
// Actions: status · upsert_contact · send (SMS/email) · thread · calendars · free_slots · book · sync_customers
//          pipelines · save_pipeline (admin) · location_profile
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const API = "https://services.leadconnectorhq.com";
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type, apikey, x-client-info", "content-type": "application/json" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });
const SALES = ["super_admin", "owner", "admin", "manager", "sales", "f_and_i", "web", "service"];

type Ctx = { tenantId: string; userId: string; role: string; token: string; locationId: string; fullName: string };

async function ghl(ctx: Ctx, path: string, init: RequestInit & { version?: string } = {}) {
  const r = await fetch(API + path, { ...init, headers: { Authorization: `Bearer ${ctx.token}`, Version: init.version ?? "2021-07-28", Accept: "application/json", "Content-Type": "application/json", ...(init.headers ?? {}) } });
  const text = await r.text(); let body: any = null; try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 300) }; }
  if (!r.ok) throw new Error(`GHL ${r.status}: ${body?.message ?? body?.msg ?? body?.error ?? text.slice(0, 200)}`);
  return body;
}
const digits = (s?: string | null) => (s ?? "").replace(/\D/g, "");
const e164 = (s?: string | null) => { const d = digits(s); return d.length === 10 ? `+1${d}` : d.length === 11 && d.startsWith("1") ? `+${d}` : s || undefined; };

async function ensureContact(ctx: Ctx, customerId: string) {
  const { data: c } = await admin.from("customers").select("id,first_name,last_name,phone,email,source,street,city,state,zip,ghl_contact_id").eq("id", customerId).eq("tenant_id", ctx.tenantId).single();
  if (!c) throw new Error("Customer not found");
  if (c.ghl_contact_id) return { contactId: c.ghl_contact_id as string, customer: c };
  if (!c.phone && !c.email) throw new Error("This customer has no phone or email to match in GoHighLevel");
  const res = await ghl(ctx, "/contacts/upsert", { method: "POST", body: JSON.stringify({ locationId: ctx.locationId, firstName: c.first_name, lastName: c.last_name || undefined, phone: e164(c.phone), email: c.email || undefined, address1: c.street || undefined, city: c.city || undefined, state: c.state || undefined, postalCode: c.zip || undefined, source: c.source ? `CarSales AI OS · ${c.source}` : "CarSales AI OS", tags: ["carsales-ai-os"] }) });
  const contactId = res?.contact?.id ?? res?.id;
  if (!contactId) throw new Error("GHL did not return a contact id");
  await admin.from("customers").update({ ghl_contact_id: contactId }).eq("id", c.id);
  return { contactId, customer: c };
}

async function logMessage(ctx: Ctx, customerId: string, m: { channel: string; direction: "inbound" | "outbound"; body: string; subject?: string; ghlMessageId?: string; at?: string; by?: string | null }) {
  await admin.from("records").insert({ tenant_id: ctx.tenantId, kind: "message", created_by: m.by ?? null, data: { customerId, channel: m.channel, direction: m.direction, body: m.body, subject: m.subject, ghlMessageId: m.ghlMessageId, at: m.at ?? new Date().toISOString(), by: m.by ?? null, via: "ghl" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "unauthorized" }, 401);
  const { data: { user } } = await createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } } }).auth.getUser();
  if (!user) return json({ error: "unauthorized" }, 401);
  const { data: p } = await admin.from("profiles").select("tenant_id, role, is_active, full_name").eq("id", user.id).single();
  if (!p?.is_active || !SALES.includes(p.role)) return json({ error: "not allowed for your role" }, 403);

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "status");

  const { data: integ } = await admin.from("integrations").select("id,status,config").eq("tenant_id", p.tenant_id).eq("provider", "ghl").maybeSingle();
  const connected = integ?.status === "connected" && integ?.config?.locationId;
  if (action === "status") return json({ connected: !!connected, locationId: connected ? integ!.config.locationId : null, pipeline: connected ? integ!.config.pipeline ?? null : null, health: integ?.config?.health ?? null });
  if (!connected) return json({ error: "GoHighLevel isn't connected yet — an admin can connect it in Settings → Connections.", code: "not_connected" }, 412);
  const { data: sec } = await admin.from("integration_secrets").select("secret").eq("integration_id", integ!.id).single();
  if (!sec?.secret) return json({ error: "GoHighLevel token missing — reconnect in Settings → Connections.", code: "not_connected" }, 412);
  const ctx: Ctx = { tenantId: p.tenant_id, userId: user.id, role: p.role, token: sec.secret, locationId: integ!.config.locationId, fullName: p.full_name ?? "" };

  try {
    switch (action) {
      case "upsert_contact": {
        const { contactId } = await ensureContact(ctx, String(body.customerId));
        return json({ ok: true, contactId });
      }
      case "send": {
        const channel = body.channel === "email" ? "email" : "sms";
        const text = String(body.body ?? "").trim();
        if (!text) return json({ error: "Message is empty" }, 400);
        const { contactId, customer } = await ensureContact(ctx, String(body.customerId));
        if (channel === "sms" && !customer.phone) return json({ error: "No phone number on this customer" }, 400);
        if (channel === "email" && !customer.email) return json({ error: "No email on this customer" }, 400);
        const payload: any = channel === "sms" ? { type: "SMS", contactId, message: text } : { type: "Email", contactId, subject: String(body.subject || "From " + ctx.fullName).slice(0, 200), html: text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>"), message: text };
        const res = await ghl(ctx, "/conversations/messages", { method: "POST", version: "2021-04-15", body: JSON.stringify(payload) });
        await logMessage(ctx, customer.id, { channel, direction: "outbound", body: text, subject: payload.subject, ghlMessageId: res?.messageId ?? res?.id, by: ctx.userId });
        await admin.from("audit_log").insert({ tenant_id: ctx.tenantId, user_id: ctx.userId, action: "ghl_send", entity: "customer", entity_id: customer.id, details: { channel } });
        return json({ ok: true, messageId: res?.messageId ?? res?.id ?? null });
      }
      case "thread": {
        const { contactId } = await ensureContact(ctx, String(body.customerId));
        const conv = await ghl(ctx, `/conversations/search?locationId=${encodeURIComponent(ctx.locationId)}&contactId=${encodeURIComponent(contactId)}`, { version: "2021-04-15" });
        const conversations = conv?.conversations ?? [];
        const out: any[] = [];
        for (const c of conversations.slice(0, 3)) {
          const m = await ghl(ctx, `/conversations/${c.id}/messages?limit=50`, { version: "2021-04-15" });
          const list = m?.messages?.messages ?? m?.messages ?? [];
          for (const x of list) out.push({ id: x.id, channel: String(x.messageType ?? x.type ?? "").toLowerCase().includes("email") ? "email" : String(x.messageType ?? "").toLowerCase().includes("call") ? "call" : "sms", direction: x.direction === "inbound" ? "inbound" : "outbound", body: x.body ?? x.message ?? "", at: x.dateAdded ?? x.dateUpdated, status: x.status ?? null });
        }
        out.sort((a, b) => String(a.at).localeCompare(String(b.at)));
        return json({ ok: true, contactId, messages: out });
      }
      case "calendars": {
        const r = await ghl(ctx, `/calendars/?locationId=${encodeURIComponent(ctx.locationId)}`);
        return json({ ok: true, calendars: (r?.calendars ?? []).map((c: any) => ({ id: c.id, name: c.name, isActive: c.isActive !== false })) });
      }
      case "free_slots": {
        const start = Number(body.startMs) || Date.now(); const end = Number(body.endMs) || start + 7 * 864e5;
        const tz = String(body.timezone || "America/New_York");
        const r = await ghl(ctx, `/calendars/${encodeURIComponent(String(body.calendarId))}/free-slots?startDate=${start}&endDate=${end}&timezone=${encodeURIComponent(tz)}`);
        const slots: string[] = [];
        for (const [k, v] of Object.entries(r ?? {})) if (k !== "traceId" && (v as any)?.slots) slots.push(...(v as any).slots);
        return json({ ok: true, slots });
      }
      case "book": {
        const { contactId, customer } = await ensureContact(ctx, String(body.customerId));
        const startTime = String(body.startTime); const endTime = String(body.endTime || new Date(Date.parse(startTime) + 60 * 60e3).toISOString());
        const r = await ghl(ctx, "/calendars/events/appointments", { method: "POST", body: JSON.stringify({ calendarId: body.calendarId, locationId: ctx.locationId, contactId, startTime, endTime, title: String(body.title || `${customer.first_name} ${customer.last_name ?? ""} — ${body.type ?? "appointment"}`).trim(), appointmentStatus: "confirmed", ignoreDateRange: false, toNotify: true }) });
        const eventId = r?.id ?? r?.event?.id ?? null;
        if (body.appointmentId && eventId) await admin.from("appointments").update({ ghl_event_id: eventId }).eq("id", body.appointmentId).eq("tenant_id", ctx.tenantId);
        return json({ ok: true, eventId });
      }
      case "sync_customers": {
        if (!["super_admin", "owner", "admin", "manager"].includes(ctx.role)) return json({ error: "managers only" }, 403);
        const { data: list } = await admin.from("customers").select("id").eq("tenant_id", ctx.tenantId).is("ghl_contact_id", null).limit(Number(body.limit) || 50);
        let ok = 0, skipped = 0; const errors: string[] = [];
        for (const c of list ?? []) { try { await ensureContact(ctx, c.id); ok++; } catch (e) { skipped++; if (errors.length < 5) errors.push((e as Error).message); } }
        const { count } = await admin.from("customers").select("*", { count: "exact", head: true }).eq("tenant_id", ctx.tenantId).is("ghl_contact_id", null);
        return json({ ok: true, synced: ok, skipped, remaining: count ?? 0, errors });
      }
      case "pipelines": {
        const r = await ghl(ctx, `/opportunities/pipelines?locationId=${encodeURIComponent(ctx.locationId)}`);
        return json({ ok: true, pipelines: (r?.pipelines ?? []).map((p: any) => ({ id: p.id, name: p.name, stages: (p.stages ?? []).map((s: any) => ({ id: s.id, name: s.name })) })), current: integ!.config.pipeline ?? null });
      }
      case "save_pipeline": {
        if (!["super_admin", "owner", "admin"].includes(ctx.role)) return json({ error: "admins only" }, 403);
        const cfg = { ...(integ!.config ?? {}) };
        if (!body.pipeline) { delete cfg.pipeline; }
        else {
          const pl = body.pipeline; const stages: Record<string, string> = {}; const names: Record<string, string> = {};
          for (const k of ["new", "contacted", "appointment", "negotiating", "sold", "lost"]) { const v = pl.stages?.[k]; if (v?.id) { stages[k] = String(v.id); names[k] = String(v.name ?? ""); } }
          const ids = Object.values(stages); if (new Set(ids).size !== ids.length) return json({ error: "Each GoHighLevel stage can only be used once" }, 400);
          cfg.pipeline = { id: String(pl.id), name: String(pl.name ?? ""), stages, names, saved_at: new Date().toISOString() };
        }
        await admin.from("integrations").update({ config: cfg }).eq("id", integ!.id);
        await admin.from("audit_log").insert({ tenant_id: ctx.tenantId, user_id: ctx.userId, action: "ghl_pipeline_map", entity: "integration", details: { pipeline: cfg.pipeline?.name ?? null } });
        return json({ ok: true, pipeline: cfg.pipeline ?? null });
      }
      case "location_profile": {
        const r = await ghl(ctx, `/locations/${encodeURIComponent(ctx.locationId)}`);
        const l = r?.location ?? {}; const bz = l.business ?? {};
        return json({ ok: true, profile: { name: bz.name || l.name || "", phone: l.phone || "", email: l.email || bz.email || "", website: bz.website || l.website || "", street: bz.address || l.address || "", city: bz.city || l.city || "", state: bz.state || l.state || "", zip: bz.postalCode || l.postalCode || "", logoUrl: l.logoUrl || bz.logoUrl || "", timezone: bz.timezone || l.timezone || "" } });
      }
      default: return json({ error: "unknown action" }, 400);
    }
  } catch (e) {
    const msg = (e as Error).message;
    if (/GHL 401|GHL 403/.test(msg)) await admin.from("integrations").update({ last_error: msg }).eq("id", integ!.id);
    return json({ error: msg }, 502);
  }
});
