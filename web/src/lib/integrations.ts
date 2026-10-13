// Third-party connections for the dealership. Keys go to the `integrations` Edge Function and are stored
// server-side only; the app never sees them again.
import { supabase } from "@/lib/supabase";

export type Provider = "ghl" | "carfax" | "marketcheck" | "kbb" | "routeone" | "dealertrack" | "stripe";
export interface Integration { id: string; provider: Provider; status: "needs_key" | "connected" | "error" | "disabled"; config: Record<string, any>; hasSecret: boolean; connectedAt?: string; lastError?: string | null }

export const PROVIDERS: { key: Provider; label: string; group: string; what: string; secretLabel: string; fields?: { key: string; label: string; placeholder?: string }[]; selfServe: boolean; note?: string }[] = [
  { key: "ghl", label: "GoHighLevel (SMS, email, calendars)", group: "Communication", what: "Texting, email and appointment calendars for leads and customers.", secretLabel: "Private Integration token", fields: [{ key: "locationId", label: "Sub-account (location) ID" }], selfServe: true },
  { key: "marketcheck", label: "MarketCheck (market pricing & valuations)", group: "Vehicle data", what: "Comparable listings, market price ranges and days-to-sell for appraisals and desking.", secretLabel: "API key", selfServe: true, note: "Sign up at marketcheck.com — a free developer key works." },
  { key: "kbb", label: "Kelley Blue Book ICO", group: "Vehicle data", what: "Instant Cash Offer trade values.", secretLabel: "Dealer API key", selfServe: false, note: "Requires a KBB dealer agreement." },
  { key: "carfax", label: "CARFAX", group: "Vehicle data", what: "Vehicle history reports. Links work today without a key; a dealer account enables embedded reports.", secretLabel: "CARFAX dealer API key", selfServe: false },
  { key: "routeone", label: "RouteOne (credit applications)", group: "F&I", what: "Submit credit apps to Capital One, Credit Acceptance and other lenders.", secretLabel: "Dealer credentials token", selfServe: false, note: "Set up through your RouteOne rep; Best Price already uses Capital One Auto Navigator + Credit Acceptance." },
  { key: "dealertrack", label: "Dealertrack", group: "F&I", what: "Alternative lender portal / DMS bridge.", secretLabel: "API token", selfServe: false },
  { key: "stripe", label: "Stripe (CarSales AI OS billing)", group: "Platform", what: "Subscription billing for the software itself.", secretLabel: "Restricted API key", selfServe: false, note: "Platform-level — managed by CarSalesSoftware.com." },
];

export async function listIntegrations(): Promise<Integration[]> {
  const { data, error } = await supabase.from("integrations").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({ id: r.id, provider: r.provider, status: r.status, config: r.config ?? {}, hasSecret: r.has_secret, connectedAt: r.connected_at, lastError: r.last_error }));
}
export async function connectIntegration(provider: Provider, secret: string, config: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke("integrations", { body: { action: "connect", provider, secret, config } });
  if (error) { const ctx = (error as any).context as Response | undefined; let msg = error.message; try { const j = ctx ? await ctx.json() : null; if (j?.error) msg = j.error; } catch {} throw new Error(msg); }
  return data as { ok: boolean; status: string; error?: string | null };
}
export async function disconnectIntegration(provider: Provider) {
  const { error } = await supabase.functions.invoke("integrations", { body: { action: "disconnect", provider } });
  if (error) throw new Error(error.message);
}

/** Free CARFAX report link (dealer-partner URL pattern) — works without any integration. */
export const carfaxUrl = (vin: string) => `https://www.carfax.com/VehicleHistory/p/Report.cfx?partner=DVW_1&vin=${encodeURIComponent(vin)}`;
