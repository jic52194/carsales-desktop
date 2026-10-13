import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, ChevronLeft, ChevronRight, Trash2, PackagePlus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useInventory, upsertVehicle, getVehicle, vTitle } from "@/lib/inventory";
import { useRecords, addRecord, updateRecord, removeRecord, type Rec } from "@/lib/records";
import { useAuth } from "@/lib/auth";
import { getTenantId } from "@/lib/tenant";
import { logActivity, money } from "@/lib/store";

export type AcqSource = "private_party" | "auction" | "trade" | "service_lane" | "lease_return";
export type AcqStatus = "prospect" | "contacted" | "offered" | "bought" | "passed";
export interface Acquisition { source: AcqSource; year: string; make: string; model: string; vin: string; mileage: string; sellerName: string; sellerContact: string; asking: number | null; offer: number | null; status: AcqStatus; notes: string; vehicleId?: string }

const SOURCES: Record<AcqSource, string> = { private_party: "Private party", auction: "Auction", trade: "Trade-in", service_lane: "Service lane", lease_return: "Lease return" };
const STATUSES: { key: AcqStatus; label: string }[] = [{ key: "prospect", label: "Prospect" }, { key: "contacted", label: "Contacted" }, { key: "offered", label: "Offered" }, { key: "bought", label: "Bought" }, { key: "passed", label: "Passed" }];
const blank = { source: "private_party" as AcqSource, year: "", make: "", model: "", vin: "", mileage: "", sellerName: "", sellerContact: "", asking: "", offer: "", status: "prospect" as AcqStatus, notes: "" };

