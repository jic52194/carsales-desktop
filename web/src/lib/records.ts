// Generic per-dealership records (appraisals, recon, lenders, templates, …) on Supabase `records`
// (tenant-isolated by RLS). Same cache + live-hook pattern as store.ts so modules render instantly
// from cache and refresh from the cloud.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getTenantId } from "@/lib/tenant";
import { getStoreFilter, filterByStore, STORE_EVT } from "@/lib/locations";

export interface Rec<T = Record<string, any>> { id: string; kind: string; createdAt: string; updatedAt: string; createdBy?: string; /** store (location); null = dealership-wide */ locationId?: string | null; data: T }
export type RecordKind =
  | "appraisal" | "recon" | "lender" | "floorplan" | "template" | "spiff" | "payplan" | "service_ticket" | "parts_order"
  | "warranty" | "title_reg" | "campaign" | "compliance_item" | "lot_spot" | "wholesale" | "auction" | "acquisition"
  | "ap_bill" | "doc_item" | "hr_employee" | "workflow" | "report" | "dashboard" | "video" | "kiosk_lead" | "deal_doc"
  | "credit_app" | "test_drive" | "fleet_vehicle" | "logistics" | "contract" | "note" | string;

const mem: Record<string, Rec[]> = {};
const EVT = "cso:records-changed";
const key = (kind: string) => `cso:${getTenantId()}:rec:${kind}`;
const fromRow = (r: any): Rec => ({ id: r.id, kind: r.kind, createdAt: r.created_at, updatedAt: r.updated_at ?? r.created_at, createdBy: r.created_by ?? undefined, locationId: r.location_id ?? null, data: r.data ?? {} });

function read(kind: string): Rec[] {
  if (mem[kind]) return mem[kind];
  try { const raw = localStorage.getItem(key(kind)); mem[kind] = raw ? JSON.parse(raw) : []; } catch { mem[kind] = []; }
  return mem[kind];
}
function write(kind: string, rows: Rec[]) {
  mem[kind] = rows;
  try { localStorage.setItem(key(kind), JSON.stringify(rows)); } catch {}
  window.dispatchEvent(new CustomEvent(EVT, { detail: kind }));
}
export function resetRecordsCache() { for (const k of Object.keys(mem)) delete mem[k]; }

export function listRecords<T = any>(kind: RecordKind): Rec<T>[] { return filterByStore(read(kind)) as Rec<T>[]; }
export function getRecord<T = any>(kind: RecordKind, id: string): Rec<T> | undefined { return read(kind).find((r) => r.id === id) as any; }

export async function refreshRecords<T = any>(kind: RecordKind): Promise<Rec<T>[]> {
  const { data, error } = await supabase.from("records").select("*").eq("kind", kind).order("created_at", { ascending: false }).limit(2000);
  if (error) throw error;
  const rows = (data ?? []).map(fromRow);
  write(kind, rows);
  return rows as Rec<T>[];
}
export async function addRecord<T = any>(kind: RecordKind, data: T, createdBy?: string, locationId?: string | null): Promise<Rec<T>> {
  // owner/admin looking at one store: new records land in that store (otherwise the DB stamps the creator's store)
  const loc = locationId !== undefined ? locationId : (getStoreFilter() || undefined);
  const ins: any = { kind, data, created_by: createdBy ?? null }; if (loc !== undefined) ins.location_id = loc;
  const { data: row, error } = await supabase.from("records").insert(ins).select().single();
  if (error) throw new Error(error.message);
  const rec = fromRow(row);
  write(kind, [rec, ...read(kind)]);
  return rec as Rec<T>;
}
export async function updateRecord<T = any>(kind: RecordKind, id: string, patch: Partial<T>): Promise<Rec<T> | undefined> {
  const cur = getRecord<T>(kind, id); if (!cur) return;
  const data = { ...cur.data, ...patch };
  const { data: row, error } = await supabase.from("records").update({ data }).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  const rec = fromRow(row);
  write(kind, read(kind).map((r) => (r.id === id ? rec : r)));
  return rec as Rec<T>;
}
export async function removeRecord(kind: RecordKind, id: string) {
  const { error } = await supabase.from("records").delete().eq("id", id);
  if (error) throw new Error(error.message);
  write(kind, read(kind).filter((r) => r.id !== id));
}

/** Live view of one kind: cached rows immediately, refreshed from the cloud, re-rendered on change. */
export function useRecords<T = any>(kind: RecordKind): Rec<T>[] {
  const [rows, setRows] = useState<Rec<T>[]>(() => listRecords<T>(kind));
  useEffect(() => {
    const h = (e: Event) => { const d = (e as CustomEvent).detail; if (d === kind || d === "*") setRows([...listRecords<T>(kind)]); };
    const s = () => setRows([...listRecords<T>(kind)]);
    window.addEventListener(EVT, h);
    window.addEventListener(STORE_EVT, s);
    setRows([...listRecords<T>(kind)]);
    refreshRecords<T>(kind).catch(() => {});
    return () => { window.removeEventListener(EVT, h); window.removeEventListener(STORE_EVT, s); };
  }, [kind]);
  return rows;
}
