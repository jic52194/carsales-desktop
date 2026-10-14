// Shown only in a demo dealership (tenants.is_demo). Mark (or any demo manager) can:
//  • "Make it theirs" — paste the prospect dealership's website; we scan it and turn the demo into their store:
//    their name, logo, colors, phone, address, hours and their real cars, with sample customers/leads/deals around them.
//  • "Reset demo" — back to CarSalesSoftware branding and fresh sample data (also runs every night).
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, RotateCcw, Presentation, Wand2, Globe, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { useTenant } from "@/lib/tenant";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { scanWebsite } from "@/lib/crm";

async function demoCall(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("demo", { body });
  if (error) { let msg = error.message; try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch { /* keep */ } throw new Error(msg); }
  if (data?.error) throw new Error(data.error);
  return data;
}

const STEPS = ["Reading their website", "Pulling logo, colors, phone, address & hours", "Importing their inventory", "Building sample customers, leads & deals"];

export function PersonalizeDemoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [url, setUrl] = useState("");
  const [step, setStep] = useState(-1);
  const [err, setErr] = useState("");
  const busy = step >= 0;
  const [profile, setProfile] = useState<any>(null);
  const reset = () => { setProfile(null); setStep(-1); setErr(""); };
  const scan = async () => {
    if (!url.trim()) return;
    setErr(""); setStep(0);
    try { const { profile } = await scanWebsite(url.trim()); setProfile(profile); setStep(-1); }
    catch (e: any) { setErr(e.message || "Something went wrong"); setStep(-1); }
  };
  const build = async () => {
    setErr(""); setStep(1); await new Promise((r) => setTimeout(r, 400));
    setStep(2);
    const t = setTimeout(() => setStep(3), 12000);
    try {
      const r = await demoCall({ action: "personalize", profile });
      clearTimeout(t); setStep(4);
      toast.success(r.sample ? `Demo is now ${r.name}. Their inventory couldn't be read, so it shows sample cars.` : `Demo is now ${r.name} — ${r.imported} of their cars imported`);
      setTimeout(() => window.location.assign("/"), 900);
    } catch (e: any) { clearTimeout(t); setErr(e.message || "Something went wrong"); setStep(-1); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (busy) return; if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Make the demo their dealership</DialogTitle>
          <DialogDescription>Paste the dealership's website. We'll put their name, logo, colors and real cars into the demo in about 30 seconds.</DialogDescription>
        </DialogHeader>
        {!busy && profile ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              {profile.logoUrl ? <img src={profile.logoUrl} alt="" className="h-12 w-24 object-contain" /> : <div className="h-12 w-24 rounded bg-muted grid place-items-center text-xs text-muted-foreground">No logo</div>}
              <div className="text-sm text-muted-foreground min-w-0"><p className="truncate">{[profile.phone, profile.address?.city && `${profile.address.city}, ${profile.address.state}`].filter(Boolean).join(" · ") || profile.website}</p><p className="text-xs">{profile.inventory?.platform ? `Inventory: ${profile.inventory.platform}` : "Inventory platform not detected"}</p></div>
            </div>
            <div className="space-y-1"><p className="text-sm font-medium">Dealership name</p><Input value={profile.name ?? ""} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></div>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <div className="flex justify-between gap-2"><Button variant="ghost" onClick={reset}>Back</Button><Button onClick={build} disabled={!String(profile.name ?? "").trim()}><Wand2 className="h-4 w-4 mr-1" /> Build their demo</Button></div>
          </div>
        ) : !busy ? (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); scan(); }}>
            <div className="flex gap-2">
              <div className="relative flex-1"><Globe className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input autoFocus className="pl-9" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="theirdealership.com" /></div>
              <Button type="submit" disabled={!url.trim()}><Wand2 className="h-4 w-4 mr-1" /> Scan</Button>
            </div>
            {err && <p className="text-sm text-destructive">{err.includes("Couldn't open") ? `${err} Try their www. address, or another page of their site.` : err}</p>}
            <button type="button" className="text-sm text-muted-foreground underline" onClick={() => onOpenChange(false)}>Skip — show the CarSalesSoftware sample dealership</button>
            <p className="text-xs text-muted-foreground">Their customers are never imported — the demo uses made-up customers, leads and deals. Nothing is texted or emailed. "Reset demo" puts it back to CarSalesSoftware.</p>
          </form>
        ) : (
          <ul className="space-y-2 py-2">
            {STEPS.map((s, i) => (
              <li key={s} className={`flex items-center gap-2 text-sm ${i > step ? "text-muted-foreground" : ""}`}>
                {i < step ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : i === step ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Circle className="h-4 w-4" />}{s}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function DemoBanner() {
  const tenant = useTenant() as any;
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const canEdit = !!user && ["owner", "admin", "manager", "super_admin"].includes(user.role);
  // First thing after signing in to the untouched demo: ask for the prospect's website (once per browser session).
  useEffect(() => {
    if (!tenant?.isDemo || !canEdit || tenant.name !== "CarSalesSoftware Demo Motors") return;
    try { if (sessionStorage.getItem("cso-demo-asked")) return; sessionStorage.setItem("cso-demo-asked", "1"); } catch { /* private mode */ }
    setOpen(true);
  }, [tenant?.isDemo, tenant?.name, canEdit]);
  if (!tenant?.isDemo) return null;
  const reset = async () => {
    if (!window.confirm("Reset the demo? It goes back to CarSalesSoftware branding with fresh sample data.")) return;
    setBusy(true);
    try { await demoCall({ action: "reset" }); toast.success("Demo reset"); setTimeout(() => window.location.assign("/"), 600); }
    catch (e: any) { toast.error(e.message); setBusy(false); }
  };
  return (
    <>
      <div className="shrink-0 z-40 flex flex-wrap items-center gap-x-3 gap-y-1 px-3 md:px-5 py-1.5 bg-indigo-600 text-white text-sm">
        <Presentation className="h-4 w-4 shrink-0" />
        <span className="font-semibold">Demo dealership</span>
        <span className="hidden md:inline text-white/80">— sample customers and deals. Resets every night.</span>
        {canEdit && (
          <div className="ml-auto flex gap-2">
            <Button size="sm" className="h-7 bg-white text-indigo-700 hover:bg-white/90" onClick={() => setOpen(true)} disabled={busy}><Wand2 className="h-3.5 w-3.5 mr-1" />Make it theirs</Button>
            <Button size="sm" variant="outline" className="h-7 bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={reset} disabled={busy}>{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><RotateCcw className="h-3.5 w-3.5 mr-1" />Reset demo</>}</Button>
          </div>
        )}
      </div>
      <PersonalizeDemoDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
