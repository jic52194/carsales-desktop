// "Add a dealership" — paste their website, we scan it and pre-fill everything; review; pick the owner login, the
// GoHighLevel sub-account (create from a snapshot or link an existing one) and the AI voice; one click creates it all.
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Loader2, Sparkles, CheckCircle2, XCircle, Copy, ArrowRight, ArrowLeft, Car, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { createTenant, switchTenant } from "@/lib/platform";
import { scanWebsite, crmLocations, crmSnapshots, crmCreateLocation, crmLinkLocation, type CrmLocation, type CrmSnapshot } from "@/lib/crm";
import { VOICE_PRESETS } from "@/lib/voices";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const empty = { name: "", legal_name: "", website: "", phone: "", email: "", tagline: "", street: "", city: "", state: "", zip: "", logo_url: "", primary: "#1F2A44", secondary: "#0F172A", accent: "#2563EB", platform: "none", dealerId: "", inventoryUrl: "", creditAppUrl: "", plan: "starter" };
type F = typeof empty;
function suggestUsername(name: string) { return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "").slice(0, 40); }
function genPassword() { const a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"; let s = ""; for (const b of crypto.getRandomValues(new Uint8Array(10))) s += a[b % a.length]; return s + "!"; }
const STEPS = ["Website", "Review", "Accounts", "Done"];

export default function AddDealershipWizard({ open, onOpenChange, agencyConnected, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; agencyConnected: boolean; onCreated: () => void }) {
  const [step, setStep] = useState(0);
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [conf, setConf] = useState<number | null>(null);
  const [vehicles, setVehicles] = useState<number | null>(null);
  const [f, setF] = useState<F>({ ...empty });
  const [hours, setHours] = useState<Record<string, string>>({});
  const [social, setSocial] = useState<Record<string, string>>({});
  const [owner, setOwner] = useState({ name: "", email: "", username: "", password: genPassword() });
  const [ghlMode, setGhlMode] = useState<"create" | "link" | "skip">(agencyConnected ? "create" : "skip");
  const [snaps, setSnaps] = useState<CrmSnapshot[] | null>(null);
  const [locs, setLocs] = useState<CrmLocation[] | null>(null);
  const [snapshotId, setSnapshotId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [voice, setVoice] = useState("professional");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tenantId: string; name: string; username: string; password: string; ghl: { ok: boolean; msg: string } | null } | null>(null);
  const set = (k: keyof F, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => { if (!open) { setStep(0); setUrl(""); setConf(null); setVehicles(null); setF({ ...empty }); setHours({}); setSocial({}); setOwner({ name: "", email: "", username: "", password: genPassword() }); setResult(null); setLocationId(""); setVoice("professional"); } }, [open]);
  useEffect(() => { setGhlMode(agencyConnected ? "create" : "skip"); }, [agencyConnected]);
  useEffect(() => {
    if (step !== 2 || !agencyConnected) return;
    if (!snaps) crmSnapshots().then((r) => { setSnaps(r.snapshots); const best = r.snapshots.find((s) => /car ?sales|dealer|auto/i.test(s.name)) ?? r.snapshots[0]; if (best) setSnapshotId(best.id); }).catch((e) => { setSnaps([]); toast.error(e.message); });
    if (!locs) crmLocations().then((r) => setLocs(r.locations)).catch(() => setLocs([]));
  }, [step, agencyConnected, snaps, locs]);

  const scan = async () => {
    if (!url.trim()) return;
    setScanning(true);
    try {
      const { profile: p, confidence } = await scanWebsite(url.trim());
      const dcsId = p.inventory.dealerId || (p.logoUrl.match(/dealercarsearch\.com\/(?:DealerImages|Media)\/(\d+)/i)?.[1] ?? "");
      setF({ ...empty, name: p.name, website: p.website, phone: p.phone, email: p.email, tagline: p.tagline, street: p.address.street, city: p.address.city, state: p.address.state, zip: p.address.zip, logo_url: p.logoUrl || p.ogImage, primary: p.colors.primary || empty.primary, secondary: p.colors.secondary || empty.secondary, accent: p.colors.accent || empty.accent, platform: p.inventory.code === "dcs" ? "Dealer Car Search" : p.inventory.platform || "none", dealerId: dcsId, inventoryUrl: p.inventoryUrl, creditAppUrl: p.creditAppUrl, plan: "starter" });
      setHours(p.hours); setSocial(p.social); setConf(confidence); setVehicles(p.inventory.vehicles);
      setOwner((o) => ({ ...o, username: o.username || suggestUsername(p.name) }));
      setStep(1); toast.success(`Found ${p.name || "the dealership"} — check the details`);
    } catch (e: any) { toast.error(e.message); } finally { setScanning(false); }
  };

  const create = async () => {
    setBusy(true);
    try {
      const website = f.website.trim() ? (/^https?:\/\//.test(f.website.trim()) ? f.website.trim() : `https://${f.website.trim()}`) : "";
      const preset = VOICE_PRESETS.find((v) => v.id === voice) ?? VOICE_PRESETS[0];
      const res = await createTenant({
        name: f.name.trim(), legal_name: f.legal_name, phone: f.phone, email: f.email, website, logo_url: f.logo_url, tagline: f.tagline,
        address: { street: f.street, city: f.city, state: f.state.toUpperCase(), zip: f.zip },
        colors: { primary: f.primary, secondary: f.secondary, accent: f.accent }, hours, social,
        financing: f.creditAppUrl ? { creditAppUrl: f.creditAppUrl, notes: [] } : undefined,
        inventory_source: f.platform === "none" ? undefined : { platform: f.platform, dealerId: f.dealerId.trim() || undefined, feedUrl: f.inventoryUrl || undefined },
        ai_voice: { preset: preset.id === "custom" ? "professional" : preset.id, scope: preset.id === "felipe" ? "light" : "staff", ...(preset.id === "felipe" ? { name: "Felipe" } : {}) },
        plan: f.plan,
      } as any, { username: owner.username, password: owner.password, fullName: owner.name, email: owner.email });
      let ghl: { ok: boolean; msg: string } | null = null;
      if (ghlMode === "create") {
        try { const r = await crmCreateLocation(res.id, { name: f.name, phone: f.phone, website, address: { street: f.street, city: f.city, state: f.state, zip: f.zip }, ownerName: owner.name, ownerEmail: owner.email }, snapshotId || undefined); ghl = r.linked ? { ok: true, msg: "GoHighLevel sub-account created and connected" } : { ok: false, msg: `Sub-account created, but not connected yet: ${r.linkError}` }; }
        catch (e: any) { ghl = { ok: false, msg: `Couldn't create the GoHighLevel sub-account: ${e.message}` }; }
      } else if (ghlMode === "link" && locationId) {
        try { await crmLinkLocation(res.id, locationId); ghl = { ok: true, msg: "Linked to the existing GoHighLevel sub-account" }; } catch (e: any) { ghl = { ok: false, msg: e.message }; }
      }
      setResult({ tenantId: res.id, name: f.name, username: owner.username.trim().toLowerCase(), password: owner.password, ghl });
      setStep(3); onCreated();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const reviewOk = !!f.name.trim();
  const accountsOk = owner.name.trim() && /^[a-z0-9][a-z0-9._-]{1,62}$/.test(owner.username.trim().toLowerCase()) && owner.password.length >= 8 && (ghlMode !== "link" || !!locationId);
  const freeLocs = useMemo(() => (locs ?? []).filter((l) => !l.linkedTenantId), [locs]);
  const field = (k: keyof F, label: string, ph = "", span = false) => (
    <div className={`space-y-1 ${span ? "sm:col-span-2" : ""}`}><Label className="flex items-center gap-1">{label}{!f[k] && conf !== null && <span className="text-[10px] text-amber-600 font-normal">· not found</span>}</Label><Input value={f[k]} onChange={(e) => set(k, e.target.value)} placeholder={ph} /></div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && !scanning && onOpenChange(o)}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a dealership</DialogTitle>
          <DialogDescription>Paste their website — we'll pull the rest.</DialogDescription>
          <div className="flex items-center gap-1.5 pt-2">{STEPS.map((s, i) => <div key={s} className="flex items-center gap-1.5"><span className={`h-6 px-2 rounded-full text-xs font-semibold grid place-items-center ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{i < step ? "✓ " : `${i + 1} · `}{s}</span>{i < STEPS.length - 1 && <span className="w-3 h-px bg-border" />}</div>)}</div>
        </DialogHeader>

        {step === 0 && (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border-2 border-dashed p-6 text-center space-y-3">
              <Globe className="h-10 w-10 mx-auto text-primary" />
              <p className="font-semibold">What's the dealership's website?</p>
              <form className="flex gap-2 max-w-md mx-auto" onSubmit={(e) => { e.preventDefault(); scan(); }}>
                <Input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="bestpriceautosales.net" disabled={scanning} />
                <Button type="submit" disabled={scanning || !url.trim()}>{scanning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Wand2 className="h-4 w-4 mr-1" />} Scan</Button>
              </form>
              {scanning ? <p className="text-sm text-muted-foreground">Reading their homepage, contact page, logo, colors and inventory… (about 10–20 seconds)</p>
                : <p className="text-xs text-muted-foreground">We pull the name, phone, address, hours, logo, brand colors, socials, credit-app link and inventory platform.</p>}
            </div>
            <button type="button" className="text-sm text-muted-foreground underline mx-auto block" onClick={() => setStep(1)}>No website? Enter the details by hand</button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 py-2">
            {conf !== null && <div className={`rounded-lg p-3 text-sm flex items-center gap-2 ${conf >= 70 ? "bg-emerald-50 text-emerald-900 border border-emerald-200" : "bg-amber-50 text-amber-900 border border-amber-200"}`}><Sparkles className="h-4 w-4 shrink-0" /> {conf >= 70 ? "Most details found on their website." : "Some details weren't on the website — fill in what's missing."} Edit anything that's off.</div>}
            <div className="flex items-center gap-4">
              <div className="h-16 w-36 rounded-lg border bg-white grid place-items-center overflow-hidden shrink-0">{f.logo_url ? <img src={f.logo_url} alt="" className="max-h-14 max-w-[130px] object-contain" /> : <span className="text-xs text-muted-foreground">No logo</span>}</div>
              <div className="flex gap-2">{(["primary", "secondary", "accent"] as const).map((k) => <label key={k} className="text-center text-[10px] text-muted-foreground capitalize space-y-1 cursor-pointer"><input type="color" value={f[k]} onChange={(e) => set(k, e.target.value)} className="h-9 w-12 rounded border cursor-pointer" /><span className="block">{k}</span></label>)}</div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {field("name", "Dealership name *", "Best Price Auto Sales", true)}
              {field("phone", "Phone", "978-682-8800")}{field("email", "Email", "sales@…")}
              {field("website", "Website", "https://…", true)}
              {field("street", "Street", "", true)}{field("city", "City")}
              <div className="grid grid-cols-2 gap-2">{field("state", "State", "MA")}{field("zip", "ZIP")}</div>
              {field("logo_url", "Logo URL", "https://…/logo.png", true)}
            </div>
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-sm font-semibold flex items-center gap-2"><Car className="h-4 w-4" /> Inventory {f.platform !== "none" && <Badge variant="secondary">{f.platform}</Badge>}{vehicles ? <Badge variant="outline">~{vehicles} vehicles on the site</Badge> : null}</p>
              {f.platform === "Dealer Car Search" ? <div className="grid sm:grid-cols-2 gap-2 items-end"><div className="space-y-1"><Label>Dealer Car Search ID</Label><Input value={f.dealerId} onChange={(e) => set("dealerId", e.target.value)} placeholder="e.g. 19988" /></div><p className="text-xs text-muted-foreground">Their cars sync in every night automatically.</p></div>
                : <p className="text-xs text-muted-foreground">{f.platform !== "none" ? `${f.platform} sites aren't auto-synced yet — inventory can be imported from a CSV after setup.` : "No inventory platform detected — inventory can be added or imported after setup."}</p>}
            </div>
            {Object.keys(hours).length > 0 && <div className="text-xs text-muted-foreground"><b className="text-foreground">Hours found:</b> {DAYS.filter((d) => hours[d]).map((d) => `${d.slice(0, 3)} ${hours[d]}`).join(" · ")}</div>}
            {Object.keys(social).length > 0 && <div className="text-xs text-muted-foreground"><b className="text-foreground">Also found:</b> {Object.keys(social).join(", ")}{f.creditAppUrl ? ", credit application" : ""}</div>}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 py-2">
            <section className="space-y-2">
              <p className="font-semibold text-sm">Owner login</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Owner name *</Label><Input value={owner.name} onChange={(e) => setOwner({ ...owner, name: e.target.value })} placeholder="Ed Smith" /></div>
                <div className="space-y-1"><Label>Owner email</Label><Input value={owner.email} onChange={(e) => setOwner({ ...owner, email: e.target.value })} placeholder="ed@…" /></div>
                <div className="space-y-1"><Label>Username *</Label><Input value={owner.username} onChange={(e) => setOwner({ ...owner, username: e.target.value })} /></div>
                <div className="space-y-1"><Label>Temporary password *</Label><div className="flex gap-2"><Input value={owner.password} onChange={(e) => setOwner({ ...owner, password: e.target.value })} /><Button type="button" variant="outline" onClick={() => setOwner({ ...owner, password: genPassword() })}>New</Button></div></div>
              </div>
            </section>
            <section className="space-y-2">
              <p className="font-semibold text-sm">GoHighLevel sub-account</p>
              {!agencyConnected ? <p className="text-sm rounded-lg border border-amber-200 bg-amber-50 text-amber-900 p-3">Connect your GoHighLevel agency on the Dealerships page first to create sub-accounts automatically. You can still create the dealership now and connect it later.</p> : (
                <div className="grid gap-2">
                  {([["create", "Create a new sub-account", "Built from your snapshot — pipelines, calendars, workflows and the Voice AI agent come with it."], ["link", "Use an existing sub-account", "They're already in your agency."], ["skip", "Not now", "Connect it later from this page."]] as const).map(([id, label, detail]) => (
                    <button key={id} type="button" onClick={() => setGhlMode(id)} className={`text-left rounded-lg border p-3 ${ghlMode === id ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}><span className="font-semibold text-sm block">{label}</span><span className="text-xs text-muted-foreground">{detail}</span></button>
                  ))}
                  {ghlMode === "create" && <div className="space-y-1"><Label>Snapshot</Label>{snaps === null ? <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Loading snapshots…</p> : <Select value={snapshotId || "none"} onValueChange={(v) => setSnapshotId(v === "none" ? "" : v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Blank sub-account</SelectItem>{snaps.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>}</div>}
                  {ghlMode === "link" && <div className="space-y-1"><Label>Sub-account</Label>{locs === null ? <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Loading sub-accounts…</p> : <Select value={locationId} onValueChange={setLocationId}><SelectTrigger><SelectValue placeholder={freeLocs.length ? "Pick one" : "No unlinked sub-accounts"} /></SelectTrigger><SelectContent>{freeLocs.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}{l.city ? ` · ${l.city}` : ""}</SelectItem>)}</SelectContent></Select>}</div>}
                </div>
              )}
            </section>
            <section className="space-y-2">
              <p className="font-semibold text-sm">AI voice</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{VOICE_PRESETS.filter((v) => v.id !== "custom").map((v) => <button key={v.id} type="button" onClick={() => setVoice(v.id)} className={`rounded-lg border p-2 text-left ${voice === v.id ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}><span className="text-lg">{v.badge}</span><span className="block text-sm font-semibold">{v.label}</span></button>)}</div>
              <p className="text-xs text-muted-foreground">They can change it any time in Settings → AI Voice.</p>
            </section>
          </div>
        )}

        {step === 3 && result && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 text-lg font-bold"><CheckCircle2 className="h-6 w-6 text-emerald-600" /> {result.name} is live</div>
            <ul className="text-sm space-y-1.5">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Dealership, store and owner login created</li>
              {result.ghl && <li className="flex items-start gap-2">{result.ghl.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5" /> : <XCircle className="h-4 w-4 text-destructive mt-0.5" />}<span>{result.ghl.msg}</span></li>}
              {f.platform === "Dealer Car Search" && f.dealerId && <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Inventory syncs from {f.website.replace(/^https?:\/\//, "")} tonight</li>}
            </ul>
            <div className="rounded-lg bg-muted p-4 font-mono text-sm space-y-1"><p>Sign in at: app.carsalessoftware.com</p><p>Username: <b>{result.username}</b></p><p>Temporary password: <b>{result.password}</b></p></div>
            <p className="text-xs text-muted-foreground">The password is shown once. The owner changes it and confirms the details on first sign-in.</p>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 1 && <Button variant="ghost" onClick={() => setStep(0)}><ArrowLeft className="h-4 w-4 mr-1" /> Rescan</Button>}
          {step === 2 && <Button variant="ghost" onClick={() => setStep(1)} disabled={busy}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>}
          {step === 1 && <Button onClick={() => { setOwner((o) => ({ ...o, username: o.username || suggestUsername(f.name) })); setStep(2); }} disabled={!reviewOk}>Next <ArrowRight className="h-4 w-4 ml-1" /></Button>}
          {step === 2 && <Button onClick={create} disabled={busy || !accountsOk}>{busy ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Creating…</> : "Create dealership"}</Button>}
          {step === 3 && result && <>
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(`CarSales AI OS login for ${result.name}\nhttps://app.carsalessoftware.com\nUsername: ${result.username}\nTemporary password: ${result.password}\n(You'll be asked to change it on first sign-in.)`); toast.success("Copied"); }}><Copy className="h-4 w-4 mr-1" /> Copy login</Button>
            <Button variant="outline" onClick={() => switchTenant(result.tenantId)}>Open {result.name}</Button>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
