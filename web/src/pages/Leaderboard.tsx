import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Trophy, Award, Trash2, Crown, Zap, CalendarCheck, Flag } from "lucide-react";
import { toast } from "sonner";
import { useCollection, money, fmtDate, logActivity } from "@/lib/store";
import { useRecords, addRecord, updateRecord, removeRecord, type Rec } from "@/lib/records";
import { useAuth, useUsers } from "@/lib/auth";

/** Spiff / contest — records kind "spiff". */
export interface Spiff { name: string; rule: string; amount: number; startDate: string; endDate: string; winnerUserId?: string; awardedAt?: string }
interface CallLog { by?: string; at?: string }

const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (m: string) => new Date(m + "-01T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });
const today = () => new Date().toISOString().slice(0, 10);

export default function Leaderboard() {
  const { user, hasPermission } = useAuth();
  const canManage = hasPermission(["manager"]);
  const users = useUsers().filter((u) => u.isActive);
  const deals = useCollection("deals");
  const appts = useCollection("appointments");
  const calls = useRecords<CallLog>("call_log");
  const spiffs = useRecords<Spiff>("spiff");
  const [month, setMonth] = useState(ym(new Date()));
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", rule: "", amount: "", startDate: today(), endDate: today() });
  const [toDelete, setToDelete] = useState<Rec<Spiff> | null>(null);

  const months = useMemo(() => { const s = new Set<string>([ym(new Date())]); deals.forEach((d) => s.add(ym(new Date(d.updatedAt)))); return [...s].sort().reverse(); }, [deals]);
  const inMonth = (iso?: string) => !!iso && ym(new Date(iso)) === month;
  const board = useMemo(() => {
    const delivered = deals.filter((d) => d.status === "delivered" && inMonth(d.updatedAt));
    return users.map((u) => {
      const mine = delivered.filter((d) => d.salespersonId === u.id).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
      const showed = appts.filter((a) => a.assignedTo === u.id && a.status === "showed" && inMonth(a.startsAt)).length;
      const callN = calls.filter((c) => c.data.by === u.id && inMonth(c.data.at)).length;
      return { u, units: mine.length, gross: mine.reduce((a, d) => a + (d.totalGross || 0), 0), showed, calls: callN, firstDealAt: mine[0]?.updatedAt };
    }).filter((r) => r.units || r.showed || r.calls).sort((a, b) => b.units - a.units || b.gross - a.gross || b.showed - a.showed);
  }, [users, deals, appts, calls, month]);
  const firstDeal = useMemo(() => [...board].filter((r) => r.firstDealAt).sort((a, b) => a.firstDealAt!.localeCompare(b.firstDealAt!))[0], [board]);
  const som = board[0]?.units ? board[0] : undefined;
  const badges = (r: typeof board[number]) => { const out: { icon: any; label: string }[] = []; if (firstDeal?.u.id === r.u.id) out.push({ icon: Flag, label: "First deal of the month" }); if (r.units >= 10) out.push({ icon: Zap, label: "10-unit club" }); else if (r.units >= 5) out.push({ icon: Zap, label: "5 units" }); if (r.showed >= 10) out.push({ icon: CalendarCheck, label: "10 shows" }); return out; };
  const monthSpiffs = useMemo(() => spiffs.filter((s) => s.data.startDate.slice(0, 7) <= month && s.data.endDate.slice(0, 7) >= month).sort((a, b) => b.data.startDate.localeCompare(a.data.startDate)), [spiffs, month]);
  const who = (id?: string) => users.find((u) => u.id === id)?.fullName ?? "—";

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name the spiff");
    try { await addRecord<Spiff>("spiff", { name: form.name.trim(), rule: form.rule.trim(), amount: Number(form.amount) || 0, startDate: form.startDate, endDate: form.endDate }, user?.id); toast.success("Spiff posted"); setAddOpen(false); setForm({ name: "", rule: "", amount: "", startDate: today(), endDate: today() }); }
    catch (e: any) { toast.error(e.message || "Could not save"); }
  };
  const award = async (s: Rec<Spiff>, winnerUserId: string) => {
    try { await updateRecord<Spiff>("spiff", s.id, winnerUserId === "none" ? { winnerUserId: undefined, awardedAt: undefined } : { winnerUserId, awardedAt: new Date().toISOString() }); if (winnerUserId !== "none") { logActivity("spiff_awarded", "user", winnerUserId, `${s.data.name} ${money(s.data.amount)}`, user?.id); toast.success(`${who(winnerUserId)} wins ${s.data.name}`); } }
    catch (e: any) { toast.error(e.message); }
  };
  const confirmDelete = async () => { if (!toDelete) return; try { await removeRecord("spiff", toDelete.id); toast.success("Spiff removed"); setToDelete(null); } catch (e: any) { toast.error(e.message); } };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Leaderboard</h1><p className="text-muted-foreground">{monthLabel(month)} · delivered units, gross, shows, and logged calls</p></div>
        <div className="flex gap-2">
          <Select value={month} onValueChange={setMonth}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent>{months.map((m) => <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>)}</SelectContent></Select>
          {canManage && <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" /> Spiff</Button>}
        </div>
      </div>

      <Card className={som ? "border-amber-400/70" : ""}><CardContent className="p-5 flex items-center gap-4">
        <Crown className={`h-10 w-10 shrink-0 ${som ? "text-amber-500" : "opacity-30"}`} />
        <div><p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Salesperson of the month</p>
          {som ? <p className="text-2xl font-black">{som.u.fullName} <span className="text-base font-normal text-muted-foreground">· {som.units} unit{som.units === 1 ? "" : "s"} · {money(som.gross)}</span></p> : <p className="text-muted-foreground">No delivered deals in {monthLabel(month)} yet. The top unit count takes the crown.</p>}</div>
      </CardContent></Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4" /> Standings</CardTitle><CardDescription>Ranked by units, then gross. Badges are earned from real counts only.</CardDescription></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {board.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Nothing on the board for {monthLabel(month)}. Delivered deals, showed appointments, and BDC call logs feed it.</p> : <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase"><tr><th className="text-left p-3">#</th><th className="text-left p-3">Salesperson</th><th className="text-right p-3">Units</th><th className="text-right p-3">Gross</th><th className="text-right p-3">Shows</th><th className="text-right p-3">Calls</th><th className="text-left p-3">Badges</th></tr></thead>
              <tbody className="divide-y">{board.map((r, i) => <tr key={r.u.id} className={r.u.id === user?.id ? "bg-primary/5" : ""}>
                <td className="p-3 font-black">{i + 1}</td><td className="p-3 font-medium">{r.u.fullName}</td>
                <td className="p-3 text-right font-semibold">{r.units}</td><td className="p-3 text-right">{money(r.gross)}</td><td className="p-3 text-right">{r.showed}</td><td className="p-3 text-right">{r.calls}</td>
                <td className="p-3"><div className="flex flex-wrap gap-1">{badges(r).map((b) => <Badge key={b.label} variant="outline" className="gap-1"><b.icon className="h-3 w-3" />{b.label}</Badge>)}</div></td>
              </tr>)}</tbody>
            </table>}
          </CardContent></Card>

        <Card className="h-fit"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4" /> Spiffs</CardTitle><CardDescription>Contests running in {monthLabel(month)}</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {monthSpiffs.length === 0 && <p className="text-sm text-muted-foreground">{canManage ? "No spiffs this month. Post one to put a bounty on the board." : "No spiffs running this month."}</p>}
            {monthSpiffs.map((s) => <div key={s.id} className="rounded-md border p-3 space-y-1 text-sm">
              <div className="flex items-start justify-between gap-2"><p className="font-bold">{s.data.name} <span className="text-muted-foreground font-normal">· {money(s.data.amount)}</span></p>{canManage && <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setToDelete(s)}><Trash2 className="h-3.5 w-3.5" /></Button>}</div>
              {s.data.rule && <p className="text-muted-foreground">{s.data.rule}</p>}
              <p className="text-xs text-muted-foreground">{fmtDate(s.data.startDate)} – {fmtDate(s.data.endDate)}</p>
              {s.data.winnerUserId ? <p className="font-semibold text-emerald-600">Won by {who(s.data.winnerUserId)}</p> : <p className="text-xs text-muted-foreground">Not yet awarded</p>}
              {canManage && <Select value={s.data.winnerUserId ?? "none"} onValueChange={(v) => award(s, v)}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">— award to —</SelectItem>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}</SelectContent></Select>}
            </div>)}
          </CardContent></Card>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Post a spiff</DialogTitle><DialogDescription>Write the rule in plain words; you award the winner manually when it's decided.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Weekend Warrior" /></div>
            <div className="space-y-1 col-span-2"><Label>Rule</Label><Textarea rows={2} value={form.rule} onChange={(e) => setForm({ ...form, rule: e.target.value })} placeholder="Most delivered units Sat–Sun. Ties split." /></div>
            <div className="space-y-1 col-span-2"><Label>Amount ($)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div className="space-y-1"><Label>Starts</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
            <div className="space-y-1"><Label>Ends</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={save}>Post</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remove {toDelete?.data.name}?</AlertDialogTitle><AlertDialogDescription>The spiff and its award record are deleted.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete}>Remove</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
