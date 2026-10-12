import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, Building2, Palette, Car, Plug, Rocket, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useTenant, saveTenantOverrides, markOnboarded, applyTenantTheme, formatAddress } from "@/lib/tenant";
import { loadInventory, vTitle } from "@/lib/inventory";
import { useAuth } from "@/lib/auth";

const STEPS = [
  { key: "dealer", title: "Dealership", icon: Building2 },
  { key: "brand", title: "Branding", icon: Palette },
  { key: "inventory", title: "Inventory", icon: Car },
  { key: "integrations", title: "Connections", icon: Plug },
  { key: "done", title: "Launch", icon: Rocket },
];

// Integrations the real product needs. `status` is what this build can do TODAY.
export const INTEGRATIONS = [
  { name: "Inventory feed (Dealer Car Search)", need: "Nightly sync of stock, prices, photos from the dealer's website platform", status: "imported-once", api: "DCS dealer export / CSV feed or scrape of bestpriceautosales.net" },
  { name: "VIN decode", need: "Auto-fill year/make/model/engine when adding a car", status: "live", api: "NHTSA vPIC (free, no key) — already wired in Inventory + Appraisals" },
  { name: "Vehicle valuations", need: "Trade / retail book values on appraisals & desking", status: "needs-api", api: "KBB ICO, J.D. Power (NADA), Black Book, or MarketCheck" },
  { name: "Vehicle history", need: "CARFAX / AutoCheck badge on VDP", status: "needs-api", api: "CARFAX dealer API (dealer already has CARFAX on their site)" },
  { name: "Credit application + lenders", need: "Submit credit apps, pull approvals", status: "needs-api", api: "RouteOne or Dealertrack; Capital One Auto Navigator + Credit Acceptance are the dealer's current lenders" },
  { name: "SMS / email / calls (CRM)", need: "Lead follow-up, texting templates, BDC", status: "needs-api", api: "GoHighLevel sub-account (CasperPortal) — Conversations API + LC Phone" },
  { name: "Appointments / calendars", need: "Test drives, service scheduling", status: "needs-api", api: "GoHighLevel Calendars API (demo already calls backend.leadconnectorhq.com)" },
  { name: "AI assistant", need: "Deal rescue, follow-up copy, morning brief, VirtualBDC", status: "needs-api", api: "Claude API via a small server/Edge Function (never ship the key in the app)" },
  { name: "Accounts / users / roles", need: "Real logins per salesperson, manager, F&I", status: "needs-backend", api: "Supabase Auth + RLS (same pattern as TimeHub); tenant_id on every table" },
  { name: "Payments / billing", need: "Subscriptions for CarSalesSoftware.com", status: "needs-api", api: "Stripe (Jared's call — money gate)" },
  { name: "Website lead forms", need: "Leads from bestpriceautosales.net into CRM", status: "needs-api", api: "GHL webhook / form embed, or DCS lead email parsing" },
  { name: "OCR (license / docs)", need: "Scan driver's license at intake", status: "live", api: "tesseract.js (runs locally, already bundled)" },
] as const;

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  live: { label: "Working now", cls: "bg-emerald-100 text-emerald-800" },
  "imported-once": { label: "One-time import done", cls: "bg-blue-100 text-blue-800" },
  "needs-api": { label: "Needs API key", cls: "bg-amber-100 text-amber-800" },
  "needs-backend": { label: "Needs cloud backend", cls: "bg-slate-200 text-slate-800" },
};

