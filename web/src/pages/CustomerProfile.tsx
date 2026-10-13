import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Phone, MessageSquare, Mail, MapPin, Kanban, Calendar, Calculator, ListTodo, ArrowLeft, Pencil, StickyNote, FileSignature, Car, ArrowDownLeft, ArrowUpRight, CalendarCheck, RefreshCw, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useCollection, insert, update, fullName, fmtDateTime, money, type Lead, type Deal, type Appointment, type Task, type Activity } from "@/lib/store";
import { useInventory, vTitle } from "@/lib/inventory";
import { useAuth, useUsers } from "@/lib/auth";
import { useRecords } from "@/lib/records";
import { askAi, aiErrorMessage } from "@/lib/ai";
import { useGhlStatus, ghlUpsertContact, ghlErrorMessage, isInbound, type MessageRecord, type GhlChannel } from "@/lib/ghl";
import { ComposeMessage } from "@/components/ComposeMessage";
import { BookGhlDialog } from "@/components/BookGhlDialog";

type Item = { at: string; kind: string; icon: any; title: string; sub?: string; to?: string; tone?: string };

export default function CustomerProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const users = useUsers();
  const customers = useCollection("customers");
  const leads = useCollection("leads");
  const deals = useCollection("deals");
  const appts = useCollection("appointments");
  const tasks = useCollection("tasks");
  const activity = useCollection("activity");
  const inventory = useInventory();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const messages = useRecords<MessageRecord>("message");
  const ghl = useGhlStatus();
  const [compose, setCompose] = useState<GhlChannel | null>(null);
  const [booking, setBooking] = useState(false);
  const [sync, setSync] = useState<{ busy: boolean; contactId?: string; error?: string }>({ busy: false });
  const [summary, setSummary] = useState<{ busy: boolean; text?: string; error?: string }>({ busy: false });

  const c = customers.find((x) => x.id === id);
  const who = (uid?: string) => users.find((u) => u.id === uid)?.fullName;
  const veh = (vid?: string) => { const v = vid ? inventory.find((x) => x.id === vid) : undefined; return v ? vTitle(v) : undefined; };

  const timeline = useMemo<Item[]>(() => {
    if (!c) return [];
    const items: Item[] = [];
    leads.filter((l: Lead) => l.customerId === c.id).forEach((l) => items.push({ at: l.createdAt, kind: "Lead", icon: Kanban, title: `Lead opened${l.source ? ` from ${l.source}` : ""}`, sub: [veh(l.vehicleId), who(l.assignedTo) && `with ${who(l.assignedTo)}`, `now: ${l.stage}`].filter(Boolean).join(" · "), to: "/leads", tone: l.stage === "sold" ? "text-emerald-700" : l.stage === "lost" ? "text-muted-foreground" : "" }));
    deals.filter((d: Deal) => d.customerId === c.id).forEach((d) => items.push({ at: d.createdAt, kind: "Deal", icon: FileSignature, title: `Deal ${d.status.replace("_", " ")} — ${money(d.sellingPrice)}`, sub: [veh(d.vehicleId), `${money(d.monthlyPayment)}/mo × ${d.termMonths}`, `${money(d.totalGross)} gross`].filter(Boolean).join(" · "), to: `/desking?deal=${d.id}` }));
    appts.filter((a: Appointment) => a.customerId === c.id).forEach((a) => items.push({ at: a.startsAt, kind: "Appointment", icon: Calendar, title: `${a.type.replace("_", " ")} — ${a.status.replace("_", " ")}`, sub: [veh(a.vehicleId), who(a.assignedTo)].filter(Boolean).join(" · "), to: "/appointments" }));
    tasks.filter((t: Task) => t.relatedType === "customer" && t.relatedId === c.id).forEach((t) => items.push({ at: t.dueAt || t.createdAt, kind: "Task", icon: ListTodo, title: t.title, sub: `${t.status}${who(t.assignedTo) ? ` · ${who(t.assignedTo)}` : ""}`, to: "/tasks" }));
    messages.filter((m) => m.data?.customerId === c.id).forEach((m) => { const d = m.data; const inb = isInbound(d); const ch = d.channel === "email" ? "Email" : d.channel === "call" ? "Call" : d.channel === "note" ? "Note" : "Text"; items.push({ at: d.at, kind: ch, icon: d.channel === "note" ? StickyNote : inb ? ArrowDownLeft : ArrowUpRight, title: `${inb ? `${ch} from ${c.firstName}` : d.channel === "note" ? "Note" : `${ch} sent`}: ${d.subject ? `${d.subject} — ` : ""}${d.body.length > 160 ? d.body.slice(0, 160) + "…" : d.body}`, sub: [inb ? undefined : who(d.by ?? undefined), d.via === "ghl" ? "via GoHighLevel" : undefined].filter(Boolean).join(" · ") || undefined, to: "/inbox", tone: inb ? "text-primary" : "" }); });
    activity.filter((a: Activity) => a.entity === "customer" && a.entityId === c.id && a.action === "note").forEach((a) => items.push({ at: a.createdAt, kind: "Note", icon: StickyNote, title: a.details || "", sub: who(a.userId) }));
    items.push({ at: c.createdAt, kind: "Customer", icon: Pencil, title: `Added as a customer${c.source ? ` (${c.source})` : ""}`, sub: who(c.ownerId) });
    return items.sort((a, b) => b.at.localeCompare(a.at));
  }, [c, leads, deals, appts, tasks, activity, inventory, users, messages]);

  if (!c) return <div className="p-8 text-center text-muted-foreground">Customer not found. <Link to="/customers" className="text-primary underline">Back to customers</Link></div>;

  const openLeads = leads.filter((l) => l.customerId === c.id && !["sold", "lost"].includes(l.stage));
  const bought = deals.filter((d) => d.customerId === c.id && ["funded", "delivered"].includes(d.status));
  const tel = c.phone?.replace(/[^\d+]/g, "");
  const addNote = async () => {
    if (!note.trim()) return; setSaving(true);
    try { await insert("activity", { action: "note", entity: "customer", entityId: c.id, details: note.trim(), userId: user?.id } as any); setNote(""); toast.success("Note saved"); }
    catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };
  const addFollowUp = async () => {
    try { await insert("tasks", { title: `Follow up with ${fullName(c)}`, dueAt: new Date(Date.now() + 24 * 3600e3).toISOString(), status: "open", priority: "normal", assignedTo: user?.id, relatedType: "customer", relatedId: c.id } as any); toast.success("Follow-up set for tomorrow"); }
    catch (e: any) { toast.error(e.message); }
  };
  const syncGhl = async () => {
    setSync({ busy: true });
    try { const r = await ghlUpsertContact(c.id); setSync({ busy: false, contactId: r.contactId }); toast.success("Synced to GoHighLevel"); }
    catch (e) { setSync({ busy: false, error: ghlErrorMessage(e) }); }
  };
  const summarize = async () => {
    setSummary({ busy: true });
    try { const text = await askAi("customer_summary", { context: { customerId: c.id } }); setSummary({ busy: false, text: text || undefined, error: text ? undefined : "The assistant returned nothing — try again." }); }
    catch (e) { setSummary({ busy: false, error: aiErrorMessage(e) }); }
  };
  const vehicleOfInterest = leads.find((l) => l.customerId === c.id && l.vehicleId && !["sold", "lost"].includes(l.stage))?.vehicleId;
  const setOwner = async () => { try { await update("customers", c.id, { ownerId: user?.id } as any); toast.success("You now own this customer"); } catch (e: any) { toast.error(e.message); } };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => nav(-1)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">{fullName(c)}</h1>
          <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {c.phone && <a href={`tel:${tel}`} className="flex items-center gap-1 hover:text-primary"><Phone className="h-3.5 w-3.5" />{c.phone}</a>}
            {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-1 hover:text-primary"><Mail className="h-3.5 w-3.5" />{c.email}</a>}
            {(c.address || c.city) && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{[c.address, c.city, c.state, c.zip].filter(Boolean).join(", ")}</span>}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {c.source && <Badge variant="outline">{c.source}</Badge>}
            {openLeads.length > 0 && <Badge>{openLeads.length} open lead{openLeads.length > 1 ? "s" : ""}</Badge>}
            {bought.length > 0 && <Badge className="bg-emerald-600">{bought.length} purchase{bought.length > 1 ? "s" : ""}</Badge>}
            <Badge variant="secondary">Owner: {who(c.ownerId) || "unassigned"}</Badge>
            {c.ownerId !== user?.id && <button className="text-xs text-primary underline" onClick={setOwner}>take ownership</button>}
            {ghl.connected && (sync.contactId
              ? <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300" title={`GHL contact ${sync.contactId}`}><CheckCircle2 className="h-3 w-3 mr-1" /> Synced to GoHighLevel</Badge>
              : <button className="text-xs text-primary underline inline-flex items-center gap-1 disabled:opacity-50" onClick={syncGhl} disabled={sync.busy || (!c.phone && !c.email)} title={!c.phone && !c.email ? "Needs a phone or email" : "Create or match this customer in GoHighLevel"}>{sync.busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Sync to GHL</button>)}
          </div>
          {sync.error && <p className="text-xs text-destructive mt-1">{sync.error}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {c.phone && <Button asChild variant="outline" size="sm"><a href={`tel:${tel}`}><Phone className="h-4 w-4 mr-1" /> Call</a></Button>}
          <Button variant="outline" size="sm" onClick={() => setCompose("sms")} disabled={!c.phone} title={c.phone ? "" : "No phone number on file"}><MessageSquare className="h-4 w-4 mr-1" /> Text</Button>
          <Button variant="outline" size="sm" onClick={() => setCompose("email")} disabled={!c.email} title={c.email ? "" : "No email on file"}><Mail className="h-4 w-4 mr-1" /> Email</Button>
          <Button variant="outline" size="sm" onClick={summarize} disabled={summary.busy}>{summary.busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />} Summarize</Button>
          <Button asChild variant="outline" size="sm"><Link to={`/customers?edit=${c.id}`}><Pencil className="h-4 w-4 mr-1" /> Edit</Link></Button>
        </div>
      </div>

      {(summary.text || summary.error) && (
        <Card className={summary.error ? "border-amber-300" : "border-primary/30"}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI summary</CardTitle><Button size="sm" variant="ghost" onClick={() => setSummary({ busy: false })}>Dismiss</Button></CardHeader>
          <CardContent className={`text-sm whitespace-pre-wrap ${summary.error ? "text-amber-900" : ""}`}>{summary.error ?? summary.text}</CardContent>
        </Card>
      )}

      <div className={`grid gap-2 ${ghl.connected ? "md:grid-cols-5" : "md:grid-cols-4"}`}>
        <Button asChild variant="secondary"><Link to={`/leads?customer=${c.id}`}><Kanban className="h-4 w-4 mr-1" /> New lead</Link></Button>
        <Button asChild variant="secondary"><Link to={`/appointments?customer=${c.id}`}><Calendar className="h-4 w-4 mr-1" /> Book appointment</Link></Button>
        {ghl.connected && <Button variant="secondary" onClick={() => setBooking(true)}><CalendarCheck className="h-4 w-4 mr-1" /> Book in GHL calendar</Button>}
        <Button asChild variant="secondary"><Link to={`/desking?customer=${c.id}`}><Calculator className="h-4 w-4 mr-1" /> Desk a deal</Link></Button>
        <Button variant="secondary" onClick={addFollowUp}><ListTodo className="h-4 w-4 mr-1" /> Follow up tomorrow</Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Timeline</CardTitle><CardDescription>Everything that's happened with {c.firstName} — newest first.</CardDescription></CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4"><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Add a note — what did they say, what are they looking for, when to call back…" /><Button onClick={addNote} disabled={saving || !note.trim()} className="self-end">Save note</Button></div>
            <ol className="relative border-l pl-6 space-y-5">
              {timeline.map((it, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[31px] top-0.5 h-5 w-5 rounded-full bg-background border flex items-center justify-center"><it.icon className="h-3 w-3 text-muted-foreground" /></span>
                  <p className={`text-sm font-medium ${it.tone || ""}`}>{it.to ? <Link to={it.to} className="hover:underline">{it.title}</Link> : it.title}</p>
                  <p className="text-xs text-muted-foreground">{it.kind} · {fmtDateTime(it.at)}{it.sub ? ` · ${it.sub}` : ""}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Car className="h-4 w-4" /> Vehicles of interest</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {Array.from(new Set([...leads.filter((l) => l.customerId === c.id).map((l) => l.vehicleId), ...deals.filter((d) => d.customerId === c.id).map((d) => d.vehicleId)].filter(Boolean) as string[])).map((vid) => { const v = inventory.find((x) => x.id === vid); return v ? <Link key={vid} to={`/inventory/${vid}`} className="block hover:text-primary">{vTitle(v)} <span className="text-muted-foreground">· {money(v.price ?? 0)} · {v.status}</span></Link> : null; })}
              {!leads.some((l) => l.customerId === c.id && l.vehicleId) && !deals.some((d) => d.customerId === c.id && d.vehicleId) && <p className="text-muted-foreground">None yet — attach a vehicle on a lead.</p>}
            </CardContent>
          </Card>
          {c.notes && <Card><CardHeader><CardTitle className="text-base">Profile notes</CardTitle></CardHeader><CardContent className="text-sm whitespace-pre-wrap">{c.notes}</CardContent></Card>}
        </div>
      </div>

      <ComposeMessage open={!!compose} onOpenChange={(o) => !o && setCompose(null)} customer={c} defaultChannel={compose ?? "sms"} vehicleId={vehicleOfInterest} />
      <BookGhlDialog open={booking} onOpenChange={setBooking} customerId={c.id} vehicleId={vehicleOfInterest} />
    </div>
  );
}
