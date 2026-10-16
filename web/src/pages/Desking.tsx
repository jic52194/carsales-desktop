// Desking — structure a deal fast and get every number right: price, trade, taxes and fees, products, financing,
// a payment matrix (cash down × term), a target-payment solver, gross, and a printable worksheet (customer or manager copy).
// All math comes from lib/calculations.ts, so the screen, the matrix and the printout always agree.
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Save, Printer, Sparkles, Loader2, ChevronsUpDown, Check, ChevronDown, Target, RotateCcw, Plus, X, Landmark, Gauge, Car, History, CheckCircle2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { calculateDeal, downForPayment, priceForPayment, formatCurrency, parseMoney, DEFAULT_TAX_RULES, type DealParameters, type TaxRules } from "@/lib/calculations";
import { printDeal, printOptions, type DealOption } from "@/lib/printDeal";
import { useCollection, insert, update, fullName, type Deal } from "@/lib/store";
import { useInventory, vTitle } from "@/lib/inventory";
import { useAuth, listUsers } from "@/lib/auth";
import { useTenant, formatAddress } from "@/lib/tenant";
import { askAi, aiErrorMessage } from "@/lib/ai";
import { useRecords } from "@/lib/records";
import { deskingOf, tierFor } from "@/components/DeskingSettingsTab";
import type { Appraisal } from "@/pages/Appraisals";
import type { DeskingProduct } from "@/lib/tenant";
import type { Lender } from "@/pages/Lenders";

type Pencil = { at: string; by?: string; status: string; payment: number; price: number; down: number; term: number; apr: number; gross: number; p: DealParameters; productNames?: Record<string, string | undefined> };

const TERMS = [24, 36, 48, 60, 66, 72, 75, 84];
const MATRIX_TERMS = [48, 60, 72, 84];
type Defaults = ReturnType<typeof deskingOf>;

/** Money/number field: no leading zeros, accepts "$1,500" or "1.5k", selects on focus, Enter jumps to the next field. */
function Field({ label, value, onChange, kind = "money", hint, autoFocus }: { label: string; value: number; onChange: (n: number) => void; kind?: "money" | "pct" | "num"; hint?: string; autoFocus?: boolean }) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? (value ? (kind === "money" ? value.toLocaleString("en-US", { maximumFractionDigits: 2 }) : String(value)) : "");
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}{hint && <span className="text-muted-foreground font-normal"> · {hint}</span>}</Label>
      <div className="relative">
        {kind === "money" && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>}
        <Input data-desk autoFocus={autoFocus} inputMode="decimal" value={shown} placeholder="0"
          className={`h-9 tabular-nums ${kind === "money" ? "pl-6" : ""} ${kind === "pct" ? "pr-6" : ""}`}
          onFocus={(e) => { setText(value ? String(value) : ""); requestAnimationFrame(() => e.target.select()); }}
          onChange={(e) => { setText(e.target.value); onChange(kind === "money" ? parseMoney(e.target.value) : parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0); }}
          onBlur={() => setText(null)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const all = Array.from(document.querySelectorAll<HTMLInputElement>("input[data-desk]")); all[all.indexOf(e.currentTarget) + 1]?.focus(); } }} />
        {kind === "pct" && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>}
      </div>
    </div>
  );
}

