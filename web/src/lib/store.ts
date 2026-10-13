// Tenant-scoped collections on Supabase (customers / leads / deals / tasks / appointments / activity),
// each with a local cache so pages render instantly and still open offline.
import { useEffect, useState } from "react";
import { supabase, isOnline } from "@/lib/supabase";
import { getTenantId } from "@/lib/tenant";
import { getStoreFilter, filterByStore, STORE_EVT } from "@/lib/locations";

export interface BaseRow { id: string; tenantId: string; createdAt: string; updatedAt: string; /** store (location) the row belongs to; null/undefined = dealership-wide */ locationId?: string | null }

export interface Customer extends BaseRow {
  firstName: string; lastName: string; phone?: string; email?: string;
  address?: string; city?: string; state?: string; zip?: string;
  source?: string; notes?: string; ownerId?: string;
}
export type LeadStage = "new" | "contacted" | "appointment" | "negotiating" | "sold" | "lost";
export interface Lead extends BaseRow {
  customerId: string; vehicleId?: string; stage: LeadStage; source?: string;
  assignedTo?: string; notes?: string; lastActivityAt?: string;
}
export type DealStatus = "working" | "pending_approval" | "approved" | "funded" | "delivered" | "dead";
export interface Deal extends BaseRow {
  customerId: string; vehicleId?: string; salespersonId?: string; status: DealStatus;
  sellingPrice: number; cashDown: number; tradeAllowance: number; tradePayoff: number; tradeAcv: number;
  docFee: number; taxRate: number; nonTaxableFees: number;
  warrantyRetail: number; warrantyCost: number; gapRetail: number; gapCost: number;
  termMonths: number; apr: number; bankFee: number; dealerReserve: number; pack: number;
  monthlyPayment: number; amountFinanced: number; frontEndGross: number; backEndGross: number; totalGross: number;
  notes?: string;
}
export interface Task extends BaseRow {
  title: string; dueAt?: string; status: "open" | "done"; priority: "low" | "normal" | "high";
  assignedTo?: string; relatedType?: "customer" | "lead" | "deal" | "vehicle"; relatedId?: string; notes?: string;
}
export interface Appointment extends BaseRow {
  customerId?: string; vehicleId?: string; type: "test_drive" | "sales" | "delivery" | "service" | "other";
  startsAt: string; endsAt?: string; status: "scheduled" | "confirmed" | "showed" | "no_show" | "cancelled";
  assignedTo?: string; notes?: string;
}
export interface Activity extends BaseRow {
  userId?: string; action: string; entity: string; entityId?: string; details?: string;
}

export type CollectionName = "customers" | "leads" | "deals" | "tasks" | "appointments" | "activity";
type RowOf<N extends CollectionName> =
  N extends "customers" ? Customer : N extends "leads" ? Lead : N extends "deals" ? Deal :
  N extends "tasks" ? Task : N extends "appointments" ? Appointment : Activity;

