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
import { Plus, Truck, Undo2, Download } from "lucide-react";
import { toast } from "sonner";
import { downloadCsv, stamp } from "@/lib/csv";
import { useInventory, upsertVehicle, getVehicle, vTitle, vDaysInStock, type Vehicle } from "@/lib/inventory";
import { useRecords, addRecord, updateRecord, type Rec } from "@/lib/records";
import { useAuth } from "@/lib/auth";
import { logActivity, money, fmtDate } from "@/lib/store";

export interface Wholesale { vehicleId: string; buyer: string; buyerContact: string; offer: number | null; soldPrice: number | null; soldDate: string | null; status: "listed" | "sold"; notes: string }

export default function WholesalePage() {
  const { user, hasPermission } = useAuth();
  const canEdit = hasPermission(["manager", "inventory"]);
  const inventory = useInventory();
  const recs = useRecords<Wholesale>("wholesale");
  const [tab, setTab] = useState<"listed" | "sold">("listed");
  const [addOpen, setAddOpen] = useState(false);
  const [pickId, setPickId] = useState("");
  const [editing, setEditing] = useState<Rec<Wholesale> | null>(null);
  const [form, setForm] = useState({ buyer: "", buyerContact: "", offer: "", notes: "" });
  const [selling, setSelling] = useState<Rec<Wholesale> | null>(null);
  const [sale, setSale] = useState({ price: "", date: new Date().toISOString().slice(0, 10) });
  const [returning, setReturning] = useState<Vehicle | null>(null);

  // Listed = every Wholesale-status vehicle; it gets a record when a buyer/offer is captured or it's marked sold.
  const listed = useMemo(() => inventory.filter((v) => v.status === "Wholesale").map((v) => ({ v, rec: recs.find((r) => r.data.vehicleId === v.id && r.data.status === "listed") })), [inventory, recs]);
  const sold = useMemo(() => recs.filter((r) => r.data.status === "sold").sort((a, b) => (b.data.soldDate ?? "").localeCompare(a.data.soldDate ?? "")), [recs]);
  const candidates = useMemo(() => inventory.filter((v) => v.status !== "Sold" && v.status !== "Wholesale"), [inventory]);
  const totals = useMemo(() => ({ cost: listed.reduce((a, { v }) => a + (v.cost ?? 0), 0), soldRev: sold.reduce((a, r) => a + (r.data.soldPrice ?? 0), 0), soldGross: sold.reduce((a, r) => { const v = getVehicle(r.data.vehicleId); return a + (r.data.soldPrice != null && v?.cost != null ? r.data.soldPrice - v.cost : 0); }, 0) }), [listed, sold]);

  const addToWholesale = async () => {
    const v = getVehicle(pickId); if (!v) return toast.error("Pick a vehicle");
    try { await upsertVehicle({ ...v, status: "Wholesale" }); logActivity("mark_wholesale", "vehicle", v.id, vTitle(v), user?.id); toast.success(`${vTitle(v)} listed for wholesale`); setAddOpen(false); setPickId(""); }
    catch (e: any) { toast.error(e.message || "Could not update"); }
  };

  const openEdit = (v: Vehicle, rec?: Rec<Wholesale>) => { setEditing(rec ?? ({ id: "", kind: "wholesale", createdAt: "", updatedAt: "", data: { vehicleId: v.id, buyer: "", buyerContact: "", offer: null, soldPrice: null, soldDate: null, status: "listed", notes: "" } } as Rec<Wholesale>)); setForm({ buyer: rec?.data.buyer ?? "", buyerContact: rec?.data.buyerContact ?? "", offer: rec?.data.offer != null ? String(rec.data.offer) : "", notes: rec?.data.notes ?? "" }); };
  const saveEdit = async () => {
    if (!editing) return;
    const patch = { buyer: form.buyer.trim(), buyerContact: form.buyerContact.trim(), offer: form.offer === "" ? null : Number(form.offer), notes: form.notes };
    try {
      if (editing.id) await updateRecord<Wholesale>("wholesale", editing.id, patch);
      else await addRecord<Wholesale>("wholesale", { ...editing.data, ...patch }, user?.id);
      toast.success("Saved"); setEditing(null);
    } catch (e: any) { toast.error(e.message || "Could not save"); }
  };

  const openSell = (v: Vehicle, rec?: Rec<Wholesale>) => { setSelling(rec ?? ({ id: "", kind: "wholesale", createdAt: "", updatedAt: "", data: { vehicleId: v.id, buyer: "", buyerContact: "", offer: null, soldPrice: null, soldDate: null, status: "listed", notes: "" } } as Rec<Wholesale>)); setSale({ price: rec?.data.offer != null ? String(rec.data.offer) : "", date: new Date().toISOString().slice(0, 10) }); };
  const markSold = async () => {
    if (!selling) return; const v = getVehicle(selling.data.vehicleId); const price = Number(sale.price);
    if (!v) return toast.error("Vehicle not found"); if (!price) return toast.error("Enter the sold price");
    const patch = { soldPrice: price, soldDate: sale.date, status: "sold" as const, buyer: selling.data.buyer || form.buyer };
    try {
      if (selling.id) await updateRecord<Wholesale>("wholesale", selling.id, patch); else await addRecord<Wholesale>("wholesale", { ...selling.data, ...patch }, user?.id);
      await upsertVehicle({ ...v, status: "Sold" });
      logActivity("wholesale_sold", "vehicle", v.id, `${vTitle(v)} ${money(price)}${patch.buyer ? ` to ${patch.buyer}` : ""}`, user?.id);
      toast.success("Marked sold"); setSelling(null);
    } catch (e: any) { toast.error(e.message || "Could not mark sold"); }
  };
  const returnToRetail = async () => {
    if (!returning) return;
    try { await upsertVehicle({ ...returning, status: "Available" }); toast.success("Back in retail inventory"); setReturning(null); } catch (e: any) { toast.error(e.message); }
  };
  const exportCsv = () => downloadCsv(`wholesale-${stamp()}.csv`, tab === "listed" ? listed.map(({ v, rec }) => ({ stock: v.stockNumber, vehicle: vTitle(v), days: vDaysInStock(v), cost: v.cost ?? "", buyer: rec?.data.buyer ?? "", offer: rec?.data.offer ?? "" })) : sold.map((r) => { const v = getVehicle(r.data.vehicleId); return { stock: v?.stockNumber ?? "", vehicle: v ? vTitle(v) : r.data.vehicleId, buyer: r.data.buyer, sold: r.data.soldPrice ?? "", cost: v?.cost ?? "", date: r.data.soldDate ?? "" }; }));

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Wholesale</h1><p className="text-muted-foreground">{listed.length} listed ({money(totals.cost)} at cost) · {sold.length} sold for {money(totals.soldRev)}{sold.length ? ` · gross ${money(totals.soldGross)}` : ""}</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" /> CSV</Button>{canEdit && <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" /> Send to wholesale</Button>}</div>
      </div>

      <div className="flex gap-1">{(["listed", "sold"] as const).map((t) => <Button key={t} size="sm" variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)}>{t === "listed" ? `Listed (${listed.length})` : `Sold (${sold.length})`}</Button>)}</div>

      {tab === "listed" ? (listed.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground"><Truck className="h-8 w-8 mx-auto mb-2 opacity-40" />Nothing in wholesale. Send aged or off-brand units here from Aging Inventory or with the button above.</CardContent></Card>
      ) : (
        <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3 text-right">Days</th><th className="px-4 py-3 text-right">Cost</th><th className="px-4 py-3">Buyer</th><th className="px-4 py-3 text-right">Offer</th>{canEdit && <th className="px-4 py-3 text-right">Actions</th>}</tr></thead>
          <tbody className="divide-y">{listed.map(({ v, rec }) => (
            <tr key={v.id} className="hover:bg-muted/30">
              <td className="px-4 py-2 font-mono text-xs">{v.stockNumber}</td>
              <td className="px-4 py-2 font-semibold"><Link to={`/inventory/${v.id}`} className="hover:underline">{vTitle(v)}</Link><span className="block text-xs font-normal text-muted-foreground">{v.mileage.toLocaleString()} mi{rec?.data.notes ? ` · ${rec.data.notes}` : ""}</span></td>
              <td className="px-4 py-2 text-right"><Badge variant={vDaysInStock(v) > 60 ? "destructive" : "outline"}>{vDaysInStock(v)}d</Badge></td>
              <td className="px-4 py-2 text-right">{v.cost != null ? money(v.cost) : "—"}</td>
              <td className="px-4 py-2">{rec?.data.buyer || <span className="text-muted-foreground">—</span>}{rec?.data.buyerContact && <span className="block text-xs text-muted-foreground">{rec.data.buyerContact}</span>}</td>
              <td className="px-4 py-2 text-right font-semibold">{money(rec?.data.offer)}</td>
              {canEdit && <td className="px-4 py-2 text-right whitespace-nowrap"><Button size="sm" variant="ghost" onClick={() => openEdit(v, rec)}>Buyer</Button><Button size="sm" variant="ghost" onClick={() => openSell(v, rec)}>Mark sold</Button><Button size="sm" variant="ghost" title="Return to retail" onClick={() => setReturning(v)}><Undo2 className="h-3.5 w-3.5" /></Button></td>}
            </tr>
          ))}</tbody>
        </table></CardContent></Card>
      )) : (sold.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">No wholesale sales recorded yet.</CardContent></Card>
      ) : (
        <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Buyer</th><th className="px-4 py-3 text-right">Cost</th><th className="px-4 py-3 text-right">Sold</th><th className="px-4 py-3 text-right">Gross</th></tr></thead>
          <tbody className="divide-y">{sold.map((r) => { const v = getVehicle(r.data.vehicleId); const g = r.data.soldPrice != null && v?.cost != null ? r.data.soldPrice - v.cost : null; return (
            <tr key={r.id} className="hover:bg-muted/30">
              <td className="px-4 py-2">{fmtDate(r.data.soldDate ?? undefined)}</td>
              <td className="px-4 py-2 font-semibold">{v ? <Link to={`/inventory/${v.id}`} className="hover:underline">{vTitle(v)}</Link> : "Vehicle removed"}{v && <span className="block text-xs font-normal text-muted-foreground">#{v.stockNumber}</span>}</td>
              <td className="px-4 py-2">{r.data.buyer || "—"}</td>
              <td className="px-4 py-2 text-right">{v?.cost != null ? money(v.cost) : "—"}</td>
              <td className="px-4 py-2 text-right font-semibold">{money(r.data.soldPrice)}</td>
              <td className={`px-4 py-2 text-right ${g != null && g < 0 ? "text-destructive" : ""}`}>{g != null ? money(g) : "—"}</td>
            </tr>
          ); })}</tbody>
        </table></CardContent></Card>
      ))}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Send to wholesale</DialogTitle><DialogDescription>The unit's status becomes Wholesale and it leaves retail availability.</DialogDescription></DialogHeader>
          {candidates.length === 0 ? <p className="text-sm text-muted-foreground">No retail units available.</p> : <Select value={pickId} onValueChange={setPickId}><SelectTrigger><SelectValue placeholder="Choose a vehicle" /></SelectTrigger><SelectContent>{candidates.map((v) => <SelectItem key={v.id} value={v.id}>#{v.stockNumber} · {vTitle(v)} · {vDaysInStock(v)}d</SelectItem>)}</SelectContent></Select>}
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={addToWholesale} disabled={!pickId}>Send</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Buyer & offer</DialogTitle><DialogDescription>{editing && getVehicle(editing.data.vehicleId) ? vTitle(getVehicle(editing.data.vehicleId)!) : ""}</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2"><Label>Buyer</Label><Input value={form.buyer} onChange={(e) => setForm({ ...form, buyer: e.target.value })} placeholder="Dealer, wholesaler or auction" /></div>
            <div className="space-y-1"><Label>Contact</Label><Input value={form.buyerContact} onChange={(e) => setForm({ ...form, buyerContact: e.target.value })} /></div>
            <div className="space-y-1"><Label>Offer</Label><Input type="number" value={form.offer} onChange={(e) => setForm({ ...form, offer: e.target.value })} /></div>
            <div className="space-y-1 col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={saveEdit}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selling} onOpenChange={(o) => !o && setSelling(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Mark sold (wholesale)</DialogTitle><DialogDescription>Records the sale and sets the vehicle's status to Sold.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {!selling?.data.buyer && <div className="space-y-1 col-span-2"><Label>Buyer</Label><Input value={form.buyer} onChange={(e) => setForm({ ...form, buyer: e.target.value })} /></div>}
            <div className="space-y-1"><Label>Sold price</Label><Input type="number" value={sale.price} onChange={(e) => setSale({ ...sale, price: e.target.value })} autoFocus /></div>
            <div className="space-y-1"><Label>Date</Label><Input type="date" value={sale.date} onChange={(e) => setSale({ ...sale, date: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setSelling(null)}>Cancel</Button><Button onClick={markSold}>Mark sold</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!returning} onOpenChange={(o) => !o && setReturning(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Return to retail?</AlertDialogTitle><AlertDialogDescription>The vehicle's status goes back to Available. Any buyer/offer notes are kept.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={returnToRetail}>Return to retail</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
