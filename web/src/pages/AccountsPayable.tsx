import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Download, Trash2, CheckCircle2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { money, fmtDate, logActivity } from "@/lib/store";
import { useRecords, addRecord, updateRecord, removeRecord, type Rec } from "@/lib/records";
import { useAuth } from "@/lib/auth";
import { downloadCsv, stamp } from "@/lib/csv";

/** Vendor bill — records kind "ap_bill". */
export interface ApBill { vendor: string; invoiceNo: string; date: string; dueDate: string; amount: number; category: string; status: "open" | "paid"; paidDate?: string; notes?: string }

const CATEGORIES = ["Floorplan interest", "Auction / purchase", "Reconditioning", "Parts", "Advertising", "Rent / utilities", "Software", "Insurance", "Professional fees", "Other"];
const BUCKETS = [{ key: "current", label: "Not yet due", test: (d: number) => d < 0 }, { key: "1-30", label: "1–30 days", test: (d: number) => d >= 0 && d <= 30 }, { key: "31-60", label: "31–60 days", test: (d: number) => d > 30 && d <= 60 }, { key: "61-90", label: "61–90 days", test: (d: number) => d > 60 && d <= 90 }, { key: "90+", label: "90+ days", test: (d: number) => d > 90 }];
const today = () => new Date().toISOString().slice(0, 10);
const overdueDays = (due: string) => Math.floor((new Date(today() + "T00:00:00").getTime() - new Date(due + "T00:00:00").getTime()) / 86400e3);
const EMPTY = { vendor: "", invoiceNo: "", date: today(), dueDate: today(), amount: "", category: CATEGORIES[0], notes: "" };

