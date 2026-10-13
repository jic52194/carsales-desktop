import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Phone, PhoneMissed, Voicemail, CalendarCheck, ThumbsDown, MessageCircle, Headset, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useCollection, insert, update, get, fullName, fmtDateTime, logActivity, type Lead, type Task, type Appointment } from "@/lib/store";
import { useInventory, vTitle } from "@/lib/inventory";
import { useRecords, addRecord } from "@/lib/records";
import { useAuth, useUsers } from "@/lib/auth";
import { useTenant } from "@/lib/tenant";
import { mergeTemplate, type Template } from "@/pages/TextingTemplates";

export type CallOutcome = "no_answer" | "left_vm" | "talked" | "appointment_set" | "not_interested";
export interface CallLog { customerId: string; leadId?: string; taskId?: string; appointmentId?: string; outcome: CallOutcome; notes: string; by?: string; at: string }

type Reason = "new_lead" | "overdue" | "confirm";
interface QueueItem { key: string; reason: Reason; customerId: string; lead?: Lead; task?: Task; appt?: Appointment; when: string; label: string }

const OUTCOMES: { key: CallOutcome; label: string; icon: JSX.Element }[] = [
  { key: "no_answer", label: "No answer", icon: <PhoneMissed className="h-4 w-4" /> },
  { key: "left_vm", label: "Left voicemail", icon: <Voicemail className="h-4 w-4" /> },
  { key: "talked", label: "Talked", icon: <MessageCircle className="h-4 w-4" /> },
  { key: "appointment_set", label: "Appointment set", icon: <CalendarCheck className="h-4 w-4" /> },
  { key: "not_interested", label: "Not interested", icon: <ThumbsDown className="h-4 w-4" /> },
];
const REASON: Record<Reason, { label: string; color: string }> = { new_lead: { label: "New lead", color: "bg-red-100 text-red-800" }, overdue: { label: "Overdue follow-up", color: "bg-amber-100 text-amber-800" }, confirm: { label: "Confirm appointment", color: "bg-blue-100 text-blue-800" } };
const DAY = 86400000;
const sameDay = (iso: string, d = new Date()) => { const x = new Date(iso); return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth() && x.getDate() === d.getDate(); };

