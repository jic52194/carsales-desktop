import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Flame, CalendarDays } from "lucide-react";
import { useCollection } from "@/lib/store";

type Dataset = "deals" | "delivered" | "appointments" | "leads";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const hLabel = (h: number) => (h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`);
const MIN_POINTS = 10;

export default function DealHeatmap() {
  const deals = useCollection("deals");
  const appts = useCollection("appointments");
  const leads = useCollection("leads");
  const [dataset, setDataset] = useState<Dataset>("deals");
  const [range, setRange] = useState("90");

  const since = useMemo(() => (range === "all" ? 0 : Date.now() - Number(range) * 86400000), [range]);
  const points = useMemo<Date[]>(() => {
    const src = dataset === "deals" ? deals.map((d) => d.createdAt)
      : dataset === "delivered" ? deals.filter((d) => ["funded", "delivered"].includes(d.status)).map((d) => d.updatedAt)
      : dataset === "appointments" ? appts.filter((a) => a.status !== "cancelled").map((a) => a.startsAt)
      : leads.map((l) => l.createdAt);
    return src.map((iso) => new Date(iso)).filter((d) => !isNaN(d.getTime()) && d.getTime() >= since);
  }, [dataset, deals, appts, leads, since]);

  const grid = useMemo(() => {
    const g = DAYS.map(() => HOURS.map(() => 0));
    for (const d of points) g[d.getDay()][d.getHours()] += 1;
    return g;
  }, [points]);
  const max = Math.max(0, ...grid.flat());
  const byDay = DAYS.map((d, i) => ({ d, n: grid[i].reduce((a, b) => a + b, 0) }));
  const byHour = HOURS.map((h) => ({ h, n: grid.reduce((a, row) => a + row[h], 0) }));
  const bestDay = byDay.reduce((a, b) => (b.n > a.n ? b : a), byDay[0]);
  const bestHour = byHour.reduce((a, b) => (b.n > a.n ? b : a), byHour[0]);
  let bestCell = { d: 0, h: 0, n: 0 };
  grid.forEach((row, d) => row.forEach((n, h) => { if (n > bestCell.n) bestCell = { d, h, n }; }));
  // only show hours with activity (plus a sensible 7am–9pm floor) so the grid stays readable on a phone
  const active = HOURS.filter((h) => byHour[h].n > 0);
  const lo = Math.min(7, ...active), hi = Math.max(21, ...active);
  const shownHours = HOURS.filter((h) => h >= lo && h <= hi);
  const enough = points.length >= MIN_POINTS;
  const label = { deals: "deals created", delivered: "deals delivered", appointments: "appointments", leads: "leads created" }[dataset];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div><h1 className="text-3xl font-black">Deal Heatmap</h1><p className="text-muted-foreground">When business actually happens at your store — by weekday and hour, from your own records.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={dataset} onValueChange={(v) => setDataset(v as Dataset)}><TabsList><TabsTrigger value="deals">Deals</TabsTrigger><TabsTrigger value="delivered">Delivered</TabsTrigger><TabsTrigger value="appointments">Appts</TabsTrigger><TabsTrigger value="leads">Leads</TabsTrigger></TabsList></Tabs>
          <Select value={range} onValueChange={setRange}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="30">Last 30 days</SelectItem><SelectItem value="90">Last 90 days</SelectItem><SelectItem value="365">Last year</SelectItem><SelectItem value="all">All time</SelectItem></SelectContent></Select>
        </div>
      </div>

      {!enough ? (
        <Card className="border-dashed"><CardContent className="p-10 text-center">
          <CalendarDays className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="font-semibold">Not enough data yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{points.length} {label} in this range. The heatmap needs at least {MIN_POINTS} so the pattern means something. Widen the range, pick another dataset, or keep logging — it fills in on its own.</p>
        </CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="p-4"><p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Best day</p><p className="text-2xl font-black">{bestDay.d}</p><p className="text-xs text-muted-foreground">{bestDay.n} of {points.length} ({Math.round((bestDay.n / points.length) * 100)}%)</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Best hour</p><p className="text-2xl font-black">{hLabel(bestHour.h)}</p><p className="text-xs text-muted-foreground">{bestHour.n} ({Math.round((bestHour.n / points.length) * 100)}%)</p></CardContent></Card>
            <Card className="border-primary/40"><CardContent className="p-4"><p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1"><Flame className="h-3 w-3" /> Hottest slot</p><p className="text-2xl font-black">{DAYS[bestCell.d]} {hLabel(bestCell.h)}</p><p className="text-xs text-muted-foreground">{bestCell.n} {label}</p></CardContent></Card>
          </div>

          <Card><CardHeader><CardTitle className="text-base capitalize">{label}</CardTitle><CardDescription>{points.length} records · darker = more. Hours {hLabel(lo)}–{hLabel(hi)} shown.</CardDescription></CardHeader><CardContent className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid gap-px" style={{ gridTemplateColumns: `3rem repeat(${shownHours.length}, minmax(0, 1fr))` }}>
                <div />{shownHours.map((h) => <div key={h} className="text-[10px] text-center text-muted-foreground pb-1">{hLabel(h)}</div>)}
                {DAYS.map((d, di) => (
                  <div key={d} className="contents">
                    <div className="text-xs font-medium text-muted-foreground pr-2 flex items-center">{d}</div>
                    {shownHours.map((h) => { const n = grid[di][h]; const a = max ? n / max : 0; return (
                      <div key={h} title={`${d} ${hLabel(h)}: ${n}`} className="h-8 rounded-sm flex items-center justify-center text-[10px] font-semibold border border-border/40" style={{ backgroundColor: n ? `hsl(var(--primary) / ${0.15 + a * 0.85})` : undefined, color: a > 0.55 ? "white" : undefined }}>{n || ""}</div>
                    ); })}
                  </div>
                ))}
              </div>
            </div>
          </CardContent></Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle className="text-base">By weekday</CardTitle></CardHeader><CardContent className="space-y-1.5">
              {byDay.map((r) => <div key={r.d} className="flex items-center gap-2 text-sm"><span className="w-9 text-muted-foreground">{r.d}</span><div className="flex-1 h-4 bg-muted rounded"><div className="h-4 rounded bg-primary" style={{ width: `${max ? (r.n / Math.max(...byDay.map((x) => x.n))) * 100 : 0}%` }} /></div><span className="w-8 text-right tabular-nums">{r.n}</span></div>)}
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">By hour</CardTitle></CardHeader><CardContent className="space-y-1.5">
              {byHour.filter((r) => r.h >= lo && r.h <= hi).map((r) => <div key={r.h} className="flex items-center gap-2 text-sm"><span className="w-9 text-muted-foreground">{hLabel(r.h)}</span><div className="flex-1 h-3 bg-muted rounded"><div className="h-3 rounded bg-primary" style={{ width: `${(r.n / Math.max(1, bestHour.n)) * 100}%` }} /></div><span className="w-8 text-right tabular-nums">{r.n}</span></div>)}
            </CardContent></Card>
          </div>
        </>
      )}
    </div>
  );
}
