// Tenant-scoped collections. Local (localStorage) persistence today; the same interface will be
// backed by Supabase tables (customers, leads, deals, tasks, appointments, activity) next.
import { useEffect, useState } from "react";
import { getTenantId } from "@/lib/tenant";

export interface BaseRow { id: string; tenantId: string; createdAt: string; updatedAt: string }

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

type CollectionName = "customers" | "leads" | "deals" | "tasks" | "appointments" | "activity";
type RowOf<N extends CollectionName> =
  N extends "customers" ? Customer : N extends "leads" ? Lead : N extends "deals" ? Deal :
  N extends "tasks" ? Task : N extends "appointments" ? Appointment : Activity;

const key = (name: string, tenantId = getTenantId()) => `cso:${tenantId}:${name}`;
const EVT = "cso:data-changed";

export function uid() {
  return (crypto as any).randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function list<N extends CollectionName>(name: N): RowOf<N>[] {
  try {
    const raw = localStorage.getItem(key(name));
    const rows = raw ? JSON.parse(raw) : [];
    return Array.isArray(rows) ? rows : [];
  } catch { return []; }
}
function write<N extends CollectionName>(name: N, rows: RowOf<N>[]) {
  localStorage.setItem(key(name), JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent(EVT, { detail: name }));
}
export function get<N extends CollectionName>(name: N, id: string): RowOf<N> | undefined {
  return list(name).find((r) => r.id === id);
}
export function insert<N extends CollectionName>(name: N, row: Omit<RowOf<N>, keyof BaseRow> & Partial<BaseRow>): RowOf<N> {
  const now = new Date().toISOString();
  const full = { ...row, id: row.id ?? uid(), tenantId: getTenantId(), createdAt: row.createdAt ?? now, updatedAt: now } as RowOf<N>;
  write(name, [full, ...list(name)]);
  return full;
}
export function update<N extends CollectionName>(name: N, id: string, patch: Partial<RowOf<N>>): RowOf<N> | undefined {
  const rows = list(name);
  const i = rows.findIndex((r) => r.id === id);
  if (i < 0) return undefined;
  rows[i] = { ...rows[i], ...patch, updatedAt: new Date().toISOString() };
  write(name, rows);
  return rows[i];
}
export function remove<N extends CollectionName>(name: N, id: string) {
  write(name, list(name).filter((r) => r.id !== id));
}
export function clearAll(tenantId = getTenantId()) {
  (["customers", "leads", "deals", "tasks", "appointments", "activity"] as CollectionName[]).forEach((n) => localStorage.removeItem(key(n, tenantId)));
  window.dispatchEvent(new CustomEvent(EVT, { detail: "*" }));
}

export function logActivity(action: string, entity: string, entityId?: string, details?: string, userId?: string) {
  insert("activity", { action, entity, entityId, details, userId });
}

/** Live view of a collection; re-renders on any change to it. */
export function useCollection<N extends CollectionName>(name: N): RowOf<N>[] {
  const [rows, setRows] = useState<RowOf<N>[]>(() => list(name));
  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d === name || d === "*") setRows(list(name));
    };
    const t = () => setRows(list(name));
    window.addEventListener(EVT, h);
    window.addEventListener("cso:tenant-changed", t);
    return () => { window.removeEventListener(EVT, h); window.removeEventListener("cso:tenant-changed", t); };
  }, [name]);
  return rows;
}

export const fullName = (c?: Customer | null) => (c ? `${c.firstName} ${c.lastName}`.trim() : "—");
export const money = (n?: number | null) => (n == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n));
export const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
export const fmtDateTime = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—");
