// Dealerships → "GoHighLevel agency": one-time setup of the CarSales AI OS marketplace app on the agency.
// After this, sub-accounts are created/linked from the app and every GHL event arrives automatically.
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plug, Copy, Loader2, CheckCircle2, ChevronDown, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { crmStatus, crmSaveApp, crmAuthorizeUrl, type CrmStatus } from "@/lib/crm";

const EVENTS = ["AppInstall", "AppUninstall", "InboundMessage", "OutboundMessage", "AppointmentCreate", "AppointmentUpdate", "AppointmentDelete", "OpportunityCreate", "OpportunityStageUpdate", "OpportunityStatusUpdate", "VoiceAiCallEnd"];
const copy = (t: string) => navigator.clipboard.writeText(t).then(() => toast.success("Copied"), () => toast.error("Copy failed"));

export default function AgencyConnectionCard({ onStatus }: { onStatus?: (s: CrmStatus | null) => void }) {
  const [st, setSt] = useState<CrmStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [cid, setCid] = useState(""); const [csec, setCsec] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => { try { const s = await crmStatus(); setSt(s); onStatus?.(s); setErr(null); if (!s.appConfigured) setShowSetup(true); } catch (e: any) { setErr(e.message); onStatus?.(null); } };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const save = async () => { setBusy(true); try { await crmSaveApp(cid, csec); setCid(""); setCsec(""); toast.success("App saved — now click Connect"); await load(); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); } };
  const connect = async () => { setBusy(true); try { const { url } = await crmAuthorizeUrl(); window.location.href = url; } catch (e: any) { toast.error(e.message); setBusy(false); } };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div><CardTitle className="flex items-center gap-2"><Plug className="h-5 w-5 text-primary" /> GoHighLevel agency</CardTitle>
          <CardDescription>Connect once. Then every new dealership gets its GoHighLevel sub-account created and wired up from here — texts, calls, appointments, pipeline and the Voice AI agent flow in automatically, no workflows to build.</CardDescription></div>
        {st?.agencyConnected ? <Badge className="bg-emerald-600 shrink-0 gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Connected</Badge> : st?.appConfigured ? <Badge variant="outline" className="shrink-0">Ready to connect</Badge> : <Badge variant="outline" className="shrink-0">Not set up</Badge>}
      </CardHeader>
      <CardContent className="space-y-4">
        {err && <p className="text-sm text-destructive">{err}</p>}
        {st?.agencyConnected && <p className="text-sm text-muted-foreground">Agency {st.companyId} · connected {st.connectedAt ? new Date(st.connectedAt).toLocaleDateString() : ""}. <button className="underline" onClick={connect}>Reconnect</button></p>}
        {st && !st.agencyConnected && st.appConfigured && <Button onClick={connect} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-1" />} Connect GoHighLevel</Button>}
        {st && <button type="button" onClick={() => setShowSetup((s) => !s)} className="flex items-center gap-1 text-sm font-semibold"><ChevronDown className={`h-4 w-4 transition-transform ${showSetup ? "" : "-rotate-90"}`} /> {st.appConfigured ? "App settings" : "One-time setup (5 minutes)"}</button>}
        {st && showSetup && (
          <div className="space-y-4 rounded-lg border p-4">
            <ol className="text-sm list-decimal pl-5 space-y-2">
              <li>Go to <a className="text-primary underline" href="https://marketplace.gohighlevel.com/apps" target="_blank" rel="noreferrer">marketplace.gohighlevel.com → My Apps</a> → <b>Create App</b>. Name <b>CarSales AI OS</b>, type <b>Private</b>, distribution <b>Agency and Sub-account</b> (bulk install on).</li>
              <li><b>Auth → Redirect URL</b>: <span className="inline-flex items-center gap-1"><code className="text-xs bg-muted px-1 rounded break-all">{st.redirectUri}</code><button onClick={() => copy(st.redirectUri)}><Copy className="h-3.5 w-3.5" /></button></span></li>
              <li><b>Auth → Scopes</b>: add these <button className="text-primary underline" onClick={() => copy(st.scopes.join(" "))}>(copy all {st.scopes.length})</button><div className="mt-1 flex flex-wrap gap-1">{st.scopes.map((s) => <code key={s} className="text-[10px] bg-muted px-1 rounded">{s}</code>)}</div></li>
              <li><b>Webhooks → Default webhook URL</b>: <span className="inline-flex items-center gap-1"><code className="text-xs bg-muted px-1 rounded break-all">{st.webhookUrl}</code><button onClick={() => copy(st.webhookUrl)}><Copy className="h-3.5 w-3.5" /></button></span> and turn on: <span className="text-xs">{EVENTS.join(", ")}</span></li>
              <li><b>Auth → Client keys → Add</b>, then paste both below.</li>
            </ol>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Client ID</Label><Input value={cid} onChange={(e) => setCid(e.target.value)} placeholder={st.clientId ?? "e.g. 68f1…-mg9x…"} /></div>
              <div className="space-y-1"><Label>Client Secret</Label><Input type="password" value={csec} onChange={(e) => setCsec(e.target.value)} placeholder={st.appConfigured ? "•••••• (saved)" : ""} autoComplete="off" /></div>
            </div>
            <Button onClick={save} disabled={busy || cid.trim().length < 8 || csec.trim().length < 8}>{busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save app keys</Button>
            <p className="text-xs text-muted-foreground">The secret is stored server-side only and never shown again.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
