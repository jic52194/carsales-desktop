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
import { Plus, Calculator, Calendar, ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";
import { useCollection, insert, update, get, fullName, fmtDateTime, logActivity, type Lead, type LeadStage } from "@/lib/store";
import { useInventory, vTitle } from "@/lib/inventory";
import { useAuth, useUsers } from "@/lib/auth";

const STAGES: { key: LeadStage; label: string }[] = [
  { key: "new", label: "New" }, { key: "contacted", label: "Contacted" }, { key: "appointment", label: "Appointment" },
  { key: "negotiating", label: "Negotiating" }, { key: "sold", label: "Sold" }, { key: "lost", label: "Lost" },
];
const STAGE_TONE: Record<LeadStage, string> = { new: "border-t-sky-400", contacted: "border-t-indigo-400", appointment: "border-t-violet-400", negotiating: "border-t-amber-400", sold: "border-t-emerald-500", lost: "border-t-slate-300" };
const EMPTY_HINT: Record<LeadStage, string> = { new: "New website, phone and GHL leads land here.", contacted: "Open a lead and move it here once you've reached them.", appointment: "Leads with a booked visit or test drive.", negotiating: "Working numbers in Desking.", sold: "Delivered deals show up here.", lost: "Nothing lost — nice." };
const ago = (ms: number) => { const m = Math.round(ms / 60000); if (m < 60) return `${Math.max(m, 1)}m ago`; const h = Math.round(m / 60); if (h < 48) return `${h}h ago`; return `${Math.round(h / 24)}d ago`; };
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
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"all" | "mine">("all");
  const [showClosed, setShowClosed] = useState(false);
  const [form, setForm] = useState({ customerId: "", vehicleId: "", source: "Walk-in", assignedTo: user?.id ?? "", notes: "" });

  useEffect(() => {
    const c = params.get("customer");
    if (c) { setForm((f) => ({ ...f, customerId: c })); setOpen(true); params.delete("customer"); setParams(params, { replace: true }); }
  }, [params, setParams]);

  const visible = useMemo(() => {
    const t = q.trim().toLowerCase(), d = t.replace(/\D/g, "");
    return leads.filter((l) => {
      if (scope === "mine" && l.assignedTo !== user?.id) return false;
      if (!t) return true;
      const c = get("customers", l.customerId); const v = l.vehicleId ? inventory.find((x) => x.id === l.vehicleId) : undefined;
      return fullName(c).toLowerCase().includes(t) || (!!d && (c?.phone ?? "").replace(/\D/g, "").includes(d)) || (v ? vTitle(v).toLowerCase().includes(t) : false);
    });
  }, [leads, q, scope, user?.id, inventory]);
  const byStage = useMemo(() => Object.fromEntries(STAGES.map((s) => [s.key, visible.filter((l) => l.stage === s.key)])) as Record<LeadStage, Lead[]>, [visible]);

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

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search name, phone, vehicle" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setShowClosed((v) => !v)}>{showClosed ? "Hide closed" : `Show closed · ${byStage.sold.length} sold · ${byStage.lost.length} lost`}</Button>
        <div className="inline-flex rounded-lg border p-0.5 bg-background">{(["all", "mine"] as const).map((k) => <button key={k} onClick={() => setScope(k)} className={`px-3 py-1.5 text-sm rounded-md ${scope === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{k === "all" ? "All leads" : "My leads"}</button>)}</div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 snap-x">
        {STAGES.filter((s) => showClosed || !["sold", "lost"].includes(s.key)).map((s) => (
          <div key={s.key} className={`rounded-xl bg-muted/40 p-2 min-h-[220px] w-[250px] shrink-0 lg:flex-1 lg:w-auto lg:min-w-[190px] snap-start border-t-4 ${STAGE_TONE[s.key]}`}>
            <div className="flex items-center justify-between px-2 py-1"><p className="text-xs font-bold uppercase tracking-wide">{s.label}</p><Badge variant="secondary">{byStage[s.key].length}</Badge></div>
            <div className="space-y-2 mt-1">
              {byStage[s.key].length === 0 && <p className="text-xs text-muted-foreground text-center py-6 px-2">{EMPTY_HINT[s.key]}</p>}
              {byStage[s.key].map((l) => {
                const c = get("customers", l.customerId); const v = l.vehicleId ? inventory.find((x) => x.id === l.vehicleId) : undefined;
                const age = Date.now() - new Date(l.lastActivityAt || l.createdAt).getTime();
                const stale = !["sold", "lost"].includes(l.stage) && (l.stage === "new" ? age > 3600e3 : age > 3 * 86400e3);
                const owner = l.assignedTo ? users.find((u) => u.id === l.assignedTo) : undefined;
                return (
                  <button key={l.id} onClick={() => setDetail(l)} title={`${fullName(c)}${v ? " · " + vTitle(v) : ""}`} className={`w-full text-left bg-background rounded-lg border p-3 hover:shadow-md hover:border-primary/40 transition-all ${stale ? "border-l-4 border-l-amber-400" : ""}`}>
                    <div className="flex items-start justify-between gap-2"><p className="font-semibold text-sm leading-tight">{fullName(c)}</p>{owner && <span title={owner.fullName} className="h-5 w-5 shrink-0 rounded-full bg-primary/10 text-primary text-[10px] font-bold grid place-items-center">{(owner.fullName || "?").slice(0, 1).toUpperCase()}</span>}</div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{v ? vTitle(v) : "No vehicle yet"}</p>
                    {c?.phone && <p className="text-xs text-muted-foreground mt-1">{c.phone}</p>}
                    <p className={`text-[11px] mt-1.5 ${stale ? "text-amber-700 font-medium" : "text-muted-foreground"}`}>{l.source} · {ago(age)}{stale ? (l.stage === "new" ? " · not contacted" : " · no activity") : ""}</p>
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
