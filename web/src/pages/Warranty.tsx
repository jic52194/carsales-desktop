import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, ShieldCheck, FileWarning } from "lucide-react";
import { toast } from "sonner";
import { useCollection, get, fullName, money, fmtDate, logActivity } from "@/lib/store";
import { getVehicle, vTitle } from "@/lib/inventory";
import { useRecords, addRecord, updateRecord, type Rec } from "@/lib/records";
import { useAuth } from "@/lib/auth";

export type WarrantyStatus = "active" | "expired" | "cancelled" | "claimed";
export interface Warranty { dealId: string; customerId: string; provider: string; contractNo: string; termMonths: number; miles: number; cost: number; retail: number; startDate: string; status: WarrantyStatus; notes?: string }
export interface WarrantyClaim { warrantyId: string; date: string; description: string; amount: number; status: "submitted" | "approved" | "denied" | "paid" }

const STATUSES: WarrantyStatus[] = ["active", "expired", "cancelled", "claimed"];
const CLAIM_STATUSES: WarrantyClaim["status"][] = ["submitted", "approved", "denied", "paid"];
const expiryOf = (w: Warranty) => { const d = new Date(w.startDate + "T00:00:00"); d.setMonth(d.getMonth() + (w.termMonths || 0)); return d; };
const daysLeft = (w: Warranty) => Math.ceil((expiryOf(w).getTime() - Date.now()) / 86400e3);

