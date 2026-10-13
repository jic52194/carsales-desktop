// System check — read-only health check of everything the app relies on in the cloud backend:
// every table + column the app queries, every RPC it calls, the photo bucket, Edge Functions and Realtime.
// Never writes data. Admin/owner/super_admin only (self-gated with hasPermission(["admin"])).
import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase, SUPABASE_URL, SUPABASE_KEY } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, MinusCircle, Loader2, Play, Copy, Activity } from "lucide-react";
import { toast } from "sonner";

type Status = "pass" | "fail" | "skip" | "running";
interface Check { id: string; group: string; name: string; status: Status; detail: string; ms?: number }

/** Every table the app reads, with the exact columns it maps (from lib/store, inventory, records, auth, locations, integrations, tenant + pages). */
const TABLES: { table: string; columns: string[]; note?: string }[] = [
  { table: "profiles", columns: ["id", "username", "full_name", "email", "role", "tenant_id", "is_active", "must_change_password", "last_seen_at", "created_at", "location_id"] },
  { table: "tenants", columns: ["id", "slug", "name", "legal_name", "tagline", "address", "second_location", "phone", "email", "website", "hours", "logo_url", "colors", "social", "financing", "disclaimers", "inventory_source", "plan", "status", "created_at", "onboarding", "intake_key", "webhooks"] },
  { table: "locations", columns: ["id", "slug", "name", "brand_name", "logo_url", "colors", "phone", "address", "is_default", "active"] },
  { table: "vehicles", columns: ["id", "tenant_id", "stock_number", "vin", "year", "make", "model", "trim", "body_style", "mileage", "price", "cost", "exterior_color", "interior_color", "transmission", "drivetrain", "engine", "fuel_type", "mpg", "images", "source_url", "description", "features", "status", "source", "external_id", "added_at", "updated_at", "location_id"] },
  { table: "customers", columns: ["id", "tenant_id", "created_at", "updated_at", "first_name", "last_name", "phone", "email", "street", "city", "state", "zip", "source", "notes", "owner_id"] },
  { table: "leads", columns: ["id", "tenant_id", "created_at", "updated_at", "location_id", "customer_id", "vehicle_id", "stage", "source", "assigned_to", "notes", "source_url", "message"] },
  { table: "deals", columns: ["id", "tenant_id", "created_at", "updated_at", "location_id", "customer_id", "vehicle_id", "salesperson_id", "status", "sale_price", "down_payment", "trade_value", "trade_payoff", "term_months", "apr", "monthly_payment", "worksheet"] },
  { table: "tasks", columns: ["id", "tenant_id", "created_at", "updated_at", "title", "due_at", "status", "priority", "assigned_to", "related_type", "related_id", "notes"] },
  { table: "appointments", columns: ["id", "tenant_id", "created_at", "updated_at", "location_id", "customer_id", "vehicle_id", "type", "starts_at", "ends_at", "status", "assigned_to", "notes"] },
  { table: "audit_log", columns: ["id", "tenant_id", "created_at", "location_id", "user_id", "action", "entity", "entity_id", "details"], note: "store 'activity' collection" },
  { table: "records", columns: ["id", "kind", "created_at", "updated_at", "created_by", "location_id", "data"] },
  { table: "sync_runs", columns: ["id", "started_at", "finished_at", "status", "added", "updated", "sold", "errors"] },
  { table: "integrations", columns: ["id", "provider", "status", "config", "has_secret", "connected_at", "last_error"] },
  { table: "device_presence", columns: ["user_id", "device", "app_version", "idle_seconds", "online", "last_seen_at"] },
  { table: "webhook_log", columns: ["id", "event", "url", "request_id", "created_at"] },
  { table: "impersonation_sessions", columns: ["id"], note: "written by start_view_as / end_view_as; app never selects it directly" },
];

