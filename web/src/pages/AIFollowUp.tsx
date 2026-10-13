import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Sparkles, MessageSquare, Mail, CheckCircle2, AlarmClock, Loader2, Flame, Clock, Phone } from "lucide-react";
import { toast } from "sonner";
import { useCollection, insert, update, get, fullName, fmtDateTime, logActivity, type Lead } from "@/lib/store";
import { useInventory, vTitle } from "@/lib/inventory";
import { useAuth, useUsers } from "@/lib/auth";
import { askAi, aiErrorMessage } from "@/lib/ai";
import { useGhlStatus, ghlErrorMessage } from "@/lib/ghl";
import { deliverMessage } from "@/components/ComposeMessage";

type Urgency = "now" | "today" | "week";
const DAY = 86400000;
const ageDays = (iso?: string) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / DAY) : 0);

export default function AIFollowUp() {
  const { user } = useAuth();
  const users = useUsers();
  const leads = useCollection("leads");
  const customers = useCollection("customers");
  const inventory = useInventory();
  const [staleDays, setStaleDays] = useState(3);
  const [mine, setMine] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"follow_up_text" | "follow_up_email">("follow_up_text");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);
  const ghl = useGhlStatus();

  const queue = useMemo(() => {
    const open = leads.filter((l) => !["sold", "lost"].includes(l.stage) && (!mine || l.assignedTo === user?.id));
    const items = open.map((l) => {
      const idle = ageDays(l.lastActivityAt || l.createdAt);
      const urgency: Urgency | null = l.stage === "new" ? "now" : idle >= staleDays * 2 ? "today" : idle >= staleDays ? "week" : null;
      return { lead: l, idle, urgency };
    }).filter((x) => x.urgency !== null) as { lead: Lead; idle: number; urgency: Urgency }[];
    return items.sort((a, b) => (a.urgency === b.urgency ? b.idle - a.idle : ["now", "today", "week"].indexOf(a.urgency) - ["now", "today", "week"].indexOf(b.urgency)));
  }, [leads, staleDays, mine, user?.id]);
  const groups: { key: Urgency; label: string; icon: JSX.Element; hint: string }[] = [
    { key: "now", label: "Never contacted", icon: <Flame className="h-4 w-4 text-red-600" />, hint: "New leads with no outreach yet" },
    { key: "today", label: "Going cold", icon: <AlarmClock className="h-4 w-4 text-amber-600" />, hint: `No activity for ${staleDays * 2}+ days` },
    { key: "week", label: "Due for a touch", icon: <Clock className="h-4 w-4 text-blue-600" />, hint: `No activity for ${staleDays}+ days` },
  ];

  const sel = queue.find((q) => q.lead.id === selectedId) ?? null;
  const customer = sel ? get("customers", sel.lead.customerId) : undefined;
  const vehicle = sel?.lead.vehicleId ? inventory.find((v) => v.id === sel.lead.vehicleId) : undefined;
  const pick = (id: string) => { setSelectedId(id); setDraft(""); setSubject(""); setAiNote(null); };

  const generate = async () => {
    if (!sel) return;
    setBusy(true); setAiNote(null);
    try {
      let text = await askAi(mode, { context: { customerId: sel.lead.customerId, vehicleId: sel.lead.vehicleId } });
      const m = mode === "follow_up_email" ? text.match(/^\s*subject:\s*(.+)$/im) : null;
      if (m) { setSubject(m[1].trim()); text = text.replace(m[0], "").trim(); }
      setDraft(text);
      if (!text) setAiNote("The assistant returned an empty draft. Try again or write it yourself below.");
    } catch (e: any) {
      setAiNote(`${aiErrorMessage(e)} You can still write the message below.`);
    } finally { setBusy(false); }
  };
  const send = async () => {
    if (!sel || !customer || !draft.trim()) return;
    const channel = mode === "follow_up_text" ? "sms" : "email";
    setSending(true);
    try {
      const via = await deliverMessage({ customer, channel, body: draft, subject: subject || (vehicle ? `About the ${vTitle(vehicle)}` : "Following up"), ghlConnected: ghl.connected, userId: user?.id, activity: { entity: "lead", id: sel.lead.id } });
      if (via === "ghl") toast.success(channel === "sms" ? "Text sent" : "Email sent");
      if (sel.lead.stage === "new") await update("leads", sel.lead.id, { stage: "contacted" }).catch(() => {});
    } catch (e) { toast.error(ghlErrorMessage(e)); } finally { setSending(false); }
  };
  const markContacted = async () => {
    if (!sel) return;
    try {
      await update("leads", sel.lead.id, { stage: sel.lead.stage === "new" ? "contacted" : sel.lead.stage });
      logActivity("follow_up", "lead", sel.lead.id, draft ? `${mode === "follow_up_text" ? "Text" : "Email"}: ${draft.slice(0, 140)}` : "Contacted", user?.id);
      toast.success("Marked contacted"); setSelectedId(null); setDraft("");
    } catch (e: any) { toast.error(e.message); }
  };
  const snooze = async (days: number) => {
    if (!sel || !customer) return;
    try {
      await insert("tasks", { title: `Follow up with ${fullName(customer)}${vehicle ? ` — ${vTitle(vehicle)}` : ""}`, dueAt: new Date(Date.now() + days * DAY).toISOString(), status: "open", priority: "normal", assignedTo: sel.lead.assignedTo || user?.id, relatedType: "lead", relatedId: sel.lead.id } as any);
      logActivity("snooze", "lead", sel.lead.id, `Snoozed ${days}d`, user?.id);
      toast.success(`Task created for ${days === 1 ? "tomorrow" : `${days} days out`}`); setSelectedId(null);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">AI Follow-Up</h1><p className="text-muted-foreground">Leads that need a touch, with Claude drafting the message from the real customer and vehicle.</p></div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant={mine ? "default" : "outline"} onClick={() => setMine(!mine)}>My leads</Button>
          <Select value={String(staleDays)} onValueChange={(v) => setStaleDays(Number(v))}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger><SelectContent>{[1, 2, 3, 5, 7].map((d) => <SelectItem key={d} value={String(d)}>Stale after {d}d</SelectItem>)}</SelectContent></Select>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {queue.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground"><CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-600" />Nothing waiting. {leads.length === 0 ? <>No leads yet — add one from <Link className="text-primary underline" to="/leads">Leads</Link>.</> : "Every open lead has recent activity."}</CardContent></Card>}
          {groups.map((g) => { const items = queue.filter((q) => q.urgency === g.key); if (!items.length) return null; return (
            <div key={g.key}>
              <div className="flex items-center gap-2 mb-2">{g.icon}<p className="text-xs font-bold uppercase tracking-wide">{g.label}</p><Badge variant="secondary">{items.length}</Badge><span className="text-xs text-muted-foreground">{g.hint}</span></div>
              <div className="space-y-2">
                {items.map(({ lead, idle }) => { const c = get("customers", lead.customerId); const v = lead.vehicleId ? inventory.find((x) => x.id === lead.vehicleId) : undefined; const rep = users.find((u) => u.id === lead.assignedTo); return (
                  <button key={lead.id} onClick={() => pick(lead.id)} className={`w-full text-left rounded-lg border p-3 hover:shadow-sm transition-shadow ${selectedId === lead.id ? "border-primary bg-primary/5" : "bg-background"}`}>
                    <div className="flex justify-between gap-2"><p className="font-semibold text-sm">{fullName(c)}</p><span className="text-xs text-muted-foreground">{idle === 0 ? "today" : `${idle}d idle`}</span></div>
                    <p className="text-xs text-muted-foreground truncate">{v ? vTitle(v) : "No vehicle"} · {lead.source || "—"}{rep ? ` · ${rep.fullName}` : ""}</p>
                  </button>); })}
              </div>
            </div>); })}
        </div>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{sel && customer ? <Link to={`/customers/${customer.id}`} className="hover:underline">{fullName(customer)}</Link> : "Draft"}</CardTitle>
            <CardDescription>{sel ? <>{vehicle ? vTitle(vehicle) : "No vehicle of interest"} · stage {sel.lead.stage} · last activity {fmtDateTime(sel.lead.lastActivityAt || sel.lead.createdAt)}</> : "Select a lead to draft a follow-up."}</CardDescription>
          </CardHeader>
          {sel && customer && (
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {customer.phone ? <a className="inline-flex items-center gap-1 text-primary underline" href={`tel:${customer.phone}`}><Phone className="h-3 w-3" />{customer.phone}</a> : <span className="text-muted-foreground">No phone</span>}
                {customer.email ? <a className="inline-flex items-center gap-1 text-primary underline" href={`mailto:${customer.email}`}><Mail className="h-3 w-3" />{customer.email}</a> : <span className="text-muted-foreground">No email</span>}
              </div>
              {sel.lead.notes && <p className="rounded bg-muted p-2 text-sm whitespace-pre-wrap">{sel.lead.notes}</p>}
              <div className="flex flex-wrap items-center gap-2">
                <Select value={mode} onValueChange={(v) => setMode(v as any)}><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="follow_up_text">Text message</SelectItem><SelectItem value="follow_up_email">Email</SelectItem></SelectContent></Select>
                <Button onClick={generate} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />} Draft with AI</Button>
              </div>
              {aiNote && <p className="text-sm rounded-md border border-amber-300 bg-amber-50 text-amber-900 p-2">{aiNote}</p>}
              {mode === "follow_up_email" && <div className="space-y-1"><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={vehicle ? `About the ${vTitle(vehicle)}` : "Following up"} /></div>}
              <div className="space-y-1"><Label>Message (edit before sending)</Label><Textarea rows={8} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={busy ? "Drafting…" : "Draft with AI, or type your own follow-up here."} /></div>
              <div className="flex flex-wrap gap-2">
                {mode === "follow_up_text"
                  ? <Button onClick={send} disabled={sending || !draft.trim() || !customer.phone} title={customer.phone ? "" : "No phone number on file"}>{sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-1" />} Send text</Button>
                  : <Button onClick={send} disabled={sending || !draft.trim() || !customer.email} title={customer.email ? "" : "No email on file"}>{sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Mail className="h-4 w-4 mr-1" />} Send email</Button>}
                <Button variant="secondary" onClick={markContacted}><CheckCircle2 className="h-4 w-4 mr-1" /> Mark contacted</Button>
                <Button variant="outline" onClick={() => snooze(1)}><AlarmClock className="h-4 w-4 mr-1" /> Snooze 1d</Button>
                <Button variant="outline" onClick={() => snooze(3)}>Snooze 3d</Button>
              </div>
              <p className="text-xs text-muted-foreground">{ghl.connected ? "Send goes out from the dealership's GoHighLevel number/email and shows in the Inbox." : <>Send opens your phone's messaging app or mail client and logs it. <Link to="/settings" className="underline text-primary">Connect GoHighLevel</Link> to send from the dealership number.</>} Mark contacted moves new leads to Contacted and logs the touch. Snooze creates a task on the lead's rep.</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
