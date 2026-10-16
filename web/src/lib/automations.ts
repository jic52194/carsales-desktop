// Automations: who is in which play (enrollments table — RLS keeps it to your dealership), stop one, add a customer by hand.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type EnrollStatus = "active" | "replied" | "booked" | "completed" | "stopped" | "opted_out";
export interface Enrollment {
  id: string; play: string; customerId: string; leadId?: string | null; dealId?: string | null; appointmentId?: string | null; vehicleId?: string | null;
  ownerId?: string | null; step: number; nextAt: string | null; status: EnrollStatus; stopReason?: string | null; context: any;
  log: { step?: string; at: string; kind?: string; result?: string; text?: string; error?: string; skipped?: string[] }[];
  createdAt: string; updatedAt: string;
}
const from = (r: any): Enrollment => ({ id: r.id, play: r.play, customerId: r.customer_id, leadId: r.lead_id, dealId: r.deal_id, appointmentId: r.appointment_id, vehicleId: r.vehicle_id, ownerId: r.owner_id, step: r.step, nextAt: r.next_at, status: r.status, stopReason: r.stop_reason, context: r.context ?? {}, log: Array.isArray(r.log) ? r.log : [], createdAt: r.created_at, updatedAt: r.updated_at });

export const STATUS_LABEL: Record<EnrollStatus, { label: string; cls: string }> = {
  active: { label: "Running", cls: "bg-blue-100 text-blue-800" },
  replied: { label: "Replied", cls: "bg-emerald-100 text-emerald-800" },
  booked: { label: "Booked", cls: "bg-emerald-100 text-emerald-800" },
  completed: { label: "Done", cls: "bg-muted text-muted-foreground" },
  stopped: { label: "Stopped", cls: "bg-muted text-muted-foreground" },
  opted_out: { label: "Opted out", cls: "bg-amber-100 text-amber-800" },
};

/** Enrollments for the dealership (newest first), optionally one customer. Refreshes every 30 s and on focus. */
export function useEnrollments(opts: { customerId?: string; days?: number } = {}) {
  const [rows, setRows] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    let q = supabase.from("enrollments").select("*").order("created_at", { ascending: false }).limit(500);
    if (opts.customerId) q = q.eq("customer_id", opts.customerId);
    else q = q.gte("created_at", new Date(Date.now() - (opts.days ?? 120) * 864e5).toISOString());
    const { data, error } = await q;
    if (error) setError(error.message); else { setRows((data ?? []).map(from)); setError(null); }
    setLoading(false);
  }, [opts.customerId, opts.days]);
  useEffect(() => {
    load(); const i = setInterval(load, 30_000); const f = () => load();
    window.addEventListener("focus", f); return () => { clearInterval(i); window.removeEventListener("focus", f); };
  }, [load]);
  return { rows, loading, error, reload: load };
}

export async function stopEnrollment(id: string, reason = "Stopped by staff") {
  const { error } = await supabase.from("enrollments").update({ status: "stopped", stop_reason: reason, next_at: null }).eq("id", id).eq("status", "active");
  if (error) throw new Error(error.message);
}

export async function enrollCustomer(play: string, customerId: string, vehicleId?: string) {
  const { data, error } = await supabase.functions.invoke("seq-run", { body: { action: "enroll", play, customer_id: customerId, vehicle_id: vehicleId } });
  if (error) { let msg = error.message; try { const b = await (error as any).context?.json?.(); if (b?.error) msg = b.error; } catch { /* keep */ } throw new Error(msg); }
  if (data?.error) throw new Error(data.error);
  return data;
}
