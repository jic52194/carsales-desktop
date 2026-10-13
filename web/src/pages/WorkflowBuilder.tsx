import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Zap, Info } from "lucide-react";
import { toast } from "sonner";
import { useCollection, insert, list, logActivity, fullName, get, type Lead, type LeadStage } from "@/lib/store";
import { useInventory, vTitle } from "@/lib/inventory";
import { useRecords, addRecord, updateRecord, removeRecord, type Rec } from "@/lib/records";
import { useAuth, listUsers } from "@/lib/auth";

export type Trigger = "new_lead" | "lead_stage_changed" | "appointment_booked" | "deal_delivered" | "vehicle_added";
/** Automation rule — records kind "workflow". */
export interface Workflow {
  name: string; trigger: Trigger; enabled: boolean;
  conditions: { source?: string; stage?: LeadStage };
  action: { kind: "create_task"; title: string; dueInHours: number; assignTo: "lead_owner" | "manager" };
}
const TRIGGERS: { v: Trigger; l: string; hint: string }[] = [
  { v: "new_lead", l: "New lead created", hint: "{customer}, {source}, {vehicle}" },
  { v: "lead_stage_changed", l: "Lead moved to a stage", hint: "{customer}, {stage}, {vehicle}" },
  { v: "appointment_booked", l: "Appointment booked", hint: "{customer}, {vehicle}" },
  { v: "deal_delivered", l: "Deal delivered / funded", hint: "{customer}, {vehicle}" },
  { v: "vehicle_added", l: "Vehicle added to inventory", hint: "{vehicle}, {stock}" },
];
const STAGES: LeadStage[] = ["new", "contacted", "appointment", "negotiating", "sold", "lost"];
const SOURCES = ["Walk-in", "Phone", "Website", "Referral", "Facebook", "CarGurus", "Cars.com", "AutoTrader", "Repeat", "Other"];
const PROCESSED_KEY = "cso:wf:processed";
const EMPTY: Workflow = { name: "", trigger: "new_lead", enabled: true, conditions: {}, action: { kind: "create_task", title: "Follow up with {customer}", dueInHours: 2, assignTo: "lead_owner" } };

const readProcessed = (): Set<string> => { try { return new Set(JSON.parse(localStorage.getItem(PROCESSED_KEY) || "[]")); } catch { return new Set(); } };
const writeProcessed = (s: Set<string>) => { try { localStorage.setItem(PROCESSED_KEY, JSON.stringify(Array.from(s).slice(-5000))); } catch { /* storage unavailable */ } };
const fill = (tpl: string, vars: Record<string, string | undefined>) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

/**
 * Client-side rule runner. Mount once (e.g. next to LeadNotifier) so rules fire while the app is open.
 * Each (rule, row[, stage]) pair is processed once per device; the id list lives in localStorage "cso:wf:processed".
 * Only rows created/changed after the rule itself was created are considered, so enabling a rule never back-fills old data.
 */
