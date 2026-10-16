// Printable deal worksheet (letter size). Built as its own HTML document and printed from a hidden iframe, so it prints
// the same in the browser and the desktop app and never includes the app's menus. Two versions:
//   customer — price, taxes, fees, trade, amount financed, payment options and signature lines (no cost or gross)
//   manager  — the same plus cost, pack, ACV, reserve, gross and LTV
import { calculateDeal, formatCurrency, type DealParameters } from "@/lib/calculations";

export interface PrintInfo {
  dealer: { name: string; address: string; phone?: string; logoUrl?: string; disclaimers?: string[] };
  buyer?: { name: string; phone?: string; email?: string; address?: string } | null;
  vehicle?: { title: string; vin?: string; stock?: string; mileage?: number; color?: string } | null;
  salesperson?: string; dealNo?: string;
  downOptions: number[]; termOptions: number[];
  productNames?: { warranty?: string; gap?: string; maintenance?: string };
  lender?: string;
}

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const $ = (n: number) => formatCurrency(n);

export function dealWorksheetHtml(p: DealParameters, info: PrintInfo, copy: "customer" | "manager"): string {
  const c = calculateDeal(p);
  const rules = p.taxRules;
  const row = (label: string, value: string, opts: { strong?: boolean; sub?: string; minus?: boolean } = {}) =>
    `<tr class="${opts.strong ? "strong" : ""}"><td>${esc(label)}${opts.sub ? `<span class="sub">${esc(opts.sub)}</span>` : ""}</td><td class="num">${opts.minus ? "−" : ""}${esc(value)}</td></tr>`;
  const products = [[info.productNames?.warranty || "Service contract", p.warrantyRetail], [info.productNames?.gap || "GAP", p.gapRetail], [info.productNames?.maintenance || "Maintenance plan", p.maintenanceRetail]].filter(([, v]) => (v as number) > 0) as [string, number][];
  const matrix = `<table class="grid"><thead><tr><th>Cash down</th>${info.termOptions.map((t) => `<th>${t} mo</th>`).join("")}</tr></thead><tbody>${info.downOptions.map((d) => `<tr><th>${esc($(d))}</th>${info.termOptions.map((t) => { const x = calculateDeal({ ...p, cashDown: d, termMonths: t }); const on = d === p.cashDown && t === p.termMonths; return `<td class="${on ? "on" : ""}">${x.isCashDeal ? "Cash" : esc($(x.monthlyPayment))}</td>`; }).join("")}</tr>`).join("")}</tbody></table>`;
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return `<!doctype html><html><head><meta charset="utf-8"><title>Deal worksheet${info.buyer ? " — " + esc(info.buyer.name) : ""}</title><style>
  @page { size: letter; margin: 0.45in; }
  * { box-sizing: border-box; } body { font: 11px/1.35 -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #111; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 10px; }
  header img { max-height: 46px; max-width: 200px; object-fit: contain; display: block; margin-bottom: 4px; }
  h1 { font-size: 18px; margin: 0; text-align: right; } .muted { color: #555; } .sub { display: block; color: #666; font-size: 9.5px; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
  .box { border: 1px solid #bbb; border-radius: 4px; padding: 6px 8px; } .box h2 { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; margin: 0 0 3px; color: #444; }
  table { width: 100%; border-collapse: collapse; } td { padding: 2.5px 0; vertical-align: top; } td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  tr.strong td { font-weight: 700; border-top: 1px solid #111; padding-top: 4px; }
  .pay { border: 2px solid #111; border-radius: 6px; padding: 8px; text-align: center; margin-bottom: 8px; } .pay .big { font-size: 26px; font-weight: 800; }
  table.grid th, table.grid td { border: 1px solid #bbb; padding: 4px; text-align: center; font-variant-numeric: tabular-nums; } table.grid thead th { background: #f1f1f1; }
  table.grid td.on { background: #111; color: #fff; font-weight: 700; }
  .mgr { margin-top: 10px; border: 1px dashed #888; } .sign { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; margin-top: 26px; }
  .sign div { border-top: 1px solid #111; padding-top: 3px; font-size: 9.5px; color: #444; } .fine { font-size: 8.8px; color: #555; margin-top: 10px; }
  .tag { display: inline-block; border: 1px solid #111; padding: 1px 6px; border-radius: 3px; font-size: 9px; font-weight: 700; letter-spacing: .05em; }
  </style></head><body>
  <header><div>${info.dealer.logoUrl ? `<img src="${esc(info.dealer.logoUrl)}" alt="">` : ""}<strong>${esc(info.dealer.name)}</strong><br><span class="muted">${esc(info.dealer.address)}${info.dealer.phone ? " · " + esc(info.dealer.phone) : ""}</span></div>
    <div><h1>Deal worksheet</h1><div class="muted" style="text-align:right">${esc(date)}${info.dealNo ? ` · Deal ${esc(info.dealNo)}` : ""}${info.salesperson ? `<br>Salesperson: ${esc(info.salesperson)}` : ""}${copy === "manager" ? `<br><span class="tag">MANAGER COPY — INTERNAL</span>` : ""}</div></div></header>
  <div class="two">
    <div class="box"><h2>Buyer</h2>${info.buyer ? `<strong>${esc(info.buyer.name)}</strong><br>${[info.buyer.phone, info.buyer.email].filter(Boolean).map(esc).join(" · ")}${info.buyer.address ? `<br>${esc(info.buyer.address)}` : ""}` : `<span class="muted">—</span>`}</div>
    <div class="box"><h2>Vehicle</h2>${info.vehicle ? `<strong>${esc(info.vehicle.title)}</strong><br>${[info.vehicle.stock && `Stock #${info.vehicle.stock}`, info.vehicle.mileage != null && `${Number(info.vehicle.mileage).toLocaleString()} mi`, info.vehicle.color].filter(Boolean).map(esc).join(" · ")}${info.vehicle.vin ? `<br>VIN ${esc(info.vehicle.vin)}` : ""}` : `<span class="muted">—</span>`}</div>
  </div>
  <div class="two">
    <div class="box"><h2>Price</h2><table>
      ${row("Selling price", $(p.sellingPrice))}
      ${(p.rebate ?? 0) > 0 ? row("Rebate", $(p.rebate!), { minus: true }) : ""}
      ${p.docFee ? row("Documentation fee", $(p.docFee)) : ""}
      ${products.map(([l, v]) => row(l, $(v))).join("")}
      ${row(`Sales tax (${p.taxRate}%)`, $(c.totalTaxes), { sub: `on ${$(c.taxableAmount)}${rules?.tradeCredit !== false && p.tradeAllowance ? " after trade credit" : ""}` })}
      ${p.nonTaxableFees ? row("Title, registration & plates", $(p.nonTaxableFees)) : ""}
      ${row("Cash price", $(c.cashPrice), { strong: true })}
      ${p.tradeAllowance || p.tradePayoff ? row("Trade allowance", $(p.tradeAllowance), { minus: true }) + row("Trade payoff", $(p.tradePayoff)) : ""}
      ${p.cashDown ? row("Cash down", $(p.cashDown), { minus: true }) : ""}
      ${row(c.isCashDeal ? "Balance due" : "Amount financed", $(c.isCashDeal ? c.dueFromCustomer : c.amountFinanced), { strong: true })}
    </table></div>
    <div>
      <div class="pay">${c.isCashDeal ? `<div class="muted">Cash deal — due at delivery</div><div class="big">${esc($(c.dueFromCustomer))}</div>` : `<div class="muted">Estimated monthly payment</div><div class="big">${esc($(c.monthlyPayment))}</div><div>${p.termMonths} months · ${p.apr}% APR · ${esc($(p.cashDown))} down</div><div class="muted">Finance charge ${esc($(c.financeCharge))} · Total of payments ${esc($(c.totalOfPayments))}</div>`}</div>
      <div class="box"><h2>Payment options (estimated, ${p.apr}% APR)</h2>${matrix}</div>
    </div>
  </div>
  ${copy === "manager" ? `<div class="box mgr"><h2>Gross &amp; structure (internal)</h2><table>
    ${row("Vehicle cost + pack", `${$(p.vehicleCost)} + ${$(p.pack)}`)}
    ${p.tradeAllowance ? row("Trade ACV / over-allowance", `${$(p.tradeActualCashValue)} / ${$(p.tradeAllowance - p.tradeActualCashValue)}`) : ""}
    ${row("Front gross", $(c.frontEndGross))}
    ${row("Products gross", $(c.productsGross))}
    ${row((p.buyRate ?? 0) > 0 ? `Reserve (buy ${p.buyRate}% → sell ${p.apr}%, ${p.reserveSplit ?? 75}% split, est.)` : "Reserve", $(c.reserve))}
    ${p.bankFee ? row("Bank / acquisition fee", $(p.bankFee), { minus: true }) : ""}
    ${row("Total gross", $(c.totalGross), { strong: true })}
    ${info.lender ? row("Lender", info.lender) : ""}
    ${p.nadaRetail ? row("LTV (vs book " + $(p.nadaRetail) + ")", `${c.ltv.toFixed(0)}%`) : ""}
  </table></div>` : ""}
  <div class="sign"><div>Buyer signature &amp; date</div><div>Co-buyer signature &amp; date</div><div>Manager approval</div></div>
  <p class="fine">This worksheet is an estimate for discussion only and is not a contract or an offer of credit. Payments, APR, taxes and fees are estimated and subject to lender approval, final credit terms and state requirements. ${(info.dealer.disclaimers ?? []).map(esc).join(" ")}</p>
  </body></html>`;
}