/** RPCs the app calls (existence only — privileged ones are never invoked here). */
const RPCS: { name: string; where: string }[] = [
  { name: "me", where: "auth: session load" },
  { name: "touch_last_seen", where: "auth: after sign-in" },
  { name: "heartbeat", where: "auth: every 45 s" },
  { name: "clear_must_change_password", where: "auth: set own password" },
  { name: "admin_create_user", where: "Settings → Users" },
  { name: "admin_reset_password", where: "Settings → Users" },
  { name: "admin_set_active", where: "Settings → Users" },
  { name: "start_view_as", where: "View-as" },
  { name: "end_view_as", where: "View-as" },
  { name: "tenant_brand", where: "Login screen" },
  { name: "send_test_webhook", where: "Settings → Connections" },
  { name: "platform_tenants", where: "Dealerships (super admin)" },
  { name: "platform_create_tenant", where: "Dealerships (super admin)" },
  { name: "platform_switch_tenant", where: "Dealerships (super admin)" },
  { name: "platform_update_tenant", where: "Dealerships (super admin)" },
  { name: "system_functions", where: "this page" },
];
/** Helpers used by RLS policies / triggers rather than by the app directly. */
const DB_HELPERS: string[] = ["has_role", "current_tenant_id", "current_role_name", "stamp_tenant", "touch_updated_at", "handle_new_user", "protect_profile_columns"];

const EDGE_NOT_PROBED = ["sync-inventory", "ai-assist", "integrations"];
const LAST_KEY = "cso:system-check:last";

const timed = async <T,>(fn: () => Promise<T>): Promise<{ r?: T; e?: any; ms: number }> => {
  const t0 = performance.now();
  try { const r = await fn(); return { r, ms: Math.round(performance.now() - t0) }; } catch (e) { return { e, ms: Math.round(performance.now() - t0) }; }
};
const errMsg = (e: any) => String(e?.message ?? e ?? "unknown error");

