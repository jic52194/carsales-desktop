// Client for the platform-level GoHighLevel connection (crm-connect) and the website scanner (site-scan).
import { supabase } from "@/lib/supabase";

async function invoke<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    const ctx = (error as any).context as Response | undefined; let msg = error.message;
    try { const j = ctx ? await ctx.json() : null; if (j?.error) msg = j.error; } catch {}
    throw new Error(/failed to fetch|networkerror/i.test(msg) ? "Can't reach the CarSales AI OS cloud right now — try again." : msg);
  }
  return data as T;
}

export interface CrmStatus { appConfigured: boolean; clientId: string | null; agencyConnected: boolean; companyId: string | null; connectedAt: string | null; redirectUri: string; webhookUrl: string; scopes: string[] }
export interface CrmLocation { id: string; name: string; city?: string; state?: string; linkedTenantId: string | null }
export interface CrmSnapshot { id: string; name: string; type?: string }
export const crmStatus = () => invoke<CrmStatus>("crm-connect", { action: "status" });
export const crmSaveApp = (clientId: string, clientSecret: string) => invoke<{ ok: boolean }>("crm-connect", { action: "save_app", clientId, clientSecret });
export const crmAuthorizeUrl = () => invoke<{ ok: boolean; url: string }>("crm-connect", { action: "authorize_url" });
export const crmLocations = () => invoke<{ ok: boolean; locations: CrmLocation[] }>("crm-connect", { action: "locations" });
export const crmSnapshots = () => invoke<{ ok: boolean; snapshots: CrmSnapshot[] }>("crm-connect", { action: "snapshots" });
export const crmCreateLocation = (tenantId: string, profile: any, snapshotId?: string) => invoke<{ ok: boolean; locationId: string; linked: boolean; linkError: string | null }>("crm-connect", { action: "create_location", tenantId, profile, snapshotId });
export const crmLinkLocation = (tenantId: string, locationId: string) => invoke<{ ok: boolean }>("crm-connect", { action: "link_location", tenantId, locationId });

export interface ScanProfile {
  name: string; website: string; phone: string; email: string; tagline: string;
  address: { street: string; city: string; state: string; zip: string };
  hours: Record<string, string>; logoUrl: string; ogImage: string; icon: string;
  colors: { primary: string; secondary: string; accent: string };
  social: Record<string, string>; creditAppUrl: string; inventoryUrl: string;
  inventory: { platform: string; code: string | null; dealerId: string | null; vehicles: number | null };
}
export const scanWebsite = (url: string) => invoke<{ ok: boolean; profile: ScanProfile; confidence: number }>("site-scan", { url });
