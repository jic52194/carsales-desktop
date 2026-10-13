import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, ChevronLeft, ChevronRight, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useInventory, upsertVehicle, getVehicle, vTitle } from "@/lib/inventory";
import { useRecords, addRecord, updateRecord, removeRecord, type Rec } from "@/lib/records";
import { useAuth, useUsers } from "@/lib/auth";
import { logActivity, money, fmtDate } from "@/lib/store";

export type ReconStage = "intake" | "mechanical" | "body" | "detail" | "photos" | "frontline";
export interface ReconItem { label: string; done: boolean }
export interface Recon { vehicleId: string; stage: ReconStage; assignedTo?: string; estCost: number | null; actualCost: number | null; notes: string; items: ReconItem[]; startedAt: string; completedAt?: string }

const STAGES: { key: ReconStage; label: string }[] = [
  { key: "intake", label: "Intake" }, { key: "mechanical", label: "Mechanical" }, { key: "body", label: "Body & Paint" },
  { key: "detail", label: "Detail" }, { key: "photos", label: "Photos" }, { key: "frontline", label: "Frontline" },
];
const DEFAULT_ITEMS = ["Safety inspection", "Oil change / fluids", "Tires & brakes", "Body / PDR", "Interior detail", "Exterior detail", "Photos taken"];

