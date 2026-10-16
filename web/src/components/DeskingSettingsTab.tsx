// Settings → Desking: dealership-wide defaults every salesperson starts from (fees, tax, term, rate, tax rules) and a
// product menu (service contracts, GAP, maintenance) that drops into a deal with one click. Saved on the dealership.
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTenant, saveTenantOverrides, type DeskingSettings, type DeskingProduct, type RateTier } from "@/lib/tenant";
import { DEFAULT_TAX_RULES, parseMoney } from "@/lib/calculations";

export const DESKING_DEFAULTS: DeskingSettings = { pack: 0, docFee: 399, taxRate: 6.25, nonTaxableFees: 0, termMonths: 72, apr: 9.99, bankFee: 0, reserveSplit: 75, taxRules: DEFAULT_TAX_RULES, products: [], rateTiers: [], markup: 2 };
export const deskingOf = (t: { desking?: DeskingSettings }): DeskingSettings => ({ ...DESKING_DEFAULTS, ...(t.desking ?? {}), taxRules: { ...DEFAULT_TAX_RULES, ...(t.desking?.taxRules ?? {}) }, products: t.desking?.products ?? [], rateTiers: t.desking?.rateTiers ?? [], markup: t.desking?.markup ?? 2 });
/** The tier a credit score falls in (highest minimum score it meets). */
export const tierFor = (tiers: RateTier[], score: number) => (score > 0 ? [...tiers].sort((a, b) => b.minScore - a.minScore).find((t) => score >= t.minScore) ?? null : null);
const KIND = { warranty: "Service contract", gap: "GAP", maintenance: "Maintenance" } as const;
const uid = () => Math.random().toString(36).slice(2, 10);

