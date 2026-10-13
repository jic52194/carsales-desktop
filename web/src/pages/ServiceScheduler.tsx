import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, ChevronLeft, ChevronRight, Wrench, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { useCollection, insert, update, get, fullName, money, logActivity, type Appointment } from "@/lib/store";
import { useInventory, vTitle } from "@/lib/inventory";
import { useRecords, addRecord, updateRecord, type Rec } from "@/lib/records";
import { useAuth, useUsers } from "@/lib/auth";

export type TicketStatus = "open" | "in_progress" | "waiting_parts" | "done";
/** Repair order — records kind "service_ticket". Shared by TechnicianBay and Parts. */
export interface ServiceTicket {
  appointmentId?: string; customerId?: string; vehicle: string; concern: string; status: TicketStatus;
  laborHours: number; partsCost: number; laborRate: number; total: number; technicianId?: string; notes: string;
  laborStartedAt?: string; laborMinutes?: number; openedAt: string; closedAt?: string;
}
export const ticketTotal = (t: Pick<ServiceTicket, "laborHours" | "laborRate" | "partsCost">) => Math.round(((t.laborHours || 0) * (t.laborRate || 0) + (t.partsCost || 0)) * 100) / 100;

const APPT_STATUSES = ["scheduled", "confirmed", "showed", "no_show", "cancelled"] as const;
const TICKET_STATUSES: { key: TicketStatus; label: string }[] = [{ key: "open", label: "Open" }, { key: "in_progress", label: "In progress" }, { key: "waiting_parts", label: "Waiting parts" }, { key: "done", label: "Done" }];
const toLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const dayKey = (d: Date) => d.toDateString();
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay()); return x; };

