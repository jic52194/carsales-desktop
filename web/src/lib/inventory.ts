// Tenant-scoped inventory store. Seeds from the tenant's bundled import on first run,
// then lives in localStorage (key `vibe_inventory`, which the existing pages already read).
// Cloud version: replace load/save with Supabase `vehicles` table scoped by tenant_id.
import { useEffect, useState } from "react";
import { getTenant, getTenantId } from "@/lib/tenant";
import bestpriceInventory from "@/tenants/bestprice-inventory.json";

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
  price: number | null;      // null => "Call for price"
  cost?: number | null;      // dealer-entered
  exteriorColor?: string | null;
  interiorColor?: string | null;
  transmission?: string | null;
  drivetrain?: string | null;
  engine?: string | null;
  fuelType?: string | null;
  mpg?: string | null;
  images: string[];
  sourceUrl?: string;
  description?: string;
  features: string[];
  status: string;
  source?: string;
  daysInStock?: number;
  addedAt?: string;
}

const SEEDS: Record<string, Vehicle[]> = {
  bestprice: bestpriceInventory as unknown as Vehicle[],
};

const KEY = "vibe_inventory";
const SEED_KEY = "cso_inventory_seed";

export const PLACEHOLDER_IMG = "/placeholder.svg";

export function loadInventory(): Vehicle[] {
  const tenant = getTenant();
  const stamp = `${tenant.id}:${tenant.seedVersion}`;
  try {
    const seeded = localStorage.getItem(SEED_KEY);
    const saved = localStorage.getItem(KEY);
    if (seeded === stamp && saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  const seed = (SEEDS[tenant.id] ?? []).map((v) => ({ ...v, addedAt: v.addedAt ?? tenant.subscribedAt }));
  try {
    localStorage.setItem(KEY, JSON.stringify(seed));
    localStorage.setItem(SEED_KEY, stamp);
  } catch {}
  return seed;
}

export function saveInventory(list: Vehicle[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("cso:inventory-changed"));
}

export function upsertVehicle(v: Vehicle) {
  const list = loadInventory();
  const i = list.findIndex((x) => x.id === v.id);
  if (i >= 0) list[i] = v; else list.unshift({ ...v, tenantId: getTenantId() });
  saveInventory(list);
}

export function getVehicle(id: string): Vehicle | undefined {
  return loadInventory().find((v) => v.id === id);
}

export function useInventory(): Vehicle[] {
  const [list, set] = useState<Vehicle[]>(loadInventory);
  useEffect(() => {
    const h = () => set(loadInventory());
    window.addEventListener("cso:inventory-changed", h);
    window.addEventListener("cso:tenant-changed", h);
    return () => { window.removeEventListener("cso:inventory-changed", h); window.removeEventListener("cso:tenant-changed", h); };
  }, []);
  return list;
}

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
