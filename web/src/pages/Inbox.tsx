import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { MessageSquare, Mail, StickyNote, Phone, Send, Search, Plug, ArrowDownLeft, ArrowUpRight, Inbox as InboxIcon, Sparkles, Loader2, RefreshCw, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useCollection, fullName, fmtDateTime, logActivity, type Customer } from "@/lib/store";
import { useRecords, addRecord, refreshRecords } from "@/lib/records";
import { useAuth, useUsers } from "@/lib/auth";
import { askAi, aiErrorMessage } from "@/lib/ai";
import { useGhlStatus, ghlThread, ghlSend, ghlErrorMessage, isInbound, type MessageRecord, type GhlThreadMessage } from "@/lib/ghl";
import { smsHref, mailtoHref } from "@/pages/TextingTemplates";

export type MessageChannel = "sms" | "email" | "note" | "call";
/** Kept for older imports; rows may also carry direction "inbound"/"outbound" (written by GoHighLevel). */
export type Message = MessageRecord;

const CH: Record<MessageChannel, { label: string; icon: JSX.Element }> = {
  sms: { label: "Text", icon: <MessageSquare className="h-3 w-3" /> },
  email: { label: "Email", icon: <Mail className="h-3 w-3" /> },
  call: { label: "Call", icon: <Phone className="h-3 w-3" /> },
  note: { label: "Note", icon: <StickyNote className="h-3 w-3" /> },
};
const POLL_MS = 20_000;
interface Bubble { key: string; channel: MessageChannel; inbound: boolean; body: string; subject?: string; at: string; by?: string | null; source: "ghl" | "log"; status?: string | null }

