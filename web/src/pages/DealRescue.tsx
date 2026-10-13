import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { LifeBuoy, ListPlus, Calculator, XCircle, Sparkles, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCollection, insert, update, fullName, money, fmtDate, logActivity, get, type Deal, type Lead } from "@/lib/store";
import { useInventory, vTitle } from "@/lib/inventory";
import { useAuth, useUsers } from "@/lib/auth";
import { askAi, AiNotConfigured } from "@/lib/ai";

const DAY = 86400000;
const OPEN: Deal["status"][] = ["working", "pending_approval", "approved"];
const ageDays = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
/** A thing at risk: a stalled deal or a lead stuck in negotiating. */
interface Risk { id: string; kind: "deal" | "lead"; customerId: string; vehicleId?: string; ownerId?: string; label: string; days: number; amount?: number; dealId?: string; leadId?: string }

export default function DealRescue() {
  const { user } = useAuth();
  const users = useUsers();
  const deals = useCollection("deals");
  const leads = useCollection("leads");
  const customers = useCollection("customers");
  const inventory = useInventory();
  const [days, setDays] = useState("3");
  const [dead, setDead] = useState<Risk | null>(null);
  const [reason, setReason] = useState("");
  const [draftFor, setDraftFor] = useState<Risk | null>(null);
  const [draft, setDraft] = useState(""); const [aiNote, setAiNote] = useState(""); const [aiBusy, setAiBusy] = useState(false);
  const n = Number(days);

  const risks = useMemo<Risk[]>(() => {
    const d = deals.filter((x) => OPEN.includes(x.status) && ageDays(x.updatedAt) >= n).map<Risk>((x) => ({ id: `d-${x.id}`, kind: "deal", dealId: x.id, customerId: x.customerId, vehicleId: x.vehicleId, ownerId: x.salespersonId, label: x.status.replace("_", " "), days: ageDays(x.updatedAt), amount: x.sellingPrice }));
    const l = leads.filter((x: Lead) => x.stage === "negotiating" && ageDays(x.lastActivityAt || x.updatedAt) >= n && !d.some((r) => r.customerId === x.customerId)).map<Risk>((x) => ({ id: `l-${x.id}`, kind: "lead", leadId: x.id, customerId: x.customerId, vehicleId: x.vehicleId, ownerId: x.assignedTo, label: "negotiating", days: ageDays(x.lastActivityAt || x.updatedAt) }));
    return [...d, ...l].sort((a, b) => b.days - a.days);
  }, [deals, leads, n]);
  const deadRecent = useMemo(() => deals.filter((x) => x.status === "dead" && ageDays(x.updatedAt) <= 30).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [deals]);
  const cust = (id: string) => fullName(customers.find((c) => c.id === id));
  const veh = (id?: string) => { const v = id ? inventory.find((x) => x.id === id) : undefined; return v ? vTitle(v) : "No vehicle"; };
  const who = (id?: string) => users.find((u) => u.id === id)?.fullName || "Unassigned";
  const atRiskValue = risks.reduce((a, r) => a + (r.amount || 0), 0);

  const followUp = async (r: Risk) => {
    try {
      const t = await insert("tasks", { title: `Rescue: ${cust(r.customerId)} — ${veh(r.vehicleId)}`, status: "open", priority: "high", dueAt: new Date(Date.now() + 4 * 36e5).toISOString(), assignedTo: r.ownerId || user?.id, relatedType: r.kind, relatedId: r.dealId || r.leadId, notes: `${r.label} for ${r.days} days with no activity` } as any);
      logActivity("follow_up", r.kind, r.dealId || r.leadId, "rescue task created", user?.id);
      if (r.dealId) await update("deals", r.dealId, { notes: `${get("deals", r.dealId)?.notes ? get("deals", r.dealId)!.notes + "\n" : ""}${fmtDate(new Date().toISOString())}: rescue task created` } as any);
      toast.success("Follow-up task created", { description: `Due in 4 hours · ${who(t.assignedTo)}` });
    } catch (e: any) { toast.error(e.message || "Could not create task"); }
  };
  const markDead = async () => {
    if (!dead) return;
    if (!reason.trim()) return toast.error("Give a reason — it's what makes the dead-deal report useful");
    try {
      const stamp = `${fmtDate(new Date().toISOString())} dead: ${reason.trim()}`;
      if (dead.dealId) { const prev = get("deals", dead.dealId)?.notes; await update("deals", dead.dealId, { status: "dead", notes: prev ? `${prev}\n${stamp}` : stamp } as any); logActivity("status", "deal", dead.dealId, `dead — ${reason.trim()}`, user?.id); }
      if (dead.leadId) { const prev = get("leads", dead.leadId)?.notes; await update("leads", dead.leadId, { stage: "lost", notes: prev ? `${prev}\n${stamp}` : stamp }); logActivity("status", "lead", dead.leadId, `lost — ${reason.trim()}`, user?.id); }
      toast.success("Marked dead"); setDead(null); setReason("");
    } catch (e: any) { toast.error(e.message || "Could not update"); }
  };
  const openDraft = async (r: Risk) => {
    setDraftFor(r); setDraft(""); setAiNote(""); setAiBusy(true);
    try { setDraft(await askAi("follow_up_text", { context: { customerId: r.customerId, vehicleId: r.vehicleId }, messages: [{ role: "user", content: `This ${r.kind} has been ${r.label} for ${r.days} days with no activity. Write a short, warm text to re-open the conversation and ask for one concrete next step.` }] })); }
    catch (e: any) { setAiNote(e instanceof AiNotConfigured ? "AI assistant isn't set up yet — add the Anthropic key in Settings. You can still write the message below." : e.message || "AI request failed"); }
    finally { setAiBusy(false); }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div><h1 className="text-3xl font-black">Deal Rescue</h1><p className="text-muted-foreground">Deals and negotiations that went quiet — before they go cold.</p></div>
        <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">No activity for</span><Select value={days} onValueChange={setDays}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent>{["2", "3", "5", "7", "14"].map((d) => <SelectItem key={d} value={d}>{d} days</SelectItem>)}</SelectContent></Select></div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">At risk</p><p className="text-2xl font-black">{risks.length}</p><p className="text-xs text-muted-foreground">{risks.filter((r) => r.kind === "deal").length} deals · {risks.filter((r) => r.kind === "lead").length} negotiations</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Selling price at risk</p><p className="text-2xl font-black">{money(atRiskValue)}</p><p className="text-xs text-muted-foreground">on stalled deals</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Died last 30 days</p><p className="text-2xl font-black">{deadRecent.length}</p><p className="text-xs text-muted-foreground">{deadRecent.filter((d) => d.notes).length} with a reason</p></CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><LifeBuoy className="h-4 w-4 text-primary" /> Needs a push</CardTitle><CardDescription>Open deals and negotiating leads untouched for {n}+ days, oldest first</CardDescription></CardHeader><CardContent className="divide-y">
        {risks.length === 0 && <p className="text-sm text-muted-foreground py-3">Nothing has gone quiet for {n} days. {deals.filter((d) => OPEN.includes(d.status)).length} deal{deals.filter((d) => OPEN.includes(d.status)).length === 1 ? "" : "s"} currently working.</p>}
        {risks.map((r) => (
          <div key={r.id} className="py-3 flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold"><Link to={`/customers/${r.customerId}`} className="hover:text-primary">{cust(r.customerId)}</Link> <Badge variant={r.days >= n * 2 ? "destructive" : "secondary"} className="ml-1 capitalize">{r.label} · {r.days}d</Badge></p>
              <p className="text-xs text-muted-foreground">{veh(r.vehicleId)}{r.amount ? ` · ${money(r.amount)}` : ""} · {who(r.ownerId)}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" onClick={() => followUp(r)}><ListPlus className="h-3.5 w-3.5 mr-1" /> Task</Button>
              <Button size="sm" variant="outline" asChild><Link to={r.dealId ? `/desking?deal=${r.dealId}` : `/desking?customer=${r.customerId}${r.vehicleId ? `&vehicle=${r.vehicleId}` : ""}&lead=${r.leadId}`}><Calculator className="h-3.5 w-3.5 mr-1" /> Desk</Link></Button>
              <Button size="sm" variant="outline" onClick={() => openDraft(r)}><Sparkles className="h-3.5 w-3.5 mr-1" /> Draft text</Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { setDead(r); setReason(""); }}><XCircle className="h-3.5 w-3.5 mr-1" /> Dead</Button>
            </div>
          </div>
        ))}
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="text-base">Dead deals — last 30 days</CardTitle><CardDescription>Reasons come from the deal notes. Patterns here are your training agenda.</CardDescription></CardHeader><CardContent className="divide-y">
        {deadRecent.length === 0 && <p className="text-sm text-muted-foreground py-3">No deals marked dead in the last 30 days.</p>}
        {deadRecent.map((d) => <div key={d.id} className="py-2 flex flex-col sm:flex-row sm:items-start justify-between gap-2 text-sm"><div><p className="font-medium"><Link to={`/customers/${d.customerId}`} className="hover:text-primary">{cust(d.customerId)}</Link> · {veh(d.vehicleId)}</p><p className="text-xs text-muted-foreground whitespace-pre-line">{d.notes || "No reason recorded"}</p></div><p className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(d.updatedAt)} · {who(d.salespersonId)}</p></div>)}
      </CardContent></Card>

      <Dialog open={!!dead} onOpenChange={(o) => !o && setDead(null)}><DialogContent><DialogHeader><DialogTitle>Mark dead — {dead ? cust(dead.customerId) : ""}</DialogTitle><DialogDescription>{dead?.kind === "deal" ? "Sets the deal to dead and" : "Sets the lead to lost and"} records why in the notes.</DialogDescription></DialogHeader>
        <div className="space-y-1"><Label>Reason</Label><Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Bought elsewhere / couldn't get financed / payment too high / went silent…" /></div>
        <DialogFooter><Button variant="outline" onClick={() => setDead(null)}>Cancel</Button><Button variant="destructive" onClick={markDead}>Mark dead</Button></DialogFooter>
      </DialogContent></Dialog>

      <Dialog open={!!draftFor} onOpenChange={(o) => !o && setDraftFor(null)}><DialogContent><DialogHeader><DialogTitle>Rescue text — {draftFor ? cust(draftFor.customerId) : ""}</DialogTitle><DialogDescription>{veh(draftFor?.vehicleId)} · copy it into your texting app or GHL.</DialogDescription></DialogHeader>
        {aiBusy ? <p className="text-sm text-muted-foreground flex items-center gap-2 py-4"><Loader2 className="h-4 w-4 animate-spin" /> Drafting from this customer's history…</p> : (<>
          {aiNote && <p className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300 rounded p-2">{aiNote}</p>}
          <Textarea rows={6} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write your message…" />
        </>)}
        <DialogFooter><Button variant="outline" onClick={() => setDraftFor(null)}>Close</Button><Button disabled={!draft.trim()} onClick={() => { navigator.clipboard?.writeText(draft).then(() => toast.success("Copied")).catch(() => toast.error("Copy failed")); }}><Copy className="h-4 w-4 mr-1" /> Copy</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
