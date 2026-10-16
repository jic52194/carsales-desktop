// stripe-webhook — Stripe → CarSales AI OS. Verifies the Stripe-Signature header (HMAC-SHA256 with the signing secret
// saved in Settings), then keeps each dealership's plan and billing status in step with its subscription.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });
const PLANS = ["starter", "pro", "enterprise"];

async function hmacHex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg)));
  return [...sig].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEq(a: string, b: string) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
export async function verify(raw: string, header: string | null, secret: string, toleranceSec = 300, now = Date.now()) {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.split("=")); const t = parts.find(([k]) => k === "t")?.[1];
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !sigs.length || Math.abs(now / 1000 - Number(t)) > toleranceSec) return false;
  const expected = await hmacHex(secret, `${t}.${raw}`);
  return sigs.some((s) => safeEq(s, expected));
}

async function stripeGet(key: string, path: string) {
  const r = await fetch(`https://api.stripe.com/v1${path}`, { headers: { authorization: `Bearer ${key}`, "stripe-version": "2024-06-20" } });
  if (!r.ok) throw new Error(`Stripe HTTP ${r.status}`); return await r.json();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: true });
  const { data: row } = await admin.from("platform_secrets").select("value").eq("key", "stripe").maybeSingle();
  const cfg = row?.value as { secretKey: string; webhookSecret?: string; prices: Record<string, string> } | undefined;
  if (!cfg?.webhookSecret) return json({ error: "webhook not configured" }, 400);
  const raw = await req.text();
  if (!(await verify(raw, req.headers.get("stripe-signature"), cfg.webhookSecret))) return json({ error: "bad signature" }, 400);
  const ev = JSON.parse(raw);
  // idempotency: Stripe retries; skip events we already applied
  const { data: seen } = await admin.from("stripe_events").select("id").eq("id", ev.id).maybeSingle();
  if (seen) return json({ ok: true, duplicate: true });

  const planOf = (priceId?: string) => PLANS.find((p) => cfg.prices?.[p] === priceId) ?? null;
  const findTenant = async (meta?: any, customer?: string) => {
    if (meta?.tenant_id) { const { data } = await admin.from("tenants").select("id, plan").eq("id", meta.tenant_id).maybeSingle(); if (data) return data; }
    if (customer) { const { data } = await admin.from("tenants").select("id, plan").eq("stripe_customer_id", customer).maybeSingle(); if (data) return data; }
    return null;
  };
  const applySub = async (sub: any) => {
    const t = await findTenant(sub.metadata, sub.customer); if (!t) return null;
    const item = sub.items?.data?.[0]; const priceId = item?.price?.id;
    const end = item?.current_period_end ?? sub.current_period_end;
    const status = sub.status === "canceled" || sub.ended_at ? "canceled" : sub.status;
    const patch: any = { stripe_customer_id: sub.customer, stripe_subscription_id: sub.id, billing_status: status, billing_price_id: priceId ?? null,
      billing_period_end: end ? new Date(end * 1000).toISOString() : null, trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null };
    const plan = planOf(priceId); if (plan && status !== "canceled") patch.plan = plan;
    await admin.from("tenants").update(patch).eq("id", t.id);
    return t.id;
  };

  let tenantId: string | null = null;
  try {
    switch (ev.type) {
      case "checkout.session.completed": {
        const s = ev.data.object;
        if (s.subscription) tenantId = await applySub({ ...(await stripeGet(cfg.secretKey, `/subscriptions/${s.subscription}`)), metadata: { tenant_id: s.client_reference_id ?? s.metadata?.tenant_id } });
        break;
      }
      case "customer.subscription.created": case "customer.subscription.updated": case "customer.subscription.deleted":
        tenantId = await applySub(ev.data.object); break;
      case "invoice.payment_failed": {
        const inv = ev.data.object; const subId = inv.subscription ?? inv.parent?.subscription_details?.subscription; const t = await findTenant(inv.subscription_details?.metadata ?? inv.parent?.subscription_details?.metadata ?? inv.metadata, inv.customer);
        if (t) {
          tenantId = t.id;
          await admin.from("tenants").update({ billing_status: "past_due" }).eq("id", t.id);
          await admin.from("records").insert({ tenant_id: t.id, kind: "alert", data: { title: "Payment failed", desc: "Your CarSalesSoftware.com payment didn't go through. Update your card in Settings → Billing.", at: new Date().toISOString(), to: "admins" } });
        }
        break;
      }
      case "invoice.paid": {
        const inv = ev.data.object; const subId = inv.subscription ?? inv.parent?.subscription_details?.subscription; const t = await findTenant(inv.subscription_details?.metadata ?? inv.parent?.subscription_details?.metadata ?? inv.metadata, inv.customer);
        if (t && subId) tenantId = await applySub(await stripeGet(cfg.secretKey, `/subscriptions/${subId}`));
        break;
      }
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 500);   // Stripe retries
  }
  await admin.from("stripe_events").insert({ id: ev.id, type: ev.type, tenant_id: tenantId });
  if (tenantId && ev.type !== "invoice.paid") await admin.from("audit_log").insert({ tenant_id: tenantId, action: "billing_update", entity: "tenant", entity_id: tenantId, details: { event: ev.type } });
  return json({ ok: true });
});
