// Client for CarSalesSoftware.com subscription billing (Edge Function `billing`; Stripe keys never reach the app).
import { supabase } from "@/lib/supabase";

export type PlanKey = "starter" | "pro" | "enterprise";
export interface PlanPrice { plan: PlanKey; id: string; amount: number | null; currency: string; interval: string | null; intervalCount: number; product: string | null; error?: string }
export interface BillingStatus { plan: string; status: string; periodEnd: string | null; trialEndsAt: string | null; hasCustomer: boolean; subscribed: boolean; demo: boolean; canManage: boolean; configured: boolean; prices: PlanPrice[] }
export interface BillingConfig { configured: boolean; mode?: "test" | "live"; webhook?: boolean; trialDays?: number; prices?: PlanPrice[] }

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("billing", { body });
  if (error) { let msg = error.message; try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch { /* keep */ } throw new Error(/failed to fetch|networkerror/i.test(msg) ? "Can't reach the CarSales AI OS cloud right now — try again." : msg); }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}
export const billingStatus = (tenantId?: string) => call<BillingStatus>({ action: "status", tenant_id: tenantId });
export const billingCheckout = (plan: PlanKey, tenantId?: string) => call<{ url: string }>({ action: "checkout", plan, tenant_id: tenantId });
export const billingPortal = (tenantId?: string) => call<{ url: string }>({ action: "portal", tenant_id: tenantId });
export const billingConfig = () => call<BillingConfig>({ action: "config" });
export const billingSaveConfig = (c: { secretKey?: string; webhookSecret?: string; prices?: Partial<Record<PlanKey, string>>; trialDays?: number }) => call<{ ok: true }>({ action: "save_config", ...c });

export const PLAN_LABEL: Record<string, string> = { trial: "Trial", starter: "Starter", pro: "Pro", enterprise: "Enterprise", demo: "Demo" };
export const STATUS_LABEL: Record<string, { label: string; tone: "good" | "warn" | "bad" | "muted" }> = {
  none: { label: "No subscription", tone: "muted" }, trialing: { label: "Free trial", tone: "good" }, active: { label: "Active", tone: "good" },
  past_due: { label: "Payment failed", tone: "bad" }, unpaid: { label: "Unpaid", tone: "bad" }, canceled: { label: "Canceled", tone: "muted" },
  incomplete: { label: "Waiting for payment", tone: "warn" }, incomplete_expired: { label: "Checkout expired", tone: "muted" }, paused: { label: "Paused", tone: "warn" },
};
export function money(p: PlanPrice) {
  if (p.amount == null) return "—";
  const v = (p.amount / 100).toLocaleString("en-US", { style: "currency", currency: (p.currency || "usd").toUpperCase(), maximumFractionDigits: p.amount % 100 ? 2 : 0 });
  const per = p.interval ? `/${p.intervalCount > 1 ? `${p.intervalCount} ${p.interval}s` : p.interval === "month" ? "mo" : p.interval}` : "";
  return v + per;
}