export default function AccountsPayable() {
  const { user, hasPermission } = useAuth();
  const canEdit = hasPermission(["admin", "manager"]);
  const bills = useRecords<ApBill>("ap_bill");
  const [status, setStatus] = useState<"open" | "paid" | "all">("open");
  const [vendor, setVendor] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [toDelete, setToDelete] = useState<Rec<ApBill> | null>(null);

  const vendors = useMemo(() => { const m: Record<string, { open: number; paid: number; count: number }> = {}; for (const b of bills) { const v = (m[b.data.vendor] ||= { open: 0, paid: 0, count: 0 }); v.count++; if (b.data.status === "open") v.open += b.data.amount; else v.paid += b.data.amount; } return Object.entries(m).sort((a, b) => b[1].open - a[1].open); }, [bills]);
  const openBills = useMemo(() => bills.filter((b) => b.data.status === "open"), [bills]);
  const aging = useMemo(() => BUCKETS.map((bk) => { const list = openBills.filter((b) => bk.test(overdueDays(b.data.dueDate))); return { ...bk, count: list.length, total: list.reduce((a, b) => a + b.data.amount, 0) }; }), [openBills]);
  const rows = useMemo(() => bills.filter((b) => (status === "all" || b.data.status === status) && (vendor === "all" || b.data.vendor === vendor)).sort((a, b) => a.data.dueDate.localeCompare(b.data.dueDate)), [bills, status, vendor]);
  const openTotal = openBills.reduce((a, b) => a + b.data.amount, 0);
  const overdueTotal = openBills.filter((b) => overdueDays(b.data.dueDate) > 0).reduce((a, b) => a + b.data.amount, 0);

  const save = async () => {
    const amount = Number(form.amount); if (!form.vendor.trim() || !amount) return toast.error("Vendor and amount are required");
    try { await addRecord<ApBill>("ap_bill", { vendor: form.vendor.trim(), invoiceNo: form.invoiceNo.trim(), date: form.date, dueDate: form.dueDate, amount, category: form.category, status: "open", notes: form.notes.trim() || undefined }, user?.id); toast.success("Bill entered"); setAddOpen(false); setForm({ ...EMPTY, date: today(), dueDate: today() }); }
    catch (e: any) { toast.error(e.message || "Could not save"); }
  };
  const markPaid = async (b: Rec<ApBill>) => { try { await updateRecord<ApBill>("ap_bill", b.id, { status: "paid", paidDate: today() }); logActivity("bill_paid", "ap_bill", b.id, `${b.data.vendor} ${money(b.data.amount)}`, user?.id); toast.success(`Paid ${b.data.vendor}`); } catch (e: any) { toast.error(e.message); } };
  const reopen = (b: Rec<ApBill>) => updateRecord<ApBill>("ap_bill", b.id, { status: "open", paidDate: undefined }).catch((e) => toast.error(e.message));
  const confirmDelete = async () => { if (!toDelete) return; try { await removeRecord("ap_bill", toDelete.id); toast.success("Bill deleted"); setToDelete(null); } catch (e: any) { toast.error(e.message); } };
  const exportCsv = () => downloadCsv(`accounts-payable-${stamp()}`, rows.map((b) => ({ vendor: b.data.vendor, invoiceNo: b.data.invoiceNo, date: b.data.date, dueDate: b.data.dueDate, amount: b.data.amount, category: b.data.category, status: b.data.status, paidDate: b.data.paidDate ?? "", daysOverdue: b.data.status === "open" ? Math.max(0, overdueDays(b.data.dueDate)) : "", notes: b.data.notes ?? "" })));

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Accounts Payable</h1><p className="text-muted-foreground">{openBills.length} open bill{openBills.length === 1 ? "" : "s"} · {money(openTotal)} owed · {money(overdueTotal)} past due</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4 mr-1" /> CSV</Button>
          {canEdit && <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" /> Bill</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {aging.map((a) => <Card key={a.key} className={a.key === "90+" && a.count ? "border-destructive/60" : a.key === "61-90" && a.count ? "border-amber-400/60" : ""}><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{a.label}</p><p className="text-xl font-black mt-1">{money(a.total)}</p><p className="text-xs text-muted-foreground">{a.count} bill{a.count === 1 ? "" : "s"}</p></CardContent></Card>)}
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Select value={status} onValueChange={(v: any) => setStatus(v)}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="all">All</SelectItem></SelectContent></Select>
            <Select value={vendor} onValueChange={setVendor}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All vendors</SelectItem>{vendors.map(([v]) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
          </div>
          {bills.length === 0 ? <Card><CardContent className="p-10 text-center text-muted-foreground"><Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />No vendor bills entered. Add bills as they arrive to track what's owed and when.</CardContent></Card>
            : rows.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">No {status === "all" ? "" : status} bills{vendor !== "all" ? ` for ${vendor}` : ""}.</CardContent></Card> : (
            <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase"><tr><th className="text-left p-3">Vendor</th><th className="text-left p-3">Invoice</th><th className="text-left p-3">Category</th><th className="text-left p-3">Due</th><th className="text-right p-3">Amount</th><th className="text-left p-3">Status</th><th className="p-3"></th></tr></thead>
              <tbody className="divide-y">{rows.map((b) => { const od = b.data.status === "open" ? overdueDays(b.data.dueDate) : 0; return (
                <tr key={b.id} className={od > 0 ? "bg-amber-500/5" : ""}>
                  <td className="p-3 font-medium">{b.data.vendor}{b.data.notes && <span className="block text-xs text-muted-foreground font-normal">{b.data.notes}</span>}</td>
                  <td className="p-3">{b.data.invoiceNo || "—"}<span className="block text-xs text-muted-foreground">{fmtDate(b.data.date)}</span></td>
                  <td className="p-3">{b.data.category}</td>
                  <td className="p-3 whitespace-nowrap">{fmtDate(b.data.dueDate)}{od > 0 && <span className="block text-xs text-destructive font-semibold">{od}d overdue</span>}</td>
                  <td className="p-3 text-right font-semibold">{money(b.data.amount)}</td>
                  <td className="p-3"><Badge variant={b.data.status === "paid" ? "secondary" : "default"}>{b.data.status === "paid" ? `Paid ${fmtDate(b.data.paidDate)}` : "Open"}</Badge></td>
                  <td className="p-3 text-right whitespace-nowrap">{canEdit && <div className="flex gap-1 justify-end">
                    {b.data.status === "open" ? <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => markPaid(b)}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Paid</Button> : <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => reopen(b)}>Reopen</Button>}
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setToDelete(b)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>}</td>
                </tr>); })}</tbody>
            </table></CardContent></Card>
          )}
        </div>
        <Card className="h-fit"><CardHeader><CardTitle className="text-base">Vendors</CardTitle><CardDescription>From entered bills</CardDescription></CardHeader>
          <CardContent className="divide-y text-sm">
            {vendors.length === 0 && <p className="text-muted-foreground py-2">No vendors yet.</p>}
            {vendors.map(([v, t]) => <button key={v} className="w-full flex justify-between py-2 text-left hover:underline" onClick={() => setVendor(v)}><span>{v}<span className="block text-xs text-muted-foreground">{t.count} bill{t.count === 1 ? "" : "s"} · {money(t.paid)} paid</span></span><span className="font-semibold">{money(t.open)}</span></button>)}
          </CardContent></Card>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Enter bill</DialogTitle><DialogDescription>Vendor names auto-complete from previous bills.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2"><Label>Vendor</Label><Input list="ap-vendors" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} /><datalist id="ap-vendors">{vendors.map(([v]) => <option key={v} value={v} />)}</datalist></div>
            <div className="space-y-1"><Label>Invoice #</Label><Input value={form.invoiceNo} onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} /></div>
            <div className="space-y-1"><Label>Amount</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div className="space-y-1"><Label>Invoice date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div className="space-y-1"><Label>Due date</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
            <div className="space-y-1 col-span-2"><Label>Category</Label><Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1 col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this bill?</AlertDialogTitle><AlertDialogDescription>{toDelete?.data.vendor} · {toDelete?.data.invoiceNo || "no invoice #"} · {money(toDelete?.data.amount)}. This can't be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
