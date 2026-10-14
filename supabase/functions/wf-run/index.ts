// wf-run — "Text the customer" action of Workflows (Settings → Workflows). Called only by the database
// (run_workflows → private.call_fn, x-push-secret). Sends through the dealership's GoHighLevel number during
// 8am–8pm Eastern; outside those hours, or without a GHL connection / phone, it creates a task to send it instead.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });
const API = "https://services.leadconnectorhq.com";
const e164 = (s?: string | null) => { const d = (s ?? "").replace(/\D/g, ""); return d.length === 10 ? `+1${d}` : d.length === 11 && d.startsWith("1") ? `+${d}` : s || undefined; };

async function ghl(token: string, path: string, init: RequestInit & { version?: string } = {}) {
  const r = await fetch(API + path, { ...init, headers: { Authorization: `Bearer ${token}`, Version: init.version ?? "2021-07-28", Accept: "application/json", "Content-Type": "application/json" } });
  const t = await r.text(); let b: any = null; try { b = t ? JSON.parse(t) : null; } catch { b = {}; }
  if (!r.ok) throw new Error(`GHL ${r.status}: ${b?.message ?? t.slice(0, 120)}`); return b;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const { data: ok } = await admin.rpc("ghl_push_secret_ok", { p: req.headers.get("x-push-secret") ?? "" });
  if (!ok) return json({ error: "unauthorized" }, 401);
  const b = await req.json().catch(() => ({}));
  const tenantId = String(b.tenant_id), customerId = String(b.customer_id), text = String(b.body ?? "").trim(), rule = String(b.rule ?? "Workflow");
  if (!text) return json({ skipped: "empty" });
  const { data: c } = await admin.from("customers").select("id,first_name,last_name,phone,email,ghl_contact_id").eq("id", customerId).eq("tenant_id", tenantId).single();
  const fallback = async (why: string) => {
    await admin.from("tasks").insert({ tenant_id: tenantId, assigned_to: b.owner ?? null, title: `Text ${c?.first_name ?? "customer"}: ${text.slice(0, 120)}`, due_at: new Date(Date.now() + 15 * 60e3).toISOString(), status: "open", priority: "normal", related_type: "customer", related_id: customerId, notes: `Workflow "${rule}" couldn't text automatically (${why}). Message:\n${text}` });
    return json({ ok: true, sent: false, why });
  };
  if (!c?.phone) return fallback("no phone on file");
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false }).format(new Date()));
  if (hour < 8 || hour >= 20) return fallback("outside 8am–8pm texting hours");
  const { data: i } = await admin.from("integrations").select("id,status,config").eq("tenant_id", tenantId).eq("provider", "ghl").maybeSingle();
  if (!i || i.status !== "connected" || !i.config?.locationId) return fallback("GoHighLevel not connected");
  const { data: s } = await admin.from("integration_secrets").select("secret").eq("integration_id", i.id).maybeSingle();
  if (!s?.secret) return fallback("GoHighLevel token missing");
  try {
    let contactId = c.ghl_contact_id as string | null;
    if (!contactId) {
      const r = await ghl(s.secret, "/contacts/upsert", { method: "POST", body: JSON.stringify({ locationId: i.config.locationId, firstName: c.first_name, lastName: c.last_name || undefined, phone: e164(c.phone), email: c.email || undefined, source: "CarSales AI OS", tags: ["carsales-ai-os"] }) });
      contactId = r?.contact?.id ?? r?.id; if (!contactId) throw new Error("no contact id");
      await admin.from("customers").update({ ghl_contact_id: contactId }).eq("id", c.id);
    }
    const r = await ghl(s.secret, "/conversations/messages", { method: "POST", version: "2021-04-15", body: JSON.stringify({ type: "SMS", contactId, message: text }) });
    await admin.from("records").insert({ tenant_id: tenantId, kind: "message", data: { customerId, channel: "sms", direction: "outbound", body: text, at: new Date().toISOString(), via: "workflow", ghlMessageId: r?.messageId ?? null, by: `Workflow: ${rule}` } });
    await admin.from("audit_log").insert({ tenant_id: tenantId, action: "workflow_text", entity: "customer", entity_id: customerId, details: { rule } });
    return json({ ok: true, sent: true });
  } catch (e) { return fallback((e as Error).message.slice(0, 120)); }
});
