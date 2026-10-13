import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Search, MapPin, KeyRound, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useInventory, getVehicle, vTitle } from "@/lib/inventory";
import { useRecords, addRecord, updateRecord, removeRecord, type Rec } from "@/lib/records";
import { useAuth } from "@/lib/auth";
import { logActivity } from "@/lib/store";

export interface LotSpot { label: string; zone: string; vehicleId: string | null; keyTag: string }

export default function LotManagement() {
  const { user, hasPermission } = useAuth();
  const canEdit = hasPermission(["manager", "inventory", "porter", "sales"]);
  const inventory = useInventory();
  const spots = useRecords<LotSpot>("lot_spot");
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ zone: "", prefix: "", from: "1", to: "10" });
  const [editing, setEditing] = useState<Rec<LotSpot> | null>(null);
  const [editForm, setEditForm] = useState({ vehicleId: "", keyTag: "" });
  const [toDelete, setToDelete] = useState<Rec<LotSpot> | null>(null);

  const onLot = useMemo(() => inventory.filter((v) => v.status !== "Sold"), [inventory]);
  const assigned = useMemo(() => new Set(spots.map((s) => s.data.vehicleId).filter(Boolean)), [spots]);
  const unassigned = useMemo(() => onLot.filter((v) => !assigned.has(v.id)), [onLot, assigned]);
  const zones = useMemo(() => {
    const m = new Map<string, Rec<LotSpot>[]>();
    for (const s of spots) { const z = s.data.zone || "Lot"; if (!m.has(z)) m.set(z, []); m.get(z)!.push(s); }
    for (const list of m.values()) list.sort((a, b) => a.data.label.localeCompare(b.data.label, undefined, { numeric: true }));
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [spots]);

  // Find: matches vehicle title/stock/VIN or key tag → highlights the spot
  const s = q.trim().toLowerCase();
  const hit = (sp: Rec<LotSpot>) => {
    if (!s) return false;
    const v = sp.data.vehicleId ? getVehicle(sp.data.vehicleId) : undefined;
    return sp.data.keyTag.toLowerCase() === s || sp.data.label.toLowerCase() === s || (!!v && `${vTitle(v)} ${v.stockNumber} ${v.vin}`.toLowerCase().includes(s));
  };
  const found = spots.filter(hit);

  const addSpots = async () => {
    const from = Number(addForm.from), to = Number(addForm.to);
    if (!addForm.zone.trim()) return toast.error("Zone name is required");
    if (!from || !to || to < from || to - from > 199) return toast.error("Enter a range of up to 200 spots");
    const existing = new Set(spots.map((x) => `${x.data.zone}|${x.data.label}`));
    let n = 0;
    try {
      for (let i = from; i <= to; i++) {
        const label = `${addForm.prefix.trim()}${i}`;
        if (existing.has(`${addForm.zone.trim()}|${label}`)) continue;
        await addRecord<LotSpot>("lot_spot", { label, zone: addForm.zone.trim(), vehicleId: null, keyTag: "" }, user?.id); n++;
      }
      toast.success(`${n} spot${n === 1 ? "" : "s"} added`); setAddOpen(false);
    } catch (e: any) { toast.error(`${e.message || "Failed"} (${n} added)`); }
  };

  const openSpot = (sp: Rec<LotSpot>) => { setEditing(sp); setEditForm({ vehicleId: sp.data.vehicleId ?? "", keyTag: sp.data.keyTag }); };
  const saveSpot = async () => {
    if (!editing) return;
    const vid = editForm.vehicleId || null;
    try {
      // one spot per vehicle: clear it from any other spot first
      if (vid) for (const other of spots) if (other.id !== editing.id && other.data.vehicleId === vid) await updateRecord<LotSpot>("lot_spot", other.id, { vehicleId: null });
      await updateRecord<LotSpot>("lot_spot", editing.id, { vehicleId: vid, keyTag: editForm.keyTag.trim() });
      if (vid !== editing.data.vehicleId) logActivity(vid ? "lot_assign" : "lot_unassign", "vehicle", vid ?? editing.data.vehicleId ?? undefined, `${editing.data.zone} ${editing.data.label}`, user?.id);
      toast.success("Spot updated"); setEditing(null);
    } catch (e: any) { toast.error(e.message || "Could not save"); }
  };
  const confirmDelete = async () => { if (!toDelete) return; try { await removeRecord("lot_spot", toDelete.id); toast.success("Spot removed"); setToDelete(null); } catch (e: any) { toast.error(e.message); } };

  const vehicleOptions = editing ? onLot.filter((v) => !assigned.has(v.id) || v.id === editing.data.vehicleId) : [];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Lot Management</h1><p className="text-muted-foreground">{spots.length} spots · {assigned.size} occupied · {unassigned.length} vehicle{unassigned.length === 1 ? "" : "s"} without a spot</p></div>
        {canEdit && <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add spots</Button>}
      </div>

      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Find a vehicle, stock #, VIN or key tag" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {s && <p className="text-sm text-muted-foreground">{found.length === 0 ? "Not on any spot." : found.map((f) => { const v = f.data.vehicleId ? getVehicle(f.data.vehicleId) : undefined; return `${v ? vTitle(v) : f.data.label} → ${f.data.zone} ${f.data.label}${f.data.keyTag ? ` (key ${f.data.keyTag})` : ""}`; }).join(" · ")}</p>}

      {spots.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground"><MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />No lot map yet. Add spots by zone (e.g. "Front line" A1–A20) and assign vehicles to them.</CardContent></Card>
      ) : zones.map(([zone, list]) => (
        <div key={zone} className="space-y-2">
          <h3 className="font-bold text-sm uppercase">{zone} <span className="font-normal text-muted-foreground">· {list.filter((x) => x.data.vehicleId).length}/{list.length}</span></h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {list.map((sp) => { const v = sp.data.vehicleId ? getVehicle(sp.data.vehicleId) : undefined; const h = hit(sp); return (
              <button key={sp.id} onClick={() => canEdit && openSpot(sp)} className={`rounded-md border p-2 text-left min-h-[72px] transition-colors ${h ? "ring-2 ring-primary" : ""} ${v ? "bg-primary/10 border-primary/30" : "bg-muted/30 border-dashed"}`}>
                <div className="flex items-center justify-between"><span className="font-mono text-xs font-bold">{sp.data.label}</span>{sp.data.keyTag && <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5"><KeyRound className="h-3 w-3" />{sp.data.keyTag}</span>}</div>
                {v ? <p className="text-xs leading-tight mt-1 line-clamp-2">{v.year} {v.make} {v.model}<br /><span className="text-muted-foreground">#{v.stockNumber}</span></p> : <p className="text-xs text-muted-foreground mt-1">Open</p>}
              </button>
            ); })}
          </div>
        </div>
      ))}

      {unassigned.length > 0 && spots.length > 0 && (
        <Card><CardContent className="p-4">
          <h3 className="font-bold text-sm uppercase mb-2">Vehicles without a spot ({unassigned.length})</h3>
          <div className="flex flex-wrap gap-2">{unassigned.map((v) => <Badge key={v.id} variant="outline" className="font-normal"><Link to={`/inventory/${v.id}`} className="hover:underline">#{v.stockNumber} {vTitle(v)}</Link></Badge>)}</div>
        </CardContent></Card>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add spots</DialogTitle><DialogDescription>Creates a numbered run of spots in a zone, e.g. zone "Front line", prefix "A", 1–20.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2"><Label>Zone</Label><Input value={addForm.zone} onChange={(e) => setAddForm({ ...addForm, zone: e.target.value })} placeholder="Front line, Back lot, Service…" /></div>
            <div className="space-y-1 col-span-2"><Label>Label prefix</Label><Input value={addForm.prefix} onChange={(e) => setAddForm({ ...addForm, prefix: e.target.value })} placeholder="A" /></div>
            <div className="space-y-1"><Label>From</Label><Input type="number" value={addForm.from} onChange={(e) => setAddForm({ ...addForm, from: e.target.value })} /></div>
            <div className="space-y-1"><Label>To</Label><Input type="number" value={addForm.to} onChange={(e) => setAddForm({ ...addForm, to: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={addSpots}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing?.data.zone} · {editing?.data.label}</DialogTitle><DialogDescription>Assign a vehicle and record its key tag number.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Vehicle</Label><div className="flex gap-2"><Select value={editForm.vehicleId || "none"} onValueChange={(v) => setEditForm({ ...editForm, vehicleId: v === "none" ? "" : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Empty spot</SelectItem>{vehicleOptions.map((v) => <SelectItem key={v.id} value={v.id}>#{v.stockNumber} · {vTitle(v)}</SelectItem>)}</SelectContent></Select>{editForm.vehicleId && <Button variant="outline" size="icon" onClick={() => setEditForm({ ...editForm, vehicleId: "" })} title="Unassign"><X className="h-4 w-4" /></Button>}</div></div>
            <div className="space-y-1"><Label>Key tag #</Label><Input value={editForm.keyTag} onChange={(e) => setEditForm({ ...editForm, keyTag: e.target.value })} /></div>
          </div>
          <DialogFooter className="flex-row justify-between sm:justify-between">
            <Button variant="ghost" className="text-destructive" onClick={() => { setToDelete(editing); setEditing(null); }}><Trash2 className="h-4 w-4 mr-1" /> Delete spot</Button>
            <div className="flex gap-2"><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={saveSpot}>Save</Button></div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete spot {toDelete?.data.label}?</AlertDialogTitle><AlertDialogDescription>The spot is removed from the lot map. Any vehicle on it becomes unassigned.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
