import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { MessageSquare, Mail, StickyNote, Phone, Send, Search, Plug, ArrowDownLeft, ArrowUpRight, Inbox as InboxIcon } from "lucide-react";
import { toast } from "sonner";
import { useCollection, fullName, fmtDateTime, logActivity, type Customer } from "@/lib/store";
import { useRecords, addRecord } from "@/lib/records";
import { useAuth, useUsers } from "@/lib/auth";
import { listIntegrations } from "@/lib/integrations";
import { smsHref, mailtoHref } from "@/pages/TextingTemplates";

export type MessageChannel = "sms" | "email" | "note" | "call";
export interface Message { customerId: string; channel: MessageChannel; direction: "in" | "out"; body: string; at: string; by?: string }

const CH: Record<MessageChannel, { label: string; icon: JSX.Element }> = {
  sms: { label: "Text", icon: <MessageSquare className="h-3 w-3" /> },
  email: { label: "Email", icon: <Mail className="h-3 w-3" /> },
  call: { label: "Call", icon: <Phone className="h-3 w-3" /> },
  note: { label: "Note", icon: <StickyNote className="h-3 w-3" /> },
};

export default function Inbox() {
  const { user } = useAuth();
  const users = useUsers();
  const customers = useCollection("customers");
  const messages = useRecords<Message>("message");
  const [ghl, setGhl] = useState(false);
  const [q, setQ] = useState("");
  const [onlyThreads, setOnlyThreads] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [channel, setChannel] = useState<MessageChannel>("sms");
  const [direction, setDirection] = useState<"out" | "in">("out");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { listIntegrations().then((rows) => setGhl(rows.some((r) => r.provider === "ghl" && r.status === "connected"))).catch(() => {}); }, []);

  const threads = useMemo(() => {
    const last = new Map<string, Message>();
    for (const m of messages) { const cur = last.get(m.data.customerId); if (!cur || m.data.at > cur.at) last.set(m.data.customerId, m.data); }
    const term = q.trim().toLowerCase();
    return customers
      .map((c) => ({ c, last: last.get(c.id) }))
      .filter(({ c, last }) => (!onlyThreads || last) && (!term || fullName(c).toLowerCase().includes(term) || (c.phone ?? "").includes(term) || (c.email ?? "").toLowerCase().includes(term)))
      .sort((a, b) => (b.last?.at ?? "").localeCompare(a.last?.at ?? "") || fullName(a.c).localeCompare(fullName(b.c)));
  }, [customers, messages, q, onlyThreads]);

  const customer: Customer | undefined = customers.find((c) => c.id === selectedId);
  const thread = useMemo(() => messages.filter((m) => m.data.customerId === selectedId).sort((a, b) => a.data.at.localeCompare(b.data.at)), [messages, selectedId]);
  const who = (id?: string) => users.find((u) => u.id === id)?.fullName ?? "Staff";

  const log = async (openLink: boolean) => {
    if (!customer || !body.trim()) return;
    setBusy(true);
    try {
      const data: Message = { customerId: customer.id, channel, direction: channel === "note" ? "out" : direction, body: body.trim(), at: new Date().toISOString(), by: user?.id };
      await addRecord<Message>("message", data, user?.id);
      logActivity(channel === "note" ? "note" : `${channel}_${data.direction}`, "customer", customer.id, body.slice(0, 140), user?.id);
      if (openLink && direction === "out") {
        if (channel === "sms" && customer.phone) window.location.href = smsHref(customer.phone, body);
        else if (channel === "email") window.location.href = mailtoHref(customer.email, "", body);
      }
      setBody(""); toast.success("Logged");
    } catch (e: any) { toast.error(e.message || "Could not log"); } finally { setBusy(false); }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div><h1 className="text-3xl font-black">Inbox</h1><p className="text-muted-foreground">Every conversation per customer — texts, emails, calls and notes your team logs.</p></div>

      <div className={`rounded-lg border p-3 text-sm flex items-start gap-2 ${ghl ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}>
        <Plug className="h-4 w-4 mt-0.5 shrink-0" />
        <p>{ghl ? "GoHighLevel is connected — automatic two-way SMS/email syncing into this inbox is coming soon. Until then, log messages here manually." : <>Two-way SMS/email arrives here automatically once GoHighLevel is connected in <Link to="/settings" className="underline font-semibold">Settings → Connections</Link>. Today this inbox is a manual log: record each text, email or call so the whole team sees the history.</>}</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-2">
          <div className="relative"><Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" /><Input className="pl-8" placeholder="Search customers" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="flex gap-2"><Button size="sm" variant={onlyThreads ? "default" : "outline"} onClick={() => setOnlyThreads(true)}>With messages</Button><Button size="sm" variant={!onlyThreads ? "default" : "outline"} onClick={() => setOnlyThreads(false)}>All customers</Button></div>
          <div className="space-y-1 max-h-[65vh] overflow-y-auto pr-1">
            {threads.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground"><InboxIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />{customers.length === 0 ? <>No customers yet — add one under <Link className="text-primary underline" to="/customers?new=1">Customers</Link>.</> : onlyThreads ? "No conversations logged yet. Switch to All customers and log the first one." : "No customers match."}</CardContent></Card>}
            {threads.map(({ c, last }) => (
              <button key={c.id} onClick={() => setSelectedId(c.id)} className={`w-full text-left rounded-lg border p-3 hover:shadow-sm transition-shadow ${selectedId === c.id ? "border-primary bg-primary/5" : "bg-background"}`}>
                <div className="flex justify-between gap-2"><p className="font-semibold text-sm truncate">{fullName(c)}</p>{last && <span className="text-[10px] text-muted-foreground shrink-0">{fmtDateTime(last.at)}</span>}</div>
                {last ? <p className="text-xs text-muted-foreground truncate flex items-center gap-1">{CH[last.channel]?.icon}{last.direction === "in" ? "They: " : "You: "}{last.body}</p> : <p className="text-xs text-muted-foreground">{c.phone || c.email || "No contact info"}</p>}
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
                  {customer.phone && <Button asChild size="sm" variant="outline"><a href={`tel:${customer.phone}`}><Phone className="h-4 w-4 mr-1" /> Call</a></Button>}
                </div>
              </div>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[45vh]">
                {thread.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No messages logged for {customer.firstName} yet.</p>}
                {thread.map((m) => (
                  <div key={m.id} className={`flex ${m.data.direction === "out" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.data.channel === "note" ? "bg-amber-50 border border-amber-200" : m.data.direction === "out" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      <p className="whitespace-pre-wrap">{m.data.body}</p>
                      <p className={`text-[10px] mt-1 flex items-center gap-1 ${m.data.direction === "out" && m.data.channel !== "note" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {m.data.direction === "in" ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}{CH[m.data.channel]?.label} · {m.data.direction === "in" ? fullName(customer) : who(m.data.by)} · {fmtDateTime(m.data.at)}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
              <div className="border-t p-4 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Select value={channel} onValueChange={(v) => setChannel(v as MessageChannel)}><SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(CH) as MessageChannel[]).map((k) => <SelectItem key={k} value={k}>{CH[k].label}</SelectItem>)}</SelectContent></Select>
                  {channel !== "note" && <Select value={direction} onValueChange={(v) => setDirection(v as any)}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="out">We sent / called</SelectItem><SelectItem value="in">They replied</SelectItem></SelectContent></Select>}
                  <Badge variant="outline" className="self-center">{channel === "note" ? "Internal only" : direction === "out" ? "Outbound" : "Inbound"}</Badge>
                </div>
                <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder={channel === "note" ? "Internal note about this customer…" : channel === "call" ? "What was said on the call…" : direction === "in" ? "Paste what the customer sent…" : "Type your message…"} />
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => log(false)} disabled={busy || !body.trim()}>Log only</Button>
                  {direction === "out" && channel === "sms" && <Button onClick={() => log(true)} disabled={busy || !body.trim() || !customer.phone}><Send className="h-4 w-4 mr-1" /> Log & open Messages</Button>}
                  {direction === "out" && channel === "email" && <Button onClick={() => log(true)} disabled={busy || !body.trim() || !customer.email}><Send className="h-4 w-4 mr-1" /> Log & open Mail</Button>}
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