export default function ServiceScheduler() {
  const { user } = useAuth();
  const appts = useCollection("appointments");
  const customers = useCollection("customers");
  const inventory = useInventory();
  const users = useUsers().filter((u) => u.isActive);
  const tickets = useRecords<ServiceTicket>("service_ticket");
  const [view, setView] = useState<"day" | "week">("day");
  const [anchor, setAnchor] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [bookOpen, setBookOpen] = useState(false);
  const [form, setForm] = useState({ customerId: "", vehicleId: "", vehicleText: "", concern: "", assignedTo: user?.id ?? "", startsAt: toLocal(new Date(Date.now() + 3600e3)) });
  const [editing, setEditing] = useState<Rec<ServiceTicket> | null>(null);
  const [tf, setTf] = useState({ status: "open" as TicketStatus, laborHours: "", partsCost: "", laborRate: "", technicianId: "", notes: "" });

  const service = useMemo(() => appts.filter((a) => a.type === "service"), [appts]);
  const days = useMemo(() => (view === "day" ? [anchor] : Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i))), [view, anchor]);
  const byDay = useMemo(() => service.reduce<Record<string, Appointment[]>>((acc, a) => { (acc[dayKey(new Date(a.startsAt))] ||= []).push(a); return acc; }, {}), [service]);
  const openTickets = useMemo(() => tickets.filter((t) => t.data.status !== "done").sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [tickets]);
  const ticketFor = (apptId: string) => tickets.find((t) => t.data.appointmentId === apptId);
  const who = (id?: string) => users.find((u) => u.id === id)?.fullName ?? "—";
  const techs = users.filter((u) => ["technician", "service", "manager", "admin", "owner"].includes(u.role));

  const book = async () => {
    if (!form.startsAt) return toast.error("Pick a date/time");
    const veh = form.vehicleId ? vTitle(inventory.find((v) => v.id === form.vehicleId)!) : form.vehicleText.trim();
    if (!veh) return toast.error("Enter the vehicle (VIN / plate / description) or pick a unit");
    try {
      const a = await insert("appointments", { customerId: form.customerId || undefined, vehicleId: form.vehicleId || undefined, type: "service", startsAt: new Date(form.startsAt).toISOString(), status: "scheduled", assignedTo: form.assignedTo || undefined, notes: `${veh} — ${form.concern.trim() || "No concern noted"}` } as any);
      logActivity("service_booked", "appointment", a.id, veh, user?.id);
      toast.success("Service appointment booked"); setBookOpen(false);
      setForm({ customerId: "", vehicleId: "", vehicleText: "", concern: "", assignedTo: user?.id ?? "", startsAt: toLocal(new Date(Date.now() + 3600e3)) });
    } catch (e: any) { toast.error(e.message || "Could not book"); }
  };

  const openRo = async (a: Appointment) => {
    const [vehicle, concern] = (a.notes || "").split(" — ");
    try {
      const t = await addRecord<ServiceTicket>("service_ticket", { appointmentId: a.id, customerId: a.customerId, vehicle: vehicle || "Vehicle", concern: concern || "", status: "open", laborHours: 0, partsCost: 0, laborRate: 0, total: 0, technicianId: undefined, notes: "", laborMinutes: 0, openedAt: new Date().toISOString() }, user?.id);
      if (a.status === "scheduled" || a.status === "confirmed") await update("appointments", a.id, { status: "showed" });
      logActivity("ro_opened", "service_ticket", t.id, t.data.vehicle, user?.id);
      toast.success("Repair order opened"); openEdit(t);
    } catch (e: any) { toast.error(e.message || "Could not open RO"); }
  };

  const openEdit = (t: Rec<ServiceTicket>) => { setEditing(t); setTf({ status: t.data.status, laborHours: String(t.data.laborHours || ""), partsCost: String(t.data.partsCost || ""), laborRate: String(t.data.laborRate || ""), technicianId: t.data.technicianId ?? "", notes: t.data.notes ?? "" }); };
  const saveTicket = async () => {
    if (!editing) return;
    const patch: Partial<ServiceTicket> = { status: tf.status, laborHours: Number(tf.laborHours) || 0, partsCost: Number(tf.partsCost) || 0, laborRate: Number(tf.laborRate) || 0, technicianId: tf.technicianId || undefined, notes: tf.notes };
    patch.total = ticketTotal(patch as ServiceTicket);
    if (tf.status === "done" && !editing.data.closedAt) patch.closedAt = new Date().toISOString();
    try { await updateRecord<ServiceTicket>("service_ticket", editing.id, patch); toast.success("Repair order saved"); setEditing(null); }
    catch (e: any) { toast.error(e.message || "Could not save"); }
  };

  const rangeLabel = view === "day" ? anchor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : `Week of ${days[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Service Scheduler</h1><p className="text-muted-foreground">{service.length} service appointment{service.length === 1 ? "" : "s"} · {openTickets.length} open RO{openTickets.length === 1 ? "" : "s"}</p></div>
        <Button onClick={() => setBookOpen(true)}><Plus className="h-4 w-4 mr-1" /> Book service</Button>
      </div>

      <Tabs defaultValue="schedule">
        <TabsList><TabsTrigger value="schedule">Schedule</TabsTrigger><TabsTrigger value="ros">Repair orders</TabsTrigger></TabsList>
        <TabsContent value="schedule" className="space-y-4 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setAnchor(addDays(anchor, view === "day" ? -1 : -7))}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => setAnchor(addDays(anchor, view === "day" ? 1 : 7))}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => { const d = new Date(); d.setHours(0, 0, 0, 0); setAnchor(d); }}>Today</Button>
            <p className="font-semibold flex-1">{rangeLabel}</p>
            <Select value={view} onValueChange={(v: any) => setView(v)}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="day">Day</SelectItem><SelectItem value="week">Week</SelectItem></SelectContent></Select>
          </div>
          <div className={view === "week" ? "grid md:grid-cols-7 gap-3" : "space-y-3"}>
            {days.map((d) => {
              const list = (byDay[dayKey(d)] ?? []).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
              return (
                <Card key={d.toISOString()}><CardContent className="p-0">
                  <p className="px-3 py-2 text-xs font-bold uppercase tracking-wide bg-muted/50">{d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {list.length}</p>
                  {list.length === 0 && <p className="p-3 text-xs text-muted-foreground">No service appointments.</p>}
                  <div className="divide-y">
                    {list.map((a) => { const c = a.customerId ? get("customers", a.customerId) : undefined; const ro = ticketFor(a.id); return (
                      <div key={a.id} className="px-3 py-2 space-y-1">
                        <div className="flex items-center justify-between gap-2"><p className="font-semibold text-sm">{new Date(a.startsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p><Badge variant="outline" className="capitalize">{a.status.replace("_", " ")}</Badge></div>
                        <p className="text-sm">{fullName(c)}</p>
                        <p className="text-xs text-muted-foreground break-words">{a.notes}</p>
                        <p className="text-xs text-muted-foreground">Advisor: {who(a.assignedTo)}</p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Select value={a.status} onValueChange={(s) => update("appointments", a.id, { status: s as any }).catch((e) => toast.error(e.message))}><SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger><SelectContent>{APPT_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent></Select>
                          {ro ? <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(ro)}><ClipboardList className="h-3.5 w-3.5 mr-1" /> RO · {TICKET_STATUSES.find((s) => s.key === ro.data.status)?.label}</Button>
                            : a.status !== "cancelled" && a.status !== "no_show" && <Button size="sm" className="h-7 text-xs" onClick={() => openRo(a)}><Wrench className="h-3.5 w-3.5 mr-1" /> Open RO</Button>}
                        </div>
                      </div>
                    ); })}
                  </div>
                </CardContent></Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="ros" className="pt-2">
          {tickets.length === 0 ? <Card><CardContent className="p-10 text-center text-muted-foreground"><Wrench className="h-8 w-8 mx-auto mb-2 opacity-40" />No repair orders yet. Open an RO from a service appointment when the customer arrives.</CardContent></Card> : (
            <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase"><tr><th className="text-left p-3">Opened</th><th className="text-left p-3">Customer</th><th className="text-left p-3">Vehicle / concern</th><th className="text-left p-3">Tech</th><th className="text-left p-3">Status</th><th className="text-right p-3">Total</th></tr></thead>
              <tbody className="divide-y">{[...tickets].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((t) => (
                <tr key={t.id} className="cursor-pointer hover:bg-muted/30" onClick={() => openEdit(t)}>
                  <td className="p-3 whitespace-nowrap">{new Date(t.data.openedAt || t.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">{fullName(t.data.customerId ? get("customers", t.data.customerId) : undefined)}</td>
                  <td className="p-3"><p className="font-medium">{t.data.vehicle}</p><p className="text-xs text-muted-foreground">{t.data.concern}</p></td>
                  <td className="p-3">{who(t.data.technicianId)}</td>
                  <td className="p-3"><Badge variant={t.data.status === "done" ? "secondary" : "default"}>{TICKET_STATUSES.find((s) => s.key === t.data.status)?.label}</Badge></td>
                  <td className="p-3 text-right">{money(t.data.total)}</td>
                </tr>))}</tbody>
            </table></CardContent></Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={bookOpen} onOpenChange={setBookOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Book service appointment</DialogTitle><DialogDescription>Pick an inventory unit or type the customer's vehicle (VIN, plate, or year/make/model).</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Customer</Label><Select value={form.customerId || "none"} onValueChange={(v) => setForm({ ...form, customerId: v === "none" ? "" : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Walk-in / unknown</SelectItem>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{fullName(c)}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Inventory unit (optional)</Label><Select value={form.vehicleId || "none"} onValueChange={(v) => setForm({ ...form, vehicleId: v === "none" ? "" : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Not an inventory unit</SelectItem>{inventory.map((v) => <SelectItem key={v.id} value={v.id}>{vTitle(v)} · #{v.stockNumber}</SelectItem>)}</SelectContent></Select></div>
            {!form.vehicleId && <div className="space-y-1"><Label>Customer vehicle (VIN / plate / description)</Label><Input value={form.vehicleText} onChange={(e) => setForm({ ...form, vehicleText: e.target.value })} placeholder="e.g. 2019 Honda Civic · ABC-1234" /></div>}
            <div className="space-y-1"><Label>Concern</Label><Textarea rows={2} value={form.concern} onChange={(e) => setForm({ ...form, concern: e.target.value })} placeholder="What's the customer coming in for?" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Advisor</Label><Select value={form.assignedTo || "none"} onValueChange={(v) => setForm({ ...form, assignedTo: v === "none" ? "" : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Unassigned</SelectItem>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>When</Label><Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setBookOpen(false)}>Cancel</Button><Button onClick={book}>Book</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Repair order</DialogTitle><DialogDescription>{editing?.data.vehicle} — {editing?.data.concern || "no concern noted"}</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Status</Label><Select value={tf.status} onValueChange={(v: any) => setTf({ ...tf, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TICKET_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Technician</Label><Select value={tf.technicianId || "none"} onValueChange={(v) => setTf({ ...tf, technicianId: v === "none" ? "" : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Unassigned</SelectItem>{techs.map((u) => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Labor hours</Label><Input type="number" step="0.1" value={tf.laborHours} onChange={(e) => setTf({ ...tf, laborHours: e.target.value })} /></div>
            <div className="space-y-1"><Label>Labor rate ($/hr)</Label><Input type="number" value={tf.laborRate} onChange={(e) => setTf({ ...tf, laborRate: e.target.value })} /></div>
            <div className="space-y-1"><Label>Parts cost</Label><Input type="number" value={tf.partsCost} onChange={(e) => setTf({ ...tf, partsCost: e.target.value })} /></div>
            <div className="space-y-1"><Label>Total</Label><p className="h-10 flex items-center font-bold">{money(ticketTotal({ laborHours: Number(tf.laborHours) || 0, laborRate: Number(tf.laborRate) || 0, partsCost: Number(tf.partsCost) || 0 }))}</p></div>
            {editing?.data.laborMinutes ? <p className="col-span-2 text-xs text-muted-foreground">Tech timer: {Math.round(editing.data.laborMinutes)} min logged in Technician Bay.</p> : null}
            <div className="space-y-1 col-span-2"><Label>Notes</Label><Textarea rows={3} value={tf.notes} onChange={(e) => setTf({ ...tf, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={saveTicket}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
