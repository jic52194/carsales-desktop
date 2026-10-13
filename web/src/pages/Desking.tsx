import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Save, Printer, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { calculateDeal, formatCurrency, type DealParameters } from "@/lib/calculations";
import { useCollection, insert, update, get, fullName, type Deal } from "@/lib/store";
import { useInventory, vTitle } from "@/lib/inventory";
import { useAuth } from "@/lib/auth";
import { useTenant, formatAddress } from "@/lib/tenant";
import { askAi, aiErrorMessage } from "@/lib/ai";

const DEFAULTS_KEY = "cso:desking-defaults";
const baseDefaults = { pack: 0, docFee: 399, taxRate: 6.25, nonTaxableFees: 0, termMonths: 72, apr: 9.99, bankFee: 0, dealerReserve: 0 };

function Num({ label, value, onChange, step = 1, suffix }: { label: string; value: number; onChange: (n: number) => void; step?: number; suffix?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}{suffix && <span className="text-muted-foreground"> ({suffix})</span>}</Label>
      <Input type="number" step={step} value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className="h-9" />
    </div>
  );
}

export default function Desking() {
  const { user } = useAuth();
  const tenant = useTenant();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const customers = useCollection("customers");
  const inventory = useInventory();
  const deals = useCollection("deals");
  const editingId = params.get("deal");
  const existing = editingId ? deals.find((d) => d.id === editingId) : undefined;

  const defaults = useMemo(() => { try { return { ...baseDefaults, ...JSON.parse(localStorage.getItem(DEFAULTS_KEY) || "{}") }; } catch { return baseDefaults; } }, []);
  const [customerId, setCustomerId] = useState(existing?.customerId ?? params.get("customer") ?? "");
  const [vehicleId, setVehicleId] = useState(existing?.vehicleId ?? params.get("vehicle") ?? "");
  const [p, setP] = useState<DealParameters>({
    sellingPrice: existing?.sellingPrice ?? 0, vehicleCost: 0, pack: existing?.pack ?? defaults.pack, nadaRetail: 0,
    tradeAllowance: existing?.tradeAllowance ?? 0, tradePayoff: existing?.tradePayoff ?? 0, tradeActualCashValue: existing?.tradeAcv ?? 0, nadaTrade: 0,
    cashDown: existing?.cashDown ?? 0, docFee: existing?.docFee ?? defaults.docFee, taxRate: existing?.taxRate ?? defaults.taxRate, nonTaxableFees: existing?.nonTaxableFees ?? defaults.nonTaxableFees,
    warrantyRetail: existing?.warrantyRetail ?? 0, warrantyCost: existing?.warrantyCost ?? 0, gapRetail: existing?.gapRetail ?? 0, gapCost: existing?.gapCost ?? 0, maintenanceRetail: 0, maintenanceCost: 0,
    termMonths: existing?.termMonths ?? defaults.termMonths, apr: existing?.apr ?? defaults.apr, bankFee: existing?.bankFee ?? defaults.bankFee, dealerReserve: existing?.dealerReserve ?? defaults.dealerReserve,
  });
  const vehicle = inventory.find((v) => v.id === vehicleId);
  const customer = customers.find((c) => c.id === customerId);

  useEffect(() => {
    if (vehicle && !existing) setP((x) => ({ ...x, sellingPrice: vehicle.price ?? 0, vehicleCost: vehicle.cost ?? 0, nadaRetail: vehicle.price ?? 0 }));
    else if (vehicle) setP((x) => ({ ...x, vehicleCost: vehicle.cost ?? 0, nadaRetail: vehicle.price ?? 0 }));
  }, [vehicleId]); // eslint-disable-line react-hooks/exhaustive-deps

  const calc = useMemo(() => calculateDeal(p), [p]);
  const [coach, setCoach] = useState<{ busy: boolean; text?: string; error?: string }>({ busy: false });
  const runCoach = async () => {
    if (!existing) return;
    setCoach({ busy: true });
    try { const text = await askAi("deal_coach", { context: { dealId: existing.id, customerId: existing.customerId, vehicleId: existing.vehicleId } }); setCoach({ busy: false, text: text || undefined, error: text ? undefined : "The assistant returned nothing — try again." }); }
    catch (e) { setCoach({ busy: false, error: aiErrorMessage(e) }); }
  };
  const set = (k: keyof DealParameters) => (n: number) => setP({ ...p, [k]: n });
  const terms = [24, 36, 48, 60, 72, 84];

  const save = async (status: Deal["status"] = "working") => {
    if (!customerId) return toast.error("Select a customer");
    if (!vehicleId) return toast.error("Select a vehicle");
    const row = {
      customerId, vehicleId, salespersonId: user?.id, status,
      sellingPrice: p.sellingPrice, cashDown: p.cashDown, tradeAllowance: p.tradeAllowance, tradePayoff: p.tradePayoff, tradeAcv: p.tradeActualCashValue,
      docFee: p.docFee, taxRate: p.taxRate, nonTaxableFees: p.nonTaxableFees, warrantyRetail: p.warrantyRetail, warrantyCost: p.warrantyCost, gapRetail: p.gapRetail, gapCost: p.gapCost,
      termMonths: p.termMonths, apr: p.apr, bankFee: p.bankFee, dealerReserve: p.dealerReserve, pack: p.pack,
      monthlyPayment: calc.monthlyPayment, amountFinanced: calc.amountFinanced, frontEndGross: calc.frontEndGross, backEndGross: calc.backEndGross, totalGross: calc.totalGross,
    };
    localStorage.setItem(DEFAULTS_KEY, JSON.stringify({ pack: p.pack, docFee: p.docFee, taxRate: p.taxRate, nonTaxableFees: p.nonTaxableFees, termMonths: p.termMonths, apr: p.apr, bankFee: p.bankFee, dealerReserve: p.dealerReserve }));
    try {
      const d = existing ? (await update("deals", existing.id, row as any))! : await insert("deals", row as any);
      const leadId = params.get("lead"); if (leadId && !existing) update("leads", leadId, { stage: "negotiating" }).catch(() => {});
      toast.success(existing ? "Deal updated" : "Deal saved");
      navigate(`/deals?open=${d.id}`);
    } catch (e: any) { toast.error(e.message || "Could not save deal"); }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Desking</h1><p className="text-muted-foreground">{existing ? `Editing deal · ${existing.status}` : "Structure a deal"}</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print</Button>
          <Button variant="outline" onClick={() => save("working")}><Save className="h-4 w-4 mr-1" /> Save</Button>
          <Button onClick={() => save("pending_approval")}>Submit for approval</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card><CardHeader><CardTitle>Customer & vehicle</CardTitle></CardHeader><CardContent className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Customer</Label><Select value={customerId} onValueChange={setCustomerId}><SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger><SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{fullName(c)}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Vehicle</Label><Select value={vehicleId} onValueChange={setVehicleId}><SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger><SelectContent>{inventory.filter((v) => v.status !== "Sold" || v.id === vehicleId).map((v) => <SelectItem key={v.id} value={v.id}>{vTitle(v)} · #{v.stockNumber}{v.price ? ` · ${formatCurrency(v.price)}` : ""}</SelectItem>)}</SelectContent></Select></div>
            {vehicle && <p className="md:col-span-2 text-xs text-muted-foreground">{vehicle.mileage.toLocaleString()} mi · VIN {vehicle.vin || "—"} · asking {vehicle.price ? formatCurrency(vehicle.price) : "call"}{vehicle.cost == null && " · no cost on file (gross shows full price until you enter cost in Inventory)"}</p>}
          </CardContent></Card>

          <Card><CardHeader><CardTitle>Price, trade & cash</CardTitle></CardHeader><CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Num label="Selling price" value={p.sellingPrice} onChange={set("sellingPrice")} />
            <Num label="Vehicle cost" value={p.vehicleCost} onChange={set("vehicleCost")} />
            <Num label="Pack" value={p.pack} onChange={set("pack")} />
            <Num label="Cash down" value={p.cashDown} onChange={set("cashDown")} />
            <Num label="Trade allowance" value={p.tradeAllowance} onChange={set("tradeAllowance")} />
            <Num label="Trade ACV" value={p.tradeActualCashValue} onChange={set("tradeActualCashValue")} />
            <Num label="Trade payoff" value={p.tradePayoff} onChange={set("tradePayoff")} />
            <Num label="Doc fee" value={p.docFee} onChange={set("docFee")} />
            <Num label="Tax rate" value={p.taxRate} onChange={set("taxRate")} step={0.01} suffix="%" />
            <Num label="Non-taxable fees" value={p.nonTaxableFees} onChange={set("nonTaxableFees")} />
          </CardContent></Card>

          <Card><CardHeader><CardTitle>Back end & financing</CardTitle></CardHeader><CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Num label="Warranty retail" value={p.warrantyRetail} onChange={set("warrantyRetail")} />
            <Num label="Warranty cost" value={p.warrantyCost} onChange={set("warrantyCost")} />
            <Num label="GAP retail" value={p.gapRetail} onChange={set("gapRetail")} />
            <Num label="GAP cost" value={p.gapCost} onChange={set("gapCost")} />
            <div className="space-y-1"><Label className="text-xs">Term</Label><Select value={String(p.termMonths)} onValueChange={(v) => setP({ ...p, termMonths: parseInt(v) })}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent>{terms.map((t) => <SelectItem key={t} value={String(t)}>{t} months</SelectItem>)}</SelectContent></Select></div>
            <Num label="APR" value={p.apr} onChange={set("apr")} step={0.01} suffix="%" />
            <Num label="Bank fee" value={p.bankFee} onChange={set("bankFee")} />
            <Num label="Dealer reserve" value={p.dealerReserve} onChange={set("dealerReserve")} />
          </CardContent></Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white">
            <CardHeader><CardDescription className="text-slate-400">Monthly payment</CardDescription><CardTitle className="text-4xl font-black">{p.sellingPrice > 0 ? formatCurrency(calc.monthlyPayment) : "—"}<span className="text-base font-normal text-slate-400">/mo</span></CardTitle>{p.sellingPrice <= 0 && <p className="text-xs text-slate-400 mt-1">Pick a vehicle or enter a selling price to see the payment.</p>}</CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Amount financed</span><span>{formatCurrency(calc.amountFinanced)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Taxes</span><span>{formatCurrency(calc.totalTaxes)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">{p.termMonths} mo @ {p.apr}%</span><span>LTV {calc.ltv ? `${calc.ltv.toFixed(0)}%` : "—"}</span></div>
              <div className="border-t border-slate-700 my-2" />
              <div className="flex justify-between"><span className="text-slate-400">Front gross</span><span className={calc.frontEndGross < 0 ? "text-red-400" : "text-emerald-400"}>{formatCurrency(calc.frontEndGross)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Back gross</span><span className={calc.backEndGross < 0 ? "text-red-400" : "text-emerald-400"}>{formatCurrency(calc.backEndGross)}</span></div>
              <div className="flex justify-between font-bold text-base"><span>Total gross</span><span className={calc.totalGross < 0 ? "text-red-400" : "text-emerald-400"}>{formatCurrency(calc.totalGross)}</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI deal coach</CardTitle><CardDescription>{existing ? "Ideas to structure this deal better — reads the last saved version." : "Save the deal first — the coach reads the saved deal."}</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              <Button size="sm" variant="outline" onClick={runCoach} disabled={!existing || coach.busy} title={existing ? "" : "Save the deal first"}>{coach.busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />} {coach.text ? "Coach again" : "AI deal coach"}</Button>
              {coach.error && <p className="text-sm rounded-md border border-amber-300 bg-amber-50 text-amber-900 p-2">{coach.error}</p>}
              {coach.text && <p className="text-sm whitespace-pre-wrap">{coach.text}</p>}
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle className="text-base">Payment grid</CardTitle><CardDescription>By term at current APR</CardDescription></CardHeader><CardContent className="grid grid-cols-3 gap-2">
            {terms.map((t) => { const c = calculateDeal({ ...p, termMonths: t }); return <button key={t} onClick={() => setP({ ...p, termMonths: t })} className={`rounded-lg border p-2 text-center ${t === p.termMonths ? "border-primary bg-primary/10" : ""}`}><p className="text-xs text-muted-foreground">{t} mo</p><p className="font-bold">{p.sellingPrice > 0 ? formatCurrency(c.monthlyPayment) : "—"}</p></button>; })}
          </CardContent></Card>
          <Card className="print:block"><CardContent className="p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">{tenant.name}</p><p>{formatAddress(tenant)} · {tenant.phone}</p>
            {customer && <p>Buyer: {fullName(customer)}</p>}{vehicle && <p>{vTitle(vehicle)} · Stock #{vehicle.stockNumber}</p>}
            {tenant.disclaimers.map((d, i) => <p key={i}>{d}</p>)}
            <Badge variant="outline" className="mt-1">Estimate — subject to lender approval</Badge>
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}
