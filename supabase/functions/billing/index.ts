// billing — CarSalesSoftware.com subscription billing through Stripe.
// Platform setup (super admin): save_config / config. Dealership (owner/admin, or super admin for any dealership):
// status, checkout (Stripe Checkout for a plan), portal (Stripe Billing Portal: card, invoices, plan changes, cancel).
// The Stripe key lives only in platform_secrets ('stripe'); it is never returned to the app.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type, apikey, x-client-info", "content-type": "application/json" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });
const APP_URL = "https://app.carsalessoftware.com";
export const PLANS = ["starter", "pro", "enterprise"] as const;
type Plan = typeof PLANS[number];
type Cfg = { secretKey: string; webhookSecret?: string; prices: Partial<Record<Plan, string>>; trialDays?: number };

async function cfg(): Promise<Cfg | null> { const { data } = await admin.from("platform_secrets").select("value").eq("key", "stripe").maybeSingle(); return (data?.value as Cfg) ?? null; }

function form(obj: Record<string, unknown>, prefix = "", out = new URLSearchParams()): URLSearchParams {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => (typeof item === "object" ? form(item as any, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(item))));
    else if (typeof v === "object") form(v as any, key, out);
    else out.append(key, String(v));
  }
  return out;
}
async function stripe(c: Cfg, method: "GET" | "POST", path: string, body?: Record<string, unknown>) {
  const r = await fetch(`https://api.stripe.com/v1${path}`, { method, headers: { authorization: `Bearer ${c.secretKey}`, "content-type": "application/x-www-form-urlencoded", "stripe-version": "2024-06-20" }, body: body ? form(body).toString() : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error?.message ? `Stripe: ${j.error.message}` : `Stripe HTTP ${r.status}`);
  return j;
}
async function priceInfo(c: Cfg) {
  const out: any[] = [];
  for (const plan of PLANS) {
    const id = c.prices?.[plan]; if (!id) continue;
    try { const p = await stripe(c, "GET", `/prices/${encodeURIComponent(id)}?expand[]=product`); out.push({ plan, id, amount: p.unit_amount, currency: p.currency, interval: p.recurring?.interval ?? null, intervalCount: p.recurring?.interval_count ?? 1, product: typeof p.product === "object" ? p.product.name : null, active: p.active }); }
    catch (e) { out.push({ plan, id, error: (e as Error).message }); }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "unauthorized" }, 401);
    const { data: { user } } = await createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false } }).auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: me } = await admin.from("profiles").select("tenant_id, role, is_active, full_name").eq("id", user.id).single();
    if (!me?.is_active) return json({ error: "unauthorized" }, 401);
    const isSuper = me.role === "super_admin";
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "status");

    // ---- platform setup (super admin only) ----
    if (action === "save_config") {
      if (!isSuper) return json({ error: "Only CarSalesSoftware.com can change billing setup" }, 403);
      const old = (await cfg()) ?? { secretKey: "", prices: {} };
      const next: Cfg = { secretKey: String(body.secretKey ?? "").trim() || old.secretKey, webhookSecret: String(body.webhookSecret ?? "").trim() || old.webhookSecret, prices: { ...old.prices }, trialDays: body.trialDays === undefined ? old.trialDays : Math.max(0, Math.min(90, Number(body.trialDays) || 0)) };
      for (const plan of PLANS) if (body.prices && plan in body.prices) { const v = String(body.prices[plan] ?? "").trim(); if (v) next.prices[plan] = v; else delete next.prices[plan]; }
      if (!/^(sk|rk)_(test|live)_/.test(next.secretKey)) return json({ error: "That isn't a Stripe secret or restricted key (it starts with sk_ or rk_)" }, 400);
      if (next.webhookSecret && !/^whsec_/.test(next.webhookSecret)) return json({ error: "The webhook signing secret starts with whsec_" }, 400);
      await stripe(next, "GET", "/balance");   // proves the key works before we save it
      for (const plan of PLANS) { const id = next.prices[plan]; if (id) { const p = await stripe(next, "GET", `/prices/${encodeURIComponent(id)}`); if (!p.recurring) return json({ error: `${id} is a one-time price — plans need a recurring (monthly or yearly) price` }, 400); } }
      await admin.from("platform_secrets").upsert({ key: "stripe", value: next, updated_at: new Date().toISOString() });
      await admin.from("audit_log").insert({ tenant_id: me.tenant_id, user_id: user.id, action: "billing_config", entity: "platform", details: { mode: next.secretKey.includes("_live_") ? "live" : "test", plans: Object.keys(next.prices) } });
      return json({ ok: true });
    }
    if (action === "config") {
      if (!isSuper) return json({ error: "forbidden" }, 403);
      const c = await cfg();
      if (!c?.secretKey) return json({ configured: false });
      return json({ configured: true, mode: c.secretKey.includes("_live_") ? "live" : "test", webhook: !!c.webhookSecret, trialDays: c.trialDays ?? 0, prices: await priceInfo(c) });
    }

    // ---- dealership billing ----
    const tenantId = isSuper && body.tenant_id ? String(body.tenant_id) : me.tenant_id;
    const canManage = isSuper || ["owner", "admin"].includes(me.role);
    const { data: t } = await admin.from("tenants").select("id, name, email, phone, plan, status, is_demo, billing_status, billing_period_end, trial_ends_at, stripe_customer_id, stripe_subscription_id").eq("id", tenantId).single();
    if (!t) return json({ error: "Dealership not found" }, 404);
    const c = await cfg();

    if (action === "status") {
      return json({ plan: t.plan, status: t.billing_status, periodEnd: t.billing_period_end, trialEndsAt: t.trial_ends_at, hasCustomer: !!t.stripe_customer_id, subscribed: !!t.stripe_subscription_id && !["canceled", "incomplete_expired"].includes(t.billing_status), demo: t.is_demo, canManage, configured: !!c?.secretKey, prices: c?.secretKey ? (await priceInfo(c)).filter((p) => !p.error && p.active !== false) : [] });
    }
    if (!canManage) return json({ error: "Only the owner or an admin can manage billing" }, 403);
    if (t.is_demo) return json({ error: "The demo dealership isn't billed" }, 400);
    if (!c?.secretKey) return json({ error: "Billing isn't set up yet — CarSalesSoftware.com will finish it shortly" }, 400);
    const back = isSuper && body.tenant_id ? `${APP_URL}/dealerships` : `${APP_URL}/settings?tab=billing`;

    async function customerId(): Promise<string> {
      if (t!.stripe_customer_id) return t!.stripe_customer_id;
      const cu = await stripe(c!, "POST", "/customers", { name: t!.name, email: t!.email || undefined, phone: t!.phone || undefined, metadata: { tenant_id: t!.id } });
      await admin.from("tenants").update({ stripe_customer_id: cu.id }).eq("id", t!.id);
      return cu.id;
    }

    if (action === "checkout") {
      const plan = String(body.plan ?? "") as Plan;
      const price = c.prices?.[plan]; if (!price) return json({ error: "That plan isn't available" }, 400);
      if (t.stripe_subscription_id && !["canceled", "incomplete_expired"].includes(t.billing_status)) return json({ error: "This dealership already has a subscription — use Manage billing to change plans" }, 400);
      const cust = await customerId();
      const trial = (c.trialDays ?? 0) > 0 && !t.stripe_subscription_id ? c.trialDays : undefined;
      const s = await stripe(c, "POST", "/checkout/sessions", {
        mode: "subscription", customer: cust, client_reference_id: t.id, allow_promotion_codes: true, billing_address_collection: "auto",
        line_items: [{ price, quantity: 1 }],
        subscription_data: { metadata: { tenant_id: t.id, plan }, trial_period_days: trial },
        metadata: { tenant_id: t.id, plan },
        success_url: `${back}${back.includes("?") ? "&" : "?"}billing=success`, cancel_url: `${back}${back.includes("?") ? "&" : "?"}billing=cancel`,
      });
      await admin.from("audit_log").insert({ tenant_id: t.id, user_id: user.id, action: "billing_checkout", entity: "tenant", entity_id: t.id, details: { plan } });
      return json({ url: s.url });
    }
    if (action === "portal") {
      if (!t.stripe_customer_id) return json({ error: "Choose a plan first" }, 400);
      const s = await stripe(c, "POST", "/billing_portal/sessions", { customer: t.stripe_customer_id, return_url: back });
      return json({ url: s.url });
    }
    return json({ error: "unknown action" }, 400);
  } catch (e) {
    const m = (e as Error).message || "Something went wrong";
    return json({ error: /No configuration provided/i.test(m) ? "Stripe's customer portal isn't turned on yet — CarSalesSoftware.com needs to save it once in Stripe (Settings → Billing → Customer portal)" : m }, 500);
  }
});
