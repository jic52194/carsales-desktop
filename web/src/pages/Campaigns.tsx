import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Download, Send, Megaphone, Plug, Users, Sparkles, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { useCollection, fullName, fmtDate, logActivity, type Customer, type Lead, type LeadStage } from "@/lib/store";
import { useInventory, vTitle } from "@/lib/inventory";
import { useRecords, addRecord, updateRecord, removeRecord, type Rec } from "@/lib/records";
import { useAuth } from "@/lib/auth";
import { useGhlStatus } from "@/lib/ghl";
import { askAi, aiErrorMessage } from "@/lib/ai";
import { downloadCsv, stamp } from "@/lib/csv";
import type { Template } from "@/pages/TextingTemplates";

export interface Campaign {
  name: string; channel: "sms" | "email";
  audience: { source: string; stage: string; lastActivityDays: number | null; vehicleId: string };
  templateId: string; scheduledAt: string; status: "draft" | "scheduled" | "sent"; notes: string;
}
const STAGES: LeadStage[] = ["new", "contacted", "appointment", "negotiating", "sold", "lost"];
const DAY = 86400000;
const blank: Campaign = { name: "", channel: "sms", audience: { source: "", stage: "", lastActivityDays: null, vehicleId: "" }, templateId: "", scheduledAt: "", status: "draft", notes: "" };

/** Customers matching the audience filter: based on their leads (source / stage / vehicle / idle days). Customers with no lead match only when no lead filters are set. */
export function buildAudience(a: Campaign["audience"], customers: Customer[], leads: Lead[]) {
  const hasLeadFilter = !!(a.source || a.stage || a.vehicleId);
  const cutoff = a.lastActivityDays != null ? Date.now() - a.lastActivityDays * DAY : null;
  const match = new Set<string>();
  for (const l of leads) {
    if (a.source && l.source !== a.source) continue;
    if (a.stage && l.stage !== a.stage) continue;
    if (a.vehicleId && l.vehicleId !== a.vehicleId) continue;
    if (cutoff != null && new Date(l.lastActivityAt || l.createdAt).getTime() > cutoff) continue;
    match.add(l.customerId);
  }
  if (!hasLeadFilter) for (const c of customers) { if (leads.some((l) => l.customerId === c.id)) continue; if (cutoff != null && new Date(c.updatedAt || c.createdAt).getTime() > cutoff) continue; match.add(c.id); }
  return customers.filter((c) => match.has(c.id));
}

