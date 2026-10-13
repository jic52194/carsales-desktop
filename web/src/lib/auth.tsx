// Authentication + session on Supabase Auth. Username → email lookup via RPC, then password sign-in.
// The hook surface (useAuth / hasPermission / ProtectedRoute) is unchanged from the local build.
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase, isOnline } from "@/lib/supabase";
import { setLiveTenant, clearLiveTenant } from "@/lib/tenant";

export type Role = "super_admin" | "owner" | "admin" | "manager" | "sales" | "f_and_i" | "service" | "inventory" | "web" | "porter" | "technician";

export interface User {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  role: Role;
  tenantId: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  locationId?: string | null;
}
export interface Location { id: string; slug: string; name: string; brandName?: string | null; logoUrl?: string | null; colors?: any; phone?: string | null; address?: any; isDefault: boolean; active: boolean }
export function locationFromRow(r: any): Location { return { id: r.id, slug: r.slug, name: r.name, brandName: r.brand_name ?? null, logoUrl: r.logo_url ?? null, colors: r.colors ?? null, phone: r.phone ?? null, address: r.address ?? null, isDefault: !!r.is_default, active: r.active !== false }; }
let meRaw: any = null;
/** Extra session facts from me(): the user's store, all stores, and the auth assurance level (aal1/aal2). */
export function getSessionInfo(): { location: Location | null; locations: Location[]; aal: "aal1" | "aal2" } {
  return { location: meRaw?.location ? locationFromRow(meRaw.location) : null, locations: (meRaw?.locations ?? []).map(locationFromRow), aal: meRaw?.aal === "aal2" ? "aal2" : "aal1" };
}

const ME_KEY = "cso:me";

function profileToUser(p: any): User {
  return { id: p.id, username: p.username ?? "", fullName: p.full_name ?? p.email, email: p.email, role: p.role, tenantId: p.tenant_id, isActive: p.is_active, mustChangePassword: !!p.must_change_password, lastLoginAt: p.last_seen_at ?? undefined, createdAt: p.created_at, locationId: p.location_id ?? null };
}

/** Load profile + tenant for the signed-in user (cached for offline starts). */
async function loadMe(): Promise<User | null> {
  const { data, error } = await supabase.rpc("me");
  if (error) throw error;
  if (!data) return null;
  if (data.tenant?.status === "suspended" && data.profile?.role !== "super_admin") { try { localStorage.removeItem(ME_KEY); } catch {} throw new Error("SUSPENDED"); }
  try { localStorage.setItem(ME_KEY, JSON.stringify(data)); } catch {}
  meRaw = data;
  setLiveTenant(data.tenant);
  return profileToUser(data.profile);
}
function cachedMe(): User | null {
  try { const raw = localStorage.getItem(ME_KEY); if (!raw) return null; const d = JSON.parse(raw); meRaw = d; setLiveTenant(d.tenant); return profileToUser(d.profile); } catch { return null; }
}

// ---- directory of users in the dealership (for assignment dropdowns + admin) ----
let usersCache: User[] = [];
const USERS_EVT = "cso:users-changed";
export function listUsers(): User[] { return usersCache; }
export async function refreshUsers(): Promise<User[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("full_name");
  if (error) throw error;
  usersCache = (data ?? []).map(profileToUser);
  window.dispatchEvent(new Event(USERS_EVT));
  return usersCache;
}
export function useUsers(): User[] {
  const [u, setU] = useState<User[]>(usersCache);
  useEffect(() => {
    const h = () => setU([...usersCache]);
    window.addEventListener(USERS_EVT, h);
    if (!usersCache.length) refreshUsers().catch(() => {});
    return () => window.removeEventListener(USERS_EVT, h);
  }, []);
  return u;
}

