import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useCollection, money, get } from "@/lib/store";
import { useInventory, getVehicle } from "@/lib/inventory";
import { useUsers } from "@/lib/auth";
import { downloadCsv, stamp } from "@/lib/csv";

type MetricKey = "leads" | "appointments" | "shows" | "deliveries" | "gross" | "cars_added" | "cars_sold" | "days_to_sell";
type GroupKey = "none" | "source" | "salesperson" | "make";
/** One event feeding a metric. `value` is summed (or averaged for days_to_sell). */
interface Ev { at: string; value: number; source?: string; user?: string; make?: string }

const METRICS: { key: MetricKey; label: string; avg?: boolean; money?: boolean; groups: GroupKey[] }[] = [
  { key: "leads", label: "Leads", groups: ["source", "salesperson", "make"] },
  { key: "appointments", label: "Appointments set", groups: ["salesperson", "make"] },
  { key: "shows", label: "Shows", groups: ["salesperson", "make"] },
  { key: "deliveries", label: "Deliveries", groups: ["source", "salesperson", "make"] },
  { key: "gross", label: "Gross", money: true, groups: ["source", "salesperson", "make"] },
  { key: "cars_added", label: "Cars added", groups: ["make", "source"] },
  { key: "cars_sold", label: "Cars sold", groups: ["make", "source"] },
  { key: "days_to_sell", label: "Avg days to sell", avg: true, groups: ["make", "source"] },
];
const RANGES = [{ v: "7", l: "7 days" }, { v: "30", l: "30 days" }, { v: "90", l: "90 days" }, { v: "365", l: "12 months" }, { v: "custom", l: "Custom" }];
const DAY = 86400000;
const ymd = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export default function Metrics() {
  const leads = useCollection("leads");
  const appts = useCollection("appointments");
  const deals = useCollection("deals");
  const inventory = useInventory();
  const users = useUsers();
  const [metric, setMetric] = useState<MetricKey>("leads");
  const [range, setRange] = useState("30");
  const [custom, setCustom] = useState({ from: ymd(new Date(Date.now() - 29 * DAY)), to: ymd(new Date()) });
  const [chart, setChart] = useState<"line" | "bar">("line");
  const [group, setGroup] = useState<GroupKey>("none");
  const def = METRICS.find((m) => m.key === metric)!;

  const { from, to } = useMemo(() => {
    if (range === "custom") { const f = new Date(custom.from + "T00:00:00"), t = new Date(custom.to + "T23:59:59"); return { from: f, to: t > f ? t : new Date(f.getTime() + DAY) }; }
    const n = Number(range); const t = new Date(); t.setHours(23, 59, 59, 999); const f = new Date(t.getTime() - (n - 1) * DAY); f.setHours(0, 0, 0, 0); return { from: f, to: t };
  }, [range, custom]);
  const spanDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / DAY));
  const weekly = spanDays > 92;
  const prevFrom = new Date(from.getTime() - spanDays * DAY), prevTo = new Date(from.getTime() - 1);

  // ---- events for the selected metric (all time; bucketed below) ----
  const events = useMemo<Ev[]>(() => {
    const userName = (id?: string) => users.find((u) => u.id === id)?.fullName || "Unassigned";
    const makeOf = (vid?: string) => (vid ? getVehicle(vid)?.make : undefined) || "No vehicle";
    const custSource = (cid?: string) => (cid ? get("customers", cid)?.source : undefined) || "Unknown";
    const sold = deals.filter((d) => ["funded", "delivered"].includes(d.status));
    switch (metric) {
      case "leads": return leads.map((l) => ({ at: l.createdAt, value: 1, source: l.source || "Unknown", user: userName(l.assignedTo), make: makeOf(l.vehicleId) }));
      case "appointments": return appts.filter((a) => a.status !== "cancelled").map((a) => ({ at: a.createdAt, value: 1, user: userName(a.assignedTo), make: makeOf(a.vehicleId) }));
      case "shows": return appts.filter((a) => a.status === "showed").map((a) => ({ at: a.startsAt, value: 1, user: userName(a.assignedTo), make: makeOf(a.vehicleId) }));
      case "deliveries": return sold.map((d) => ({ at: d.updatedAt, value: 1, source: custSource(d.customerId), user: userName(d.salespersonId), make: makeOf(d.vehicleId) }));
      case "gross": return sold.map((d) => ({ at: d.updatedAt, value: d.totalGross || 0, source: custSource(d.customerId), user: userName(d.salespersonId), make: makeOf(d.vehicleId) }));
      case "cars_added": return inventory.filter((v) => v.addedAt).map((v) => ({ at: v.addedAt!, value: 1, make: v.make, source: v.source || "Manual" }));
      case "cars_sold": return inventory.filter((v) => v.status === "Sold" && v.updatedAt).map((v) => ({ at: v.updatedAt!, value: 1, make: v.make, source: v.source || "Manual" }));
      case "days_to_sell": return inventory.filter((v) => v.status === "Sold" && v.updatedAt && v.addedAt).map((v) => ({ at: v.updatedAt!, value: Math.max(0, Math.round((new Date(v.updatedAt!).getTime() - new Date(v.addedAt!).getTime()) / DAY)), make: v.make, source: v.source || "Manual" }));
    }
  }, [metric, leads, appts, deals, inventory, users]);

  const groupOf = (e: Ev) => (group === "source" ? e.source : group === "salesperson" ? e.user : group === "make" ? e.make : undefined) || "Other";
  const agg = (list: Ev[]) => (def.avg ? (list.length ? list.reduce((a, e) => a + e.value, 0) / list.length : 0) : list.reduce((a, e) => a + e.value, 0));
  const fmt = (n: number) => (def.money ? money(n) : def.avg ? `${Math.round(n * 10) / 10}` : String(Math.round(n)));

  const inRange = useMemo(() => events.filter((e) => { const t = new Date(e.at).getTime(); return t >= from.getTime() && t <= to.getTime(); }), [events, from, to]);
  const inPrev = useMemo(() => events.filter((e) => { const t = new Date(e.at).getTime(); return t >= prevFrom.getTime() && t <= prevTo.getTime(); }), [events, prevFrom, prevTo]);
  const groups = useMemo(() => (group === "none" ? ["value"] : Array.from(new Set(inRange.map(groupOf))).sort((a, b) => agg(inRange.filter((e) => groupOf(e) === b)) - agg(inRange.filter((e) => groupOf(e) === a))).slice(0, 8)), [inRange, group]); // eslint-disable-line react-hooks/exhaustive-deps

  const buckets = useMemo(() => {
    const out: { label: string; start: number; end: number; rows: Record<string, number> }[] = [];
    const step = weekly ? 7 * DAY : DAY;
    for (let t = from.getTime(); t <= to.getTime(); t += step) {
      const d = new Date(t); const label = weekly ? `wk ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const end = Math.min(t + step - 1, to.getTime());
      const inB = inRange.filter((e) => { const x = new Date(e.at).getTime(); return x >= t && x <= end; });
      const rows: Record<string, number> = {};
      for (const g of groups) rows[g] = agg(group === "none" ? inB : inB.filter((e) => groupOf(e) === g));
      out.push({ label, start: t, end, rows });
    }
    return out;
  }, [inRange, from, to, weekly, groups, group]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = agg(inRange), prev = agg(inPrev);
  const delta = prev ? ((total - prev) / prev) * 100 : null;
  const chartData = buckets.map((b) => ({ name: b.label, ...b.rows }));
  const COLORS = ["hsl(var(--primary))", "#0ea5e9", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#64748b"];

  const exportCsv = () => downloadCsv(`${metric}-${stamp()}`, buckets.map((b) => ({ period: b.label, ...Object.fromEntries(groups.map((g) => [g === "value" ? def.label : g, Math.round(b.rows[g] * 100) / 100])) })));

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div><h1 className="text-3xl font-black">Metrics</h1><p className="text-muted-foreground">Explore any KPI over time, compared with the previous period.</p></div>

      <Card><CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
        <div className="space-y-1 col-span-2"><Label>Metric</Label><Select value={metric} onValueChange={(v) => { setMetric(v as MetricKey); setGroup("none"); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{METRICS.map((m) => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1"><Label>Range</Label><Select value={range} onValueChange={setRange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RANGES.map((r) => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1"><Label>Group by</Label><Select value={group} onValueChange={(v) => setGroup(v as GroupKey)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{def.groups.map((g) => <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>)}</SelectContent></Select></div>
        {range === "custom" && <><div className="space-y-1"><Label>From</Label><Input type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} /></div><div className="space-y-1"><Label>To</Label><Input type="date" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} /></div></>}
        <div className="flex gap-2 col-span-2 md:col-span-1 justify-end">
          <Tabs value={chart} onValueChange={(v) => setChart(v as any)}><TabsList><TabsTrigger value="line">Line</TabsTrigger><TabsTrigger value="bar">Bar</TabsTrigger></TabsList></Tabs>
          <Button variant="outline" size="icon" onClick={exportCsv} disabled={!inRange.length} title="Export CSV"><Download className="h-4 w-4" /></Button>
        </div>
      </CardContent></Card>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{def.label} · this period</p><p className="text-2xl font-black">{fmt(total)}</p><p className="text-xs text-muted-foreground">{ymd(from)} → {ymd(to)} · {inRange.length} records</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Previous period</p><p className="text-2xl font-black">{fmt(prev)}</p><p className="text-xs text-muted-foreground">{ymd(prevFrom)} → {ymd(prevTo)} · {inPrev.length} records</p></CardContent></Card>
        <Card className="col-span-2 md:col-span-1"><CardContent className="p-4"><p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Change</p>
          <p className={`text-2xl font-black flex items-center gap-1 ${delta == null ? "" : delta > 0 ? "text-emerald-600" : delta < 0 ? "text-destructive" : ""}`}>{delta == null ? <Minus className="h-5 w-5" /> : delta > 0 ? <TrendingUp className="h-5 w-5" /> : delta < 0 ? <TrendingDown className="h-5 w-5" /> : <Minus className="h-5 w-5" />}{delta == null ? "n/a" : `${delta > 0 ? "+" : ""}${Math.round(delta)}%`}</p>
          <p className="text-xs text-muted-foreground">{delta == null ? "No data in the previous period to compare." : def.avg ? "Lower is better for days to sell." : "vs previous period"}</p></CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle className="text-base">{def.label}{group !== "none" ? ` by ${group}` : ""}</CardTitle><CardDescription>{weekly ? "Weekly" : "Daily"} values{group !== "none" ? " · top 8 groups" : ""}</CardDescription></CardHeader><CardContent>
        {inRange.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">Nothing recorded for {def.label.toLowerCase()} in this range. Pick a wider range or another metric.</p> : (
          <div className="h-72"><ResponsiveContainer width="100%" height="100%">
            {chart === "line" ? (
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} /><XAxis dataKey="name" tick={{ fontSize: 11 }} interval="preserveStartEnd" /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ fontSize: 12 }} />
                {groups.map((g, i) => <Line key={g} type="monotone" dataKey={g} name={g === "value" ? def.label : g} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} isAnimationActive={false} />)}</LineChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} /><XAxis dataKey="name" tick={{ fontSize: 11 }} interval="preserveStartEnd" /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ fontSize: 12 }} />
                {groups.map((g, i) => <Bar key={g} dataKey={g} name={g === "value" ? def.label : g} fill={COLORS[i % COLORS.length]} stackId={group === "none" ? undefined : "s"} radius={2} isAnimationActive={false} />)}</BarChart>
            )}
          </ResponsiveContainer></div>
        )}
      </CardContent></Card>

      {inRange.length > 0 && (
        <Card><CardHeader><CardTitle className="text-base">Table</CardTitle></CardHeader><CardContent className="overflow-x-auto">
          <table className="w-full text-sm"><thead><tr className="text-left text-xs text-muted-foreground border-b"><th className="py-2 pr-3">Period</th>{groups.map((g) => <th key={g} className="py-2 pr-3 text-right">{g === "value" ? def.label : g}</th>)}</tr></thead>
            <tbody>{buckets.map((b) => <tr key={b.start} className="border-b last:border-0"><td className="py-1.5 pr-3">{b.label}</td>{groups.map((g) => <td key={g} className="py-1.5 pr-3 text-right tabular-nums">{fmt(b.rows[g])}</td>)}</tr>)}
              <tr className="font-semibold"><td className="py-2 pr-3">Total{def.avg ? " (avg)" : ""}</td>{groups.map((g) => <td key={g} className="py-2 pr-3 text-right tabular-nums">{fmt(agg(group === "none" ? inRange : inRange.filter((e) => groupOf(e) === g)))}</td>)}</tr></tbody></table>
        </CardContent></Card>
      )}
    </div>
  );
}
