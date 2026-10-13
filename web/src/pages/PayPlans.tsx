import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Trash2, Calculator, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useCollection, money, logActivity, type Deal } from "@/lib/store";
import { useRecords, addRecord, updateRecord, removeRecord, type Rec } from "@/lib/records";
import { useAuth, useUsers } from "@/lib/auth";

export type PlanType = "commission" | "flat" | "salary_commission";
export interface PayPlan { name: string; type: PlanType; percentFront: number; percentBack: number; flatPerUnit: number; minis: number; salary: number; volumeBonuses: { units: number; bonus: number }[] }
export interface PayPlanAssignment { userId: string; payplanId: string }

const TYPE_LABEL: Record<PlanType, string> = { commission: "Commission %", flat: "Flat per unit", salary_commission: "Salary + commission" };
const EMPTY = { name: "", type: "commission" as PlanType, percentFront: "25", percentBack: "5", flatPerUnit: "", minis: "", salary: "", tiers: [] as { units: string; bonus: string }[] };
const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/** Per-deal commission under a plan: the greater of the mini and the computed amount. */
export function dealCommission(p: PayPlan, d: Deal) {
  const earned = p.type === "flat" ? p.flatPerUnit : (d.frontEndGross || 0) * (p.percentFront / 100) + (d.backEndGross || 0) * (p.percentBack / 100);
  return Math.max(earned, p.minis || 0);
}
export function monthEstimate(p: PayPlan, deals: Deal[]) {
  const commission = deals.reduce((a, d) => a + dealCommission(p, d), 0);
  const tier = [...(p.volumeBonuses || [])].sort((a, b) => b.units - a.units).find((t) => deals.length >= t.units);
  return { commission, bonus: tier?.bonus ?? 0, salary: p.type === "salary_commission" ? p.salary || 0 : 0, total: commission + (tier?.bonus ?? 0) + (p.type === "salary_commission" ? p.salary || 0 : 0) };
}

