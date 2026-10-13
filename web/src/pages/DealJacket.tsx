import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { ArrowLeft, Calculator, Plus, Trash2, ListChecks, ShieldCheck, FileBadge } from "lucide-react";
import { toast } from "sonner";
import { useCollection, update, fullName, money, fmtDate, fmtDateTime, logActivity, type DealStatus } from "@/lib/store";
import { useInventory, vTitle } from "@/lib/inventory";
import { useRecords, addRecord, updateRecord, removeRecord, type Rec } from "@/lib/records";
import { useAuth, useUsers } from "@/lib/auth";

type DocStatus = "received" | "missing" | "na";
export interface DealDoc { dealId: string; group: "document" | "delivery"; name: string; status: DocStatus; note: string; doneAt?: string; doneBy?: string }

const STANDARD_DOCS = ["Driver's license copy", "Proof of insurance", "Credit application", "Buyer's Guide (used)", "Odometer disclosure", "Title application / POA", "Bill of sale / RISC", "Privacy notice", "We Owe / Due Bill", "Trade title & payoff auth", "GAP waiver (if sold)", "Service contract (if sold)"];
const DELIVERY_ITEMS = ["Vehicle detailed", "Fuel topped off", "Second key / manuals", "Temp plate / registration", "Features walkthrough", "Review app & referral ask"];
const STATUS: { key: DealStatus; label: string }[] = [{ key: "working", label: "Working" }, { key: "pending_approval", label: "Pending approval" }, { key: "approved", label: "Approved" }, { key: "funded", label: "Funded" }, { key: "delivered", label: "Delivered" }, { key: "dead", label: "Dead" }];
const DOC_CLS: Record<DocStatus, string> = { received: "bg-emerald-100 text-emerald-800", missing: "bg-rose-100 text-rose-800", na: "bg-muted text-muted-foreground" };

