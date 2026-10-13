// Tenant inventory on Supabase `vehicles` (RLS-scoped), with a local cache so the app opens offline.
import { useEffect, useState } from "react";
import { supabase, isOnline } from "@/lib/supabase";
import { getTenantId, getLiveTenant } from "@/lib/tenant";
import { getStoreFilter, filterByStore, STORE_EVT } from "@/lib/locations";

export interface Vehicle {
  id: string;
  tenantId: string;
  stockNumber: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  bodyStyle?: string | null;
  mileage: number;
  price: number | null;
  cost?: number | null;
  exteriorColor?: string | null;
  interiorColor?: string | null;
  transmission?: string | null;
  drivetrain?: string | null;
  engine?: string | null;
  fuelType?: string | null;
  mpg?: string | null;
  images: string[];
  sourceUrl?: string | null;
  description?: string | null;
  features: string[];
  status: string;
  source?: string | null;
  externalId?: string | null;
  daysInStock?: number;
  addedAt?: string;
  updatedAt?: string;
  /** store (location) this unit sits at; null = dealership-wide */
  locationId?: string | null;
}

const KEY = () => `cso:${getTenantId()}:vehicles`;
const EVT = "cso:inventory-changed";
export const PLACEHOLDER_IMG = "/placeholder.svg";

function fromRow(r: any): Vehicle {
  return {
    id: r.id, tenantId: r.tenant_id, stockNumber: r.stock_number, vin: r.vin ?? "", year: r.year, make: r.make, model: r.model, trim: r.trim ?? "",
    bodyStyle: r.body_style, mileage: r.mileage ?? 0, price: r.price == null ? null : Number(r.price), cost: r.cost == null ? null : Number(r.cost),
    exteriorColor: r.exterior_color, interiorColor: r.interior_color, transmission: r.transmission, drivetrain: r.drivetrain, engine: r.engine,
    fuelType: r.fuel_type, mpg: r.mpg, images: r.images ?? [], sourceUrl: r.source_url, description: r.description, features: r.features ?? [],
    status: r.status, source: r.source, externalId: r.external_id, addedAt: r.added_at, updatedAt: r.updated_at, locationId: r.location_id ?? null,
  };
}
function toRow(v: Partial<Vehicle>) {
  const r: any = {};
  const m: Record<string, string> = { stockNumber: "stock_number", vin: "vin", year: "year", make: "make", model: "model", trim: "trim", bodyStyle: "body_style", mileage: "mileage", price: "price", cost: "cost", exteriorColor: "exterior_color", interiorColor: "interior_color", transmission: "transmission", drivetrain: "drivetrain", engine: "engine", fuelType: "fuel_type", mpg: "mpg", images: "images", sourceUrl: "source_url", description: "description", features: "features", status: "status", source: "source", externalId: "external_id", locationId: "location_id" };
  for (const [k, col] of Object.entries(m)) if ((v as any)[k] !== undefined) r[col] = (v as any)[k];
  return r;
}

let cache: Vehicle[] | null = null;
function readCache(): Vehicle[] {
  if (cache) return cache;
  try { const raw = localStorage.getItem(KEY()); cache = raw ? JSON.parse(raw) : []; } catch { cache = []; }
  return cache!;
}
function writeCache(list: Vehicle[]) {
  cache = list;
  try { localStorage.setItem(KEY(), JSON.stringify(list)); } catch {}
  window.dispatchEvent(new Event(EVT));
}

/** Synchronous read (cache). Pages render from this immediately; refreshInventory() updates it from the DB. */
export function loadInventory(): Vehicle[] { return filterByStore(readCache()); }

let inflight: Promise<Vehicle[]> | null = null;
export async function refreshInventory(): Promise<Vehicle[]> {
  if (!isOnline()) return readCache();
  if (inflight) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase.from("vehicles").select("*").order("added_at", { ascending: false }).limit(2000);
    if (error) throw error;
    const list = (data ?? []).map(fromRow);
    writeCache(list);
    return list;
  })().finally(() => { inflight = null; });
  return inflight;
}

export async function upsertVehicle(v: Vehicle): Promise<Vehicle> {
  const isNew = !v.id || v.id.startsWith("new-");
  // owner/admin looking at one store: new units land in that store (otherwise the DB stamps the creator's store)
  const row = toRow(isNew && v.locationId === undefined && getStoreFilter() ? { ...v, locationId: getStoreFilter() } : v);
  const q = isNew ? supabase.from("vehicles").insert(row).select().single() : supabase.from("vehicles").update(row).eq("id", v.id).select().single();
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const saved = fromRow(data);
  const list = readCache();
  const i = list.findIndex((x) => x.id === saved.id);
  if (i >= 0) list[i] = saved; else list.unshift(saved);
  writeCache([...list]);
  return saved;
}

export async function deleteVehicle(id: string) {
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) throw new Error(error.message);
  writeCache(readCache().filter((v) => v.id !== id));
}

export function getVehicle(id: string): Vehicle | undefined { return readCache().find((v) => v.id === id); }

export function useInventory(): Vehicle[] {
  const [list, set] = useState<Vehicle[]>(loadInventory);
  useEffect(() => {
    const h = () => set([...loadInventory()]);
    const t = () => { cache = null; h(); };
    window.addEventListener(EVT, h);
    window.addEventListener(STORE_EVT, h);
    window.addEventListener("cso:tenant-changed", t);
    refreshInventory().catch(() => {});
    return () => { window.removeEventListener(EVT, h); window.removeEventListener(STORE_EVT, h); window.removeEventListener("cso:tenant-changed", t); };
  }, []);
  return list;
}
export function resetInventoryCache() { cache = null; }

// ---- display helpers ----
export const vTitle = (v: Vehicle) => `${v.year} ${v.make} ${v.model}${v.trim ? " " + v.trim : ""}`.trim();
export const vPrice = (v: Vehicle) => (v.price == null ? "Call for price" : `$${v.price.toLocaleString()}`);
export const vMiles = (v: Vehicle) => `${(v.mileage ?? 0).toLocaleString()}`;
export const vImage = (v: Vehicle) => v.images?.[0] || PLACEHOLDER_IMG;
export function vDaysInStock(v: Vehicle) {
  if (v.daysInStock != null) return v.daysInStock;
  if (!v.addedAt) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(v.addedAt).getTime()) / 86400000));
}

// ---- photos (Supabase Storage bucket `vehicle-photos`, path <tenant uuid>/<vehicle id>/<file>) ----
export async function uploadVehiclePhotos(vehicleId: string, files: FileList | File[]): Promise<string[]> {
  const tenantDb = getLiveTenant()?.dbId;
  if (!tenantDb) throw new Error("Not signed in");
  const urls: string[] = [];
  for (const f of Array.from(files)) {
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) throw new Error(`${f.name}: only JPG, PNG or WebP`);
    if (f.size > 10 * 1024 * 1024) throw new Error(`${f.name}: max 10 MB`);
    const ext = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
    const path = `${tenantDb}/${vehicleId}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("vehicle-photos").upload(path, f, { contentType: f.type, cacheControl: "31536000" });
    if (error) throw new Error(error.message);
    urls.push(supabase.storage.from("vehicle-photos").getPublicUrl(path).data.publicUrl);
  }
  return urls;
}
