import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Plus, Loader2, PackagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCollection, fullName, money, fmtDate, logActivity } from "@/lib/store";
import { useInventory, upsertVehicle, vTitle } from "@/lib/inventory";
import { useRecords, addRecord, updateRecord, removeRecord, type Rec } from "@/lib/records";
import { useAuth } from "@/lib/auth";
import { getTenantId } from "@/lib/tenant";

type Condition = "excellent" | "good" | "fair" | "poor";
type Status = "pending" | "won" | "lost";
export interface Appraisal {
  vin: string; year: number; make: string; model: string; trim: string; mileage: number; condition: Condition;
  reconEstimate: number; bookValue: number | null; acv: number; offer: number;
  customerId?: string; vehicleId?: string; status: Status; notes: string; appraisedBy?: string; inventoryVehicleId?: string;
}
const CONDITIONS: { key: Condition; label: string }[] = [{ key: "excellent", label: "Excellent" }, { key: "good", label: "Good" }, { key: "fair", label: "Fair" }, { key: "poor", label: "Poor" }];
const STATUS_CLS: Record<Status, string> = { pending: "bg-amber-100 text-amber-800", won: "bg-emerald-100 text-emerald-800", lost: "bg-muted text-muted-foreground" };
const blank = { vin: "", year: "", make: "", model: "", trim: "", mileage: "", condition: "good" as Condition, reconEstimate: "", bookValue: "", acv: "", offer: "", customerId: "", vehicleId: "", notes: "" };

