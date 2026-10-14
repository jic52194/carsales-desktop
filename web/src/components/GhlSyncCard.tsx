// Settings → Connections → "GoHighLevel sync": pipeline mapping (Leads ⇄ GHL opportunities), the workflow
// event URLs (appointments, opportunity stages, missed calls) and the hourly health check.
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight, Copy, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useTenant } from "@/lib/tenant";
import { SUPABASE_URL, supabase } from "@/lib/supabase";
import { ghlPipelines, ghlSavePipeline, ghlErrorMessage, useGhlStatus, refreshGhlStatus, type GhlPipeline, type GhlStage } from "@/lib/ghl";

const APP_STAGES: { key: string; label: string; guess: RegExp }[] = [
  { key: "new", label: "New", guess: /^new/i },
  { key: "contacted", label: "Contacted", guess: /working|contacted|engaged/i },
  { key: "appointment", label: "Appointment", guess: /visit scheduled|appointment|store visit/i },
  { key: "negotiating", label: "Negotiating", guess: /negotiat|desk|proposal/i },
  { key: "sold", label: "Sold", guess: /^sold|won|delivered/i },
  { key: "lost", label: "Lost", guess: /unsold|lost|not purchased|closed out/i },
];
const EVENTS = [
  { id: "appointment", title: "Appointments → Appointments here", trigger: "Customer Booked Appointment (and a second trigger: Appointment Status)", note: "Anything booked in GoHighLevel — by staff, a calendar link or the Voice AI agent — shows up in Appointments." },
  { id: "opportunity", title: "Pipeline stage → Leads & Pipeline here", trigger: "Pipeline Stage Changed + Opportunity Status Changed (filter: the pipeline mapped above)", note: "Moving a card in GHL moves the lead here. Moves made here are pushed to GHL automatically." },
  { id: "missed_call", title: "Missed call → AI text-back", trigger: "Call Status → status is No Answer / Missed (inbound)", note: "Only sends when Missed-call text-back is on in Settings → AI Voice." },
];

function copy(t: string) { navigator.clipboard.writeText(t).then(() => toast.success("Copied"), () => toast.error("Copy failed")); }