export async function createUser(input: { username: string; fullName: string; email: string; role: Role; password: string }): Promise<string> {
  const username = input.username.trim().toLowerCase();
  if (!username) throw new Error("Username required");
  if (!input.email?.trim()) throw new Error("Email required (used for sign-in recovery)");
  if (input.password.length < 6) throw new Error("Password must be at least 6 characters");
  const { data, error } = await supabase.rpc("admin_create_user", { p_email: input.email.trim(), p_username: username, p_password: input.password, p_full_name: input.fullName.trim(), p_role: input.role });
  if (error) throw new Error(error.message);
  await refreshUsers();
  return data as string;
}
export async function adminResetPassword(userId: string, password: string) {
  const { error } = await supabase.rpc("admin_reset_password", { p_user: userId, p_password: password });
  if (error) throw new Error(error.message);
  await refreshUsers();
}
export async function adminSetActive(userId: string, active: boolean) {
  const { error } = await supabase.rpc("admin_set_active", { p_user: userId, p_active: active });
  if (error) throw new Error(error.message);
  await refreshUsers();
}
export async function updateProfile(userId: string, patch: { fullName?: string; role?: Role; locationId?: string | null }) {
  const row: any = {}; if (patch.fullName !== undefined) row.full_name = patch.fullName; if (patch.role !== undefined) row.role = patch.role; if (patch.locationId !== undefined) row.location_id = patch.locationId;
  const { error } = await supabase.from("profiles").update(row).eq("id", userId);
  if (error) throw new Error(error.message);
  await refreshUsers();
}
/** Signed-in user sets their own password (clears the must-change flag). */
export async function setPassword(_userId: string, password: string) {
  if (password.length < 6) throw new Error("Password must be at least 6 characters");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
  await supabase.rpc("clear_must_change_password");
}

