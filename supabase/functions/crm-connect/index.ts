// crm-connect — the CarSales AI OS marketplace app for the agency's GoHighLevel account (OAuth, agency level).
// One connection for the whole platform: every dealership sub-account is created, linked and kept authorized from
// the app — no per-dealer tokens, no hand-built workflows. (Name avoids "ghl"/"highlevel": GHL rejects those in redirect URLs.)
//   GET  ?code=…&state=…                    OAuth callback → stores the agency token → back to the app
//   POST {action} with a super-admin JWT:
//     status · save_app {clientId, clientSecret} · authorize_url · locations · snapshots
//     create_location {tenantId, snapshotId?, profile} · link_location {tenantId, locationId} · unlink {tenantId}
//   POST {action:"refresh_all"|"link_location"} with x-push-secret (pg_cron / crm-events)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const API = "https://services.leadconnectorhq.com";
const SELF = `${SUPABASE_URL}/functions/v1/crm-connect`;
const APP_URL = "https://app.carsalessoftware.com";
const SCOPES = ["locations.readonly", "locations.write", "locations/customValues.readonly", "locations/customValues.write", "contacts.readonly", "contacts.write", "conversations.readonly", "conversations.write", "conversations/message.readonly", "conversations/message.write", "calendars.readonly", "calendars.write", "calendars/events.readonly", "calendars/events.write", "opportunities.readonly", "opportunities.write", "oauth.readonly", "oauth.write", "snapshots.readonly", "users.readonly", "businesses.readonly"];
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type, apikey, x-client-info", "content-type": "application/json" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });

async function kv(key: string): Promise<any> { const { data } = await admin.from("platform_secrets").select("value").eq("key", key).maybeSingle(); return data?.value ?? null; }
async function setKv(key: string, value: any) { await admin.from("platform_secrets").upsert({ key, value, updated_at: new Date().toISOString() }); }

