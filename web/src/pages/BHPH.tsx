import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Wallet, AlertTriangle, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useCollection, fullName, money, fmtDate, logActivity } from "@/lib/store";
import { useInventory, vTitle } from "@/lib/inventory";
import { useRecords, addRecord, updateRecord, type Rec } from "@/lib/records";
import { useAuth } from "@/lib/auth";

type Freq = "weekly" | "biweekly" | "semimonthly" | "monthly";
export interface BhphAccount { dealId: string; customerId: string; vehicleId?: string; principal: number; apr: number; termMonths: number; paymentAmount: number; frequency: Freq; firstDue: string; nextDue: string; status: "active" | "paid_off" | "repo" | "charged_off"; notes: string }
export interface BhphPayment { accountId: string; amount: number; date: string; method: "cash" | "card" | "ach" | "check" | "money_order" | "other"; note: string }
const FREQ: { key: Freq; label: string; days: number }[] = [{ key: "weekly", label: "Weekly", days: 7 }, { key: "biweekly", label: "Every 2 weeks", days: 14 }, { key: "semimonthly", label: "Twice a month", days: 15 }, { key: "monthly", label: "Monthly", days: 30 }];
const todayStr = () => new Date().toISOString().slice(0, 10);
const addDays = (iso: string, days: number) => { const d = new Date(iso); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
const daysLate = (due: string) => Math.floor((Date.now() - new Date(due + "T23:59:59").getTime()) / 86400000);

export default function BHPH() {
  const { user } = useAuth();
  const deals = useCollection("deals");
  const customers = useCollection("customers");
  const inventory = useInventory();
  const accounts = useRecords<BhphAccount>("bhph_account");
  const payments = useRecords<BhphPayment>("bhph_payment");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ dealId: "", principal: "", apr: "", termMonths: "", paymentAmount: "", frequency: "biweekly" as Freq, firstDue: todayStr() });
  const [payFor, setPayFor] = useState<Rec<BhphAccount> | null>(null);
  const [pay, setPay] = useState({ amount: "", date: todayStr(), method: "cash" as BhphPayment["method"], note: "" });
  const [detail, setDetail] = useState<Rec<BhphAccount> | null>(null);
  const [tab, setTab] = useState<"active" | "delinquent" | "closed">("active");

  const tracked = useMemo(() => new Set(accounts.map((a) => a.data.dealId)), [accounts]);
  const eligible = useMemo(() => deals.filter((d) => ["approved", "funded", "delivered"].includes(d.status) && !tracked.has(d.id)), [deals, tracked]);
  const paidFor = (id: string) => payments.filter((p) => p.data.accountId === id).reduce((s, p) => s + p.data.amount, 0);
  const balance = (a: Rec<BhphAccount>) => Math.max(0, a.data.principal - paidFor(a.id));
  const isLate = (a: Rec<BhphAccount>) => a.data.status === "active" && daysLate(a.data.nextDue) > 0;
  const who = (a: Rec<BhphAccount>) => { const c = customers.find((x) => x.id === a.data.customerId); const v = inventory.find((x) => x.id === a.data.vehicleId); return { cust: fullName(c), phone: c?.phone, veh: v ? vTitle(v) : "No vehicle" }; };

  const rows = useMemo(() => accounts.filter((a) => tab === "closed" ? a.data.status !== "active" : tab === "delinquent" ? isLate(a) : a.data.status === "active").sort((a, b) => a.data.nextDue.localeCompare(b.data.nextDue)), [accounts, tab, payments]);
  const totals = useMemo(() => { const act = accounts.filter((a) => a.data.status === "active"); return { count: act.length, receivable: act.reduce((s, a) => s + balance(a), 0), late: act.filter(isLate).length, lateBal: act.filter(isLate).reduce((s, a) => s + balance(a), 0) }; }, [accounts, payments]);

  const pickDeal = (dealId: string) => { const d = deals.find((x) => x.id === dealId); setForm({ ...form, dealId, principal: d ? String(d.amountFinanced || 0) : "", apr: d ? String(d.apr || 0) : "", termMonths: d ? String(d.termMonths || 0) : "", paymentAmount: d ? String(d.monthlyPayment || 0) : "" }); };
  const create = async () => {
    const d = deals.find((x) => x.id === form.dealId);
    if (!d) return toast.error("Pick a deal");
    if (!Number(form.principal) || !Number(form.paymentAmount)) return toast.error("Principal and payment amount are required");
    try {
      const r = await addRecord<BhphAccount>("bhph_account", { dealId: d.id, customerId: d.customerId, vehicleId: d.vehicleId, principal: Number(form.principal), apr: Number(form.apr) || 0, termMonths: Number(form.termMonths) || 0, paymentAmount: Number(form.paymentAmount), frequency: form.frequency, firstDue: form.firstDue, nextDue: form.firstDue, status: "active", notes: "" }, user?.id);
      logActivity("create", "bhph_account", r.id, money(Number(form.principal)), user?.id);
      toast.success("Account opened"); setOpen(false); setForm({ ...form, dealId: "", principal: "", apr: "", termMonths: "", paymentAmount: "" });
    } catch (e: any) { toast.error(e.message || "Could not open account"); }
  };
  const record = async () => {
    if (!payFor) return;
    const amt = Number(pay.amount); if (!amt || amt <= 0) return toast.error("Enter the amount received");
    try {
      await addRecord<BhphPayment>("bhph_payment", { accountId: payFor.id, amount: amt, date: pay.date, method: pay.method, note: pay.note }, user?.id);
      const step = FREQ.find((f) => f.key === payFor.data.frequency)!.days;
      const remaining = payFor.data.principal - paidFor(payFor.id) - amt;
      const patch: Partial<BhphAccount> = { nextDue: addDays(payFor.data.nextDue, step) };
      if (remaining <= 0) patch.status = "paid_off";
      await updateRecord<BhphAccount>("bhph_account", payFor.id, patch);
      logActivity("payment", "bhph_account", payFor.id, `${money(amt)} ${pay.method}`, user?.id);
      toast.success(remaining <= 0 ? "Paid in full" : `Payment recorded · next due ${fmtDate(patch.nextDue)}`); setPayFor(null); setPay({ amount: "", date: todayStr(), method: "cash", note: "" });
    } catch (e: any) { toast.error(e.message || "Could not record payment"); }
  };
  const setStatus = (a: Rec<BhphAccount>, status: BhphAccount["status"]) => updateRecord<BhphAccount>("bhph_account", a.id, { status }).then(() => logActivity("status", "bhph_account", a.id, status, user?.id)).catch((e) => toast.error(e.message));
  const live = detail ? accounts.find((a) => a.id === detail.id) ?? detail : null;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Buy Here Pay Here</h1><p className="text-muted-foreground">In-house accounts and payment collection</p></div>
        <Button onClick={() => setOpen(true)} disabled={eligible.length === 0}><Plus className="h-4 w-4 mr-1" /> Open account</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[{ l: "Active accounts", v: String(totals.count) }, { l: "Outstanding principal", v: money(totals.receivable) }, { l: "Delinquent", v: String(totals.late), warn: totals.late > 0 }, { l: "Delinquent balance", v: money(totals.lateBal), warn: totals.late > 0 }].map((s) => (
          <Card key={s.l}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{s.l}</p><p className={`text-2xl font-black ${s.warn ? "text-rose-600" : ""}`}>{s.v}</p></CardContent></Card>))}
      </div>
      <p className="text-xs text-muted-foreground">Balance shown is principal minus payments received. Interest accrual and amortized payoff quotes are not calculated here.</p>

      <div className="flex gap-2">{(["active", "delinquent", "closed"] as const).map((t) => <Button key={t} size="sm" variant={tab === t ? "default" : "outline"} className="capitalize" onClick={() => setTab(t)}>{t}{t === "delinquent" && totals.late > 0 ? ` (${totals.late})` : ""}</Button>)}</div>

      {rows.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground"><Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
          {accounts.length === 0 ? (eligible.length ? "No in-house accounts yet. Open one from an approved or delivered deal." : <>No accounts yet. Desk the deal in <Link to="/desking" className="text-primary underline">Desking</Link>, mark it approved or delivered, then open the account here.</>) : tab === "delinquent" ? "Nobody is past due. Nice." : `No ${tab} accounts.`}
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="text-left p-3">Customer</th><th className="text-left p-3">Vehicle</th><th className="text-right p-3">Payment</th><th className="text-left p-3">Next due</th><th className="text-right p-3">Balance</th><th className="text-left p-3">Status</th><th className="p-3"></th></tr></thead>
          <tbody>{rows.map((a) => { const w = who(a); const late = daysLate(a.data.nextDue); return (
            <tr key={a.id} className="border-t">
              <td className="p-3"><p className="font-semibold">{w.cust}</p><p className="text-xs text-muted-foreground">{w.phone || ""}</p></td>
              <td className="p-3">{w.veh}</td>
              <td className="p-3 text-right whitespace-nowrap">{money(a.data.paymentAmount)} <span className="text-xs text-muted-foreground">/ {FREQ.find((f) => f.key === a.data.frequency)?.label.toLowerCase()}</span></td>
              <td className="p-3 whitespace-nowrap">{fmtDate(a.data.nextDue)} {a.data.status === "active" && late > 0 && <Badge className="bg-rose-100 text-rose-800 ml-1"><AlertTriangle className="h-3 w-3 mr-1" />{late}d late</Badge>}</td>
              <td className="p-3 text-right font-semibold">{money(balance(a))}</td>
              <td className="p-3"><Select value={a.data.status} onValueChange={(s) => setStatus(a, s as BhphAccount["status"])}><SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="paid_off">Paid off</SelectItem><SelectItem value="repo">Repossessed</SelectItem><SelectItem value="charged_off">Charged off</SelectItem></SelectContent></Select></td>
              <td className="p-3 whitespace-nowrap"><Button size="sm" onClick={() => { setPayFor(a); setPay({ ...pay, amount: String(a.data.paymentAmount) }); }} disabled={a.data.status !== "active"}><DollarSign className="h-4 w-4 mr-1" /> Payment</Button><Button size="sm" variant="ghost" onClick={() => setDetail(a)}>History</Button></td>
            </tr>); })}</tbody></table></CardContent></Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Open in-house account</DialogTitle><DialogDescription>Numbers prefill from the desked deal; adjust to match the signed contract.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Deal *</Label><Select value={form.dealId} onValueChange={pickDeal}><SelectTrigger><SelectValue placeholder="Approved / delivered deals" /></SelectTrigger><SelectContent>{eligible.map((d) => { const c = customers.find((x) => x.id === d.customerId); const v = inventory.find((x) => x.id === d.vehicleId); return <SelectItem key={d.id} value={d.id}>{fullName(c)} · {v ? vTitle(v) : "no vehicle"} · {money(d.amountFinanced)}</SelectItem>; })}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Principal ($) *</Label><Input type="number" value={form.principal} onChange={(e) => setForm({ ...form, principal: e.target.value })} /></div>
              <div className="space-y-1"><Label>APR %</Label><Input type="number" value={form.apr} onChange={(e) => setForm({ ...form, apr: e.target.value })} /></div>
              <div className="space-y-1"><Label>Term (months)</Label><Input type="number" value={form.termMonths} onChange={(e) => setForm({ ...form, termMonths: e.target.value })} /></div>
              <div className="space-y-1"><Label>Payment ($) *</Label><Input type="number" value={form.paymentAmount} onChange={(e) => setForm({ ...form, paymentAmount: e.target.value })} /></div>
              <div className="space-y-1"><Label>Frequency</Label><Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v as Freq })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FREQ.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>First payment due</Label><Input type="date" value={form.firstDue} onChange={(e) => setForm({ ...form, firstDue: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create}>Open account</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!payFor} onOpenChange={(o) => !o && setPayFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record payment</DialogTitle><DialogDescription>{payFor ? `${who(payFor).cust} · balance ${money(balance(payFor))} · due ${fmtDate(payFor.data.nextDue)}` : ""}</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Amount ($)</Label><Input type="number" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></div>
            <div className="space-y-1"><Label>Date</Label><Input type="date" value={pay.date} onChange={(e) => setPay({ ...pay, date: e.target.value })} /></div>
            <div className="space-y-1"><Label>Method</Label><Select value={pay.method} onValueChange={(v) => setPay({ ...pay, method: v as BhphPayment["method"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="card">Card</SelectItem><SelectItem value="ach">ACH</SelectItem><SelectItem value="check">Check</SelectItem><SelectItem value="money_order">Money order</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
            <div className="space-y-1"><Label>Note / receipt #</Label><Input value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPayFor(null)}>Cancel</Button><Button onClick={record}>Record payment</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!live} onOpenChange={(o) => !o && setDetail(null)}>
        {live && (() => { const w = who(live); const hist = payments.filter((p) => p.data.accountId === live.id).sort((a, b) => b.data.date.localeCompare(a.data.date)); return (
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{w.cust}</DialogTitle><DialogDescription>{w.veh} · {money(live.data.principal)} principal @ {live.data.apr}% · {live.data.termMonths} mo · opened {fmtDate(live.createdAt)}</DialogDescription></DialogHeader>
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Payments</CardTitle><CardDescription>{money(paidFor(live.id))} received · {money(balance(live))} remaining</CardDescription></CardHeader>
              <CardContent className="p-0">{hist.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No payments yet.</p> : <table className="w-full text-sm"><tbody>{hist.map((p) => <tr key={p.id} className="border-t"><td className="p-2">{fmtDate(p.data.date)}</td><td className="p-2 capitalize">{p.data.method.replace("_", " ")}</td><td className="p-2 text-muted-foreground">{p.data.note}</td><td className="p-2 text-right font-semibold">{money(p.data.amount)}</td></tr>)}</tbody></table>}</CardContent></Card>
            <div className="flex justify-between"><Button asChild variant="outline" size="sm"><Link to={`/deals/${live.data.dealId}/jacket`}>Deal jacket</Link></Button><Button size="sm" onClick={() => setDetail(null)}>Close</Button></div>
          </DialogContent>); })()}
      </Dialog>
    </div>
  );
}
