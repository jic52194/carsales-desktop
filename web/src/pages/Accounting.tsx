import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Download, Trash2, Landmark } from "lucide-react";
import { toast } from "sonner";
import { useCollection, get, fullName, money, fmtDate, logActivity, type Deal } from "@/lib/store";
import { getVehicle, vTitle } from "@/lib/inventory";
import { useRecords, addRecord, removeRecord, type Rec } from "@/lib/records";
import { useAuth, useUsers } from "@/lib/auth";
import { downloadCsv, stamp } from "@/lib/csv";

/** Manual adjustment — records kind "journal". Not a general ledger; just dated entries against deals or accounts. */
export interface Journal { date: string; dealId?: string; account: string; memo: string; amount: number }

const ACCOUNTS = ["Front gross adj.", "F&I gross adj.", "Pack / holdback", "Chargeback", "Doc fee", "Reserve received", "Other"];
const ym = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const monthLabel = (k: string) => new Date(k + "-01T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });
const days = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400e3);

function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{label}</p><p className="text-2xl font-black mt-1">{value}</p>{sub && <p className="text-xs text-muted-foreground">{sub}</p>}</CardContent></Card>;
}

export default function Accounting() {
  const { user, hasPermission } = useAuth();
  const canEdit = hasPermission(["admin", "manager", "f_and_i"]);
  const deals = useCollection("deals");
  const users = useUsers();
  const journal = useRecords<Journal>("journal");
  const [month, setMonth] = useState(ym(new Date().toISOString()));
  const [addOpen, setAddOpen] = useState(false);
  const [jf, setJf] = useState({ date: new Date().toISOString().slice(0, 10), dealId: "", account: ACCOUNTS[0], memo: "", amount: "" });
  const [toDelete, setToDelete] = useState<Rec<Journal> | null>(null);

  const sold = useMemo(() => deals.filter((d) => ["funded", "delivered"].includes(d.status)), [deals]);
  const months = useMemo(() => { const s = new Set(sold.map((d) => ym(d.updatedAt))); s.add(ym(new Date().toISOString())); journal.forEach((j) => s.add(j.data.date.slice(0, 7))); return [...s].sort().reverse(); }, [sold, journal]);
  const inMonth = useMemo(() => sold.filter((d) => ym(d.updatedAt) === month).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [sold, month]);
  const jMonth = useMemo(() => journal.filter((j) => j.data.date.slice(0, 7) === month).sort((a, b) => b.data.date.localeCompare(a.data.date)), [journal, month]);
  const totals = useMemo(() => ({ front: inMonth.reduce((a, d) => a + (d.frontEndGross || 0), 0), back: inMonth.reduce((a, d) => a + (d.backEndGross || 0), 0), total: inMonth.reduce((a, d) => a + (d.totalGross || 0), 0), sales: inMonth.reduce((a, d) => a + (d.sellingPrice || 0), 0), adj: jMonth.reduce((a, j) => a + (j.data.amount || 0), 0) }), [inMonth, jMonth]);
  const receivables = useMemo(() => sold.filter((d) => d.status === "funded").sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)), [sold]);
  const recvTotal = receivables.reduce((a, d) => a + (d.amountFinanced || 0), 0);
  const label = (d: Deal) => { const v = d.vehicleId ? getVehicle(d.vehicleId) : undefined; return `${fullName(get("customers", d.customerId))}${v ? ` · ${vTitle(v)}` : ""}`; };
  const who = (id?: string) => users.find((u) => u.id === id)?.fullName ?? "—";

  const addEntry = async () => {
    const amount = Number(jf.amount); if (!jf.memo.trim() || !amount) return toast.error("Memo and a non-zero amount are required");
    try { await addRecord<Journal>("journal", { date: jf.date, dealId: jf.dealId || undefined, account: jf.account, memo: jf.memo.trim(), amount }, user?.id); logActivity("journal_entry", "deal", jf.dealId || undefined, `${jf.account} ${money(amount)}`, user?.id); toast.success("Entry added"); setAddOpen(false); setJf({ ...jf, memo: "", amount: "", dealId: "" }); }
    catch (e: any) { toast.error(e.message || "Could not add"); }
  };
  const confirmDelete = async () => { if (!toDelete) return; try { await removeRecord("journal", toDelete.id); toast.success("Entry removed"); setToDelete(null); } catch (e: any) { toast.error(e.message); } };
  const exportCsv = () => {
    const rows = inMonth.map((d) => ({ type: "deal", date: d.updatedAt.slice(0, 10), status: d.status as string, customer: fullName(get("customers", d.customerId)), vehicle: d.vehicleId && getVehicle(d.vehicleId) ? vTitle(getVehicle(d.vehicleId)!) : "", salesperson: who(d.salespersonId), sellingPrice: d.sellingPrice, amountFinanced: d.amountFinanced, frontGross: d.frontEndGross, backGross: d.backEndGross, totalGross: d.totalGross, account: "", memo: "" }));
    jMonth.forEach((j) => rows.push({ type: "journal", date: j.data.date, status: "", customer: j.data.dealId ? fullName(get("customers", get("deals", j.data.dealId)?.customerId ?? "")) : "", vehicle: "", salesperson: "", sellingPrice: 0, amountFinanced: 0, frontGross: 0, backGross: 0, totalGross: j.data.amount, account: j.data.account, memo: j.data.memo }));
    downloadCsv(`accounting-${month}`, rows);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Deal Accounting</h1><p className="text-muted-foreground">Gross recap, receivables, and manual adjustments built from your deals</p></div>
        <div className="flex gap-2">
          <Select value={month} onValueChange={setMonth}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent>{months.map((m) => <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" onClick={exportCsv} disabled={!inMonth.length && !jMonth.length}><Download className="h-4 w-4 mr-1" /> CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Tile label="Units" value={inMonth.length} sub={`${inMonth.filter((d) => d.status === "delivered").length} delivered`} />
        <Tile label="Front gross" value={money(totals.front)} />
        <Tile label="Back gross" value={money(totals.back)} />
        <Tile label="Total gross" value={money(totals.total + totals.adj)} sub={totals.adj ? `incl. ${money(totals.adj)} adjustments` : `${money(totals.sales)} in sales`} />
        <Tile label="Contracts in transit" value={money(recvTotal)} sub={`${receivables.length} funded, not delivered`} />
      </div>

      <Tabs defaultValue="recap">
        <TabsList><TabsTrigger value="recap">Gross recap</TabsTrigger><TabsTrigger value="recv">Receivables</TabsTrigger><TabsTrigger value="journal">Journal</TabsTrigger></TabsList>

        <TabsContent value="recap" className="pt-2">
          {inMonth.length === 0 ? <Card><CardContent className="p-10 text-center text-muted-foreground"><Landmark className="h-8 w-8 mx-auto mb-2 opacity-40" />No funded or delivered deals in {monthLabel(month)}. Deals appear here once F&I marks them funded.</CardContent></Card> : (
            <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase"><tr><th className="text-left p-3">Date</th><th className="text-left p-3">Deal</th><th className="text-left p-3">Salesperson</th><th className="text-left p-3">Status</th><th className="text-right p-3">Price</th><th className="text-right p-3">Front</th><th className="text-right p-3">Back</th><th className="text-right p-3">Total</th></tr></thead>
              <tbody className="divide-y">{inMonth.map((d) => <tr key={d.id}>
                <td className="p-3 whitespace-nowrap">{fmtDate(d.updatedAt)}</td>
                <td className="p-3"><Link to={`/desking?deal=${d.id}`} className="hover:underline font-medium">{label(d)}</Link></td>
                <td className="p-3">{who(d.salespersonId)}</td>
                <td className="p-3"><Badge variant={d.status === "delivered" ? "default" : "secondary"} className="capitalize">{d.status}</Badge></td>
                <td className="p-3 text-right">{money(d.sellingPrice)}</td><td className="p-3 text-right">{money(d.frontEndGross)}</td><td className="p-3 text-right">{money(d.backEndGross)}</td><td className="p-3 text-right font-semibold">{money(d.totalGross)}</td>
              </tr>)}</tbody>
              <tfoot className="bg-muted/30 font-semibold"><tr><td className="p-3" colSpan={4}>Totals</td><td className="p-3 text-right">{money(totals.sales)}</td><td className="p-3 text-right">{money(totals.front)}</td><td className="p-3 text-right">{money(totals.back)}</td><td className="p-3 text-right">{money(totals.total)}</td></tr></tfoot>
            </table></CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="recv" className="pt-2 space-y-2">
          <p className="text-sm text-muted-foreground">Funded deals not yet delivered — days since the deal was last updated approximates contract-in-transit age.</p>
          {receivables.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">Nothing in transit. Every funded deal has been delivered.</CardContent></Card> : (
            <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase"><tr><th className="text-left p-3">Deal</th><th className="text-left p-3">Funded</th><th className="text-right p-3">Days</th><th className="text-right p-3">Amount financed</th><th className="text-right p-3">Gross</th></tr></thead>
              <tbody className="divide-y">{receivables.map((d) => { const n = days(d.updatedAt); return <tr key={d.id} className={n > 10 ? "bg-amber-500/5" : ""}>
                <td className="p-3"><Link to={`/desking?deal=${d.id}`} className="hover:underline font-medium">{label(d)}</Link></td>
                <td className="p-3 whitespace-nowrap">{fmtDate(d.updatedAt)}</td>
                <td className={`p-3 text-right font-semibold ${n > 10 ? "text-amber-600" : ""}`}>{n}</td>
                <td className="p-3 text-right">{money(d.amountFinanced)}</td><td className="p-3 text-right">{money(d.totalGross)}</td>
              </tr>; })}</tbody>
            </table></CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="journal" className="pt-2 space-y-3">
          <div className="flex items-center justify-between gap-2"><p className="text-sm text-muted-foreground">Manual adjustments for {monthLabel(month)} · net {money(totals.adj)}</p>{canEdit && <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" /> Entry</Button>}</div>
          {jMonth.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">No adjustments this month. Use entries for chargebacks, pack, reserve, or anything the deal worksheet doesn't capture.</CardContent></Card> : (
            <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase"><tr><th className="text-left p-3">Date</th><th className="text-left p-3">Account</th><th className="text-left p-3">Deal</th><th className="text-left p-3">Memo</th><th className="text-right p-3">Amount</th><th className="p-3"></th></tr></thead>
              <tbody className="divide-y">{jMonth.map((j) => <tr key={j.id}>
                <td className="p-3 whitespace-nowrap">{fmtDate(j.data.date)}</td><td className="p-3">{j.data.account}</td>
                <td className="p-3">{j.data.dealId && get("deals", j.data.dealId) ? label(get("deals", j.data.dealId)!) : "—"}</td>
                <td className="p-3">{j.data.memo}</td>
                <td className={`p-3 text-right font-semibold ${j.data.amount < 0 ? "text-destructive" : ""}`}>{money(j.data.amount)}</td>
                <td className="p-3 text-right">{canEdit && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setToDelete(j)}><Trash2 className="h-3.5 w-3.5" /></Button>}</td>
              </tr>)}</tbody>
            </table></CardContent></Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Journal entry</DialogTitle><DialogDescription>Positive adds to gross, negative reduces it.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Date</Label><Input type="date" value={jf.date} onChange={(e) => setJf({ ...jf, date: e.target.value })} /></div>
            <div className="space-y-1"><Label>Amount</Label><Input type="number" step="0.01" value={jf.amount} onChange={(e) => setJf({ ...jf, amount: e.target.value })} placeholder="-250" /></div>
            <div className="space-y-1"><Label>Account</Label><Select value={jf.account} onValueChange={(v) => setJf({ ...jf, account: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ACCOUNTS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Deal (optional)</Label><Select value={jf.dealId || "none"} onValueChange={(v) => setJf({ ...jf, dealId: v === "none" ? "" : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{sold.slice(0, 200).map((d) => <SelectItem key={d.id} value={d.id}>{label(d)}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1 col-span-2"><Label>Memo</Label><Input value={jf.memo} onChange={(e) => setJf({ ...jf, memo: e.target.value })} placeholder="e.g. GAP chargeback, early payoff" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={addEntry}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this entry?</AlertDialogTitle><AlertDialogDescription>{toDelete?.data.account} · {money(toDelete?.data.amount)} · {toDelete?.data.memo}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
