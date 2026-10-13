// integrations — connect/disconnect third-party providers for the caller's dealership.
// Secrets are written to `integration_secrets` (service role only) and never returned to the client.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type, apikey, x-client-info", "content-type": "application/json" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });

const PROVIDERS: Record<string, { label: string; verify?: (secret: string, config: any) => Promise<string | null> }> = {
  ghl: { label: "GoHighLevel", verify: async (secret, cfg) => {
    if (!cfg?.locationId) return "Enter the sub-account (location) ID";
    const r = await fetch(`https://services.leadconnectorhq.com/locations/${encodeURIComponent(cfg.locationId)}`, { headers: { Authorization: `Bearer ${secret}`, Version: "2021-07-28", Accept: "application/json" } });
    return r.ok ? null : r.status === 401 || r.status === 403 ? `GHL rejected the token for this location (${r.status}) — check the token and that the Locations scope is ticked` : `GHL check failed (${r.status})`;
  } },
  anthropic: { label: "Anthropic (AI)", verify: async (secret) => {
    const r = await fetch("https://api.anthropic.com/v1/models?limit=1", { headers: { "x-api-key": secret, "anthropic-version": "2023-06-01" } });
    return r.ok ? null : `Anthropic rejected the key (${r.status})`;
  } },
  marketcheck: { label: "MarketCheck", verify: async (secret) => { const r = await fetch(`https://mc-api.marketcheck.com/v2/decode/car/1HGCV1F33JA111273/specs?api_key=${encodeURIComponent(secret)}`); return r.ok ? null : `MarketCheck rejected the key (${r.status})`; } },
  carfax: { label: "CARFAX" }, kbb: { label: "Kelley Blue Book ICO" }, routeone: { label: "RouteOne" }, dealertrack: { label: "Dealertrack" }, stripe: { label: "Stripe" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "unauthorized" }, 401);
  const { data: { user } } = await createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } } }).auth.getUser();
  if (!user) return json({ error: "unauthorized" }, 401);
  const { data: p } = await admin.from("profiles").select("tenant_id, role, is_active").eq("id", user.id).single();
  if (!p?.is_active || !["super_admin", "owner", "admin"].includes(p.role)) return json({ error: "admin only" }, 403);

  const body = await req.json().catch(() => ({}));
  const provider = String(body.provider || "");
  if (!PROVIDERS[provider]) return json({ error: "unknown provider" }, 400);
  const action = body.action || "connect";

  if (action === "disconnect") {
    await admin.from("integrations").update({ status: "disabled", has_secret: false, last_error: null }).eq("tenant_id", p.tenant_id).eq("provider", provider);
    const { data: row } = await admin.from("integrations").select("id").eq("tenant_id", p.tenant_id).eq("provider", provider).maybeSingle();
    if (row) await admin.from("integration_secrets").update({ secret: "", updated_at: new Date().toISOString() }).eq("integration_id", row.id);
    await admin.from("audit_log").insert({ tenant_id: p.tenant_id, user_id: user.id, action: "integration_disconnect", entity: provider });
    return json({ ok: true });
  }

  const secret = typeof body.secret === "string" ? body.secret.trim() : "";
  const config = body.config && typeof body.config === "object" ? body.config : {};
  for (const k of Object.keys(config)) if (typeof config[k] === "string") config[k] = config[k].trim();
  if (!secret || secret.length < 8) return json({ error: "Enter the API key / token" }, 400);
  const verify = PROVIDERS[provider].verify;
  let err: string | null = null;
  if (verify) { try { err = await verify(secret, config); } catch (e) { err = `Could not verify: ${(e as Error).message}`; } }

  const { data: row, error: e1 } = await admin.from("integrations").upsert({ tenant_id: p.tenant_id, provider, status: err ? "error" : "connected", config, has_secret: true, connected_by: user.id, connected_at: new Date().toISOString(), last_error: err }, { onConflict: "tenant_id,provider" }).select().single();
  if (e1) return json({ error: e1.message }, 500);
  const { error: e2 } = await admin.from("integration_secrets").upsert({ integration_id: row.id, secret, updated_at: new Date().toISOString() });
  if (e2) return json({ error: e2.message }, 500);
  await admin.from("audit_log").insert({ tenant_id: p.tenant_id, user_id: user.id, action: "integration_connect", entity: provider, details: { verified: !err } });
  return json({ ok: !err, status: row.status, error: err });
});