export function useWorkflowRunner() {
  const { user } = useAuth();
  const rules = useRecords<Workflow>("workflow");
  const leads = useCollection("leads"); const appts = useCollection("appointments"); const deals = useCollection("deals");
  const vehicles = useInventory();
  const busy = useRef(false);
  useEffect(() => {
    if (!user || busy.current) return;
    const active = rules.filter((r) => r.data.enabled);
    if (!active.length) return;
    const processed = readProcessed();
    const manager = listUsers().find((u) => u.isActive && ["manager", "admin", "owner"].includes(u.role))?.id;
    const jobs: { key: string; rule: Rec<Workflow>; vars: Record<string, string | undefined>; owner?: string; relatedType: "customer" | "lead" | "deal" | "vehicle"; relatedId: string }[] = [];
    const veh = (id?: string) => { const v = id ? vehicles.find((x) => x.id === id) : undefined; return v ? vTitle(v) : undefined; };
    for (const rule of active) {
      const { trigger, conditions } = rule.data; const since = rule.createdAt;
      if (trigger === "new_lead") leads.filter((l) => l.createdAt >= since && (!conditions.source || l.source === conditions.source)).forEach((l) => jobs.push({ key: `${rule.id}:${l.id}`, rule, owner: l.assignedTo, relatedType: "lead", relatedId: l.id, vars: { customer: fullName(get("customers", l.customerId)), source: l.source, vehicle: veh(l.vehicleId), stage: l.stage } }));
      if (trigger === "lead_stage_changed") leads.filter((l: Lead) => l.updatedAt >= since && conditions.stage && l.stage === conditions.stage && (!conditions.source || l.source === conditions.source)).forEach((l) => jobs.push({ key: `${rule.id}:${l.id}:${l.stage}`, rule, owner: l.assignedTo, relatedType: "lead", relatedId: l.id, vars: { customer: fullName(get("customers", l.customerId)), source: l.source, vehicle: veh(l.vehicleId), stage: l.stage } }));
      if (trigger === "appointment_booked") appts.filter((a) => a.createdAt >= since && a.status !== "cancelled").forEach((a) => jobs.push({ key: `${rule.id}:${a.id}`, rule, owner: a.assignedTo, relatedType: "customer", relatedId: a.customerId || a.id, vars: { customer: fullName(get("customers", a.customerId || "")), vehicle: veh(a.vehicleId) } }));
      if (trigger === "deal_delivered") deals.filter((d) => d.updatedAt >= since && ["funded", "delivered"].includes(d.status)).forEach((d) => jobs.push({ key: `${rule.id}:${d.id}`, rule, owner: d.salespersonId, relatedType: "deal", relatedId: d.id, vars: { customer: fullName(get("customers", d.customerId)), vehicle: veh(d.vehicleId) } }));
      if (trigger === "vehicle_added") vehicles.filter((v) => (v.addedAt || "") >= since).forEach((v) => jobs.push({ key: `${rule.id}:${v.id}`, rule, relatedType: "vehicle", relatedId: v.id, vars: { vehicle: vTitle(v), stock: v.stockNumber } }));
    }
    const todo = jobs.filter((j) => !processed.has(j.key));
    if (!todo.length) return;
    busy.current = true;
    (async () => {
      for (const j of todo) {
        const title = fill(j.rule.data.action.title, j.vars).trim() || j.rule.data.name;
        processed.add(j.key); writeProcessed(processed);
        // another device may already have created it — skip if an identical open task exists for the same record
        if (list("tasks").some((t) => t.relatedId === j.relatedId && t.title === title && t.status === "open")) continue;
        try {
          const assignedTo = j.rule.data.action.assignTo === "manager" ? manager : (j.owner || manager);
          const t = await insert("tasks", { title, status: "open", priority: "normal", dueAt: new Date(Date.now() + j.rule.data.action.dueInHours * 36e5).toISOString(), assignedTo, relatedType: j.relatedType, relatedId: j.relatedId, notes: `Created by workflow "${j.rule.data.name}"` } as any);
          logActivity("workflow", "task", t.id, j.rule.data.name, user.id);
        } catch { /* leave it processed; the next matching row will try again */ }
      }
      busy.current = false;
    })();
  }, [rules, leads, appts, deals, vehicles, user]);
}

