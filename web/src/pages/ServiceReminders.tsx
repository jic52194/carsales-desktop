import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, MessageSquare, Mail, Check, BellRing, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useCollection, get, fullName, fmtDate, logActivity } from "@/lib/store";
import { getVehicle, vTitle } from "@/lib/inventory";
import { useRecords, addRecord, updateRecord } from "@/lib/records";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenant";

export type ReminderType = "oil" | "inspection" | "registration" | "custom";
export interface Reminder { customerId: string; vehicle: string; type: ReminderType; dueDate: string; status: "pending" | "sent" | "done"; note?: string; sourceKey?: string; sentAt?: string }

const TYPE_LABEL: Record<ReminderType, string> = { oil: "Oil change", inspection: "Inspection", registration: "Registration", custom: "Custom" };
const MILESTONES: { days: number; type: ReminderType; label: string }[] = [{ days: 90, type: "oil", label: "90-day oil change" }, { days: 180, type: "oil", label: "180-day oil change" }, { days: 365, type: "inspection", label: "1-year inspection" }];
const DAY = 86400e3;
const today = () => new Date().toISOString().slice(0, 10);
const addDaysIso = (iso: string, n: number) => new Date(new Date(iso).getTime() + n * DAY).toISOString().slice(0, 10);
const daysUntil = (ymd: string) => Math.round((new Date(ymd + "T00:00:00").getTime() - new Date(today() + "T00:00:00").getTime()) / DAY);

