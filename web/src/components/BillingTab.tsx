// Settings → Billing: the dealership's CarSalesSoftware.com subscription. Pick a plan (Stripe Checkout) or manage the
// card, invoices and plan in Stripe's billing portal. Plans and prices come from Stripe, set up by CarSalesSoftware.com.
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Loader2, ExternalLink, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { billingStatus, billingCheckout, billingPortal, money, PLAN_LABEL, STATUS_LABEL, type BillingStatus, type PlanKey } from "@/lib/billing";

const TONE = { good: "bg-emerald-100 text-emerald-800", warn: "bg-amber-100 text-amber-800", bad: "bg-red-100 text-red-800", muted: "bg-muted text-muted-foreground" } as const;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");

export default function BillingTab() {
  const [st, setSt] = useState<BillingStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const load = () => billingStatus().then((s) => { setSt(s); setErr(null); }, (e) => setErr(e.message));
  useEffect(() => {
    const b = params.get("billing");
    if (b === "success") toast.success("Thanks — your subscription is set up. It can take a few seconds to show here.");
    if (b === "cancel") toast("Checkout canceled — nothing was charged.");
    if (b) { params.delete("billing"); setParams(params, { replace: true }); setTimeout(load, 2500); }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = async (key: string, fn: () => Promise<{ url: string }>) => { setBusy(key); try { const { url } = await fn(); window.location.href = url; } catch (e: any) { toast.error(e.message); setBusy(null); } };

  if (err) return <Card><CardContent className="p-6 text-sm text-destructive">{err}</CardContent></Card>;
  if (!st) return <Card><CardContent className="p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading billing…</CardContent></Card>;
  const s = STATUS_LABEL[st.status] ?? { label: st.status, tone: "muted" as const };
  const bad = st.status === "past_due" || st.status === "unpaid";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> Your plan</CardTitle>
            <CardDescription>Your CarSalesSoftware.com subscription. Payments are handled securely by Stripe — card details never touch this app.</CardDescription></div>
          <Badge variant="outline" className={`${TONE[s.tone]} shrink-0`}>{s.label}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {st.demo ? <p className="text-sm text-muted-foreground">This is the demo dealership — it isn't billed.</p> : (<>
            <p className="text-2xl font-bold">{PLAN_LABEL[st.plan] ?? st.plan}</p>
            <p className="text-sm text-muted-foreground">
              {st.status === "trialing" && st.trialEndsAt ? `Free trial until ${day(st.trialEndsAt)}. Your card is charged after that unless you cancel.` :
                st.status === "active" && st.periodEnd ? `Renews ${day(st.periodEnd)}.` :
                bad ? "Your last payment didn't go through. Update your card to keep your account active." :
                st.status === "canceled" ? `Canceled${st.periodEnd ? ` — access through ${day(st.periodEnd)}` : ""}. Choose a plan below to restart.` :
                "No subscription yet. Choose a plan below."}
            </p>
            {bad && <p className="flex items-center gap-2 text-sm text-red-700"><AlertTriangle className="h-4 w-4" /> Payment failed</p>}
            {st.hasCustomer && st.canManage && <Button variant={bad ? "default" : "outline"} onClick={() => go("portal", () => billingPortal())} disabled={!!busy}>{busy === "portal" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-1" />} {bad ? "Update card" : "Manage billing, invoices and plan"}</Button>}
            {!st.canManage && <p className="text-sm text-muted-foreground">Only the owner or an admin can change billing.</p>}
          </>)}
        </CardContent>
      </Card>

      {!st.demo && !st.subscribed && (
        <Card>
          <CardHeader><CardTitle>Choose a plan</CardTitle><CardDescription>Month to month. Change plans or cancel any time from Manage billing.</CardDescription></CardHeader>
          <CardContent>
            {!st.configured || !st.prices.length ? <p className="text-sm text-muted-foreground">Plans aren't available online yet. Contact CarSalesSoftware.com at contact@casperb2b.com and we'll set you up.</p> : (
              <div className="grid sm:grid-cols-3 gap-3">
                {st.prices.map((p) => (
                  <div key={p.plan} className={`rounded-xl border-2 p-4 flex flex-col gap-2 ${st.plan === p.plan ? "border-primary" : ""}`}>
                    <p className="font-bold">{p.product || PLAN_LABEL[p.plan]}</p>
                    <p className="text-2xl font-bold">{money(p)}</p>
                    <div className="flex-1" />
                    {st.canManage && <Button onClick={() => go(p.plan, () => billingCheckout(p.plan as PlanKey))} disabled={!!busy}>{busy === p.plan ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />} Choose {PLAN_LABEL[p.plan]}</Button>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