export default function BDC() {
  const { user } = useAuth();
  const users = useUsers();
  const tenant = useTenant();
  const leads = useCollection("leads");
  const tasks = useCollection("tasks");
  const appointments = useCollection("appointments");
  const customers = useCollection("customers");
  const inventory = useInventory();
  const calls = useRecords<CallLog>("call_log");
  const scripts = useRecords<Template>("template").filter((t) => t.data.channel === "script");
  const [mine, setMine] = useState(false);
  const [selKey, setSelKey] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<CallOutcome>("no_answer");
  const [notes, setNotes] = useState("");
  const [scriptId, setScriptId] = useState("");
  const [busy, setBusy] = useState(false);

  const queue = useMemo<QueueItem[]>(() => {
    const now = Date.now(); const items: QueueItem[] = [];
    const owned = (id?: string) => !mine || id === user?.id;
    for (const l of leads) if (l.stage === "new" && owned(l.assignedTo)) items.push({ key: `lead:${l.id}`, reason: "new_lead", customerId: l.customerId, lead: l, when: l.createdAt, label: `In since ${fmtDateTime(l.createdAt)}` });
    for (const t of tasks) if (t.status === "open" && t.dueAt && new Date(t.dueAt).getTime() < now && owned(t.assignedTo)) {
      const lead = t.relatedType === "lead" ? get("leads", t.relatedId ?? "") : undefined;
      const customerId = t.relatedType === "customer" ? t.relatedId : lead?.customerId;
      if (customerId) items.push({ key: `task:${t.id}`, reason: "overdue", customerId, lead, task: t, when: t.dueAt, label: `${t.title} · due ${fmtDateTime(t.dueAt)}` });
    }
    for (const a of appointments) if (a.customerId && a.status === "scheduled" && sameDay(a.startsAt) && owned(a.assignedTo)) items.push({ key: `appt:${a.id}`, reason: "confirm", customerId: a.customerId, appt: a, lead: leads.find((l) => l.customerId === a.customerId && !["sold", "lost"].includes(l.stage)), when: a.startsAt, label: `${a.type.replace("_", " ")} at ${fmtDateTime(a.startsAt)}` });
    const seen = new Set<string>();
    return items.filter((i) => (seen.has(i.key) ? false : seen.add(i.key))).sort((a, b) => a.when.localeCompare(b.when));
  }, [leads, tasks, appointments, mine, user?.id]);

  const sel = queue.find((q) => q.key === selKey) ?? null;
  const customer = sel ? customers.find((c) => c.id === sel.customerId) : undefined;
  const vehicle = sel?.lead?.vehicleId ? inventory.find((v) => v.id === sel.lead!.vehicleId) : sel?.appt?.vehicleId ? inventory.find((v) => v.id === sel.appt!.vehicleId) : undefined;
  const script = scripts.find((s) => s.id === scriptId);
  const scriptText = script ? mergeTemplate(script.data.body, { customer, vehicle, tenant, user }) : "";

  const today = useMemo(() => calls.filter((c) => sameDay(c.data.at)), [calls]);
  const byRep = useMemo(() => {
    const m = new Map<string, { n: number; talked: number; appts: number }>();
    for (const c of today) { const k = c.data.by ?? "?"; const r = m.get(k) ?? { n: 0, talked: 0, appts: 0 }; r.n++; if (c.data.outcome === "talked" || c.data.outcome === "appointment_set") r.talked++; if (c.data.outcome === "appointment_set") r.appts++; m.set(k, r); }
    return Array.from(m.entries()).map(([id, r]) => ({ id, name: users.find((u) => u.id === id)?.fullName ?? "Unknown", ...r })).sort((a, b) => b.n - a.n);
  }, [today, users]);
  const history = useMemo(() => (customer ? calls.filter((c) => c.data.customerId === customer.id).slice(0, 5) : []), [calls, customer]);

  const logCall = async () => {
    if (!sel || !customer) return;
    setBusy(true);
    try {
      const rec = await addRecord<CallLog>("call_log", { customerId: customer.id, leadId: sel.lead?.id, taskId: sel.task?.id, appointmentId: sel.appt?.id, outcome, notes: notes.trim(), by: user?.id, at: new Date().toISOString() }, user?.id);
      logActivity(`call_${outcome}`, "customer", customer.id, notes.slice(0, 140), user?.id);
      const name = fullName(customer);
      const mkTask = (title: string, days: number, priority: Task["priority"] = "normal") => insert("tasks", { title, dueAt: new Date(Date.now() + days * DAY).toISOString(), status: "open", priority, assignedTo: sel.lead?.assignedTo || user?.id, relatedType: sel.lead ? "lead" : "customer", relatedId: sel.lead?.id ?? customer.id } as any);
      if (sel.task) await update("tasks", sel.task.id, { status: "done" });
      if (outcome === "no_answer" || outcome === "left_vm") { await mkTask(`Call back ${name}${vehicle ? ` — ${vTitle(vehicle)}` : ""}`, 1); if (sel.lead?.stage === "new" && outcome === "left_vm") await update("leads", sel.lead.id, { stage: "contacted" }); }
      else if (outcome === "talked") { if (sel.lead && sel.lead.stage === "new") await update("leads", sel.lead.id, { stage: "contacted" }); await mkTask(`Follow up with ${name}`, 2); }
      else if (outcome === "appointment_set") { if (sel.lead && ["new", "contacted"].includes(sel.lead.stage)) await update("leads", sel.lead.id, { stage: "appointment" }); if (sel.appt) await update("appointments", sel.appt.id, { status: "confirmed" }); }
      else if (outcome === "not_interested") { if (sel.lead) await update("leads", sel.lead.id, { stage: "lost" }); }
      toast.success(`Logged: ${OUTCOMES.find((o) => o.key === outcome)?.label}`);
      setSelKey(null); setNotes(""); setOutcome("no_answer"); void rec;
    } catch (e: any) { toast.error(e.message || "Could not log call"); } finally { setBusy(false); }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">BDC Call Center</h1><p className="text-muted-foreground">Today's call queue from your leads, tasks and appointments. Log every outcome and the next step creates itself.</p></div>
        <Button size="sm" variant={mine ? "default" : "outline"} onClick={() => setMine(!mine)}>My queue only</Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">In queue</p><p className="text-2xl font-black">{queue.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Calls logged today</p><p className="text-2xl font-black">{today.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Appointments set today</p><p className="text-2xl font-black">{today.filter((c) => c.data.outcome === "appointment_set").length}</p></CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-2">
          {queue.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground"><CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-600" />Queue is clear. New leads, overdue tasks and today's unconfirmed appointments show up here.</CardContent></Card>}
          {queue.map((q) => { const c = customers.find((x) => x.id === q.customerId); return (
            <button key={q.key} onClick={() => { setSelKey(q.key); setNotes(""); }} className={`w-full text-left rounded-lg border p-3 hover:shadow-sm transition-shadow ${selKey === q.key ? "border-primary bg-primary/5" : "bg-background"}`}>
              <div className="flex justify-between gap-2"><p className="font-semibold text-sm">{fullName(c)}</p><Badge variant="outline" className={`${REASON[q.reason].color} text-[10px]`}>{REASON[q.reason].label}</Badge></div>
              <p className="text-xs text-muted-foreground truncate">{q.label}</p>
              <p className="text-xs text-muted-foreground">{c?.phone || "no phone on file"}</p>
            </button>); })}
        </div>

        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{customer ? <Link to={`/customers/${customer.id}`} className="hover:underline">{fullName(customer)}</Link> : "Call"}</CardTitle>
              <CardDescription>{sel ? <>{REASON[sel.reason].label} · {sel.label}{vehicle ? ` · ${vTitle(vehicle)}` : ""}</> : "Pick someone from the queue."}</CardDescription>
            </CardHeader>
            {sel && customer && (
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {customer.phone ? <Button asChild size="lg"><a href={`tel:${customer.phone}`} onClick={() => logActivity("call_started", "customer", customer.id, undefined, user?.id)}><Phone className="h-4 w-4 mr-1" /> Call {customer.phone}</a></Button> : <Button size="lg" disabled><Phone className="h-4 w-4 mr-1" /> No phone on file</Button>}
                  {customer.email && <Button asChild variant="outline"><a href={`mailto:${customer.email}`}>Email</a></Button>}
                </div>
                {sel.lead?.notes && <p className="rounded bg-muted p-2 text-sm whitespace-pre-wrap">{sel.lead.notes}</p>}
                {history.length > 0 && <div className="text-xs text-muted-foreground space-y-0.5"><p className="font-semibold">Recent calls</p>{history.map((h) => <p key={h.id}>{fmtDateTime(h.data.at)} · {OUTCOMES.find((o) => o.key === h.data.outcome)?.label} · {users.find((u) => u.id === h.data.by)?.fullName ?? ""}{h.data.notes ? ` — ${h.data.notes}` : ""}</p>)}</div>}
                <div className="space-y-1"><Label>Outcome</Label>
                  <div className="flex flex-wrap gap-2">{OUTCOMES.map((o) => <Button key={o.key} size="sm" variant={outcome === o.key ? "default" : "outline"} onClick={() => setOutcome(o.key)}>{o.icon}<span className="ml-1">{o.label}</span></Button>)}</div>
                </div>
                <div className="space-y-1"><Label>Notes</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What happened on the call…" /></div>
                <p className="text-xs text-muted-foreground">{outcome === "no_answer" || outcome === "left_vm" ? "Creates a call-back task for tomorrow." : outcome === "talked" ? "Moves a new lead to Contacted and schedules a follow-up in 2 days." : outcome === "appointment_set" ? "Moves the lead to Appointment (confirms the appointment if this was a confirmation call). Book the slot under Appointments." : "Marks the lead Lost."}{sel.task ? " Closes the overdue task." : ""}</p>
                <Button onClick={logCall} disabled={busy}>Log call & next step</Button>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Script</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {scripts.length === 0 ? <p className="text-sm text-muted-foreground">No phone scripts yet. Add a template with channel "Phone script" under <Link className="text-primary underline" to="/templates">Templates</Link> and it appears here with the customer's details merged in.</p> : (
                <>
                  <Select value={scriptId || "none"} onValueChange={(v) => setScriptId(v === "none" ? "" : v)}><SelectTrigger><SelectValue placeholder="Choose a script" /></SelectTrigger><SelectContent><SelectItem value="none">Choose a script</SelectItem>{scripts.map((s) => <SelectItem key={s.id} value={s.id}>{s.data.name}</SelectItem>)}</SelectContent></Select>
                  {script && <p className="rounded-md border bg-muted/40 p-3 text-sm whitespace-pre-wrap">{scriptText}</p>}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Headset className="h-4 w-4" /> Today by rep</CardTitle></CardHeader>
            <CardContent>
              {byRep.length === 0 ? <p className="text-sm text-muted-foreground">No calls logged today.</p> : (
                <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1">Rep</th><th>Calls</th><th>Connected</th><th>Appts</th></tr></thead><tbody>{byRep.map((r) => <tr key={r.id} className="border-t"><td className="py-1 font-medium">{r.name}</td><td>{r.n}</td><td>{r.talked}</td><td>{r.appts}</td></tr>)}</tbody></table></div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
