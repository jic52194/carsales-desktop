import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Target } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { useCollection, money, type Deal, type Lead, type LeadStage } from "@/lib/store";
import { useInventory, vDaysInStock } from "@/lib/inventory";
import { useRecords } from "@/lib/records";
import { useUsers } from "@/lib/auth";
import { downloadCsv, stamp } from "@/lib/csv";

/** Optional monthly goal — records kind "target": { month: "YYYY-MM", units?, gross? }. Set from Leaderboard/Settings later. */
interface TargetRec { month: string; units?: number; gross?: number }

type Period = "today" | "mtd" | "30";
const SOLD: Deal["status"][] = ["funded", "delivered"];
const STAGES: LeadStage[] = ["new", "contacted", "appointment", "negotiating", "sold", "lost"];
const dayKey = (iso: string) => iso.slice(0, 10);

function Kpi({ label, value, sub, to }: { label: string; value: string | number; sub?: string; to?: string }) {
  const body = (
    <Card className={to ? "hover:shadow-md transition-shadow h-full" : "h-full"}><CardContent className="p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
      <p className="text-2xl font-black mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </CardContent></Card>
  );
  return to ? <Link to={to} className="block h-full">{body}</Link> : body;
}

function Spark({ title, data, dataKey, isMoney }: { title: string; data: any[]; dataKey: string; isMoney?: boolean }) {
  const total = data.reduce((a, d) => a + (d[dataKey] || 0), 0);
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-baseline justify-between"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p><p className="text-sm font-bold">{isMoney ? money(total) : total}</p></div>
      <div className="h-14 mt-2">
        {total === 0 ? <p className="text-xs text-muted-foreground pt-4">No data in the last 30 days.</p> : (
          <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <Tooltip formatter={(v: any) => (isMoney ? money(Number(v)) : v)} labelFormatter={(l) => String(l)} contentStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey={dataKey} stroke="hsl(var(--primary))" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart></ResponsiveContainer>
        )}
      </div>
    </CardContent></Card>
  );
}