export default function Campaigns() {
  const { user, hasPermission } = useAuth();
  const canEdit = hasPermission(["manager", "web"]);
  const campaigns = useRecords<Campaign>("campaign");
  const templates = useRecords<Template>("template");
  const customers = useCollection("customers");
  const leads = useCollection("leads");
  const inventory = useInventory();
  const ghl = useGhlStatus().connected;
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyReq, setCopyReq] = useState("");
  const [copyOut, setCopyOut] = useState("");
  const [copyErr, setCopyErr] = useState<string | null>(null);
  const [copyBusy, setCopyBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Rec<Campaign> | null>(null);
  const [form, setForm] = useState<Campaign>({ ...blank });
  const [toDelete, setToDelete] = useState<Rec<Campaign> | null>(null);


  const sources = useMemo(() => Array.from(new Set(leads.map((l) => l.source).filter(Boolean) as string[])).sort(), [leads]);
  const formAudience = useMemo(() => buildAudience(form.audience, customers, leads), [form.audience, customers, leads]);
  const audienceOf = (c: Campaign) => buildAudience(c.audience, customers, leads);
  const reachable = (c: Campaign, people: Customer[]) => people.filter((p) => (c.channel === "sms" ? p.phone : p.email)).length;

  const startNew = () => { setEditing(null); setForm({ ...blank, audience: { ...blank.audience } }); setOpen(true); };
  const startEdit = (c: Rec<Campaign>) => { setEditing(c); setForm({ ...c.data, audience: { ...c.data.audience } }); setOpen(true); };
  const save = async () => {
    if (!form.name.trim()) return toast.error("Give the campaign a name");
    const data: Campaign = { ...form, status: form.scheduledAt && form.status === "draft" ? "scheduled" : form.status };
    try {
      if (editing) { await updateRecord<Campaign>("campaign", editing.id, data); toast.success("Campaign updated"); }
      else { const r = await addRecord<Campaign>("campaign", data, user?.id); logActivity("create", "campaign", r.id, data.name, user?.id); toast.success("Campaign saved"); }
      setOpen(false);
    } catch (e: any) { toast.error(e.message || "Could not save"); }
  };
  const del = async () => { if (!toDelete) return; try { await removeRecord("campaign", toDelete.id); toast.success("Deleted"); } catch (e: any) { toast.error(e.message); } setToDelete(null); };
  const exportCsv = (c: Rec<Campaign>) => {
    const people = audienceOf(c.data);
    if (!people.length) return toast.error("Audience is empty");
    const lead = (id: string) => leads.find((l) => l.customerId === id);
    downloadCsv(`${c.data.name.replace(/\W+/g, "-").toLowerCase()}-audience-${stamp()}`, people.map((p) => { const l = lead(p.id); const v = l?.vehicleId ? inventory.find((x) => x.id === l.vehicleId) : undefined; return { first_name: p.firstName, last_name: p.lastName, phone: p.phone ?? "", email: p.email ?? "", source: l?.source ?? p.source ?? "", stage: l?.stage ?? "", vehicle: v ? vTitle(v) : "", last_activity: l?.lastActivityAt ?? "" }; }));
    logActivity("export", "campaign", c.id, `${people.length} contacts`, user?.id);
  };
  const describe = (c: Campaign) => { const a = c.audience; const v = a.vehicleId ? inventory.find((x) => x.id === a.vehicleId) : undefined; return `${c.channel === "sms" ? "Text" : "Email"} campaign "${c.name}" to ${[a.stage && `${a.stage} leads`, a.source && `from ${a.source}`, a.lastActivityDays != null && `idle ${a.lastActivityDays}+ days`, v && `interested in the ${vTitle(v)}`].filter(Boolean).join(", ") || "all customers"}.${c.notes ? ` Notes: ${c.notes}` : ""}`; };
  const openCopy = (c?: Campaign) => { setCopyReq(c ? describe(c) : ""); setCopyOut(""); setCopyErr(null); setCopyOpen(true); };
  const writeCopy = async () => {
    if (!copyReq.trim()) return toast.error("Describe the campaign first");
    setCopyBusy(true); setCopyErr(null);
    try { const t = await askAi("campaign_copy", { messages: [{ role: "user", content: copyReq.trim() }] }); setCopyOut(t); if (!t) setCopyErr("The assistant returned nothing — try rewording the request."); }
    catch (e) { setCopyErr(aiErrorMessage(e)); } finally { setCopyBusy(false); }
  };
  const setA = (k: keyof Campaign["audience"], v: any) => setForm({ ...form, audience: { ...form.audience, [k]: v } });
  const tplFor = (id: string) => templates.find((t) => t.id === id);
  const statusColor = (s: Campaign["status"]) => (s === "sent" ? "bg-emerald-100 text-emerald-800" : s === "scheduled" ? "bg-blue-100 text-blue-800" : "bg-muted text-muted-foreground");

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Campaigns</h1><p className="text-muted-foreground">Plan text and email blasts to real segments of your customers and leads.</p></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => openCopy()}><Sparkles className="h-4 w-4 mr-1" /> Write campaign copy</Button>
          {canEdit && <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" /> New campaign</Button>}
        </div>
      </div>

      <div className={`rounded-lg border p-3 text-sm flex items-start gap-2 ${ghl ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}>
        <Plug className="h-4 w-4 mt-0.5 shrink-0" />
        <p>{ghl ? <>GoHighLevel is connected. Bulk sends run as a GoHighLevel workflow or campaign (so opt-outs, throttling and A2P compliance are handled there): export the audience CSV, import it in GHL → Contacts with a tag, and send to that tag. One-to-one texts go straight from the <Link to="/inbox" className="underline font-semibold">Inbox</Link>.</> : <>Build the audience here and export it as CSV. Once GoHighLevel is connected in <Link to="/settings" className="underline font-semibold">Settings → Connections</Link>, bulk sends run as a GHL workflow/campaign and one-to-one texts go out from the dealership number.</>}</p>
      </div>

      {campaigns.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground"><Megaphone className="h-8 w-8 mx-auto mb-2 opacity-40" />No campaigns yet. {canEdit ? "Create one — for example, every lead with no activity in 14 days, by text." : "Managers and BDC can create campaigns."}</CardContent></Card>}
      <div className="grid md:grid-cols-2 gap-4">
        {campaigns.map((c) => { const people = audienceOf(c.data); const ok = reachable(c.data, people); const tpl = tplFor(c.data.templateId); const a = c.data.audience; return (
          <Card key={c.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div><CardTitle className="text-base">{c.data.name}</CardTitle><CardDescription>{c.data.channel === "sms" ? "Text" : "Email"} · {tpl ? tpl.data.name : "no template"}{c.data.scheduledAt ? ` · ${fmtDate(c.data.scheduledAt)}` : ""}</CardDescription></div>
                <Badge variant="outline" className={statusColor(c.data.status)}>{c.data.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-1 text-xs">
                {a.source && <Badge variant="secondary">source: {a.source}</Badge>}{a.stage && <Badge variant="secondary">stage: {a.stage}</Badge>}
                {a.lastActivityDays != null && <Badge variant="secondary">idle {a.lastActivityDays}+ days</Badge>}
                {a.vehicleId && <Badge variant="secondary">{inventory.find((v) => v.id === a.vehicleId) ? vTitle(inventory.find((v) => v.id === a.vehicleId)!) : "vehicle"}</Badge>}
                {!a.source && !a.stage && a.lastActivityDays == null && !a.vehicleId && <Badge variant="secondary">everyone</Badge>}
              </div>
              <p className="flex items-center gap-1"><Users className="h-4 w-4" /> <strong>{people.length}</strong> in audience · {ok} with {c.data.channel === "sms" ? "a phone" : "an email"}</p>
              {c.data.notes && <p className="text-muted-foreground whitespace-pre-wrap">{c.data.notes}</p>}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => exportCsv(c)} disabled={!people.length}><Download className="h-4 w-4 mr-1" /> Export audience CSV</Button>
                <Button size="sm" variant="outline" onClick={() => openCopy(c.data)}><Sparkles className="h-4 w-4 mr-1" /> AI copy</Button>
                <Button size="sm" disabled title={ghl ? "Bulk sends run as a GoHighLevel workflow/campaign — export the audience CSV and send from GHL" : "Connect GoHighLevel, then send bulk campaigns from a GHL workflow"}><Send className="h-4 w-4 mr-1" /> Send</Button>
                {canEdit && <><Button size="sm" variant="ghost" onClick={() => startEdit(c)}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="ghost" onClick={() => setToDelete(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button></>}
              </div>
            </CardContent>
          </Card>); })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "Edit campaign" : "New campaign"}</DialogTitle><DialogDescription>Audience count updates live from your customers and leads.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Aging leads revival" /></div>
              <div className="space-y-1"><Label>Channel</Label><Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v as any })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sms">Text (SMS)</SelectItem><SelectItem value="email">Email</SelectItem></SelectContent></Select></div>
            </div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground pt-1">Audience</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Lead source</Label><Select value={form.audience.source || "any"} onValueChange={(v) => setA("source", v === "any" ? "" : v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="any">Any</SelectItem>{sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Lead stage</Label><Select value={form.audience.stage || "any"} onValueChange={(v) => setA("stage", v === "any" ? "" : v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="any">Any</SelectItem>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>No activity for (days)</Label><Input type="number" min={0} value={form.audience.lastActivityDays ?? ""} onChange={(e) => setA("lastActivityDays", e.target.value === "" ? null : Number(e.target.value))} placeholder="Any" /></div>
              <div className="space-y-1"><Label>Vehicle interest</Label><Select value={form.audience.vehicleId || "any"} onValueChange={(v) => setA("vehicleId", v === "any" ? "" : v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="any">Any</SelectItem>{inventory.map((v) => <SelectItem key={v.id} value={v.id}>{vTitle(v)} · #{v.stockNumber}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <p className="text-sm rounded-md bg-muted p-2"><strong>{formAudience.length}</strong> customers match · {reachable(form, formAudience)} reachable by {form.channel === "sms" ? "phone" : "email"}{formAudience.length > 0 && formAudience.length <= 5 ? ` — ${formAudience.map(fullName).join(", ")}` : ""}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Template</Label><Select value={form.templateId || "none"} onValueChange={(v) => setForm({ ...form, templateId: v === "none" ? "" : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{templates.filter((t) => t.data.channel === form.channel).map((t) => <SelectItem key={t.id} value={t.id}>{t.data.name}</SelectItem>)}</SelectContent></Select>{templates.length === 0 && <p className="text-xs text-muted-foreground">Create one under <Link className="underline" to="/templates">Templates</Link>.</p>}</div>
              <div className="space-y-1"><Label>Scheduled date</Label><Input type="date" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></div>
            </div>
            {editing && <div className="space-y-1"><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="sent">Sent (sent outside the app)</SelectItem></SelectContent></Select></div>}
            <div className="space-y-1"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>{editing ? "Save" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Write campaign copy</DialogTitle><DialogDescription>Describe who it's for and the offer; the assistant writes an SMS (with opt-out line) and a matching email using your real inventory and dealership details.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Request</Label><Textarea rows={3} value={copyReq} onChange={(e) => setCopyReq(e.target.value)} placeholder="e.g. Leads idle 14+ days who looked at AWD SUVs — invite them back for a weekend test drive" /></div>
            <Button onClick={writeCopy} disabled={copyBusy}>{copyBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />} Write it</Button>
            {copyErr && <p className="text-sm rounded-md border border-amber-300 bg-amber-50 text-amber-900 p-2">{copyErr}</p>}
            {copyOut && <div className="space-y-1"><Label>Draft (edit freely)</Label><Textarea rows={10} value={copyOut} onChange={(e) => setCopyOut(e.target.value)} /></div>}
          </div>
          <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setCopyOpen(false)}>Close</Button>{copyOut && <Button onClick={() => { navigator.clipboard.writeText(copyOut); toast.success("Copied — paste it into your GHL campaign or a template"); }}><Copy className="h-4 w-4 mr-1" /> Copy</Button>}</DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete "{toDelete?.data.name}"?</AlertDialogTitle><AlertDialogDescription>This removes the plan only; customers and leads are untouched.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={del}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