export default function Acquisition() {
  const { user, hasPermission } = useAuth();
  const canEdit = hasPermission(["manager", "inventory", "sales"]);
  const inventory = useInventory();
  const recs = useRecords<Acquisition>("acquisition");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Rec<Acquisition> | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [toDelete, setToDelete] = useState<Rec<Acquisition> | null>(null);
  const [toStock, setToStock] = useState<Rec<Acquisition> | null>(null);
  const [stockNumber, setStockNumber] = useState("");
  const set = (k: keyof typeof blank) => (e: any) => setForm({ ...form, [k]: typeof e === "string" ? e : e.target.value });

  const stats = useMemo(() => ({ open: recs.filter((r) => !["bought", "passed"].includes(r.data.status)).length, bought: recs.filter((r) => r.data.status === "bought").length, spend: recs.filter((r) => r.data.status === "bought").reduce((a, r) => a + (r.data.offer ?? 0), 0) }), [recs]);
  const title = (a: Acquisition) => `${a.year} ${a.make} ${a.model}`.trim() || "Untitled";

  const openNew = () => { setEditing(null); setForm({ ...blank }); setOpen(true); };
  const openEdit = (r: Rec<Acquisition>) => { setEditing(r); setForm({ ...r.data, asking: r.data.asking != null ? String(r.data.asking) : "", offer: r.data.offer != null ? String(r.data.offer) : "" }); setOpen(true); };
  const save = async () => {
    if (!form.make.trim() || !form.model.trim()) return toast.error("Make and model are required");
    const data: Acquisition = { ...form, year: form.year.trim(), make: form.make.trim(), model: form.model.trim(), vin: form.vin.trim().toUpperCase(), asking: form.asking === "" ? null : Number(form.asking), offer: form.offer === "" ? null : Number(form.offer), vehicleId: editing?.data.vehicleId };
    try {
      if (editing) await updateRecord<Acquisition>("acquisition", editing.id, data);
      else { const r = await addRecord<Acquisition>("acquisition", data, user?.id); logActivity("acquisition_add", "acquisition", r.id, title(data), user?.id); }
      toast.success(editing ? "Updated" : "Prospect added"); setOpen(false);
    } catch (e: any) { toast.error(e.message || "Could not save"); }
  };
  const move = async (r: Rec<Acquisition>, dir: 1 | -1) => {
    const flow: AcqStatus[] = ["prospect", "contacted", "offered", "bought"];
    const i = flow.indexOf(r.data.status); const next = flow[i + dir];
    if (i < 0 || !next) return;
    try { await updateRecord<Acquisition>("acquisition", r.id, { status: next }); } catch (e: any) { toast.error(e.message); }
  };
  const pass = async (r: Rec<Acquisition>) => { try { await updateRecord<Acquisition>("acquisition", r.id, { status: "passed" }); } catch (e: any) { toast.error(e.message); } };
  const confirmDelete = async () => { if (!toDelete) return; try { await removeRecord("acquisition", toDelete.id); toast.success("Deleted"); setToDelete(null); } catch (e: any) { toast.error(e.message); } };

  const addToInventory = async () => {
    if (!toStock) return; const a = toStock.data;
    if (!stockNumber.trim()) return toast.error("Stock number is required");
    if (inventory.some((v) => v.stockNumber.toLowerCase() === stockNumber.trim().toLowerCase())) return toast.error("Stock number already exists");
    try {
      const saved = await upsertVehicle({ id: `new-${Date.now().toString(36)}`, tenantId: getTenantId(), stockNumber: stockNumber.trim(), vin: a.vin, year: Number(a.year) || new Date().getFullYear(), make: a.make, model: a.model, trim: "", mileage: Number(a.mileage) || 0, price: null, cost: a.offer, images: [], features: [], status: "Recon", source: `acquisition:${a.source}`, addedAt: new Date().toISOString() });
      await updateRecord<Acquisition>("acquisition", toStock.id, { vehicleId: saved.id, status: "bought" });
      logActivity("acquisition_stocked", "vehicle", saved.id, `${vTitle(saved)} from ${SOURCES[a.source]}`, user?.id);
      toast.success(`${vTitle(saved)} added to inventory (Recon)`); setToStock(null); setStockNumber("");
    } catch (e: any) { toast.error(e.message || "Could not add"); }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Acquisition</h1><p className="text-muted-foreground">{stats.open} open prospect{stats.open === 1 ? "" : "s"} · {stats.bought} bought · {money(stats.spend)} spent</p></div>
        {canEdit && <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New prospect</Button>}
      </div>

      {recs.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground"><ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-40" />No acquisition prospects yet. Log cars you're chasing from private sellers, auctions, trades, the service lane or lease returns, and move them across the board as you work them.</CardContent></Card>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0"><div className="grid grid-flow-col auto-cols-[260px] md:auto-cols-fr gap-3 min-w-max md:min-w-0">
          {STATUSES.map((s) => { const col = recs.filter((r) => r.data.status === s.key); return (
            <div key={s.key} className="space-y-2">
              <div className="flex items-center justify-between px-1"><h3 className="font-bold text-sm uppercase">{s.label}</h3><Badge variant="secondary">{col.length}</Badge></div>
              {col.length === 0 && <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">Empty</div>}
              {col.map((r) => { const a = r.data; const v = a.vehicleId ? getVehicle(a.vehicleId) : undefined; return (
                <Card key={r.id} className="cursor-pointer hover:shadow-md" onClick={() => canEdit && openEdit(r)}>
                  <CardContent className="p-3 space-y-1">
                    <p className="font-semibold text-sm leading-tight">{title(a)}</p>
                    <p className="text-xs text-muted-foreground">{SOURCES[a.source]}{a.mileage ? ` · ${Number(a.mileage).toLocaleString()} mi` : ""}</p>
                    {a.sellerName && <p className="text-xs">{a.sellerName}{a.sellerContact ? ` · ${a.sellerContact}` : ""}</p>}
                    <p className="text-xs">Ask {money(a.asking)} · Offer <b>{money(a.offer)}</b></p>
                    {v && <p className="text-xs"><Link to={`/inventory/${v.id}`} onClick={(e) => e.stopPropagation()} className="underline">In stock #{v.stockNumber}</Link></p>}
                    {canEdit && <div className="flex flex-wrap gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
                      {s.key !== "passed" && s.key !== "prospect" && <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => move(r, -1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>}
                      {s.key !== "passed" && s.key !== "bought" && <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => move(r, 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>}
                      {s.key !== "passed" && s.key !== "bought" && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => pass(r)}>Pass</Button>}
                      {s.key === "bought" && !v && <Button size="sm" className="h-7 px-2 text-xs" onClick={() => { setToStock(r); setStockNumber(""); }}><PackagePlus className="h-3.5 w-3.5 mr-1" /> Add to inventory</Button>}
                    </div>}
                  </CardContent>
                </Card>
              ); })}
            </div>
          ); })}
        </div></div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit prospect" : "New prospect"}</DialogTitle><DialogDescription>A vehicle you're trying to buy.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="space-y-1 col-span-2 md:col-span-3"><Label>Source</Label><Select value={form.source} onValueChange={set("source")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(SOURCES) as AcqSource[]).map((k) => <SelectItem key={k} value={k}>{SOURCES[k]}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Year</Label><Input type="number" value={form.year} onChange={set("year")} /></div>
            <div className="space-y-1"><Label>Make *</Label><Input value={form.make} onChange={set("make")} /></div>
            <div className="space-y-1"><Label>Model *</Label><Input value={form.model} onChange={set("model")} /></div>
            <div className="space-y-1 col-span-2"><Label>VIN</Label><Input value={form.vin} onChange={set("vin")} maxLength={17} className="font-mono uppercase" /></div>
            <div className="space-y-1"><Label>Mileage</Label><Input type="number" value={form.mileage} onChange={set("mileage")} /></div>
            <div className="space-y-1"><Label>Seller</Label><Input value={form.sellerName} onChange={set("sellerName")} /></div>
            <div className="space-y-1 col-span-2"><Label>Seller contact</Label><Input value={form.sellerContact} onChange={set("sellerContact")} placeholder="Phone or email" /></div>
            <div className="space-y-1"><Label>Asking</Label><Input type="number" value={form.asking} onChange={set("asking")} /></div>
            <div className="space-y-1"><Label>Our offer</Label><Input type="number" value={form.offer} onChange={set("offer")} /></div>
            <div className="space-y-1"><Label>Status</Label><Select value={form.status} onValueChange={set("status")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1 col-span-2 md:col-span-3"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={set("notes")} /></div>
          </div>
          <DialogFooter className="flex-row justify-between sm:justify-between">
            {editing ? <Button variant="ghost" className="text-destructive" onClick={() => { setToDelete(editing); setOpen(false); }}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button> : <span />}
            <div className="flex gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!toStock} onOpenChange={(o) => !o && setToStock(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add to inventory</DialogTitle><DialogDescription>{toStock ? `${title(toStock.data)} enters inventory in Recon with cost ${money(toStock.data.offer)}. You can add photos, price and details on the vehicle page.` : ""}</DialogDescription></DialogHeader>
          <div className="space-y-1"><Label>Stock #</Label><Input value={stockNumber} onChange={(e) => setStockNumber(e.target.value)} autoFocus /></div>
          <DialogFooter><Button variant="outline" onClick={() => setToStock(null)}>Cancel</Button><Button onClick={addToInventory}>Add vehicle</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this prospect?</AlertDialogTitle><AlertDialogDescription>This can't be undone. A vehicle already added to inventory stays in inventory.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
