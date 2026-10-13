import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Globe, ExternalLink, Copy, CheckCircle2, AlertTriangle, RefreshCw, Loader2, FileCode2 } from "lucide-react";
import { toast } from "sonner";
import { useCollection, fullName, fmtDateTime, type LeadStage } from "@/lib/store";
import { useInventory, vTitle } from "@/lib/inventory";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenant";
import { supabase, SUPABASE_URL } from "@/lib/supabase";
import { syncInventoryNow } from "@/lib/ai";
import { refreshInventory } from "@/lib/inventory";

const WEB_SOURCE = "Website";
const DAY = 86400000;

export default function Website() {
  const tenant = useTenant();
  const { hasPermission } = useAuth();
  const leads = useCollection("leads");
  const customers = useCollection("customers");
  const deals = useCollection("deals");
  const inventory = useInventory();
  const [runs, setRuns] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [range, setRange] = useState<30 | 90 | 365>(30);

  const loadRuns = async () => { const { data } = await supabase.from("sync_runs").select("id,started_at,finished_at,status,added,updated,sold,errors").order("id", { ascending: false }).limit(5); setRuns(data ?? []); };
  useEffect(() => { loadRuns(); }, []);
  const runSync = async () => {
    setSyncing(true);
    try { const r = await syncInventoryNow(); const c = r?.results?.[0]; toast.success(c ? `Synced: ${c.added} added, ${c.updated} updated, ${c.sold} sold` : "Sync finished"); await refreshInventory(); await loadRuns(); }
    catch (e: any) { toast.error(e.message || "Sync failed"); } finally { setSyncing(false); }
  };
  const lastRun = runs[0];

  const intakeKey = (tenant as any).intakeKey as string | undefined;
  const endpoint = `${SUPABASE_URL}/functions/v1/lead-intake`;
  const embed = intakeKey ? `<form action="${endpoint}" method="POST">
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
  const copy = (text: string, msg: string) => { navigator.clipboard.writeText(text); toast.success(msg); };

  const webLeads = useMemo(() => leads.filter((l) => (l.source ?? "").toLowerCase() === WEB_SOURCE.toLowerCase()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [leads]);
  const inRange = useMemo(() => webLeads.filter((l) => Date.now() - new Date(l.createdAt).getTime() <= range * DAY), [webLeads, range]);
  const counts = useMemo(() => {
    const by = (s: LeadStage[]) => inRange.filter((l) => s.includes(l.stage)).length;
    const dealCustomers = new Set(deals.filter((d) => ["funded", "delivered"].includes(d.status)).map((d) => d.customerId));
    return { total: inRange.length, contacted: by(["contacted", "appointment", "negotiating", "sold"]), appointment: by(["appointment", "negotiating", "sold"]), sold: inRange.filter((l) => l.stage === "sold" || dealCustomers.has(l.customerId)).length, lost: by(["lost"]) };
  }, [inRange, deals]);
  const pct = (n: number) => (counts.total ? `${Math.round((n / counts.total) * 100)}%` : "—");
  const siteInventory = inventory.filter((v) => v.source && v.source !== "manual");

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Website</h1><p className="text-muted-foreground">How {tenant.website.replace(/^https?:\/\//, "")} feeds this system: inventory in, leads in, and what those leads turn into.</p></div>
        <Button asChild variant="outline"><a href={tenant.website} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1" /> Open site</a></Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div><CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Inventory feed</CardTitle><CardDescription>{tenant.inventorySource?.platform ? `Reads ${tenant.website} (${tenant.inventorySource.platform}) nightly at 3:15 AM — new units added, sold units marked, prices and photos refreshed.` : "No website feed is configured for this dealership. Units are entered by hand under Inventory; ask CarSalesSoftware.com to hook up your site's listings."}</CardDescription></div>
            {tenant.inventorySource?.platform && hasPermission(["manager", "inventory"]) && <Button size="sm" onClick={runSync} disabled={syncing}>{syncing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />} Sync now</Button>}
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {lastRun ? <p className="flex items-center gap-2">{lastRun.status === "ok" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />} Last sync {new Date(lastRun.started_at).toLocaleString()} — {lastRun.added} added, {lastRun.updated} updated, {lastRun.sold} sold{lastRun.errors ? `, ${lastRun.errors} errors` : ""}</p> : <p className="text-muted-foreground">No sync has run yet.</p>}
            <p className="text-muted-foreground">{inventory.length} units in the system · {siteInventory.length} came from the website feed · {inventory.filter((v) => v.status === "Available").length} available.</p>
            {runs.length > 1 && <div className="text-xs text-muted-foreground space-y-0.5 pt-1">{runs.slice(1).map((r) => <p key={r.id}>{new Date(r.started_at).toLocaleString()} · {r.status} · +{r.added} / ~{r.updated} / sold {r.sold}</p>)}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileCode2 className="h-5 w-5" /> Lead form</CardTitle><CardDescription>Paste this on {tenant.website} or point your existing form's action at the endpoint. Submissions create a customer + lead here instantly and alert the team.</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {intakeKey ? (<>
              <pre className="text-[11px] bg-muted rounded-lg p-3 overflow-x-auto whitespace-pre max-h-48">{embed}</pre>
              <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => copy(embed, "Copied form HTML")}><Copy className="h-4 w-4 mr-1" /> Copy HTML</Button><Button size="sm" variant="outline" onClick={() => copy(endpoint, "Copied endpoint URL")}>Copy endpoint URL</Button></div>
              <p className="text-xs text-muted-foreground">Also works as JSON (POST with header <code>x-intake-key</code>). Fields: name or first_name/last_name, phone, email, stock or vin, message, source, page_url. Honeypot <code>website_url</code> must stay empty.</p>
            </>) : <p className="text-sm text-muted-foreground">Sign in again to load your form key.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-2 space-y-0">
          <div><CardTitle>Website leads</CardTitle><CardDescription>Leads whose source is "{WEB_SOURCE}" — from the form above or entered by hand with that source.</CardDescription></div>
          <div className="flex gap-1">{([30, 90, 365] as const).map((d) => <Button key={d} size="sm" variant={range === d ? "default" : "outline"} onClick={() => setRange(d)}>{d === 365 ? "1 year" : `${d} days`}</Button>)}</div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[{ l: "Leads", v: counts.total, s: "" }, { l: "Contacted", v: counts.contacted, s: pct(counts.contacted) }, { l: "Appointments", v: counts.appointment, s: pct(counts.appointment) }, { l: "Sold", v: counts.sold, s: pct(counts.sold) }, { l: "Lost", v: counts.lost, s: pct(counts.lost) }].map((k) => (
              <div key={k.l} className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{k.l}</p><p className="text-2xl font-black">{k.v}</p>{k.s && <p className="text-xs text-muted-foreground">{k.s} of leads</p>}</div>
            ))}
          </div>
          {inRange.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{webLeads.length === 0 ? "No website leads yet. Once the form is on your site, every submission lands here and under Leads." : `No website leads in the last ${range} days.`}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-muted-foreground border-b"><th className="py-2 pr-3">When</th><th className="pr-3">Customer</th><th className="pr-3">Vehicle</th><th className="pr-3">Stage</th><th>Came from</th></tr></thead>
                <tbody>
                  {inRange.slice(0, 50).map((l) => { const c = customers.find((x) => x.id === l.customerId); const v = l.vehicleId ? inventory.find((x) => x.id === l.vehicleId) : undefined; const url = (l as any).sourceUrl as string | undefined; return (
                    <tr key={l.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap">{fmtDateTime(l.createdAt)}</td>
                      <td className="pr-3">{c ? <Link to={`/customers/${c.id}`} className="font-medium hover:underline">{fullName(c)}</Link> : "—"}<p className="text-xs text-muted-foreground">{c?.phone || c?.email || ""}</p></td>
                      <td className="pr-3">{v ? vTitle(v) : <span className="text-muted-foreground">—</span>}</td>
                      <td className="pr-3"><Badge variant="outline" className={l.stage === "sold" ? "bg-emerald-100 text-emerald-800" : l.stage === "lost" ? "bg-red-100 text-red-800" : l.stage === "new" ? "bg-amber-100 text-amber-800" : ""}>{l.stage}</Badge></td>
                      <td className="max-w-[240px] truncate">{url ? <a href={url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">{url.replace(/^https?:\/\//, "")}</a> : <span className="text-xs text-muted-foreground">form</span>}</td>
                    </tr>); })}
                </tbody>
              </table>
              {inRange.length > 50 && <p className="text-xs text-muted-foreground mt-2">Showing 50 of {inRange.length}. See all under <Link className="underline" to="/leads">Leads</Link>.</p>}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Traffic, sessions and ad spend aren't tracked here — those live in your analytics and ad accounts. This page counts only what reached the CRM.</p>
        </CardContent>
      </Card>
    </div>
  );
}