export default function CommandCenter() {
  const inventory = useInventory();
  const leads = useCollection("leads");
  const deals = useCollection("deals");
  const appts = useCollection("appointments");
  const tasks = useCollection("tasks");
  const users = useUsers();
  const targets = useRecords<TargetRec>("target");
  const [period, setPeriod] = useState<Period>("mtd");

  const now = new Date();
  const nowIso = now.toISOString();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const start = useMemo(() => {
    if (period === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    if (period === "mtd") return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    return new Date(now.getTime() - 30 * 86400000).toISOString();
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps
  const inP = (iso?: string) => !!iso && iso >= start && iso <= nowIso;

  // ---- KPIs for the selected period ----
  const delivered = deals.filter((d) => SOLD.includes(d.status) && inP(d.updatedAt));
  const gross = delivered.reduce((a, d) => a + (d.totalGross || 0), 0);
  const leadsIn = leads.filter((l) => inP(l.createdAt));
  const apptsSet = appts.filter((a) => inP(a.createdAt) && a.status !== "cancelled");
  const apptsShowed = appts.filter((a) => a.status === "showed" && inP(a.startsAt));
  const testDrives = appts.filter((a) => a.type === "test_drive" && a.status !== "cancelled" && inP(a.startsAt));
  const available = inventory.filter((v) => v.status === "Available");
  const asking = available.reduce((a, v) => a + (v.price ?? 0), 0);
  const aging = available.filter((v) => vDaysInStock(v) >= 60);
  const overdue = tasks.filter((t) => t.status === "open" && t.dueAt && t.dueAt < nowIso);

  // ---- pace vs target (only if a target record exists for this month) ----
  const target = targets.find((t) => t.data.month === monthKey)?.data;
  const mtdDelivered = deals.filter((d) => SOLD.includes(d.status) && d.updatedAt >= new Date(now.getFullYear(), now.getMonth(), 1).toISOString());
  const mtdGross = mtdDelivered.reduce((a, d) => a + (d.totalGross || 0), 0);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const paceMult = daysInMonth / Math.max(1, now.getDate());

  // ---- last-30-day daily series ----
  const series = useMemo(() => {
    const days: Record<string, { day: string; leads: number; appts: number; units: number; gross: number }> = {};
    for (let i = 29; i >= 0; i--) { const k = dayKey(new Date(now.getTime() - i * 86400000).toISOString()); days[k] = { day: k.slice(5), leads: 0, appts: 0, units: 0, gross: 0 }; }
    const bump = (iso: string | undefined, f: "leads" | "appts" | "units", g?: number) => { if (!iso) return; const d = days[dayKey(iso)]; if (!d) return; d[f] += 1; if (g) d.gross += g; };
    leads.forEach((l) => bump(l.createdAt, "leads"));
    appts.forEach((a) => a.status !== "cancelled" && bump(a.startsAt, "appts"));
    deals.forEach((d) => SOLD.includes(d.status) && bump(d.updatedAt, "units", d.totalGross || 0));
    return Object.values(days);
  }, [leads, appts, deals]); // eslint-disable-line react-hooks/exhaustive-deps

  const funnel = useMemo(() => STAGES.map((s) => ({ stage: s, count: leads.filter((l: Lead) => l.stage === s).length })), [leads]);

  const team = useMemo(() => users.filter((u) => u.isActive).map((u) => {
    const mine = delivered.filter((d) => d.salespersonId === u.id);
    return { id: u.id, name: u.fullName, role: u.role, leads: leads.filter((l) => l.assignedTo === u.id && !["sold", "lost"].includes(l.stage)).length, appts: appts.filter((a) => a.assignedTo === u.id && a.status !== "cancelled" && inP(a.startsAt)).length, units: mine.length, gross: mine.reduce((a, d) => a + (d.totalGross || 0), 0) };
  }).filter((r) => r.leads || r.appts || r.units).sort((a, b) => b.gross - a.gross || b.units - a.units), [users, delivered, leads, appts, start]); // eslint-disable-line react-hooks/exhaustive-deps

  const exportCsv = () => {
    const label = period === "today" ? "Today" : period === "mtd" ? "Month to date" : "Last 30 days";
    const rows = [
      { metric: "Units delivered", period: label, value: delivered.length }, { metric: "Gross", period: label, value: gross },
      { metric: "Leads in", period: label, value: leadsIn.length }, { metric: "Appointments set", period: label, value: apptsSet.length },
      { metric: "Appointments showed", period: label, value: apptsShowed.length }, { metric: "Test drives", period: label, value: testDrives.length },
      { metric: "Units available", period: "now", value: available.length }, { metric: "Inventory at asking", period: "now", value: asking },
      { metric: "Aging 60+", period: "now", value: aging.length }, { metric: "Overdue tasks", period: "now", value: overdue.length },
      ...team.map((t) => ({ metric: `Team: ${t.name}`, period: label, value: `${t.units} units / ${t.gross} gross / ${t.leads} leads / ${t.appts} appts` })),
    ];
    downloadCsv(`command-center-${stamp()}`, rows);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div><h1 className="text-3xl font-black">Command Center</h1><p className="text-muted-foreground">The whole store on one screen — live from your data.</p></div>
        <div className="flex items-center gap-2">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}><TabsList><TabsTrigger value="today">Today</TabsTrigger><TabsTrigger value="mtd">MTD</TabsTrigger><TabsTrigger value="30">Last 30</TabsTrigger></TabsList></Tabs>
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" /> CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Kpi label="Units delivered" value={delivered.length} sub="funded or delivered" to="/deals" />
        <Kpi label="Gross" value={money(gross)} sub={delivered.length ? `avg ${money(gross / delivered.length)}` : undefined} to="/deals" />
        <Kpi label="Leads in" value={leadsIn.length} to="/leads" />
        <Kpi label="Appointments" value={`${apptsSet.length} / ${apptsShowed.length}`} sub="set / showed" to="/appointments" />
        <Kpi label="Test drives" value={testDrives.length} to="/appointments" />
        <Kpi label="Units available" value={available.length} sub={`${money(asking)} at asking`} to="/inventory" />
        <Kpi label="Aging 60+ days" value={aging.length} sub={aging.length ? `${money(aging.reduce((a, v) => a + (v.price ?? 0), 0))} tied up` : "nothing aged"} to="/inventory" />
        <Kpi label="Overdue tasks" value={overdue.length} to="/tasks" />
        {target ? (
          <Card className="col-span-2 border-primary/40"><CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1"><Target className="h-3 w-3" /> Pace vs {monthKey} target</p>
            <div className="flex flex-wrap gap-4 mt-1 text-sm">
              {target.units != null && <p><span className="text-2xl font-black">{mtdDelivered.length}</span> / {target.units} units · pacing {Math.round(mtdDelivered.length * paceMult)}</p>}
              {target.gross != null && <p><span className="text-2xl font-black">{money(mtdGross)}</span> / {money(target.gross)} · pacing {money(mtdGross * paceMult)}</p>}
            </div>
          </CardContent></Card>
        ) : (
          <Card className="col-span-2 border-dashed"><CardContent className="p-4 text-xs text-muted-foreground">No monthly target set for {monthKey}. Add a "target" record (units / gross) to see pace here.</CardContent></Card>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Spark title="Leads / day" data={series} dataKey="leads" />
        <Spark title="Appointments / day" data={series} dataKey="appts" />
        <Spark title="Units / day" data={series} dataKey="units" />
        <Spark title="Gross / day" data={series} dataKey="gross" isMoney />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card><CardHeader><CardTitle className="text-base">Pipeline funnel</CardTitle><CardDescription>All leads by stage</CardDescription></CardHeader><CardContent>
          {leads.length === 0 ? <p className="text-sm text-muted-foreground">No leads yet. Add a customer and start a lead, or connect your website forms in Settings → Connections.</p> : (
            <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={funnel} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
              <XAxis type="number" hide /><YAxis type="category" dataKey="stage" width={84} tick={{ fontSize: 12 }} /><Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={4} isAnimationActive={false} />
            </BarChart></ResponsiveContainer></div>
          )}
        </CardContent></Card>
        <Card className="md:col-span-2"><CardHeader><CardTitle className="text-base">Team</CardTitle><CardDescription>Open leads owned · appointments and deliveries in the selected period</CardDescription></CardHeader><CardContent className="overflow-x-auto">
          {team.length === 0 ? <p className="text-sm text-muted-foreground">No activity assigned to team members in this period.</p> : (
            <table className="w-full text-sm"><thead><tr className="text-left text-xs text-muted-foreground border-b"><th className="py-2 pr-3">Person</th><th className="py-2 pr-3 text-right">Open leads</th><th className="py-2 pr-3 text-right">Appts</th><th className="py-2 pr-3 text-right">Units</th><th className="py-2 text-right">Gross</th></tr></thead>
              <tbody>{team.map((t) => <tr key={t.id} className="border-b last:border-0"><td className="py-2 pr-3 font-medium">{t.name}</td><td className="py-2 pr-3 text-right">{t.leads}</td><td className="py-2 pr-3 text-right">{t.appts}</td><td className="py-2 pr-3 text-right">{t.units}</td><td className="py-2 text-right font-semibold">{money(t.gross)}</td></tr>)}</tbody></table>
          )}
        </CardContent></Card>
      </div>
    </div>
  );
}
