import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Users, KeyRound, Lock, Database, UserX, ArrowRight, AlertTriangle, Monitor, Globe } from "lucide-react";
import { useCollection, fmtDateTime } from "@/lib/store";
import { useAuth, useUsers, ROLE_LABELS } from "@/lib/auth";
import { useTenant } from "@/lib/tenant";

/** Actions in the audit trail that touch access, configuration or bulk data. Only what is actually logged shows up. */
const ADMIN_ACTIONS = new Set(["create_user", "update_user", "reset_password", "set_active", "activate", "deactivate", "update_tenant", "switch_tenant", "import", "export", "onboarding", "connection", "update_settings", "login"]);
const ADMIN_ENTITIES = new Set(["user", "profile", "tenant", "dealership", "settings", "connection", "integration", "customer_import"]);
const VERB: Record<string, string> = { create_user: "created user", update_user: "updated user", reset_password: "reset a password", set_active: "changed active status", activate: "activated", deactivate: "deactivated", update_tenant: "updated dealership settings", switch_tenant: "switched dealership", import: "imported", export: "exported", onboarding: "completed onboarding", connection: "changed a connection", update_settings: "updated settings", login: "signed in" };

const ENFORCED = [
  { icon: Database, title: "Row-level isolation per dealership", body: "Every table carries a dealership id and Supabase row-level security policies only return rows for the signed-in user's dealership. There is no cross-store query path from the app." },
  { icon: KeyRound, title: "Forced password change on first sign-in", body: "Accounts created by an admin start with must-change-password set; the app blocks everything until a new password is chosen." },
  { icon: Lock, title: "Admin-only key storage", body: "Vendor and AI keys are sent once to the integrations Edge Function and stored in a service-role-only table. Only owners/admins can connect or disconnect a provider, and nobody — not even admins — can read a key back from the app." },
  { icon: ShieldCheck, title: "Encrypted at rest and in transit", body: "Data is stored on Supabase (Postgres, encrypted at rest) and every request uses TLS. Sessions are Supabase Auth JWTs, revoked on sign-out." },
  { icon: UserX, title: "Deactivation blocks sign-in", body: "Deactivated users are refused at login even with a valid password, and a suspended dealership locks out everyone except platform admins." },
];

interface Presence { user_id: string; device: string; app_version?: string | null; idle_seconds?: number | null; online?: boolean | null; last_seen_at: string }
const ONLINE_MS = 2 * 60 * 1000;
const fmtIdle = (s?: number | null) => { const n = Math.max(0, Math.round(Number(s) || 0)); return n < 60 ? `${n}s` : n < 3600 ? `${Math.floor(n / 60)}m` : `${Math.floor(n / 3600)}h ${Math.floor((n % 3600) / 60)}m`; };
const ago = (iso: string) => { const d = Date.now() - new Date(iso).getTime(); return d < 60000 ? "just now" : d < 3600000 ? `${Math.floor(d / 60000)} min ago` : d < 86400000 ? `${Math.floor(d / 3600000)} h ago` : fmtDateTime(iso); };

/** Live devices from `device_presence` (fed by the app's heartbeat every 45 s). Refreshes every 30 s. */
function usePresence(enabled: boolean) {
  const [rows, setRows] = useState<Presence[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = async () => { const { data } = await supabase.from("device_presence").select("user_id,device,app_version,idle_seconds,online,last_seen_at").order("last_seen_at", { ascending: false }).limit(200); if (alive && data) setRows(data as Presence[]); };
    load(); const t = setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, [enabled]);
  return { rows };
}