export default function GhlSyncCard({ isAdmin }: { isAdmin: boolean }) {
  const tenant = useTenant();
  const key = (tenant as any).automationKey as string | null;
  const st = useGhlStatus();
  const [pipes, setPipes] = useState<GhlPipeline[] | null>(null);
  const [pid, setPid] = useState<string>("");
  const [map, setMap] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [viaApp, setViaApp] = useState(false);
  useEffect(() => { supabase.from("integrations").select("config").eq("provider", "ghl").maybeSingle().then(({ data }) => setViaApp((data as any)?.config?.via === "app")); }, [st.connected]);

  const load = async () => {
    setErr(null);
    try {
      const r = await ghlPipelines(); setPipes(r.pipelines);
      const cur = r.current;
      if (cur?.id) { setPid(cur.id); setMap({ ...cur.stages }); }
      else { const best = r.pipelines.find((p) => /all opportunities|sales/i.test(p.name)) ?? r.pipelines[0]; if (best) { setPid(best.id); setMap(guess(best)); } }
    } catch (e) { setErr(ghlErrorMessage(e)); }
  };
  useEffect(() => { if (st.connected) load(); /* eslint-disable-next-line */ }, [st.connected]);
  const pipe = useMemo(() => pipes?.find((p) => p.id === pid), [pipes, pid]);
  function guess(p: GhlPipeline) { const m: Record<string, string> = {}; const used = new Set<string>(); for (const a of APP_STAGES) { const s = p.stages.find((x) => a.guess.test(x.name) && !used.has(x.id)); if (s) { m[a.key] = s.id; used.add(s.id); } } return m; }
  const dupes = useMemo(() => { const ids = Object.values(map).filter(Boolean); return ids.length !== new Set(ids).size; }, [map]);
  const saved = st.pipeline;
  const dirty = !saved || saved.id !== pid || APP_STAGES.some((a) => (saved.stages[a.key] ?? "") !== (map[a.key] ?? ""));

  const save = async (off = false) => {
    setBusy(true);
    try {
      if (off) await ghlSavePipeline(null);
      else { const stages: Record<string, GhlStage | undefined> = {}; for (const a of APP_STAGES) { const s = pipe?.stages.find((x) => x.id === map[a.key]); if (s) stages[a.key] = s; } await ghlSavePipeline({ id: pipe!.id, name: pipe!.name, stages }); }
      await refreshGhlStatus(true); toast.success(off ? "Pipeline sync turned off" : "Pipeline sync is on — new leads and stage moves now flow to GoHighLevel");
    } catch (e) { toast.error(ghlErrorMessage(e)); } finally { setBusy(false); }
  };

  if (!st.connected) return null;
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div><CardTitle className="flex items-center gap-2"><ArrowLeftRight className="h-4 w-4 text-primary" /> GoHighLevel sync</CardTitle>
          <CardDescription>Keep Leads & Pipeline, Appointments and the Inbox in step with your GoHighLevel sub-account — both directions.</CardDescription></div>
        {st.health ? (st.health.ok ? <Badge variant="secondary" className="gap-1 shrink-0"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Healthy</Badge>
          : <Badge variant="destructive" className="gap-1 shrink-0" title={st.health.problems.join("; ")}><AlertTriangle className="h-3.5 w-3.5" /> {st.health.problems[0]}</Badge>) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2"><p className="font-semibold text-sm">1 · Pipeline (Leads ⇄ Opportunities)</p>{saved ? <Badge className="bg-emerald-600">On · {saved.name}</Badge> : <Badge variant="outline">Off</Badge>}</div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          {!pipes && !err && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading your GoHighLevel pipelines…</p>}
          {pipes && (<>
            <div className="max-w-sm"><Select value={pid} onValueChange={(v) => { setPid(v); const p = pipes.find((x) => x.id === v); if (p) setMap(guess(p)); }} disabled={!isAdmin}><SelectTrigger><SelectValue placeholder="Pick a pipeline" /></SelectTrigger><SelectContent>{pipes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
            {pipe && <div className="grid sm:grid-cols-2 gap-2">
              {APP_STAGES.map((a) => (
                <div key={a.key} className="flex items-center gap-2 rounded-lg border p-2">
                  <span className="text-sm font-medium w-28 shrink-0">{a.label}</span><span className="text-muted-foreground">→</span>
                  <Select value={map[a.key] ?? "none"} onValueChange={(v) => setMap({ ...map, [a.key]: v === "none" ? "" : v })} disabled={!isAdmin}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Don't sync</SelectItem>{pipe.stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
            </div>}
            {dupes && <p className="text-sm text-destructive">Each GoHighLevel stage can only be used once.</p>}
            <p className="text-xs text-muted-foreground">When on: every new lead here becomes (or matches) an opportunity in this pipeline with the vehicle and price, and stage moves go both ways. Stages set to "Don't sync" are left alone.</p>
            {isAdmin && <div className="flex flex-wrap gap-2">
              <Button onClick={() => save(false)} disabled={busy || !pipe || dupes || !dirty}>{busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}{saved ? (dirty ? "Save mapping" : "Saved") : "Turn on pipeline sync"}</Button>
              {saved && <Button variant="ghost" onClick={() => save(true)} disabled={busy}>Turn off</Button>}
              <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" /> Reload stages</Button>
            </div>}
          </>)}
        </section>

        {viaApp ? (
          <section className="space-y-1.5">
            <p className="font-semibold text-sm">2 · GoHighLevel → here</p>
            <p className="text-sm flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Connected through the CarSales AI OS app — texts, calls, voicemails, appointments, pipeline moves and Voice AI call summaries arrive automatically. Nothing to set up in GoHighLevel.</p>
          </section>
        ) : <section className="space-y-3">
          <p className="font-semibold text-sm">2 · GoHighLevel workflows → here</p>
          <p className="text-xs text-muted-foreground">For each one: GoHighLevel → Automation → Create workflow → add the trigger → add action <b>Webhook</b> (POST) with the URL → Publish.</p>
          {!key ? <p className="text-sm text-muted-foreground">Sign out and back in to load your dealership's URLs.</p> : EVENTS.map((e) => {
            const url = `${SUPABASE_URL}/functions/v1/ghl-sync?key=${key}&event=${e.id}`;
            return (
              <div key={e.id} className="rounded-lg border p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2"><p className="font-semibold text-sm">{e.title}</p><Button size="sm" variant="outline" onClick={() => copy(url)}><Copy className="h-4 w-4 mr-1" /> Copy URL</Button></div>
                <p className="text-xs"><b>Trigger:</b> {e.trigger}</p>
                <p className="text-xs text-muted-foreground">{e.note}</p>
              </div>
            );
          })}
        </section>}
        <p className="text-xs text-muted-foreground">Texts you send from the GoHighLevel app already appear in each customer's Inbox thread here. Connection health is checked every hour — if the token breaks you'll get an alert in the bell.{st.health ? ` Last check ${new Date(st.health.checked_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.` : ""}</p>
      </CardContent>
    </Card>
  );
}
