// Platform (CarSalesSoftware.com) administration — super_admin only.
// Every call is enforced server-side (is_super_admin()); this file is just the client surface.
import { supabase } from "@/lib/supabase";
import { resetStoreCache } from "@/lib/store";
import { resetInventoryCache } from "@/lib/inventory";
import { resetRecordsCache } from "@/lib/records";

/** Turn raw network errors into something a dealer can act on. */
export function friendly(e: any): string {
  const m = String(e?.message || e || "");
  return /failed to fetch|networkerror|load failed|fetch/i.test(m) ? "Can't reach the CarSales AI OS cloud right now. Check your internet connection and try again." : m;
}

export interface PlatformTenant {
  id: string; slug: string; name: string; website: string | null; phone: string | null; status: string; plan: string;
  created_at: string; logo_url: string | null; onboarded: boolean; users: number; vehicles: number; leads: number; current: boolean;
}

export interface NewDealership {
  name: string; legal_name?: string; phone?: string; email?: string; website?: string; logo_url?: string;
  address?: { street: string; city: string; state: string; zip: string };
  colors?: { primary: string; secondary: string; accent: string };
  inventory_source?: { platform: string; dealerId?: string };
  plan?: string;
}

export async function listTenants(): Promise<PlatformTenant[]> {
  const { data, error } = await supabase.rpc("platform_tenants");
  if (error) throw new Error(friendly(error));
  return (data ?? []) as PlatformTenant[];
}

export async function createTenant(d: NewDealership, owner: { username: string; password: string; fullName: string; email?: string }): Promise<{ id: string; slug: string; owner_id: string }> {
  const username = owner.username.trim().toLowerCase();
  if (!d.name.trim()) throw new Error("Dealership name is required");
  if (!/^[a-z0-9][a-z0-9._-]{1,62}$/.test(username)) throw new Error("Owner username: 2-63 chars — letters, numbers, dot, dash, underscore");
  if (owner.password.length < 8) throw new Error("Owner password must be at least 8 characters");
  const { data, error } = await supabase.rpc("platform_create_tenant", { p: d, p_owner_username: username, p_owner_password: owner.password, p_owner_name: owner.fullName.trim() || "Owner", p_owner_email: owner.email?.trim() || null });
  if (error) throw new Error(friendly(error));
  return data as any;
}

/** Move the signed-in super admin into another dealership, then reload so every cache rebuilds for that tenant. */
export async function switchTenant(tenantId: string): Promise<void> {
  const { data, error } = await supabase.rpc("platform_switch_tenant", { p_tenant: tenantId });
  if (error) throw new Error(friendly(error));
  try { localStorage.setItem("cso:me", JSON.stringify(data)); } catch {}
  resetStoreCache(); resetInventoryCache(); resetRecordsCache();
  window.location.reload();
}

export async function updateTenant(tenantId: string, patch: { status?: "active" | "suspended"; plan?: string }): Promise<void> {
  const { error } = await supabase.rpc("platform_update_tenant", { p_tenant: tenantId, p_status: patch.status ?? null, p_plan: patch.plan ?? null });
  if (error) throw new Error(friendly(error));
}
