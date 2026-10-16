// Dealerships → "Billing (Stripe)": one-time setup of CarSalesSoftware.com subscription billing. Super admins only.
// The key and signing secret are sent straight to the `billing` Edge Function and stored server-side; they are never shown again.
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Copy, Loader2, CheckCircle2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { SUPABASE_URL } from "@/lib/supabase";
import { billingConfig, billingSaveConfig, money, PLAN_LABEL, type BillingConfig, type PlanKey } from "@/lib/billing";

const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/stripe-webhook`;
const EVENTS = ["checkout.session.completed", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "invoice.paid", "invoice.payment_failed"];
const copy = (t: string) => navigator.clipboard.writeText(t).then(() => toast.success("Copied"), () => toast.error("Copy failed"));
const PLANS: PlanKey[] = ["starter", "pro", "enterprise"];

export default function PlatformBillingCard() {
  const [c, setC] = useState<BillingConfig | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(""); const [whsec, setWhsec] = useState("");
  const [prices, setPrices] = useState<Record<PlanKey, string>>({ starter: "", pro: "", enterprise: "" });
  const [trial, setTrial] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => billingConfig().then((r) => {
    setC(r); setErr(null); if (!r.configured || !r.webhook) setOpen(true);
    const p = { starter: "", pro: "", enterprise: "" } as Record<PlanKey, string>; for (const x of r.prices ?? []) p[x.plan] = x.id; setPrices(p); setTrial(String(r.trialDays ?? 0));
  }, (e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    try { await billingSaveConfig({ secretKey: key || undefined, webhookSecret: whsec || undefined, prices, trialDays: Number(trial) || 0 }); setKey(""); setWhsec(""); toast.success("Billing saved"); await load(); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  const ready = c?.configured && c.webhook && (c.prices ?? []).some((p) => !p.error);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> Billing (Stripe)</CardTitle>
          <CardDescription>Dealerships pick a plan in Settings → Billing and pay by card. Plan and status update here automatically; you can also send a payment link from a dealership's row.</CardDescription></div>
        {ready ? <Badge className="bg-emerald-600 shrink-0 gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> {c?.mode === "live" ? "Live" : "Test mode"}</Badge> : <Badge variant="outline" className="shrink-0">{c?.configured ? "Almost done" : "Not set up"}</Badge>}
      </CardHeader>
      <CardContent className="space-y-4">
        {err && <p className="text-sm text-destructive">{err}</p>}
        {c?.configured && (c.prices ?? []).length > 0 && (
          <div className="flex flex-wrap gap-2">{(c.prices ?? []).map((p) => <Badge key={p.plan} variant="outline" className={p.error ? "text-destructive" : ""}>{PLAN_LABEL[p.plan]}: {p.error ? "price not found" : `${p.product ?? ""} ${money(p)}`.trim()}</Badge>)}{(c.trialDays ?? 0) > 0 && <Badge variant="outline">{c.trialDays}-day free trial</Badge>}</div>
        )}
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-sm font-semibold"><ChevronDown className={`h-4 w-4 transition-transform ${open ? "" : "-rotate-90"}`} /> {c?.configured ? "Billing settings" : "One-time setup"}</button>
        {open && (
          <div className="space-y-4">
            <ol className="text-sm space-y-2 list-decimal pl-5 text-muted-foreground">
              <li>In Stripe (start in <b className="text-foreground">Test mode</b>): <b className="text-foreground">Product catalog → Add product</b> for each plan with a <b className="text-foreground">recurring monthly price</b>. Copy each price ID (starts with <code>price_</code>).</li>
              <li><b className="text-foreground">Developers → API keys → Create restricted key</b> with write access to Customers, Checkout Sessions, Customer portal, and read access to Prices, Subscriptions, Balance. Copy it (starts with <code>rk_</code>).</li>
              <li><b className="text-foreground">Developers → Webhooks → Add endpoint</b> with this URL and these events, then copy its <b className="text-foreground">Signing secret</b> (starts with <code>whsec_</code>).
                <div className="mt-1 flex items-center gap-2"><code className="text-xs bg-muted/60 rounded px-2 py-1 break-all">{WEBHOOK_URL}</code><Button size="sm" variant="outline" onClick={() => copy(WEBHOOK_URL)}><Copy className="h-3.5 w-3.5" /></Button></div>
                <div className="mt-1 flex items-center gap-2 flex-wrap"><span className="text-xs">{EVENTS.join(", ")}</span><Button size="sm" variant="ghost" onClick={() => copy(EVENTS.join("\n"))}><Copy className="h-3.5 w-3.5 mr-1" />Copy events</Button></div></li>
              <li><b className="text-foreground">Settings → Billing → Customer portal</b>: turn on cancel, update payment method and switch plans (add your products), then <b className="text-foreground">Save</b>.</li>
              <li>Paste below and save. When test checkouts work, repeat in Live mode and paste the live key, secret and price IDs.</li>
            </ol>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Restricted API key {c?.configured && <span className="text-xs text-muted-foreground font-normal">(saved — leave blank to keep)</span>}</Label><Input type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder="rk_test_…" /></div>
              <div className="space-y-1"><Label>Webhook signing secret {c?.webhook && <span className="text-xs text-muted-foreground font-normal">(saved — leave blank to keep)</span>}</Label><Input type="password" autoComplete="off" value={whsec} onChange={(e) => setWhsec(e.target.value)} placeholder="whsec_…" /></div>
              {PLANS.map((p) => <div key={p} className="space-y-1"><Label>{PLAN_LABEL[p]} price ID</Label><Input value={prices[p]} onChange={(e) => setPrices({ ...prices, [p]: e.target.value })} placeholder="price_… (leave blank to hide this plan)" /></div>)}
              <div className="space-y-1"><Label>Free trial (days)</Label><Input inputMode="numeric" value={trial} onChange={(e) => setTrial(e.target.value.replace(/\D/g, ""))} placeholder="0" /><p className="text-xs text-muted-foreground">Card is collected up front; first charge after the trial. 0 = no trial.</p></div>
            </div>
            <Button onClick={save} disabled={busy || (!c?.configured && !key)}>{busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save billing</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