export default function DealJacket() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const users = useUsers();
  const deals = useCollection("deals");
  const customers = useCollection("customers");
  const inventory = useInventory();
  const all = useRecords<DealDoc>("deal_doc");
  const deal = deals.find((d) => d.id === id);
  const customer = customers.find((c) => c.id === deal?.customerId);
  const vehicle = inventory.find((v) => v.id === deal?.vehicleId);
  const docs = useMemo(() => all.filter((r) => r.data.dealId === id && r.data.group === "document"), [all, id]);
  const delivery = useMemo(() => all.filter((r) => r.data.dealId === id && r.data.group === "delivery"), [all, id]);
  const [newDoc, setNewDoc] = useState("");
  const [notes, setNotes] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Rec<DealDoc> | null>(null);

  if (!deal) return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4">
      <h1 className="text-3xl font-black">Deal jacket</h1>
      <Card><CardContent className="p-8 text-center text-muted-foreground">This deal isn't in the list (it may still be loading, or it belongs to another store). <Link to="/deals" className="text-primary underline">Back to deals</Link></CardContent></Card>
    </div>
  );

  const received = docs.filter((d) => d.data.status === "received").length;
  const applicable = docs.filter((d) => d.data.status !== "na").length;
  const deliveredCount = delivery.filter((d) => d.data.status === "received").length;
  const sp = users.find((u) => u.id === deal.salespersonId)?.fullName || "Unassigned";

  const addMany = async (names: string[], group: DealDoc["group"]) => {
    const have = new Set((group === "document" ? docs : delivery).map((d) => d.data.name.toLowerCase()));
    const todo = names.filter((n) => !have.has(n.toLowerCase()));
    if (!todo.length) return toast.info("Already on the list");
    try { for (const name of todo) await addRecord<DealDoc>("deal_doc", { dealId: id, group, name, status: "missing", note: "" }, user?.id); toast.success(`${todo.length} added`); }
    catch (e: any) { toast.error(e.message || "Could not add"); }
  };
  const addOne = async () => { if (!newDoc.trim()) return; await addMany([newDoc.trim()], "document"); setNewDoc(""); };
  const setDoc = (r: Rec<DealDoc>, patch: Partial<DealDoc>) => {
    if (patch.status === "received") { patch.doneAt = new Date().toISOString(); patch.doneBy = user?.id; }
    updateRecord<DealDoc>("deal_doc", r.id, patch).catch((e) => toast.error(e.message));
  };
  const del = async () => { if (!toDelete) return; try { await removeRecord("deal_doc", toDelete.id); } catch (e: any) { toast.error(e.message); } finally { setToDelete(null); } };
  const setStatus = async (status: DealStatus) => {
    try { await update("deals", deal.id, { status }); logActivity("status", "deal", deal.id, status, user?.id); toast.success(`Deal ${STATUS.find((s) => s.key === status)?.label.toLowerCase()}`); }
    catch (e: any) { toast.error(e.message); }
  };
  const saveNotes = async () => { if (notes == null) return; try { await update("deals", deal.id, { notes }); toast.success("Notes saved"); setNotes(null); } catch (e: any) { toast.error(e.message); } };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <Link to="/deals" className="text-sm text-muted-foreground hover:underline inline-flex items-center"><ArrowLeft className="h-4 w-4 mr-1" /> Deals</Link>
          <h1 className="text-3xl font-black">{fullName(customer)}</h1>
          <p className="text-muted-foreground">{vehicle ? `${vTitle(vehicle)} · #${vehicle.stockNumber}` : "No vehicle on this deal"} · opened {fmtDate(deal.createdAt)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button asChild variant="outline"><Link to={`/desking?deal=${deal.id}`}><Calculator className="h-4 w-4 mr-1" /> Open in desking</Link></Button>
          <Button asChild variant="outline"><Link to={`/compliance?deal=${deal.id}`}><ShieldCheck className="h-4 w-4 mr-1" /> Compliance</Link></Button>
          <Button asChild variant="outline"><Link to={`/title-reg?deal=${deal.id}`}><FileBadge className="h-4 w-4 mr-1" /> Title & reg</Link></Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-2"><CardHeader className="pb-2"><CardTitle className="text-base">Deal summary</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {[["Selling price", money(deal.sellingPrice)], ["Cash down", money(deal.cashDown)], ["Trade allowance", money(deal.tradeAllowance)], ["Trade payoff", money(deal.tradePayoff)], ["Amount financed", money(deal.amountFinanced)], ["Term / APR", `${deal.termMonths || 0} mo @ ${deal.apr || 0}%`], ["Payment", money(deal.monthlyPayment)], ["Total gross", money(deal.totalGross)]].map(([k, v]) => (
              <div key={k}><p className="text-xs text-muted-foreground">{k}</p><p className="font-semibold">{v}</p></div>))}
            <div className="col-span-2"><p className="text-xs text-muted-foreground">Customer</p><p className="font-semibold">{customer ? <Link to={`/customers/${customer.id}`} className="hover:underline">{fullName(customer)}</Link> : "—"} <span className="text-muted-foreground font-normal">{customer?.phone || ""} {customer?.email || ""}</span></p></div>
            <div className="col-span-2"><p className="text-xs text-muted-foreground">Salesperson</p><p className="font-semibold">{sp}</p></div>
          </CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-base">Funding status</CardTitle><CardDescription>Updated {fmtDateTime(deal.updatedAt)}</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <Select value={deal.status} onValueChange={(v) => setStatus(v as DealStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUS.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent></Select>
            <p className="text-xs text-muted-foreground">Lender decisions and funding come from your lender portal — connect RouteOne/Dealertrack in Settings → Connections to sync them. Until then, update this status by hand.</p>
          </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between flex-wrap gap-2"><div><CardTitle className="text-base">Document checklist</CardTitle><CardDescription>{applicable ? `${received} of ${applicable} received` : "No documents tracked yet"}</CardDescription></div>
          <Button size="sm" variant="outline" onClick={() => addMany(STANDARD_DOCS, "document")}><ListChecks className="h-4 w-4 mr-1" /> Add standard set</Button></CardHeader>
        <CardContent className="space-y-2">
          {docs.length === 0 && <p className="text-sm text-muted-foreground">Add the standard document set or type your own items below. Each one can be marked received, missing or N/A.</p>}
          {docs.map((r) => (
            <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border p-2">
              <div className="flex-1 min-w-0"><p className="font-medium text-sm">{r.data.name}</p>{r.data.doneAt && r.data.status === "received" && <p className="text-xs text-muted-foreground">Received {fmtDateTime(r.data.doneAt)} · {users.find((u) => u.id === r.data.doneBy)?.fullName || ""}</p>}</div>
              <Input className="h-8 sm:w-48" placeholder="Note" defaultValue={r.data.note} onBlur={(e) => e.target.value !== r.data.note && setDoc(r, { note: e.target.value })} />
              <Select value={r.data.status} onValueChange={(s) => setDoc(r, { status: s as DocStatus })}><SelectTrigger className={`h-8 w-28 ${DOC_CLS[r.data.status]}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="received">Received</SelectItem><SelectItem value="missing">Missing</SelectItem><SelectItem value="na">N/A</SelectItem></SelectContent></Select>
              <Button size="icon" variant="ghost" onClick={() => setToDelete(r)}><Trash2 className="h-4 w-4" /></Button>
            </div>))}
          <div className="flex gap-2"><Input placeholder="Add a document…" value={newDoc} onChange={(e) => setNewDoc(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addOne()} /><Button variant="outline" onClick={addOne}><Plus className="h-4 w-4" /></Button></div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between flex-wrap gap-2"><div><CardTitle className="text-base">Delivery checklist</CardTitle><CardDescription>{delivery.length ? `${deliveredCount} of ${delivery.length} done` : "Nothing tracked yet"}</CardDescription></div>
            <Button size="sm" variant="outline" onClick={() => addMany(DELIVERY_ITEMS, "delivery")}><ListChecks className="h-4 w-4 mr-1" /> Add standard set</Button></CardHeader>
          <CardContent className="space-y-2">
            {delivery.length === 0 && <p className="text-sm text-muted-foreground">Add the standard delivery steps so nothing is missed at handover.</p>}
            {delivery.map((r) => (
              <label key={r.id} className="flex items-center gap-3 rounded-lg border p-2 cursor-pointer">
                <Checkbox checked={r.data.status === "received"} onCheckedChange={(c) => setDoc(r, { status: c ? "received" : "missing" })} />
                <span className={`text-sm flex-1 ${r.data.status === "received" ? "line-through text-muted-foreground" : ""}`}>{r.data.name}</span>
                {r.data.status === "received" && <Badge variant="secondary" className="text-[10px]">{fmtDate(r.data.doneAt)}</Badge>}
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.preventDefault(); setToDelete(r); }}><Trash2 className="h-3.5 w-3.5" /></Button>
              </label>))}
          </CardContent>
        </Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-base">Deal notes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Label className="sr-only">Notes</Label>
            <Textarea rows={8} value={notes ?? deal.notes ?? ""} onChange={(e) => setNotes(e.target.value)} placeholder="Stips, promises made, lender call-backs…" />
            <div className="flex justify-end"><Button size="sm" onClick={saveNotes} disabled={notes == null || notes === (deal.notes ?? "")}>Save notes</Button></div>
          </CardContent></Card>
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove "{toDelete?.data.name}"?</AlertDialogTitle><AlertDialogDescription>It is removed from this deal's checklist. Mark it N/A instead if it simply doesn't apply.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={del}>Remove</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
