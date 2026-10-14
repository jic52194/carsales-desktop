// site-scan — paste a dealership's website, get back everything needed to set them up:
// name, phone, email, address, hours, logo, brand colors, socials, tagline, inventory platform + inventory page,
// credit-app link and a vehicle count estimate. Super admins only (it's the "Add a dealership" wizard).
// Reads JSON-LD (AutoDealer / LocalBusiness), meta tags, tel:/mailto: links, visible text, and the site's CSS.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { DOMParser, type Element } from "jsr:@b-fuze/deno-dom";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type, apikey, x-client-info", "content-type": "application/json" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 CarSalesAIOS-Setup/1.0";
const clean = (s?: string | null) => (s ?? "").replace(/\s+/g, " ").trim();
const STATES: Record<string, string> = { alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY" };
const PLATFORMS: [RegExp, string, string?][] = [
  [/dealercarsearch|dcsimg|dealer car search/i, "Dealer Car Search", "dcs"], [/dealeron/i, "DealerOn"], [/dealer\.com|ddc-|dealerdotcom/i, "Dealer.com"],
  [/dealerinspire/i, "Dealer Inspire"], [/carsforsale\.com|cfs-/i, "Carsforsale.com"], [/dealerfire/i, "DealerFire"], [/autorevo/i, "AutoRevo"],
  [/frazer/i, "Frazer"], [/dealersocket|dealerfire/i, "DealerSocket"], [/v12software|v12 software/i, "V12 Software"], [/dealercenter|dealerclick/i, "DealerCenter"],
  [/wayne ?reaves/i, "Wayne Reaves"], [/overfuel/i, "Overfuel"], [/dealersync|autobunny/i, "AutoBunny"], [/drivetime|carzing/i, "Carzing"], [/wix\.com|wixstatic/i, "Wix"], [/squarespace/i, "Squarespace"], [/wp-content|wordpress/i, "WordPress"],
];

async function get(url: string, ms = 12000): Promise<{ html: string; url: string } | null> {
  try { const r = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,*/*" }, redirect: "follow", signal: AbortSignal.timeout(ms) }); if (!r.ok) return null; const t = await r.text(); return { html: t.slice(0, 2_500_000), url: r.url || url }; } catch { return null; }
}
function jsonLd(doc: any): any[] {
  const out: any[] = [];
  for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try { const j = JSON.parse(s.textContent); const walk = (x: any) => { if (!x || typeof x !== "object") return; if (Array.isArray(x)) return x.forEach(walk); out.push(x); if (x["@graph"]) walk(x["@graph"]); }; walk(j); } catch { /* ignore */ }
  }
  return out;
}
const BIZ = /AutoDealer|AutomotiveBusiness|AutoRepair|LocalBusiness|Organization|Store|AutoPartsStore/i;
function phoneFmt(p: string) { const d = p.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, ""); return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : clean(p); }
function hexOk(h: string) { const m = h.match(/^#?([0-9a-f]{6})$/i); if (!m) return false; const n = parseInt(m[1], 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx - mn > 45 && mx > 60 && mn < 235; }
function expand(h: string) { h = h.toLowerCase(); if (/^#[0-9a-f]{3}$/.test(h)) return "#" + h.slice(1).split("").map((c) => c + c).join(""); return h.slice(0, 7); }
function abs(u: string | null | undefined, base: string) { if (!u) return ""; try { return new URL(u.trim(), base).href; } catch { return ""; } }
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAYMAP: Record<string, string> = { mo: "Monday", tu: "Tuesday", we: "Wednesday", th: "Thursday", fr: "Friday", sa: "Saturday", su: "Sunday" };
function t12(t: string) { const m = t.match(/(\d{1,2}):?(\d{2})?/); if (!m) return t; let h = +m[1]; const mi = m[2] ?? "00"; const ap = h >= 12 ? "pm" : "am"; if (h > 12) h -= 12; if (h === 0) h = 12; return `${h}:${mi} ${ap}`; }

function scanPage(html: string, base: string, acc: any) {
  const doc: any = new DOMParser().parseFromString(html, "text/html"); if (!doc) return;
  const meta = (sel: string) => clean(doc.querySelector(sel)?.getAttribute("content"));
  const ld = jsonLd(doc); const biz = ld.find((x) => BIZ.test(String(x["@type"] ?? ""))) ?? {};
  const text = clean(doc.body?.textContent ?? "");
  // name candidates — scored later against the domain (bestpriceautosales.net → "Best Price Auto Sales")
  const logoAlt = [...doc.querySelectorAll("img")].map((i: any) => clean(i.getAttribute("alt"))).find((t: string) => /logo/i.test(t)) ?? "";
  const copy = text.match(/(?:©|copyright)\s*(?:\d{4}\s*)?(?:-\s*\d{4}\s*)?([A-Z][A-Za-z0-9&'., -]{2,60}?)(?:\.|,|\s+all rights|\s*\||$)/i)?.[1] ?? "";
  const lead = clean(acc.tagline || meta('meta[name="description"]')).match(/^([A-Z][A-Za-z0-9&' -]{2,50}?)\s+(?:is|has|offers|provides)\b/)?.[1] ?? "";
  acc._names.push(clean(biz.name), meta('meta[property="og:site_name"]'), logoAlt.replace(/\s*logo\s*/i, ""), copy, lead, ...clean(doc.querySelector("title")?.textContent).split(/[|\-–—:]/));
  acc.tagline ||= meta('meta[name="description"]') || meta('meta[property="og:description"]');
  // phone / email
  const tel = [...doc.querySelectorAll('a[href^="tel:"]')].map((a: any) => a.getAttribute("href").slice(4)).find((p: string) => p.replace(/\D/g, "").length >= 10);
  acc.phone ||= biz.telephone ? phoneFmt(String(biz.telephone)) : tel ? phoneFmt(tel) : (text.match(/\(?\b\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/)?.[0] ? phoneFmt(text.match(/\(?\b\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/)![0]) : "");
  const mail = [...doc.querySelectorAll('a[href^="mailto:"]')].map((a: any) => a.getAttribute("href").slice(7).split("?")[0]).find((e: string) => /@/.test(e));
  acc.email ||= clean(biz.email) || mail || (text.match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/)?.[0] ?? "");
  // address
  const a = Array.isArray(biz.address) ? biz.address[0] : biz.address;
  if (!acc.address?.street && a && typeof a === "object") acc.address = { street: clean(a.streetAddress), city: clean(a.addressLocality), state: STATES[clean(a.addressRegion).toLowerCase()] ?? clean(a.addressRegion).toUpperCase().slice(0, 2), zip: clean(a.postalCode).slice(0, 10) };
  if (!acc.address?.street) { const m = text.match(/(\d{1,6}\s+[A-Za-z0-9 .'-]{2,40}?\s(?:St|Street|Rd|Road|Ave|Avenue|Blvd|Boulevard|Hwy|Highway|Dr|Drive|Ln|Lane|Way|Pike|Route|Rte|Pkwy|Parkway|Ct|Court|Pl|Place|Tpke|Turnpike)\.?)[,\s]+([A-Za-z .'-]{2,30}?),?\s+([A-Z]{2})\s+(\d{5})/); if (m) acc.address = { street: clean(m[1]), city: clean(m[2]), state: m[3], zip: m[4] }; }
  // hours
  if (!Object.keys(acc.hours).length) {
    const spec = [].concat(biz.openingHoursSpecification ?? []) as any[];
    for (const s of spec) for (const d of [].concat(s.dayOfWeek ?? []) as string[]) { const day = DAYS.find((x) => String(d).toLowerCase().includes(x.toLowerCase())); if (day && s.opens) acc.hours[day] = `${t12(s.opens)} - ${t12(s.closes)}`; }
    for (const s of [].concat(biz.openingHours ?? []) as string[]) { const m = String(s).match(/^([A-Za-z,-]+)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/); if (!m) continue; const parts = m[1].split(","); for (const p of parts) { const [x, y] = p.split("-").map((q) => DAYMAP[q.slice(0, 2).toLowerCase()]); if (!x) continue; const i0 = DAYS.indexOf(x), i1 = y ? DAYS.indexOf(y) : i0; for (let i = i0; i <= i1; i++) acc.hours[DAYS[i]] = `${t12(m[2])} - ${t12(m[3])}`; } }
    if (!Object.keys(acc.hours).length) { for (const d of DAYS) { const re = new RegExp(`${d}s?\\s*:?\\s*(\\d{1,2}(?::\\d{2})?\\s*[ap]\\.?m\\.?\\s*[-–to]+\\s*\\d{1,2}(?::\\d{2})?\\s*[ap]\\.?m\\.?|closed|by appointment(?: only)?|appointment only)`, "i"); const m = text.match(re); if (m) acc.hours[d] = clean(m[1]).replace(/\s*[-–]\s*|\s+to\s+/i, " - ").toLowerCase().replace(/^closed$/, "Closed").replace(/^(by )?appointment( only)?$/, "Appointment Only"); } }
  }
  // logo
  if (!acc.logoUrl) {
    const ldLogo = typeof biz.logo === "string" ? biz.logo : biz.logo?.url;
    const img = [...doc.querySelectorAll("img")].find((i: any) => /logo/i.test(`${i.getAttribute("src")} ${i.getAttribute("alt")} ${i.getAttribute("class")} ${i.getAttribute("id")}`) && !/facebook|google|carfax|kbb|autocheck|cargurus|bbb|payment|visa/i.test(i.getAttribute("src") ?? ""));
    acc.logoUrl = abs(ldLogo, base) || abs(img?.getAttribute("data-src") || img?.getAttribute("src"), base);
  }
  acc.ogImage ||= abs(meta('meta[property="og:image"]'), base);
  acc.icon ||= abs(doc.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href") || doc.querySelector('link[rel~="icon"]')?.getAttribute("href"), base);
  // colors: theme-color first, then CSS frequency
  const theme = meta('meta[name="theme-color"]'); if (theme && hexOk(expand(theme))) acc._colors.unshift(expand(theme), expand(theme), expand(theme));
  const css = [...doc.querySelectorAll("style")].map((s: any) => s.textContent).join(" ") + " " + [...doc.querySelectorAll("[style]")].map((e: any) => e.getAttribute("style")).join(" ");
  for (const m of css.matchAll(/(?:color|background(?:-color)?|border-color|fill)\s*:\s*(#[0-9a-f]{3,6})\b/gi)) { const h = expand(m[1]); if (hexOk(h)) acc._colors.push(h); }
  acc._css.push(...[...doc.querySelectorAll('link[rel="stylesheet"]')].map((l: any) => abs(l.getAttribute("href"), base)).filter((u: string) => u && !/fonts\.googleapis|bootstrap|fontawesome|cdn\.jsdelivr|jquery/i.test(u)).slice(0, 3));
  // socials + links
  for (const l of doc.querySelectorAll("a[href]")) {
    const h = abs((l as Element).getAttribute("href"), base); const t = clean((l as Element).textContent).toLowerCase();
    if (/facebook\.com\/(?!sharer)/i.test(h)) acc.social.facebook ||= h;
    else if (/instagram\.com\//i.test(h)) acc.social.instagram ||= h;
    else if (/youtube\.com\/(channel|c\/|@|user)/i.test(h)) acc.social.youtube ||= h;
    else if (/tiktok\.com\/@/i.test(h)) acc.social.tiktok ||= h;
    else if (/(google\.[a-z.]+\/maps|goo\.gl\/maps|maps\.app\.goo\.gl|g\.page)/i.test(h)) acc.social.google ||= h;
    if (!acc.creditAppUrl && (/credit|financ|pre-?approv|apply/i.test(t) || /creditapp|financing|preapprov|credit-app/i.test(h)) && h.startsWith("http")) acc.creditAppUrl = h;
    if (!acc.inventoryUrl && (/inventory|used cars|pre-owned|our cars|view all|search (our )?cars/i.test(t) || /newandusedcars|\/inventory|used-vehicles|searchused|\/used\b|\/cars-for-sale/i.test(h)) && h.startsWith(new URL(base).origin)) acc.inventoryUrl = h;
    if (!acc._contact && (/contact|directions|hours|about/i.test(t) || /contact|directions|hours|about/i.test(h)) && h.startsWith(new URL(base).origin)) acc._contact = h;
  }
  if (!acc.platform) for (const [re, name, code] of PLATFORMS) if (re.test(html)) { acc.platform = name; acc.platformCode = code ?? null; break; }
  const dealerId = html.match(/dealerid[=:"'\s]+(\d{3,8})/i)?.[1]; if (dealerId) acc.dealerId ||= dealerId;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const secret = req.headers.get("x-push-secret");   // internal tests / automation
  if (secret) { const { data: ok } = await admin.rpc("ghl_push_secret_ok", { p: secret }); if (!ok) return json({ error: "bad secret" }, 401); }
  else {
    const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "unauthorized" }, 401);
    const asUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false } });
    const { data: { user } } = await asUser.auth.getUser(); if (!user) return json({ error: "unauthorized" }, 401);
    const { data: p } = await admin.from("profiles").select("role,is_active").eq("id", user.id).single();
    if (!p?.is_active || !["super_admin", "owner", "admin"].includes(p.role)) return json({ error: "admins only" }, 403);
  }

  const body = await req.json().catch(() => ({}));
  let raw = String(body.url ?? "").trim(); if (!raw) return json({ error: "Paste the dealership's website address" }, 400);
  if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
  let start: URL; try { start = new URL(raw); } catch { return json({ error: "That doesn't look like a website address" }, 400); }
  if (!/\./.test(start.hostname) || /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(start.hostname)) return json({ error: "Use the dealership's public website" }, 400);

  const home = await get(start.href) ?? await get(start.href.replace(/^https:/, "http:"));
  if (!home) return json({ error: `Couldn't open ${start.hostname} — check the address, or the site may block scanners.` }, 422);
  const base = home.url;
  const acc: any = { website: new URL(base).origin, address: {}, hours: {}, social: {}, _colors: [], _css: [], _names: [] };
  scanPage(home.html, base, acc);
  // second page for address/hours if missing
  if ((!acc.address?.street || !Object.keys(acc.hours).length || !acc.email) ) {
    const tries = [acc._contact, `${acc.website}/contact`, `${acc.website}/contact-us`, `${acc.website}/hours-directions`, `${acc.website}/about-us`].filter(Boolean);
    for (const u of tries.slice(0, 3)) { const pg = await get(u, 8000); if (pg) { scanPage(pg.html, pg.url, acc); if (acc.address?.street && Object.keys(acc.hours).length) break; } }
  }
  // CSS files for brand colors
  if (acc._colors.length < 6) for (const u of acc._css.slice(0, 2)) { const c = await get(u, 6000); if (!c) continue; for (const m of c.html.matchAll(/(?:color|background(?:-color)?|border-color|fill)\s*:\s*(#[0-9a-f]{3,6})\b/gi)) { const h = expand(m[1]); if (hexOk(h)) acc._colors.push(h); } }
  const freq = new Map<string, number>(); for (const c of acc._colors) freq.set(c, (freq.get(c) ?? 0) + 1);
  const ranked = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  // inventory page: count vehicles roughly
  let vehicles: number | null = null;
  if (acc.inventoryUrl) { const inv = await get(acc.inventoryUrl, 10000); if (inv) { const m = inv.html.match(/(\d{1,4})\s+(?:vehicles|cars|results|matches)\b/i); vehicles = m ? +m[1] : (inv.html.match(/vdp\/\d+/gi)?.length ?? null); if (!acc.platform) for (const [re, name, code] of PLATFORMS) if (re.test(inv.html)) { acc.platform = name; acc.platformCode = code ?? null; break; } } }
  const host = new URL(base).hostname.replace(/^www\./, "").split(".")[0].toLowerCase();
  const GENERIC = /car dealer|dealership in|used cars?|new cars?|for sale|home\b|welcome|inventory|^\s*$|\bin [A-Z][a-z]+,? [A-Z]{2}\b/i;
  const scored = [...new Set((acc._names as string[]).map((n) => clean(n).replace(/\s*(home|welcome|logo)\s*$/i, "")).filter((n) => n.length > 2 && n.length < 60))]
    .map((n) => { const squash = n.toLowerCase().replace(/[^a-z0-9]/g, ""); let sc = 0; if (host.includes(squash) || squash.includes(host)) sc += 6; else { const words = n.toLowerCase().split(/\W+/).filter((w) => w.length > 2); sc += words.filter((w) => host.includes(w)).length * 2; } if (GENERIC.test(n)) sc -= 5; return { n, sc }; })
    .sort((a, b) => b.sc - a.sc);
  const name = scored[0]?.n ?? host;
  const found = (name ? 1 : 0) + ["phone", "email", "logoUrl"].filter((k) => acc[k]).length + (acc.address?.street ? 1 : 0) + (Object.keys(acc.hours).length ? 1 : 0) + (ranked.length ? 1 : 0);
  return json({ ok: true, profile: {
    name, website: acc.website, phone: acc.phone || "", email: (acc.email || "").toLowerCase(), tagline: clean(acc.tagline).slice(0, 200),
    address: { street: acc.address?.street ?? "", city: acc.address?.city ?? "", state: acc.address?.state ?? "", zip: acc.address?.zip ?? "" },
    hours: Object.fromEntries(DAYS.filter((d) => acc.hours[d]).map((d) => [d, acc.hours[d]])),
    logoUrl: acc.logoUrl || "", ogImage: acc.ogImage || "", icon: acc.icon || "",
    colors: { primary: ranked[0] ?? "", secondary: ranked[1] ?? "", accent: ranked[2] ?? "" },
    social: acc.social, creditAppUrl: acc.creditAppUrl || "", inventoryUrl: acc.inventoryUrl || "",
    inventory: { platform: acc.platform || "", code: acc.platformCode || null, dealerId: acc.dealerId || null, vehicles },
  }, confidence: Math.round((found / 7) * 100) });
});