export default function WarrantyPage() {
  const { user, hasPermission } = useAuth();
  const canEdit = hasPermission(["manager", "f_and_i", "service"]);
  const deals = useCollection("deals");
  const warranties = useRecords<Warranty>("warranty");
  const claims = useRecords<WarrantyClaim>("warranty_claim");
  const [filter, setFilter] = useState<"all" | WarrantyStatus>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ dealId: "", provider: "", contractNo: "", termMonths: "36", miles: "36000", cost: "", retail: "", startDate: new Date().toISOString().slice(0, 10) });
  const [sel, setSel] = useState<Rec<Warranty> | null>(null);
  const [cf, setCf] = useState({ date: new Date().toISOString().slice(0, 10), description: "", amount: "" });

  const delivered = useMemo(() => deals.filter((d) => ["funded", "delivered"].includes(d.status)), [deals]);
  const covered = useMemo(() => new Set(warranties.map((w) => w.data.dealId)), [warranties]);
  const rows = useMemo(() => warranties.filter((w) => filter === "all" || w.data.status === filter).sort((a, b) => expiryOf(a.data).getTime() - expiryOf(b.data).getTime()), [warranties, filter]);
  const expiringSoon = warranties.filter((w) => w.data.status === "active" && daysLeft(w.data) >= 0 && daysLeft(w.data) <= 60).length;
  const lapsed = warranties.filter((w) => w.data.status === "active" && daysLeft(w.data) < 0);
  const dealLabel = (id: string) => { const d = get("deals", id); if (!d) return "Deal removed"; const v = d.vehicleId ? getVehicle(d.vehicleId) : undefined; return `${fullName(get("customers", d.customerId))}${v ? ` · ${vTitle(v)}` : ""}`; };
  const claimsFor = (id: string) => claims.filter((c) => c.data.warrantyId === id).sort((a, b) => b.data.date.localeCompare(a.data.date));

  const pickDeal = (dealId: string) => { const d = get("deals", dealId); setForm({ ...form, dealId, retail: d?.warrantyRetail ? String(d.warrantyRetail) : form.retail, cost: d?.warrantyCost ? String(d.warrantyCost) : form.cost, startDate: d ? d.updatedAt.slice(0, 10) : form.startDate }); };
  const save = async () => {
    const d = get("deals", form.dealId); if (!d) return toast.error("Pick a deal");
    if (!form.provider.trim()) return toast.error("Provider is required");
    try {
      const w = await addRecord<Warranty>("warranty", { dealId: d.id, customerId: d.customerId, provider: form.provider.trim(), contractNo: form.contractNo.trim(), termMonths: Number(form.termMonths) || 0, miles: Number(form.miles) || 0, cost: Number(form.cost) || 0, retail: Number(form.retail) || 0, startDate: form.startDate, status: "active" }, user?.id);
      logActivity("warranty_registered", "deal", d.id, `${w.data.provider} ${w.data.contractNo}`, user?.id);
      toast.success("Contract registered"); setAddOpen(false); setForm({ dealId: "", provider: "", contractNo: "", termMonths: "36", miles: "36000", cost: "", retail: "", startDate: new Date().toISOString().slice(0, 10) });
    } catch (e: any) { toast.error(e.message || "Could not save"); }
  };
  const setStatus = (w: Rec<Warranty>, status: WarrantyStatus) => updateRecord<Warranty>("warranty", w.id, { status }).then(() => setSel((s) => (s && s.id === w.id ? { ...s, data: { ...s.data, status } } : s))).catch((e) => toast.error(e.message));
  const markLapsed = async () => { for (const w of lapsed) await updateRecord<Warranty>("warranty", w.id, { status: "expired" }); toast.success(`${lapsed.length} marked expired`); };
  const addClaim = async () => {
    if (!sel) return; if (!cf.description.trim()) return toast.error("Describe the claim");
    try {
      await addRecord<WarrantyClaim>("warranty_claim", { warrantyId: sel.id, date: cf.date, description: cf.description.trim(), amount: Number(cf.amount) || 0, status: "submitted" }, user?.id);
      if (sel.data.status === "active") await setStatus(sel, "claimed");
      toast.success("Claim logged"); setCf({ date: new Date().toISOString().slice(0, 10), description: "", amount: "" });
    } catch (e: any) { toast.error(e.message || "Could not log claim"); }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Warranty & Service Contracts</h1><p className="text-muted-foreground">{warranties.length} contract{warranties.length === 1 ? "" : "s"} · {expiringSoon} expiring within 60 days · {claims.length} claim{claims.length === 1 ? "" : "s"}</p></div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select>
          {canEdit && <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" /> Register</Button>}
        </div>
      </div>

      {lapsed.length > 0 && canEdit && <Card className="border-amber-400/60"><CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2 text-sm"><span className="flex items-center gap-2"><FileWarning className="h-4 w-4 text-amber-500" /> {lapsed.length} active contract{lapsed.length === 1 ? " is" : "s are"} past the end of term.</span><Button size="sm" variant="outline" onClick={markLapsed}>Mark expired</Button></CardContent></Card>}

      {warranties.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground"><ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />No contracts registered.{delivered.length === 0 ? " Register one once a deal is funded or delivered." : ` ${delivered.filter((d) => !covered.has(d.id)).length} delivered deal(s) have no contract on file yet.`}</CardContent></Card>
      ) : (
        <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase"><tr><th className="text-left p-3">Customer / vehicle</th><th className="text-left p-3">Provider · contract</th><th className="text-left p-3">Term</th><th className="text-left p-3">Expires</th><th className="text-right p-3">Retail / cost</th><th className="text-left p-3">Status</th><th className="text-right p-3">Claims</th></tr></thead>
          <tbody className="divide-y">{rows.map((w) => { const dl = daysLeft(w.data); const n = claimsFor(w.id).length; return (
            <tr key={w.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSel(w)}>
              <td className="p-3 font-medium">{dealLabel(w.data.dealId)}</td>
              <td className="p-3">{w.data.provider}<span className="text-muted-foreground"> · {w.data.contractNo || "no #"}</span></td>
              <td className="p-3 whitespace-nowrap">{w.data.termMonths} mo / {w.data.miles.toLocaleString()} mi</td>
              <td className="p-3 whitespace-nowrap">{fmtDate(expiryOf(w.data).toISOString())}<span className={`block text-xs ${dl < 0 ? "text-destructive" : dl <= 60 ? "text-amber-600" : "text-muted-foreground"}`}>{dl < 0 ? `${-dl}d ago` : `${dl}d left`}</span></td>
              <td className="p-3 text-right whitespace-nowrap">{money(w.data.retail)}<span className="block text-xs text-muted-foreground">cost {money(w.data.cost)}</span></td>
              <td className="p-3"><Badge variant={w.data.status === "active" ? "default" : "secondary"} className="capitalize">{w.data.status}</Badge></td>
              <td className="p-3 text-right">{n || "—"}</td>
            </tr>); })}</tbody>
        </table></CardContent></Card>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Register contract</DialogTitle><DialogDescription>Attach a warranty or service contract to a funded/delivered deal. Retail and cost prefill from the deal's F&I worksheet.</DialogDescription></DialogHeader>
          {delivered.length === 0 ? <p className="text-sm text-muted-foreground">No funded or delivered deals yet.</p> : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2"><Label>Deal</Label><Select value={form.dealId} onValueChange={pickDeal}><SelectTrigger><SelectValue placeholder="Pick a deal" /></SelectTrigger><SelectContent>{delivered.map((d) => <SelectItem key={d.id} value={d.id}>{dealLabel(d.id)}{covered.has(d.id) ? " (has contract)" : ""}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Provider</Label><Input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="e.g. Protective, Zurich" /></div>
              <div className="space-y-1"><Label>Contract #</Label><Input value={form.contractNo} onChange={(e) => setForm({ ...form, contractNo: e.target.value })} /></div>
              <div className="space-y-1"><Label>Term (months)</Label><Input type="number" value={form.termMonths} onChange={(e) => setForm({ ...form, termMonths: e.target.value })} /></div>
              <div className="space-y-1"><Label>Miles</Label><Input type="number" value={form.miles} onChange={(e) => setForm({ ...form, miles: e.target.value })} /></div>
              <div className="space-y-1"><Label>Retail</Label><Input type="number" value={form.retail} onChange={(e) => setForm({ ...form, retail: e.target.value })} /></div>
              <div className="space-y-1"><Label>Cost</Label><Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
              <div className="space-y-1 col-span-2"><Label>Start date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={save} disabled={!delivered.length}>Register</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{sel?.data.provider} · {sel?.data.contractNo || "no #"}</DialogTitle><DialogDescription>{sel && dealLabel(sel.data.dealId)} · {sel?.data.termMonths} mo / {sel?.data.miles.toLocaleString()} mi · starts {fmtDate(sel?.data.startDate)} · expires {sel && fmtDate(expiryOf(sel.data).toISOString())}</DialogDescription></DialogHeader>
          {sel && <>
            <div className="flex items-center gap-3 text-sm"><span>Status</span>{canEdit ? <Select value={sel.data.status} onValueChange={(v: any) => setStatus(sel, v)}><SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select> : <Badge className="capitalize">{sel.data.status}</Badge>}<span className="text-muted-foreground ml-auto">gross {money(sel.data.retail - sel.data.cost)}</span></div>
            <div className="space-y-2">
              <p className="text-sm font-semibold">Claims log</p>
              {claimsFor(sel.id).length === 0 && <p className="text-sm text-muted-foreground">No claims on this contract.</p>}
              {claimsFor(sel.id).map((c) => <div key={c.id} className="rounded-md border p-2 text-sm flex items-start justify-between gap-2">
                <div><p>{c.data.description}</p><p className="text-xs text-muted-foreground">{fmtDate(c.data.date)} · {money(c.data.amount)}</p></div>
                {canEdit ? <Select value={c.data.status} onValueChange={(v: any) => updateRecord<WarrantyClaim>("warranty_claim", c.id, { status: v }).catch((e) => toast.error(e.message))}><SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger><SelectContent>{CLAIM_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select> : <Badge variant="outline" className="capitalize">{c.data.status}</Badge>}
              </div>)}
            </div>
            {canEdit && <div className="grid grid-cols-2 gap-2 border-t pt-3">
              <div className="space-y-1"><Label>Date</Label><Input type="date" value={cf.date} onChange={(e) => setCf({ ...cf, date: e.target.value })} /></div>
              <div className="space-y-1"><Label>Amount</Label><Input type="number" value={cf.amount} onChange={(e) => setCf({ ...cf, amount: e.target.value })} /></div>
              <div className="space-y-1 col-span-2"><Label>Description</Label><Textarea rows={2} value={cf.description} onChange={(e) => setCf({ ...cf, description: e.target.value })} placeholder="Failed component, RO #, authorization…" /></div>
              <Button className="col-span-2" variant="secondary" onClick={addClaim}><Plus className="h-4 w-4 mr-1" /> Log claim</Button>
            </div>}
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