async function tokenCall(form: Record<string, string>) {
  const r = await fetch(`${API}/oauth/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" }, body: new URLSearchParams(form) });
  const b = await r.json().catch(() => ({})); if (!r.ok) throw new Error(`GoHighLevel sign-in failed (${r.status}): ${b?.error_description ?? b?.message ?? b?.error ?? ""}`); return b;
}
async function agencyToken(): Promise<{ token: string; companyId: string }> {
  const app = await kv("ghl_app"); const ag = await kv("ghl_agency");
  if (!app?.clientId || !ag?.refresh_token) throw new Error("The agency isn't connected to GoHighLevel yet (Dealerships → Connect GoHighLevel).");
  if (ag.expires_at && Date.parse(ag.expires_at) - Date.now() > 5 * 60e3) return { token: ag.access_token, companyId: ag.companyId };
  const t = await tokenCall({ client_id: app.clientId, client_secret: app.clientSecret, grant_type: "refresh_token", refresh_token: ag.refresh_token, user_type: "Company", redirect_uri: SELF });
  const next = { ...ag, access_token: t.access_token, refresh_token: t.refresh_token ?? ag.refresh_token, expires_at: new Date(Date.now() + (t.expires_in ?? 86000) * 1000).toISOString() };
  await setKv("ghl_agency", next); return { token: next.access_token, companyId: next.companyId };
}
async function ghl(token: string, path: string, init: RequestInit & { version?: string } = {}) {
  const r = await fetch(API + path, { ...init, headers: { Authorization: `Bearer ${token}`, Version: init.version ?? "2021-07-28", Accept: "application/json", "Content-Type": "application/json", ...(init.headers ?? {}) } });
  const t = await r.text(); let b: any = null; try { b = t ? JSON.parse(t) : null; } catch { b = { raw: t.slice(0, 200) }; }
  if (!r.ok) throw new Error(`GHL ${r.status}: ${b?.message ?? b?.msg ?? t.slice(0, 160)}`); return b;
}

/** Mint (or re-mint) a sub-account token from the agency token and store it as the dealership's GHL connection. */
async function linkLocation(tenantId: string, locationId: string, by?: string) {
  const { token, companyId } = await agencyToken();
  const r = await fetch(`${API}/oauth/locationToken`, { method: "POST", headers: { Authorization: `Bearer ${token}`, Version: "2021-07-28", "content-type": "application/x-www-form-urlencoded", accept: "application/json" }, body: new URLSearchParams({ companyId, locationId }) });
  const b = await r.json().catch(() => ({}));
  if (!r.ok || !b?.access_token) throw new Error(r.status === 400 || r.status === 401 || r.status === 403 ? `The CarSales AI OS app isn't installed on that sub-account yet — install it there (or reinstall for all sub-accounts) and try again. (${b?.message ?? r.status})` : `Couldn't authorize the sub-account (${r.status}): ${b?.message ?? ""}`);
  const { data: cur } = await admin.from("integrations").select("id,config").eq("tenant_id", tenantId).eq("provider", "ghl").maybeSingle();
  const config = { ...(cur?.config ?? {}), locationId, via: "app", companyId, expires_at: new Date(Date.now() + (b.expires_in ?? 86000) * 1000).toISOString() };
  const { data: row, error } = await admin.from("integrations").upsert({ tenant_id: tenantId, provider: "ghl", status: "connected", config, has_secret: true, connected_at: new Date().toISOString(), last_error: null, ...(by ? { connected_by: by } : {}) }, { onConflict: "tenant_id,provider" }).select("id").single();
  if (error) throw new Error(error.message);
  await admin.from("integration_secrets").upsert({ integration_id: row.id, secret: b.access_token, updated_at: new Date().toISOString() });
  return { ok: true, locationId };
}

async function refreshAll() {
  const { data } = await admin.from("integrations").select("tenant_id,config").eq("provider", "ghl").eq("status", "connected");
  const out: any[] = [];
  for (const r of data ?? []) {
    if (r.config?.via !== "app") continue;
    if (r.config?.expires_at && Date.parse(r.config.expires_at) - Date.now() > 3 * 3600e3) continue;
    try { await linkLocation(r.tenant_id, r.config.locationId); out.push({ t: r.tenant_id, ok: true }); }
    catch (e) { out.push({ t: r.tenant_id, error: (e as Error).message }); await admin.from("integrations").update({ last_error: (e as Error).message }).eq("tenant_id", r.tenant_id).eq("provider", "ghl"); }
  }
  return { ok: true, out };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);

  // ── OAuth callback (browser redirect from GoHighLevel) ──
  if (req.method === "GET" && url.searchParams.get("code")) {
    const back = (q: string) => Response.redirect(`${APP_URL}/dealerships?${q}`, 302);
    try {
      const st = await kv("ghl_oauth_state");
      if (!st?.state || st.state !== url.searchParams.get("state") || Date.parse(st.expires_at) < Date.now()) return back("ghl=error&msg=" + encodeURIComponent("The sign-in link expired — click Connect again."));
      const app = await kv("ghl_app");
      const t = await tokenCall({ client_id: app.clientId, client_secret: app.clientSecret, grant_type: "authorization_code", code: url.searchParams.get("code")!, user_type: "Company", redirect_uri: SELF });
      if (!t.companyId) throw new Error("GoHighLevel didn't return an agency (pick the agency, not a sub-account, when installing)");
      await setKv("ghl_agency", { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: new Date(Date.now() + (t.expires_in ?? 86000) * 1000).toISOString(), companyId: t.companyId, userType: t.userType, scope: t.scope, connected_at: new Date().toISOString(), connected_by: st.by ?? null });
      await setKv("ghl_oauth_state", {});
      return back("ghl=connected");
    } catch (e) { return back("ghl=error&msg=" + encodeURIComponent((e as Error).message)); }
  }
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "status");

  // ── internal ──
  const secret = req.headers.get("x-push-secret");
  if (secret) {
    const { data: ok } = await admin.rpc("ghl_push_secret_ok", { p: secret }); if (!ok) return json({ error: "bad secret" }, 401);
    try {
      if (action === "refresh_all") return json(await refreshAll());
      if (action === "link_location") return json(await linkLocation(String(body.tenantId), String(body.locationId)));
      return json({ error: "unknown action" }, 400);
    } catch (e) { return json({ error: (e as Error).message }, 502); }
  }

  // ── super admin ──
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "unauthorized" }, 401);
  const { data: { user } } = await createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } } }).auth.getUser();
  if (!user) return json({ error: "unauthorized" }, 401);
  const { data: p } = await admin.from("profiles").select("role,is_active,tenant_id").eq("id", user.id).single();
  const isSuper = p?.is_active && p.role === "super_admin";
  const isAdmin = p?.is_active && ["super_admin", "owner", "admin"].includes(p.role);
  if (!isAdmin) return json({ error: "admins only" }, 403);

  try {
    switch (action) {
      case "status": {
        const app = await kv("ghl_app"); const ag = await kv("ghl_agency");
        return json({ appConfigured: !!(app?.clientId && app?.clientSecret), clientId: isSuper ? app?.clientId ?? null : null, agencyConnected: !!ag?.refresh_token, companyId: isSuper ? ag?.companyId ?? null : null, connectedAt: ag?.connected_at ?? null, redirectUri: SELF, webhookUrl: `${SUPABASE_URL}/functions/v1/crm-events`, scopes: SCOPES });
      }
      case "save_app": {
        if (!isSuper) return json({ error: "super admin only" }, 403);
        const clientId = String(body.clientId ?? "").trim(), clientSecret = String(body.clientSecret ?? "").trim();
        if (clientId.length < 8 || clientSecret.length < 8) return json({ error: "Paste both the Client ID and the Client Secret from the GoHighLevel app" }, 400);
        await setKv("ghl_app", { clientId, clientSecret, saved_at: new Date().toISOString() });
        await admin.from("audit_log").insert({ tenant_id: p!.tenant_id, user_id: user.id, action: "platform_ghl_app_saved", entity: "platform" });
        return json({ ok: true });
      }
      case "authorize_url": {
        if (!isSuper) return json({ error: "super admin only" }, 403);
        const app = await kv("ghl_app"); if (!app?.clientId) return json({ error: "Save the app's Client ID and Secret first" }, 400);
        const state = crypto.randomUUID();
        await setKv("ghl_oauth_state", { state, by: user.id, expires_at: new Date(Date.now() + 15 * 60e3).toISOString() });
        const u = new URL("https://marketplace.gohighlevel.com/oauth/chooselocation");
        u.searchParams.set("response_type", "code"); u.searchParams.set("redirect_uri", SELF); u.searchParams.set("client_id", app.clientId); u.searchParams.set("scope", SCOPES.join(" ")); u.searchParams.set("state", state);
        return json({ ok: true, url: u.toString() });
      }
      case "locations": {
        if (!isSuper) return json({ error: "super admin only" }, 403);
        const { token, companyId } = await agencyToken();
        const r = await ghl(token, `/locations/search?companyId=${encodeURIComponent(companyId)}&limit=500&order=asc`);
        const { data: links } = await admin.from("integrations").select("tenant_id,config").eq("provider", "ghl");
        const used = new Map((links ?? []).map((l: any) => [l.config?.locationId, l.tenant_id]));
        return json({ ok: true, locations: (r?.locations ?? []).map((l: any) => ({ id: l.id, name: l.name, city: l.city, state: l.state, linkedTenantId: used.get(l.id) ?? null })) });
      }
      case "snapshots": {
        if (!isSuper) return json({ error: "super admin only" }, 403);
        const { token, companyId } = await agencyToken();
        const r = await ghl(token, `/snapshots/?companyId=${encodeURIComponent(companyId)}`);
        return json({ ok: true, snapshots: (r?.snapshots ?? []).map((s: any) => ({ id: s.id, name: s.name, type: s.type })) });
      }
      case "create_location": {
        if (!isSuper) return json({ error: "super admin only" }, 403);
        const { token, companyId } = await agencyToken();
        const pr = body.profile ?? {}; const a = pr.address ?? {};
        const payload: any = { name: String(pr.name ?? "").trim(), companyId, phone: pr.phone ? "+1" + String(pr.phone).replace(/\D/g, "").slice(-10) : undefined, address: a.street || undefined, city: a.city || undefined, state: a.state || undefined, country: "US", postalCode: a.zip || undefined, website: pr.website || undefined, timezone: pr.timezone || "America/New_York",
          prospectInfo: pr.ownerEmail ? { firstName: String(pr.ownerName ?? "").split(" ")[0] || "Owner", lastName: String(pr.ownerName ?? "").split(" ").slice(1).join(" ") || "-", email: pr.ownerEmail } : undefined,
          ...(body.snapshotId ? { snapshotId: String(body.snapshotId) } : {}), settings: { allowDuplicateContact: false, allowDuplicateOpportunity: false, allowFacebookNameMerge: true, disableContactTimezone: false } };
        if (!payload.name) return json({ error: "Dealership name required" }, 400);
        const r = await ghl(token, "/locations/", { method: "POST", body: JSON.stringify(payload) });
        const locationId = r?.id ?? r?.location?.id; if (!locationId) throw new Error("GoHighLevel didn't return the new sub-account id");
        await admin.from("audit_log").insert({ tenant_id: body.tenantId ?? p!.tenant_id, user_id: user.id, action: "ghl_location_created", entity: "tenant", details: { locationId, snapshot: body.snapshotId ?? null } });
        let linked: any = null, linkError: string | null = null;
        if (body.tenantId) { try { linked = await linkLocation(String(body.tenantId), locationId, user.id); } catch (e) { linkError = (e as Error).message; await admin.from("integrations").upsert({ tenant_id: body.tenantId, provider: "ghl", status: "error", config: { locationId, via: "app", pending: true }, has_secret: false, last_error: linkError }, { onConflict: "tenant_id,provider" }); } }
        return json({ ok: true, locationId, linked: !!linked, linkError });
      }
      case "link_location": {
        if (!isSuper) return json({ error: "super admin only" }, 403);   // linking decides which sub-account a dealership can act on
        const tenantId = String(body.tenantId ?? p!.tenant_id);
        const { data: taken } = await admin.from("integrations").select("tenant_id").eq("provider", "ghl").neq("tenant_id", tenantId).filter("config->>locationId", "eq", String(body.locationId)).neq("status", "disabled").limit(1);
        if (taken?.length) return json({ error: "That sub-account is already linked to another dealership" }, 409);
        const res = await linkLocation(tenantId, String(body.locationId), user.id);
        await admin.from("audit_log").insert({ tenant_id: tenantId, user_id: user.id, action: "ghl_location_linked", entity: "tenant", details: { locationId: body.locationId } });
        return json(res);
      }
      case "unlink": {
        const tenantId = isSuper ? String(body.tenantId ?? p!.tenant_id) : p!.tenant_id;
        await admin.from("integrations").update({ status: "disabled", has_secret: false }).eq("tenant_id", tenantId).eq("provider", "ghl");
        return json({ ok: true });
      }
      default: return json({ error: "unknown action" }, 400);
    }
  } catch (e) { return json({ error: (e as Error).message }, 502); }
});