export default function Recon() {
  const { user, hasPermission } = useAuth();
  const users = useUsers();
  const canEdit = hasPermission(["manager", "inventory", "service", "technician", "porter"]);
  const inventory = useInventory();
  const recs = useRecords<Recon>("recon");
  const [addOpen, setAddOpen] = useState(false);
  const [pickId, setPickId] = useState("");
  const [editing, setEditing] = useState<Rec<Recon> | null>(null);
  const [form, setForm] = useState({ assignedTo: "", estCost: "", actualCost: "", notes: "", items: [] as ReconItem[] });
  const [toDelete, setToDelete] = useState<Rec<Recon> | null>(null);

  const active = useMemo(() => recs.filter((r) => !r.data.completedAt), [recs]);
  const candidates = useMemo(() => { const inRecon = new Set(active.map((r) => r.data.vehicleId)); return inventory.filter((v) => v.status !== "Sold" && !inRecon.has(v.id)); }, [inventory, active]);
  const who = (id?: string) => users.find((u) => u.id === id)?.fullName;
  const totals = useMemo(() => ({ est: active.reduce((a, r) => a + (r.data.estCost ?? 0), 0), actual: active.reduce((a, r) => a + (r.data.actualCost ?? 0), 0) }), [active]);

  const startRecon = async () => {
    const v = getVehicle(pickId);
    if (!v) return toast.error("Pick a vehicle");
    try {
      await addRecord<Recon>("recon", { vehicleId: v.id, stage: "intake", estCost: null, actualCost: null, notes: "", items: DEFAULT_ITEMS.map((label) => ({ label, done: false })), startedAt: new Date().toISOString() }, user?.id);
      if (v.status !== "Recon") await upsertVehicle({ ...v, status: "Recon" });
      logActivity("recon_start", "vehicle", v.id, vTitle(v), user?.id);
      toast.success(`${vTitle(v)} entered recon`); setAddOpen(false); setPickId("");
    } catch (e: any) { toast.error(e.message || "Could not start recon"); }
  };

  const move = async (r: Rec<Recon>, dir: 1 | -1) => {
    const i = STAGES.findIndex((s) => s.key === r.data.stage); const next = STAGES[i + dir];
    if (!next) return;
    try {
      await updateRecord<Recon>("recon", r.id, { stage: next.key });
      const v = getVehicle(r.data.vehicleId);
      if (v) {
        if (next.key === "frontline" && v.status === "Recon") await upsertVehicle({ ...v, status: "Available" });
        else if (next.key !== "frontline" && v.status === "Available") await upsertVehicle({ ...v, status: "Recon" });
      }
      logActivity("recon_move", "vehicle", r.data.vehicleId, `→ ${next.label}`, user?.id);
    } catch (e: any) { toast.error(e.message || "Could not move"); }
  };

  const complete = async (r: Rec<Recon>) => {
    try { await updateRecord<Recon>("recon", r.id, { completedAt: new Date().toISOString() }); toast.success("Recon closed"); }
    catch (e: any) { toast.error(e.message || "Could not close"); }
  };

  const openEdit = (r: Rec<Recon>) => { setEditing(r); setForm({ assignedTo: r.data.assignedTo ?? "", estCost: r.data.estCost != null ? String(r.data.estCost) : "", actualCost: r.data.actualCost != null ? String(r.data.actualCost) : "", notes: r.data.notes, items: r.data.items.map((i) => ({ ...i })) }); };
  const saveEdit = async () => {
    if (!editing) return;
    try {
      await updateRecord<Recon>("recon", editing.id, { assignedTo: form.assignedTo || undefined, estCost: form.estCost === "" ? null : Number(form.estCost), actualCost: form.actualCost === "" ? null : Number(form.actualCost), notes: form.notes, items: form.items.filter((i) => i.label.trim()) });
      toast.success("Saved"); setEditing(null);
    } catch (e: any) { toast.error(e.message || "Could not save"); }
  };
  const confirmDelete = async () => {
    if (!toDelete) return;
    try { await removeRecord("recon", toDelete.id); toast.success("Removed from board"); setToDelete(null); } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Reconditioning</h1><p className="text-muted-foreground">{active.length} unit{active.length === 1 ? "" : "s"} in recon · est. {money(totals.est)} · actual {money(totals.actual)}</p></div>
        {canEdit && <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" /> Start recon</Button>}
      </div>

      {active.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground"><Wrench className="h-8 w-8 mx-auto mb-2 opacity-40" />Nothing in recon. Start recon on a unit to track it from intake to frontline.{inventory.length === 0 && " Add vehicles in Inventory first."}</CardContent></Card>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0"><div className="grid grid-flow-col auto-cols-[260px] md:auto-cols-fr gap-3 min-w-max md:min-w-0">
          {STAGES.map((s, si) => { const col = active.filter((r) => r.data.stage === s.key); return (
            <div key={s.key} className="space-y-2">
              <div className="flex items-center justify-between px-1"><h3 className="font-bold text-sm uppercase">{s.label}</h3><Badge variant="secondary">{col.length}</Badge></div>
              {col.length === 0 && <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">Empty</div>}
              {col.map((r) => { const v = getVehicle(r.data.vehicleId); const done = r.data.items.filter((i) => i.done).length; return (
                <Card key={r.id} className="cursor-pointer hover:shadow-md" onClick={() => canEdit && openEdit(r)}>
                  <CardContent className="p-3 space-y-1">
                    <p className="font-semibold text-sm leading-tight">{v ? <Link to={`/inventory/${v.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline">{vTitle(v)}</Link> : "Vehicle removed"}</p>
                    <p className="text-xs text-muted-foreground">#{v?.stockNumber ?? "—"} · since {fmtDate(r.data.startedAt)}</p>
                    <p className="text-xs">{done}/{r.data.items.length} items{r.data.estCost != null ? ` · est ${money(r.data.estCost)}` : ""}{r.data.actualCost != null ? ` · actual ${money(r.data.actualCost)}` : ""}</p>
                    {who(r.data.assignedTo) && <p className="text-xs text-muted-foreground">{who(r.data.assignedTo)}</p>}
                    {canEdit && <div className="flex gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" className="h-7 px-2" disabled={si === 0} onClick={() => move(r, -1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                      {si < STAGES.length - 1 ? <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => move(r, 1)}><ChevronRight className="h-3.5 w-3.5" /></Button> : <Button size="sm" className="h-7 px-2 text-xs" onClick={() => complete(r)}>Close</Button>}
                    </div>}
                  </CardContent>
                </Card>
              ); })}
            </div>
          ); })}
        </div></div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Start recon</DialogTitle><DialogDescription>Pick a unit; its status becomes Recon until it reaches Frontline.</DialogDescription></DialogHeader>
          {candidates.length === 0 ? <p className="text-sm text-muted-foreground">Every unsold vehicle is already on the board.</p> : (
            <Select value={pickId} onValueChange={setPickId}><SelectTrigger><SelectValue placeholder="Choose a vehicle" /></SelectTrigger><SelectContent>{candidates.map((v) => <SelectItem key={v.id} value={v.id}>#{v.stockNumber} · {vTitle(v)}</SelectItem>)}</SelectContent></Select>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={startRecon} disabled={!pickId}>Start</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing && getVehicle(editing.data.vehicleId) ? vTitle(getVehicle(editing.data.vehicleId)!) : "Recon"}</DialogTitle><DialogDescription>Stage: {STAGES.find((s) => s.key === editing?.data.stage)?.label}</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2"><Label>Assigned to</Label><Select value={form.assignedTo || "none"} onValueChange={(v) => setForm({ ...form, assignedTo: v === "none" ? "" : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Unassigned</SelectItem>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Estimated cost</Label><Input type="number" value={form.estCost} onChange={(e) => setForm({ ...form, estCost: e.target.value })} /></div>
            <div className="space-y-1"><Label>Actual cost</Label><Input type="number" value={form.actualCost} onChange={(e) => setForm({ ...form, actualCost: e.target.value })} /></div>
            <div className="space-y-2 col-span-2"><Label>Checklist</Label>
              {form.items.map((it, i) => <div key={i} className="flex items-center gap-2"><Checkbox checked={it.done} onCheckedChange={(c) => setForm({ ...form, items: form.items.map((x, j) => (j === i ? { ...x, done: !!c } : x)) })} /><Input className="h-8" value={it.label} onChange={(e) => setForm({ ...form, items: form.items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} /><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setForm({ ...form, items: form.items.filter((_, j) => j !== i) })}><Trash2 className="h-3.5 w-3.5" /></Button></div>)}
              <Button size="sm" variant="outline" onClick={() => setForm({ ...form, items: [...form.items, { label: "", done: false }] })}><Plus className="h-3.5 w-3.5 mr-1" /> Item</Button>
            </div>
            <div className="space-y-1 col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter className="flex-row justify-between sm:justify-between">
            <Button variant="ghost" className="text-destructive" onClick={() => { setToDelete(editing); setEditing(null); }}><Trash2 className="h-4 w-4 mr-1" /> Remove</Button>
            <div className="flex gap-2"><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={saveEdit}>Save</Button></div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remove from recon board?</AlertDialogTitle><AlertDialogDescription>The recon record (costs, checklist, notes) is deleted. The vehicle's status is not changed.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete}>Remove</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
