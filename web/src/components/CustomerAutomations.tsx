// Customer profile → Automations: which follow-up plays this customer is in, what's next, stop one, or add them to a play.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Square, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PLAYS, playFor } from "@/lib/plays";
import { useTenant } from "@/lib/tenant";
import { useAuth } from "@/lib/auth";
import { useEnrollments, stopEnrollment, enrollCustomer, STATUS_LABEL } from "@/lib/automations";

const MANUAL = ["aged_lead", "lost_lead", "be_back", "dead_deal", "no_show", "new_lead"];

export default function CustomerAutomations({ customerId, optedOut }: { customerId: string; optedOut?: boolean }) {
  const tenant = useTenant();
  const { hasPermission } = useAuth();
  const { rows, reload } = useEnrollments({ customerId });
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const canAct = hasPermission(["manager", "sales"]);
  const on = PLAYS.filter((p) => MANUAL.includes(p.key) && playFor(p.key, tenant.automations)?.enabled);
  const active = rows.filter((r) => r.status === "active");
  const recent = rows.filter((r) => r.status !== "active").slice(0, 3);
  const add = async () => {
    if (!pick) return; setBusy(true);
    try { await enrollCustomer(pick, customerId); toast.success("Added — the first step goes out at the next good time"); setPick(""); reload(); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Automations</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        {optedOut && <p className="text-xs rounded-md bg-amber-50 border border-amber-200 text-amber-900 px-2 py-1">Texted STOP — no automated texts.</p>}
        {active.length === 0 && <p className="text-muted-foreground text-xs">Not in a follow-up play right now.</p>}
        {active.map((r) => { const p = PLAYS.find((x) => x.key === r.play); const next = p?.steps[r.step]; return (
          <div key={r.id} className="flex items-center gap-2 rounded-md border px-2 py-1.5">
            <div className="flex-1 min-w-0"><p className="font-medium truncate">{p?.name.split(" — ")[0] ?? r.play}</p><p className="text-[11px] text-muted-foreground truncate">{next ? `Next: ${next.label}${r.nextAt ? ` · ${new Date(r.nextAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : ""}` : "Finishing"}</p></div>
            {canAct && <Button size="icon" variant="ghost" className="h-7 w-7" title="Stop this play for this customer" aria-label="Stop this play" onClick={async () => { try { await stopEnrollment(r.id); toast.success("Stopped"); reload(); } catch (e: any) { toast.error(e.message); } }}><Square className="h-3.5 w-3.5" /></Button>}
          </div>); })}
        {recent.map((r) => <p key={r.id} className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Badge variant="outline" className={`${STATUS_LABEL[r.status].cls} text-[10px] px-1.5 py-0`}>{STATUS_LABEL[r.status].label}</Badge>{PLAYS.find((x) => x.key === r.play)?.name.split(" — ")[0]}{r.stopReason ? ` — ${r.stopReason}` : ""}</p>)}
        {canAct && !optedOut && (on.length > 0 ? (
          <div className="flex gap-1.5 pt-1">
            <Select value={pick} onValueChange={setPick}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Add to a play…" /></SelectTrigger><SelectContent>{on.map((p) => <SelectItem key={p.key} value={p.key}>{p.name.split(" — ")[0]}</SelectItem>)}</SelectContent></Select>
            <Button size="sm" className="h-8" onClick={add} disabled={!pick || busy}>{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}</Button>
          </div>) : <p className="text-[11px] text-muted-foreground">Turn plays on in <Link to="/automations" className="underline">Automations</Link>.</p>)}
      </CardContent>
    </Card>
  );
}