export default function SystemCheck() {
  const { hasPermission } = useAuth();
  const tenant = useTenant();
  const isAdmin = hasPermission(["admin"]);
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(false);
  const [failOnly, setFailOnly] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  useEffect(() => { try { setLastRun(localStorage.getItem(LAST_KEY)); } catch {} }, []);

  const upsert = (c: Check) => setChecks((prev) => (prev.some((p) => p.id === c.id) ? prev.map((p) => (p.id === c.id ? c : p)) : [...prev, c]));

  const run = async () => {
    if (running) return;
    setRunning(true); setChecks([]);
    const out: Check[] = [];
    const add = (c: Check) => { out.push(c); upsert(c); };

    // 1. Tables + columns (select only, limit 1 — RLS still applies; a missing column names itself in the error)
    for (const t of TABLES) {
      const id = `table:${t.table}`;
      upsert({ id, group: "Tables", name: t.table, status: "running", detail: `select ${t.columns.length} columns` });
      const { r, e, ms } = await timed(async () => { const res = await supabase.from(t.table).select(t.columns.join(",")).limit(1); if (res.error) throw res.error; return res.data?.length ?? 0; });
      add(e ? { id, group: "Tables", name: t.table, status: "fail", detail: errMsg(e), ms } : { id, group: "Tables", name: t.table, status: "pass", detail: `${t.columns.length} columns OK${r ? "" : " (no rows visible)"}${t.note ? " — " + t.note : ""}`, ms });
    }

    // 2. RPC existence via system_functions (admin only; never calls the privileged RPCs themselves)
    const sf = await timed(async () => { const res = await supabase.rpc("system_functions"); if (res.error) throw res.error; return res.data; });
    let names: Set<string> | null = null;
    if (!sf.e && Array.isArray(sf.r)) names = new Set((sf.r as any[]).map((x) => (typeof x === "string" ? x : x?.name ?? x?.routine_name ?? "")).filter(Boolean));
    else if (!sf.e && sf.r && typeof sf.r === "object") names = new Set(Object.keys(sf.r as object));
    for (const f of RPCS) {
      const id = `rpc:${f.name}`;
      if (!names) add({ id, group: "RPC functions", name: f.name, status: f.name === "system_functions" ? "fail" : "skip", detail: f.name === "system_functions" ? errMsg(sf.e ?? "unexpected response") : `can't verify — system_functions() unavailable (${f.where})`, ms: sf.ms });
      else add({ id, group: "RPC functions", name: f.name, status: names.has(f.name) ? "pass" : "fail", detail: names.has(f.name) ? `present (${f.where})` : `missing in public schema (${f.where})`, ms: sf.ms });
    }
    for (const h of DB_HELPERS) {
      const id = `helper:${h}`;
      if (!names) add({ id, group: "DB helpers (policies / triggers)", name: h, status: "skip", detail: "can't verify — system_functions() unavailable" });
      else add({ id, group: "DB helpers (policies / triggers)", name: h, status: names.has(h) ? "pass" : "fail", detail: names.has(h) ? "present" : "missing in public schema", ms: sf.ms });
    }

    // 3. Storage bucket
    {
      const id = "storage:vehicle-photos";
      upsert({ id, group: "Storage", name: "vehicle-photos", status: "running", detail: "list" });
      const { r, e, ms } = await timed(async () => { const res = await supabase.storage.from("vehicle-photos").list("", { limit: 1 }); if (res.error) throw res.error; return res.data?.length ?? 0; });
      add(e ? { id, group: "Storage", name: "vehicle-photos", status: "fail", detail: errMsg(e), ms } : { id, group: "Storage", name: "vehicle-photos", status: "pass", detail: `bucket reachable${r ? "" : " (empty at root)"}`, ms });
    }

    // 4. Edge functions — lead-intake has a safe probe (no key → 401 "missing key" proves it's up)
    {
      const id = "edge:lead-intake";
      upsert({ id, group: "Edge functions", name: "lead-intake", status: "running", detail: "POST without key" });
      const { r, e, ms } = await timed(async () => {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/lead-intake`, { method: "POST", headers: { "content-type": "application/json", apikey: SUPABASE_KEY }, body: "{}" });
        let body: any = null; try { body = await res.json(); } catch {}
        return { status: res.status, error: body?.error as string | undefined };
      });
      if (e) add({ id, group: "Edge functions", name: "lead-intake", status: "fail", detail: errMsg(e), ms });
      else if (r!.status === 401 && /missing key/i.test(r!.error ?? "")) add({ id, group: "Edge functions", name: "lead-intake", status: "pass", detail: `deployed — responds 401 "missing key" as expected`, ms });
      else add({ id, group: "Edge functions", name: "lead-intake", status: "fail", detail: `unexpected response ${r!.status}${r!.error ? ` "${r!.error}"` : ""}`, ms });
    }
    for (const fn of EDGE_NOT_PROBED) add({ id: `edge:${fn}`, group: "Edge functions", name: fn, status: "skip", detail: "deployed per project doc (not probed — no safe read-only call)" });

    // 5. Realtime: subscribe to leads and expect SUBSCRIBED within 5 s
    {
      const id = "realtime:leads";
      upsert({ id, group: "Realtime", name: "leads channel", status: "running", detail: "subscribing" });
      const attempt = () => new Promise<string>((resolve, reject) => {
        const ch = supabase.channel(`system-check-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, () => {});
        let settled = false;
        const done = (ok: boolean, msg: string) => { if (settled) return; settled = true; clearTimeout(timer); supabase.removeChannel(ch).catch(() => {}); ok ? resolve(msg) : reject(new Error(msg)); };
        const timer = setTimeout(() => done(false, "no SUBSCRIBED within 6 s"), 6000);
        ch.subscribe((status, err) => { if (status === "SUBSCRIBED") done(true, "SUBSCRIBED"); else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") done(false, `${status}${err ? ": " + err.message : ""}`); });
      });
      // a socket that was idle can report CLOSED once while reconnecting — retry before calling it a failure
      const { r, e, ms } = await timed(async () => { let last: any; for (let i = 0; i < 3; i++) { try { return await attempt(); } catch (x) { last = x; await new Promise((w) => setTimeout(w, 1000)); } } throw last; });
      add(e ? { id, group: "Realtime", name: "leads channel", status: "fail", detail: errMsg(e), ms } : { id, group: "Realtime", name: "leads channel", status: "pass", detail: r!, ms });
    }

    const now = new Date().toISOString();
    try { localStorage.setItem(LAST_KEY, now); } catch {}
    setLastRun(now); setRunning(false);
    const fails = out.filter((c) => c.status === "fail").length;
    fails ? toast.error(`${fails} check${fails === 1 ? "" : "s"} failing`) : toast.success("All checks passing");
  };

  const counted = checks.filter((c) => c.status === "pass" || c.status === "fail");
  const passing = counted.filter((c) => c.status === "pass").length;
  const visible = useMemo(() => (failOnly ? checks.filter((c) => c.status === "fail") : checks), [checks, failOnly]);
  const groups = useMemo(() => { const g = new Map<string, Check[]>(); for (const c of visible) { if (!g.has(c.group)) g.set(c.group, []); g.get(c.group)!.push(c); } return [...g.entries()]; }, [visible]);

  const copyReport = () => {
    const lines = [`CarSales AI OS — System check`, `Dealership: ${tenant.name} (${tenant.slug})`, `Backend: ${SUPABASE_URL}`, `Run: ${lastRun ? new Date(lastRun).toLocaleString() : "—"}`, `Result: ${passing} of ${counted.length} passing`, ""];
    let g = "";
    for (const c of checks) { if (c.group !== g) { g = c.group; lines.push(`## ${g}`); } lines.push(`[${c.status.toUpperCase().padEnd(4)}] ${c.name}${c.ms != null ? ` (${c.ms} ms)` : ""} — ${c.detail}`); }
    navigator.clipboard.writeText(lines.join("\n")).then(() => toast.success("Report copied")).catch(() => toast.error("Couldn't copy"));
  };

  if (!isAdmin) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center"><h2 className="text-2xl font-bold mb-2">Admins only</h2><p className="text-muted-foreground max-w-md">System check reads the backend schema for {tenant.name}. Ask an owner or admin if you need it.</p></div>
  );

  const Icon = ({ s }: { s: Status }) => s === "pass" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : s === "fail" ? <XCircle className="h-4 w-4 text-destructive" /> : s === "running" ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <MinusCircle className="h-4 w-4 text-muted-foreground" />;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-black">System check</h1>
        <p className="text-muted-foreground">Read-only check that every table, column, function, bucket and live channel the app depends on exists in the cloud backend. Nothing is written.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> {checks.length ? `${passing} of ${counted.length} passing` : "Not run yet"}</CardTitle>
              <CardDescription>{lastRun ? `Last run ${new Date(lastRun).toLocaleString()}` : "Run the checks to see results."}{checks.some((c) => c.status === "skip") ? ` · ${checks.filter((c) => c.status === "skip").length} not probed` : ""}</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm"><Switch checked={failOnly} onCheckedChange={setFailOnly} /> Failures only</label>
              <Button variant="outline" size="sm" onClick={copyReport} disabled={!checks.length || running}><Copy className="h-4 w-4 mr-1" /> Copy report</Button>
              <Button size="sm" onClick={run} disabled={running}>{running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />} {running ? "Running…" : "Run checks"}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!checks.length ? (
            <p className="text-sm text-muted-foreground">Checks: {TABLES.length} tables ({TABLES.reduce((n, t) => n + t.columns.length, 0)} columns), {RPCS.length} RPCs + {DB_HELPERS.length} helpers, 1 storage bucket, {EDGE_NOT_PROBED.length + 1} Edge Functions, 1 Realtime channel.</p>
          ) : !visible.length ? (
            <p className="text-sm text-muted-foreground">No failures.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead className="w-10" /><TableHead>Name</TableHead><TableHead>Detail</TableHead><TableHead className="text-right whitespace-nowrap">ms</TableHead></TableRow></TableHeader>
                <TableBody>
                  {groups.map(([group, rows]) => (
                    <Fragment key={group}>
                      <TableRow className="bg-muted/40 hover:bg-muted/40"><TableCell colSpan={4} className="font-semibold text-xs uppercase tracking-wide text-muted-foreground py-2">{group} <Badge variant="outline" className="ml-2 font-normal normal-case">{rows.filter((r) => r.status === "pass").length}/{rows.filter((r) => r.status === "pass" || r.status === "fail").length}</Badge></TableCell></TableRow>
                      {rows.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell><Icon s={c.status} /></TableCell>
                          <TableCell className="font-mono text-sm whitespace-nowrap">{c.name}</TableCell>
                          <TableCell className={`text-sm ${c.status === "fail" ? "text-destructive" : "text-muted-foreground"}`}>{c.detail}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground tabular-nums">{c.ms ?? ""}</TableCell>
                        </TableRow>
                      ))}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