export default function ServiceReminders() {
  const { user } = useAuth();
  const tenant = useTenant();
  const deals = useCollection("deals");
  const customers = useCollection("customers");
  const reminders = useRecords<Reminder>("reminder");
  const [filter, setFilter] = useState<"pending" | "sent" | "done" | "all">("pending");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customerId: "", vehicle: "", type: "oil" as ReminderType, dueDate: addDaysIso(today(), 30), note: "" });
  const [template, setTemplate] = useState(`Hi {first}, this is {dealer}. Your {vehicle} is due for {service}. Reply or call {phone} to book a time.`);

  const rows = useMemo(() => reminders.filter((r) => filter === "all" || r.data.status === filter).sort((a, b) => a.data.dueDate.localeCompare(b.data.dueDate)), [reminders, filter]);
  const existingKeys = useMemo(() => new Set(reminders.map((r) => r.data.sourceKey).filter(Boolean)), [reminders]);

  // Auto-suggest: delivered deals that crossed a 90/180/365-day mark and don't have that reminder yet.
  const suggestions = useMemo(() => {
    const now = Date.now(); const out: { key: string; dealId: string; customerId: string; vehicle: string; milestone: typeof MILESTONES[number]; dueDate: string }[] = [];
    for (const d of deals.filter((x) => x.status === "delivered")) {
      const age = (now - new Date(d.updatedAt).getTime()) / DAY;
      const v = d.vehicleId ? getVehicle(d.vehicleId) : undefined; const vehicle = v ? vTitle(v) : "their vehicle";
      for (const m of MILESTONES) {
        const key = `${d.id}:${m.days}`;
        if (age >= m.days - 14 && !existingKeys.has(key)) out.push({ key, dealId: d.id, customerId: d.customerId, vehicle, milestone: m, dueDate: addDaysIso(d.updatedAt, m.days) });
      }
    }
    return out.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [deals, existingKeys]);

  const accept = async (s: typeof suggestions[number]) => {
    try { await addRecord<Reminder>("reminder", { customerId: s.customerId, vehicle: s.vehicle, type: s.milestone.type, dueDate: s.dueDate, status: "pending", note: s.milestone.label, sourceKey: s.key }, user?.id); toast.success("Reminder added"); }
    catch (e: any) { toast.error(e.message || "Could not add"); }
  };
  const acceptAll = async () => { for (const s of suggestions) await accept(s); };

  const save = async () => {
    if (!form.customerId) return toast.error("Pick a customer");
    if (!form.vehicle.trim()) return toast.error("Enter the vehicle");
    try { await addRecord<Reminder>("reminder", { customerId: form.customerId, vehicle: form.vehicle.trim(), type: form.type, dueDate: form.dueDate, status: "pending", note: form.note.trim() || undefined }, user?.id); toast.success("Reminder added"); setOpen(false); }
    catch (e: any) { toast.error(e.message || "Could not add"); }
  };

  const merge = (r: Reminder) => {
    const c = get("customers", r.customerId);
    return template.replace(/{first}/g, c?.firstName ?? "there").replace(/{name}/g, fullName(c)).replace(/{dealer}/g, tenant.name).replace(/{vehicle}/g, r.vehicle).replace(/{service}/g, r.note || TYPE_LABEL[r.type].toLowerCase()).replace(/{phone}/g, tenant.phone ?? "");
  };
  const send = async (id: string, r: Reminder, via: "sms" | "email") => {
    const c = get("customers", r.customerId);
    const body = merge(r);
    if (via === "sms") { if (!c?.phone) return toast.error("Customer has no phone on file"); window.open(`sms:${c.phone.replace(/[^+\d]/g, "")}?&body=${encodeURIComponent(body)}`, "_self"); }
    else { if (!c?.email) return toast.error("Customer has no email on file"); window.open(`mailto:${c.email}?subject=${encodeURIComponent(`${TYPE_LABEL[r.type]} reminder — ${tenant.name}`)}&body=${encodeURIComponent(body)}`, "_self"); }
    try { await updateRecord<Reminder>("reminder", id, { status: "sent", sentAt: new Date().toISOString() }); logActivity("reminder_sent", "customer", r.customerId, `${TYPE_LABEL[r.type]} via ${via}`, user?.id); }
    catch (e: any) { toast.error(e.message); }
  };
  const setStatus = (id: string, status: Reminder["status"]) => updateRecord<Reminder>("reminder", id, { status }).catch((e) => toast.error(e.message));

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Service Reminders</h1><p className="text-muted-foreground">{reminders.filter((r) => r.data.status === "pending").length} pending · {suggestions.length} suggested</p></div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Reminder</Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="done">Done</SelectItem><SelectItem value="all">All</SelectItem></SelectContent></Select>
            <p className="text-sm text-muted-foreground">{rows.length} reminder{rows.length === 1 ? "" : "s"}</p>
          </div>
          {rows.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-muted-foreground"><BellRing className="h-8 w-8 mx-auto mb-2 opacity-40" />No {filter === "all" ? "" : filter} reminders. Accept a suggestion on the right or add one manually.</CardContent></Card>
          ) : (
            <Card><CardContent className="p-0 divide-y">
              {rows.map((r) => { const c = get("customers", r.data.customerId); const d = daysUntil(r.data.dueDate); return (
                <div key={r.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{fullName(c)} <Badge variant="outline" className="ml-1">{TYPE_LABEL[r.data.type]}</Badge></p>
                    <p className="text-sm text-muted-foreground truncate">{r.data.vehicle}{r.data.note ? ` · ${r.data.note}` : ""}</p>
                    <p className={`text-xs ${d < 0 && r.data.status === "pending" ? "text-destructive font-semibold" : "text-muted-foreground"}`}>Due {fmtDate(r.data.dueDate)} · {d < 0 ? `${-d}d overdue` : d === 0 ? "today" : `in ${d}d`}{r.data.sentAt ? ` · sent ${fmtDate(r.data.sentAt)}` : ""}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {r.data.status !== "done" && <>
                      <Button size="sm" variant="outline" disabled={!c?.phone} onClick={() => send(r.id, r.data, "sms")}><MessageSquare className="h-3.5 w-3.5 mr-1" /> Text</Button>
                      <Button size="sm" variant="outline" disabled={!c?.email} onClick={() => send(r.id, r.data, "email")}><Mail className="h-3.5 w-3.5 mr-1" /> Email</Button>
                      <Button size="sm" variant="secondary" onClick={() => setStatus(r.id, "done")}><Check className="h-3.5 w-3.5 mr-1" /> Done</Button>
                    </>}
                    {r.data.status === "done" && <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "pending")}>Reopen</Button>}
                  </div>
                </div>
              ); })}
            </CardContent></Card>
          )}
          <Card><CardHeader><CardTitle className="text-base">Message template</CardTitle><CardDescription>Merge fields: {"{first} {name} {dealer} {vehicle} {service} {phone}"}. Opens your phone/email app with the text filled in.</CardDescription></CardHeader>
            <CardContent><Textarea rows={3} value={template} onChange={(e) => setTemplate(e.target.value)} /></CardContent></Card>
        </div>

        <Card className="h-fit"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" /> Suggested from deliveries</CardTitle><CardDescription>Delivered deals crossing 90 / 180 / 365 days</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {suggestions.length === 0 && <p className="text-sm text-muted-foreground">{deals.some((d) => d.status === "delivered") ? "Nothing new to suggest — every delivered deal is covered." : "No delivered deals yet. Suggestions appear once deals are marked delivered."}</p>}
            {suggestions.length > 1 && <Button size="sm" variant="outline" className="w-full" onClick={acceptAll}>Accept all {suggestions.length}</Button>}
            {suggestions.slice(0, 25).map((s) => (
              <div key={s.key} className="rounded-md border p-3 text-sm space-y-1">
                <p className="font-semibold">{fullName(get("customers", s.customerId))}</p>
                <p className="text-muted-foreground text-xs">{s.vehicle} · {s.milestone.label} · due {fmtDate(s.dueDate)}</p>
                <Button size="sm" className="h-7 text-xs" onClick={() => accept(s)}>Add reminder</Button>
              </div>
            ))}
          </CardContent></Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New reminder</DialogTitle><DialogDescription>Manual reminder for any customer.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Customer</Label><Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}><SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger><SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{fullName(c)}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Vehicle</Label><Input value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} placeholder="2019 Honda Civic" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Type</Label><Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(TYPE_LABEL) as ReminderType[]).map((t) => <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Due</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>Note (used as {"{service}"})</Label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. 30k-mile service" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