/** Searchable picker (customers, vehicles). */
function Picker<T extends { id: string }>({ items, value, onChange, label, placeholder, render, search }: { items: T[]; value: string; onChange: (id: string) => void; label: (t: T) => string; placeholder: string; render: (t: T) => React.ReactNode; search: (t: T) => string }) {
  const [open, setOpen] = useState(false);
  const cur = items.find((i) => i.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between font-normal h-10"><span className="truncate">{cur ? label(cur) : <span className="text-muted-foreground">{placeholder}</span>}</span><ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" /></Button></PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width] min-w-[300px]" align="start">
        <Command filter={(v, s) => (v.toLowerCase().includes(s.toLowerCase()) ? 1 : 0)}>
          <CommandInput placeholder="Type to search…" />
          <CommandList><CommandEmpty>No match.</CommandEmpty><CommandGroup>
            {items.slice(0, 400).map((i) => <CommandItem key={i.id} value={`${search(i)} ${i.id}`} onSelect={() => { onChange(i.id); setOpen(false); }}><Check className={`h-4 w-4 mr-2 ${i.id === value ? "opacity-100" : "opacity-0"}`} />{render(i)}</CommandItem>)}
          </CommandGroup></CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function Desking() {
  const { user, hasPermission } = useAuth();
  const canApprove = hasPermission(["manager", "f_and_i"]);
  const tenant = useTenant();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const customers = useCollection("customers");
  const inventory = useInventory();
  const deals = useCollection("deals");
  const editingId = params.get("deal");
  const existing = editingId ? (deals.find((d) => d.id === editingId) as (Deal & Record<string, any>) | undefined) : undefined;
  const defaults = useMemo<Defaults>(() => deskingOf(tenant), [tenant.desking]); // eslint-disable-line react-hooks/exhaustive-deps
  const blank = (): DealParameters => ({
    sellingPrice: 0, vehicleCost: 0, pack: defaults.pack, nadaRetail: 0, tradeAllowance: 0, tradePayoff: 0, tradeActualCashValue: 0, nadaTrade: 0, cashDown: 0, rebate: 0,
    docFee: defaults.docFee, taxRate: defaults.taxRate, nonTaxableFees: defaults.nonTaxableFees, warrantyRetail: 0, warrantyCost: 0, gapRetail: 0, gapCost: 0, maintenanceRetail: 0, maintenanceCost: 0,
    termMonths: defaults.termMonths, apr: defaults.apr, buyRate: 0, reserveSplit: defaults.reserveSplit, bankFee: defaults.bankFee, dealerReserve: 0, taxRules: defaults.taxRules,
  });
  const fromDeal = (d: Deal & Record<string, any>): DealParameters => ({
    ...blank(), sellingPrice: d.sellingPrice ?? 0, vehicleCost: d.vehicleCost ?? 0, pack: d.pack ?? defaults.pack, nadaRetail: d.bookValue ?? 0,
    tradeAllowance: d.tradeAllowance ?? 0, tradePayoff: d.tradePayoff ?? 0, tradeActualCashValue: d.tradeAcv ?? 0, cashDown: d.cashDown ?? 0, rebate: d.rebate ?? 0,
    docFee: d.docFee ?? defaults.docFee, taxRate: d.taxRate ?? defaults.taxRate, nonTaxableFees: d.nonTaxableFees ?? defaults.nonTaxableFees,
    warrantyRetail: d.warrantyRetail ?? 0, warrantyCost: d.warrantyCost ?? 0, gapRetail: d.gapRetail ?? 0, gapCost: d.gapCost ?? 0, maintenanceRetail: d.maintenanceRetail ?? 0, maintenanceCost: d.maintenanceCost ?? 0,
    termMonths: d.termMonths || defaults.termMonths, apr: d.apr ?? defaults.apr, buyRate: d.buyRate ?? 0, reserveSplit: d.reserveSplit ?? defaults.reserveSplit, bankFee: d.bankFee ?? defaults.bankFee, dealerReserve: d.dealerReserve ?? 0,
    taxRules: { ...defaults.taxRules, ...(d.taxRules ?? {}) },
  });

  const [customerId, setCustomerId] = useState(params.get("customer") ?? "");
  const [vehicleId, setVehicleId] = useState(params.get("vehicle") ?? "");
  const [p, setP] = useState<DealParameters>(blank);
  const [notes, setNotes] = useState("");
  const [prodNames, setProdNames] = useState<{ warranty?: string; gap?: string; maintenance?: string }>({});
  const [lenderId, setLenderId] = useState("");
  const [options, setOptions] = useState<DealOption[]>([]);
  const lenders = useRecords<Lender>("lender").filter((l) => l.data.active !== false);
  const [creditScore, setCreditScore] = useState(0);
  const [mgrNote, setMgrNote] = useState("");
  const appraisals = useRecords<Appraisal>("appraisal");
  const loaded = useRef<string | null>(null);
  // load the deal once it arrives from the cloud (the list can be empty on first render)
  useEffect(() => {
    if (!existing || loaded.current === existing.id) return;
    loaded.current = existing.id;
    setCustomerId(existing.customerId); setVehicleId(existing.vehicleId ?? ""); setP(fromDeal(existing)); setNotes(existing.notes ?? ""); setProdNames(existing.productNames ?? {}); setLenderId(existing.lenderId ?? ""); setOptions(Array.isArray(existing.options) ? existing.options : []); setCreditScore(existing.creditScore ?? 0);
  }, [existing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const vehicle = inventory.find((v) => v.id === vehicleId);
  const customer = customers.find((c) => c.id === customerId);
  // picking a vehicle fills price and cost (a loaded deal keeps its own price)
  const prevVehicle = useRef(vehicleId);
  useEffect(() => {
    if (!vehicle) return;
    const changed = prevVehicle.current !== vehicleId; prevVehicle.current = vehicleId;
    setP((x) => ({ ...x, vehicleCost: vehicle.cost ?? x.vehicleCost, ...((!existing || changed) && (changed || !x.sellingPrice) ? { sellingPrice: vehicle.price ?? 0 } : {}) }));
  }, [vehicleId, vehicle?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const calc = useMemo(() => calculateDeal(p), [p]);
  // rate sheet: a credit score picks the tier → buy rate, and APR = buy rate + markup
  const tier = tierFor(defaults.rateTiers ?? [], creditScore);
  const applyScore = (n: number) => {
    setCreditScore(n);
    const t = tierFor(defaults.rateTiers ?? [], n);
    if (t && t.buyRate > 0) setP((x) => ({ ...x, buyRate: t.buyRate, apr: Math.round((t.buyRate + (defaults.markup ?? 0)) * 100) / 100 }));
  };
  const termTooLong = !!tier?.maxTerm && p.termMonths > tier.maxTerm;
  // the customer's appraised trades (not lost) — one click fills ACV and allowance
  const trades = customerId ? appraisals.filter((a) => a.data.customerId === customerId && a.data.status !== "lost") : [];
  const history: Pencil[] = Array.isArray(existing?.history) ? existing!.history : [];
  const set = (k: keyof DealParameters) => (n: number) => setP((x) => ({ ...x, [k]: n }));
  const setRule = (k: keyof TaxRules) => (b: boolean) => setP((x) => ({ ...x, taxRules: { ...DEFAULT_TAX_RULES, ...(x.taxRules ?? {}), [k]: b } }));
  const rules = { ...DEFAULT_TAX_RULES, ...(p.taxRules ?? {}) };
  const ready = p.sellingPrice > 0;

  // payment matrix: cash down × term
  const downs = useMemo(() => [...new Set([p.cashDown, p.cashDown + 1000, p.cashDown + 2500, p.cashDown + 5000].map((d) => Math.round(d)))], [p.cashDown]);
  const mTerms = useMemo(() => [...new Set([...MATRIX_TERMS, p.termMonths])].filter((t) => t > 0).sort((a, b) => a - b), [p.termMonths]);

  // target payment
  const [target, setTarget] = useState("");
  const tgt = parseMoney(target);
  const needDown = ready && tgt > 0 ? downForPayment(p, tgt) : null;
  const maxPrice = ready && tgt > 0 ? priceForPayment(p, tgt) : null;

  const [showTax, setShowTax] = useState(false);
  const [coach, setCoach] = useState<{ busy: boolean; text?: string; error?: string }>({ busy: false });
  const runCoach = async () => {
    if (!existing) return;
    setCoach({ busy: true });
    try { const text = await askAi("deal_coach", { context: { dealId: existing.id, customerId: existing.customerId, vehicleId: existing.vehicleId } }); setCoach({ busy: false, text: text || undefined, error: text ? undefined : "The assistant returned nothing — try again." }); }
    catch (e) { setCoach({ busy: false, error: aiErrorMessage(e) }); }
  };

  const save = async (status: Deal["status"] = "working", extra: Record<string, any> = {}) => {
    if (!customerId) return toast.error("Pick a customer first");
    if (!vehicleId) return toast.error("Pick a vehicle first");
    if (!ready) return toast.error("Enter a selling price");
    const row = {
      customerId, vehicleId, salespersonId: existing?.salespersonId ?? user?.id, status,
      sellingPrice: p.sellingPrice, cashDown: p.cashDown, tradeAllowance: p.tradeAllowance, tradePayoff: p.tradePayoff, tradeAcv: p.tradeActualCashValue,
      rebate: p.rebate, docFee: p.docFee, taxRate: p.taxRate, nonTaxableFees: p.nonTaxableFees, taxRules: rules,
      warrantyRetail: p.warrantyRetail, warrantyCost: p.warrantyCost, gapRetail: p.gapRetail, gapCost: p.gapCost, maintenanceRetail: p.maintenanceRetail, maintenanceCost: p.maintenanceCost,
      termMonths: p.termMonths, apr: p.apr, buyRate: p.buyRate, reserveSplit: p.reserveSplit, bankFee: p.bankFee, dealerReserve: calc.reserve, pack: p.pack, vehicleCost: p.vehicleCost, bookValue: p.nadaRetail,
      monthlyPayment: calc.monthlyPayment, amountFinanced: calc.amountFinanced, totalTaxes: calc.totalTaxes, cashPrice: calc.cashPrice,
      frontEndGross: calc.frontEndGross, backEndGross: calc.backEndGross, totalGross: calc.totalGross, notes,
      productNames: prodNames, lenderId: lenderId || null, lenderName: lenders.find((l) => l.id === lenderId)?.data.name ?? null, options,
      creditScore: creditScore || null, creditTier: tier?.name ?? null, managerNote: existing?.managerNote ?? null, ...extra,
      // pencil history: every save keeps a snapshot (newest first, last 10) so a manager can see how the deal moved
      history: [{ at: new Date().toISOString(), by: user?.fullName ?? user?.email, status, payment: calc.monthlyPayment, price: p.sellingPrice, down: p.cashDown, term: p.termMonths, apr: p.apr, gross: calc.totalGross, p: { ...p }, productNames: { ...prodNames } } as Pencil, ...history].slice(0, 10),
    };
    try {
      const d = existing ? (await update("deals", existing.id, row as any))! : await insert("deals", row as any);
      const leadId = params.get("lead"); if (leadId && !existing) update("leads", leadId, { stage: "negotiating" }).catch(() => {});
      toast.success(status === "pending_approval" ? "Sent to the manager for approval" : status === "approved" ? "Deal approved" : extra.managerNote ? "Sent back to the salesperson" : existing ? "Deal updated" : "Deal saved");
      if (!existing) navigate(`/desking?deal=${d.id}`, { replace: true });
      return d;
    } catch (e: any) { toast.error(e.message || "Could not save deal"); }
  };

  const print = (copy: "customer" | "manager") => {
    if (!ready) return toast.error("Enter a selling price first");
    const sp = listUsers().find((u) => u.id === (existing?.salespersonId ?? user?.id));
    printDeal(p, {
      dealer: { name: tenant.name, address: formatAddress(tenant), phone: tenant.phone, logoUrl: tenant.logoUrl || undefined, disclaimers: tenant.disclaimers },
      buyer: customer ? { name: fullName(customer), phone: customer.phone, email: customer.email, address: [customer.address, customer.city, customer.state, customer.zip].filter(Boolean).join(", ") } : null,
      vehicle: vehicle ? { title: vTitle(vehicle) + (vehicle.trim ? ` ${vehicle.trim}` : ""), vin: vehicle.vin, stock: vehicle.stockNumber, mileage: vehicle.mileage, color: vehicle.exteriorColor ?? undefined } : null,
      salesperson: sp?.fullName, dealNo: existing ? existing.id.slice(0, 8).toUpperCase() : undefined,
      downOptions: downs, termOptions: mTerms, productNames: prodNames, lender: lenders.find((l) => l.id === lenderId)?.data.name,
    }, copy);
  };

  const printOpts = () => {
    if (!options.length) return toast.error("Save at least one option first");
    printOptions(options, {
      dealer: { name: tenant.name, address: formatAddress(tenant), phone: tenant.phone, logoUrl: tenant.logoUrl || undefined, disclaimers: tenant.disclaimers },
      buyer: customer ? { name: fullName(customer) } : null,
      vehicle: vehicle ? { title: vTitle(vehicle) + (vehicle.trim ? ` ${vehicle.trim}` : ""), stock: vehicle.stockNumber } : null,
      downOptions: [], termOptions: [],
    });
  };
  const addOption = () => {
    if (!ready) return toast.error("Enter a selling price first");
    if (options.length >= 3) return toast.error("Up to 3 options — remove one first");
    setOptions((o) => [...o, { label: `Option ${"ABC"[o.length]}`, p: { ...p }, productNames: { ...prodNames } }]);
  };
  const pickProduct = (pr: DeskingProduct) => {
    const k = pr.kind; const on = prodNames[k] === pr.name;
    const f = k === "warranty" ? ["warrantyRetail", "warrantyCost"] : k === "gap" ? ["gapRetail", "gapCost"] : ["maintenanceRetail", "maintenanceCost"];
    setP((x) => ({ ...x, [f[0]]: on ? 0 : pr.retail, [f[1]]: on ? 0 : pr.cost }));
    setProdNames((n) => ({ ...n, [k]: on ? undefined : pr.name }));
  };

  // shortcuts: Ctrl/⌘+S save · Ctrl/⌘+P print customer copy
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() === "s") { e.preventDefault(); save("working"); }
      if (e.key.toLowerCase() === "p") { e.preventDefault(); print("customer"); }
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  });

  const money = (n: number) => formatCurrency(n);
  const gross = (n: number) => <span className={n < 0 ? "text-red-400" : "text-emerald-400"}>{money(n)}</span>;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Desking</h1><p className="text-muted-foreground">{existing ? <>Deal {existing.id.slice(0, 8).toUpperCase()} · <span className="capitalize">{existing.status.replace("_", " ")}</span></> : "Structure a deal"} <span className="hidden md:inline text-xs">· Enter = next field · Ctrl+S save · Ctrl+P print</span></p></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => { setP(blank()); setTarget(""); setProdNames({}); toast("Worksheet cleared"); }} title="Clear the numbers (keeps customer and vehicle)"><RotateCcw className="h-4 w-4 mr-1" /> Clear</Button>
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><Printer className="h-4 w-4 mr-1" /> Print <ChevronDown className="h-3.5 w-3.5 ml-1" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => print("customer")}>Customer worksheet</DropdownMenuItem><DropdownMenuItem onSelect={() => print("manager")}>Manager copy (with gross)</DropdownMenuItem><DropdownMenuItem disabled={!options.length} onSelect={printOpts}>Payment options sheet{options.length ? ` (${options.length})` : ""}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
          <Button variant="outline" onClick={() => save("working")}><Save className="h-4 w-4 mr-1" /> Save</Button>
          <Button onClick={() => save("pending_approval")}>Submit for approval</Button>
        </div>
      </div>

      {existing?.status === "pending_approval" && canApprove && <Card className="border-amber-300 bg-amber-50/60"><CardContent className="pt-4 flex flex-col md:flex-row md:items-center gap-3">
        <p className="text-sm font-semibold text-amber-900 shrink-0">Waiting on your approval</p>
        <Input className="h-9 bg-background" placeholder="Note to the salesperson (needed to send back) — e.g. get $1,000 more down or go 72 mo" value={mgrNote} onChange={(e) => setMgrNote(e.target.value)} />
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => { if (!mgrNote.trim()) return toast.error("Add a note so the salesperson knows what to change"); save("working", { managerNote: mgrNote.trim() }).then(() => setMgrNote("")); }}><Undo2 className="h-4 w-4 mr-1" /> Send back</Button>
          <Button onClick={() => save("approved", { managerNote: mgrNote.trim() || null })}><CheckCircle2 className="h-4 w-4 mr-1" /> Approve</Button>
        </div></CardContent></Card>}
      {existing?.managerNote && existing.status !== "pending_approval" && <p className="text-sm rounded-md border border-blue-200 bg-blue-50 text-blue-900 px-3 py-2"><b>Manager:</b> {existing.managerNote}</p>}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card><CardHeader className="pb-3"><CardTitle>Customer & vehicle</CardTitle></CardHeader><CardContent className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Customer</Label>
              <Picker items={customers} value={customerId} onChange={setCustomerId} placeholder="Search name or phone" label={(c) => fullName(c)} search={(c) => `${fullName(c)} ${c.phone ?? ""} ${c.email ?? ""}`}
                render={(c) => <span className="truncate">{fullName(c)}<span className="text-muted-foreground text-xs ml-2">{c.phone}</span></span>} /></div>
            <div className="space-y-1"><Label>Vehicle</Label>
              <Picker items={inventory.filter((v) => v.status !== "Sold" || v.id === vehicleId)} value={vehicleId} onChange={setVehicleId} placeholder="Search stock #, VIN or model"
                label={(v) => `${vTitle(v)} · #${v.stockNumber}`} search={(v) => `${vTitle(v)} ${v.trim} ${v.stockNumber} ${v.vin} ${v.exteriorColor ?? ""}`}
                render={(v) => <span className="truncate">{vTitle(v)} <span className="text-muted-foreground text-xs">#{v.stockNumber}{v.price ? ` · ${formatCurrency(v.price, false)}` : ""}</span></span>} /></div>
            {vehicle && <p className="md:col-span-2 text-xs text-muted-foreground">{vehicle.mileage.toLocaleString()} mi · VIN {vehicle.vin || "—"} · asking {vehicle.price ? formatCurrency(vehicle.price, false) : "call"}{vehicle.cost == null ? " · no cost on file — enter it below for accurate gross" : ` · cost ${formatCurrency(vehicle.cost, false)}`}</p>}
          </CardContent></Card>

          <Card><CardHeader className="pb-3"><CardTitle>Price, trade & cash</CardTitle></CardHeader><CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Selling price" value={p.sellingPrice} onChange={set("sellingPrice")} />
            <Field label="Rebate" value={p.rebate ?? 0} onChange={set("rebate")} />
            <Field label="Cash down" value={p.cashDown} onChange={set("cashDown")} />
            <Field label="Book value" hint="for LTV" value={p.nadaRetail} onChange={set("nadaRetail")} />
            <Field label="Trade allowance" value={p.tradeAllowance} onChange={set("tradeAllowance")} />
            <Field label="Trade payoff" value={p.tradePayoff} onChange={set("tradePayoff")} />
            <Field label="Trade ACV" hint="internal" value={p.tradeActualCashValue} onChange={set("tradeActualCashValue")} />
            <div className="space-y-1"><Label className="text-xs">Net trade</Label><p className={`h-9 flex items-center text-sm font-semibold tabular-nums ${calc.tradeEquity < 0 ? "text-red-600" : ""}`}>{p.tradeAllowance || p.tradePayoff ? (calc.tradeEquity < 0 ? `${money(-calc.tradeEquity)} negative` : money(calc.tradeEquity)) : "—"}</p></div>
            <Field label="Vehicle cost" hint="internal" value={p.vehicleCost} onChange={set("vehicleCost")} />
            <Field label="Pack" hint="internal" value={p.pack} onChange={set("pack")} />
            {trades.length > 0 && <div className="col-span-2 md:col-span-4 flex flex-wrap items-center gap-1.5 text-sm"><span className="text-xs text-muted-foreground flex items-center gap-1"><Car className="h-3.5 w-3.5" /> Appraised trade:</span>
              {trades.map((a) => { const A = a.data; const on = p.tradeActualCashValue === A.acv && p.tradeAllowance === A.offer; return <button key={a.id} type="button" onClick={() => setP((x) => ({ ...x, tradeActualCashValue: A.acv || 0, tradeAllowance: A.offer || 0 }))} className={`h-8 px-3 rounded-full border text-sm ${on ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{on && <Check className="h-3.5 w-3.5 inline mr-1" />}{A.year} {A.make} {A.model} · offer {formatCurrency(A.offer || 0, false)} · ACV {formatCurrency(A.acv || 0, false)}</button>; })}</div>}
          </CardContent></Card>

          <Card><CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0"><CardTitle>Taxes & fees</CardTitle><button type="button" onClick={() => setShowTax((s) => !s)} className="text-xs text-muted-foreground flex items-center gap-1"><ChevronDown className={`h-3.5 w-3.5 transition-transform ${showTax ? "" : "-rotate-90"}`} /> Tax rules</button></CardHeader><CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Tax rate" kind="pct" value={p.taxRate} onChange={set("taxRate")} />
              <Field label="Doc fee" value={p.docFee} onChange={set("docFee")} />
              <Field label="Title, reg & plates" hint="not taxed" value={p.nonTaxableFees} onChange={set("nonTaxableFees")} />
              <div className="space-y-1"><Label className="text-xs">Sales tax</Label><p className="h-9 flex items-center text-sm font-semibold tabular-nums">{money(calc.totalTaxes)} <span className="text-xs text-muted-foreground font-normal ml-1">on {formatCurrency(calc.taxableAmount, false)}</span></p></div>
            </div>
            {showTax && <div className="grid sm:grid-cols-2 gap-2 rounded-lg border p-3">
              {([["tradeCredit", "Trade allowance reduces the taxed amount"], ["docFeeTaxable", "Doc fee is taxed"], ["productsTaxable", "Service contract / GAP / maintenance are taxed"], ["rebateReducesTax", "Rebate is taken off before tax"]] as [keyof TaxRules, string][]).map(([k, l]) =>
                <label key={k} className="flex items-center gap-2 text-sm"><Switch checked={rules[k]} onCheckedChange={setRule(k)} />{l}</label>)}
              <p className="sm:col-span-2 text-xs text-muted-foreground">Changes apply to this deal. Dealership defaults live in Settings → Desking.</p>
            </div>}
          </CardContent></Card>

          <Card><CardHeader className="pb-3"><CardTitle>Products</CardTitle>{defaults.products.length > 0 ? <div className="flex flex-wrap gap-1.5 pt-2">{defaults.products.map((pr) => { const on = prodNames[pr.kind] === pr.name; return <button key={pr.id} type="button" onClick={() => pickProduct(pr)} className={`h-8 px-3 rounded-full border text-sm ${on ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{on ? <Check className="h-3.5 w-3.5 inline mr-1" /> : <Plus className="h-3.5 w-3.5 inline mr-1" />}{pr.name || pr.kind} · {formatCurrency(pr.retail, false)}</button>; })}</div> : <CardDescription>Add your product menu in Settings → Desking for one-click products.</CardDescription>}</CardHeader><CardContent className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Field label="Service contract" value={p.warrantyRetail} onChange={set("warrantyRetail")} /><Field label="Its cost" hint="internal" value={p.warrantyCost} onChange={set("warrantyCost")} />
            <Field label="GAP" value={p.gapRetail} onChange={set("gapRetail")} /><Field label="Its cost" hint="internal" value={p.gapCost} onChange={set("gapCost")} />
            <Field label="Maintenance" value={p.maintenanceRetail} onChange={set("maintenanceRetail")} /><Field label="Its cost" hint="internal" value={p.maintenanceCost} onChange={set("maintenanceCost")} />
          </CardContent></Card>

          <Card><CardHeader className="pb-3"><CardTitle>Financing</CardTitle></CardHeader><CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">{TERMS.map((t) => <button key={t} type="button" onClick={() => setP((x) => ({ ...x, termMonths: t }))} className={`h-8 px-3 rounded-full border text-sm ${t === p.termMonths ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{t} mo</button>)}
              <button type="button" onClick={() => setP((x) => ({ ...x, termMonths: 0 }))} className={`h-8 px-3 rounded-full border text-sm ${p.termMonths === 0 ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>Cash</button></div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-36"><Field label="Credit score" kind="num" value={creditScore} onChange={applyScore} /></div>
              {(defaults.rateTiers ?? []).length === 0 ? <p className="text-xs text-muted-foreground pb-2.5">Add a rate sheet in Settings → Desking and the score fills the rate.</p>
                : creditScore > 0 && (tier ? <p className="text-sm pb-2 flex items-center gap-2"><Gauge className="h-4 w-4 text-primary" /><Badge variant="outline">{tier.name}</Badge> buy {tier.buyRate}% → sell {Math.round((tier.buyRate + (defaults.markup ?? 0)) * 100) / 100}%{tier.maxTerm ? <span className="text-xs text-muted-foreground">· max {tier.maxTerm} mo</span> : null}</p>
                  : <p className="text-sm pb-2 text-amber-700">Below every tier on the rate sheet — needs a sub-prime lender.</p>)}
            </div>
            {termTooLong && <p className="text-sm rounded-md border border-amber-300 bg-amber-50 text-amber-900 px-2 py-1.5">{tier!.name} allows up to {tier!.maxTerm} months — this deal is at {p.termMonths}. <button type="button" className="underline font-medium" onClick={() => setP((x) => ({ ...x, termMonths: tier!.maxTerm! }))}>Use {tier!.maxTerm} mo</button></p>}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Field label="APR (sell rate)" kind="pct" value={p.apr} onChange={set("apr")} />
              <Field label="Buy rate" kind="pct" hint="internal" value={p.buyRate ?? 0} onChange={set("buyRate")} />
              <Field label="Reserve split" kind="pct" hint="internal" value={p.reserveSplit ?? 75} onChange={set("reserveSplit")} />
              {(p.buyRate ?? 0) > 0 ? <div className="space-y-1"><Label className="text-xs">Reserve <span className="text-muted-foreground font-normal">· est.</span></Label><p className="h-9 flex items-center text-sm font-semibold tabular-nums">{money(calc.reserve)}</p></div>
                : <Field label="Reserve" hint="manual" value={p.dealerReserve} onChange={set("dealerReserve")} />}
              <Field label="Bank fee" hint="internal" value={p.bankFee} onChange={set("bankFee")} />
            </div>
            {lenders.length > 0 && <div className="rounded-lg border p-3 space-y-1.5">
              <p className="text-xs font-semibold flex items-center gap-1"><Landmark className="h-3.5 w-3.5" /> Lender fit <span className="font-normal text-muted-foreground">· LTV {calc.ltv ? `${calc.ltv.toFixed(0)}%` : "needs book value"} · {p.termMonths || "cash"} mo</span></p>
              {lenders.map((l) => { const L = l.data; const why = [L.maxLtv && calc.ltv > L.maxLtv ? `LTV over ${L.maxLtv}%` : "", L.maxTerm && p.termMonths > L.maxTerm ? `term over ${L.maxTerm} mo` : ""].filter(Boolean); const on = lenderId === l.id;
                return <button key={l.id} type="button" onClick={() => setLenderId(on ? "" : l.id)} className={`w-full flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-sm ${on ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                  <span className="truncate"><b>{L.name}</b> <span className="text-xs text-muted-foreground">{[L.minScore && `${L.minScore}+ score`, L.maxLtv && `≤${L.maxLtv}% LTV`, L.maxTerm && `≤${L.maxTerm} mo`].filter(Boolean).join(" · ")}</span></span>
                  {why.length ? <Badge variant="outline" className="text-amber-700 border-amber-300 shrink-0">{why.join(", ")}</Badge> : <Badge variant="outline" className="text-emerald-700 border-emerald-300 shrink-0">{calc.ltv || !L.maxLtv ? "Fits" : "Check LTV"}</Badge>}
                </button>; })}
            </div>}
          </CardContent></Card>

          <Card><CardHeader className="pb-3"><CardTitle>Notes</CardTitle></CardHeader><CardContent><textarea className="w-full rounded-md border bg-background p-2 text-sm min-h-[64px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Stips, what the customer said, lender notes…" /></CardContent></Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-4 self-start">
          <Card className="bg-slate-900 text-white">
            <CardHeader className="pb-2"><CardDescription className="text-slate-400">{calc.isCashDeal && ready ? "Cash deal — due at delivery" : "Monthly payment"}</CardDescription>
              <CardTitle className="text-4xl font-black tabular-nums">{!ready ? "—" : calc.isCashDeal ? money(calc.dueFromCustomer) : <>{money(calc.monthlyPayment)}<span className="text-base font-normal text-slate-400">/mo</span></>}</CardTitle>
              {!ready ? <p className="text-xs text-slate-400 mt-1">Pick a vehicle or enter a selling price.</p> : !calc.isCashDeal && <p className="text-xs text-slate-400">{p.termMonths} mo @ {p.apr}% · {money(p.cashDown)} down</p>}</CardHeader>
            <CardContent className="space-y-1.5 text-sm tabular-nums">
              <div className="flex justify-between"><span className="text-slate-400">Cash price (incl. tax & fees)</span><span>{money(calc.cashPrice)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Sales tax</span><span>{money(calc.totalTaxes)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Amount financed</span><span>{money(calc.amountFinanced)}</span></div>
              {!calc.isCashDeal && <div className="flex justify-between"><span className="text-slate-400">Finance charge</span><span>{money(calc.financeCharge)}</span></div>}
              <div className="flex justify-between"><span className="text-slate-400">LTV</span><span className={calc.ltv > 125 ? "text-amber-300" : ""}>{calc.ltv ? `${calc.ltv.toFixed(0)}%` : "add book value"}</span></div>
              <div className="border-t border-slate-700 my-2" />
              <div className="flex justify-between"><span className="text-slate-400">Front gross</span>{gross(calc.frontEndGross)}</div>
              <div className="flex justify-between"><span className="text-slate-400">Back gross <span className="text-[11px]">(products {formatCurrency(calc.productsGross, false)} + reserve {formatCurrency(calc.reserve, false)})</span></span>{gross(calc.backEndGross)}</div>
              <div className="flex justify-between font-bold text-base"><span>Total gross</span>{gross(calc.totalGross)}</div>
            </CardContent>
          </Card>

          <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Hit a payment</CardTitle><CardDescription>What payment does the customer want?</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              <div className="relative"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span><Input inputMode="decimal" className="pl-6 h-9" placeholder="e.g. 350" value={target} onChange={(e) => setTarget(e.target.value)} /><span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">/mo</span></div>
              {tgt > 0 && ready && <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between gap-2"><span>{needDown === 0 ? "No extra down needed" : <>Cash down <b>{formatCurrency(needDown ?? 0, false)}</b></>} <span className="text-muted-foreground text-xs">at {p.termMonths} mo</span></span>{needDown !== null && needDown !== p.cashDown && <Button size="sm" variant="outline" className="h-7" onClick={() => setP((x) => ({ ...x, cashDown: needDown! }))}>Use</Button>}</div>
                <div className="flex items-center justify-between gap-2"><span>Or price <b>{formatCurrency(maxPrice ?? 0, false)}</b> <span className="text-muted-foreground text-xs">with {formatCurrency(p.cashDown, false)} down</span></span>{maxPrice !== null && maxPrice !== p.sellingPrice && <Button size="sm" variant="outline" className="h-7" onClick={() => setP((x) => ({ ...x, sellingPrice: maxPrice! }))}>Use</Button>}</div>
                {mTerms.filter((t) => t > p.termMonths).slice(0, 1).map((t) => { const c2 = calculateDeal({ ...p, termMonths: t }); return c2.monthlyPayment <= tgt ? <div key={t} className="flex items-center justify-between gap-2"><span>Or stretch to <b>{t} mo</b> → {money(c2.monthlyPayment)}</span><Button size="sm" variant="outline" className="h-7" onClick={() => setP((x) => ({ ...x, termMonths: t }))}>Use</Button></div> : null; })}
              </div>}
            </CardContent></Card>

          <Card><CardHeader className="pb-2"><CardTitle className="text-base">Payment matrix</CardTitle><CardDescription>Cash down × term at {p.apr}% — click a box to use it</CardDescription></CardHeader>
            <CardContent className="overflow-x-auto"><table className="w-full text-xs tabular-nums"><thead><tr><th className="text-left font-medium text-muted-foreground pb-1">Down</th>{mTerms.map((t) => <th key={t} className="font-medium text-muted-foreground pb-1">{t}</th>)}</tr></thead>
              <tbody>{downs.map((d) => <tr key={d}><td className="py-0.5 pr-1 text-muted-foreground whitespace-nowrap">{formatCurrency(d, false)}</td>{mTerms.map((t) => { const c2 = calculateDeal({ ...p, cashDown: d, termMonths: t }); const on = d === p.cashDown && t === p.termMonths;
                return <td key={t} className="p-0.5"><button type="button" disabled={!ready} onClick={() => setP((x) => ({ ...x, cashDown: d, termMonths: t }))} className={`w-full rounded-md border px-1 py-1.5 font-semibold ${on ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{!ready ? "—" : c2.isCashDeal ? "Cash" : formatCurrency(c2.monthlyPayment, false)}</button></td>; })}</tr>)}</tbody></table></CardContent></Card>

          <Card><CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0 gap-2"><div><CardTitle className="text-base">Options for the customer</CardTitle><CardDescription>Save up to 3 structures and print them side by side.</CardDescription></div><Button size="sm" variant="outline" onClick={addOption} disabled={!ready || options.length >= 3}><Plus className="h-4 w-4 mr-1" /> Save as option</Button></CardHeader>
            {options.length > 0 && <CardContent className="space-y-1.5">{options.map((o, i) => { const c2 = calculateDeal(o.p); return <div key={i} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm">
              <b className="w-16 shrink-0">{o.label}</b><span className="flex-1 truncate tabular-nums">{c2.isCashDeal ? `Cash ${formatCurrency(c2.dueFromCustomer, false)}` : `${formatCurrency(c2.monthlyPayment)}/mo · ${o.p.termMonths} mo · ${formatCurrency(o.p.cashDown, false)} down`}</span>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setP({ ...o.p }); setProdNames({ ...(o.productNames ?? {}) }); }}>Use</Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" title="Remove option" onClick={() => setOptions((xs) => xs.filter((_, j) => j !== i).map((x, j) => ({ ...x, label: `Option ${"ABC"[j]}` })))}><X className="h-3.5 w-3.5" /></Button></div>; })}
              <Button size="sm" className="w-full" variant="secondary" onClick={printOpts}><Printer className="h-4 w-4 mr-1" /> Print options sheet</Button></CardContent>}
          </Card>

          {history.length > 0 && <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4 text-primary" /> Pencil history</CardTitle><CardDescription>Every save, newest first. Restore loads those numbers (save to keep them).</CardDescription></CardHeader>
            <CardContent className="space-y-1.5">{history.map((h, i) => <div key={h.at + i} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs">
              <div className="flex-1 min-w-0"><p className="font-semibold tabular-nums">{h.term ? `${formatCurrency(h.payment)}/mo · ${h.term} mo @ ${h.apr}%` : "Cash"} · {formatCurrency(h.down, false)} down</p>
                <p className="text-muted-foreground truncate">{new Date(h.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}{h.by ? ` · ${h.by}` : ""} · {String(h.status).replace("_", " ")} · price {formatCurrency(h.price, false)}</p></div>
              {i > 0 && h.p && <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setP({ ...blank(), ...h.p }); setProdNames({ ...(h.productNames ?? {}) }); toast("Restored — save to keep it"); }}>Restore</Button>}</div>)}</CardContent></Card>}

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI deal coach</CardTitle><CardDescription>{existing ? "Ideas to structure this deal better — reads the last saved version." : "Save the deal first — the coach reads the saved deal."}</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              <Button size="sm" variant="outline" onClick={runCoach} disabled={!existing || coach.busy}>{coach.busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />} {coach.text ? "Coach again" : "AI deal coach"}</Button>
              {coach.error && <p className="text-sm rounded-md border border-amber-300 bg-amber-50 text-amber-900 p-2">{coach.error}</p>}
              {coach.text && <p className="text-sm whitespace-pre-wrap">{coach.text}</p>}
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">Estimates — subject to lender approval. <Badge variant="outline" className="ml-1">Internal fields never print on the customer copy</Badge></p>
        </div>
      </div>
    </div>
  );
}
