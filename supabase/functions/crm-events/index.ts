// crm-events — the single webhook URL of the CarSales AI OS GoHighLevel app. GoHighLevel pushes every subscribed
// event for every installed sub-account here (no per-dealer workflows). Each event is verified (Ed25519
// X-GHL-Signature), matched to the dealership by locationId, and handed to the
// same handlers the workflow URLs use (ghl-sync / ghl-inbound) with that dealership's private automation key.
// Every event must carry a valid Ed25519 X-GHL-Signature; anything else is rejected.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });
const ED25519_SPKI = "MCowBQYDK2VwAyEAi2HR1srL4o18O8BRa7gVJY7G7bupbN3H9AwJrHCDiOg=";
const b64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
let edKey: CryptoKey | null = null;

async function verified(raw: string, parsed: unknown, sig: string | null) {
  if (!sig) return false;
  try {
    edKey ??= await crypto.subtle.importKey("spki", b64(ED25519_SPKI), { name: "Ed25519" }, false, ["verify"]);
    const s = b64(sig); const enc = new TextEncoder();
    if (await crypto.subtle.verify("Ed25519", edKey, s, enc.encode(raw))) return true;
    return await crypto.subtle.verify("Ed25519", edKey, s, enc.encode(JSON.stringify(parsed)));
  } catch { return false; }
}
async function forward(fn: string, key: string, q: string, body: unknown) {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/${fn}?key=${key}${q}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null) };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const raw = await req.text(); let e: any = {}; try { e = JSON.parse(raw); } catch { return json({ error: "bad json" }, 400); }
  const sigOk = await verified(raw, e, req.headers.get("x-ghl-signature"));
  if (!sigOk) return json({ error: "bad signature" }, 401);
  const type = String(e.type ?? "");
  const locationId = String(e.locationId ?? e.location_id ?? "");

  // install / uninstall
  if (type === "INSTALL" || type === "AppInstall" || type === "UNINSTALL" || type === "AppUninstall") {
    const installs = ((await admin.from("platform_secrets").select("value").eq("key", "ghl_installs").maybeSingle()).data?.value ?? {}) as Record<string, any>;
    if (locationId) installs[locationId] = { type, at: new Date().toISOString(), companyId: e.companyId ?? null };
    await admin.from("platform_secrets").upsert({ key: "ghl_installs", value: installs, updated_at: new Date().toISOString() });
    if (locationId && /UNINSTALL/i.test(type)) await admin.from("integrations").update({ status: "disabled", last_error: "App uninstalled in GoHighLevel" }).eq("provider", "ghl").filter("config->>locationId", "eq", locationId);
    return json({ ok: true });
  }
  if (!locationId) return json({ ok: true, ignored: "no locationId" });
  const { data: integ } = await admin.from("integrations").select("tenant_id,config,status").eq("provider", "ghl").filter("config->>locationId", "eq", locationId).maybeSingle();
  if (!integ) return json({ ok: true, ignored: "sub-account not linked to a dealership" });
  const { data: t } = await admin.from("tenants").select("id,automation_key,status").eq("id", integ.tenant_id).single();
  if (!t || t.status !== "active") return json({ ok: true, ignored: "dealership inactive" });
  const K = t.automation_key as string;
  let res: any = { ignored: type };

  switch (type) {
    case "InboundMessage": {
      const mt = String(e.messageType ?? e.messageTypeString ?? "").toLowerCase();
      if (!e.body && !/call|voicemail/.test(mt)) break;
      res = await forward("ghl-inbound", K, "", { contact_id: e.contactId, phone: /email/.test(mt) ? undefined : e.from, email: /email/.test(mt) ? e.from : undefined, message: { body: e.body || (/voicemail/.test(mt) ? "Voicemail received" : "Inbound call"), type: e.messageType } });
      break;
    }
    case "OutboundMessage": {
      // texts/emails sent from the GoHighLevel app (or its automations) — show them in the Inbox list too
      if (!e.body || !e.contactId) break;
      const { data: c } = await admin.from("customers").select("id").eq("tenant_id", t.id).eq("ghl_contact_id", e.contactId).maybeSingle();
      if (!c) break;
      const mid = String(e.messageId ?? e.id ?? "");
      if (mid) { const { data: dup } = await admin.from("records").select("id").eq("tenant_id", t.id).eq("kind", "message").filter("data->>ghlMessageId", "eq", mid).limit(1); if (dup?.length) break; }
      const mt = String(e.messageType ?? "").toLowerCase();
      await admin.from("records").insert({ tenant_id: t.id, kind: "message", data: { customerId: c.id, channel: /email/.test(mt) ? "email" : /call/.test(mt) ? "call" : "sms", direction: "outbound", body: e.body, at: e.dateAdded ?? new Date().toISOString(), via: "ghl", ghlMessageId: mid || null, by: "GoHighLevel" } });
      res = { logged: true };
      break;
    }
    case "AppointmentCreate": case "AppointmentUpdate": case "AppointmentDelete": {
      const a = e.appointment ?? e;
      res = await forward("ghl-sync", K, "&event=appointment", { contact_id: a.contactId, calendar: { appointmentId: a.id, startTime: a.startTime, endTime: a.endTime, status: type === "AppointmentDelete" ? "cancelled" : a.appointmentStatus, title: a.title } });
      break;
    }
    case "OpportunityStageUpdate": case "OpportunityStatusUpdate": case "OpportunityCreate": {
      if (integ.config?.pipeline?.id && e.pipelineId && e.pipelineId !== integ.config.pipeline.id) { res = { ignored: "other pipeline" }; break; }
      res = await forward("ghl-sync", K, "&event=opportunity", { opportunity_id: e.id, contact_id: e.contactId, pipeline_stage_id: e.pipelineStageId, status: e.status });
      break;
    }
    case "VoiceAiCallEnd": {
      const summary = String(e.summary ?? "").slice(0, 1500);
      res = await forward("ghl-inbound", K, "", { contact_id: e.contactId, phone: e.fromNumber ?? e.extractedData?.phoneNumber, message: { body: `📞 AI phone call (${Math.round((e.duration ?? 0) / 60)} min)${summary ? ": " + summary : ""}`, type: "Call" } });
      await admin.from("audit_log").insert({ tenant_id: t.id, action: "voice_ai_call", entity: "call", details: { duration: e.duration ?? null, contactId: e.contactId ?? null } });
      break;
    }
  }
  await admin.from("audit_log").insert({ tenant_id: t.id, action: "ghl_app_event", entity: type, details: { status: res?.status ?? null } });
  return json({ ok: true, type, result: res?.body ?? res });
});