export default function SecurityCenter() {
  const { user, hasPermission } = useAuth();
  const users = useUsers();
  const activity = useCollection("activity");
  const tenant = useTenant();
  const isAdmin = hasPermission(["admin"]);
  const { rows: presence } = usePresence(isAdmin);
  const onlineNow = presence.filter((p) => Date.now() - new Date(p.last_seen_at).getTime() < ONLINE_MS);

  const adminLog = useMemo(() => activity.filter((a) => ADMIN_ACTIONS.has(a.action) || ADMIN_ENTITIES.has(a.entity)).slice(0, 50), [activity]);
  const who = (id?: string) => users.find((u) => u.id === id)?.fullName || "System";
  const active = users.filter((u) => u.isActive), inactive = users.filter((u) => !u.isActive);
  const mustChange = users.filter((u) => u.isActive && u.mustChangePassword);
  const admins = active.filter((u) => ["super_admin", "owner", "admin"].includes(u.role));
  const stale = active.filter((u) => !u.lastLoginAt || Date.now() - new Date(u.lastLoginAt).getTime() > 30 * 86400000);

  if (!isAdmin) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center"><h2 className="text-2xl font-bold mb-2">Admins only</h2><p className="text-muted-foreground max-w-md">The Security Center shows every account at {tenant.name}. Ask an owner or admin if you need access.</p></div>
  );

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div><h1 className="text-3xl font-black">Security Center</h1><p className="text-muted-foreground">Who can get in, what they did, and what the platform enforces for {tenant.name}.</p></div>
        <Button asChild variant="outline"><Link to="/settings">Manage users in Settings <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Active accounts</p><p className="text-2xl font-black">{active.length}</p><p className="text-xs text-muted-foreground">{inactive.length} deactivated</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Admins / owners</p><p className="text-2xl font-black">{admins.length}</p><p className="text-xs text-muted-foreground">can manage users and keys</p></CardContent></Card>
        <Card className={mustChange.length ? "border-amber-300/60" : ""}><CardContent className="p-4"><p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Pending password change</p><p className="text-2xl font-black">{mustChange.length}</p><p className="text-xs text-muted-foreground">haven't set their own password yet</p></CardContent></Card>
        <Card className={stale.length ? "border-amber-300/60" : ""}><CardContent className="p-4"><p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Not seen in 30 days</p><p className="text-2xl font-black">{stale.length}</p><p className="text-xs text-muted-foreground">active accounts — consider deactivating</p></CardContent></Card>
      </div>

      {(mustChange.length > 0 || stale.length > 0) && (
        <Card className="border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/20"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-base"><AlertTriangle className="h-4 w-4" /> Worth a look</CardTitle></CardHeader><CardContent className="text-sm space-y-1">
          {mustChange.map((u) => <p key={u.id}><span className="font-medium">{u.fullName}</span> was given a temporary password and hasn't replaced it yet.</p>)}
          {stale.map((u) => <p key={u.id}><span className="font-medium">{u.fullName}</span> is active but {u.lastLoginAt ? `last seen ${fmtDateTime(u.lastLoginAt)}` : "has never signed in"}.</p>)}
        </CardContent></Card>
      )}

      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Monitor className="h-4 w-4 text-primary" /> Who's online</CardTitle><CardDescription>{onlineNow.length} signed in right now on {onlineNow.filter((p) => p.device === "desktop").length} desktop and {onlineNow.filter((p) => p.device !== "desktop").length} web session(s). A device counts as online when it checked in within the last 2 minutes; refreshes every 30 seconds.</CardDescription></CardHeader><CardContent className="overflow-x-auto">
        {presence.length === 0 ? <p className="text-sm text-muted-foreground">No device check-ins recorded yet. Each signed-in app sends a heartbeat every 45 seconds; sessions will appear here as they do.</p> : (
          <table className="w-full text-sm"><thead><tr className="text-left text-xs text-muted-foreground border-b"><th className="py-2 pr-3">User</th><th className="py-2 pr-3">Device</th><th className="py-2 pr-3">Version</th><th className="py-2 pr-3">Idle</th><th className="py-2 pr-3">Last seen</th><th className="py-2">Status</th></tr></thead>
            <tbody>{presence.map((p) => { const online = Date.now() - new Date(p.last_seen_at).getTime() < ONLINE_MS; return <tr key={`${p.user_id}-${p.device}`} className="border-b last:border-0">
              <td className="py-2 pr-3 font-medium">{who(p.user_id)}{p.user_id === user?.id ? <span className="text-xs text-muted-foreground font-normal"> (you)</span> : null}</td>
              <td className="py-2 pr-3"><span className="inline-flex items-center gap-1">{p.device === "desktop" ? <Monitor className="h-3.5 w-3.5 text-muted-foreground" /> : <Globe className="h-3.5 w-3.5 text-muted-foreground" />} {p.device === "desktop" ? "Desktop app" : "Web"}</span></td>
              <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{p.app_version || "—"}</td>
              <td className="py-2 pr-3 text-xs">{online ? (Number(p.idle_seconds) >= 300 ? <span className="text-amber-700 dark:text-amber-400">idle {fmtIdle(p.idle_seconds)}</span> : "active") : "—"}</td>
              <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">{ago(p.last_seen_at)}</td>
              <td className="py-2">{online ? <Badge className="bg-emerald-600 hover:bg-emerald-600">online</Badge> : <Badge variant="outline">offline</Badge>}</td>
            </tr>; })}</tbody></table>
        )}
      </CardContent></Card>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Accounts</CardTitle><CardDescription>Everyone who can sign in. Edit roles, reset passwords or deactivate in Settings → Users.</CardDescription></CardHeader><CardContent className="overflow-x-auto">
          {users.length === 0 ? <p className="text-sm text-muted-foreground">Loading the user list…</p> : (
            <table className="w-full text-sm"><thead><tr className="text-left text-xs text-muted-foreground border-b"><th className="py-2 pr-3">Name</th><th className="py-2 pr-3">Role</th><th className="py-2 pr-3">Status</th><th className="py-2">Last seen</th></tr></thead>
              <tbody>{users.map((u) => <tr key={u.id} className="border-b last:border-0">
                <td className="py-2 pr-3"><p className="font-medium">{u.fullName}{u.id === user?.id ? <span className="text-xs text-muted-foreground"> (you)</span> : null}</p><p className="text-xs text-muted-foreground">@{u.username}</p></td>
                <td className="py-2 pr-3">{ROLE_LABELS[u.role]}</td>
                <td className="py-2 pr-3 space-x-1">{u.isActive ? <Badge variant="secondary">active</Badge> : <Badge variant="outline">deactivated</Badge>}{u.mustChangePassword && <Badge variant="outline" className="border-amber-400 text-amber-700">temp password</Badge>}</td>
                <td className="py-2 text-xs text-muted-foreground whitespace-nowrap">{u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : "never"}</td>
              </tr>)}</tbody></table>
          )}
        </CardContent></Card>

        <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-base">Recent admin actions</CardTitle><CardDescription>From the audit trail — user, settings and data changes. The full log is in Settings → Data.</CardDescription></CardHeader><CardContent className="divide-y">
          {adminLog.length === 0 && <p className="text-sm text-muted-foreground py-2">No admin-level actions logged yet. User creation, imports and settings changes will appear here as they happen. Sign-ins are tracked as "last seen" on each account rather than as log entries.</p>}
          {adminLog.map((a) => <div key={a.id} className="py-2 text-sm"><p><span className="font-medium">{who(a.userId)}</span> {VERB[a.action] || a.action.replace(/_/g, " ")} {a.entity.replace(/_/g, " ")}{a.details ? <span className="text-muted-foreground"> — {String(a.details).slice(0, 120)}</span> : null}</p><p className="text-xs text-muted-foreground">{fmtDateTime(a.createdAt)}</p></div>)}
        </CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> What the platform enforces</CardTitle><CardDescription>Built into CarSales AI OS for every dealership — nothing to configure.</CardDescription></CardHeader><CardContent className="grid md:grid-cols-2 gap-4">
        {ENFORCED.map((e) => { const Icon = e.icon; return <div key={e.title} className="flex gap-3"><div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Icon className="h-4 w-4 text-primary" /></div><div><p className="font-semibold text-sm">{e.title}</p><p className="text-xs text-muted-foreground">{e.body}</p></div></div>; })}
      </CardContent></Card>
    </div>
  );
}
