// ghl-pull — full import / reconcile from the dealership's GoHighLevel sub-account into CarSales AI OS:
// contacts → Customers, opportunities → Leads & Pipeline, calendar appointments (last 30 / next 90 days) → Appointments.
// Matching: GHL id first, then phone (last 10 digits), then email. Re-running is safe (upserts). Imports never echo back
// to GHL and never create "respond to new lead" tasks (ghl_import sets cso.from_ghl).
// Auth: staff JWT (manager and up) → their dealership; or x-push-secret {tenant_id|all:true} (nightly pg_cron).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const API = "https://services.leadconnectorhq.com";
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type, apikey, x-client-info", "content-type": "application/json" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });

async function ghl(token: string, path: string, init: RequestInit & { version?: string } = {}) {
  const r = await fetch(API + path, { ...init, headers: { Authorization: `Bearer ${token}`, Version: init.version ?? "2021-07-28", Accept: "application/json", "Content-Type": "application/json" } });
  const t = await r.text(); let b: any = null; try { b = t ? JSON.parse(t) : null; } catch { b = {}; }
  if (!r.ok) throw new Error(`GHL ${r.status} ${path.split("?")[0]}: ${b?.message ?? t.slice(0, 120)}`); return b;
}
function stageFor(name: string, status: string, map: any, stageId: string): string {
  if (status === "won") return "sold"; if (status === "lost" || status === "abandoned") return "lost";
  if (map?.stages) { const hit = Object.entries(map.stages).find(([, id]) => id === stageId)?.[0]; if (hit) return hit; }
  const n = name.toLowerCase();
  if (/unsold|lost|not sold|no purchase|closed out|dormant|no show|not purchased/.test(n)) return "lost";
  if (/sold|won|delivered|converted|gallery/.test(n)) return "sold";
  if (/negotiat|desk|proposal|credit/.test(n)) return "negotiating";
  if (/visit|appointment|scheduled|showed|test drive/.test(n)) return "appointment";
  if (/working|contacted|engaged|opt in|call completed|replied/.test(n)) return "contacted";
  return "new";
}
const apptStatus = (s: string) => /cancel/i.test(s) ? "cancelled" : /no.?show/i.test(s) ? "no_show" : /showed|complete/i.test(s) ? "showed" : /confirm/i.test(s) ? "confirmed" : "scheduled";
const apptType = (t: string) => /test.?drive/i.test(t) ? "test_drive" : /deliver/i.test(t) ? "delivery" : /service/i.test(t) ? "service" : /sales|visit|appointment|call/i.test(t) ? "sales" : "other";

