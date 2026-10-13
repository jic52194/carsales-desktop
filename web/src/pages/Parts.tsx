import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Package, PackagePlus, ArrowRightLeft, Trash2, AlertTriangle, Download } from "lucide-react";
import { toast } from "sonner";
import { money, logActivity } from "@/lib/store";
import { useRecords, addRecord, updateRecord, removeRecord, type Rec } from "@/lib/records";
import { useAuth } from "@/lib/auth";
import { downloadCsv, stamp } from "@/lib/csv";
import { ticketTotal, type ServiceTicket } from "@/pages/ServiceScheduler";
import type { PartsOrder } from "@/pages/TechnicianBay";

/** Parts inventory item — records kind "part". */
export interface Part { partNo: string; description: string; qty: number; cost: number; price: number; bin: string; minQty: number; supplier: string }

const EMPTY = { partNo: "", description: "", qty: "0", cost: "", price: "", bin: "", minQty: "1", supplier: "" };

export default function Parts() {
  const { user, hasPermission } = useAuth();
  const canEdit = hasPermission(["manager", "service", "inventory", "technician"]);
  const parts = useRecords<Part>("part");
  const tickets = useRecords<ServiceTicket>("service_ticket");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Rec<Part> | "new" | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [receiveFor, setReceiveFor] = useState<Rec<Part> | null>(null);
  const [rq, setRq] = useState("1");
  const [issueFor, setIssueFor] = useState<Rec<Part> | null>(null);
  const [iss, setIss] = useState({ ticketId: "", qty: "1" });
  const [toDelete, setToDelete] = useState<Rec<Part> | null>(null);

  const rows = useMemo(() => { const s = q.trim().toLowerCase(); return parts.filter((p) => !s || [p.data.partNo, p.data.description, p.data.bin, p.data.supplier].some((x) => (x || "").toLowerCase().includes(s))).sort((a, b) => a.data.partNo.localeCompare(b.data.partNo)); }, [parts, q]);
  const low = useMemo(() => parts.filter((p) => p.data.qty <= p.data.minQty), [parts]);
  const stockValue = parts.reduce((a, p) => a + p.data.qty * (p.data.cost || 0), 0);
  const openTickets = tickets.filter((t) => t.data.status !== "done");

  const openEdit = (p: Rec<Part> | "new") => { setEditing(p); setForm(p === "new" ? EMPTY : { partNo: p.data.partNo, description: p.data.description, qty: String(p.data.qty), cost: String(p.data.cost ?? ""), price: String(p.data.price ?? ""), bin: p.data.bin ?? "", minQty: String(p.data.minQty ?? 1), supplier: p.data.supplier ?? "" }); };
  const save = async () => {
    if (!form.partNo.trim() || !form.description.trim()) return toast.error("Part number and description are required");
    const data: Part = { partNo: form.partNo.trim(), description: form.description.trim(), qty: Number(form.qty) || 0, cost: Number(form.cost) || 0, price: Number(form.price) || 0, bin: form.bin.trim(), minQty: Number(form.minQty) || 0, supplier: form.supplier.trim() };
    try {
      if (editing === "new") { if (parts.some((p) => p.data.partNo.toLowerCase() === data.partNo.toLowerCase())) return toast.error("That part number already exists"); await addRecord<Part>("part", data, user?.id); }
      else if (editing) await updateRecord<Part>("part", editing.id, data);
      toast.success("Part saved"); setEditing(null);
    } catch (e: any) { toast.error(e.message || "Could not save"); }
  };
  const receive = async () => {
    if (!receiveFor) return; const n = Number(rq) || 0; if (n <= 0) return toast.error("Enter a quantity");
    try { await updateRecord<Part>("part", receiveFor.id, { qty: receiveFor.data.qty + n }); logActivity("parts_received", "part", receiveFor.id, `+${n} ${receiveFor.data.partNo}`, user?.id); toast.success(`Received ${n} × ${receiveFor.data.partNo}`); setReceiveFor(null); setRq("1"); }
    catch (e: any) { toast.error(e.message || "Could not receive"); }
  };
  const issue = async () => {
    if (!issueFor) return; const n = Number(iss.qty) || 0; const t = tickets.find((x) => x.id === iss.ticketId);
    if (!t) return toast.error("Pick a repair order"); if (n <= 0) return toast.error("Enter a quantity");
    if (n > issueFor.data.qty) return toast.error(`Only ${issueFor.data.qty} in stock`);
    try {
      await addRecord<PartsOrder>("parts_order", { ticketId: t.id, partId: issueFor.id, part: `${issueFor.data.partNo} ${issueFor.data.description}`, qty: n, cost: issueFor.data.price || 0, status: "received", at: new Date().toISOString() }, user?.id);
      await updateRecord<Part>("part", issueFor.id, { qty: issueFor.data.qty - n });
      const partsCost = (t.data.partsCost || 0) + n * (issueFor.data.price || 0);
      await updateRecord<ServiceTicket>("service_ticket", t.id, { partsCost, total: ticketTotal({ ...t.data, partsCost }) });
      logActivity("parts_issued", "service_ticket", t.id, `${n} × ${issueFor.data.partNo}`, user?.id);
      toast.success(`Issued ${n} × ${issueFor.data.partNo} to ${t.data.vehicle}`); setIssueFor(null); setIss({ ticketId: "", qty: "1" });
    } catch (e: any) { toast.error(e.message || "Could not issue"); }
  };
  const confirmDelete = async () => { if (!toDelete) return; try { await removeRecord("part", toDelete.id); toast.success("Part removed"); setToDelete(null); } catch (e: any) { toast.error(e.message); } };
  const exportCsv = () => downloadCsv(`parts-${stamp()}`, parts.map((p) => ({ partNo: p.data.partNo, description: p.data.description, qty: p.data.qty, minQty: p.data.minQty, cost: p.data.cost, price: p.data.price, bin: p.data.bin, supplier: p.data.supplier })));

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Parts</h1><p className="text-muted-foreground">{parts.length} SKU{parts.length === 1 ? "" : "s"} · {money(stockValue)} at cost · {low.length} low</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={!parts.length}><Download className="h-4 w-4 mr-1" /> CSV</Button>
          {canEdit && <Button onClick={() => openEdit("new")}><Plus className="h-4 w-4 mr-1" /> Part</Button>}
        </div>
      </div>

      {low.length > 0 && (
        <Card className="border-amber-400/60"><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Low stock</CardTitle><CardDescription>At or below minimum quantity</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap gap-2">{low.map((p) => <Badge key={p.id} variant="outline" className="cursor-pointer" onClick={() => canEdit && setReceiveFor(p)}>{p.data.partNo} · {p.data.qty}/{p.data.minQty}{p.data.supplier ? ` · ${p.data.supplier}` : ""}</Badge>)}</CardContent></Card>
      )}

      <Input placeholder="Search part number, description, bin, supplier…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />

      {parts.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground"><Package className="h-8 w-8 mx-auto mb-2 opacity-40" />No parts on hand yet. Add your first SKU to track stock, receive orders, and issue parts to repair orders.</CardContent></Card>
      ) : rows.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">No parts match “{q}”.</CardContent></Card> : (
        <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase"><tr><th className="text-left p-3">Part #</th><th className="text-left p-3">Description</th><th className="text-left p-3">Bin</th><th className="text-right p-3">Qty</th><th className="text-right p-3">Cost</th><th className="text-right p-3">Price</th><th className="text-left p-3">Supplier</th><th className="p-3"></th></tr></thead>
          <tbody className="divide-y">{rows.map((p) => (
            <tr key={p.id} className={p.data.qty <= p.data.minQty ? "bg-amber-500/5" : ""}>
              <td className="p-3 font-mono font-semibold cursor-pointer hover:underline" onClick={() => canEdit && openEdit(p)}>{p.data.partNo}</td>
              <td className="p-3">{p.data.description}</td>
              <td className="p-3">{p.data.bin || "—"}</td>
              <td className="p-3 text-right font-semibold">{p.data.qty}<span className="text-xs text-muted-foreground"> / min {p.data.minQty}</span></td>
              <td className="p-3 text-right">{money(p.data.cost)}</td>
              <td className="p-3 text-right">{money(p.data.price)}</td>
              <td className="p-3">{p.data.supplier || "—"}</td>
              <td className="p-3 whitespace-nowrap">{canEdit && <div className="flex gap-1 justify-end">
                <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setReceiveFor(p)}><PackagePlus className="h-3.5 w-3.5 mr-1" /> Receive</Button>
                <Button size="sm" variant="outline" className="h-7 px-2" disabled={p.data.qty <= 0} onClick={() => setIssueFor(p)}><ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Issue</Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setToDelete(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>}</td>
            </tr>))}</tbody>
        </table></CardContent></Card>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing === "new" ? "New part" : "Edit part"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Part number</Label><Input value={form.partNo} onChange={(e) => setForm({ ...form, partNo: e.target.value })} /></div>
            <div className="space-y-1"><Label>Bin</Label><Input value={form.bin} onChange={(e) => setForm({ ...form, bin: e.target.value })} /></div>
            <div className="space-y-1 col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="space-y-1"><Label>Qty on hand</Label><Input type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} /></div>
            <div className="space-y-1"><Label>Min qty</Label><Input type="number" value={form.minQty} onChange={(e) => setForm({ ...form, minQty: e.target.value })} /></div>
            <div className="space-y-1"><Label>Cost</Label><Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
            <div className="space-y-1"><Label>Price (charged to RO)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            <div className="space-y-1 col-span-2"><Label>Supplier</Label><Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!receiveFor} onOpenChange={(o) => !o && setReceiveFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Receive stock</DialogTitle><DialogDescription>{receiveFor?.data.partNo} · {receiveFor?.data.description} · {receiveFor?.data.qty} on hand</DialogDescription></DialogHeader>
          <div className="space-y-1"><Label>Quantity received</Label><Input type="number" min="1" value={rq} onChange={(e) => setRq(e.target.value)} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setReceiveFor(null)}>Cancel</Button><Button onClick={receive}>Receive</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!issueFor} onOpenChange={(o) => !o && setIssueFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Issue to repair order</DialogTitle><DialogDescription>{issueFor?.data.partNo} · {issueFor?.data.qty} on hand · charged at {money(issueFor?.data.price)} each</DialogDescription></DialogHeader>
          {openTickets.length === 0 ? <p className="text-sm text-muted-foreground">No open repair orders. Open one in the Service Scheduler first.</p> : (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1 col-span-2"><Label>Repair order</Label><Select value={iss.ticketId} onValueChange={(v) => setIss({ ...iss, ticketId: v })}><SelectTrigger><SelectValue placeholder="Pick RO" /></SelectTrigger><SelectContent>{openTickets.map((t) => <SelectItem key={t.id} value={t.id}>{t.data.vehicle} — {t.data.concern.slice(0, 30)}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Qty</Label><Input type="number" min="1" max={issueFor?.data.qty} value={iss.qty} onChange={(e) => setIss({ ...iss, qty: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setIssueFor(null)}>Cancel</Button><Button onClick={issue} disabled={!openTickets.length}>Issue</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remove {toDelete?.data.partNo}?</AlertDialogTitle><AlertDialogDescription>The SKU and its on-hand count are deleted. Parts already issued to repair orders are unaffected.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete}>Remove</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
