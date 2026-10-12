import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Car, Users, Kanban, FileSignature, ListTodo, Calendar, Plus, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenant";
import { useInventory, vTitle } from "@/lib/inventory";
import { useCollection, money, fmtDateTime, fullName, get } from "@/lib/store";

function Stat({ label, value, sub, icon: Icon, to }: { label: string; value: string | number; sub?: string; icon: any; to: string }) {
  return (
    <Link to={to} className="block">
      <Card className="hover:shadow-md transition-shadow h-full">
        <CardContent className="p-5 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
            <p className="text-3xl font-black mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Icon className="h-5 w-5 text-primary" /></div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const tenant = useTenant();
  const inventory = useInventory();
  const customers = useCollection("customers");
  const leads = useCollection("leads");
  const deals = useCollection("deals");
  const tasks = useCollection("tasks");
  const appts = useCollection("appointments");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const available = inventory.filter((v) => v.status === "Available");
  const invValue = available.reduce((a, v) => a + (v.price ?? 0), 0);
  const openLeads = leads.filter((l) => !["sold", "lost"].includes(l.stage));
  const mtdDeals = deals.filter((d) => ["approved", "funded", "delivered"].includes(d.status) && d.updatedAt >= monthStart);
  const mtdGross = mtdDeals.reduce((a, d) => a + (d.totalGross || 0), 0);
  const myOpenTasks = tasks.filter((t) => t.status === "open" && (!t.assignedTo || t.assignedTo === user?.id));
  const overdue = myOpenTasks.filter((t) => t.dueAt && t.dueAt < now.toISOString());
  const todayStr = now.toDateString();
  const todayAppts = appts.filter((a) => new Date(a.startsAt).toDateString() === todayStr && a.status !== "cancelled").sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">{greeting}, {user?.fullName.split(" ")[0]}</h1>
          <p className="text-muted-foreground">{tenant.name} · {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/customers?new=1"><Plus className="h-4 w-4 mr-1" /> Customer</Link></Button>
          <Button asChild><Link to="/desking"><Plus className="h-4 w-4 mr-1" /> New Deal</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Units in stock" value={available.length} sub={`${money(invValue)} at asking price`} icon={Car} to="/inventory" />
        <Stat label="Open leads" value={openLeads.length} sub={`${customers.length} customers`} icon={Kanban} to="/leads" />
        <Stat label="Deals MTD" value={mtdDeals.length} sub={`${money(mtdGross)} gross`} icon={FileSignature} to="/deals" />
        <Stat label="My open tasks" value={myOpenTasks.length} sub={overdue.length ? `${overdue.length} overdue` : "nothing overdue"} icon={ListTodo} to="/tasks" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /> Today's appointments</CardTitle><CardDescription>{todayAppts.length ? `${todayAppts.length} scheduled` : "Nothing scheduled today"}</CardDescription></div>
            <Button asChild size="sm" variant="ghost"><Link to="/appointments">All <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent className="divide-y">
            {todayAppts.length === 0 && <p className="text-sm text-muted-foreground py-4">Book a test drive or delivery from a customer or lead.</p>}
            {todayAppts.map((a) => {
              const c = a.customerId ? get("customers", a.customerId) : undefined;
              const v = a.vehicleId ? inventory.find((x) => x.id === a.vehicleId) : undefined;
              return (
                <div key={a.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{fullName(c)}</p>
                    <p className="text-xs text-muted-foreground">{a.type.replace("_", " ")}{v ? ` · ${vTitle(v)}` : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{new Date(a.startsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
                    <Badge variant="outline" className="text-[10px] uppercase">{a.status}</Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div><CardTitle className="flex items-center gap-2"><ListTodo className="h-5 w-5 text-primary" /> My tasks</CardTitle><CardDescription>{myOpenTasks.length ? `${myOpenTasks.length} open` : "You're all caught up"}</CardDescription></div>
            <Button asChild size="sm" variant="ghost"><Link to="/tasks">All <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent className="divide-y">
            {myOpenTasks.length === 0 && <p className="text-sm text-muted-foreground py-4">Tasks you create or get assigned show up here.</p>}
            {myOpenTasks.slice(0, 6).map((t) => (
              <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                <p className="font-medium">{t.title}</p>
                <p className={`text-xs ${t.dueAt && t.dueAt < now.toISOString() ? "text-destructive font-semibold" : "text-muted-foreground"}`}>{t.dueAt ? fmtDateTime(t.dueAt) : "no due date"}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Recent leads</CardTitle><CardDescription>Newest first</CardDescription></div>
            <Button asChild size="sm" variant="ghost"><Link to="/leads">Pipeline <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent className="divide-y">
            {leads.length === 0 && <p className="text-sm text-muted-foreground py-4">No leads yet. Add a customer and start a lead, or connect your website forms in Settings → Connections.</p>}
            {leads.slice(0, 6).map((l) => {
              const c = get("customers", l.customerId);
              const v = l.vehicleId ? inventory.find((x) => x.id === l.vehicleId) : undefined;
              return (
                <div key={l.id} className="py-3 flex items-center justify-between gap-3">
                  <div><p className="font-semibold">{fullName(c)}</p><p className="text-xs text-muted-foreground">{v ? vTitle(v) : "No vehicle yet"}{l.source ? ` · ${l.source}` : ""}</p></div>
                  <Badge variant="secondary" className="capitalize">{l.stage}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