// ---- row mapping ----
const base = (r: any) => ({ id: String(r.id), tenantId: r.tenant_id, createdAt: r.created_at, updatedAt: r.updated_at ?? r.created_at, locationId: r.location_id ?? null });
/** Collections that carry a store id (customers are dealership-wide). */
const STORE_SCOPED: ReadonlySet<CollectionName> = new Set<CollectionName>(["leads", "deals", "appointments", "activity"]);
const STAMP_ON_INSERT: ReadonlySet<CollectionName> = new Set<CollectionName>(["leads", "deals", "appointments"]);
const num = (x: any) => (x == null ? 0 : Number(x));
const MAP: { [N in CollectionName]: { table: string; from: (r: any) => RowOf<N>; to: (v: Partial<RowOf<N>>) => any; order: string } } = {
  customers: {
    table: "customers", order: "created_at",
    from: (r) => ({ ...base(r), firstName: r.first_name, lastName: r.last_name ?? "", phone: r.phone ?? undefined, email: r.email ?? undefined, address: r.street ?? r.address?.street ?? undefined, city: r.city ?? undefined, state: r.state ?? undefined, zip: r.zip ?? undefined, source: r.source ?? undefined, notes: r.notes ?? undefined, ownerId: r.owner_id ?? undefined }),
    to: (v) => pick({ first_name: v.firstName, last_name: v.lastName, phone: v.phone, email: v.email, street: v.address, city: v.city, state: v.state, zip: v.zip, source: v.source, notes: v.notes, owner_id: v.ownerId }),
  },
  leads: {
    table: "leads", order: "created_at",
    from: (r) => ({ ...base(r), customerId: r.customer_id, vehicleId: r.vehicle_id ?? undefined, stage: r.stage, source: r.source ?? undefined, assignedTo: r.assigned_to ?? undefined, notes: r.notes ?? undefined, lastActivityAt: r.updated_at, sourceUrl: r.source_url ?? undefined } as any),
    to: (v) => pick({ customer_id: v.customerId, vehicle_id: v.vehicleId ?? (v.vehicleId === undefined ? undefined : null), stage: v.stage, source: v.source, assigned_to: v.assignedTo, notes: v.notes, location_id: v.locationId }),
  },
  deals: {
    table: "deals", order: "updated_at",
    from: (r) => ({ ...base(r), ...(r.worksheet ?? {}), customerId: r.customer_id, vehicleId: r.vehicle_id ?? undefined, salespersonId: r.salesperson_id ?? undefined, status: r.status, sellingPrice: num(r.sale_price), cashDown: num(r.down_payment), tradeAllowance: num(r.trade_value), tradePayoff: num(r.trade_payoff), termMonths: r.term_months ?? 0, apr: num(r.apr), monthlyPayment: num(r.monthly_payment), notes: r.worksheet?.notes }),
    to: (v) => {
      const { id, tenantId, createdAt, updatedAt, locationId, ...ws } = v as any;
      return pick({ customer_id: v.customerId, vehicle_id: v.vehicleId, salesperson_id: v.salespersonId, status: v.status, sale_price: v.sellingPrice, down_payment: v.cashDown, trade_value: v.tradeAllowance, trade_payoff: v.tradePayoff, term_months: v.termMonths, apr: v.apr, monthly_payment: v.monthlyPayment, location_id: locationId, worksheet: Object.keys(ws).length ? ws : undefined });
    },
  },
  tasks: {
    table: "tasks", order: "created_at",
    from: (r) => ({ ...base(r), title: r.title, dueAt: r.due_at ?? undefined, status: r.status, priority: r.priority ?? "normal", assignedTo: r.assigned_to ?? undefined, relatedType: r.related_type ?? undefined, relatedId: r.related_id ?? undefined, notes: r.notes ?? undefined }),
    to: (v) => pick({ title: v.title, due_at: v.dueAt, status: v.status, priority: v.priority, assigned_to: v.assignedTo, related_type: v.relatedType, related_id: v.relatedId, notes: v.notes }),
  },
  appointments: {
    table: "appointments", order: "starts_at",
    from: (r) => ({ ...base(r), customerId: r.customer_id ?? undefined, vehicleId: r.vehicle_id ?? undefined, type: r.type, startsAt: r.starts_at, endsAt: r.ends_at ?? undefined, status: r.status, assignedTo: r.assigned_to ?? undefined, notes: r.notes ?? undefined }),
    to: (v) => pick({ customer_id: v.customerId, vehicle_id: v.vehicleId, type: v.type, starts_at: v.startsAt, ends_at: v.endsAt, status: v.status, assigned_to: v.assignedTo, notes: v.notes, location_id: v.locationId }),
  },
  activity: {
    table: "audit_log", order: "created_at",
    from: (r) => ({ ...base(r), userId: r.user_id ?? undefined, action: r.action, entity: r.entity, entityId: r.entity_id ?? undefined, details: typeof r.details === "string" ? r.details : r.details?.text }),
    to: (v) => pick({ user_id: v.userId, action: v.action, entity: v.entity, entity_id: v.entityId, details: v.details ? { text: v.details } : undefined }),
  },
};
function pick(o: Record<string, any>) { return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)); }

// ---- cache + events ----
const key = (name: string) => `cso:${getTenantId()}:${name}`;
const EVT = "cso:data-changed";
const mem: Partial<Record<CollectionName, any[]>> = {};
function readCache<N extends CollectionName>(name: N): RowOf<N>[] {
  if (mem[name]) return mem[name] as RowOf<N>[];
  try { const raw = localStorage.getItem(key(name)); mem[name] = raw ? JSON.parse(raw) : []; } catch { mem[name] = []; }
  return mem[name] as RowOf<N>[];
}
function writeCache<N extends CollectionName>(name: N, rows: RowOf<N>[]) {
  mem[name] = rows;
  try { localStorage.setItem(key(name), JSON.stringify(rows)); } catch {}
  window.dispatchEvent(new CustomEvent(EVT, { detail: name }));
}
export function resetStoreCache() { for (const k of Object.keys(mem)) delete (mem as any)[k]; }

