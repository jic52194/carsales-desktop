// Supabase client — the real backend for CarSales AI OS.
// Publishable (anon) key is safe to ship: every table is behind RLS and anon has no grants.
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://suooupofqybiojouttxe.supabase.co";
export const SUPABASE_KEY = "sb_publishable_kQrB2hPMjcjuYI1N8mb0Ww_wEf0SzFC";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: "cso-auth" },
});

export const isOnline = () => typeof navigator === "undefined" || navigator.onLine;

/** camelCase ⇄ snake_case helpers for row mapping */
export const snake = (s: string) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
export const camel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
export const toSnakeRow = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).map(([k, v]) => [snake(k), v]));
export const toCamelRow = <T = any>(o: Record<string, any>): T => Object.fromEntries(Object.entries(o).map(([k, v]) => [camel(k), v])) as T;
