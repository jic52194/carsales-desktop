// Automations — the follow-up plays that get customers in the door, rescue deals, nurture long-term and keep buyers
// for life. Plays run in the cloud every 5 minutes (seq-run), text through the dealership's GoHighLevel number,
// respect quiet hours and STOP, and stop by themselves the moment a customer replies, books or buys.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, ChevronDown, Clock, Cloud, ListTodo, Mail, MessageSquare, Sparkles, Zap, Loader2, Square, AlertTriangle, CheckCircle2, Users, Send, Reply, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { PLAYS, PLAY_GROUPS, RECOMMENDED, playFor, fmtAt, type AutomationSettings, type StepKind } from "@/lib/plays";
import { useTenant, saveTenantOverrides } from "@/lib/tenant";
import { useAuth, useUsers } from "@/lib/auth";
import { useCollection, fullName, fmtDateTime } from "@/lib/store";
import { useRecords } from "@/lib/records";
import { useGhlStatus } from "@/lib/ghl";
import { useEnrollments, stopEnrollment, STATUS_LABEL, type Enrollment } from "@/lib/automations";

const KIND: Record<StepKind, { icon: any; label: string }> = { sms: { icon: MessageSquare, label: "Text" }, email: { icon: Mail, label: "Email" }, task: { icon: ListTodo, label: "Task" }, ai: { icon: Sparkles, label: "AI text" } };
const playName = (k: string) => PLAYS.find((p) => p.key === k)?.name.split(" — ")[0] ?? k;
const rel = (iso?: string | null) => {
  if (!iso) return "—"; const ms = new Date(iso).getTime() - Date.now(); const a = Math.abs(ms);
  const t = a < 36e5 ? `${Math.max(1, Math.round(a / 6e4))} min` : a < 864e5 ? `${Math.round(a / 36e5)} h` : `${Math.round(a / 864e5)} d`;
  return ms >= 0 ? `in ${t}` : `${t} ago`;
};

