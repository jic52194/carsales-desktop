import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, ArrowUp, ArrowDown, X, Maximize2, Minimize2, Kanban, ListTodo, Calendar, Car, DollarSign, PhoneMissed, Package, Globe, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { useCollection, money, fullName, fmtDateTime, get } from "@/lib/store";
import { useInventory, vTitle, vDaysInStock } from "@/lib/inventory";
import { useRecords, addRecord, updateRecord } from "@/lib/records";
import { useAuth } from "@/lib/auth";

type WidgetType = "open_leads" | "my_tasks" | "today_appts" | "aging_units" | "gross_mtd" | "uncontacted_leads" | "low_stock_parts" | "website_leads";
type Size = "sm" | "lg";
interface Widget { id: string; type: WidgetType; size: Size }
/** Per-user layout — records kind "dashboard": one record per userId. */
export interface DashboardLayout { userId: string; widgets: Widget[] }
interface Part { partNo: string; description: string; qty: number; minQty: number }

const CATALOG: { type: WidgetType; title: string; desc: string; icon: any; to: string }[] = [
  { type: "open_leads", title: "Open leads", desc: "Leads not yet sold or lost, newest first", icon: Kanban, to: "/leads" },
  { type: "my_tasks", title: "My tasks", desc: "Your open tasks, overdue first", icon: ListTodo, to: "/tasks" },
  { type: "today_appts", title: "Today's appointments", desc: "Everything on the board today", icon: Calendar, to: "/appointments" },
  { type: "aging_units", title: "Aging units", desc: "Available units 60+ days in stock", icon: Car, to: "/inventory" },
  { type: "gross_mtd", title: "Gross MTD", desc: "Funded + delivered gross this month", icon: DollarSign, to: "/deals" },
  { type: "uncontacted_leads", title: "Uncontacted leads", desc: "Still in 'new' after 15 minutes", icon: PhoneMissed, to: "/leads" },
  { type: "low_stock_parts", title: "Low-stock parts", desc: "Parts at or below their minimum (needs Parts records)", icon: Package, to: "/parts" },
  { type: "website_leads", title: "Recent website leads", desc: "Leads whose source is Website", icon: Globe, to: "/leads" },
];
const DEFAULT: Widget[] = [{ id: "w1", type: "open_leads", size: "sm" }, { id: "w2", type: "my_tasks", size: "sm" }, { id: "w3", type: "today_appts", size: "lg" }];

