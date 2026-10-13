// Client for the `ghl` Edge Function — the dealership's GoHighLevel sub-account (SMS, email, calendars).
// The Private Integration token never leaves the server; every call runs as the signed-in staff member.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export class GhlError extends Error {
  code?: string; status?: number;
  constructor(msg: string, code?: string, status?: number) { super(msg); this.code = code; this.status = status; }
}
export const GHL_NOT_CONNECTED_MSG = "GoHighLevel isn't connected yet — an admin can connect it in Settings → Connections.";

async function call<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("ghl", { body: { action, ...body } });
  if (error) {
    const ctx = (error as any).context as Response | undefined;
    let msg = error.message; let code: string | undefined; let status: number | undefined;
    try { status = ctx?.status; const j = ctx ? await ctx.json() : null; if (j?.error) msg = j.error; code = j?.code; } catch {}
    if (status === 403 && !code) code = "forbidden";
    throw new GhlError(msg, code, status);
  }
  return data as T;
}

/** Plain-English error text for toasts and inline notes. */
export function ghlErrorMessage(e: unknown): string {
  if (e instanceof GhlError) {
    if (e.code === "not_connected") return GHL_NOT_CONNECTED_MSG;
    if (e.code === "forbidden") return "Your role can't use GoHighLevel from here — ask a manager.";
    if (/GHL 401|GHL 403/.test(e.message)) return "GoHighLevel rejected the dealership's token — an admin should reconnect it in Settings → Connections.";
    if (/GHL 422|GHL 400/.test(e.message)) return `GoHighLevel couldn't do that: ${e.message.replace(/^GHL \d+:\s*/, "")}`;
    return e.message || "GoHighLevel request failed";
  }
  return (e as any)?.message || "GoHighLevel request failed";
}
export const isGhlNotConnected = (e: unknown) => e instanceof GhlError && e.code === "not_connected";

export type GhlChannel = "sms" | "email";
export interface GhlThreadMessage { id: string; channel: "sms" | "email" | "call"; direction: "inbound" | "outbound"; body: string; at: string; status?: string | null }
export interface GhlCalendar { id: string; name: string; isActive: boolean }

export const ghlStatus = () => call<{ connected: boolean; locationId: string | null }>("status");
export const ghlUpsertContact = (customerId: string) => call<{ ok: boolean; contactId: string }>("upsert_contact", { customerId });
export const ghlSend = (p: { customerId: string; channel: GhlChannel; body: string; subject?: string }) => call<{ ok: boolean; messageId: string | null }>("send", p);
export const ghlThread = (customerId: string) => call<{ ok: boolean; contactId: string; messages: GhlThreadMessage[] }>("thread", { customerId });
export const ghlCalendars = () => call<{ ok: boolean; calendars: GhlCalendar[] }>("calendars");
export const ghlFreeSlots = (p: { calendarId: string; startMs: number; endMs: number; timezone?: string }) => call<{ ok: boolean; slots: string[] }>("free_slots", { timezone: "America/New_York", ...p });
export const ghlBook = (p: { customerId: string; calendarId: string; startTime: string; endTime?: string; title?: string; type?: string; appointmentId?: string }) => call<{ ok: boolean; eventId: string | null }>("book", p);
export const ghlSyncCustomers = (limit = 50) => call<{ ok: boolean; synced: number; skipped: number; remaining: number; errors: string[] }>("sync_customers", { limit });

// ---- connection status, cached for the session, refreshed when the window regains focus ----
export interface GhlStatus { loading: boolean; connected: boolean; locationId: string | null; error?: string }
let cached: GhlStatus | null = null;
let inflight: Promise<GhlStatus> | null = null;
let lastFetch = 0;
const EVT = "cso:ghl-status";

export function refreshGhlStatus(force = false): Promise<GhlStatus> {
  if (!force && inflight) return inflight;
  if (!force && cached && Date.now() - lastFetch < 30_000) return Promise.resolve(cached);
  inflight = ghlStatus()
    .then((r) => ({ loading: false, connected: !!r.connected, locationId: r.locationId ?? null }))
    .catch((e) => ({ loading: false, connected: false, locationId: null, error: ghlErrorMessage(e) }))
    .then((s) => { cached = s; lastFetch = Date.now(); window.dispatchEvent(new Event(EVT)); return s; })
    .finally(() => { inflight = null; });
  return inflight;
}

export function useGhlStatus(): GhlStatus & { refresh: () => void } {
  const [s, setS] = useState<GhlStatus>(cached ?? { loading: true, connected: false, locationId: null });
  useEffect(() => {
    const h = () => cached && setS(cached);
    const onFocus = () => { refreshGhlStatus().catch(() => {}); };
    window.addEventListener(EVT, h);
    window.addEventListener("focus", onFocus);
    refreshGhlStatus().then(setS).catch(() => {});
    return () => { window.removeEventListener(EVT, h); window.removeEventListener("focus", onFocus); };
  }, []);
  return { ...s, refresh: () => { refreshGhlStatus(true).catch(() => {}); } };
}

// ---- message records (records kind "message") ----
/** Local log rows use "in"/"out"; rows written by the ghl / ghl-inbound functions use "inbound"/"outbound". */
export interface MessageRecord {
  customerId: string; channel: "sms" | "email" | "note" | "call"; direction: "in" | "out" | "inbound" | "outbound";
  body: string; subject?: string; at: string; by?: string | null; via?: "ghl" | "device" | "manual"; ghlMessageId?: string;
}
export const isInbound = (m: { direction: string }) => m.direction === "in" || m.direction === "inbound";
