import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Download, Target, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useCollection, money } from "@/lib/store";
import { useInventory } from "@/lib/inventory";
import { useRecords, addRecord, updateRecord } from "@/lib/records";
import { useAuth, useUsers } from "@/lib/auth";
import { downloadCsv } from "@/lib/csv";

/** Monthly targets — records kind "target" (one per month, "YYYY-MM"). */
export interface TargetRec { month: string; units: number; gross: number; appointments: number }

const ymd = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const shift = (day: string, n: number) => { const d = new Date(day + "T00:00:00"); d.setDate(d.getDate() + n); return ymd(d.toISOString()); };
const METRICS = ["Units sold", "Gross", "Leads in", "Appts set", "Appts showed", "Test drives", "Cars added"] as const;

export default function DOC() {
  const { user, hasPermission } = useAuth();
  const canSetTargets = hasPermission(["admin", "manager"]);
  const deals = useCollection("deals");
  const leads = useCollection("leads");
  const appts = useCollection("appointments");
  const inventory = useInventory();
  const users = useUsers();
  const targets = useRecords<TargetRec>("target");
  const [day, setDay] = useState(ymd(new Date().toISOString()));
  const [tOpen, setTOpen] = useState(false);
  const [tf, setTf] = useState({ units: "", gross: "", appointments: "" });

  const month = day.slice(0, 7);
  const monthStart = month + "-01";
  const inRange = (iso: string | undefined, from: string, to: string) => !!iso && ymd(iso) >= from && ymd(iso) <= to;
  const sameMonth = (iso?: string) => inRange(iso, monthStart, day);

  const calc = (from: string, to: string, uid?: string) => {
    const d = deals.filter((x) => x.status === "delivered" && inRange(x.updatedAt, from, to) && (!uid || x.salespersonId === uid));
    const l = leads.filter((x) => inRange(x.createdAt, from, to) && (!uid || x.assignedTo === uid));
    const set = appts.filter((x) => inRange(x.createdAt, from, to) && (!uid || x.assignedTo === uid));
    const showed = appts.filter((x) => x.status === "showed" && inRange(x.startsAt, from, to) && (!uid || x.assignedTo === uid));
    const td = showed.filter((x) => x.type === "test_drive");
    const cars = uid ? [] : inventory.filter((v) => inRange(v.addedAt, from, to));
    return { units: d.length, gross: d.reduce((a, x) => a + (x.totalGross || 0), 0), leads: l.length, set: set.length, showed: showed.length, testDrives: td.length, cars: cars.length };
  };
  const today = useMemo(() => calc(day, day), [deals, leads, appts, inventory, day]);
  const mtd = useMemo(() => calc(monthStart, day), [deals, leads, appts, inventory, day]);
  const bySales = useMemo(() => users.filter((u) => u.isActive && ["sales", "manager", "owner", "admin"].includes(u.role)).map((u) => ({ u, d: calc(day, day, u.id), m: calc(monthStart, day, u.id) })).filter((r) => r.m.units || r.m.leads || r.m.set || r.m.showed || r.d.units).sort((a, b) => b.m.units - a.m.units || b.m.gross - a.m.gross), [users, deals, leads, appts, day]);

  const target = targets.find((t) => t.data.month === month);
  const dim = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const elapsed = Number(day.slice(8, 10));
  const pace = (n: number) => Math.round((n / Math.max(elapsed, 1)) * dim);
  const pct = (n: number, t: number) => (t ? Math.round((n / t) * 100) : 0);

  const saveTarget = async () => {
    const data: TargetRec = { month, units: Number(tf.units) || 0, gross: Number(tf.gross) || 0, appointments: Number(tf.appointments) || 0 };
    try { if (target) await updateRecord<TargetRec>("target", target.id, data); else await addRecord<TargetRec>("target", data, user?.id); toast.success("Targets saved"); setTOpen(false); }
    catch (e: any) { toast.error(e.message || "Could not save"); }
  };
  const exportCsv = () => {
    const row = (name: string, d: ReturnType<typeof calc>, m: ReturnType<typeof calc>) => ({ name, unitsDay: d.units, grossDay: d.gross, leadsDay: d.leads, apptsSetDay: d.set, apptsShowedDay: d.showed, testDrivesDay: d.testDrives, unitsMtd: m.units, grossMtd: m.gross, leadsMtd: m.leads, apptsSetMtd: m.set, apptsShowedMtd: m.showed, testDrivesMtd: m.testDrives });
    downloadCsv(`doc-${day}`, [row("Dealership", today, mtd), ...bySales.map((r) => row(r.u.fullName, r.d, r.m))]);
  };

  const rows: { label: typeof METRICS[number]; d: string | number; m: string | number; t?: number; pace?: number; raw?: number }[] = [
    { label: "Units sold", d: today.units, m: mtd.units, t: target?.data.units, pace: pace(mtd.units), raw: mtd.units },
    { label: "Gross", d: money(today.gross), m: money(mtd.gross), t: target?.data.gross, pace: pace(mtd.gross), raw: mtd.gross },
    { label: "Leads in", d: today.leads, m: mtd.leads },
    { label: "Appts set", d: today.set, m: mtd.set, t: target?.data.appointments, pace: pace(mtd.set), raw: mtd.set },
    { label: "Appts showed", d: today.showed, m: mtd.showed },
    { label: "Test drives", d: today.testDrives, m: mtd.testDrives },
    { label: "Cars added", d: today.cars, m: mtd.cars },
  ];
  const empty = !deals.length && !leads.length && !appts.length && !inventory.length;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Daily Operating Control</h1><p className="text-muted-foreground">{new Date(day + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} · day {elapsed} of {dim}</p></div>
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant="outline" size="icon" onClick={() => setDay(shift(day, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Input type="date" className="w-40" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
          <Button variant="outline" size="icon" onClick={() => setDay(shift(day, 1))}><ChevronRight className="h-4 w-4" /></Button>
          {canSetTargets && <Button variant="outline" onClick={() => { setTf({ units: String(target?.data.units ?? ""), gross: String(target?.data.gross ?? ""), appointments: String(target?.data.appointments ?? "") }); setTOpen(true); }}><Target className="h-4 w-4 mr-1" /> Targets</Button>}
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" /> CSV</Button>
        </div>
      </div>

      {empty && <Card><CardContent className="p-8 text-center text-muted-foreground">Nothing to report yet. The DOC fills in from deals, leads, appointments, and inventory as the store uses the app.</CardContent></Card>}

      <Card><CardHeader><CardTitle className="text-base">Store</CardTitle><CardDescription>{target ? "Pace projects month-end at today's run rate." : canSetTargets ? "No monthly targets set — click Targets to add units, gross, and appointment goals." : "No monthly targets set for this month."}</CardDescription></CardHeader>
        <CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase"><tr><th className="text-left p-3">Metric</th><th className="text-right p-3">Day</th><th className="text-right p-3">MTD</th>{target && <><th className="text-right p-3">Target</th><th className="text-right p-3">% of target</th><th className="text-right p-3">Pace</th></>}</tr></thead>
          <tbody className="divide-y">{rows.map((r) => <tr key={r.label}>
            <td className="p-3 font-medium">{r.label}</td><td className="p-3 text-right">{r.d}</td><td className="p-3 text-right font-semibold">{r.m}</td>
            {target && <><td className="p-3 text-right text-muted-foreground">{r.t != null ? (r.label === "Gross" ? money(r.t) : r.t) : "—"}</td>
              <td className={`p-3 text-right ${r.t && r.raw != null && pct(r.raw, r.t) >= Math.round((elapsed / dim) * 100) ? "text-emerald-600 font-semibold" : ""}`}>{r.t ? `${pct(r.raw ?? 0, r.t)}%` : "—"}</td>
              <td className="p-3 text-right">{r.t ? (r.label === "Gross" ? money(r.pace) : r.pace) : "—"}</td></>}
          </tr>)}</tbody>
        </table></CardContent></Card>

      <Card><CardHeader><CardTitle className="text-base">By salesperson</CardTitle><CardDescription>Day / MTD · delivered units, gross, leads assigned, appointments set and showed</CardDescription></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {bySales.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No salesperson activity this month yet.</p> : <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase"><tr><th className="text-left p-3">Salesperson</th><th className="text-right p-3">Units</th><th className="text-right p-3">Gross</th><th className="text-right p-3">Leads</th><th className="text-right p-3">Set</th><th className="text-right p-3">Showed</th><th className="text-right p-3">Test drives</th></tr></thead>
            <tbody className="divide-y">{bySales.map(({ u, d, m }) => <tr key={u.id}>
              <td className="p-3 font-medium">{u.fullName}</td>
              <td className="p-3 text-right">{d.units} / <b>{m.units}</b></td><td className="p-3 text-right whitespace-nowrap">{money(d.gross)} / <b>{money(m.gross)}</b></td>
              <td className="p-3 text-right">{d.leads} / <b>{m.leads}</b></td><td className="p-3 text-right">{d.set} / <b>{m.set}</b></td><td className="p-3 text-right">{d.showed} / <b>{m.showed}</b></td><td className="p-3 text-right">{d.testDrives} / <b>{m.testDrives}</b></td>
            </tr>)}</tbody>
          </table>}
        </CardContent></Card>

      <Dialog open={tOpen} onOpenChange={setTOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Targets for {new Date(month + "-01T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" })}</DialogTitle><DialogDescription>Leave blank for no target.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Units</Label><Input type="number" value={tf.units} onChange={(e) => setTf({ ...tf, units: e.target.value })} /></div>
            <div className="space-y-1"><Label>Gross ($)</Label><Input type="number" value={tf.gross} onChange={(e) => setTf({ ...tf, gross: e.target.value })} /></div>
            <div className="space-y-1"><Label>Appointments set</Label><Input type="number" value={tf.appointments} onChange={(e) => setTf({ ...tf, appointments: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setTOpen(false)}>Cancel</Button><Button onClick={saveTarget}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
