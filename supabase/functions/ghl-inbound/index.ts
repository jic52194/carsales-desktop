// ghl-inbound — GoHighLevel workflow "Webhook" action → CarSales AI OS.
// Use with the trigger "Customer Replied" (and optionally "Contact Created"). URL: .../functions/v1/ghl-inbound?key=<dealership automation key>
// (The older public intake key is still accepted so existing workflows keep logging, but only automation-key messages can trigger AI replies.)
// Matches the contact to a customer (GHL contact id, then phone, then email; creates one if new), logs the inbound
// message into the dealership Inbox and opens a lead if the customer has none open. Public endpoint; auth = per-dealership key.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });
const s = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : typeof v === "number" ? String(v) : "");
const digits = (v: string) => v.replace(/\D/g, "").slice(-10);

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const url = new URL(req.url);
  const key = s(url.searchParams.get("key") || req.headers.get("x-intake-key"), 64);
  if (!key) return json({ error: "missing key" }, 401);
  let trusted = true;
  let { data: tenant } = await admin.from("tenants").select("id,status").eq("automation_key", key).maybeSingle();
  if (!tenant) { trusted = false; ({ data: tenant } = await admin.from("tenants").select("id,status").eq("intake_key", key).maybeSingle()); }
  if (!tenant || tenant.status !== "active") return json({ error: "unknown dealership" }, 401);

  const b: any = await req.json().catch(() => ({}));
  const contactId = s(b.contact_id || b.contactId || b.contact?.id, 80);
  const phone = s(b.phone || b.contact?.phone, 40), email = s(b.email || b.contact?.email, 160).toLowerCase();
  const first = s(b.first_name || b.firstName || b.contact?.firstName || (s(b.full_name || b.contact_name).split(" ")[0]), 80);
  const last = s(b.last_name || b.lastName || b.contact?.lastName, 80);
  const msg = b.message ?? {};
  const text = s(typeof msg === "string" ? msg : msg.body ?? b.body ?? b.message_body, 4000);
  const mtype = s(typeof msg === "object" ? msg.type ?? msg.messageType : b.message_type, 40).toLowerCase();
  const channel = mtype.includes("email") ? "email" : mtype.includes("call") ? "call" : "sms";

  // find or create the customer
  let customerId: string | null = null;
  if (contactId) { const { data } = await admin.from("customers").select("id").eq("tenant_id", tenant.id).eq("ghl_contact_id", contactId).limit(1); customerId = data?.[0]?.id ?? null; }
  if (!customerId && digits(phone).length === 10) { const { data } = await admin.from("customers").select("id,phone").eq("tenant_id", tenant.id).not("phone", "is", null); customerId = data?.find((c) => digits(c.phone ?? "") === digits(phone))?.id ?? null; }
  if (!customerId && email) { const { data } = await admin.from("customers").select("id").eq("tenant_id", tenant.id).ilike("email", email).limit(1); customerId = data?.[0]?.id ?? null; }
  let created = false;
  if (!customerId) {
    if (!first && !phone && !email) return json({ ok: true, ignored: "no contact details" });
    const { data, error } = await admin.from("customers").insert({ tenant_id: tenant.id, first_name: first || "Unknown", last_name: last || null, phone: phone || null, email: email || null, source: "GoHighLevel", ghl_contact_id: contactId || null }).select("id").single();
    if (error) return json({ error: error.message }, 500);
    customerId = data.id; created = true;
  } else if (contactId) {
    await admin.from("customers").update({ ghl_contact_id: contactId }).eq("id", customerId).is("ghl_contact_id", null);
  }

  if (text) await admin.from("records").insert({ tenant_id: tenant.id, kind: "message", data: { customerId, channel, direction: "inbound", body: text, at: new Date().toISOString(), via: "ghl", trusted } });

  // make sure someone works it: open a lead if none is open
  const { data: open } = await admin.from("leads").select("id").eq("tenant_id", tenant.id).eq("customer_id", customerId).not("stage", "in", "(sold,lost)").limit(1);
  let leadId = open?.[0]?.id ?? null;
  if (!leadId) {
    const { data: lead } = await admin.from("leads").insert({ tenant_id: tenant.id, customer_id: customerId, stage: "new", source: "GoHighLevel", message: text || null, notes: text ? `Replied by ${channel}: ${text.slice(0, 300)}` : null }).select("id").single();
    leadId = lead?.id ?? null;
  }
  await admin.from("audit_log").insert({ tenant_id: tenant.id, action: "ghl_inbound", entity: "customer", entity_id: customerId, details: { channel, created } });
  return json({ ok: true, customerId, leadId, created });
});
