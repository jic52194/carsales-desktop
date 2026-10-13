import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useCollection, insert, update, get, fullName, type Appointment } from "@/lib/store";
import { useInventory, vTitle } from "@/lib/inventory";
import { useAuth, useUsers } from "@/lib/auth";

const TYPES = [["test_drive", "Test drive"], ["sales", "Sales appointment"], ["delivery", "Delivery"], ["service", "Service"], ["other", "Other"]] as const;
const STATUSES = ["scheduled", "confirmed", "showed", "no_show", "cancelled"] as const;
const toLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export default function Appointments() {
  const { user } = useAuth();
  const appts = useCollection("appointments");
  const customers = useCollection("customers");
  const inventory = useInventory();
  const users = useUsers().filter((u) => u.isActive);
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customerId: "", vehicleId: "", type: "test_drive", startsAt: toLocal(new Date(Date.now() + 3600e3)), assignedTo: user?.id ?? "", notes: "" });
  const [range, setRange] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    const c = params.get("customer");
    if (c) { setForm((f) => ({ ...f, customerId: c, vehicleId: params.get("vehicle") || "" })); setOpen(true); setParams({}, { replace: true }); }
  }, [params, setParams]);

  const nowIso = new Date().toISOString();
  const rows = useMemo(() => appts.filter((a) => (range === "upcoming" ? a.startsAt >= nowIso : a.startsAt < nowIso)).sort((a, b) => (range === "upcoming" ? a.startsAt.localeCompare(b.startsAt) : b.startsAt.localeCompare(a.startsAt))), [appts, range, nowIso]);

  const save = () => {
    if (!form.startsAt) return toast.error("Pick a date/time");
    insert("appointments", { ...form, customerId: form.customerId || undefined, vehicleId: form.vehicleId || undefined, assignedTo: form.assignedTo || undefined, startsAt: new Date(form.startsAt).toISOString(), status: "scheduled" } as any)
      .then(() => { toast.success("Appointment booked"); setOpen(false); }).catch((e) => toast.error(e.message));
  };
  const byDay = rows.reduce<Record<string, Appointment[]>>((acc, a) => { const k = new Date(a.startsAt).toDateString(); (acc[k] ||= []).push(a); return acc; }, {});

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Appointments</h1><p className="text-muted-foreground">{rows.length} {range}</p></div>
        <div className="flex gap-2">
          <Select value={range} onValueChange={(v: any) => setRange(v)}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="upcoming">Upcoming</SelectItem><SelectItem value="past">Past</SelectItem></SelectContent></Select>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Book</Button>
        </div>
      </div>
      {rows.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">No {range} appointments.</CardContent></Card>}
      {Object.entries(byDay).map(([day, list]) => (
        <Card key={day}><CardContent className="p-0">
          <p className="px-4 py-2 text-xs font-bold uppercase tracking-wide bg-muted/50">{new Date(day).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          <div className="divide-y">
            {list.map((a) => {
              const c = a.customerId ? get("customers", a.customerId) : undefined; const v = a.vehicleId ? inventory.find((x) => x.id === a.vehicleId) : undefined;
              return (
                <div key={a.id} className="px-4 py-3 flex flex-col md:flex-row md:items-center gap-2">
                  <p className="w-24 font-semibold">{new Date(a.startsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
                  <div className="flex-1"><p className="font-semibold">{fullName(c)} <span className="font-normal text-muted-foreground">· {TYPES.find((t) => t[0] === a.type)?.[1]}</span></p><p className="text-xs text-muted-foreground">{v ? vTitle(v) : ""}{a.notes ? ` — ${a.notes}` : ""}</p></div>
                  <p className="text-xs text-muted-foreground">{users.find((u) => u.id === a.assignedTo)?.fullName}</p>
                  <Select value={a.status} onValueChange={(s) => update("appointments", a.id, { status: s as any }).catch((e) => toast.error(e.message))}><SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent></Select>
                </div>
              );
            })}
          </div>
        </CardContent></Card>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Book appointment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Customer</Label><Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v === "none" ? "" : v })}><SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger><SelectContent><SelectItem value="none">Walk-in / unknown</SelectItem>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{fullName(c)}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Vehicle</Label><Select value={form.vehicleId} onValueChange={(v) => setForm({ ...form, vehicleId: v === "none" ? "" : v })}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{inventory.filter((v) => v.status === "Available").map((v) => <SelectItem key={v.id} value={v.id}>{vTitle(v)} · #{v.stockNumber}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Type</Label><Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TYPES.map((t) => <SelectItem key={t[0]} value={t[0]}>{t[1]}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>When</Label><Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>With</Label><Select value={form.assignedTo} onValueChange={(v) => setForm({ ...form, assignedTo: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Book</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