export default function DeskingSettingsTab({ canEdit }: { canEdit: boolean }) {
  const tenant = useTenant();
  const [d, setD] = useState<DeskingSettings>(() => deskingOf(tenant));
  const [busy, setBusy] = useState(false);
  const num = (k: keyof DeskingSettings, money = true) => (
    <Input inputMode="decimal" disabled={!canEdit} defaultValue={String(d[k] ?? "")} onChange={(e) => setD({ ...d, [k]: money ? parseMoney(e.target.value) : parseFloat(e.target.value) || 0 })} className="h-9" />
  );
  const setTier = (id: string, patch: Partial<RateTier>) => setD({ ...d, rateTiers: (d.rateTiers ?? []).map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  const setProd = (id: string, patch: Partial<DeskingProduct>) => setD({ ...d, products: d.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const save = async () => { setBusy(true); try { await saveTenantOverrides({ desking: d }); toast.success("Desking defaults saved for everyone"); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); } };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" /> Desking defaults</CardTitle>
          <CardDescription>Every new deal starts with these numbers, for every salesperson and computer.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1"><Label className="text-xs">Doc fee ($)</Label>{num("docFee")}</div>
            <div className="space-y-1"><Label className="text-xs">Sales tax rate (%)</Label>{num("taxRate", false)}</div>
            <div className="space-y-1"><Label className="text-xs">Title, reg & plates ($)</Label>{num("nonTaxableFees")}</div>
            <div className="space-y-1"><Label className="text-xs">Pack ($)</Label>{num("pack")}</div>
            <div className="space-y-1"><Label className="text-xs">Default term</Label>
              <Select disabled={!canEdit} value={String(d.termMonths)} onValueChange={(v) => setD({ ...d, termMonths: parseInt(v) })}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent>{[36, 48, 60, 66, 72, 75, 84].map((t) => <SelectItem key={t} value={String(t)}>{t} months</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label className="text-xs">Default APR (%)</Label>{num("apr", false)}</div>
            <div className="space-y-1"><Label className="text-xs">Reserve split (%)</Label>{num("reserveSplit", false)}</div>
            <div className="space-y-1"><Label className="text-xs">Bank / acquisition fee ($)</Label>{num("bankFee")}</div>
          </div>
          <div className="grid sm:grid-cols-2 gap-2 rounded-lg border p-3">
            {([["tradeCredit", "Trade allowance reduces the taxed amount"], ["docFeeTaxable", "Doc fee is taxed"], ["productsTaxable", "Service contract / GAP / maintenance are taxed"], ["rebateReducesTax", "Rebate is taken off before tax"]] as const).map(([k, l]) =>
              <label key={k} className="flex items-center gap-2 text-sm"><Switch disabled={!canEdit} checked={d.taxRules[k]} onCheckedChange={(b) => setD({ ...d, taxRules: { ...d.taxRules, [k]: b } })} />{l}</label>)}
            <p className="sm:col-span-2 text-xs text-muted-foreground">Set these to your state's rules — check with your accountant or the state DOR if unsure.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0"><div><CardTitle>Product menu</CardTitle><CardDescription>One-click products on the desking screen. Cost is internal and never prints on the customer copy.</CardDescription></div>
          {canEdit && <Button size="sm" variant="outline" onClick={() => setD({ ...d, products: [...d.products, { id: uid(), kind: "warranty", name: "", retail: 0, cost: 0 }] })}><Plus className="h-4 w-4 mr-1" /> Add product</Button>}</CardHeader>
        <CardContent className="space-y-2">
          {d.products.length === 0 && <p className="text-sm text-muted-foreground">No products yet. Add your service contracts (e.g. "Powertrain 36 mo / 36k"), GAP and maintenance plans with their retail price and cost.</p>}
          {d.products.map((p) => (
            <div key={p.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12 sm:col-span-3 space-y-1"><Label className="text-xs">Type</Label><Select disabled={!canEdit} value={p.kind} onValueChange={(v) => setProd(p.id, { kind: v as DeskingProduct["kind"] })}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(KIND).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
              <div className="col-span-12 sm:col-span-4 space-y-1"><Label className="text-xs">Name</Label><Input disabled={!canEdit} className="h-9" value={p.name} onChange={(e) => setProd(p.id, { name: e.target.value })} placeholder="Powertrain 36 mo / 36k" /></div>
              <div className="col-span-5 sm:col-span-2 space-y-1"><Label className="text-xs">Retail ($)</Label><Input disabled={!canEdit} className="h-9" inputMode="decimal" defaultValue={p.retail || ""} onChange={(e) => setProd(p.id, { retail: parseMoney(e.target.value) })} /></div>
              <div className="col-span-5 sm:col-span-2 space-y-1"><Label className="text-xs">Cost ($)</Label><Input disabled={!canEdit} className="h-9" inputMode="decimal" defaultValue={p.cost || ""} onChange={(e) => setProd(p.id, { cost: parseMoney(e.target.value) })} /></div>
              {canEdit && <Button variant="ghost" size="icon" className="col-span-2 sm:col-span-1 h-9" title="Remove product" onClick={() => setD({ ...d, products: d.products.filter((x) => x.id !== p.id) })}><Trash2 className="h-4 w-4" /></Button>}
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0"><div><CardTitle>Rate sheet</CardTitle><CardDescription>Credit tiers by score. On the desking screen, typing a credit score fills the buy rate and sets APR = buy rate + markup.</CardDescription></div>
          {canEdit && <Button size="sm" variant="outline" onClick={() => setD({ ...d, rateTiers: [...(d.rateTiers ?? []), { id: uid(), name: `Tier ${(d.rateTiers ?? []).length + 1}`, minScore: 0, buyRate: 0, maxTerm: null }] })}><Plus className="h-4 w-4 mr-1" /> Add tier</Button>}</CardHeader>
        <CardContent className="space-y-2">
          <div className="max-w-[220px] space-y-1"><Label className="text-xs">Markup over buy rate (%)</Label><Input inputMode="decimal" disabled={!canEdit} defaultValue={String(d.markup ?? 2)} onChange={(e) => setD({ ...d, markup: parseFloat(e.target.value) || 0 })} className="h-9" /><p className="text-[11px] text-muted-foreground">Check your lenders' and your state's markup caps.</p></div>
          {(d.rateTiers ?? []).length === 0 && <p className="text-sm text-muted-foreground">No tiers yet — e.g. Tier 1: 720+ at 6.49%, Tier 2: 660+ at 8.99%, Tier 3: 600+ at 12.99% (max 72 mo).</p>}
          {(d.rateTiers ?? []).map((t) => (
            <div key={t.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12 sm:col-span-3 space-y-1"><Label className="text-xs">Tier</Label><Input disabled={!canEdit} className="h-9" value={t.name} onChange={(e) => setTier(t.id, { name: e.target.value })} /></div>
              <div className="col-span-4 sm:col-span-3 space-y-1"><Label className="text-xs">Min score</Label><Input disabled={!canEdit} className="h-9" inputMode="numeric" defaultValue={t.minScore || ""} onChange={(e) => setTier(t.id, { minScore: parseInt(e.target.value) || 0 })} /></div>
              <div className="col-span-4 sm:col-span-2 space-y-1"><Label className="text-xs">Buy rate (%)</Label><Input disabled={!canEdit} className="h-9" inputMode="decimal" defaultValue={t.buyRate || ""} onChange={(e) => setTier(t.id, { buyRate: parseFloat(e.target.value) || 0 })} /></div>
              <div className="col-span-3 sm:col-span-3 space-y-1"><Label className="text-xs">Max term (mo)</Label><Input disabled={!canEdit} className="h-9" inputMode="numeric" defaultValue={t.maxTerm ?? ""} onChange={(e) => setTier(t.id, { maxTerm: parseInt(e.target.value) || null })} /></div>
              {canEdit && <Button variant="ghost" size="icon" className="col-span-1 h-9" title="Remove tier" onClick={() => setD({ ...d, rateTiers: (d.rateTiers ?? []).filter((x) => x.id !== t.id) })}><Trash2 className="h-4 w-4" /></Button>}
            </div>
          ))}
        </CardContent>
      </Card>
      {canEdit ? <Button onClick={save} disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save desking defaults</Button> : <p className="text-sm text-muted-foreground">Only an owner or admin can change these.</p>}
    </div>
  );
}
