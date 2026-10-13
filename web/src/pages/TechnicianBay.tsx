import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Play, Square, Package, CheckCircle2, Hand, Wrench, PauseCircle } from "lucide-react";
import { toast } from "sonner";
import { get, fullName, money, logActivity } from "@/lib/store";
import { useRecords, addRecord, updateRecord, type Rec } from "@/lib/records";
import { useAuth, useUsers } from "@/lib/auth";
import { ticketTotal, type ServiceTicket } from "@/pages/ServiceScheduler";

/** Parts line on a repair order — records kind "parts_order" (also written by Parts.tsx when issuing stock). */
export interface PartsOrder { ticketId: string; partId?: string; part: string; qty: number; cost: number; status: "ordered" | "received"; at: string }

const fmtMin = (m: number) => `${Math.floor(m / 60)}h ${String(Math.floor(m % 60)).padStart(2, "0")}m`;

export default function TechnicianBay() {
  const { user } = useAuth();
  const users = useUsers();
  const tickets = useRecords<ServiceTicket>("service_ticket");
  const parts = useRecords<PartsOrder>("parts_order");
  const [tab, setTab] = useState<"mine" | "all">("mine");
  const [partFor, setPartFor] = useState<Rec<ServiceTicket> | null>(null);
  const [pf, setPf] = useState({ part: "", qty: "1", cost: "" });
  const [noteFor, setNoteFor] = useState<Rec<ServiceTicket> | null>(null);
  const [note, setNote] = useState("");
  const [doneFor, setDoneFor] = useState<Rec<ServiceTicket> | null>(null);
  const [, tick] = useState(0);
  useEffect(() => { const i = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(i); }, []);

  const open = useMemo(() => tickets.filter((t) => t.data.status !== "done"), [tickets]);
  const mine = useMemo(() => open.filter((t) => !t.data.technicianId || t.data.technicianId === user?.id), [open, user]);
  const rows = (tab === "mine" ? mine : open).sort((a, b) => (a.data.laborStartedAt ? -1 : 0) - (b.data.laborStartedAt ? -1 : 0) || a.createdAt.localeCompare(b.createdAt));
  const who = (id?: string) => users.find((u) => u.id === id)?.fullName;
  const partsFor = (id: string) => parts.filter((p) => p.data.ticketId === id);
  const runningMin = (t: ServiceTicket) => (t.laborMinutes || 0) + (t.laborStartedAt ? (Date.now() - new Date(t.laborStartedAt).getTime()) / 60000 : 0);

  const patch = async (t: Rec<ServiceTicket>, p: Partial<ServiceTicket>, msg?: string) => {
    try { await updateRecord<ServiceTicket>("service_ticket", t.id, p); if (msg) toast.success(msg); } catch (e: any) { toast.error(e.message || "Could not update"); }
  };
  const claim = (t: Rec<ServiceTicket>) => patch(t, { technicianId: user?.id }, "Ticket is yours");
  const start = (t: Rec<ServiceTicket>) => patch(t, { technicianId: t.data.technicianId ?? user?.id, status: "in_progress", laborStartedAt: new Date().toISOString() });
  const stop = (t: Rec<ServiceTicket>) => {
    const mins = runningMin(t.data); const hours = Math.round((mins / 60) * 100) / 100;
    return patch(t, { laborStartedAt: undefined, laborMinutes: mins, laborHours: hours, total: ticketTotal({ ...t.data, laborHours: hours }) }, `Logged ${fmtMin(mins)}`);
  };
  const waiting = (t: Rec<ServiceTicket>) => patch(t, { status: "waiting_parts" }, "Marked waiting on parts");
  const finish = async () => {
    if (!doneFor) return;
    const t = doneFor; const mins = runningMin(t.data); const hours = Math.round((mins / 60) * 100) / 100;
    await patch(t, { laborStartedAt: undefined, laborMinutes: mins, laborHours: hours, status: "done", closedAt: new Date().toISOString(), total: ticketTotal({ ...t.data, laborHours: hours }) }, "Ticket done");
    logActivity("ro_done", "service_ticket", t.id, t.data.vehicle, user?.id); setDoneFor(null);
  };
  const addPart = async () => {
    if (!partFor) return;
    const qty = Number(pf.qty) || 0; const cost = Number(pf.cost) || 0;
    if (!pf.part.trim() || qty <= 0) return toast.error("Part name and quantity are required");
    try {
      await addRecord<PartsOrder>("parts_order", { ticketId: partFor.id, part: pf.part.trim(), qty, cost, status: "ordered", at: new Date().toISOString() }, user?.id);
      const partsCost = (partFor.data.partsCost || 0) + cost * qty;
      await updateRecord<ServiceTicket>("service_ticket", partFor.id, { partsCost, total: ticketTotal({ ...partFor.data, partsCost }) });
      toast.success("Part added"); setPartFor(null); setPf({ part: "", qty: "1", cost: "" });
    } catch (e: any) { toast.error(e.message || "Could not add part"); }
  };
  const saveNote = async () => { if (!noteFor) return; await patch(noteFor, { notes: note }, "Note saved"); setNoteFor(null); };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Technician Bay</h1><p className="text-muted-foreground">{mine.length} ticket{mine.length === 1 ? "" : "s"} for you · {open.length} open in shop</p></div>
        <div className="flex gap-2">
          <Button size="lg" variant={tab === "mine" ? "default" : "outline"} onClick={() => setTab("mine")}>My tickets</Button>
          <Button size="lg" variant={tab === "all" ? "default" : "outline"} onClick={() => setTab("all")}>All open</Button>
        </div>
      </div>

      {rows.length === 0 && <Card><CardContent className="p-10 text-center text-muted-foreground"><Wrench className="h-10 w-10 mx-auto mb-2 opacity-40" />{open.length === 0 ? "No open repair orders. Service advisors open ROs from the Service Scheduler." : "Nothing assigned to you or unassigned. Check “All open”."}</CardContent></Card>}

      <div className="grid md:grid-cols-2 gap-4">
        {rows.map((t) => { const running = !!t.data.laborStartedAt; const lines = partsFor(t.id); const mineTicket = t.data.technicianId === user?.id; return (
          <Card key={t.id} className={running ? "border-primary" : ""}><CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xl font-black leading-tight break-words">{t.data.vehicle}</p>
                <p className="text-sm text-muted-foreground">{fullName(t.data.customerId ? get("customers", t.data.customerId) : undefined)} · opened {new Date(t.data.openedAt || t.createdAt).toLocaleDateString()}</p>
              </div>
              <Badge variant={running ? "default" : "outline"} className="capitalize shrink-0">{t.data.status.replace("_", " ")}</Badge>
            </div>
            <p className="text-base font-medium">{t.data.concern || "No concern noted"}</p>
            {t.data.notes && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{t.data.notes}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span className="font-mono text-2xl font-black">{fmtMin(runningMin(t.data))}</span>
              <span className="text-muted-foreground self-end">Tech: {who(t.data.technicianId) ?? "unassigned"}</span>
              <span className="text-muted-foreground self-end">Parts: {money(t.data.partsCost)} · {lines.length} line{lines.length === 1 ? "" : "s"}</span>
            </div>
            {lines.length > 0 && <ul className="text-sm divide-y rounded-md border">{lines.map((p) => <li key={p.id} className="px-3 py-1.5 flex justify-between"><span>{p.data.qty} × {p.data.part}</span><span className="text-muted-foreground capitalize">{money(p.data.cost * p.data.qty)} · {p.data.status}</span></li>)}</ul>}
            <div className="grid grid-cols-2 gap-2">
              {!t.data.technicianId && <Button size="lg" className="h-14 text-base col-span-2" variant="secondary" onClick={() => claim(t)}><Hand className="h-5 w-5 mr-2" /> Claim ticket</Button>}
              {running ? <Button size="lg" className="h-14 text-base" variant="destructive" onClick={() => stop(t)}><Square className="h-5 w-5 mr-2" /> Stop timer</Button>
                : <Button size="lg" className="h-14 text-base" onClick={() => start(t)}><Play className="h-5 w-5 mr-2" /> Start timer</Button>}
              <Button size="lg" className="h-14 text-base" variant="outline" onClick={() => { setPartFor(t); setPf({ part: "", qty: "1", cost: "" }); }}><Package className="h-5 w-5 mr-2" /> Add part</Button>
              <Button size="lg" className="h-14 text-base" variant="outline" disabled={t.data.status === "waiting_parts"} onClick={() => waiting(t)}><PauseCircle className="h-5 w-5 mr-2" /> Waiting parts</Button>
              <Button size="lg" className="h-14 text-base" variant="outline" onClick={() => { setNoteFor(t); setNote(t.data.notes ?? ""); }}>Notes</Button>
              <Button size="lg" className="h-14 text-base col-span-2" disabled={!mineTicket && !!t.data.technicianId} onClick={() => setDoneFor(t)}><CheckCircle2 className="h-5 w-5 mr-2" /> Mark done</Button>
            </div>
          </CardContent></Card>
        ); })}
      </div>

      <Dialog open={!!partFor} onOpenChange={(o) => !o && setPartFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add part</DialogTitle><DialogDescription>{partFor?.data.vehicle}. To pull from stock, use the Parts page → Issue to ticket.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2"><Label>Part</Label><Input className="h-12 text-base" value={pf.part} onChange={(e) => setPf({ ...pf, part: e.target.value })} placeholder="Part number or description" /></div>
            <div className="space-y-1"><Label>Qty</Label><Input className="h-12 text-base" type="number" min="1" value={pf.qty} onChange={(e) => setPf({ ...pf, qty: e.target.value })} /></div>
            <div className="space-y-1"><Label>Cost each</Label><Input className="h-12 text-base" type="number" step="0.01" value={pf.cost} onChange={(e) => setPf({ ...pf, cost: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" size="lg" onClick={() => setPartFor(null)}>Cancel</Button><Button size="lg" onClick={addPart}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!noteFor} onOpenChange={(o) => !o && setNoteFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tech notes</DialogTitle><DialogDescription>{noteFor?.data.vehicle}</DialogDescription></DialogHeader>
          <Textarea rows={6} className="text-base" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Findings, recommendations, work performed…" />
          <DialogFooter><Button variant="outline" size="lg" onClick={() => setNoteFor(null)}>Cancel</Button><Button size="lg" onClick={saveNote}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!doneFor} onOpenChange={(o) => !o && setDoneFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Mark this ticket done?</AlertDialogTitle><AlertDialogDescription>{doneFor?.data.vehicle} — the timer stops and {fmtMin(doneFor ? runningMin(doneFor.data) : 0)} of labor is logged. The advisor closes it out in the Service Scheduler.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Not yet</AlertDialogCancel><AlertDialogAction onClick={finish}>Done</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
