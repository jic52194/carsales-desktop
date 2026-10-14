import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, RefreshCw, Plug, Unplug, CheckCircle2, AlertTriangle, Webhook, Send, Users, MessageSquare, Copy } from "lucide-react";
import { toast } from "sonner";
import { PROVIDERS, listIntegrations, connectIntegration, disconnectIntegration, type Integration, type Provider } from "@/lib/integrations";
import { syncInventoryNow } from "@/lib/ai";
import { supabase } from "@/lib/supabase";
import { refreshInventory } from "@/lib/inventory";
import { useTenant } from "@/lib/tenant";
import { useAuth } from "@/lib/auth";
import { SUPABASE_URL } from "@/lib/supabase";
import { ghlSyncCustomers, ghlErrorMessage, refreshGhlStatus } from "@/lib/ghl";
import GhlSyncCard from "@/components/GhlSyncCard";

export function ConnectionsTab() {
  const tenant = useTenant();
  const { hasPermission } = useAuth();
  const isAdmin = hasPermission(["admin"]);
  const [rows, setRows] = useState<Integration[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [open, setOpen] = useState<Provider | null>(null);
  const [secret, setSecret] = useState("");
  const [cfg, setCfg] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  // GoHighLevel inbound webhook (tenants.webhooks.ghl_url) + recent deliveries
  const [webhooks, setWebhooks] = useState<Record<string, any>>({});
  const [ghlUrl, setGhlUrl] = useState("");
  const [ghlBusy, setGhlBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [whLog, setWhLog] = useState<any[]>([]);
  const [showPayload, setShowPayload] = useState(false);
  const canSyncGhl = hasPermission(["admin", "manager"]);
  const [ghlSync, setGhlSync] = useState<{ running: boolean; synced: number; skipped: number; remaining: number | null; errors: string[] } | null>(null);
  const syncGhlCustomers = async () => {
    let synced = 0, skipped = 0; const errors: string[] = [];
    setGhlSync({ running: true, synced, skipped, remaining: null, errors });
    try {
      for (let i = 0; i < 100; i++) {
        const r = await ghlSyncCustomers(50);
        synced += r.synced; skipped += r.skipped; for (const e of r.errors ?? []) if (errors.length < 5 && !errors.includes(e)) errors.push(e);
        setGhlSync({ running: true, synced, skipped, remaining: r.remaining, errors: [...errors] });
        // stop when done, or when a batch made no progress (every remaining customer is erroring)
        if (r.remaining === 0 || r.synced === 0) break;
      }
      toast.success(`GoHighLevel sync done: ${synced} customers synced${skipped ? `, ${skipped} skipped` : ""}`);
    } catch (e) { toast.error(ghlErrorMessage(e)); }
    finally { setGhlSync((s) => (s ? { ...s, running: false } : s)); }
  };
  const loadWebhooks = async () => {
    if (!tenant.dbId) return;
    const { data } = await supabase.from("tenants").select("webhooks").eq("id", tenant.dbId).maybeSingle();
    const w = (data?.webhooks ?? {}) as Record<string, any>; setWebhooks(w); setGhlUrl(w.ghl_url ?? "");
    if (isAdmin) { const { data: log } = await supabase.from("webhook_log").select("id,event,url,request_id,created_at").order("created_at", { ascending: false }).limit(10); setWhLog(log ?? []); }
  };
  useEffect(() => { loadWebhooks(); }, [tenant.dbId, isAdmin]);
  const saveGhl = async () => {
    const url = ghlUrl.trim();
    if (url && !/^https:\/\/\S+$/i.test(url)) return toast.error("Enter an https:// URL (GoHighLevel inbound webhooks are always https)");
    if (!tenant.dbId) return toast.error("Sign in again to load your dealership");
    setGhlBusy(true);
    try {
      const next = { ...webhooks, ghl_url: url || null };
      const { error } = await supabase.from("tenants").update({ webhooks: next }).eq("id", tenant.dbId);
      if (error) throw new Error(error.message);
      setWebhooks(next); toast.success(url ? "GoHighLevel webhook saved — new leads, appointments and deal status changes will post there" : "GoHighLevel webhook removed");
    } catch (e: any) { toast.error(e.message); } finally { setGhlBusy(false); }
  };
  const sendTest = async () => {
    setTestBusy(true);
    try { const { error } = await supabase.rpc("send_test_webhook"); if (error) throw new Error(error.message); toast.success("Test event sent — check the workflow's Inbound Webhook step in GoHighLevel"); setTimeout(loadWebhooks, 1500); }
    catch (e: any) { toast.error(e.message || "Could not send the test"); } finally { setTestBusy(false); }
  };
  const samplePayload = `{
  "event": "lead.created",          // lead.created | appointment.created | deal.status_changed | test
  "dealership_id": "<your dealership uuid>",
  "at": "2026-01-15T14:32:10Z",
  "customer": { "first_name": "Jane", "last_name": "Doe", "phone": "+16035551234", "email": "jane@example.com" },
  "vehicle": { "year": 2021, "make": "Toyota", "model": "RAV4", "stock_number": "A1234", "vin": "..." },   // when a vehicle is attached
  "lead_id": "...", "appointment_id": "...", "deal_id": "...", "customer_id": "...", "vehicle_id": "...",   // whichever apply
  "status": "approved"              // deal.status_changed only
}`;

  const load = async () => {
    try { setRows(await listIntegrations()); } catch {}
    const { data } = await supabase.from("sync_runs").select("id,started_at,finished_at,status,added,updated,sold,errors").order("id", { ascending: false }).limit(5);
    setRuns(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const runSync = async () => {
    setSyncing(true);
    try { const r = await syncInventoryNow(); const c = r?.results?.[0]; toast.success(c ? `Synced: ${c.added} added, ${c.updated} updated, ${c.sold} sold` : "Sync finished"); await refreshInventory(); await load(); }
    catch (e: any) { toast.error(e.message || "Sync failed"); } finally { setSyncing(false); }
  };
  const connect = async () => {
    if (!open) return; setBusy(true);
    try { const r = await connectIntegration(open, secret, cfg); if (r.ok) toast.success("Connected"); else toast.error(r.error || "Saved, but the key couldn't be verified"); setOpen(null); setSecret(""); setCfg({}); await load(); if (open === "ghl") refreshGhlStatus(true); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  const disconnect = async (p: Provider) => { try { await disconnectIntegration(p); toast.success("Disconnected"); await load(); if (p === "ghl") refreshGhlStatus(true); } catch (e: any) { toast.error(e.message); } };
  const st = (p: Provider) => rows.find((r) => r.provider === p);
  const lastRun = runs[0];
  const intakeKey = (tenant as any).intakeKey as string | undefined;
  const automationKey = (tenant as any).automationKey as string | null;
  const inboundUrl = automationKey ? `${SUPABASE_URL}/functions/v1/ghl-inbound?key=${automationKey}` : "";
  const ghlRow = st("ghl"); const ghlConnected = ghlRow?.status === "connected";
  const embed = intakeKey ? `<form action="${SUPABASE_URL}/functions/v1/lead-intake" method="POST">
  <input type="hidden" name="key" value="${intakeKey}">
  <input type="hidden" name="source" value="Website">
  <input type="hidden" name="redirect" value="${tenant.website}/thank-you">
  <input type="text" name="website_url" style="display:none" tabindex="-1" autocomplete="off">
  <input name="name" placeholder="Your name" required>
  <input name="phone" placeholder="Phone" type="tel">
  <input name="email" placeholder="Email" type="email">
  <input name="stock" placeholder="Stock # (optional)">
  <textarea name="message" placeholder="How can we help?"></textarea>
  <button type="submit">Send</button>
</form>` : "";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div><CardTitle>Website inventory sync</CardTitle><CardDescription>{tenant.inventorySource?.platform ? `Reads ${tenant.website} (${tenant.inventorySource.platform}) every night at 3:15 AM: new units added, sold units marked, prices and photos refreshed.` : "No website feed configured for this dealership."}</CardDescription></div>
          {tenant.inventorySource?.platform && hasPermission(["manager", "inventory"]) && <Button onClick={runSync} disabled={syncing}>{syncing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />} Sync now</Button>}
        </CardHeader>
        <CardContent className="text-sm">
          {lastRun ? <p className="flex items-center gap-2">{lastRun.status === "ok" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />} Last sync {new Date(lastRun.started_at).toLocaleString()} — {lastRun.added} added, {lastRun.updated} updated, {lastRun.sold} sold{lastRun.errors ? `, ${lastRun.errors} errors` : ""}</p> : <p className="text-muted-foreground">No sync has run yet.</p>}
          <p className="text-xs text-muted-foreground mt-2">Cost, recon and book values aren't on the public website — enter them per unit. Units you add by hand are never touched by the sync.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Website lead form</CardTitle><CardDescription>Paste this form on {tenant.website} (or point your existing form's action at it). Submissions create a customer + lead here instantly and alert the team.</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {intakeKey ? (<><pre className="text-[11px] bg-muted rounded-lg p-3 overflow-x-auto whitespace-pre">{embed}</pre>
          <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(embed); toast.success("Copied"); }}>Copy HTML</Button><Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(`${SUPABASE_URL}/functions/v1/lead-intake`); toast.success("Copied endpoint"); }}>Copy endpoint URL</Button></div>
          <p className="text-xs text-muted-foreground">Also works as JSON (POST with header <code>x-intake-key</code>). Fields: name or first_name/last_name, phone, email, stock or vin, message, source, page_url. Honeypot field <code>website_url</code> must stay empty.</p></>) : <p className="text-sm text-muted-foreground">Sign in again to load your form key.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Webhook className="h-4 w-4 text-primary" /> GoHighLevel automations (inbound webhook)</CardTitle><CardDescription>Every new lead, new appointment and deal status change is posted as JSON to a GoHighLevel workflow. In GHL: Automation → create a workflow → trigger <b>Inbound Webhook</b> → copy its URL here → send a test event → map the fields.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1"><Label>Inbound webhook URL</Label><div className="flex flex-col sm:flex-row gap-2"><Input value={ghlUrl} onChange={(e) => setGhlUrl(e.target.value)} placeholder="https://services.leadconnectorhq.com/hooks/…" disabled={!isAdmin} className="flex-1" />{isAdmin && <div className="flex gap-2"><Button onClick={saveGhl} disabled={ghlBusy || ghlUrl.trim() === (webhooks.ghl_url ?? "")}>{ghlBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button><Button variant="outline" onClick={sendTest} disabled={testBusy || !webhooks.ghl_url} title={webhooks.ghl_url ? "Posts a {event: \"test\"} payload to the saved URL" : "Save a URL first"}>{testBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />} Send test event</Button></div>}</div>
            <p className="text-xs text-muted-foreground">{webhooks.ghl_url ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Connected — events post to the saved URL.</span> : "Not connected. Only https URLs are accepted; the URL is stored on your dealership record, not shown to non-admins elsewhere."}</p>
          </div>
          <div className="text-xs space-y-1">
            <p className="font-semibold">Events: <code>lead.created</code> · <code>appointment.created</code> · <code>deal.status_changed</code> · <code>test</code></p>
            <p className="text-muted-foreground">Each POST is a JSON body with <code>event</code>, <code>dealership_id</code>, <code>at</code>, a <code>customer</code> object (first_name, last_name, phone, email), a <code>vehicle</code> object when one is attached, and the record ids. In the GHL workflow, after you receive a test event, map <code>customer.first_name</code> / <code>customer.phone</code> / <code>customer.email</code> to the contact fields and branch on <code>event</code>.</p>
            <button type="button" className="underline text-primary" onClick={() => setShowPayload((v) => !v)}>{showPayload ? "Hide" : "Show"} sample payload</button>
            {showPayload && <pre className="text-[11px] bg-muted rounded-lg p-3 overflow-x-auto whitespace-pre">{samplePayload}</pre>}
          </div>
          {isAdmin && <div>
            <p className="text-xs font-semibold mb-1">Recent deliveries</p>
            {whLog.length === 0 ? <p className="text-xs text-muted-foreground">Nothing sent yet. Save a URL and click "Send test event" — deliveries show here.</p> : (
              <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="text-left text-muted-foreground"><tr><th className="py-1 pr-3">Event</th><th className="py-1 pr-3">When</th><th className="py-1">Request</th></tr></thead>
                <tbody>{whLog.map((r) => <tr key={r.id} className="border-t"><td className="py-1 pr-3"><code>{r.event}</code></td><td className="py-1 pr-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td><td className="py-1 font-mono text-muted-foreground truncate max-w-[200px]">{r.request_id ?? "—"}</td></tr>)}</tbody></table></div>
            )}
          </div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Two-way texting (GoHighLevel → CarSales AI OS)</CardTitle><CardDescription>Customer replies to your texts and emails land in the Inbox here (and open a lead if they don't have one). Set it up once in GoHighLevel:</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {inboundUrl ? (<>
            <div className="flex flex-col sm:flex-row gap-2"><Input readOnly value={inboundUrl} className="font-mono text-xs flex-1" onFocus={(e) => e.currentTarget.select()} /><Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(inboundUrl); toast.success("Copied"); }}><Copy className="h-4 w-4 mr-1" /> Copy</Button></div>
            <ol className="text-sm list-decimal pl-5 space-y-1">
              <li>In GoHighLevel go to <b>Automation → Create workflow</b> (start from scratch).</li>
              <li>Add the trigger <b>Customer Replied</b> and set the reply channel to SMS and Email.</li>
              <li>Add the action <b>Webhook</b>, method <b>POST</b>, and paste the URL above.</li>
              <li>Save and <b>Publish</b> the workflow. Text the dealership number from your phone to test it.</li>
            </ol>
            <p className="text-xs text-muted-foreground">The key in this URL is your dealership's private automation key — treat the URL like a password. (Older workflows using the website-form key still log replies, but AI auto-replies only run for this URL.)</p>
          </>) : <p className="text-sm text-muted-foreground">Sign in again to load your dealership's inbound URL.</p>}
        </CardContent>
      </Card>

      <GhlSyncCard isAdmin={isAdmin} />

      {["Communication", "AI", "Vehicle data", "F&I", "Platform"].map((g) => (
        <Card key={g}>
          <CardHeader><CardTitle className="text-base">{g}</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {PROVIDERS.filter((p) => p.group === g).map((p) => { const s = st(p.key); const connected = s?.status === "connected"; return (
              <div key={p.key} className="py-3 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1"><p className="font-semibold">{p.label}</p><p className="text-xs text-muted-foreground">{p.what}{p.note ? ` ${p.note}` : ""}</p>{s?.lastError && <p className="text-xs text-destructive mt-1">{s.lastError}</p>}</div>
                <Badge variant="outline" className={connected ? "bg-emerald-100 text-emerald-800" : s?.status === "error" ? "bg-red-100 text-red-800" : p.key === "carfax" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}>{connected ? "Connected" : s?.status === "error" ? "Key rejected" : p.key === "carfax" ? "Links work now" : p.key === "stripe" ? "Platform" : "Needs API key"}</Badge>
                {isAdmin && p.key !== "stripe" && (connected ? <Button size="sm" variant="outline" onClick={() => disconnect(p.key)}><Unplug className="h-4 w-4 mr-1" /> Disconnect</Button> : <Button size="sm" variant={p.selfServe ? "default" : "outline"} onClick={() => { setOpen(p.key); setSecret(""); setCfg({}); }}><Plug className="h-4 w-4 mr-1" /> Connect</Button>)}
              </div>); })}
            {g === "Communication" && ghlConnected && (
              <div className="py-3 space-y-2 text-sm">
                <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Connected · Location <code className="text-xs">{ghlRow?.config?.locationId ?? "—"}</code></p>
                <p className="text-xs text-muted-foreground">Texts and emails sent from Inbox, customer profiles and follow-ups go out from this sub-account; bookings use its calendars.</p>
                {canSyncGhl && <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={syncGhlCustomers} disabled={!!ghlSync?.running}>{ghlSync?.running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Users className="h-4 w-4 mr-1" />} Sync customers to GoHighLevel</Button>
                  {ghlSync && <span className="text-xs text-muted-foreground">{ghlSync.synced} synced{ghlSync.skipped ? ` · ${ghlSync.skipped} skipped` : ""}{ghlSync.remaining != null ? ` · ${ghlSync.remaining} remaining` : ""}{ghlSync.running ? " · working…" : ""}</span>}
                </div>}
                {ghlSync && ghlSync.errors.length > 0 && <ul className="text-xs text-destructive list-disc pl-5">{ghlSync.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
                {ghlSync && !ghlSync.running && (ghlSync.remaining ?? 0) > 0 && <p className="text-xs text-muted-foreground">Customers without a phone or email can't be created in GoHighLevel — add contact info and sync again.</p>}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        {open && (() => { const p = PROVIDERS.find((x) => x.key === open)!; return (
          <DialogContent>
            <DialogHeader><DialogTitle>Connect {p.label}</DialogTitle><DialogDescription>The key is stored encrypted on the server and never shown again. {p.note}</DialogDescription></DialogHeader>
            <div className="space-y-3">
              {p.fields?.map((f) => <div key={f.key} className="space-y-1"><Label>{f.label}</Label><Input value={cfg[f.key] ?? ""} onChange={(e) => setCfg({ ...cfg, [f.key]: e.target.value })} placeholder={f.placeholder} /></div>)}
              <div className="space-y-1"><Label>{p.secretLabel}</Label><Input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(null)}>Cancel</Button><Button onClick={connect} disabled={busy || secret.length < 8}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}</Button></DialogFooter>
          </DialogContent>); })()}
      </Dialog>
    </div>
  );
}
