// Multi-tenant layer for CarSales AI OS.
// A tenant = one dealership account. Today tenants are static configs bundled with the app
// (plus per-tenant localStorage namespacing); the cloud version swaps `loadTenant` for Supabase.

import { useEffect, useState } from "react";
import { BESTPRICE_TENANT } from "@/tenants/bestprice";

export interface TenantHours { [day: string]: string }

export interface Tenant {
  id: string;            // stable key, e.g. "bestprice" (slug)
  dbId?: string;         // tenants.id in Supabase
  slug: string;          // URL / login slug
  name: string;          // display name
  legalName?: string;
  tagline?: string;
  address: { street: string; city: string; state: string; zip: string };
  secondLocation?: { street: string; city: string; state: string; zip: string; note?: string };
  phone: string;
  email?: string | null;
  website: string;
  hours: TenantHours;
  logoUrl: string;
  logoDarkUrl?: string;
  colors: { primary: string; secondary: string; accent: string; estimated?: boolean };
  social?: { facebook?: string; instagram?: string; google?: string };
  googleMapsUrl?: string;
  financing: { creditAppUrl?: string; notes: string[] };
  disclaimers: string[];
  inventorySource?: { platform: string; dealerId?: string; feedUrl?: string };
  plan: "trial" | "starter" | "pro" | "enterprise";
  subscribedAt: string;
  seedVersion: number;   // bump to re-seed inventory/customers on next launch
  aiVoice?: AiVoice;     // brand voice for the AI assistant (Settings → AI Voice)
}

export type AiVoicePreset = "professional" | "friendly" | "felipe" | "custom";
export type AiVoiceScope = "staff" | "light" | "everywhere";
export interface AiVoice { preset: AiVoicePreset; scope: AiVoiceScope; name?: string; persona?: string;
  /** Inbound texts: off, write a draft reply in the Inbox, or send automatically (with guardrails). */
  autoReply?: "off" | "draft" | "auto";
  /** Text back callers we missed (needs the missed-call GHL workflow). */
  missedCall?: boolean;
  /** Text the morning brief to this number at 8:15 AM. */
  briefPhone?: string }

export const DEMO_TENANT: Tenant = {
  id: "demo",
  slug: "demo",
  name: "CarSales AI OS Demo Dealership",
  tagline: "Interactive demo",
  address: { street: "1 Demo Way", city: "Boston", state: "MA", zip: "02110" },
  phone: "(207) 222-7737",
  email: "contact@casperb2b.com",
  website: "https://carsalessoftware.com",
  hours: { Monday: "9:00 am - 7:00 pm", Tuesday: "9:00 am - 7:00 pm", Wednesday: "9:00 am - 7:00 pm", Thursday: "9:00 am - 7:00 pm", Friday: "9:00 am - 7:00 pm", Saturday: "9:00 am - 5:00 pm", Sunday: "Closed" },
  logoUrl: "https://assets.cdn.filesafe.space/C0zjPUHUreayXhYgJtbb/media/69ee67ab0d66f2a665601086.png",
  colors: { primary: "#2563eb", secondary: "#0f172a", accent: "#f59e0b" },
  financing: { notes: [] },
  disclaimers: [],
  plan: "trial",
  subscribedAt: "2026-05-30",
  seedVersion: 1,
};

export const TENANTS: Record<string, Tenant> = {
  [BESTPRICE_TENANT.id]: BESTPRICE_TENANT,
  [DEMO_TENANT.id]: DEMO_TENANT,
};

export const DEFAULT_TENANT_ID = BESTPRICE_TENANT.id;
const TENANT_KEY = "cso_tenant_id";