export default function PayPlans() {
  const { user, hasPermission } = useAuth();
  const isAdmin = hasPermission(["admin"]);
  const users = useUsers().filter((u) => u.isActive);
  const deals = useCollection("deals");
  const plans = useRecords<PayPlan>("payplan");
  const assigns = useRecords<PayPlanAssignment>("payplan_assignment");
  const [month, setMonth] = useState(ym(new Date()));
  const [editing, setEditing] = useState<Rec<PayPlan> | "new" | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [toDelete, setToDelete] = useState<Rec<PayPlan> | null>(null);

  const months = useMemo(() => { const s = new Set<string>([ym(new Date())]); deals.forEach((d) => s.add(ym(new Date(d.updatedAt)))); return [...s].sort().reverse(); }, [deals]);
  const delivered = useMemo(() => deals.filter((d) => d.status === "delivered" && ym(new Date(d.updatedAt)) === month), [deals, month]);
  const planOf = (userId: string) => { const a = assigns.find((x) => x.data.userId === userId); return a ? plans.find((p) => p.id === a.data.payplanId) : undefined; };
  const estimates = useMemo(() => users.filter((u) => isAdmin || u.id === user?.id).map((u) => { const p = planOf(u.id); const mine = delivered.filter((d) => d.salespersonId === u.id); return { u, p, units: mine.length, est: p ? monthEstimate(p.data, mine) : null }; }).filter((r) => isAdmin ? r.p || r.units : true).sort((a, b) => (b.est?.total ?? 0) - (a.est?.total ?? 0)), [users, assigns, plans, delivered, isAdmin, user]);

  const openEdit = (p: Rec<PayPlan> | "new") => { setEditing(p); setForm(p === "new" ? EMPTY : { name: p.data.name, type: p.data.type, percentFront: String(p.data.percentFront ?? ""), percentBack: String(p.data.percentBack ?? ""), flatPerUnit: String(p.data.flatPerUnit ?? ""), minis: String(p.data.minis ?? ""), salary: String(p.data.salary ?? ""), tiers: (p.data.volumeBonuses ?? []).map((t) => ({ units: String(t.units), bonus: String(t.bonus) })) }); };
  const save = async () => {
    if (!form.name.trim()) return toast.error("Name the plan");
    const data: PayPlan = { name: form.name.trim(), type: form.type, percentFront: Number(form.percentFront) || 0, percentBack: Number(form.percentBack) || 0, flatPerUnit: Number(form.flatPerUnit) || 0, minis: Number(form.minis) || 0, salary: Number(form.salary) || 0, volumeBonuses: form.tiers.map((t) => ({ units: Number(t.units) || 0, bonus: Number(t.bonus) || 0 })).filter((t) => t.units > 0) };
    try { if (editing === "new") await addRecord<PayPlan>("payplan", data, user?.id); else if (editing) await updateRecord<PayPlan>("payplan", editing.id, data); toast.success("Pay plan saved"); setEditing(null); }
    catch (e: any) { toast.error(e.message || "Could not save"); }
  };
  const assign = async (userId: string, payplanId: string) => {
    const cur = assigns.find((a) => a.data.userId === userId);
    try {
      if (payplanId === "none") { if (cur) await removeRecord("payplan_assignment", cur.id); }
      else if (cur) await updateRecord<PayPlanAssignment>("payplan_assignment", cur.id, { payplanId }); else await addRecord<PayPlanAssignment>("payplan_assignment", { userId, payplanId }, user?.id);
      logActivity("payplan_assigned", "user", userId, plans.find((p) => p.id === payplanId)?.data.name ?? "none", user?.id);
    } catch (e: any) { toast.error(e.message || "Could not assign"); }
  };
  const confirmDelete = async () => { if (!toDelete) return; try { for (const a of assigns.filter((x) => x.data.payplanId === toDelete.id)) await removeRecord("payplan_assignment", a.id); await removeRecord("payplan", toDelete.id); toast.success("Plan deleted"); setToDelete(null); } catch (e: any) { toast.error(e.message); } };
  const describe = (p: PayPlan) => p.type === "flat" ? `${money(p.flatPerUnit)} / unit` : `${p.percentFront}% front · ${p.percentBack}% back${p.type === "salary_commission" ? ` · ${money(p.salary)} salary` : ""}${p.minis ? ` · ${money(p.minis)} mini` : ""}`;
  const monthLabel = new Date(month + "-01T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Pay Plans</h1><p className="text-muted-foreground">{isAdmin ? `${plans.length} plan${plans.length === 1 ? "" : "s"} · ${assigns.length} assigned` : "Your estimated commission for the month"}</p></div>
        <div className="flex gap-2">
          <Select value={month} onValueChange={setMonth}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent>{months.map((m) => <SelectItem key={m} value={m}>{new Date(m + "-01T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" })}</SelectItem>)}</SelectContent></Select>
          {isAdmin && <Button onClick={() => openEdit("new")}><Plus className="h-4 w-4 mr-1" /> Plan</Button>}
        </div>
      </div>

      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4" /> Estimated commission · {monthLabel}</CardTitle><CardDescription>Estimate only — computed from delivered deals' front and back gross under the assigned plan. Not a payroll record; chargebacks, draws, and adjustments are not included.</CardDescription></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {estimates.length === 0 ? <p className="p-6 text-sm text-muted-foreground">{plans.length === 0 ? "No pay plans defined yet." : "No one is assigned a plan and no deals were delivered this month."}</p> : <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase"><tr><th className="text-left p-3">Salesperson</th><th className="text-left p-3">Plan</th><th className="text-right p-3">Units</th><th className="text-right p-3">Commission</th><th className="text-right p-3">Volume bonus</th><th className="text-right p-3">Salary</th><th className="text-right p-3">Est. total</th></tr></thead>
            <tbody className="divide-y">{estimates.map(({ u, p, units, est }) => <tr key={u.id}>
              <td className="p-3 font-medium">{u.fullName}</td>
              <td className="p-3">{isAdmin ? <Select value={p?.id ?? "none"} onValueChange={(v) => assign(u.id, v)}><SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No plan</SelectItem>{plans.map((pl) => <SelectItem key={pl.id} value={pl.id}>{pl.data.name}</SelectItem>)}</SelectContent></Select> : p?.data.name ?? <span className="text-muted-foreground">No plan assigned — ask your manager</span>}</td>
              <td className="p-3 text-right">{units}</td>
              <td className="p-3 text-right">{est ? money(est.commission) : "—"}</td><td className="p-3 text-right">{est ? money(est.bonus) : "—"}</td><td className="p-3 text-right">{est ? money(est.salary) : "—"}</td>
              <td className="p-3 text-right font-bold">{est ? money(est.total) : "—"}</td>
            </tr>)}</tbody>
          </table>}
        </CardContent></Card>

      {isAdmin && (plans.length === 0 ? <Card><CardContent className="p-10 text-center text-muted-foreground">No pay plans yet. Create one, then assign it to each salesperson above.</CardContent></Card> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => <Card key={p.id}><CardContent className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2"><div><p className="font-bold">{p.data.name}</p><Badge variant="outline">{TYPE_LABEL[p.data.type]}</Badge></div><div className="flex gap-1"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setToDelete(p)}><Trash2 className="h-3.5 w-3.5" /></Button></div></div>
            <p className="text-sm">{describe(p.data)}</p>
            {p.data.volumeBonuses?.length > 0 && <p className="text-xs text-muted-foreground">Bonus: {p.data.volumeBonuses.map((t) => `${t.units}+ units → ${money(t.bonus)}`).join(" · ")}</p>}
            <p className="text-xs text-muted-foreground">{assigns.filter((a) => a.data.payplanId === p.id).length} assigned</p>
          </CardContent></Card>)}
        </div>
      ))}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing === "new" ? "New pay plan" : "Edit pay plan"}</DialogTitle><DialogDescription>Per-deal pay is the greater of the mini and the computed amount.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Standard 25/5" /></div>
            <div className="space-y-1 col-span-2"><Label>Type</Label><Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(TYPE_LABEL) as PlanType[]).map((t) => <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}</SelectContent></Select></div>
            {form.type === "flat" ? <div className="space-y-1"><Label>Flat per unit ($)</Label><Input type="number" value={form.flatPerUnit} onChange={(e) => setForm({ ...form, flatPerUnit: e.target.value })} /></div> : <>
              <div className="space-y-1"><Label>% of front gross</Label><Input type="number" value={form.percentFront} onChange={(e) => setForm({ ...form, percentFront: e.target.value })} /></div>
              <div className="space-y-1"><Label>% of back gross</Label><Input type="number" value={form.percentBack} onChange={(e) => setForm({ ...form, percentBack: e.target.value })} /></div>
            </>}
            <div className="space-y-1"><Label>Mini per unit ($)</Label><Input type="number" value={form.minis} onChange={(e) => setForm({ ...form, minis: e.target.value })} /></div>
            {form.type === "salary_commission" && <div className="space-y-1"><Label>Monthly salary ($)</Label><Input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></div>}
            <div className="space-y-2 col-span-2"><Label>Volume bonus tiers</Label>
              {form.tiers.map((t, i) => <div key={i} className="flex items-center gap-2"><Input type="number" className="h-8" placeholder="Units" value={t.units} onChange={(e) => setForm({ ...form, tiers: form.tiers.map((x, j) => (j === i ? { ...x, units: e.target.value } : x)) })} /><span className="text-xs">units →</span><Input type="number" className="h-8" placeholder="Bonus $" value={t.bonus} onChange={(e) => setForm({ ...form, tiers: form.tiers.map((x, j) => (j === i ? { ...x, bonus: e.target.value } : x)) })} /><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setForm({ ...form, tiers: form.tiers.filter((_, j) => j !== i) })}><Trash2 className="h-3.5 w-3.5" /></Button></div>)}
              <Button size="sm" variant="outline" onClick={() => setForm({ ...form, tiers: [...form.tiers, { units: "", bonus: "" }] })}><Plus className="h-3.5 w-3.5 mr-1" /> Tier</Button>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete {toDelete?.data.name}?</AlertDialogTitle><AlertDialogDescription>Anyone assigned this plan is unassigned. Past estimates are not stored, so nothing else changes.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