export interface ViewAs { sessionId: string; user: User }
interface AuthContextType {
  /** The signed-in account (never changes during View-as). */
  account: User | null;
  /** The effective user: the viewed-as user during View-as, otherwise the account. */
  user: User | null;
  role: Role;
  location: Location | null;
  locations: Location[];
  aal: "aal1" | "aal2";
  /** Set after a correct password when the account has a verified TOTP factor and must still enter a code. */
  mfaPending: boolean;
  completeMfa: (code: string) => Promise<void>;
  viewAs: ViewAs | null;
  startViewAs: (target: User, reason: string) => Promise<void>;
  endViewAs: () => Promise<void>;
  ready: boolean;
  offline: boolean;
  login: (username: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (allowedRoles: Role[]) => boolean;
  refresh: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_RANK: Record<Role, number> = { super_admin: 100, owner: 90, admin: 80, manager: 60, f_and_i: 50, sales: 40, inventory: 40, service: 40, web: 30, technician: 20, porter: 10 };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(!isOnline());
  const [mfaPending, setMfaPending] = useState(false);
  const [viewAs, setViewAs] = useState<ViewAs | null>(null);
  const [sess, setSess] = useState(getSessionInfo());

  /** Does this session still need a TOTP code? (account has a verified factor, session is aal1) */
  const mfaNeeded = async () => {
    try { const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel(); return !!data && data.nextLevel === "aal2" && data.currentLevel !== "aal2"; } catch { return false; }
  };
  const completeMfa = async (code: string) => {
    const { data: f } = await supabase.auth.mfa.listFactors();
    const factor = f?.totp?.find((x: any) => x.status === "verified") ?? f?.totp?.[0];
    if (!factor) throw new Error("No authenticator is set up on this account");
    const { data: ch, error: e1 } = await supabase.auth.mfa.challenge({ factorId: factor.id }); if (e1) throw new Error(e1.message);
    const { error: e2 } = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: ch.id, code: code.replace(/\s/g, "") });
    if (e2) throw new Error(/invalid|expired/i.test(e2.message) ? "That code didn't work. Codes change every 30 seconds — try the current one." : e2.message);
    setMfaPending(false);
    const me = await loadMe(); setUser(me); setSess(getSessionInfo());
    supabase.rpc("touch_last_seen").then(() => {}); refreshUsers().catch(() => {});
  };
  const startViewAs = async (target: User, reason: string) => {
    const { data, error } = await supabase.rpc("start_view_as", { p_target: target.id, p_reason: reason });
    if (error) throw new Error(error.message);
    setViewAs({ sessionId: data as string, user: target });
  };
  const endViewAs = async () => {
    if (viewAs) { await supabase.rpc("end_view_as", { p_session: viewAs.sessionId }).then(() => {}); }
    setViewAs(null);
  };

  const refresh = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setUser(null); clearLiveTenant(); return; }
    try {
      if (await mfaNeeded()) { setMfaPending(true); setUser(null); return; }
      const me = await loadMe();
      setUser(me); setSess(getSessionInfo());
      if (me) { supabase.rpc("touch_last_seen").then(() => {}); refreshUsers().catch(() => {}); }
    } catch (e: any) {
      if (e?.message === "SUSPENDED") { await supabase.auth.signOut(); setUser(null); clearLiveTenant(); return; }
      // offline or transient: fall back to cached profile so the app still opens
      const c = cachedMe(); setUser(c); setSess(getSessionInfo()); setOffline(true);
    }
  };

  useEffect(() => {
    refresh().finally(() => setReady(true));
    const { data: sub } = supabase.auth.onAuthStateChange((event) => { if (event === "SIGNED_OUT") { setUser(null); clearLiveTenant(); } });
    const on = () => { setOffline(false); refresh(); }, off = () => setOffline(true);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { sub.subscription.unsubscribe(); window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const login = async (username: string, password: string) => {
    // Usernames map to a private login alias — no email lookup, nothing to enumerate.
    const u = username.trim().toLowerCase();
    if (!isOnline()) throw new Error("Can't reach the CarSales AI OS cloud. Check your internet connection and try again.");
    // username → private login alias; a full email is used as typed (e.g. an account created with an email login)
    let target: string;
    if (u.includes("@")) target = u;
    else if (/^[a-z0-9][a-z0-9._-]{1,62}$/.test(u)) target = `${u}@login.carsalessoftware.com`;
    else throw new Error("Invalid username or password");
    const { error: e2 } = await supabase.auth.signInWithPassword({ email: target, password });
    if (e2) throw new Error(/invalid|credentials/i.test(e2.message) ? "Invalid username or password" : /fetch/i.test(e2.message) ? "Can't reach the CarSales AI OS cloud. Check your internet connection and try again." : e2.message);
    if (await mfaNeeded()) { setMfaPending(true); return; }
    let me: User | null;
    try { me = await loadMe(); } catch (e: any) { await supabase.auth.signOut(); throw new Error(e?.message === "SUSPENDED" ? "This dealership's account is suspended. Contact CarSalesSoftware.com." : e.message); }
    if (!me) { await supabase.auth.signOut(); throw new Error("This account isn't attached to a dealership yet."); }
    if (!me.isActive) { await supabase.auth.signOut(); throw new Error("This account is deactivated."); }
    setUser(me); setSess(getSessionInfo());
    supabase.rpc("touch_last_seen").then(() => {});
    refreshUsers().catch(() => {});
  };

  const logout = async () => {
    await supabase.auth.signOut();
    try { localStorage.removeItem(ME_KEY); } catch {}
    usersCache = []; meRaw = null;
    setUser(null); setViewAs(null); setMfaPending(false); clearLiveTenant();
  };

  // heartbeat: who is online, on what, how idle (admins see it in Security Center)
  useEffect(() => {
    if (!user) return;
    const n = (window as any).carsalesNative;
    const beat = async () => { try { const idle = n?.getIdleSeconds ? await n.getIdleSeconds() : 0; const info = n?.getInfo ? await n.getInfo() : null; await supabase.rpc("heartbeat", { p_device: n ? "desktop" : "web", p_version: info?.version ?? (import.meta as any).env?.VITE_APP_VERSION ?? "", p_idle: Math.round(Number(idle) || 0) }); } catch {} };
    beat(); const t = setInterval(beat, 45000);
    return () => clearInterval(t);
  }, [user?.id]);

  const effective = viewAs ? viewAs.user : user;
  const role: Role = effective?.role ?? "sales";
  const hasPermission = (allowed: Role[]) => {
    const user = effective;
    if (!user) return false;
    if (role === "super_admin" || role === "owner") return true;
    if (allowed.includes(role)) return true;
    return allowed.some((r) => ROLE_RANK[r] < ROLE_RANK[role] && ROLE_RANK[r] <= ROLE_RANK.sales);
  };

  const effLocation = viewAs ? (sess.locations.find((l) => l.id === viewAs.user.locationId) ?? null) : sess.location;
  return <AuthContext.Provider value={{ account: user, user: effective, role, location: effLocation, locations: sess.locations, aal: sess.aal, mfaPending, completeMfa, viewAs, startViewAs, endViewAs, ready, offline, login, logout, hasPermission, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function ProtectedRoute({ children, allowedRoles }: { children: ReactNode; allowedRoles: Role[] }) {
  const { hasPermission } = useAuth();
  if (!hasPermission(allowedRoles)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <h2 className="text-2xl font-bold mb-2">Access restricted</h2>
        <p className="text-muted-foreground max-w-md">Your role doesn't have access to this module. Ask an administrator if you need it.</p>
      </div>
    );
  }
  return <>{children}</>;
}

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin", owner: "Owner", admin: "Admin", manager: "Sales Manager", sales: "Salesperson",
  f_and_i: "F&I Manager", service: "Service", inventory: "Inventory / Used Car Mgr", web: "Web / BDC", technician: "Technician", porter: "Porter",
};