export function uid() { return crypto.randomUUID(); }

/** Synchronous read from cache (pages render from this; refresh() pulls from the DB). */
export function list<N extends CollectionName>(name: N): RowOf<N>[] { const rows = readCache(name); return STORE_SCOPED.has(name) ? filterByStore(rows) : rows; }
export function get<N extends CollectionName>(name: N, id: string): RowOf<N> | undefined { return readCache(name).find((r) => r.id === id); }

const inflight: Partial<Record<CollectionName, Promise<any>>> = {};
export async function refresh<N extends CollectionName>(name: N): Promise<RowOf<N>[]> {
  if (!isOnline()) return readCache(name);
  if (inflight[name]) return inflight[name] as Promise<RowOf<N>[]>;
  const m = MAP[name];
  inflight[name] = (async () => {
    const { data, error } = await supabase.from(m.table).select("*").order(m.order, { ascending: false }).limit(2000);
    if (error) throw error;
    const rows = (data ?? []).map(m.from) as RowOf<N>[];
    writeCache(name, rows);
    return rows;
  })().finally(() => { delete inflight[name]; });
  return inflight[name] as Promise<RowOf<N>[]>;
}

export async function insert<N extends CollectionName>(name: N, row: Omit<RowOf<N>, keyof BaseRow> & Partial<BaseRow>): Promise<RowOf<N>> {
  const m = MAP[name];
  // owner/admin looking at one store: new rows land in that store (otherwise the DB stamps the creator's store)
  const stamped = STAMP_ON_INSERT.has(name) && (row as any).locationId === undefined && getStoreFilter() ? { ...row, locationId: getStoreFilter() } : row;
  const { data, error } = await supabase.from(m.table).insert(m.to(stamped as any)).select().single();
  if (error) throw new Error(error.message);
  const saved = m.from(data) as RowOf<N>;
  writeCache(name, [saved, ...readCache(name)]);
  return saved;
}
export async function update<N extends CollectionName>(name: N, id: string, patch: Partial<RowOf<N>>): Promise<RowOf<N> | undefined> {
  const m = MAP[name];
  // deals keep the full worksheet in jsonb: merge with the cached row so partial patches don't drop fields
  const merged = name === "deals" ? { ...(get(name, id) as any), ...patch } : patch;
  const { data, error } = await supabase.from(m.table).update(m.to(merged as any)).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  const saved = m.from(data) as RowOf<N>;
  writeCache(name, readCache(name).map((r) => (r.id === id ? saved : r)));
  return saved;
}
export async function remove<N extends CollectionName>(name: N, id: string) {
  const m = MAP[name];
  const { error } = await supabase.from(m.table).delete().eq("id", id);
  if (error) throw new Error(error.message);
  writeCache(name, readCache(name).filter((r) => r.id !== id));
}

export function logActivity(action: string, entity: string, entityId?: string, details?: string, userId?: string) {
  insert("activity", { action, entity, entityId, details, userId } as any).catch(() => {});
}

/** Live view of a collection: cached rows immediately, refreshed from the DB, re-rendered on change. */
export function useCollection<N extends CollectionName>(name: N): RowOf<N>[] {
  const [rows, setRows] = useState<RowOf<N>[]>(() => list(name));
  useEffect(() => {
    const h = (e: Event) => { const d = (e as CustomEvent).detail; if (d === name || d === "*") setRows([...list(name)]); };
    const s = () => setRows([...list(name)]);
    const t = () => { resetStoreCache(); setRows([...list(name)]); refresh(name).catch(() => {}); };
    window.addEventListener(EVT, h);
    window.addEventListener(STORE_EVT, s);
    window.addEventListener("cso:tenant-changed", t);
    refresh(name).catch(() => {});
    return () => { window.removeEventListener(EVT, h); window.removeEventListener(STORE_EVT, s); window.removeEventListener("cso:tenant-changed", t); };
  }, [name]);
  return rows;
}

export const fullName = (c?: Customer | null) => (c ? `${c.firstName} ${c.lastName}`.trim() : "—");
export const money = (n?: number | null) => (n == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n));
export const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
export const fmtDateTime = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—");