// ---- live tenant (from Supabase `tenants` via me()) ----
let liveTenant: Tenant | null = null;
export function tenantFromRow(r: any): Tenant {
  return {
    id: r.slug, slug: r.slug, dbId: r.id, name: r.name, legalName: r.legal_name ?? undefined, tagline: r.tagline ?? undefined,
    address: r.address ?? { street: "", city: "", state: "", zip: "" }, secondLocation: r.second_location ?? undefined,
    phone: r.phone ?? "", email: r.email ?? null, website: r.website ?? "", hours: r.hours ?? {},
    logoUrl: r.logo_url ?? "", colors: r.colors ?? { primary: "#2563eb", secondary: "#0f172a", accent: "#f59e0b" },
    social: r.social ?? {}, googleMapsUrl: undefined, financing: r.financing ?? { notes: [] }, disclaimers: r.disclaimers ?? [],
    inventorySource: r.inventory_source ?? undefined, plan: r.plan ?? "starter", subscribedAt: r.created_at ?? "", seedVersion: 0,
    aiVoice: r.ai_voice ?? { preset: "professional", scope: "staff" },
    ...( { onboarding: r.onboarding ?? null, intakeKey: r.intake_key ?? null, automationKey: r.automation_key ?? null } as any ),
  };
}
export function setLiveTenant(row: any) {
  if (!row) return;
  liveTenant = tenantFromRow(row);
  try { localStorage.setItem(TENANT_KEY, liveTenant.id); } catch {}
  window.dispatchEvent(new Event("cso:tenant-changed"));
}
export function clearLiveTenant() { liveTenant = null; }
export function getLiveTenant() { return liveTenant; }

export function getTenantId(): string {
  if (liveTenant) return liveTenant.id;
  try {
    const q = new URLSearchParams(window.location.search).get("tenant");
    if (q && TENANTS[q]) { localStorage.setItem(TENANT_KEY, q); return q; }
    const saved = localStorage.getItem(TENANT_KEY);
    if (saved && TENANTS[saved]) return saved;
  } catch {}
  return DEFAULT_TENANT_ID;
}

const OVERRIDES_KEY = (id: string) => `cso_tenant_overrides:${id}`;
const ONBOARDED_KEY = (id: string) => `cso_onboarded:${id}`;

export function getTenant(): Tenant {
  const id = getTenantId();
  const base = liveTenant ?? TENANTS[id] ?? TENANTS[DEFAULT_TENANT_ID];
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY(base.id));
    if (raw) return { ...base, ...JSON.parse(raw) };
  } catch {}
  return base;
}

/** Persist dealer edits from onboarding/settings on top of the bundled tenant config. */
/** Persist dealer edits: writes the tenants row in Supabase (admin RLS) and updates the live tenant. */
export async function saveTenantOverrides(patch: Partial<Tenant>) {
  const cur = getTenant();
  const row: Record<string, any> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.legalName !== undefined) row.legal_name = patch.legalName;
  if (patch.phone !== undefined) row.phone = patch.phone;
  if (patch.email !== undefined) row.email = patch.email;
  if (patch.website !== undefined) row.website = patch.website;
  if (patch.address !== undefined) row.address = patch.address;
  if (patch.logoUrl !== undefined) row.logo_url = patch.logoUrl;
  if (patch.colors !== undefined) row.colors = patch.colors;
  if (patch.hours !== undefined) row.hours = patch.hours;
  if (patch.aiVoice !== undefined) row.ai_voice = patch.aiVoice;
  if (cur.dbId) {
    const { supabase } = await import("@/lib/supabase");
    const { data, error } = await supabase.from("tenants").update(row).eq("id", cur.dbId).select().single();
    if (error) throw new Error(error.message);
    setLiveTenant(data);
    try { const me = JSON.parse(localStorage.getItem("cso:me") || "null"); if (me) { me.tenant = data; localStorage.setItem("cso:me", JSON.stringify(me)); } } catch {}
  } else {
    const id = getTenantId();
    let prev: Partial<Tenant> = {};
    try { prev = JSON.parse(localStorage.getItem(OVERRIDES_KEY(id)) || "{}"); } catch {}
    localStorage.setItem(OVERRIDES_KEY(id), JSON.stringify({ ...prev, ...patch }));
    window.dispatchEvent(new Event("cso:tenant-changed"));
  }
}

/**
 * Onboarding is a dealership-level confirmation. It counts as done only when a user who belongs to the
 * dealership (owner/admin) completes it. Platform super-admins can walk through it to preview, but that
 * does not confirm the dealership's information — the dealer's first login still gets the wizard.
 */