export default function Appraisals() {
  const { user } = useAuth();
  const appraisals = useRecords<Appraisal>("appraisal");
  const customers = useCollection("customers");
  const inventory = useInventory();
  const [open, setOpen] = useState(false);
  const [decoding, setDecoding] = useState(false);
  const [form, setForm] = useState({ ...blank });
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [stockFor, setStockFor] = useState<Rec<Appraisal> | null>(null);
  const [stockNumber, setStockNumber] = useState("");
  const [toDelete, setToDelete] = useState<Rec<Appraisal> | null>(null);
  const set = (k: keyof typeof blank) => (e: any) => setForm({ ...form, [k]: typeof e === "string" ? e : e.target.value });

  const rows = useMemo(() => appraisals.filter((a) => filter === "all" || a.data.status === filter), [appraisals, filter]);
  const counts = useMemo(() => ({ pending: appraisals.filter((a) => a.data.status === "pending").length, won: appraisals.filter((a) => a.data.status === "won").length, lost: appraisals.filter((a) => a.data.status === "lost").length }), [appraisals]);

  const decodeVin = async () => {
    const vin = form.vin.trim().toUpperCase();
    if (vin.length !== 17) return toast.error("VIN must be 17 characters");
    setDecoding(true);
    try {
      const r = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`);
      const d = (await r.json()).Results?.[0] || {};
      setForm((f) => ({ ...f, vin, year: d.ModelYear || f.year, make: d.Make ? d.Make.replace(/\b\w+/g, (w: string) => w[0] + w.slice(1).toLowerCase()) : f.make, model: d.Model || f.model, trim: d.Trim || f.trim }));
      toast.success("VIN decoded");
    } catch { toast.error("VIN decode failed (offline?)"); } finally { setDecoding(false); }
  };

  const save = async () => {
    if (!form.make.trim() || !form.model.trim() || !form.year) return toast.error("Year, make and model are required");
    if (!form.acv) return toast.error("Enter the ACV");
    const data: Appraisal = {
      vin: form.vin.trim().toUpperCase(), year: Number(form.year), make: form.make.trim(), model: form.model.trim(), trim: form.trim.trim(), mileage: Number(form.mileage) || 0,
      condition: form.condition, reconEstimate: Number(form.reconEstimate) || 0, bookValue: form.bookValue ? Number(form.bookValue) : null, acv: Number(form.acv), offer: Number(form.offer) || Number(form.acv),
      customerId: form.customerId || undefined, vehicleId: form.vehicleId || undefined, status: "pending", notes: form.notes, appraisedBy: user?.id,
    };
    try {
      const rec = await addRecord<Appraisal>("appraisal", data, user?.id);
      logActivity("create", "appraisal", rec.id, `${data.year} ${data.make} ${data.model} ACV ${money(data.acv)}`, user?.id);
      toast.success("Appraisal saved"); setOpen(false); setForm({ ...blank });
    } catch (e: any) { toast.error(e.message || "Could not save"); }
  };

  const setStatus = (a: Rec<Appraisal>, status: Status) => updateRecord<Appraisal>("appraisal", a.id, { status }).then(() => logActivity("status", "appraisal", a.id, status, user?.id)).catch((e) => toast.error(e.message));
  const del = async () => {
    if (!toDelete) return;
    try { await removeRecord("appraisal", toDelete.id); toast.success("Deleted"); } catch (e: any) { toast.error(e.message); } finally { setToDelete(null); }
  };

  const addToInventory = async () => {
    if (!stockFor) return;
    const a = stockFor.data;
    if (!stockNumber.trim()) return toast.error("Stock number is required");
    if (inventory.some((v) => v.stockNumber.toLowerCase() === stockNumber.trim().toLowerCase())) return toast.error("Stock number already exists");
    try {
      const v = await upsertVehicle({
        id: `new-${Date.now().toString(36)}`, tenantId: getTenantId(), stockNumber: stockNumber.trim(), vin: a.vin, year: a.year, make: a.make, model: a.model, trim: a.trim, mileage: a.mileage,
        price: null, cost: a.acv + a.reconEstimate, images: [], features: [], status: "Pending", source: "trade", addedAt: new Date().toISOString(), description: a.notes || null,
      });
      await updateRecord<Appraisal>("appraisal", stockFor.id, { inventoryVehicleId: v.id });
      logActivity("create", "vehicle", v.id, `From trade appraisal ${stockFor.id}`, user?.id);
      toast.success(`Added to inventory as #${v.stockNumber}`); setStockFor(null); setStockNumber("");
    } catch (e: any) { toast.error(e.message || "Could not add vehicle"); }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Trade Appraisals</h1><p className="text-muted-foreground">{counts.pending} pending · {counts.won} won · {counts.lost} lost</p></div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> New appraisal</Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "pending", "won", "lost"] as const).map((s) => <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)} className="capitalize">{s}</Button>)}
      </div>

      {rows.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No appraisals yet. Click <b>New appraisal</b>, enter the VIN and decode it, then record your ACV and offer. Won trades can be pushed straight into inventory.</CardContent></Card>
      ) : (
        <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="text-left p-3">Vehicle</th><th className="text-left p-3">Customer</th><th className="text-right p-3">Miles</th><th className="text-left p-3">Cond.</th><th className="text-right p-3">Book</th><th className="text-right p-3">Recon</th><th className="text-right p-3">ACV</th><th className="text-right p-3">Offer</th><th className="text-left p-3">Status</th><th className="p-3"></th></tr></thead>
          <tbody>{rows.map((a) => {
            const c = customers.find((x) => x.id === a.data.customerId);
            return (
              <tr key={a.id} className="border-t align-top">
                <td className="p-3"><p className="font-semibold">{a.data.year} {a.data.make} {a.data.model} {a.data.trim}</p><p className="text-xs text-muted-foreground font-mono">{a.data.vin || "no VIN"} · {fmtDate(a.createdAt)}</p></td>
                <td className="p-3">{c ? <Link to={`/customers/${c.id}`} className="hover:underline">{fullName(c)}</Link> : "—"}</td>
                <td className="p-3 text-right">{a.data.mileage.toLocaleString()}</td>
                <td className="p-3 capitalize">{a.data.condition}</td>
                <td className="p-3 text-right">{a.data.bookValue == null ? "—" : money(a.data.bookValue)}</td>
                <td className="p-3 text-right">{money(a.data.reconEstimate)}</td>
                <td className="p-3 text-right font-semibold">{money(a.data.acv)}</td>
                <td className="p-3 text-right">{money(a.data.offer)}</td>
                <td className="p-3"><Select value={a.data.status} onValueChange={(s) => setStatus(a, s as Status)}><SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="won">Won</SelectItem><SelectItem value="lost">Lost</SelectItem></SelectContent></Select></td>
                <td className="p-3 whitespace-nowrap">
                  {a.data.status === "won" && (a.data.inventoryVehicleId ? <Badge className={STATUS_CLS.won}>In stock</Badge> : <Button size="sm" variant="outline" onClick={() => { setStockFor(a); setStockNumber(a.data.vin ? `T${a.data.vin.slice(-6)}` : ""); }}><PackagePlus className="h-4 w-4 mr-1" /> Add to inventory</Button>)}
                  <Button size="icon" variant="ghost" className="ml-1" onClick={() => setToDelete(a)}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            );
          })}</tbody>
        </table></CardContent></Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New trade appraisal</DialogTitle><DialogDescription>Decode the VIN, note condition and recon, then set your ACV and the offer to the customer.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="space-y-1 col-span-2"><Label>VIN</Label><div className="flex gap-2"><Input value={form.vin} onChange={set("vin")} maxLength={17} className="font-mono uppercase" /><Button variant="outline" onClick={decodeVin} disabled={decoding}>{decoding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Decode"}</Button></div></div>
            <div className="space-y-1"><Label>Year *</Label><Input type="number" value={form.year} onChange={set("year")} /></div>
            <div className="space-y-1"><Label>Make *</Label><Input value={form.make} onChange={set("make")} /></div>
            <div className="space-y-1"><Label>Model *</Label><Input value={form.model} onChange={set("model")} /></div>
            <div className="space-y-1"><Label>Trim</Label><Input value={form.trim} onChange={set("trim")} /></div>
            <div className="space-y-1"><Label>Mileage</Label><Input type="number" value={form.mileage} onChange={set("mileage")} /></div>
            <div className="space-y-1"><Label>Condition</Label><Select value={form.condition} onValueChange={set("condition")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONDITIONS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Recon estimate ($)</Label><Input type="number" value={form.reconEstimate} onChange={set("reconEstimate")} /></div>
            <div className="space-y-1"><Label>Book value ($)</Label><Input type="number" value={form.bookValue} onChange={set("bookValue")} placeholder="Manual" /></div>
            <div className="space-y-1"><Label>ACV ($) *</Label><Input type="number" value={form.acv} onChange={set("acv")} /></div>
            <div className="space-y-1"><Label>Offer to customer ($)</Label><Input type="number" value={form.offer} onChange={set("offer")} placeholder={form.acv || "Defaults to ACV"} /></div>
            <div className="space-y-1 col-span-2 md:col-span-3"><Label>Customer</Label>
              <Select value={form.customerId || "none"} onValueChange={(v) => setForm({ ...form, customerId: v === "none" ? "" : v })}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{fullName(c)}{c.phone ? ` · ${c.phone}` : ""}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1 col-span-2 md:col-span-3"><Label>Vehicle they're buying</Label>
              <Select value={form.vehicleId || "none"} onValueChange={(v) => setForm({ ...form, vehicleId: v === "none" ? "" : v })}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{inventory.filter((v) => v.status === "Available").map((v) => <SelectItem key={v.id} value={v.id}>{vTitle(v)} · #{v.stockNumber}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1 col-span-2 md:col-span-3"><Label>Notes (damage, tires, options)</Label><Textarea rows={3} value={form.notes} onChange={set("notes")} /></div>
          </div>
          <p className="text-xs text-muted-foreground">Book values are entered manually. Connect MarketCheck/KBB in Settings → Connections for automatic book values.</p>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save appraisal</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete appraisal?</AlertDialogTitle><AlertDialogDescription>This removes the appraisal permanently. Any vehicle already added to inventory is kept.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={del}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!stockFor} onOpenChange={(o) => !o && setStockFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add trade to inventory</DialogTitle><DialogDescription>{stockFor ? `${stockFor.data.year} ${stockFor.data.make} ${stockFor.data.model} — cost will be ACV + recon (${money((stockFor.data.acv || 0) + (stockFor.data.reconEstimate || 0))}). Status starts as Pending.` : ""}</DialogDescription></DialogHeader>
          <div className="space-y-1"><Label>Stock #</Label><Input value={stockNumber} onChange={(e) => setStockNumber(e.target.value)} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setStockFor(null)}>Cancel</Button><Button onClick={addToInventory}>Add vehicle</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
