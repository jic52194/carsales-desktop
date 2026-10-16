// Workflows — "when this happens, do that" rules for the dealership. Rules live in records (kind "workflow") and run
// in the cloud 24/7 (database triggers → run_workflows; texts go out through GoHighLevel via the wf-run function).
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Zap, Cloud, ListTodo, MessageSquare, ChevronRight, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { useCollection, logActivity, type LeadStage } from "@/lib/store";
import { useRecords, addRecord, updateRecord, removeRecord, type Rec } from "@/lib/records";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenant";
import { useGhlStatus } from "@/lib/ghl";

export type Trigger = "new_lead" | "lead_stage_changed" | "appointment_booked" | "deal_delivered" | "vehicle_added";
interface TaskAction { title: string; dueInHours: number; assignTo: "lead_owner" | "manager" }
/** Automation rule — records kind "workflow". `action` is the pre-v2.7 single-task shape (still honored by the server). */
export interface Workflow {
  name: string; trigger: Trigger; enabled: boolean;
  conditions: { source?: string; stage?: LeadStage };
  actions?: { task?: TaskAction; text?: { body: string } };
  action?: { kind: "create_task" } & TaskAction;
}
const TRIGGERS: { v: Trigger; l: string; vars: string[]; customer: boolean }[] = [
  { v: "new_lead", l: "A new lead comes in", vars: ["customer", "first_name", "source", "vehicle", "dealership"], customer: true },
  { v: "lead_stage_changed", l: "A lead moves to a stage", vars: ["customer", "first_name", "stage", "vehicle", "dealership"], customer: true },
  { v: "appointment_booked", l: "An appointment is booked", vars: ["customer", "first_name", "vehicle", "dealership"], customer: true },
  { v: "deal_delivered", l: "A deal is funded / delivered", vars: ["customer", "first_name", "vehicle", "dealership"], customer: true },
  { v: "vehicle_added", l: "A vehicle is added to inventory", vars: ["vehicle", "stock", "dealership"], customer: false },
];
const STAGES: LeadStage[] = ["new", "contacted", "appointment", "negotiating", "sold", "lost"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const SOURCES = ["Walk-in", "Phone", "Website", "Referral", "Facebook", "CarGurus", "Cars.com", "AutoTrader", "Repeat", "GoHighLevel", "Other"];
const NEW_TASK: TaskAction = { title: "Follow up with {customer}", dueInHours: 2, assignTo: "lead_owner" };
const EMPTY: Workflow = { name: "", trigger: "new_lead", enabled: true, conditions: {}, actions: { task: { ...NEW_TASK } } };

const TEMPLATES: { name: string; why: string; wf: Workflow }[] = [
  { name: "Website lead → call within the hour", why: "Speed-to-lead: the first dealer to call usually wins.", wf: { name: "Website lead — call within the hour", trigger: "new_lead", enabled: true, conditions: { source: "Website" }, actions: { task: { title: "Call {customer} about the {vehicle}", dueInHours: 1, assignTo: "lead_owner" } } } },
  { name: "New lead → instant welcome text", why: "Texts every new lead right away (8am–8pm) from your GoHighLevel number.", wf: { name: "New lead — welcome text", trigger: "new_lead", enabled: true, conditions: {}, actions: { text: { body: "Hi {first_name}, thanks for your interest in the {vehicle} at {dealership}! When's a good time for a quick call or a test drive?" } } } },
  { name: "Appointment booked → confirmation text", why: "Fewer no-shows.", wf: { name: "Appointment — confirmation text", trigger: "appointment_booked", enabled: true, conditions: {}, actions: { text: { body: "You're all set at {dealership}, {first_name}! Reply here if anything changes. See you soon." } } } },
  { name: "Deal delivered → thank-you + 30-day check-in", why: "Reviews and referrals come from the first month.", wf: { name: "Delivered — thank you + check-in", trigger: "deal_delivered", enabled: true, conditions: {}, actions: { text: { body: "Congrats on the {vehicle}, {first_name}! Thanks for choosing {dealership}. If you have a minute, a quick Google review would mean a lot." }, task: { title: "30-day check-in call with {customer}", dueInHours: 720, assignTo: "lead_owner" } } } },
  { name: "Lead marked Lost → manager review", why: "A second look saves deals.", wf: { name: "Lost lead — manager review", trigger: "lead_stage_changed", enabled: true, conditions: { stage: "lost" }, actions: { task: { title: "Review lost lead: {customer} ({vehicle})", dueInHours: 24, assignTo: "manager" } } } },
  { name: "Vehicle added → photos & listing", why: "Get new units online faster.", wf: { name: "New unit — photos & listing", trigger: "vehicle_added", enabled: true, conditions: {}, actions: { task: { title: "Photos + listing for {vehicle} (#{stock})", dueInHours: 24, assignTo: "manager" } } } },
];

const actionsOf = (w: Workflow) => w.actions ?? (w.action ? { task: { title: w.action.title, dueInHours: w.action.dueInHours, assignTo: w.action.assignTo } } : {});
const hrs = (h: number) => (h >= 48 && h % 24 === 0 ? `${h / 24} days` : `${h}h`);

export default function WorkflowBuilder() {
  const { user, hasPermission } = useAuth();
  const canEdit = hasPermission(["manager"]);
  const tenant = useTenant();
  const ghl = useGhlStatus();
  const rules = useRecords<Workflow>("workflow");
  const tasks = useCollection("tasks");
  const [editing, setEditing] = useState<Rec<Workflow> | "new" | null>(null);
  const [form, setForm] = useState<Workflow>(EMPTY);
  const [toDelete, setToDelete] = useState<Rec<Workflow> | null>(null);
  const fired = useMemo(() => tasks.filter((t) => t.notes?.startsWith('Created by workflow "')), [tasks]);
  const firedFor = (name: string) => fired.filter((t) => t.notes === `Created by workflow "${name}"`).length;
  const trig = (v: Trigger) => TRIGGERS.find((t) => t.v === v) ?? TRIGGERS[0];
  const acts = actionsOf(form);

  const openEdit = (r: Rec<Workflow> | "new", preset?: Workflow) => { setEditing(r); const base = r === "new" ? (preset ?? EMPTY) : r.data; setForm({ ...base, conditions: { ...base.conditions }, actions: JSON.parse(JSON.stringify(actionsOf(base))), action: undefined }); };
  const setActs = (a: NonNullable<Workflow["actions"]>) => setForm({ ...form, actions: a });
  const save = async () => {
    const a = actionsOf(form);
    if (!form.name.trim()) return toast.error("Name the rule");
    if (!a.task && !a.text) return toast.error("Pick at least one action");
    if (a.task && !a.task.title.trim()) return toast.error("Task title is required");
    if (a.text && !a.text.body.trim()) return toast.error("Write the text message");
    if (form.trigger === "lead_stage_changed" && !form.conditions.stage) return toast.error("Pick the stage that triggers this rule");
    const data: Workflow = { name: form.name.trim(), trigger: form.trigger, enabled: form.enabled, conditions: Object.fromEntries(Object.entries(form.conditions).filter(([, v]) => v)), actions: a };
    try {
      if (editing === "new") { const r = await addRecord<Workflow>("workflow", data, user?.id); logActivity("create", "workflow", r.id, data.name, user?.id); }
      else if (editing) await updateRecord<Workflow>("workflow", editing.id, { ...data, action: undefined } as any);
      toast.success("Rule saved — it's live"); setEditing(null);
    } catch (e: any) { toast.error(e.message || "Could not save"); }
  };
  const toggle = (r: Rec<Workflow>) => updateRecord<Workflow>("workflow", r.id, { enabled: !r.data.enabled }).catch((e) => toast.error(e.message));
  const del = async () => { if (!toDelete) return; try { await removeRecord("workflow", toDelete.id); toast.success("Rule deleted"); } catch (e: any) { toast.error(e.message); } setToDelete(null); };
  const insertVar = (field: "task" | "text", v: string) => { const a = actionsOf(form); if (field === "task" && a.task) setActs({ ...a, task: { ...a.task, title: `${a.task.title}{${v}}` } }); if (field === "text" && a.text) setActs({ ...a, text: { body: `${a.text.body}{${v}}` } }); };

  const v = tenant.aiVoice;
  const BUILT_IN: { name: string; detail: string; on: boolean; to: string }[] = [
    { name: "New lead → follow-up task", detail: "Every new lead gets a high-priority task due in 15 minutes.", on: true, to: "/tasks" },
    { name: "Appointment → confirmation task", detail: "Each new appointment creates a task to confirm it.", on: true, to: "/appointments" },
    { name: "Leads ⇄ GoHighLevel pipeline", detail: ghl.pipeline ? `On — ${ghl.pipeline.name}` : "Off", on: !!ghl.pipeline, to: "/settings?tab=connections" },
    { name: `${v?.name || "AI"} replies to customer texts`, detail: v?.autoReply === "auto" ? "Replies automatically" : v?.autoReply === "draft" ? "Drafts a reply in the Inbox" : "Off", on: !!v?.autoReply && v.autoReply !== "off", to: "/settings?tab=ai-voice" },
    { name: "Missed-call text-back", detail: v?.missedCall ? "On" : "Off", on: !!v?.missedCall, to: "/settings?tab=ai-voice" },
    { name: "Morning brief by text", detail: v?.briefPhone ? `To ${v.briefPhone} at 8:15 AM` : "Off", on: !!v?.briefPhone, to: "/settings?tab=ai-voice" },
    { name: "Hourly connection check", detail: "Alerts admins in the bell if GoHighLevel disconnects.", on: true, to: "/system-check" },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div><h1 className="text-3xl font-black">Workflows</h1><p className="text-muted-foreground">When something happens, create the task or send the text automatically. For multi-step follow-up (texts over days, stops when they reply) use <Link to="/automations" className="underline font-medium text-foreground">Automations</Link>.</p></div>
        {canEdit && <Button onClick={() => openEdit("new")}><Plus className="h-4 w-4 mr-1" /> New rule</Button>}
      </div>

      <Card className="bg-muted/40"><CardContent className="p-4 flex gap-3 text-sm"><Cloud className="h-4 w-4 mt-0.5 shrink-0 text-primary" /><p className="text-muted-foreground">Rules run <span className="font-medium text-foreground">in the cloud, 24/7</span> — nobody needs to have the app open. Texts go out from your GoHighLevel number between 8am and 8pm; outside those hours (or if a customer has no phone) a task is created to send it instead.</p></CardContent></Card>

      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Your rules</CardTitle><CardDescription>{rules.length ? `${rules.filter((r) => r.data.enabled).length} of ${rules.length} on · ${fired.length} tasks created by rules so far` : "No rules yet — start from a template below."}</CardDescription></CardHeader>
        {rules.length > 0 && <CardContent className="divide-y">
          {rules.map((r) => { const a = actionsOf(r.data); return (
            <div key={r.id} className="py-3 flex flex-col md:flex-row md:items-center gap-3">
              <Switch checked={r.data.enabled} onCheckedChange={() => toggle(r)} disabled={!canEdit} aria-label={r.data.enabled ? "Pause rule" : "Turn rule on"} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{r.data.name} {!r.data.enabled && <Badge variant="outline" className="ml-1 text-[10px]">paused</Badge>}</p>
                <p className="text-xs text-muted-foreground">When <span className="font-medium">{trig(r.data.trigger).l.toLowerCase()}</span>{r.data.conditions.source ? ` · source is ${r.data.conditions.source}` : ""}{r.data.conditions.stage ? ` · stage is ${cap(r.data.conditions.stage)}` : ""}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {a.task && <Badge variant="secondary" className="gap-1 font-normal"><ListTodo className="h-3 w-3" /> Task "{a.task.title}" · {hrs(a.task.dueInHours)} · {a.task.assignTo === "manager" ? "manager" : "owner"}</Badge>}
                  {a.text && <Badge variant="secondary" className="gap-1 font-normal max-w-full truncate"><MessageSquare className="h-3 w-3" /> Text "{a.text.body.slice(0, 60)}{a.text.body.length > 60 ? "…" : ""}"</Badge>}
                </div>
                {a.task && <p className="text-[11px] text-muted-foreground mt-1">{firedFor(r.data.name)} task{firedFor(r.data.name) === 1 ? "" : "s"} created</p>}
              </div>
              {canEdit && <div className="flex gap-1"><Button size="icon" variant="ghost" title="Edit rule" aria-label="Edit rule" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="Delete rule" aria-label="Delete rule" onClick={() => setToDelete(r)}><Trash2 className="h-4 w-4" /></Button></div>}
            </div>); })}
        </CardContent>}
      </Card>

      {canEdit && <Card><CardHeader><CardTitle className="text-base">Start from a template</CardTitle><CardDescription>Opens the rule pre-filled — review it, then Save.</CardDescription></CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TEMPLATES.map((t) => { const a = actionsOf(t.wf); const used = rules.some((r) => r.data.name === t.wf.name); return (
            <button key={t.name} type="button" onClick={() => openEdit("new", t.wf)} className="text-left rounded-xl border p-3 hover:border-primary/50 hover:shadow-sm transition-all">
              <p className="font-semibold text-sm flex items-center gap-1">{t.name}{used && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.why}</p>
              <div className="flex gap-1.5 mt-2">{a.task && <Badge variant="outline" className="gap-1 font-normal text-[10px]"><ListTodo className="h-3 w-3" /> Task</Badge>}{a.text && <Badge variant="outline" className="gap-1 font-normal text-[10px]"><MessageSquare className="h-3 w-3" /> Text</Badge>}</div>
            </button>); })}
        </CardContent></Card>}

      <Card><CardHeader><CardTitle className="text-base">Built-in automations</CardTitle><CardDescription>Always running for {tenant.name}. Change them where they live.</CardDescription></CardHeader>
        <CardContent className="divide-y">
          {BUILT_IN.map((b) => (
            <Link key={b.name} to={b.to} className="py-2.5 flex items-center gap-3 hover:bg-muted/30 -mx-2 px-2 rounded">
              {b.on ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
              <span className="flex-1 min-w-0"><span className="text-sm font-medium block">{b.name}</span><span className="text-xs text-muted-foreground">{b.detail}</span></span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </CardContent></Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}><DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing === "new" ? "New rule" : "Edit rule"}</DialogTitle><DialogDescription>When something happens → create a task, text the customer, or both.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1"><Label>Rule name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Website lead — call within the hour" /></div>
          <div className="space-y-1"><Label>When</Label><Select value={form.trigger} onValueChange={(v) => setForm({ ...form, trigger: v as Trigger, conditions: {}, actions: { ...acts, ...(TRIGGERS.find((t) => t.v === v)?.customer ? {} : { text: undefined }) } })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TRIGGERS.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent></Select></div>
          {(form.trigger === "new_lead" || form.trigger === "lead_stage_changed") && <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Only if source is</Label><Select value={form.conditions.source || "any"} onValueChange={(v) => setForm({ ...form, conditions: { ...form.conditions, source: v === "any" ? undefined : v } })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="any">Any source</SelectItem>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            {form.trigger === "lead_stage_changed" && <div className="space-y-1"><Label>Stage becomes</Label><Select value={form.conditions.stage || ""} onValueChange={(v) => setForm({ ...form, conditions: { ...form.conditions, stage: v as LeadStage } })}><SelectTrigger><SelectValue placeholder="Pick a stage" /></SelectTrigger><SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{cap(s)}</SelectItem>)}</SelectContent></Select></div>}
          </div>}

          <div className="rounded-lg border p-3 space-y-3">
            <label className="flex items-center gap-2 font-semibold text-sm"><Checkbox checked={!!acts.task} onCheckedChange={(c) => setActs({ ...acts, task: c ? { ...NEW_TASK } : undefined })} /> <ListTodo className="h-4 w-4" /> Create a task</label>
            {acts.task && <>
              <div className="space-y-1"><Input value={acts.task.title} onChange={(e) => setActs({ ...acts, task: { ...acts.task!, title: e.target.value } })} /><div className="flex flex-wrap gap-1">{trig(form.trigger).vars.map((x) => <button key={x} type="button" onClick={() => insertVar("task", x)} className="text-[10px] rounded border px-1.5 py-0.5 hover:bg-muted">{`{${x}}`}</button>)}</div></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Due in (hours)</Label><Input type="number" min={0} value={acts.task.dueInHours} onChange={(e) => setActs({ ...acts, task: { ...acts.task!, dueInHours: Math.max(0, Number(e.target.value) || 0) } })} /></div>
                <div className="space-y-1"><Label>Assign to</Label><Select value={acts.task.assignTo} onValueChange={(v) => setActs({ ...acts, task: { ...acts.task!, assignTo: v as any } })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="lead_owner">Owner (else a manager)</SelectItem><SelectItem value="manager">A manager</SelectItem></SelectContent></Select></div>
              </div>
            </>}
          </div>

          {trig(form.trigger).customer && <div className="rounded-lg border p-3 space-y-2">
            <label className="flex items-center gap-2 font-semibold text-sm"><Checkbox checked={!!acts.text} onCheckedChange={(c) => setActs({ ...acts, text: c ? { body: "Hi {first_name}, thanks for choosing {dealership}! " } : undefined })} /> <MessageSquare className="h-4 w-4" /> Text the customer</label>
            {acts.text && <>
              <Textarea rows={3} maxLength={480} value={acts.text.body} onChange={(e) => setActs({ ...acts, text: { body: e.target.value } })} />
              <div className="flex flex-wrap gap-1">{trig(form.trigger).vars.map((x) => <button key={x} type="button" onClick={() => insertVar("text", x)} className="text-[10px] rounded border px-1.5 py-0.5 hover:bg-muted">{`{${x}}`}</button>)}</div>
              <p className="text-[11px] text-muted-foreground">{acts.text.body.length}/480 · Sent from your GoHighLevel number, 8am–8pm. {ghl.connected ? "" : <span className="text-amber-700">GoHighLevel isn't connected — texts become tasks until it is.</span>}</p>
            </>}
          </div>}

          <div className="flex items-center gap-2"><Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} /><Label>Turn on when saved</Label></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save rule</Button></DialogFooter>
      </DialogContent></Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete "{toDelete?.data.name}"?</AlertDialogTitle><AlertDialogDescription>Tasks and texts it already created stay.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={del}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
