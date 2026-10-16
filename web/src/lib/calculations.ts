// Desking math. One function, `calculateDeal`, drives the screen, the payment matrix, the target-payment solver and the
// printed worksheet, so every number a customer or manager sees comes from the same place. Money is rounded to cents at
// each step a lender would round (tax, amount financed, payment) so the printout matches the contract.

export interface TaxRules {
  /** Trade-in allowance reduces the taxable amount (most states). */
  tradeCredit: boolean;
  /** Doc fee is taxed. */
  docFeeTaxable: boolean;
  /** Service contract / GAP / maintenance are taxed. */
  productsTaxable: boolean;
  /** Rebate is subtracted before tax (most states tax the price before the rebate). */
  rebateReducesTax: boolean;
}
export const DEFAULT_TAX_RULES: TaxRules = { tradeCredit: true, docFeeTaxable: true, productsTaxable: false, rebateReducesTax: false };

export interface DealParameters {
  sellingPrice: number;
  vehicleCost: number;
  pack: number;              // dealership overhead per car, added to cost
  nadaRetail: number;        // book value used for LTV (not the asking price); 0 = unknown
  tradeAllowance: number;
  tradePayoff: number;
  tradeActualCashValue: number;
  nadaTrade: number;
  cashDown: number;
  rebate?: number;
  docFee: number;
  taxRate: number;           // percent, e.g. 6.25
  nonTaxableFees: number;    // title, registration, plates
  warrantyRetail: number; warrantyCost: number;
  gapRetail: number; gapCost: number;
  maintenanceRetail: number; maintenanceCost: number;
  termMonths: number;
  apr: number;               // sell rate, percent
  buyRate?: number;          // lender buy rate, percent — when set, reserve is estimated from the markup
  reserveSplit?: number;     // dealer participation in the markup, percent (often 75)
  bankFee: number;           // acquisition fee charged by the lender to the dealer
  dealerReserve: number;     // manual reserve, used when no buy rate is given
  taxRules?: TaxRules;
}

export interface DealCalculations {
  cashPrice: number;         // price − rebate + fees + products + tax
  taxableAmount: number;
  totalTaxes: number;
  tradeEquity: number;       // allowance − payoff (negative = negative equity rolled in)
  amountFinanced: number;    // never below 0
  dueFromCustomer: number;   // cash down, or the full balance on a cash deal
  isCashDeal: boolean;
  monthlyPayment: number;
  totalOfPayments: number;
  financeCharge: number;
  frontEndGross: number;
  productsGross: number;
  reserve: number;
  backEndGross: number;
  totalGross: number;
  ltv: number;               // % of book value; 0 when book value is unknown
}

export const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

/** Level monthly payment for an amount financed. */
export function payment(amount: number, aprPct: number, months: number): number {
  if (!(amount > 0) || !(months > 0)) return 0;
  const r = aprPct / 100 / 12;
  if (r <= 0) return round2(amount / months);
  return round2((amount * r) / (1 - Math.pow(1 + r, -months)));
}
/** Amount a payment buys (inverse of `payment`). */
export function presentValue(pmt: number, aprPct: number, months: number): number {
  if (!(pmt > 0) || !(months > 0)) return 0;
  const r = aprPct / 100 / 12;
  if (r <= 0) return pmt * months;
  return (pmt * (1 - Math.pow(1 + r, -months))) / r;
}

export function calculateDeal(p: DealParameters): DealCalculations {
  const rules = { ...DEFAULT_TAX_RULES, ...(p.taxRules ?? {}) };
  const rebate = Math.max(0, p.rebate ?? 0);
  const products = (p.warrantyRetail || 0) + (p.gapRetail || 0) + (p.maintenanceRetail || 0);

  // tax
  const taxableAmount = Math.max(0,
    p.sellingPrice
    - (rules.rebateReducesTax ? rebate : 0)
    + (rules.docFeeTaxable ? p.docFee : 0)
    + (rules.productsTaxable ? products : 0)
    - (rules.tradeCredit ? p.tradeAllowance : 0));
  const totalTaxes = round2(taxableAmount * (p.taxRate / 100));

  // what the customer owes, then what gets financed
  const cashPrice = round2(p.sellingPrice - rebate + p.docFee + p.nonTaxableFees + products + totalTaxes);
  const tradeEquity = round2(p.tradeAllowance - p.tradePayoff);
  const balance = round2(cashPrice - tradeEquity - p.cashDown);
  const amountFinanced = Math.max(0, balance);
  const isCashDeal = amountFinanced <= 0 || !(p.termMonths > 0);
  const monthlyPayment = isCashDeal ? 0 : payment(amountFinanced, p.apr, p.termMonths);
  const totalOfPayments = round2(monthlyPayment * (isCashDeal ? 0 : p.termMonths));
  const financeCharge = round2(Math.max(0, totalOfPayments - amountFinanced));
  const dueFromCustomer = isCashDeal ? round2(Math.max(0, balance + p.cashDown)) : round2(p.cashDown);

  // gross
  const frontEndGross = round2(p.sellingPrice - (p.vehicleCost + p.pack) + (p.tradeActualCashValue - p.tradeAllowance));
  const productsGross = round2((p.warrantyRetail - p.warrantyCost) + (p.gapRetail - p.gapCost) + (p.maintenanceRetail - p.maintenanceCost));
  let reserve = p.dealerReserve || 0;
  if (!isCashDeal && (p.buyRate ?? 0) > 0 && p.apr > (p.buyRate ?? 0)) {
    const atBuy = payment(amountFinanced, p.buyRate!, p.termMonths);
    reserve = round2((monthlyPayment - atBuy) * p.termMonths * ((p.reserveSplit ?? 75) / 100));
  }
  if (isCashDeal) reserve = 0;
  const backEndGross = round2(productsGross + reserve - (isCashDeal ? 0 : p.bankFee));
  const totalGross = round2(frontEndGross + backEndGross);
  const ltv = p.nadaRetail > 0 ? (amountFinanced / p.nadaRetail) * 100 : 0;

  return { cashPrice, taxableAmount, totalTaxes, tradeEquity, amountFinanced, dueFromCustomer, isCashDeal, monthlyPayment, totalOfPayments, financeCharge, frontEndGross, productsGross, reserve, backEndGross, totalGross, ltv };
}

/** Cash down needed to hit a monthly payment (everything else unchanged). Never negative. */
export function downForPayment(p: DealParameters, targetPayment: number): number {
  const c = calculateDeal({ ...p, cashDown: 0 });
  const affordable = presentValue(targetPayment, p.apr, p.termMonths);
  return Math.max(0, Math.ceil((c.amountFinanced - affordable) / 10) * 10);   // round up to $10
}
/** Highest selling price that keeps the payment at or under the target (tax recalculated). */
export function priceForPayment(p: DealParameters, targetPayment: number): number {
  let lo = 0, hi = Math.max(p.sellingPrice * 2, 200000);
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (calculateDeal({ ...p, sellingPrice: mid }).monthlyPayment <= targetPayment) lo = mid; else hi = mid; }
  return Math.floor(lo / 10) * 10;   // round down to $10
}

export function formatCurrency(amount: number, cents = true): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 }).format(amount || 0);
}
/** "$1,500", "1.5k", "1500.50" → number. */
export function parseMoney(s: string): number {
  const t = String(s ?? "").trim().toLowerCase().replace(/[$,\s]/g, "");
  if (!t) return 0;
  const k = t.endsWith("k"); const n = parseFloat(k ? t.slice(0, -1) : t);
  return Number.isFinite(n) ? round2(k ? n * 1000 : n) : 0;
}
