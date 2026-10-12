// Authentication + session. Local credential store for now (SHA-256 hashed passwords in localStorage);
// swaps to Supabase Auth without changing the hook surface (useAuth / hasPermission / ProtectedRoute).
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { setTenant, getTenantId } from "@/lib/tenant";

export type Role = "super_admin" | "owner" | "admin" | "manager" | "sales" | "f_and_i" | "service" | "inventory" | "web" | "porter" | "technician";

export interface User {
  id: string;
  username: string;      // login handle, case-insensitive
  fullName: string;
  email?: string;
  role: Role;
  tenantId: string;      // home tenant; super_admin can switch
  isActive: boolean;
  mustChangePassword: boolean;
  passwordHash: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Session { userId: string; tenantId: string; at: string }

const USERS_KEY = "cso:users";
const SESSION_KEY = "cso:session";

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---- bootstrap: platform super admin (Jared) ----
// Password is stored only as a hash; this is the SHA-256 of the initial password.
const SEED_USERS: Omit<User, "passwordHash">[] = [
  { id: "u-jared", username: "jared.casper", fullName: "Jared Casper", email: "jcasper@raibrollc.com", role: "super_admin", tenantId: "bestprice", isActive: true, mustChangePassword: false, createdAt: "2026-10-12T00:00:00Z" },
];
const SEED_PASSWORDS: Record<string, string> = { "u-jared": "123456" };

export function listUsers(): User[] {
  try { const r = localStorage.getItem(USERS_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveUsers(users: User[]) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); window.dispatchEvent(new Event("cso:users-changed")); }

export async function ensureSeedUsers() {
  const users = listUsers();
  let changed = false;
  for (const s of SEED_USERS) {
    if (!users.some((u) => u.id === s.id)) {
      users.push({ ...s, passwordHash: await sha256(SEED_PASSWORDS[s.id]) });
      changed = true;
    }
  }
  if (changed) saveUsers(users);
}

export async function createUser(input: { username: string; fullName: string; email?: string; role: Role; tenantId?: string; password: string; mustChangePassword?: boolean }): Promise<User> {
  const users = listUsers();
  const username = input.username.trim().toLowerCase();
  if (!username) throw new Error("Username required");
  if (users.some((u) => u.username === username)) throw new Error("Username already exists");
  if (input.password.length < 6) throw new Error("Password must be at least 6 characters");
  const u: User = {
    id: `u-${Date.now().toString(36)}`, username, fullName: input.fullName, email: input.email, role: input.role,
    tenantId: input.tenantId ?? getTenantId(), isActive: true, mustChangePassword: input.mustChangePassword ?? true,
    passwordHash: await sha256(input.password), createdAt: new Date().toISOString(),
  };
  saveUsers([...users, u]);
  return u;
}
export function updateUser(id: string, patch: Partial<Omit<User, "passwordHash">>) {
  saveUsers(listUsers().map((u) => (u.id === id ? { ...u, ...patch } : u)));
}
export async function setPassword(id: string, password: string) {
  if (password.length < 6) throw new Error("Password must be at least 6 characters");
  const hash = await sha256(password);
  saveUsers(listUsers().map((u) => (u.id === id ? { ...u, passwordHash: hash, mustChangePassword: false } : u)));
}

function readSession(): Session | null {
  try { const r = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}

interface AuthContextType {
  user: User | null;
  role: Role;
  ready: boolean;
  login: (username: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => void;
  hasPermission: (allowedRoles: Role[]) => boolean;
  refresh: () => void;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_RANK: Record<Role, number> = { super_admin: 100, owner: 90, admin: 80, manager: 60, f_and_i: 50, sales: 40, inventory: 40, service: 40, web: 30, technician: 20, porter: 10 };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = () => {
    const s = readSession();
    if (!s) { setUser(null); return; }
    const u = listUsers().find((x) => x.id === s.userId && x.isActive) ?? null;
    setUser(u);
  };

  useEffect(() => {
    ensureSeedUsers().then(() => { refresh(); setReady(true); });
    window.addEventListener("cso:users-changed", refresh);
    return () => window.removeEventListener("cso:users-changed", refresh);
  }, []);

  const login = async (username: string, password: string, remember = true) => {
    await ensureSeedUsers();
    const u = listUsers().find((x) => x.username === username.trim().toLowerCase());
    if (!u || !u.isActive) throw new Error("Invalid username or password");
    const hash = await sha256(password);
    if (hash !== u.passwordHash) throw new Error("Invalid username or password");
    const s: Session = { userId: u.id, tenantId: u.tenantId, at: new Date().toISOString() };
    (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(s));
    updateUser(u.id, { lastLoginAt: s.at });
    setTenant(u.tenantId);
    setUser({ ...u, lastLoginAt: s.at });
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  const role: Role = user?.role ?? "sales";
  const hasPermission = (allowed: Role[]) => {
    if (!user) return false;
    if (role === "super_admin" || role === "owner") return true;
    if (allowed.includes(role)) return true;
    // managers inherit sales-level screens
    return allowed.some((r) => ROLE_RANK[r] < ROLE_RANK[role] && ROLE_RANK[r] <= ROLE_RANK.sales);
  };

  return <AuthContext.Provider value={{ user, role, ready, login, logout, hasPermission, refresh }}>{children}</AuthContext.Provider>;
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
