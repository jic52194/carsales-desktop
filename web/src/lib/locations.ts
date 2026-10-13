// Stores (locations) inside a dealership group, plus the owner/admin "which store am I looking at" filter.
// Store-bound users never see the filter: RLS already limits their rows to their own store.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSessionInfo, locationFromRow, type Location } from "@/lib/auth";

export type { Location };

const LOC_EVT = "cso:locations-changed";
export const STORE_EVT = "cso:store-changed";
const STORE_KEY = "cso:store";

// ---- store filter ("" = all stores) ----
let storeFilter: string = (() => { try { return localStorage.getItem(STORE_KEY) ?? ""; } catch { return ""; } })();
export function getStoreFilter(): string { return storeFilter; }
export function setStoreFilter(id: string) {
  storeFilter = id || "";
  try { if (storeFilter) localStorage.setItem(STORE_KEY, storeFilter); else localStorage.removeItem(STORE_KEY); } catch {}
  window.dispatchEvent(new Event(STORE_EVT));
  // wake every cached collection so pages re-render with the new filter
  window.dispatchEvent(new CustomEvent("cso:data-changed", { detail: "*" }));
  window.dispatchEvent(new Event("cso:inventory-changed"));
  window.dispatchEvent(new CustomEvent("cso:records-changed", { detail: "*" }));
}
/** Live value of the store filter. */
export function useStoreFilter(): string {
  const [v, setV] = useState(storeFilter);
  useEffect(() => { const h = () => setV(storeFilter); window.addEventListener(STORE_EVT, h); return () => window.removeEventListener(STORE_EVT, h); }, []);
  return v;
}
/** Apply the current filter to rows that carry `locationId`. Rows with no store (null) are dealership-wide and always shown. */
export function filterByStore<T extends { locationId?: string | null }>(rows: T[]): T[] {
  if (!storeFilter) return rows;
  return rows.filter((r) => !r.locationId || r.locationId === storeFilter);
}

// ---- locations cache ----
let cache: Location[] | null = null;
function current(): Location[] { return cache ?? getSessionInfo().locations; }
function publish(list: Location[]) { cache = list; window.dispatchEvent(new Event(LOC_EVT)); }

export function listLocations(): Location[] { return current(); }
export async function refreshLocations(): Promise<Location[]> {
  const { data, error } = await supabase.from("locations").select("*").order("is_default", { ascending: false }).order("name");
  if (error) throw error;
  const list = (data ?? []).map(locationFromRow);
  publish(list);
  return list;
}
export function useLocations(): Location[] {
  const [list, set] = useState<Location[]>(current);
  useEffect(() => {
    const h = () => set([...current()]);
    window.addEventListener(LOC_EVT, h);
    window.addEventListener("cso:tenant-changed", h);
    if (!cache) refreshLocations().catch(() => {});
    return () => { window.removeEventListener(LOC_EVT, h); window.removeEventListener("cso:tenant-changed", h); };
  }, []);
  return list;
}
export function getLocation(id?: string | null): Location | undefined { return id ? current().find((l) => l.id === id) : undefined; }

export function slugify(name: string) { return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "store"; }

export interface LocationInput { slug?: string; name: string; brandName?: string | null; logoUrl?: string | null; colors?: any; phone?: string | null; address?: any; isDefault?: boolean; active?: boolean }
function toRow(p: Partial<LocationInput>) {
  const r: any = {};
  if (p.slug !== undefined) r.slug = p.slug;
  if (p.name !== undefined) r.name = p.name;
  if (p.brandName !== undefined) r.brand_name = p.brandName || null;
  if (p.logoUrl !== undefined) r.logo_url = p.logoUrl || null;
  if (p.colors !== undefined) r.colors = p.colors;
  if (p.phone !== undefined) r.phone = p.phone || null;
  if (p.address !== undefined) r.address = p.address;
  if (p.isDefault !== undefined) r.is_default = p.isDefault;
  if (p.active !== undefined) r.active = p.active;
  return r;
}

export async function createLocation(input: LocationInput): Promise<Location> {
  const name = input.name.trim(); if (!name) throw new Error("Store name required");
  const { data, error } = await supabase.from("locations").insert(toRow({ ...input, name, slug: input.slug?.trim() || slugify(name), isDefault: !!input.isDefault })).select().single();
  if (error) throw new Error(error.message);
  const loc = locationFromRow(data);
  if (loc.isDefault) await clearOtherDefaults(loc.id);
  await refreshLocations();
  return loc;
}
export async function updateLocation(id: string, patch: Partial<LocationInput>): Promise<Location> {
  const { data, error } = await supabase.from("locations").update(toRow(patch)).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  const loc = locationFromRow(data);
  if (patch.isDefault) await clearOtherDefaults(id);
  await refreshLocations();
  return loc;
}
export async function setDefault(id: string) {
  const { error } = await supabase.from("locations").update({ is_default: true }).eq("id", id);
  if (error) throw new Error(error.message);
  await clearOtherDefaults(id);
  await refreshLocations();
}
async function clearOtherDefaults(keepId: string) {
  const { error } = await supabase.from("locations").update({ is_default: false }).neq("id", keepId).eq("is_default", true);
  if (error) throw new Error(error.message);
}