/** Live GHL thread + local log, de-duplicated (same GHL id, or same direction/body within 3 minutes). */
function mergeThread(local: { id: string; data: MessageRecord }[], live: GhlThreadMessage[]): Bubble[] {
  const out: Bubble[] = live.map((m) => ({ key: `g:${m.id}`, channel: m.channel, inbound: m.direction === "inbound", body: m.body, at: m.at, source: "ghl", status: m.status }));
  const liveIds = new Set(live.map((m) => m.id));
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  for (const r of local) {
    const d = r.data;
    if (d.ghlMessageId && liveIds.has(d.ghlMessageId)) continue;
    if (d.channel !== "note" && d.channel !== "call" && live.some((m) => (m.direction === "inbound") === isInbound(d) && norm(m.body) === norm(d.body) && Math.abs(Date.parse(m.at) - Date.parse(d.at)) < 180_000)) continue;
    out.push({ key: `r:${r.id}`, channel: d.channel, inbound: isInbound(d), body: d.body, subject: d.subject, at: d.at, by: d.by, source: "log" });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

export default function Inbox() {
  const { user } = useAuth();
  const users = useUsers();
  const customers = useCollection("customers");
  const messages = useRecords<MessageRecord>("message");
  const ghl = useGhlStatus();
  const [q, setQ] = useState("");
  const [onlyThreads, setOnlyThreads] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [channel, setChannel] = useState<MessageChannel>("sms");
  const [direction, setDirection] = useState<"out" | "in">("out");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [live, setLive] = useState<GhlThreadMessage[]>([]);
  const [liveErr, setLiveErr] = useState<string | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);

  const threads = useMemo(() => {
    const last = new Map<string, MessageRecord>(); const lastIn = new Map<string, string>(); const lastOut = new Map<string, string>();
    for (const m of messages) {
      const d = m.data; if (!d?.customerId) continue;
      const cur = last.get(d.customerId); if (!cur || d.at > cur.at) last.set(d.customerId, d);
      if (d.channel === "note") continue;
      const map = isInbound(d) ? lastIn : lastOut; const prev = map.get(d.customerId); if (!prev || d.at > prev) map.set(d.customerId, d.at);
    }
    const term = q.trim().toLowerCase();
    return customers
      .map((c) => { const li = lastIn.get(c.id); const lo = lastOut.get(c.id); return { c, last: last.get(c.id), unread: !!li && (!lo || li > lo) }; })
      .filter(({ c, last }) => (!onlyThreads || last) && (!term || fullName(c).toLowerCase().includes(term) || (c.phone ?? "").includes(term) || (c.email ?? "").toLowerCase().includes(term)))
      .sort((a, b) => (b.last?.at ?? "").localeCompare(a.last?.at ?? "") || fullName(a.c).localeCompare(fullName(b.c)));
  }, [customers, messages, q, onlyThreads]);
  const unreadCount = threads.filter((t) => t.unread).length;

  const customer: Customer | undefined = customers.find((c) => c.id === selectedId);
  const local = useMemo(() => messages.filter((m) => m.data?.customerId === selectedId), [messages, selectedId]);
  // the AI's latest draft/auto-reply for this customer's newest inbound text (written by the ghl-sync "reply" job)
  const aiNote = useMemo(() => {
    const ins = local.filter((m) => isInbound(m.data)).sort((a, b) => String(b.data.at).localeCompare(String(a.data.at)));
    const last = ins[0]; const d = (last?.data as any)?.aiDraft as { text: string; by: string; sent: boolean; held?: string | null } | undefined;
    if (!d?.text) return null;
    const answered = local.some((m) => !isInbound(m.data) && m.data.channel !== "note" && String(m.data.at) > String(last.data.at) && (m.data as any).via !== "felipe");
    return answered && !d.sent ? null : d;
  }, [local]);
  const thread = useMemo(() => mergeThread(local, ghl.connected ? live : []), [local, live, ghl.connected]);
  const who = (id?: string | null) => users.find((u) => u.id === id)?.fullName ?? (id && !/^[0-9a-f-]{36}$/i.test(id) ? id : "Staff");   // automations store a label ("Automation · …")

  // live thread from GoHighLevel: on open, every 20s, and whenever this customer's local records change
  const loadLive = useCallback(async (quiet = false) => {
    if (!selectedId || !ghl.connected) return;
    const c = customers.find((x) => x.id === selectedId);
    if (c && !c.phone && !c.email) { setLive([]); setLiveErr("No phone or email on file — GoHighLevel can't match this customer."); return; }
    if (!quiet) setLoadingLive(true);
    try { const r = await ghlThread(selectedId); setLive(r.messages ?? []); setLiveErr(null); }
    catch (e) { setLiveErr(ghlErrorMessage(e)); }
    finally { setLoadingLive(false); }
  }, [selectedId, ghl.connected, customers]);
  useEffect(() => { setLive([]); setLiveErr(null); loadLive(); }, [selectedId, ghl.connected]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (selectedId && ghl.connected) loadLive(true); }, [local.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setInterval(() => {
      if (document.hidden) return;
      refreshRecords("message").catch(() => {});
      if (selectedId && ghl.connected) loadLive(true);
    }, POLL_MS);
    return () => clearInterval(t);
  }, [selectedId, ghl.connected, loadLive]);

  useEffect(() => {
    if (!customer) return;
    setBody(""); setSubject(""); setDirection("out");
    setChannel(customer.phone ? "sms" : customer.email ? "email" : "note");
  }, [customer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const viaGhl = ghl.connected && (channel === "sms" || channel === "email");
  const canChannel = (ch: MessageChannel) => (ch === "sms" ? !!customer?.phone : ch === "email" ? !!customer?.email : true);

  const sendGhl = async () => {
    if (!customer || !body.trim()) return;
    setBusy(true);
    try {
      await ghlSend({ customerId: customer.id, channel: channel as "sms" | "email", body: body.trim(), subject: channel === "email" ? subject.trim() || undefined : undefined });
      setBody(""); setSubject(""); toast.success("Sent");
      refreshRecords("message").catch(() => {}); loadLive(true);
    } catch (e) { toast.error(ghlErrorMessage(e)); } finally { setBusy(false); }
  };
  const log = async (openLink: boolean) => {
    if (!customer || !body.trim()) return;
    setBusy(true);
    try {
      const out = channel === "note" || direction === "out";
      const data: MessageRecord = { customerId: customer.id, channel, direction: out ? "out" : "in", body: body.trim(), subject: channel === "email" ? subject.trim() || undefined : undefined, at: new Date().toISOString(), by: user?.id, via: openLink ? "device" : "manual" };
      await addRecord<MessageRecord>("message", data, user?.id);
      logActivity(channel === "note" ? "note" : `${channel}_${out ? "out" : "in"}`, "customer", customer.id, body.slice(0, 140), user?.id);
      if (openLink && out) {
        if (channel === "sms" && customer.phone) window.location.href = smsHref(customer.phone, body);
        else if (channel === "email") window.location.href = mailtoHref(customer.email, subject, body);
      }
      setBody(""); setSubject(""); toast.success("Logged");
    } catch (e: any) { toast.error(e.message || "Could not log"); } finally { setBusy(false); }
  };
  const aiReply = async () => {
    if (!customer) return;
    setDrafting(true);
    try {
      const conversation = thread.filter((m) => m.channel !== "note").slice(-20).map((m) => ({ direction: m.inbound ? "inbound" as const : "outbound" as const, channel: m.channel, body: m.body, at: m.at }));
      const text = await askAi(conversation.length ? "reply_suggestion" : channel === "email" ? "follow_up_email" : "follow_up_text", { context: { customerId: customer.id, conversation } });
      if (text) { setBody(text); if (channel === "note") setChannel(customer.phone ? "sms" : "email"); setDirection("out"); } else toast.message("The assistant returned nothing — write the reply yourself.");
    } catch (e) { toast.error(aiErrorMessage(e)); } finally { setDrafting(false); }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div><h1 className="text-3xl font-black">Inbox</h1><p className="text-muted-foreground">Every conversation per customer — texts, emails, calls and notes{ghl.connected ? ", live from GoHighLevel" : ""}.</p></div>

      {!ghl.loading && !ghl.connected && (
        <div className="rounded-lg border p-3 text-sm flex items-start gap-2 border-amber-300 bg-amber-50 text-amber-900">
          <Plug className="h-4 w-4 mt-0.5 shrink-0" />
          <p>Two-way texting and email turn on when GoHighLevel is connected in <Link to="/settings" className="underline font-semibold">Settings → Connections</Link>. Until then this inbox is a log: record each text, email or call so the whole team sees the history.</p>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-2">
          <div className="relative"><Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" /><Input className="pl-8" placeholder="Search customers" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="flex flex-wrap gap-2 items-center"><Button size="sm" variant={onlyThreads ? "default" : "outline"} onClick={() => setOnlyThreads(true)}>Conversations</Button><Button size="sm" variant={!onlyThreads ? "default" : "outline"} onClick={() => setOnlyThreads(false)}>All customers</Button>{unreadCount > 0 && <Badge className="ml-auto">{unreadCount} awaiting reply</Badge>}</div>
          <div className="space-y-1 max-h-[65vh] overflow-y-auto pr-1">
            {threads.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground"><InboxIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />{customers.length === 0 ? <>No customers yet — add one under <Link className="text-primary underline" to="/customers?new=1">Customers</Link>.</> : onlyThreads ? "No conversations yet. Switch to All customers to start one." : "No customers match."}</CardContent></Card>}
            {threads.map(({ c, last, unread }) => (
              <button key={c.id} onClick={() => setSelectedId(c.id)} className={`w-full text-left rounded-lg border p-3 hover:shadow-sm transition-shadow ${selectedId === c.id ? "border-primary bg-primary/5" : "bg-background"}`}>
                <div className="flex justify-between gap-2"><p className={`text-sm truncate flex items-center gap-1.5 ${unread ? "font-black" : "font-semibold"}`}>{unread && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}{fullName(c)}</p>{last && <span className="text-[10px] text-muted-foreground shrink-0">{fmtDateTime(last.at)}</span>}</div>
                {last ? <p className={`text-xs truncate flex items-center gap-1 ${unread ? "text-foreground font-semibold" : "text-muted-foreground"}`}>{CH[last.channel]?.icon}{isInbound(last) ? "They: " : "You: "}{last.body}</p> : <p className="text-xs text-muted-foreground">{c.phone || c.email || "No contact info"}</p>}
              </button>
            ))}
          </div>
        </div>

        <Card className="lg:col-span-3 flex flex-col min-h-[60vh]">
          {!customer ? <CardContent className="flex-1 flex items-center justify-center text-muted-foreground p-8">Pick a customer to see the conversation.</CardContent> : (
            <>
              <div className="border-b p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div><Link to={`/customers/${customer.id}`} className="font-bold hover:underline">{fullName(customer)}</Link><p className="text-xs text-muted-foreground">{customer.phone || "no phone"} · {customer.email || "no email"}</p></div>
                <div className="flex gap-2">
                  {ghl.connected && <Button size="sm" variant="ghost" onClick={() => loadLive()} disabled={loadingLive} title="Refresh from GoHighLevel">{loadingLive ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</Button>}
                  <Button asChild size="sm" variant="outline"><Link to={`/customers/${customer.id}`}><UserRound className="h-4 w-4 mr-1" /> Profile</Link></Button>
                  {customer.phone && <Button asChild size="sm" variant="outline"><a href={`tel:${customer.phone}`}><Phone className="h-4 w-4 mr-1" /> Call</a></Button>}
                </div>
              </div>
              {liveErr && <p className="mx-4 mt-3 text-xs rounded-md border border-amber-300 bg-amber-50 text-amber-900 p-2">Live thread unavailable: {liveErr} Showing the local log.</p>}
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[45vh]">
                {thread.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">{loadingLive ? "Loading conversation…" : `No messages with ${customer.firstName} yet.`}</p>}
                {thread.map((m) => (
                  <div key={m.key} className={`flex ${m.inbound ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.channel === "note" ? "bg-amber-50 border border-amber-200 text-amber-950" : !m.inbound ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {m.subject && <p className="font-semibold text-xs mb-0.5">{m.subject}</p>}
                      <p className="whitespace-pre-wrap break-words">{m.body || <em className="opacity-70">(no text)</em>}</p>
                      <p className={`text-[10px] mt-1 flex items-center gap-1 ${!m.inbound && m.channel !== "note" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {m.inbound ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}{CH[m.channel]?.label ?? m.channel} · {m.inbound ? fullName(customer) : m.source === "ghl" ? "Dealership" : who(m.by)} · {fmtDateTime(m.at)}{m.status && m.status !== "delivered" && m.status !== "read" ? ` · ${m.status}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
              <div className="border-t p-4 space-y-2">
                {aiNote && (aiNote.sent
                  ? <p className="text-xs rounded-md border bg-muted/40 p-2 flex items-start gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" /><span><b>{aiNote.by}</b> {(aiNote as any).booked ? <>booked an appointment for <b>{(aiNote as any).booked}</b> and texted the confirmation.</> : "answered this text automatically."}</span></p>
                  : <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5 space-y-1.5">
                      <p className="text-xs font-semibold flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> {aiNote.by} drafted a reply{aiNote.held ? ` (held: ${aiNote.held})` : ""}{(aiNote as any).book ? ` · suggests booking ${(aiNote as any).book}` : ""}</p>
                      <p className="text-sm whitespace-pre-wrap">{aiNote.text}</p>
                      <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => { setChannel("sms"); setBody(aiNote.text); }}>Use this reply</Button></div>
                    </div>)}
                <div className="flex flex-wrap gap-2">
                  <Select value={channel} onValueChange={(v) => setChannel(v as MessageChannel)}><SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(CH) as MessageChannel[]).map((k) => <SelectItem key={k} value={k} disabled={!canChannel(k)}>{CH[k].label}{canChannel(k) ? "" : " (none on file)"}</SelectItem>)}</SelectContent></Select>
                  {!viaGhl && channel !== "note" && <Select value={direction} onValueChange={(v) => setDirection(v as any)}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="out">We sent / called</SelectItem><SelectItem value="in">They replied</SelectItem></SelectContent></Select>}
                  <Badge variant="outline" className="self-center">{channel === "note" ? "Internal only" : viaGhl ? "Sends via GoHighLevel" : direction === "out" ? "Outbound log" : "Inbound log"}</Badge>
                  <Button size="sm" variant="secondary" className="ml-auto" onClick={aiReply} disabled={drafting}>{drafting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />} AI reply</Button>
                </div>
                {channel === "email" && (viaGhl || direction === "out") && <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />}
                <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder={channel === "note" ? "Internal note about this customer…" : channel === "call" ? "What was said on the call…" : !viaGhl && direction === "in" ? "Paste what the customer sent…" : "Type your message…"} onKeyDown={(e) => { if (viaGhl && e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendGhl(); } }} />
                <div className="flex flex-wrap gap-2">
                  {viaGhl ? (
                    <Button onClick={sendGhl} disabled={busy || !body.trim() || !canChannel(channel)}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />} Send {channel === "sms" ? "text" : "email"}</Button>
                  ) : (<>
                    <Button variant="outline" onClick={() => log(false)} disabled={busy || !body.trim()}>{channel === "note" ? "Save note" : "Log only"}</Button>
                    {direction === "out" && channel === "sms" && <Button onClick={() => log(true)} disabled={busy || !body.trim() || !customer.phone}><Send className="h-4 w-4 mr-1" /> Log & open Messages</Button>}
                    {direction === "out" && channel === "email" && <Button onClick={() => log(true)} disabled={busy || !body.trim() || !customer.email}><Send className="h-4 w-4 mr-1" /> Log & open Mail</Button>}
                  </>)}
                </div>
                {viaGhl && <p className="text-[11px] text-muted-foreground">Sends from the dealership's GoHighLevel number/email. Replies appear here automatically (checks every 20 seconds). Ctrl/⌘+Enter to send.</p>}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