export interface OnboardingRecord { completedBy: string; completedByName: string; role: string; at: string; preview?: boolean }

export function getOnboarding(): OnboardingRecord | null {
  const live = liveTenant as any;
  if (live && live.onboarding) return live.onboarding as OnboardingRecord;
  try { const r = localStorage.getItem(ONBOARDED_KEY(getTenantId())); if (!r) return null; return r === "true" ? { completedBy: "legacy", completedByName: "", role: "owner", at: "" } : JSON.parse(r); } catch { return null; }
}
export function isOnboarded(): boolean {
  const r = getOnboarding();
  return !!r && !r.preview;
}
/** Has this specific user already been through the wizard (used so a super-admin preview doesn't loop)? */
export function hasPreviewedOnboarding(userId: string): boolean {
  try { return localStorage.getItem(`${ONBOARDED_KEY(getTenantId())}:preview:${userId}`) === "true"; } catch { return false; }
}
export function markOnboarded(user: { id: string; fullName: string; role: string }) {
  const preview = user.role === "super_admin";
  if (preview) { localStorage.setItem(`${ONBOARDED_KEY(getTenantId())}:preview:${user.id}`, "true"); return; }
  const rec: OnboardingRecord = { completedBy: user.id, completedByName: user.fullName, role: user.role, at: new Date().toISOString() };
  localStorage.setItem(ONBOARDED_KEY(getTenantId()), JSON.stringify(rec));
  if (liveTenant?.dbId) {
    (liveTenant as any).onboarding = rec;
    import("@/lib/supabase").then(({ supabase }) => supabase.from("tenants").update({ onboarding: rec }).eq("id", liveTenant!.dbId!).then(() => {}));
  }
}
export function resetOnboarding() {
  const base = ONBOARDED_KEY(getTenantId());
  Object.keys(localStorage).filter((k) => k.startsWith(base)).forEach((k) => localStorage.removeItem(k));
  if (liveTenant?.dbId) {
    (liveTenant as any).onboarding = null;
    import("@/lib/supabase").then(({ supabase }) => supabase.from("tenants").update({ onboarding: null }).eq("id", liveTenant!.dbId!).then(() => {}));
  }
}

export function setTenant(id: string) {
  if (!TENANTS[id]) throw new Error(`Unknown tenant ${id}`);
  localStorage.setItem(TENANT_KEY, id);
  window.dispatchEvent(new Event("cso:tenant-changed"));
}

/** React hook — re-renders on tenant switch. */
export function useTenant(): Tenant {
  const [tenant, set] = useState<Tenant>(getTenant);
  useEffect(() => {
    const h = () => set(getTenant());
    window.addEventListener("cso:tenant-changed", h);
    return () => window.removeEventListener("cso:tenant-changed", h);
  }, []);
  return tenant;
}

// ---- theming: push tenant brand colors into the shadcn CSS variables ----
function hexToHsl(hex: string): string | null {
  const m = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  const r = parseInt(m[1], 16) / 255, g = parseInt(m[2], 16) / 255, b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function applyTenantTheme(t: Tenant = getTenant()) {
  const root = document.documentElement;
  const p = hexToHsl(t.colors.primary);
  if (p) { root.style.setProperty("--primary", p); root.style.setProperty("--ring", p); root.style.setProperty("--sidebar-primary", p); }
  const a = hexToHsl(t.colors.accent);
  if (a) root.style.setProperty("--accent-brand", a);
  document.title = `${t.name} — CarSales AI OS`;
}

/** Back to platform (CarSalesSoftware.com) colors — used on the sign-in screen. */
export function resetTheme() {
  const root = document.documentElement;
  ["--primary", "--ring", "--sidebar-primary", "--accent-brand"].forEach((k) => root.style.removeProperty(k));
  document.title = "CarSales AI OS";
}

export function formatAddress(t: Tenant) {
  return `${t.address.street}, ${t.address.city}, ${t.address.state} ${t.address.zip}`;
}

/** Namespaced localStorage key so tenants on the same machine never share data. */
export function tkey(key: string, tenantId = getTenantId()) {
  return `${tenantId}:${key}`;
}