export interface DealOption { label: string; p: DealParameters; productNames?: PrintInfo["productNames"] }
export function optionsSheetHtml(opts: DealOption[], info: PrintInfo): string {
  const cols = opts.map((o) => ({ o, c: calculateDeal(o.p) }));
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const prods = (o: DealOption) => [[o.productNames?.warranty || "Service contract", o.p.warrantyRetail], [o.productNames?.gap || "GAP", o.p.gapRetail], [o.productNames?.maintenance || "Maintenance", o.p.maintenanceRetail]].filter(([, v]) => (v as number) > 0).map(([l]) => esc(l)).join("<br>") || "—";
  const line = (label: string, f: (x: { o: DealOption; c: ReturnType<typeof calculateDeal> }) => string, cls = "") => `<tr class="${cls}"><th>${esc(label)}</th>${cols.map((x) => `<td>${f(x)}</td>`).join("")}</tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Payment options${info.buyer ? " — " + esc(info.buyer.name) : ""}</title><style>
  @page { size: letter; margin: 0.5in; } body { font: 12px/1.4 -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #111; margin: 0; }
  header { display: flex; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 14px; } header img { max-height: 46px; max-width: 200px; display: block; margin-bottom: 4px; }
  h1 { font-size: 20px; margin: 0; text-align: right; } .muted { color: #555; }
  table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #bbb; padding: 7px 8px; text-align: center; font-variant-numeric: tabular-nums; } tr th:first-child { text-align: left; background: #f4f4f4; width: 26%; }
  thead th { background: #111 !important; color: #fff; font-size: 14px; } tr.pay td { font-size: 22px; font-weight: 800; } .sign { margin-top: 34px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; } .sign div { border-top: 1px solid #111; padding-top: 3px; font-size: 10px; color: #444; }
  .fine { font-size: 9px; color: #555; margin-top: 12px; }
  </style></head><body>
  <header><div>${info.dealer.logoUrl ? `<img src="${esc(info.dealer.logoUrl)}" alt="">` : ""}<strong>${esc(info.dealer.name)}</strong><br><span class="muted">${esc(info.dealer.address)}${info.dealer.phone ? " · " + esc(info.dealer.phone) : ""}</span></div>
    <div><h1>Your payment options</h1><div class="muted" style="text-align:right">${esc(date)}${info.buyer ? `<br>Prepared for ${esc(info.buyer.name)}` : ""}${info.vehicle ? `<br>${esc(info.vehicle.title)}${info.vehicle.stock ? ` · #${esc(info.vehicle.stock)}` : ""}` : ""}</div></div></header>
  <table><thead><tr><th></th>${cols.map((x) => `<th>${esc(x.o.label)}</th>`).join("")}</tr></thead><tbody>
    ${line("Selling price", (x) => esc($(x.o.p.sellingPrice - (x.o.p.rebate ?? 0))))}
    ${line("Protection products", (x) => prods(x.o))}
    ${line("Cash down", (x) => esc($(x.o.p.cashDown)))}
    ${line("Net trade", (x) => (x.o.p.tradeAllowance || x.o.p.tradePayoff ? esc($(x.c.tradeEquity)) : "—"))}
    ${line("Amount financed", (x) => esc($(x.c.amountFinanced)))}
    ${line("Term / APR", (x) => (x.c.isCashDeal ? "Cash" : `${x.o.p.termMonths} mo · ${x.o.p.apr}%`))}
    ${line("Estimated payment", (x) => (x.c.isCashDeal ? esc($(x.c.dueFromCustomer)) : esc($(x.c.monthlyPayment)) + "<span style='font-size:12px;font-weight:400'>/mo</span>"), "pay")}
  </tbody></table>
  <div class="sign"><div>Option chosen &amp; buyer signature</div><div>Date</div></div>
  <p class="fine">Estimates for discussion only — not a contract or an offer of credit. Payments, APR, taxes and fees are subject to lender approval and final terms. ${(info.dealer.disclaimers ?? []).map(esc).join(" ")}</p>
  </body></html>`;
}

function printHtml(html: string) {
  const f = document.createElement("iframe");
  f.setAttribute("aria-hidden", "true");
  f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(f);
  const doc = f.contentDocument!; doc.open(); doc.write(html); doc.close();
  let done = false;
  const go = () => { if (done) return; done = true; try { f.contentWindow!.focus(); f.contentWindow!.print(); } finally { setTimeout(() => f.remove(), 1500); } };
  const img = doc.querySelector("img");
  if (img && !img.complete) { img.onload = go; img.onerror = go; setTimeout(go, 2500); } else setTimeout(go, 150);
}
export function printOptions(opts: DealOption[], info: PrintInfo) { printHtml(optionsSheetHtml(opts, info)); }

export function printDeal(p: DealParameters, info: PrintInfo, copy: "customer" | "manager") { printHtml(dealWorksheetHtml(p, info, copy)); }