async function pull(tenantId: string) {
  const { data: i } = await admin.from("integrations").select("id,status,config").eq("tenant_id", tenantId).eq("provider", "ghl").maybeSingle();
  if (!i || i.status !== "connected" || !i.config?.locationId) return { skipped: "GoHighLevel not connected" };
  const { data: s } = await admin.from("integration_secrets").select("secret").eq("integration_id", i.id).maybeSingle();
  if (!s?.secret) return { skipped: "token missing" };
  const tok = s.secret, loc = i.config.locationId as string, map = i.config.pipeline;
  const out: Record<string, Record<string, number>> = { contacts: {}, opportunities: {}, appointments: {} };
  const bump = (k: string, r: string) => { out[k][r] = (out[k][r] ?? 0) + 1; };
  const imp = async (kind: string, row: any) => { const { data, error } = await admin.rpc("ghl_import", { p_tenant: tenantId, p_kind: kind, p: row }); bump(kind === "contact" ? "contacts" : kind === "opportunity" ? "opportunities" : "appointments", error ? "error" : String(data)); if (error) console.error(kind, error.message); };

  // contacts
  for (let page = 1; page <= 50; page++) {
    const r = await ghl(tok, "/contacts/search", { method: "POST", body: JSON.stringify({ locationId: loc, pageLimit: 100, page }) });
    const list = r?.contacts ?? []; if (!list.length) break;
    for (const c of list) { if ((c.tags ?? []).includes("internal-brief")) continue; await imp("contact", c); }
    if (list.length < 100) break;
  }
  // pipelines (names for stage mapping) + opportunities
  const pl = await ghl(tok, `/opportunities/pipelines?locationId=${loc}`);
  const stageName = new Map<string, string>(); const pipeName = new Map<string, string>();
  for (const p of pl?.pipelines ?? []) { pipeName.set(p.id, p.name); for (const st of p.stages ?? []) stageName.set(st.id, st.name); }
  let after = "", afterId = "";
  for (let n = 0; n < 50; n++) {
    const r = await ghl(tok, `/opportunities/search?location_id=${loc}&limit=100${after ? `&startAfter=${after}&startAfterId=${afterId}` : ""}`);
    const list = r?.opportunities ?? [];
    for (const o of list) {
      const pname = pipeName.get(o.pipelineId) ?? "";
      if (/inventory/i.test(pname)) { bump("opportunities", "skipped-inventory"); continue; }
      if (map?.id && o.pipelineId !== map.id && !/sold/i.test(pname)) { bump("opportunities", "skipped-other-pipeline"); continue; }
      const sname = stageName.get(o.pipelineStageId) ?? "";
      await imp("opportunity", { id: o.id, contactId: o.contactId ?? o.contact?.id, stage: stageFor(/sold/i.test(pname) && !map?.id ? "sold" : sname, String(o.status ?? ""), map?.id === o.pipelineId ? map : null, o.pipelineStageId), stageName: sname, pipeline: pname, createdAt: o.createdAt });
    }
    if (list.length < 100 || !r?.meta?.startAfter) break; after = r.meta.startAfter; afterId = r.meta.startAfterId;
  }
  // appointments per calendar
  const cals = await ghl(tok, `/calendars/?locationId=${loc}`);
  const start = Date.now() - 30 * 864e5, end = Date.now() + 90 * 864e5;
  for (const cal of cals?.calendars ?? []) {
    const r = await ghl(tok, `/calendars/events?locationId=${loc}&calendarId=${cal.id}&startTime=${start}&endTime=${end}`, { version: "2021-04-15" });
    for (const e of r?.events ?? []) await imp("appointment", { id: e.id, contactId: e.contactId, startTime: e.startTime, endTime: e.endTime, status: apptStatus(String(e.appointmentStatus ?? e.status ?? "")), type: apptType(`${cal.name} ${e.title ?? ""}`), title: `${cal.name}${e.title ? " — " + e.title : ""}` });
  }
  await admin.from("integrations").update({ config: { ...i.config, last_pull: { at: new Date().toISOString(), out } } }).eq("id", i.id);
  await admin.from("audit_log").insert({ tenant_id: tenantId, action: "ghl_pull", entity: "integration", details: out });
  return { ok: true, ...out };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const body = await req.json().catch(() => ({}));
  try {
    const secret = req.headers.get("x-push-secret");
    if (secret) {
      const { data: ok } = await admin.rpc("ghl_push_secret_ok", { p: secret }); if (!ok) return json({ error: "unauthorized" }, 401);
      if (body.all) { const { data } = await admin.from("integrations").select("tenant_id").eq("provider", "ghl").eq("status", "connected"); const res: any[] = []; for (const r of data ?? []) { try { res.push({ t: r.tenant_id, ...(await pull(r.tenant_id)) }); } catch (e) { res.push({ t: r.tenant_id, error: (e as Error).message }); } } return json({ ok: true, res }); }
      return json(await pull(String(body.tenant_id)));
    }
    const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, ""); if (!jwt) return json({ error: "unauthorized" }, 401);
    const { data: { user } } = await createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${jwt}` } } }).auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: p } = await admin.from("profiles").select("tenant_id,role,is_active").eq("id", user.id).single();
    if (!p?.is_active || !["super_admin", "owner", "admin", "manager"].includes(p.role)) return json({ error: "managers only" }, 403);
    return json(await pull(p.tenant_id));
  } catch (e) { return json({ error: (e as Error).message }, 502); }
});
