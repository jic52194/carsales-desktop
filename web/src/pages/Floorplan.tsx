import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Landmark, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useInventory, getVehicle, vTitle } from "@/lib/inventory";
import { useRecords, addRecord, updateRecord, removeRecord, type Rec } from "@/lib/records";
import { useAuth } from "@/lib/auth";
import { logActivity, money, fmtDate } from "@/lib/store";

export interface FloorplanLine { lender: string; limit: number | null; notes: string }
export interface Floorplan { vehicleId: string; lender: string; amount: number; dateFloored: string; rate: number; curtailmentDate: string | null; paidOff: boolean; paidOffDate?: string }

const DAY = 86400000;
const daysSince = (iso: string, until?: string) => Math.max(0, Math.floor(((until ? new Date(until).getTime() : Date.now()) - new Date(iso).getTime()) / DAY));
const interest = (f: Floorplan) => (f.amount * (f.rate / 100) / 365) * daysSince(f.dateFloored, f.paidOff ? f.paidOffDate : undefined);
const today = () => new Date().toISOString().slice(0, 10);

export default function FloorplanPage() {
  const { user, hasPermission } = useAuth();
  const canEdit = hasPermission(["manager", "inventory", "f_and_i"]);
  const inventory = useInventory();
  const lines = useRecords<FloorplanLine>("floorplan_line");
  const plans = useRecords<Floorplan>("floorplan");
  const [lineOpen, setLineOpen] = useState(false);
  const [lineForm, setLineForm] = useState({ lender: "", limit: "", notes: "" });
  const [floorOpen, setFloorOpen] = useState(false);
  const [form, setForm] = useState({ vehicleId: "", lender: "", amount: "", dateFloored: today(), rate: "", curtailmentDate: "" });
  const [showPaid, setShowPaid] = useState(false);
  const [paying, setPaying] = useState<Rec<Floorplan> | null>(null);
  const [lineDelete, setLineDelete] = useState<Rec<FloorplanLine> | null>(null);

  const open = useMemo(() => plans.filter((p) => !p.data.paidOff), [plans]);
  const rows = useMemo(() => (showPaid ? plans : open).slice().sort((a, b) => a.data.dateFloored.localeCompare(b.data.dateFloored)), [plans, open, showPaid]);
  const floored = useMemo(() => new Set(open.map((p) => p.data.vehicleId)), [open]);
  const candidates = useMemo(() => inventory.filter((v) => v.status !== "Sold" && !floored.has(v.id)), [inventory, floored]);
  const byLender = useMemo(() => lines.map((l) => { const mine = open.filter((p) => p.data.lender === l.data.lender); const used = mine.reduce((a, p) => a + p.data.amount, 0); return { line: l, units: mine.length, used, interest: mine.reduce((a, p) => a + interest(p.data), 0) }; }), [lines, open]);
  const totals = useMemo(() => ({ principal: open.reduce((a, p) => a + p.data.amount, 0), interest: open.reduce((a, p) => a + interest(p.data), 0), limit: lines.reduce((a, l) => a + (l.data.limit ?? 0), 0), dueSoon: open.filter((p) => p.data.curtailmentDate && daysSince(today(), p.data.curtailmentDate) <= 14 && new Date(p.data.curtailmentDate) >= new Date(today())).length, overdue: open.filter((p) => p.data.curtailmentDate && p.data.curtailmentDate < today()).length }), [open, lines]);

  const saveLine = async () => {
    if (!lineForm.lender.trim()) return toast.error("Lender name is required");
    try { await addRecord<FloorplanLine>("floorplan_line", { lender: lineForm.lender.trim(), limit: lineForm.limit === "" ? null : Number(lineForm.limit), notes: lineForm.notes }, user?.id); toast.success("Credit line added"); setLineOpen(false); setLineForm({ lender: "", limit: "", notes: "" }); }
    catch (e: any) { toast.error(e.message || "Could not save"); }
  };
  const deleteLine = async () => { if (!lineDelete) return; try { await removeRecord("floorplan_line", lineDelete.id); toast.success("Line removed"); setLineDelete(null); } catch (e: any) { toast.error(e.message); } };

  const saveFloor = async () => {
    const v = getVehicle(form.vehicleId); const amount = Number(form.amount); const rate = Number(form.rate);
    if (!v) return toast.error("Pick a vehicle"); if (!form.lender) return toast.error("Pick a lender"); if (!amount) return toast.error("Enter the floored amount"); if (!form.dateFloored) return toast.error("Enter the floor date");
    try {
      await addRecord<Floorplan>("floorplan", { vehicleId: v.id, lender: form.lender, amount, dateFloored: form.dateFloored, rate: rate || 0, curtailmentDate: form.curtailmentDate || null, paidOff: false }, user?.id);
      logActivity("floorplan_add", "vehicle", v.id, `${vTitle(v)} floored ${money(amount)} with ${form.lender}`, user?.id);
      toast.success("Vehicle floored"); setFloorOpen(false); setForm({ vehicleId: "", lender: "", amount: "", dateFloored: today(), rate: "", curtailmentDate: "" });
    } catch (e: any) { toast.error(e.message || "Could not save"); }
  };
  const payOff = async () => {
    if (!paying) return;
    try { await updateRecord<Floorplan>("floorplan", paying.id, { paidOff: true, paidOffDate: today() }); logActivity("floorplan_payoff", "vehicle", paying.data.vehicleId, money(paying.data.amount), user?.id); toast.success("Paid off"); setPaying(null); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Floorplan</h1><p className="text-muted-foreground">{open.length} unit{open.length === 1 ? "" : "s"} floored · {money(totals.principal)} outstanding{totals.limit ? ` of ${money(totals.limit)} available` : ""}</p></div>
        {canEdit && <div className="flex gap-2"><Button variant="outline" onClick={() => setLineOpen(true)}><Landmark className="h-4 w-4 mr-1" /> Add lender</Button><Button onClick={() => setFloorOpen(true)} disabled={!lines.length}><Plus className="h-4 w-4 mr-1" /> Floor a vehicle</Button></div>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Outstanding</p><p className="text-2xl font-black">{money(totals.principal)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Interest to date (est.)</p><p className="text-2xl font-black">{money(Math.round(totals.interest))}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Curtailments due ≤14d</p><p className="text-2xl font-black">{totals.dueSoon}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Overdue curtailments</p><p className={`text-2xl font-black ${totals.overdue ? "text-destructive" : ""}`}>{totals.overdue}</p></CardContent></Card>
      </div>

      {lines.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground"><Landmark className="h-8 w-8 mx-auto mb-2 opacity-40" />No floorplan lenders yet. Add your lender(s) and credit limit, then floor vehicles against them. Lender balances aren't synced automatically; enter what's on your statement.</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {byLender.map(({ line, units, used, interest: int }) => { const lim = line.data.limit; const pct = lim ? Math.min(100, Math.round((used / lim) * 100)) : null; return (
            <Card key={line.id}><CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2"><div><p className="font-bold">{line.data.lender}</p><p className="text-xs text-muted-foreground">{units} unit{units === 1 ? "" : "s"} · {money(used)}{lim ? ` of ${money(lim)}` : ""}</p></div>{canEdit && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setLineDelete(line)}><Trash2 className="h-3.5 w-3.5" /></Button>}</div>
              {pct != null ? <><Progress value={pct} className={pct >= 90 ? "[&>div]:bg-destructive" : ""} /><p className="text-xs text-muted-foreground">{pct}% used · {money(lim! - used)} available · est. interest {money(Math.round(int))}</p></> : <p className="text-xs text-muted-foreground">No limit set · est. interest {money(Math.round(int))}</p>}
            </CardContent></Card>
          ); })}
        </div>
      )}

      {lines.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0"><div><CardTitle className="text-base">Floored vehicles</CardTitle><CardDescription>Interest is a simple estimate: amount × rate ÷ 365 × days. Fees and your lender's actual accrual may differ.</CardDescription></div><Button size="sm" variant="outline" onClick={() => setShowPaid(!showPaid)}>{showPaid ? "Hide paid off" : "Show paid off"}</Button></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {rows.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No vehicles floored. Floor a vehicle to track principal, interest and curtailment dates.</p> : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Lender</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-right">Rate</th><th className="px-4 py-3 text-right">Floored</th><th className="px-4 py-3 text-right">Days</th><th className="px-4 py-3 text-right">Interest (est.)</th><th className="px-4 py-3">Curtailment</th>{canEdit && <th className="px-4 py-3"></th>}</tr></thead>
                <tbody className="divide-y">{rows.map((p) => { const f = p.data; const v = getVehicle(f.vehicleId); const overdue = !f.paidOff && !!f.curtailmentDate && f.curtailmentDate < today(); const soon = !f.paidOff && !overdue && !!f.curtailmentDate && daysSince(today(), f.curtailmentDate) <= 14; return (
                  <tr key={p.id} className={`hover:bg-muted/30 ${f.paidOff ? "opacity-60" : ""}`}>
                    <td className="px-4 py-2 font-semibold">{v ? <Link to={`/inventory/${v.id}`} className="hover:underline">{vTitle(v)}</Link> : "Vehicle removed"}{v && <span className="block text-xs font-normal text-muted-foreground">#{v.stockNumber} · {v.status}</span>}</td>
                    <td className="px-4 py-2">{f.lender}</td>
                    <td className="px-4 py-2 text-right font-semibold">{money(f.amount)}</td>
                    <td className="px-4 py-2 text-right">{f.rate}%</td>
                    <td className="px-4 py-2 text-right">{fmtDate(f.dateFloored)}</td>
                    <td className="px-4 py-2 text-right">{daysSince(f.dateFloored, f.paidOff ? f.paidOffDate : undefined)}</td>
                    <td className="px-4 py-2 text-right">{money(Math.round(interest(f)))}</td>
                    <td className="px-4 py-2">{f.paidOff ? <Badge variant="secondary"><CheckCircle2 className="h-3 w-3 mr-1" /> Paid {fmtDate(f.paidOffDate)}</Badge> : f.curtailmentDate ? <Badge variant={overdue ? "destructive" : soon ? "default" : "outline"}>{fmtDate(f.curtailmentDate)}</Badge> : <span className="text-muted-foreground">—</span>}</td>
                    {canEdit && <td className="px-4 py-2 text-right">{!f.paidOff && <Button size="sm" variant="outline" onClick={() => setPaying(p)}>Pay off</Button>}</td>}
                  </tr>
                ); })}</tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={lineOpen} onOpenChange={setLineOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add floorplan lender</DialogTitle><DialogDescription>A credit line you floor vehicles against.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Lender</Label><Input value={lineForm.lender} onChange={(e) => setLineForm({ ...lineForm, lender: e.target.value })} placeholder="e.g. NextGear, AFC, local bank" /></div>
            <div className="space-y-1"><Label>Credit limit</Label><Input type="number" value={lineForm.limit} onChange={(e) => setLineForm({ ...lineForm, limit: e.target.value })} /></div>
            <div className="space-y-1"><Label>Notes</Label><Input value={lineForm.notes} onChange={(e) => setLineForm({ ...lineForm, notes: e.target.value })} placeholder="Terms, rep, curtailment rules" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setLineOpen(false)}>Cancel</Button><Button onClick={saveLine}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={floorOpen} onOpenChange={setFloorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Floor a vehicle</DialogTitle><DialogDescription>Record the advance so interest and curtailments are tracked.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2"><Label>Vehicle</Label><Select value={form.vehicleId} onValueChange={(v) => { const veh = getVehicle(v); setForm({ ...form, vehicleId: v, amount: form.amount || (veh?.cost != null ? String(veh.cost) : "") }); }}><SelectTrigger><SelectValue placeholder="Choose a vehicle" /></SelectTrigger><SelectContent>{candidates.length === 0 ? <SelectItem value="_" disabled>Every unsold vehicle is already floored</SelectItem> : candidates.map((v) => <SelectItem key={v.id} value={v.id}>#{v.stockNumber} · {vTitle(v)}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1 col-span-2"><Label>Lender</Label><Select value={form.lender} onValueChange={(v) => setForm({ ...form, lender: v })}><SelectTrigger><SelectValue placeholder="Choose a lender" /></SelectTrigger><SelectContent>{lines.map((l) => <SelectItem key={l.id} value={l.data.lender}>{l.data.lender}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Amount floored</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div className="space-y-1"><Label>Rate (% APR)</Label><Input type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} /></div>
            <div className="space-y-1"><Label>Date floored</Label><Input type="date" value={form.dateFloored} onChange={(e) => setForm({ ...form, dateFloored: e.target.value })} /></div>
            <div className="space-y-1"><Label>Curtailment date</Label><Input type="date" value={form.curtailmentDate} onChange={(e) => setForm({ ...form, curtailmentDate: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setFloorOpen(false)}>Cancel</Button><Button onClick={saveFloor}>Floor vehicle</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!paying} onOpenChange={(o) => !o && setPaying(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Mark paid off?</AlertDialogTitle><AlertDialogDescription>{paying ? `${money(paying.data.amount)} with ${paying.data.lender}, est. interest ${money(Math.round(interest(paying.data)))} as of today. Interest stops accruing in this estimate.` : ""}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={payOff}>Paid off</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!lineDelete} onOpenChange={(o) => !o && setLineDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remove {lineDelete?.data.lender}?</AlertDialogTitle><AlertDialogDescription>Floored vehicles on this lender keep their records but won't roll up to a credit line.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={deleteLine}>Remove</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