export default function Automations() {
  const tenant = useTenant();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission(["manager"]);
  const ghl = useGhlStatus();
  const [s, setS] = useState<AutomationSettings>(() => JSON.parse(JSON.stringify(tenant.automations ?? {})));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const edit = (fn: (x: AutomationSettings) => void) => { setS((cur) => { const n: AutomationSettings = JSON.parse(JSON.stringify(cur)); fn(n); return n; }); setDirty(true); };
  const setPlay = (key: string, patch: { enabled?: boolean }) => edit((n) => { n.plays = n.plays ?? {}; n.plays[key] = { ...(n.plays[key] ?? {}), ...patch }; });
  const setStep = (key: string, id: string, patch: { off?: boolean; body?: string; subject?: string }) => edit((n) => { n.plays = n.plays ?? {}; const p = (n.plays[key] = n.plays[key] ?? {}); p.steps = p.steps ?? {}; p.steps[id] = { ...(p.steps[id] ?? {}), ...patch }; });
  const save = async (next = s) => {
    setBusy(true);
    try { await saveTenantOverrides({ automations: next }); setDirty(false); toast.success("Automations saved — they run in the cloud from now on"); }
    catch (e: any) { toast.error(e.message || "Could not save"); } finally { setBusy(false); }
  };
  const turnOnRecommended = () => { const n: AutomationSettings = JSON.parse(JSON.stringify(s)); n.plays = n.plays ?? {}; for (const k of RECOMMENDED) n.plays[k] = { ...(n.plays[k] ?? {}), enabled: true }; setS(n); save(n); };

  const { rows, loading, reload } = useEnrollments({ days: 120 });
  const customers = useCollection("customers");
  const users = useUsers();
  const workflows = useRecords<any>("workflow");
  const onCount = PLAYS.filter((p) => s.plays?.[p.key]?.enabled).length;
  const week = Date.now() - 7 * 864e5;
  const stats = useMemo(() => ({
    active: rows.filter((r) => r.status === "active").length,
    sent: rows.reduce((n, r) => n + r.log.filter((l) => new Date(l.at).getTime() > week && /^sent/.test(l.result ?? "")).length, 0),
    replied: rows.filter((r) => r.status === "replied" && new Date(r.updatedAt).getTime() > week).length,
    booked: rows.filter((r) => r.status === "booked" && new Date(r.updatedAt).getTime() > week).length,
  }), [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  // overlap warnings: an old one-step workflow that also texts on the same event
  const overlaps = useMemo(() => {
    const map: Record<string, string> = { new_lead: "new_lead", appointment_booked: "appointment", deal_delivered: "sold" };
    return workflows.filter((w) => w.data.enabled && w.data.actions?.text?.body && map[w.data.trigger] && s.plays?.[map[w.data.trigger]]?.enabled).map((w) => w.data.name as string);
  }, [workflows, s]);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div><h1 className="text-3xl font-black flex items-center gap-2"><Zap className="h-7 w-7 text-primary" /> Automations</h1>
          <p className="text-muted-foreground">Follow-up that runs itself — get them in the door, rescue deals, nurture, and keep buyers for life.</p></div>
        {canEdit && <div className="flex gap-2">
          {onCount < RECOMMENDED.length && <Button variant="outline" onClick={turnOnRecommended} disabled={busy}>Turn on all {RECOMMENDED.length} plays</Button>}
          <Button onClick={() => save()} disabled={!dirty || busy}>{busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save changes</Button>
        </div>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[{ k: "Customers in a play", v: stats.active, icon: Users }, { k: "Messages sent (7 days)", v: stats.sent, icon: Send }, { k: "Replied (7 days)", v: stats.replied, icon: Reply }, { k: "Booked (7 days)", v: stats.booked, icon: CalendarCheck }].map((x) =>
          <Card key={x.k}><CardContent className="p-4"><p className="text-xs text-muted-foreground flex items-center gap-1"><x.icon className="h-3.5 w-3.5" />{x.k}</p><p className="text-2xl font-black tabular-nums">{loading ? "—" : x.v}</p></CardContent></Card>)}
      </div>

      <Card className="bg-muted/40"><CardContent className="p-4 text-sm space-y-1.5">
        <p className="flex gap-2"><Cloud className="h-4 w-4 mt-0.5 shrink-0 text-primary" /><span className="text-muted-foreground"><b className="text-foreground">Runs in the cloud 24/7</b>, every 5 minutes. Texts only go out 9am–8pm (Sunday noon–6pm) your time, at most one automated text per customer per day (new-lead and appointment texts excepted), with "Reply STOP to opt out" on the first one. A play stops by itself the moment the customer replies, books, buys or texts STOP — and the salesperson gets a task to answer.</span></p>
        {!(tenant as any).isDemo && !ghl.loading && !ghl.connected && <p className="flex gap-2 text-amber-800"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />GoHighLevel isn't connected, so texts and emails become tasks for your team to send. <Link to="/settings?tab=connections" className="underline font-medium">Connect it</Link></p>}
        {(tenant as any).isDemo && <p className="flex gap-2 text-blue-800"><Bot className="h-4 w-4 mt-0.5 shrink-0" />Demo dealership: messages show in the Inbox and here, but nothing is really texted.</p>}
        {overlaps.length > 0 && <p className="flex gap-2 text-amber-800"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />These Workflows also text on the same event — turn them off in <Link to="/workflows" className="underline">Workflows</Link> so customers don't get two texts: {overlaps.join(", ")}</p>}
      </CardContent></Card>

      <Tabs defaultValue="plays">
        <TabsList><TabsTrigger value="plays">Plays ({onCount} on)</TabsTrigger><TabsTrigger value="people">Who's in a play ({stats.active})</TabsTrigger><TabsTrigger value="settings">Settings</TabsTrigger></TabsList>

        <TabsContent value="plays" className="space-y-6 mt-4">
          {PLAY_GROUPS.map((g) => (
            <div key={g.key} className="space-y-3">
              <div><h2 className="text-lg font-bold">{g.name}</h2><p className="text-sm text-muted-foreground">{g.blurb}</p></div>
              {PLAYS.filter((p) => p.group === g.key).map((base) => {
                const p = playFor(base.key, s)!; const isOpen = open === p.key;
                const running = rows.filter((r) => r.play === p.key && r.status === "active").length;
                return (
                  <Card key={p.key} className={p.enabled ? "border-primary/40" : ""}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <Switch checked={p.enabled} disabled={!canEdit} onCheckedChange={(b) => setPlay(p.key, { enabled: b })} aria-label={p.enabled ? `Turn off ${p.name}` : `Turn on ${p.name}`} className="mt-1" />
                        <button type="button" className="flex-1 min-w-0 text-left" onClick={() => setOpen(isOpen ? null : p.key)} aria-expanded={isOpen}>
                          <p className="font-semibold flex items-center gap-2 flex-wrap">{p.name}{p.enabled ? <Badge className="bg-emerald-600">On</Badge> : <Badge variant="outline">Off</Badge>}{running > 0 && <Badge variant="secondary">{running} running</Badge>}</p>
                          <p className="text-sm text-muted-foreground">{p.why}</p>
                          <p className="text-xs text-muted-foreground mt-1"><b>Starts:</b> {p.trigger} · <b>Stops:</b> {p.stops}</p>
                          <div className="flex flex-wrap gap-1 mt-2">{p.steps.map((st) => { const K = KIND[st.kind]; return <span key={st.id} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${st.off ? "opacity-40 line-through" : ""}`}><K.icon className="h-3 w-3" />{fmtAt(st)}</span>; })}</div>
                        </button>
                        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform shrink-0 mt-1 ${isOpen ? "" : "-rotate-90"}`} />
                      </div>
                      {isOpen && <div className="space-y-2 border-t pt-3">
                        {p.steps.map((st) => { const K = KIND[st.kind]; return (
                          <div key={st.id} className={`rounded-lg border p-3 space-y-2 ${st.off ? "opacity-60" : ""}`}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" className="gap-1"><K.icon className="h-3 w-3" />{K.label}</Badge>
                              <span className="text-sm font-medium">{st.label}</span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{fmtAt(st)}{st.kind === "task" ? ` · to the ${st.assign === "manager" ? "manager" : "salesperson"}` : ""}</span>
                              <label className="ml-auto flex items-center gap-1.5 text-xs"><Switch checked={!st.off} disabled={!canEdit} onCheckedChange={(b) => setStep(p.key, st.id, { off: !b })} aria-label={st.off ? "Use this step" : "Skip this step"} />{st.off ? "Skipped" : "On"}</label>
                            </div>
                            {st.kind === "ai" && <p className="text-xs text-muted-foreground flex gap-1"><Sparkles className="h-3 w-3 mt-0.5 shrink-0" />The AI writes this one from the customer's car and what's in stock: "{st.intent}". If AI isn't available, it sends the text below.</p>}
                            {st.kind === "email" && <Input disabled={!canEdit} value={st.subject ?? ""} onChange={(e) => setStep(p.key, st.id, { subject: e.target.value })} placeholder="Subject" className="h-8 text-sm" />}
                            <Textarea disabled={!canEdit} value={st.body} onChange={(e) => setStep(p.key, st.id, { body: e.target.value })} rows={st.kind === "email" ? 5 : 2} className="text-sm" />
                            {st.kind !== "task" && /\{review_link\}/.test(st.body) && !s.reviewLink && <p className="text-xs text-amber-700">Add your review link in Settings (this tab) or this step is skipped.</p>}
                          </div>); })}
                        <p className="text-[11px] text-muted-foreground">Fill-ins: {"{first_name} {customer} {dealership} {salesperson} {vehicle} {link} {appt_time} {appt_clock} {address} {phone} {review_link}"}. Texts over ~300 characters cost 2–3 messages.</p>
                      </div>}
                    </CardContent>
                  </Card>);
              })}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="people" className="mt-4"><People rows={rows} loading={loading} reload={reload} customers={customers} users={users} canStop={hasPermission(["manager", "sales"])} /></TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-4">
          <Card><CardHeader><CardTitle className="text-base">Messages</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1 max-w-xl"><Label>Review link</Label><Input disabled={!canEdit} value={s.reviewLink ?? ""} onChange={(e) => edit((n) => { n.reviewLink = e.target.value.trim(); })} placeholder="https://g.page/r/…/review" /><p className="text-xs text-muted-foreground">Your Google review link. Used by the "Review request" text after a sale.</p></div>
              <div className="space-y-1 max-w-xs"><Label>Automated texts per customer per day</Label>
                <Select disabled={!canEdit} value={String(s.dailyCap ?? 1)} onValueChange={(v) => edit((n) => { n.dailyCap = parseInt(v); })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1 (recommended)</SelectItem><SelectItem value="2">2</SelectItem></SelectContent></Select>
                <p className="text-xs text-muted-foreground">New-lead and appointment texts don't count toward this.</p></div>
            </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">When customers text back</CardTitle><CardDescription>Replies stop the play and give the salesperson a task. The AI can also answer for you.</CardDescription></CardHeader>
            <CardContent className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm">AI replies: <b>{tenant.aiVoice?.autoReply === "auto" ? "Answers automatically (8am–9pm)" : tenant.aiVoice?.autoReply === "draft" ? "Drafts a reply in the Inbox for staff to send" : "Off"}</b></p>
              <Button asChild variant="outline" size="sm"><Link to="/settings?tab=ai-voice">Change in Settings → AI Voice</Link></Button>
            </CardContent></Card>
          {canEdit && <Button onClick={() => save()} disabled={!dirty || busy}>{busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save changes</Button>}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function People({ rows, loading, reload, customers, users, canStop }: { rows: Enrollment[]; loading: boolean; reload: () => void; customers: any[]; users: any[]; canStop: boolean }) {
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [play, setPlay] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const list = rows.filter((r) => (filter === "all" || r.status === "active") && (play === "all" || r.play === play));
  const stop = async (r: Enrollment) => { try { await stopEnrollment(r.id); toast.success("Stopped — no more automated messages from this play"); reload(); } catch (e: any) { toast.error(e.message); } };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 flex-wrap">
        <div><CardTitle className="text-base">Customers in a play</CardTitle><CardDescription>What's next for each one. Stop a play any time.</CardDescription></div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}><SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Running</SelectItem><SelectItem value="all">All (120 days)</SelectItem></SelectContent></Select>
          <Select value={play} onValueChange={setPlay}><SelectTrigger className="h-9 w-[190px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Every play</SelectItem>{PLAYS.map((p) => <SelectItem key={p.key} value={p.key}>{playName(p.key)}</SelectItem>)}</SelectContent></Select>
        </div>
      </CardHeader>
      <CardContent className="divide-y">
        {loading && <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>}
        {!loading && list.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">{filter === "active" ? "Nobody is in a play right now. Turn a play on and it starts with the next lead, appointment or deal." : "No automation activity yet."}</p>}
        {list.map((r) => {
          const c = customers.find((x) => x.id === r.customerId); const p = PLAYS.find((x) => x.key === r.play);
          const next = p?.steps[r.step]; const owner = users.find((u) => u.id === r.ownerId); const st = STATUS_LABEL[r.status];
          return (
            <div key={r.id} className="py-3 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <p className="font-medium">{c ? <Link to={`/customers/${c.id}`} className="hover:underline">{fullName(c)}</Link> : "Customer"} <span className="text-muted-foreground font-normal text-sm">· {playName(r.play)}</span></p>
                  <p className="text-xs text-muted-foreground">{r.status === "active" ? (next ? <>Next: <b>{next.label}</b> {rel(r.nextAt)}</> : "Finishing") : r.stopReason ?? st.label} · step {Math.min(r.step, p?.steps.length ?? 0)}/{p?.steps.length ?? 0} · started {fmtDateTime(r.createdAt)}{owner ? ` · ${owner.fullName}` : ""}</p>
                </div>
                <Badge className={st.cls} variant="outline">{st.label}</Badge>
                {r.log.length > 0 && <Button size="sm" variant="ghost" onClick={() => setOpenId(openId === r.id ? null : r.id)}>{openId === r.id ? "Hide" : `History (${r.log.length})`}</Button>}
                {canStop && r.status === "active" && <Button size="sm" variant="outline" onClick={() => stop(r)}><Square className="h-3.5 w-3.5 mr-1" /> Stop</Button>}
              </div>
              {openId === r.id && <div className="rounded-md bg-muted/40 p-2 space-y-1 text-xs">{r.log.slice().reverse().map((l, i) => <p key={i} className="flex gap-2"><span className="text-muted-foreground shrink-0 w-28">{fmtDateTime(l.at)}</span>{l.error ? <span className="text-red-600">Error: {l.error}</span> : <span><b>{p?.steps.find((s) => s.id === l.step)?.label ?? l.step}</b> — {l.result}{l.text ? <span className="text-muted-foreground"> · "{l.text}"</span> : null}</span>}</p>)}</div>}
            </div>);
        })}
        {!loading && list.length > 0 && <p className="text-[11px] text-muted-foreground pt-2 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Refreshes every 30 seconds.</p>}
      </CardContent>
    </Card>
  );
}
