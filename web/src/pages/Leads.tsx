import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Calculator, Calendar, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useCollection, insert, update, get, fullName, fmtDateTime, logActivity, type Lead, type LeadStage } from "@/lib/store";
import { useInventory, vTitle } from "@/lib/inventory";
import { useAuth, useUsers } from "@/lib/auth";

const STAGES: { key: LeadStage; label: string }[] = [
  { key: "new", label: "New" }, { key: "contacted", label: "Contacted" }, { key: "appointment", label: "Appointment" },
  { key: "negotiating", label: "Negotiating" }, { key: "sold", label: "Sold" }, { key: "lost", label: "Lost" },
];
const SOURCES = ["Walk-in", "Phone", "Website", "Referral", "Facebook", "CarGurus", "Cars.com", "AutoTrader", "Repeat", "Other"];

export default function Leads() {
  const { user } = useAuth();
  const leads = useCollection("leads");
  const customers = useCollection("customers");
  const inventory = useInventory();
  const users = useUsers().filter((u) => u.isActive);
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Lead | null>(null);
  const [form, setForm] = useState({ customerId: "", vehicleId: "", source: "Walk-in", assignedTo: user?.id ?? "", notes: "" });

  useEffect(() => {
    const c = params.get("customer");
    if (c) { setForm((f) => ({ ...f, customerId: c })); setOpen(true); params.delete("customer"); setParams(params, { replace: true }); }
  }, [params, setParams]);

  const byStage = useMemo(() => Object.fromEntries(STAGES.map((s) => [s.key, leads.filter((l) => l.stage === s.key)])) as Record<LeadStage, Lead[]>, [leads]);

  const save = async () => {
    if (!form.customerId) return toast.error("Pick a customer");
    let l;
    try { l = await insert("leads", { ...form, vehicleId: form.vehicleId || undefined, assignedTo: form.assignedTo || undefined, stage: "new" } as any); }
    catch (e: any) { return toast.error(e.message || "Could not save"); }
    logActivity("create", "lead", l.id, undefined, user?.id);
    toast.success("Lead created");
    setOpen(false);
    setForm({ customerId: "", vehicleId: "", source: "Walk-in", assignedTo: user?.id ?? "", notes: "" });
  };
  const move = (l: Lead, stage: LeadStage) => { update("leads", l.id, { stage }).catch((e) => toast.error(e.message)); setDetail((d) => (d && d.id === l.id ? { ...d, stage } : d)); };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Leads & Pipeline</h1><p className="text-muted-foreground">{leads.filter((l) => !["sold", "lost"].includes(l.stage)).length} active</p></div>
        <Button onClick={() => setOpen(true)} disabled={customers.length === 0}><Plus className="h-4 w-4 mr-1" /> New lead</Button>
      </div>
      {customers.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">Add a <Link className="text-primary underline" to="/customers?new=1">customer</Link> first — every lead is attached to one.</CardContent></Card>}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {STAGES.map((s) => (
          <div key={s.key} className="rounded-xl bg-muted/40 p-2 min-h-[200px]">
            <div className="flex items-center justify-between px-2 py-1"><p className="text-xs font-bold uppercase tracking-wide">{s.label}</p><Badge variant="secondary">{byStage[s.key].length}</Badge></div>
            <div className="space-y-2 mt-1">
              {byStage[s.key].map((l) => {
                const c = get("customers", l.customerId); const v = l.vehicleId ? inventory.find((x) => x.id === l.vehicleId) : undefined;
                return (
                  <button key={l.id} onClick={() => setDetail(l)} className="w-full text-left bg-background rounded-lg border p-3 hover:shadow-sm transition-shadow">
                    <p className="font-semibold text-sm">{fullName(c)}</p>
                    <p className="text-xs text-muted-foreground truncate">{v ? vTitle(v) : "No vehicle"}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{l.source} · {fmtDateTime(l.lastActivityAt || l.createdAt)}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New lead</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Customer *</Label>
              <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}><SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger><SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{fullName(c)}{c.phone ? ` · ${c.phone}` : ""}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Vehicle of interest</Label>
              <Select value={form.vehicleId} onValueChange={(v) => setForm({ ...form, vehicleId: v === "none" ? "" : v })}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent><SelectItem value="none">None yet</SelectItem>{inventory.filter((v) => v.status === "Available").map((v) => <SelectItem key={v.id} value={v.id}>{vTitle(v)} · #{v.stockNumber}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Source</Label><Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Assigned to</Label><Select value={form.assignedTo} onValueChange={(v) => setForm({ ...form, assignedTo: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-1"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Create lead</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        {detail && (() => {
          const c = get("customers", detail.customerId); const v = detail.vehicleId ? inventory.find((x) => x.id === detail.vehicleId) : undefined;
          const owner = users.find((u) => u.id === detail.assignedTo);
          return (
            <DialogContent>
              <DialogHeader><DialogTitle>{c ? <Link to={`/customers/${c.id}`} className="hover:underline" onClick={() => setDetail(null)}>{fullName(c)}</Link> : fullName(c)}</DialogTitle></DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <p><span className="text-muted-foreground">Phone:</span> {c?.phone || "—"}</p><p><span className="text-muted-foreground">Email:</span> {c?.email || "—"}</p>
                  <p><span className="text-muted-foreground">Vehicle:</span> {v ? vTitle(v) : "—"}</p><p><span className="text-muted-foreground">Source:</span> {detail.source || "—"}</p>
                  <p><span className="text-muted-foreground">Owner:</span> {owner?.fullName || "Unassigned"}</p><p><span className="text-muted-foreground">Created:</span> {fmtDateTime(detail.createdAt)}</p>
                </div>
                {detail.notes && <p className="rounded bg-muted p-2 whitespace-pre-wrap">{detail.notes}</p>}
                {(detail as any).sourceUrl && <a className="text-xs text-primary underline" href={(detail as any).sourceUrl} target="_blank" rel="noreferrer">Came from: {(detail as any).sourceUrl}</a>}
                <div className="space-y-1"><Label>Stage</Label>
                  <Select value={detail.stage} onValueChange={(s) => move(detail, s as LeadStage)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent></Select></div>
                <div className="flex gap-2 pt-2">
                  <Button asChild variant="outline" size="sm"><Link to={`/appointments?customer=${detail.customerId}${v ? `&vehicle=${v.id}` : ""}`}><Calendar className="h-4 w-4 mr-1" /> Book appointment</Link></Button>
                  <Button asChild size="sm"><Link to={`/desking?customer=${detail.customerId}${v ? `&vehicle=${v.id}` : ""}&lead=${detail.id}`}><Calculator className="h-4 w-4 mr-1" /> Desk a deal <ChevronRight className="h-4 w-4" /></Link></Button>
                </div>
              </div>
            </DialogContent>
          );
        })()}
      </Dialog>
    </div>
  );
}
