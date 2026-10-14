// Supabase client — the real backend for CarSales AI OS.
// Publishable (anon) key is safe to ship: every table is behind RLS and anon has no grants.
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://suooupofqybiojouttxe.supabase.co";
export const SUPABASE_KEY = "sb_publishable_kQrB2hPMjcjuYI1N8mb0Ww_wEf0SzFC";

/** Fired when the cloud rejects our sign-in token (expired / revoked session) so the app can re-check or sign out
 *  instead of silently showing empty pages. */
export const AUTH_401_EVT = "cso-auth-401";
let last401 = 0;
const watchedFetch: typeof fetch = async (input, init) => {
  const res = await fetch(input, init);
  if (res.status === 401) {
    const url = typeof input === "string" ? input : (input as Request).url ?? String(input);
    if (/\/rest\/v1\//.test(url) && Date.now() - last401 > 15000) { last401 = Date.now(); try { window.dispatchEvent(new Event(AUTH_401_EVT)); } catch { /* non-browser */ } }
  }
  return res;
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: "cso-auth" },
  global: { fetch: watchedFetch },
});

export const isOnline = () => typeof navigator === "undefined" || navigator.onLine;

/** camelCase ⇄ snake_case helpers for row mapping */
export const snake = (s: string) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
export const camel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
export const toSnakeRow = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).map(([k, v]) => [snake(k), v]));
export const toCamelRow = <T = any>(o: Record<string, any>): T => Object.fromEntries(Object.entries(o).map(([k, v]) => [camel(k), v])) as T;
