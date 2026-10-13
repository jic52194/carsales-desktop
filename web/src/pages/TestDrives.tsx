import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, KeyRound, LogIn, Clock } from "lucide-react";
import { toast } from "sonner";
import { useCollection, insert, update, fullName, fmtDateTime, fmtDate, logActivity, type Appointment } from "@/lib/store";
import { useInventory, vTitle } from "@/lib/inventory";
import { useRecords, addRecord, updateRecord, type Rec } from "@/lib/records";
import { useAuth, useUsers } from "@/lib/auth";

export interface TestDrive {
  appointmentId: string; customerId?: string; vehicleId?: string; salespersonId?: string;
  checkOutAt?: string; checkInAt?: string; licenseNote: string; startMiles?: number; endMiles?: number; notes: string;
}
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
const mins = (a?: string, b?: string) => (a && b ? Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000)) : null);

export default function TestDrives() {
  const { user } = useAuth();
  const users = useUsers().filter((u) => u.isActive);
  const appointments = useCollection("appointments");
  const customers = useCollection("customers");
  const inventory = useInventory();
  const logs = useRecords<TestDrive>("test_drive");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customerId: "", vehicleId: "", assignedTo: user?.id ?? "", startsAt: toLocalInput(new Date()), notes: "" });
  const [checkout, setCheckout] = useState<Appointment | null>(null);
  const [co, setCo] = useState({ licenseNote: "", startMiles: "", salespersonId: user?.id ?? "" });
  const [checkin, setCheckin] = useState<Rec<TestDrive> | null>(null);
  const [ci, setCi] = useState({ endMiles: "", notes: "" });

  const drives = useMemo(() => appointments.filter((a) => a.type === "test_drive"), [appointments]);
  const logFor = (apptId: string) => logs.find((l) => l.data.appointmentId === apptId);
  const today = useMemo(() => drives.filter((a) => isToday(a.startsAt) && a.status !== "cancelled").sort((a, b) => a.startsAt.localeCompare(b.startsAt)), [drives]);
  const out = useMemo(() => logs.filter((l) => l.data.checkOutAt && !l.data.checkInAt), [logs]);
  const upcoming = useMemo(() => drives.filter((a) => !isToday(a.startsAt) && new Date(a.startsAt) > new Date() && a.status !== "cancelled").sort((a, b) => a.startsAt.localeCompare(b.startsAt)), [drives]);
  const history = useMemo(() => logs.filter((l) => l.data.checkInAt).sort((a, b) => (b.data.checkInAt || "").localeCompare(a.data.checkInAt || "")).slice(0, 50), [logs]);

  const cust = (id?: string) => fullName(customers.find((c) => c.id === id));
  const veh = (id?: string) => { const v = inventory.find((x) => x.id === id); return v ? `${vTitle(v)} · #${v.stockNumber}` : "No vehicle"; };
  const who = (id?: string) => users.find((u) => u.id === id)?.fullName || "—";

  const schedule = async () => {
    if (!form.customerId) return toast.error("Pick a customer");
    if (!form.vehicleId) return toast.error("Pick a vehicle");
    try {
      const a = await insert("appointments", { customerId: form.customerId, vehicleId: form.vehicleId, type: "test_drive", startsAt: new Date(form.startsAt).toISOString(), status: "scheduled", assignedTo: form.assignedTo || undefined, notes: form.notes || undefined } as any);
      logActivity("schedule", "test_drive", a.id, veh(form.vehicleId), user?.id);
      toast.success("Test drive scheduled"); setOpen(false); setForm({ ...form, customerId: "", vehicleId: "", notes: "" });
    } catch (e: any) { toast.error(e.message || "Could not schedule"); }
  };

  const doCheckout = async () => {
    if (!checkout) return;
    if (!co.licenseNote.trim()) return toast.error("Note the driver's license (e.g. 'Copy on file', 'Photo taken')");
    try {
      const existing = logFor(checkout.id);
      const patch = { checkOutAt: new Date().toISOString(), licenseNote: co.licenseNote.trim(), startMiles: co.startMiles ? Number(co.startMiles) : undefined, salespersonId: co.salespersonId || undefined };
      if (existing) await updateRecord<TestDrive>("test_drive", existing.id, patch);
      else await addRecord<TestDrive>("test_drive", { appointmentId: checkout.id, customerId: checkout.customerId, vehicleId: checkout.vehicleId, notes: "", ...patch }, user?.id);
      await update("appointments", checkout.id, { status: "showed" });
      logActivity("check_out", "test_drive", checkout.id, veh(checkout.vehicleId), user?.id);
      toast.success("Checked out"); setCheckout(null); setCo({ licenseNote: "", startMiles: "", salespersonId: user?.id ?? "" });
    } catch (e: any) { toast.error(e.message || "Could not check out"); }
  };

  const doCheckin = async () => {
    if (!checkin) return;
    try {
      await updateRecord<TestDrive>("test_drive", checkin.id, { checkInAt: new Date().toISOString(), endMiles: ci.endMiles ? Number(ci.endMiles) : undefined, notes: ci.notes });
      logActivity("check_in", "test_drive", checkin.data.appointmentId, ci.notes || undefined, user?.id);
      toast.success("Vehicle checked in"); setCheckin(null); setCi({ endMiles: "", notes: "" });
    } catch (e: any) { toast.error(e.message || "Could not check in"); }
  };

  const Row = ({ a }: { a: Appointment }) => {
    const l = logFor(a.id);
    const state = l?.data.checkInAt ? "returned" : l?.data.checkOutAt ? "out" : a.status;
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border p-3">
        <div className="min-w-0">
          <p className="font-semibold">{cust(a.customerId)} <span className="text-muted-foreground font-normal">· {veh(a.vehicleId)}</span></p>
          <p className="text-xs text-muted-foreground"><Clock className="inline h-3 w-3 mr-1" />{fmtDateTime(a.startsAt)} · {who(a.assignedTo)}{a.notes ? ` · ${a.notes}` : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="capitalize">{state.replace("_", " ")}</Badge>
          {state === "out" && l && <Button size="sm" onClick={() => setCheckin(l)}><LogIn className="h-4 w-4 mr-1" /> Check in</Button>}
          {!l?.data.checkOutAt && <Button size="sm" variant="outline" onClick={() => setCheckout(a)}><KeyRound className="h-4 w-4 mr-1" /> Check out</Button>}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Test Drives</h1><p className="text-muted-foreground">{today.length} today · {out.length} currently out</p></div>
        <Button onClick={() => setOpen(true)} disabled={customers.length === 0 || inventory.length === 0}><Plus className="h-4 w-4 mr-1" /> Schedule</Button>
      </div>
      {(customers.length === 0 || inventory.length === 0) && <Card><CardContent className="p-6 text-center text-muted-foreground">You need at least one <Link className="text-primary underline" to="/customers?new=1">customer</Link> and one <Link className="text-primary underline" to="/inventory">vehicle</Link> to log a test drive.</CardContent></Card>}

      {out.length > 0 && (
        <Card className="border-amber-300"><CardHeader className="pb-2"><CardTitle className="text-base">Out on the road</CardTitle></CardHeader>
          <CardContent className="space-y-2">{out.map((l) => (
            <div key={l.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border p-3">
              <div><p className="font-semibold">{veh(l.data.vehicleId)}</p><p className="text-xs text-muted-foreground">{cust(l.data.customerId)} · with {who(l.data.salespersonId)} · out {fmtDateTime(l.data.checkOutAt)} ({mins(l.data.checkOutAt, new Date().toISOString())} min)</p></div>
              <Button size="sm" onClick={() => setCheckin(l)}><LogIn className="h-4 w-4 mr-1" /> Check in</Button>
            </div>))}</CardContent></Card>
      )}

      <Card><CardHeader className="pb-2"><CardTitle className="text-base">Today's board</CardTitle></CardHeader>
        <CardContent className="space-y-2">{today.length === 0 ? <p className="text-sm text-muted-foreground">Nothing scheduled today. Schedule a test drive, or check a walk-in out directly after scheduling it for now.</p> : today.map((a) => <Row key={a.id} a={a} />)}</CardContent></Card>

      {upcoming.length > 0 && <Card><CardHeader className="pb-2"><CardTitle className="text-base">Upcoming</CardTitle></CardHeader><CardContent className="space-y-2">{upcoming.slice(0, 20).map((a) => <Row key={a.id} a={a} />)}</CardContent></Card>}

      <Card><CardHeader className="pb-2"><CardTitle className="text-base">History</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">{history.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Completed test drives will show here once a vehicle is checked back in.</p> : (
          <table className="w-full text-sm"><thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="text-left p-3">Date</th><th className="text-left p-3">Customer</th><th className="text-left p-3">Vehicle</th><th className="text-left p-3">Salesperson</th><th className="text-right p-3">Duration</th><th className="text-right p-3">Miles</th><th className="text-left p-3">Notes</th></tr></thead>
            <tbody>{history.map((l) => { const d = l.data; const mi = d.startMiles != null && d.endMiles != null ? d.endMiles - d.startMiles : null; return (
              <tr key={l.id} className="border-t"><td className="p-3 whitespace-nowrap">{fmtDate(d.checkInAt)}</td><td className="p-3">{cust(d.customerId)}</td><td className="p-3">{veh(d.vehicleId)}</td><td className="p-3">{who(d.salespersonId)}</td><td className="p-3 text-right">{mins(d.checkOutAt, d.checkInAt)} min</td><td className="p-3 text-right">{mi == null ? "—" : mi.toLocaleString()}</td><td className="p-3 text-muted-foreground">{d.notes || "—"}</td></tr>); })}</tbody></table>)}
        </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule test drive</DialogTitle><DialogDescription>Creates a test-drive appointment; check-out and check-in happen from the board.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Customer *</Label><Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}><SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger><SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{fullName(c)}{c.phone ? ` · ${c.phone}` : ""}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Vehicle *</Label><Select value={form.vehicleId} onValueChange={(v) => setForm({ ...form, vehicleId: v })}><SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger><SelectContent>{inventory.filter((v) => v.status !== "Sold").map((v) => <SelectItem key={v.id} value={v.id}>{vTitle(v)} · #{v.stockNumber}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>When</Label><Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></div>
              <div className="space-y-1"><Label>Salesperson</Label><Select value={form.assignedTo} onValueChange={(v) => setForm({ ...form, assignedTo: v })}><SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger><SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-1"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={schedule}>Schedule</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!checkout} onOpenChange={(o) => !o && setCheckout(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Check out vehicle</DialogTitle><DialogDescription>{checkout ? `${cust(checkout.customerId)} · ${veh(checkout.vehicleId)}` : ""}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Driver's license *</Label><Input value={co.licenseNote} onChange={(e) => setCo({ ...co, licenseNote: e.target.value })} placeholder="e.g. Photo taken, copy in deal jacket" /><p className="text-xs text-muted-foreground">Record how the license was verified. The license number itself is not stored here.</p></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Odometer out</Label><Input type="number" value={co.startMiles} onChange={(e) => setCo({ ...co, startMiles: e.target.value })} /></div>
              <div className="space-y-1"><Label>Riding with</Label><Select value={co.salespersonId} onValueChange={(v) => setCo({ ...co, salespersonId: v })}><SelectTrigger><SelectValue placeholder="Salesperson" /></SelectTrigger><SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}</SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCheckout(null)}>Cancel</Button><Button onClick={doCheckout}><KeyRound className="h-4 w-4 mr-1" /> Hand over keys</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!checkin} onOpenChange={(o) => !o && setCheckin(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Check in vehicle</DialogTitle><DialogDescription>{checkin ? `${veh(checkin.data.vehicleId)} · out since ${fmtDateTime(checkin.data.checkOutAt)}` : ""}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Odometer in</Label><Input type="number" value={ci.endMiles} onChange={(e) => setCi({ ...ci, endMiles: e.target.value })} /></div>
            <div className="space-y-1"><Label>Outcome / notes</Label><Textarea rows={3} value={ci.notes} onChange={(e) => setCi({ ...ci, notes: e.target.value })} placeholder="Loved it, wants numbers on 60 months…" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCheckin(null)}>Cancel</Button><Button onClick={doCheckin}>Check in</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
