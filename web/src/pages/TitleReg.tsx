import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, FileBadge, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { useCollection, fullName, fmtDate, logActivity } from "@/lib/store";
import { useInventory, vTitle } from "@/lib/inventory";
import { useRecords, addRecord, updateRecord, type Rec } from "@/lib/records";
import { useAuth } from "@/lib/auth";

export interface TitleReg {
  dealId: string; deliveredAt: string;
  titleReceivedAt: string | null; lienReleaseAt: string | null; regSubmittedAt: string | null; platesIssuedAt: string | null;
  tempTagExpires: string | null; notes: string; completedAt: string | null;
}
type StepKey = "titleReceivedAt" | "lienReleaseAt" | "regSubmittedAt" | "platesIssuedAt";
const STEPS: { key: StepKey; label: string }[] = [{ key: "titleReceivedAt", label: "Title received" }, { key: "lienReleaseAt", label: "Lien release" }, { key: "regSubmittedAt", label: "Registration submitted" }, { key: "platesIssuedAt", label: "Plates issued" }];
const today = () => new Date().toISOString().slice(0, 10);
const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
const daysUntil = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);

export default function TitleRegPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const deals = useCollection("deals");
  const customers = useCollection("customers");
  const inventory = useInventory();
  const trackers = useRecords<TitleReg>("title_reg");
  const [open, setOpen] = useState(false);
  const [dealId, setDealId] = useState(params.get("deal") ?? "");
  const [deliveredAt, setDeliveredAt] = useState(today());
  const [tempTag, setTempTag] = useState("");
  const [detail, setDetail] = useState<Rec<TitleReg> | null>(null);
  const [tab, setTab] = useState<"open" | "done">("open");

  const trackedIds = useMemo(() => new Set(trackers.map((t) => t.data.dealId)), [trackers]);
  const eligible = useMemo(() => deals.filter((d) => ["funded", "delivered"].includes(d.status) && !trackedIds.has(d.id)), [deals, trackedIds]);
  const rows = useMemo(() => trackers.filter((t) => (tab === "done" ? !!t.data.completedAt : !t.data.completedAt)).sort((a, b) => a.data.deliveredAt.localeCompare(b.data.deliveredAt)), [trackers, tab]);
  const live = detail ? trackers.find((t) => t.id === detail.id) ?? detail : null;

  const label = (id: string) => { const d = deals.find((x) => x.id === id); const c = customers.find((x) => x.id === d?.customerId); const v = inventory.find((x) => x.id === d?.vehicleId); return { cust: fullName(c), veh: v ? `${vTitle(v)} · #${v.stockNumber}` : "No vehicle", vin: v?.vin || "" }; };

  const start = async () => {
    if (!dealId) return toast.error("Pick a delivered deal");
    try {
      const r = await addRecord<TitleReg>("title_reg", { dealId, deliveredAt: new Date(deliveredAt).toISOString(), titleReceivedAt: null, lienReleaseAt: null, regSubmittedAt: null, platesIssuedAt: null, tempTagExpires: tempTag ? new Date(tempTag).toISOString() : null, notes: "", completedAt: null }, user?.id);
      logActivity("create", "title_reg", r.id, label(dealId).veh, user?.id);
      toast.success("Tracking started"); setOpen(false); setDealId(""); setTempTag(""); setDetail(r);
    } catch (e: any) { toast.error(e.message || "Could not start"); }
  };
  const toggle = async (t: Rec<TitleReg>, key: StepKey) => {
    const patch: Partial<TitleReg> = { [key]: t.data[key] ? null : new Date().toISOString() } as any;
    const next = { ...t.data, ...patch };
    patch.completedAt = STEPS.every((s) => next[s.key]) ? next.completedAt ?? new Date().toISOString() : null;
    try { await updateRecord<TitleReg>("title_reg", t.id, patch); if (patch.completedAt && !t.data.completedAt) { toast.success("Title & registration complete"); logActivity("complete", "title_reg", t.id, undefined, user?.id); } }
    catch (e: any) { toast.error(e.message); }
  };
  const saveNotes = (t: Rec<TitleReg>, notes: string) => notes !== t.data.notes && updateRecord<TitleReg>("title_reg", t.id, { notes }).catch((e) => toast.error(e.message));

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Title & Registration</h1><p className="text-muted-foreground">{trackers.filter((t) => !t.data.completedAt).length} open · {eligible.length} delivered deal{eligible.length === 1 ? "" : "s"} not yet tracked</p></div>
        <Button onClick={() => setOpen(true)} disabled={eligible.length === 0}><Plus className="h-4 w-4 mr-1" /> Track a deal</Button>
      </div>
      <div className="flex gap-2"><Button size="sm" variant={tab === "open" ? "default" : "outline"} onClick={() => setTab("open")}>Open</Button><Button size="sm" variant={tab === "done" ? "default" : "outline"} onClick={() => setTab("done")}>Completed</Button></div>

      {rows.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground"><FileBadge className="h-8 w-8 mx-auto mb-2 opacity-50" />
          {tab === "done" ? "Nothing completed yet." : eligible.length ? "Delivered deals are waiting — click Track a deal to start the title and registration checklist." : <>No open title work. Deals appear here once they are marked <b>funded</b> or <b>delivered</b> on the <Link to="/deals" className="text-primary underline">Deals</Link> page.</>}
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="text-left p-3">Customer / vehicle</th><th className="text-left p-3">Delivered</th><th className="text-right p-3">Days out</th><th className="text-left p-3">Temp tag</th><th className="text-left p-3">Progress</th><th className="p-3"></th></tr></thead>
          <tbody>{rows.map((t) => { const l = label(t.data.dealId); const done = STEPS.filter((s) => t.data[s.key]).length; const days = daysSince(t.data.deliveredAt); const tag = t.data.tempTagExpires ? daysUntil(t.data.tempTagExpires) : null; return (
            <tr key={t.id} className="border-t">
              <td className="p-3"><p className="font-semibold">{l.cust}</p><p className="text-xs text-muted-foreground">{l.veh}</p></td>
              <td className="p-3 whitespace-nowrap">{fmtDate(t.data.deliveredAt)}</td>
              <td className={`p-3 text-right font-semibold ${!t.data.completedAt && days > 30 ? "text-rose-600" : ""}`}>{t.data.completedAt ? `${daysSince(t.data.deliveredAt) - daysSince(t.data.completedAt)}d` : `${days}d`}</td>
              <td className="p-3 whitespace-nowrap">{tag == null ? "—" : tag < 0 ? <Badge className="bg-rose-100 text-rose-800">Expired {-tag}d ago</Badge> : tag <= 7 ? <Badge className="bg-amber-100 text-amber-800">{tag}d left</Badge> : `${tag}d left`}</td>
              <td className="p-3"><div className="flex items-center gap-1">{STEPS.map((s) => <span key={s.key} title={s.label}>{t.data[s.key] ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-muted-foreground/50" />}</span>)}<span className="text-xs text-muted-foreground ml-1">{done}/{STEPS.length}</span></div></td>
              <td className="p-3"><Button size="sm" variant="outline" onClick={() => setDetail(t)}>Open</Button></td>
            </tr>); })}</tbody></table></CardContent></Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Track title & registration</DialogTitle><DialogDescription>Only funded or delivered deals without an existing tracker are listed.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Deal *</Label><Select value={dealId} onValueChange={setDealId}><SelectTrigger><SelectValue placeholder="Select deal" /></SelectTrigger><SelectContent>{eligible.map((d) => { const l = label(d.id); return <SelectItem key={d.id} value={d.id}>{l.cust} · {l.veh}</SelectItem>; })}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Delivered on</Label><Input type="date" value={deliveredAt} onChange={(e) => setDeliveredAt(e.target.value)} /></div>
              <div className="space-y-1"><Label>Temp tag expires</Label><Input type="date" value={tempTag} onChange={(e) => setTempTag(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={start}>Start tracking</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!live} onOpenChange={(o) => !o && setDetail(null)}>
        {live && (() => { const l = label(live.data.dealId); return (
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{l.cust}</DialogTitle><DialogDescription>{l.veh}{l.vin ? ` · VIN ${l.vin}` : ""} · delivered {fmtDate(live.data.deliveredAt)} ({daysSince(live.data.deliveredAt)} days ago)</DialogDescription></DialogHeader>
            <div className="space-y-2">
              {STEPS.map((s) => (
                <button key={s.key} onClick={() => toggle(live, s.key)} className="w-full flex items-center justify-between gap-3 rounded-lg border p-3 text-left hover:bg-muted/50">
                  <span className="flex items-center gap-2">{live.data[s.key] ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Circle className="h-5 w-5 text-muted-foreground/50" />}<span className={live.data[s.key] ? "line-through text-muted-foreground" : "font-medium"}>{s.label}</span></span>
                  <span className="text-xs text-muted-foreground">{live.data[s.key] ? fmtDate(live.data[s.key]!) : "Tap when done"}</span>
                </button>))}
              {live.data.completedAt && <Badge className="bg-emerald-100 text-emerald-800">Completed {fmtDate(live.data.completedAt)}</Badge>}
              <div className="space-y-1 pt-2"><Label>Notes</Label><Textarea rows={4} defaultValue={live.data.notes} onBlur={(e) => saveNotes(live, e.target.value)} placeholder="DMV confirmation #, lienholder contact, what's holding it up…" /></div>
              <div className="flex justify-between pt-2"><Button asChild variant="outline" size="sm"><Link to={`/deals/${live.data.dealId}/jacket`}>Deal jacket</Link></Button><Button size="sm" onClick={() => setDetail(null)}>Close</Button></div>
            </div>
          </DialogContent>); })()}
      </Dialog>
    </div>
  );
}