export default function WorkflowBuilder() {
  const { user } = useAuth();
  const rules = useRecords<Workflow>("workflow");
  const tasks = useCollection("tasks");
  const [editing, setEditing] = useState<Rec<Workflow> | "new" | null>(null);
  const [form, setForm] = useState<Workflow>(EMPTY);
  const [toDelete, setToDelete] = useState<Rec<Workflow> | null>(null);
  const fired = useMemo(() => tasks.filter((t) => t.notes?.startsWith('Created by workflow "')), [tasks]);
  const firedFor = (name: string) => fired.filter((t) => t.notes === `Created by workflow "${name}"`).length;

  const openEdit = (r: Rec<Workflow> | "new") => { setEditing(r); setForm(r === "new" ? EMPTY : { ...EMPTY, ...r.data, conditions: { ...r.data.conditions }, action: { ...r.data.action } }); };
  const save = async () => {
    if (!form.name.trim()) return toast.error("Name the rule");
    if (!form.action.title.trim()) return toast.error("Task title is required");
    if (form.trigger === "lead_stage_changed" && !form.conditions.stage) return toast.error("Pick the stage that triggers this rule");
    const data: Workflow = { ...form, name: form.name.trim(), conditions: Object.fromEntries(Object.entries(form.conditions).filter(([, v]) => v)) };
    try {
      if (editing === "new") { const r = await addRecord<Workflow>("workflow", data, user?.id); logActivity("create", "workflow", r.id, data.name, user?.id); }
      else if (editing) await updateRecord<Workflow>("workflow", editing.id, data);
      toast.success("Rule saved"); setEditing(null);
    } catch (e: any) { toast.error(e.message || "Could not save"); }
  };
  const toggle = (r: Rec<Workflow>) => updateRecord<Workflow>("workflow", r.id, { enabled: !r.data.enabled }).catch((e) => toast.error(e.message));
  const del = async () => { if (!toDelete) return; try { await removeRecord("workflow", toDelete.id); toast.success("Rule deleted"); } catch (e: any) { toast.error(e.message); } setToDelete(null); };
  const trig = (v: Trigger) => TRIGGERS.find((t) => t.v === v)!;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div><h1 className="text-3xl font-black">Workflows</h1><p className="text-muted-foreground">When something happens, create the follow-up task automatically.</p></div>
        <Button onClick={() => openEdit("new")}><Plus className="h-4 w-4 mr-1" /> New rule</Button>
      </div>

      <Card className="bg-muted/40"><CardContent className="p-4 flex gap-3 text-sm"><Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" /><p className="text-muted-foreground">These rules run <span className="font-medium text-foreground">while the app is open</span> on any signed-in device and create tasks in the shared task list. Server-side automation that runs 24/7 — the new-lead follow-up task and appointment reminders — is already built into the backend and doesn't depend on this page.</p></CardContent></Card>

      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Rules</CardTitle><CardDescription>{rules.length ? `${rules.filter((r) => r.data.enabled).length} of ${rules.length} enabled · ${fired.length} tasks created by rules so far` : "No rules yet"}</CardDescription></CardHeader><CardContent className="divide-y">
        {rules.length === 0 && <p className="text-sm text-muted-foreground py-2">Start with something simple: "New lead from Website → task 'Call {"{customer}"}' due in 1 hour, assigned to the lead owner."</p>}
        {rules.map((r) => <div key={r.id} className="py-3 flex flex-col md:flex-row md:items-center gap-3">
          <Switch checked={r.data.enabled} onCheckedChange={() => toggle(r)} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{r.data.name} {!r.data.enabled && <Badge variant="outline" className="ml-1 text-[10px]">paused</Badge>}</p>
            <p className="text-xs text-muted-foreground">When <span className="font-medium">{trig(r.data.trigger).l.toLowerCase()}</span>{r.data.conditions.source ? ` · source is ${r.data.conditions.source}` : ""}{r.data.conditions.stage ? ` · stage is ${r.data.conditions.stage}` : ""} → task "{r.data.action.title}" due in {r.data.action.dueInHours}h for {r.data.action.assignTo === "manager" ? "a manager" : "the owner"}</p>
            <p className="text-xs text-muted-foreground">{firedFor(r.data.name)} task{firedFor(r.data.name) === 1 ? "" : "s"} created</p>
          </div>
          <div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => setToDelete(r)}><Trash2 className="h-4 w-4" /></Button></div>
        </div>)}
      </CardContent></Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{editing === "new" ? "New rule" : "Edit rule"}</DialogTitle><DialogDescription>Placeholders for the task title: {trig(form.trigger).hint}</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Rule name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Website lead — call within the hour" /></div>
          <div className="space-y-1"><Label>When</Label><Select value={form.trigger} onValueChange={(v) => setForm({ ...form, trigger: v as Trigger, conditions: {} })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TRIGGERS.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent></Select></div>
          {(form.trigger === "new_lead" || form.trigger === "lead_stage_changed") && <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Source is (optional)</Label><Select value={form.conditions.source || "any"} onValueChange={(v) => setForm({ ...form, conditions: { ...form.conditions, source: v === "any" ? undefined : v } })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="any">Any source</SelectItem>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            {form.trigger === "lead_stage_changed" && <div className="space-y-1"><Label>Stage becomes</Label><Select value={form.conditions.stage || ""} onValueChange={(v) => setForm({ ...form, conditions: { ...form.conditions, stage: v as LeadStage } })}><SelectTrigger><SelectValue placeholder="Pick a stage" /></SelectTrigger><SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select></div>}
          </div>}
          <div className="space-y-1"><Label>Create task titled</Label><Input value={form.action.title} onChange={(e) => setForm({ ...form, action: { ...form.action, title: e.target.value } })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Due in (hours)</Label><Input type="number" min={0} value={form.action.dueInHours} onChange={(e) => setForm({ ...form, action: { ...form.action, dueInHours: Math.max(0, Number(e.target.value) || 0) } })} /></div>
            <div className="space-y-1"><Label>Assign to</Label><Select value={form.action.assignTo} onValueChange={(v) => setForm({ ...form, action: { ...form.action, assignTo: v as any } })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="lead_owner">Owner of the record (else a manager)</SelectItem><SelectItem value="manager">A manager</SelectItem></SelectContent></Select></div>
          </div>
          <div className="flex items-center gap-2"><Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} /><Label>Enabled</Label></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save rule</Button></DialogFooter>
      </DialogContent></Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete "{toDelete?.data.name}"?</AlertDialogTitle><AlertDialogDescription>Tasks it already created stay in the task list.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={del}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
