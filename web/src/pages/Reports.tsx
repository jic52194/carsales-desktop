import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCollection, money } from "@/lib/store";
import { useInventory, vDaysInStock } from "@/lib/inventory";
import { useUsers } from "@/lib/auth";

function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{label}</p><p className="text-2xl font-black mt-1">{value}</p>{sub && <p className="text-xs text-muted-foreground">{sub}</p>}</CardContent></Card>;
}

export default function Reports() {
  const inventory = useInventory();
  const deals = useCollection("deals");
  const leads = useCollection("leads");
  const customers = useCollection("customers");
  const users = useUsers();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const sold = deals.filter((d) => ["funded", "delivered"].includes(d.status));
  const soldMtd = sold.filter((d) => d.updatedAt >= monthStart);
  const grossMtd = soldMtd.reduce((a, d) => a + (d.totalGross || 0), 0);
  const avgGross = soldMtd.length ? grossMtd / soldMtd.length : 0;
  const available = inventory.filter((v) => v.status === "Available");
  const avgDays = available.length ? Math.round(available.reduce((a, v) => a + vDaysInStock(v), 0) / available.length) : 0;
  const aged = available.filter((v) => vDaysInStock(v) > 60).length;
  const invValue = available.reduce((a, v) => a + (v.price ?? 0), 0);
  const leadsMtd = leads.filter((l) => l.createdAt >= monthStart);
  const closeRate = leads.length ? Math.round((leads.filter((l) => l.stage === "sold").length / leads.length) * 100) : 0;

  const bySales = useMemo(() => users.map((u) => { const mine = soldMtd.filter((d) => d.salespersonId === u.id); return { u, units: mine.length, gross: mine.reduce((a, d) => a + (d.totalGross || 0), 0) }; }).filter((r) => r.units > 0).sort((a, b) => b.gross - a.gross), [users, soldMtd]);
  const bySource = useMemo(() => Object.entries(leadsMtd.reduce<Record<string, number>>((acc, l) => { acc[l.source || "Unknown"] = (acc[l.source || "Unknown"] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]), [leadsMtd]);
  const byMake = useMemo(() => Object.entries(available.reduce<Record<string, number>>((acc, v) => { acc[v.make] = (acc[v.make] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 10), [available]);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div><h1 className="text-3xl font-black">Reports</h1><p className="text-muted-foreground">Month to date · {now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile label="Units sold MTD" value={soldMtd.length} sub={`${sold.length} all time`} />
        <Tile label="Gross MTD" value={money(grossMtd)} sub={`avg ${money(avgGross)} per unit`} />
        <Tile label="Leads MTD" value={leadsMtd.length} sub={`${closeRate}% close rate all time`} />
        <Tile label="Customers" value={customers.length} />
        <Tile label="Units available" value={available.length} sub={`${money(invValue)} at asking`} />
        <Tile label="Avg days in stock" value={avgDays} sub={`${aged} units over 60 days`} />
        <Tile label="Deals working" value={deals.filter((d) => ["working", "pending_approval", "approved"].includes(d.status)).length} />
        <Tile label="Dead deals" value={deals.filter((d) => d.status === "dead").length} />
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <Card><CardHeader><CardTitle className="text-base">Salesperson board</CardTitle><CardDescription>Units & gross MTD</CardDescription></CardHeader><CardContent className="divide-y text-sm">
          {bySales.length === 0 && <p className="text-muted-foreground py-2">No sold deals this month yet.</p>}
          {bySales.map((r, i) => <div key={r.u.id} className="flex justify-between py-2"><span>{i + 1}. {r.u.fullName}</span><span>{r.units} · {money(r.gross)}</span></div>)}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Lead sources</CardTitle><CardDescription>MTD</CardDescription></CardHeader><CardContent className="divide-y text-sm">
          {bySource.length === 0 && <p className="text-muted-foreground py-2">No leads this month yet.</p>}
          {bySource.map(([s, n]) => <div key={s} className="flex justify-between py-2"><span>{s}</span><span className="font-semibold">{n}</span></div>)}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Inventory by make</CardTitle><CardDescription>Available units</CardDescription></CardHeader><CardContent className="divide-y text-sm">
          {byMake.map(([m, n]) => <div key={m} className="flex justify-between py-2"><span>{m}</span><span className="font-semibold">{n}</span></div>)}
        </CardContent></Card>
      </div>
    </div>
  );
}