export default function Onboarding() {
  const navigate = useNavigate();
  const tenant = useTenant();
  const { user } = useAuth();
  const isPreview = user?.role === "super_admin";
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: tenant.name,
    legalName: tenant.legalName ?? "",
    phone: tenant.phone,
    email: tenant.email ?? "",
    website: tenant.website,
    street: tenant.address.street,
    city: tenant.address.city,
    state: tenant.address.state,
    zip: tenant.address.zip,
    logoUrl: tenant.logoUrl,
    primary: tenant.colors.primary,
    secondary: tenant.colors.secondary,
    accent: tenant.colors.accent,
  });
  const inventory = useMemo(() => loadInventory(), []);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const persist = () => {
    saveTenantOverrides({
      name: form.name,
      legalName: form.legalName,
      phone: form.phone,
      email: form.email || null,
      website: form.website,
      address: { street: form.street, city: form.city, state: form.state, zip: form.zip },
      logoUrl: form.logoUrl,
      colors: { primary: form.primary, secondary: form.secondary, accent: form.accent, estimated: false },
    });
    applyTenantTheme();
  };

  const next = () => { persist(); setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const finish = () => {
    persist();
    if (user) markOnboarded(user);
    toast.success(isPreview ? "Preview done — the dealership's owner will still confirm this on their first sign-in." : `${form.name} is confirmed. Welcome aboard!`);
    navigate("/");
  };

  const priced = inventory.filter((v) => v.price != null).length;
  const withPhotos = inventory.filter((v) => v.images.length > 0).length;
  const totalValue = inventory.reduce((a, v) => a + (v.price ?? 0), 0);

  return (
    <div className="fixed inset-0 z-[150] bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-6">
        <div className="flex items-center gap-4">
          <img src={form.logoUrl} alt={form.name} className="h-12 w-auto object-contain" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
          <div>
            <h1 className="text-2xl font-black">Set up {form.name}</h1>
            <p className="text-sm text-muted-foreground">{isPreview ? "Platform preview — " : "Please confirm your dealership details — "}step {step + 1} of {STEPS.length}</p>
          </div>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} />
        <div className="flex gap-2 flex-wrap">
          {STEPS.map((s, i) => (
            <Badge key={s.key} variant={i === step ? "default" : i < step ? "secondary" : "outline"} className="gap-1">
              {i < step ? <Check className="h-3 w-3" /> : <s.icon className="h-3 w-3" />} {s.title}
            </Badge>
          ))}
        </div>

        {step === 0 && (
          <Card>
            <CardHeader><CardTitle>Dealership information</CardTitle><CardDescription>Pre-filled from {tenant.website}. Fix anything that's wrong.</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Dealership name</Label><Input value={form.name} onChange={set("name")} /></div>
              <div className="space-y-1"><Label>Legal name</Label><Input value={form.legalName} onChange={set("legalName")} /></div>
              <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={set("phone")} /></div>
              <div className="space-y-1"><Label>Email (not on website — please add)</Label><Input value={form.email} onChange={set("email")} placeholder="sales@bestpriceautosales.net" /></div>
              <div className="space-y-1 md:col-span-2"><Label>Website</Label><Input value={form.website} onChange={set("website")} /></div>
              <div className="space-y-1 md:col-span-2"><Label>Street</Label><Input value={form.street} onChange={set("street")} /></div>
              <div className="space-y-1"><Label>City</Label><Input value={form.city} onChange={set("city")} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>State</Label><Input value={form.state} onChange={set("state")} /></div>
                <div className="space-y-1"><Label>ZIP</Label><Input value={form.zip} onChange={set("zip")} /></div>
              </div>
              {tenant.secondLocation && (
                <p className="md:col-span-2 text-xs text-muted-foreground">Second location on file: {tenant.secondLocation.street}, {tenant.secondLocation.city}, {tenant.secondLocation.state} {tenant.secondLocation.zip}</p>
              )}
              <div className="md:col-span-2 text-xs text-muted-foreground">
                Hours: {Object.entries(tenant.hours).map(([d, h]) => `${d.slice(0, 3)} ${h}`).join(" · ")}
              </div>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader><CardTitle>Branding</CardTitle><CardDescription>Logo and colors used across the app. {tenant.colors.estimated && "Colors were estimated from the brand — confirm them."}</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-1"><Label>Logo URL</Label><Input value={form.logoUrl} onChange={set("logoUrl")} /></div>
                {(["primary", "secondary", "accent"] as const).map((k) => (
                  <div key={k} className="flex items-center gap-3">
                    <input type="color" value={form[k]} onChange={set(k)} className="h-10 w-14 rounded border cursor-pointer" />
                    <div className="flex-1 space-y-1"><Label className="capitalize">{k} color</Label><Input value={form[k]} onChange={set(k)} /></div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border p-6 space-y-4 bg-white dark:bg-slate-900">
                <img src={form.logoUrl} alt="logo preview" className="h-14 w-auto object-contain" />
                <div className="h-10 rounded-lg flex items-center px-4 text-white font-bold" style={{ background: form.primary }}>Primary button</div>
                <div className="h-10 rounded-lg flex items-center px-4 text-white font-bold" style={{ background: form.secondary }}>Secondary / sidebar</div>
                <div className="h-10 rounded-lg flex items-center px-4 font-bold" style={{ background: form.accent }}>Accent / highlight</div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader><CardTitle>Inventory import</CardTitle><CardDescription>Imported from {tenant.inventorySource?.platform ?? "website"}{tenant.inventorySource?.dealerId && ` (dealer #${tenant.inventorySource.dealerId})`}.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[["Vehicles", inventory.length], ["Priced", priced], ["With photos", withPhotos], ["Inventory value", `$${totalValue.toLocaleString()}`]].map(([l, v]) => (
                  <div key={String(l)} className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{l}</p><p className="text-xl font-black">{v}</p></div>
                ))}
              </div>
              <div className="max-h-64 overflow-y-auto rounded-lg border divide-y text-sm">
                {inventory.slice(0, 40).map((v) => (
                  <div key={v.id} className="flex items-center justify-between px-3 py-2">
                    <span>{vTitle(v)} <span className="text-muted-foreground">· #{v.stockNumber} · {v.mileage.toLocaleString()} mi</span></span>
                    <span className="font-semibold">{v.price == null ? "Call" : `$${v.price.toLocaleString()}`}</span>
                  </div>
                ))}
                {inventory.length > 40 && <div className="px-3 py-2 text-muted-foreground">…and {inventory.length - 40} more</div>}
              </div>
              <p className="text-xs text-muted-foreground">Vehicle cost, recon spend and book values are not on the public website — enter them per unit in Inventory, or connect a DMS/valuation feed.</p>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader><CardTitle>Connections</CardTitle><CardDescription>What's working today vs. what needs an API key or the cloud backend.</CardDescription></CardHeader>
            <CardContent className="divide-y">
              {INTEGRATIONS.map((i) => (
                <div key={i.name} className="py-3 flex flex-col md:flex-row md:items-center gap-2">
                  <div className="flex-1">
                    <p className="font-semibold">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{i.need} — <span className="italic">{i.api}</span></p>
                  </div>
                  <Badge className={STATUS_LABEL[i.status].cls} variant="outline">{STATUS_LABEL[i.status].label}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader><CardTitle>Ready to launch</CardTitle><CardDescription>{form.name} · {formatAddress({ ...tenant, address: { street: form.street, city: form.city, state: form.state, zip: form.zip } })} · {form.phone}</CardDescription></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{inventory.length} vehicles loaded. Branding applied. You can revisit any of this under Settings.</p>
              <p className="text-muted-foreground">{isPreview ? "You're previewing as platform admin. The dealership owner/admin will be asked to confirm all of this the first time they sign in." : `By launching you confirm the dealership information above is correct (recorded under your name, ${user?.fullName}).`}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={back} disabled={step === 0}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>Continue <ArrowRight className="h-4 w-4 ml-2" /></Button>
          ) : (
            <Button onClick={finish}><Rocket className="h-4 w-4 mr-2" /> {isPreview ? "Finish preview" : `Confirm & launch ${form.name}`}</Button>
          )}
        </div>
      </div>
    </div>
  );
}
