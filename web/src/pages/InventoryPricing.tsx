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
import { Search, Percent, History, Target, Download } from "lucide-react";
import { toast } from "sonner";
import { downloadCsv, stamp } from "@/lib/csv";
import { useInventory, upsertVehicle, vTitle, vDaysInStock, type Vehicle } from "@/lib/inventory";
import { useRecords, addRecord, updateRecord } from "@/lib/records";
import { useAuth, useUsers } from "@/lib/auth";
import { logActivity, money, fmtDateTime } from "@/lib/store";

export interface PriceChange { vehicleId: string; from: number | null; to: number; by?: string; at: string; source?: string }
export interface PricingNote { vehicleId: string; targetPrice: number | null; note: string }

const STATUSES = ["Available", "Pending", "Recon", "Hold"];

export default function InventoryPricing() {
  const { user, hasPermission } = useAuth();
  const users = useUsers();
  const canEdit = hasPermission(["manager", "inventory"]);
  const inventory = useInventory();
  const history = useRecords<PriceChange>("price_change");
  const notes = useRecords<PricingNote>("pricing_note");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("Available");
  const [minDays, setMinDays] = useState("");
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState({ price: "", cost: "", target: "", note: "" });
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPct, setBulkPct] = useState("");
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [historyFor, setHistoryFor] = useState<Vehicle | null>(null);

  const noteFor = (id: string) => notes.find((n) => n.data.vehicleId === id);
  const who = (id?: string) => users.find((u) => u.id === id)?.fullName ?? "—";

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase(); const d = Number(minDays) || 0;
    return inventory
      .filter((v) => (status === "all" ? v.status !== "Sold" : v.status === status) && vDaysInStock(v) >= d && (!s || `${vTitle(v)} ${v.stockNumber} ${v.vin}`.toLowerCase().includes(s)))
      .sort((a, b) => vDaysInStock(b) - vDaysInStock(a));
  }, [inventory, q, status, minDays]);

  const totals = useMemo(() => ({
    asking: rows.reduce((a, v) => a + (v.price ?? 0), 0), cost: rows.reduce((a, v) => a + (v.cost ?? 0), 0),
    gross: rows.reduce((a, v) => a + (v.price != null && v.cost != null ? v.price - v.cost : 0), 0),
    withCost: rows.filter((v) => v.cost != null).length,
  }), [rows]);

  const openEdit = (v: Vehicle) => { const n = noteFor(v.id); setEditing(v); setForm({ price: v.price != null ? String(v.price) : "", cost: v.cost != null ? String(v.cost) : "", target: n?.data.targetPrice != null ? String(n.data.targetPrice) : "", note: n?.data.note ?? "" }); };

  const changePrice = async (v: Vehicle, to: number, source: string) => {
    if (to === v.price) return;
    await upsertVehicle({ ...v, price: to });
    await addRecord<PriceChange>("price_change", { vehicleId: v.id, from: v.price, to, by: user?.id, at: new Date().toISOString(), source }, user?.id);
    logActivity("price_change", "vehicle", v.id, `${vTitle(v)}: ${money(v.price)} → ${money(to)}`, user?.id);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const price = form.price === "" ? null : Number(form.price); const cost = form.cost === "" ? null : Number(form.cost);
    if (price != null && price <= 0) return toast.error("Price must be positive");
    try {
      if (cost !== (editing.cost ?? null)) await upsertVehicle({ ...editing, cost });
      if (price != null && price !== editing.price) await changePrice({ ...editing, cost }, price, "pricing_desk");
      const target = form.target === "" ? null : Number(form.target);
      const existing = noteFor(editing.id);
      if (existing) await updateRecord<PricingNote>("pricing_note", existing.id, { targetPrice: target, note: form.note });
      else if (target != null || form.note.trim()) await addRecord<PricingNote>("pricing_note", { vehicleId: editing.id, targetPrice: target, note: form.note }, user?.id);
      toast.success("Pricing saved"); setEditing(null);
    } catch (e: any) { toast.error(e.message || "Could not save"); }
  };

  const bulkTargets = rows.filter((v) => v.price != null);
  const applyBulk = async () => {
    const pct = Number(bulkPct);
    if (!pct) return toast.error("Enter a non-zero percentage");
    setBulkConfirm(false);
    let n = 0;
    try {
      for (const v of bulkTargets) { await changePrice(v, Math.round((v.price as number) * (1 + pct / 100)), "bulk"); n++; }
      toast.success(`Adjusted ${n} price${n === 1 ? "" : "s"} by ${pct > 0 ? "+" : ""}${pct}%`); setBulkOpen(false); setBulkPct("");
    } catch (e: any) { toast.error(`${e.message || "Failed"} (${n} of ${bulkTargets.length} updated)`); }
  };

  const vehicleHistory = historyFor ? history.filter((h) => h.data.vehicleId === historyFor.id).sort((a, b) => b.data.at.localeCompare(a.data.at)) : [];
  const exportCsv = () => downloadCsv(`pricing-${stamp()}.csv`, rows.map((v) => ({ stock: v.stockNumber, vehicle: vTitle(v), days: vDaysInStock(v), price: v.price ?? "", cost: v.cost ?? "", gross: v.price != null && v.cost != null ? v.price - v.cost : "", target: noteFor(v.id)?.data.targetPrice ?? "" })));

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Pricing Desk</h1><p className="text-muted-foreground">Set asking prices, track every change, and work toward target prices.</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4 mr-1" /> CSV</Button>
          {canEdit && <Button onClick={() => setBulkOpen(true)} disabled={!bulkTargets.length}><Percent className="h-4 w-4 mr-1" /> Bulk adjust</Button>}
        </div>
      </div>

      <Card><CardContent className="p-3 text-sm text-muted-foreground">Book values (KBB, MarketCheck, etc.) aren't connected yet, so market comparisons are blank. Connect MarketCheck/KBB in Settings → Connections, or enter a manual target price per unit.</CardContent></Card>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Stock #, VIN, make, model" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All unsold</SelectItem>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        <Input type="number" className="w-36" placeholder="Min days" value={minDays} onChange={(e) => setMinDays(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Units</p><p className="text-2xl font-black">{rows.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Total asking</p><p className="text-2xl font-black">{money(totals.asking)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Total cost</p><p className="text-2xl font-black">{totals.withCost ? money(totals.cost) : "—"}</p><p className="text-xs text-muted-foreground">{totals.withCost} of {rows.length} with cost</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Potential gross</p><p className="text-2xl font-black">{totals.withCost ? money(totals.gross) : "—"}</p></CardContent></Card>
      </div>

      {rows.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">{inventory.length === 0 ? "No vehicles yet. Add units in Inventory or connect your feed in Settings → Connections." : "No units match these filters."}</CardContent></Card>
      ) : (
        <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3 text-right">Days</th><th className="px-4 py-3 text-right">Price</th><th className="px-4 py-3 text-right">Cost</th><th className="px-4 py-3 text-right">Gross</th><th className="px-4 py-3 text-right">Target</th><th className="px-4 py-3 text-right">Changes</th><th className="px-4 py-3"></th></tr></thead>
          <tbody className="divide-y">{rows.map((v) => { const n = noteFor(v.id); const g = v.price != null && v.cost != null ? v.price - v.cost : null; const ch = history.filter((h) => h.data.vehicleId === v.id).length; return (
            <tr key={v.id} className="hover:bg-muted/30">
              <td className="px-4 py-2 font-mono text-xs">{v.stockNumber}</td>
              <td className="px-4 py-2 font-semibold"><Link to={`/inventory/${v.id}`} className="hover:underline">{vTitle(v)}</Link><span className="block text-xs font-normal text-muted-foreground">{v.status}{n?.data.note ? ` · ${n.data.note}` : ""}</span></td>
              <td className="px-4 py-2 text-right"><Badge variant={vDaysInStock(v) > 60 ? "destructive" : "outline"}>{vDaysInStock(v)}d</Badge></td>
              <td className="px-4 py-2 text-right font-semibold">{money(v.price)}</td>
              <td className="px-4 py-2 text-right text-muted-foreground">{v.cost != null ? money(v.cost) : "—"}</td>
              <td className={`px-4 py-2 text-right ${g != null && g < 0 ? "text-destructive" : ""}`}>{g != null ? money(g) : "—"}</td>
              <td className="px-4 py-2 text-right">{n?.data.targetPrice != null ? <span className="inline-flex items-center gap-1"><Target className="h-3 w-3 text-muted-foreground" />{money(n.data.targetPrice)}</span> : "—"}</td>
              <td className="px-4 py-2 text-right"><Button size="sm" variant="ghost" onClick={() => setHistoryFor(v)}><History className="h-3.5 w-3.5 mr-1" />{ch}</Button></td>
              <td className="px-4 py-2 text-right">{canEdit && <Button size="sm" variant="outline" onClick={() => openEdit(v)}>Price</Button>}</td>
            </tr>
          ); })}</tbody>
        </table></CardContent></Card>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? vTitle(editing) : ""}</DialogTitle><DialogDescription>Stock #{editing?.stockNumber} · {editing ? vDaysInStock(editing) : 0} days in stock</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Asking price</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            <div className="space-y-1"><Label>Cost</Label><Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
            <div className="space-y-1 col-span-2"><Label>Target price (manual)</Label><Input type="number" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="Where you want this unit to land" /></div>
            <div className="space-y-1 col-span-2"><Label>Pricing note</Label><Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
          </div>
          {form.price && form.cost && <p className="text-xs text-muted-foreground">Gross at this price: {money(Number(form.price) - Number(form.cost))}</p>}
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={saveEdit}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyFor} onOpenChange={(o) => !o && setHistoryFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Price history</DialogTitle><DialogDescription>{historyFor ? vTitle(historyFor) : ""}</DialogDescription></DialogHeader>
          {vehicleHistory.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No price changes recorded yet. Changes made here or on Aging Inventory will show up.</p> : (
            <ul className="divide-y text-sm">{vehicleHistory.map((h) => <li key={h.id} className="py-2 flex justify-between gap-2"><span>{money(h.data.from)} → <b>{money(h.data.to)}</b></span><span className="text-xs text-muted-foreground text-right">{fmtDateTime(h.data.at)}<br />{who(h.data.by)}</span></li>)}</ul>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Bulk price adjustment</DialogTitle><DialogDescription>Applies to the {bulkTargets.length} priced unit{bulkTargets.length === 1 ? "" : "s"} in the current filter. Each change is logged to price history.</DialogDescription></DialogHeader>
          <div className="space-y-1"><Label>Adjust by %</Label><Input type="number" step="0.5" placeholder="-3 for a 3% cut, 2 for a 2% raise" value={bulkPct} onChange={(e) => setBulkPct(e.target.value)} /></div>
          {Number(bulkPct) !== 0 && <p className="text-xs text-muted-foreground">New total asking: {money(bulkTargets.reduce((a, v) => a + Math.round((v.price as number) * (1 + Number(bulkPct) / 100)), 0))}</p>}
          <DialogFooter><Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button><Button onClick={() => setBulkConfirm(true)} disabled={!Number(bulkPct)}>Review</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={bulkConfirm} onOpenChange={setBulkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Apply {Number(bulkPct) > 0 ? "+" : ""}{bulkPct}% to {bulkTargets.length} units?</AlertDialogTitle><AlertDialogDescription>This updates live asking prices on the website and in every module. It can't be undone in one step (each unit can be re-priced individually).</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={applyBulk}>Apply</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