function WidgetBody({ w }: { w: Widget }) {
  const { user } = useAuth();
  const leads = useCollection("leads"); const tasks = useCollection("tasks"); const appts = useCollection("appointments"); const deals = useCollection("deals");
  const inventory = useInventory(); const parts = useRecords<Part>("part");
  const now = new Date(); const nowIso = now.toISOString(); const limit = w.size === "lg" ? 8 : 4;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const Row = ({ to, text, sub }: { to: string; text: string; sub?: string }) => <Link to={to} className="py-1.5 flex items-center justify-between gap-2 text-sm hover:text-primary"><span className="truncate">{text}</span>{sub && <span className="text-xs text-muted-foreground whitespace-nowrap">{sub}</span>}</Link>;
  const Big = ({ v, sub }: { v: string | number; sub: string }) => <div><p className="text-3xl font-black">{v}</p><p className="text-xs text-muted-foreground">{sub}</p></div>;
  const Empty = ({ t }: { t: string }) => <p className="text-sm text-muted-foreground py-2">{t}</p>;
  switch (w.type) {
    case "open_leads": { const l = leads.filter((x) => !["sold", "lost"].includes(x.stage)); return l.length ? <div className="divide-y"><Big v={l.length} sub="open leads" />{l.slice(0, limit).map((x) => <Row key={x.id} to="/leads" text={fullName(get("customers", x.customerId))} sub={x.stage} />)}</div> : <Empty t="No open leads." />; }
    case "my_tasks": { const t = tasks.filter((x) => x.status === "open" && (!x.assignedTo || x.assignedTo === user?.id)).sort((a, b) => (a.dueAt || "9").localeCompare(b.dueAt || "9")); return t.length ? <div className="divide-y"><Big v={t.length} sub={`${t.filter((x) => x.dueAt && x.dueAt < nowIso).length} overdue`} />{t.slice(0, limit).map((x) => <Row key={x.id} to="/tasks" text={x.title} sub={x.dueAt ? fmtDateTime(x.dueAt) : "no due date"} />)}</div> : <Empty t="You're all caught up." />; }
    case "today_appts": { const a = appts.filter((x) => new Date(x.startsAt).toDateString() === now.toDateString() && x.status !== "cancelled").sort((p, q) => p.startsAt.localeCompare(q.startsAt)); return a.length ? <div className="divide-y"><Big v={a.length} sub="today" />{a.slice(0, limit).map((x) => <Row key={x.id} to="/appointments" text={`${fullName(get("customers", x.customerId || ""))} · ${x.type.replace("_", " ")}`} sub={new Date(x.startsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} />)}</div> : <Empty t="Nothing scheduled today." />; }
    case "aging_units": { const v = inventory.filter((x) => x.status === "Available" && vDaysInStock(x) >= 60).sort((p, q) => vDaysInStock(q) - vDaysInStock(p)); return v.length ? <div className="divide-y"><Big v={v.length} sub={`${money(v.reduce((s, x) => s + (x.price ?? 0), 0))} at asking`} />{v.slice(0, limit).map((x) => <Row key={x.id} to={`/inventory/${x.id}`} text={vTitle(x)} sub={`${vDaysInStock(x)} days`} />)}</div> : <Empty t="No units over 60 days." />; }
    case "gross_mtd": { const d = deals.filter((x) => ["funded", "delivered"].includes(x.status) && x.updatedAt >= monthStart); const g = d.reduce((s, x) => s + (x.totalGross || 0), 0); return <Big v={money(g)} sub={d.length ? `${d.length} units · avg ${money(g / d.length)}` : "no deliveries yet this month"} />; }
    case "uncontacted_leads": { const l = leads.filter((x) => x.stage === "new" && Date.parse(x.createdAt) < now.getTime() - 15 * 60e3); return l.length ? <div className="divide-y"><Big v={l.length} sub="waiting for first contact" />{l.slice(0, limit).map((x) => <Row key={x.id} to="/leads" text={fullName(get("customers", x.customerId))} sub={`${Math.round((now.getTime() - Date.parse(x.createdAt)) / 36e5)}h`} />)}</div> : <Empty t="Every new lead has been contacted." />; }
    case "low_stock_parts": { if (!parts.length) return <Empty t="No parts on file yet — add them in Parts to track stock levels." />; const p = parts.filter((x) => x.data.qty <= (x.data.minQty ?? 0)); return p.length ? <div className="divide-y"><Big v={p.length} sub="at or below minimum" />{p.slice(0, limit).map((x) => <Row key={x.id} to="/parts" text={`${x.data.partNo} · ${x.data.description}`} sub={`${x.data.qty} / min ${x.data.minQty}`} />)}</div> : <Empty t="All parts above minimum." />; }
    case "website_leads": { const l = leads.filter((x) => (x.source || "").toLowerCase() === "website"); return l.length ? <div className="divide-y"><Big v={l.length} sub="website leads all time" />{l.slice(0, limit).map((x) => <Row key={x.id} to="/leads" text={fullName(get("customers", x.customerId))} sub={fmtDateTime(x.createdAt)} />)}</div> : <Empty t="No website leads yet. Connect your website forms in Settings → Connections." />; }
  }
}

export default function DashboardBuilder() {
  const { user } = useAuth();
  const layouts = useRecords<DashboardLayout>("dashboard");
  const mine = useMemo(() => layouts.find((r) => r.data.userId === user?.id), [layouts, user?.id]);
  const widgets = mine?.data.widgets ?? DEFAULT;
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const persist = async (next: Widget[]) => {
    if (!user) return;
    setSaving(true);
    try { if (mine) await updateRecord<DashboardLayout>("dashboard", mine.id, { widgets: next }); else await addRecord<DashboardLayout>("dashboard", { userId: user.id, widgets: next }, user.id); }
    catch (e: any) { toast.error(e.message || "Could not save layout"); }
    finally { setSaving(false); }
  };
  const move = (i: number, dir: -1 | 1) => { const j = i + dir; if (j < 0 || j >= widgets.length) return; const n = [...widgets]; [n[i], n[j]] = [n[j], n[i]]; persist(n); };
  const add = (type: WidgetType) => { persist([...widgets, { id: `w${Date.now().toString(36)}`, type, size: "sm" }]); setAdding(false); };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div><h1 className="text-3xl font-black">My Dashboard</h1><p className="text-muted-foreground">Your own layout, saved to your account — every widget is live data.{saving ? " Saving…" : ""}</p></div>
        <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4 mr-1" /> Add widget</Button>
      </div>

      {widgets.length === 0 && <Card className="border-dashed"><CardContent className="p-10 text-center text-sm text-muted-foreground"><LayoutGrid className="h-8 w-8 mx-auto mb-2 opacity-50" />Your dashboard is empty. Add a widget to get started.</CardContent></Card>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {widgets.map((w, i) => { const c = CATALOG.find((x) => x.type === w.type)!; const Icon = c.icon; return (
          <Card key={w.id} className={w.size === "lg" ? "md:col-span-2" : ""}>
            <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0 gap-2">
              <div className="min-w-0"><CardTitle className="text-sm flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /> {c.title}</CardTitle><CardDescription className="text-xs">{c.desc}</CardDescription></div>
              <div className="flex shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(i, -1)} disabled={i === 0} title="Move up"><ArrowUp className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(i, 1)} disabled={i === widgets.length - 1} title="Move down"><ArrowDown className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => persist(widgets.map((x) => (x.id === w.id ? { ...x, size: x.size === "lg" ? "sm" : "lg" } : x)))} title={w.size === "lg" ? "Make small" : "Make large"}>{w.size === "lg" ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}</Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => persist(widgets.filter((x) => x.id !== w.id))} title="Remove"><X className="h-3.5 w-3.5" /></Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0"><WidgetBody w={w} /><Link to={c.to} className="text-xs text-primary mt-2 inline-block">Open →</Link></CardContent>
          </Card>); })}
      </div>

      <Dialog open={adding} onOpenChange={setAdding}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Add a widget</DialogTitle><DialogDescription>Each widget is computed live from your dealership's data.</DialogDescription></DialogHeader>
        <div className="grid gap-2">{CATALOG.map((c) => { const Icon = c.icon; const used = widgets.some((w) => w.type === c.type); return (
          <button key={c.type} onClick={() => add(c.type)} className="flex items-center gap-3 p-3 rounded-lg border text-left hover:bg-muted/60 transition-colors">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Icon className="h-4 w-4 text-primary" /></div>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{c.title}</p><p className="text-xs text-muted-foreground">{c.desc}</p></div>
            {used && <Badge variant="secondary" className="text-[10px]">added</Badge>}
          </button>); })}</div>
      </DialogContent></Dialog>
    </div>
  );
}
