import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Plus, ArrowRightLeft, Loader2, CheckCircle2, Clock, Copy, Ban, Play, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { listTenants, createTenant, switchTenant, updateTenant, type PlatformTenant } from "@/lib/platform";
import AgencyConnectionCard from "@/components/AgencyConnectionCard";
import PlatformBillingCard from "@/components/PlatformBillingCard";
import { billingCheckout, STATUS_LABEL } from "@/lib/billing";
import AddDealershipWizard from "@/components/AddDealershipWizard";
import { crmLocations, crmLinkLocation, type CrmLocation, type CrmStatus } from "@/lib/crm";
import { useSearchParams } from "react-router-dom";

const blank = { name: "", legal_name: "", phone: "", email: "", website: "", logo_url: "", street: "", city: "", state: "", zip: "", platform: "Dealer Car Search", dealerId: "", plan: "starter", primary: "#1F2A44", accent: "#2563EB", ownerName: "", ownerUsername: "", ownerPassword: "", ownerEmail: "" };

function suggestUsername(name: string) { return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "").slice(0, 40); }
function genPassword() { const a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"; let s = ""; const r = crypto.getRandomValues(new Uint8Array(10)); for (const b of r) s += a[b % a.length]; return s + "!"; }

export default function Dealerships() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PlatformTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ ...blank });
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ name: string; username: string; password: string } | null>(null);
  const set = (k: keyof typeof blank, v: string) => setF((p) => ({ ...p, [k]: v }));

  const isSuper = user?.role === "super_admin";
  const [wizard, setWizard] = useState(false);
  const [crm, setCrm] = useState<CrmStatus | null>(null);
  const [linkFor, setLinkFor] = useState<PlatformTenant | null>(null);
  const [locs, setLocs] = useState<CrmLocation[] | null>(null);
  const [pickLoc, setPickLoc] = useState("");
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    const g = params.get("ghl"); if (!g) return;
    if (g === "connected") toast.success("GoHighLevel agency connected — new dealerships can now get their sub-account automatically");
    else toast.error(params.get("msg") || "GoHighLevel connection failed");
    params.delete("ghl"); params.delete("msg"); setParams(params, { replace: true });
  }, [params, setParams]);
  const openLink = async (t: PlatformTenant) => { setLinkFor(t); setPickLoc(""); setLocs(null); try { setLocs((await crmLocations()).locations); } catch (e: any) { toast.error(e.message); setLocs([]); } };
  const doLink = async () => { if (!linkFor || !pickLoc) return; setBusy(true); try { await crmLinkLocation(linkFor.id, pickLoc); toast.success(`${linkFor.name} connected to GoHighLevel`); setLinkFor(null); await load(); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); } };
  const load = async () => { setLoading(true); try { setRows(await listTenants()); } catch (e: any) { toast.error(e.message); } finally { setLoading(false); } };
  useEffect(() => { if (isSuper) load(); }, [isSuper]);

  if (!isSuper) return <div className="p-8 text-center"><h1 className="text-xl font-bold mb-1">Platform administrators only</h1><p className="text-muted-foreground">This page is for CarSalesSoftware.com staff.</p></div>;

  const submit = async () => {
    setBusy(true);
    try {
      const website = f.website.trim() ? (f.website.trim().startsWith("http") ? f.website.trim() : `https://${f.website.trim()}`) : "";
      await createTenant({
        name: f.name, legal_name: f.legal_name, phone: f.phone, email: f.email, website, logo_url: f.logo_url,
        address: { street: f.street, city: f.city, state: f.state.toUpperCase(), zip: f.zip },
        colors: { primary: f.primary, secondary: "#0F172A", accent: f.accent },
        inventory_source: f.platform === "none" ? undefined : { platform: f.platform, dealerId: f.dealerId.trim() || undefined },
        plan: f.plan,
      }, { username: f.ownerUsername, password: f.ownerPassword, fullName: f.ownerName, email: f.ownerEmail });
      setCreated({ name: f.name, username: f.ownerUsername.trim().toLowerCase(), password: f.ownerPassword });
      setOpen(false); setF({ ...blank }); await load();
      toast.success(`${f.name} is live`);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const setPlan = async (t: PlatformTenant, plan: string) => { try { await updateTenant(t.id, { plan }); toast.success(`${t.name}: ${plan}`); await load(); } catch (e: any) { toast.error(e.message); } };
  const payLink = async (t: PlatformTenant) => {
    const plan = (["starter", "pro", "enterprise"].includes(t.plan) ? t.plan : "starter") as "starter" | "pro" | "enterprise";
    try { const { url } = await billingCheckout(plan, t.id); await navigator.clipboard.writeText(url); toast.success(`${t.name}: ${plan} payment link copied — text or email it to the owner (it works for 24 hours)`); }
    catch (e: any) { toast.error(e.message); }
  };
  const toggleStatus = async (t: PlatformTenant) => { const status = t.status === "suspended" ? "active" : "suspended"; try { await updateTenant(t.id, { status }); toast.success(status === "suspended" ? `${t.name} suspended — their users can't sign in` : `${t.name} reactivated`); await load(); } catch (e: any) { toast.error(e.message); } };
  const doSwitch = async (t: PlatformTenant) => { try { toast.message(`Switching to ${t.name}…`); await switchTenant(t.id); } catch (e: any) { toast.error(e.message); } };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6" /> Dealerships</h1><p className="text-sm text-muted-foreground">Every dealership on CarSalesSoftware.com. Each one is fully isolated: its own users, inventory, customers and settings.</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => { setF({ ...blank, ownerPassword: genPassword() }); setOpen(true); }}>Manual form</Button><Button onClick={() => setWizard(true)}><Plus className="h-4 w-4 mr-1" /> Add dealership</Button></div>
      </div>

      <AgencyConnectionCard onStatus={setCrm} />
      <PlatformBillingCard />

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Dealership</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Billing</th><th className="px-4 py-3">Onboarding</th><th className="px-4 py-3">GoHighLevel</th><th className="px-4 py-3 text-right">Users</th><th className="px-4 py-3 text-right">In stock</th><th className="px-4 py-3 text-right">Leads</th><th className="px-4 py-3">Since</th><th className="px-4 py-3"></th></tr></thead>
            <tbody className="divide-y">
              {loading && !rows.length && <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading…</td></tr>}
              {rows.map((t) => (
                <tr key={t.id} className={t.current ? "bg-primary/5" : ""}>
                  <td className="px-4 py-3"><div className="flex items-center gap-3">{t.logo_url ? <img src={t.logo_url} alt="" className="h-8 w-8 object-contain rounded bg-white" /> : <div className="h-8 w-8 rounded bg-muted flex items-center justify-center"><Building2 className="h-4 w-4 text-muted-foreground" /></div>}<div><p className="font-semibold">{t.name} {t.current && <Badge variant="outline" className="ml-1">You're here</Badge>}</p><p className="text-xs text-muted-foreground">{t.website?.replace(/^https?:\/\//, "") || "no website"}{t.phone ? ` · ${t.phone}` : ""}</p></div></div></td>
                  <td className="px-4 py-3"><Select value={t.plan} onValueChange={(v) => setPlan(t, v)}><SelectTrigger className="h-8 w-28 capitalize"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="trial">Trial</SelectItem><SelectItem value="starter">Starter</SelectItem><SelectItem value="pro">Pro</SelectItem><SelectItem value="enterprise">Enterprise</SelectItem><SelectItem value="demo">Demo</SelectItem></SelectContent></Select>{t.status === "suspended" && <Badge variant="destructive" className="ml-2">Suspended</Badge>}</td>
                  <td className="px-4 py-3">{t.is_demo ? <span className="text-muted-foreground">Demo</span> : <div className="flex items-center gap-1.5"><span className={["past_due", "unpaid"].includes(t.billing?.status ?? "") ? "text-red-700 font-medium" : ["active", "trialing"].includes(t.billing?.status ?? "") ? "text-emerald-700" : "text-muted-foreground"}>{STATUS_LABEL[t.billing?.status ?? "none"]?.label ?? t.billing?.status}</span>{!["active", "trialing", "past_due"].includes(t.billing?.status ?? "") && <Button size="sm" variant="ghost" className="h-7 px-2" title="Copy a Stripe payment link for this dealership's plan" onClick={() => payLink(t)}><Link2 className="h-3.5 w-3.5" /></Button>}</div>}</td>
                  <td className="px-4 py-3">{t.onboarded ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Confirmed</span> : <span className="inline-flex items-center gap-1 text-amber-700"><Clock className="h-4 w-4" /> Waiting for owner</span>}</td>
                  <td className="px-4 py-3">{t.ghl?.status === "connected" ? <span className="inline-flex items-center gap-1 text-emerald-700" title={t.ghl.locationId ?? ""}><CheckCircle2 className="h-4 w-4" /> {t.ghl.via === "app" ? "Connected" : "Token"}</span>
                    : t.ghl?.error ? <Button size="sm" variant="ghost" className="text-destructive h-7 px-2" title={t.ghl.error} onClick={() => openLink(t)}>Fix</Button>
                    : crm?.agencyConnected ? <Button size="sm" variant="outline" className="h-7" onClick={() => openLink(t)}>Link</Button> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{t.users}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{t.vehicles}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{t.leads}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{!t.current && <Button size="sm" variant="outline" onClick={() => doSwitch(t)}><ArrowRightLeft className="h-4 w-4 mr-1" /> Open</Button>}{!t.current && <Button size="sm" variant="ghost" className="ml-1" title={t.status === "suspended" ? "Reactivate" : "Suspend sign-ins"} onClick={() => toggleStatus(t)}>{t.status === "suspended" ? <Play className="h-4 w-4" /> : <Ban className="h-4 w-4" />}</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add a dealership</DialogTitle><DialogDescription>Creates the dealership and its owner login. The owner is asked to change the password and confirm every detail on first sign-in — so a name, website and phone are enough to start.</DialogDescription></DialogHeader>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1 md:col-span-2"><Label>Dealership name *</Label><Input value={f.name} onChange={(e) => { set("name", e.target.value); if (!f.ownerUsername || f.ownerUsername === suggestUsername(f.name)) set("ownerUsername", suggestUsername(e.target.value)); }} placeholder="Best Price Auto Sales" /></div>
            <div className="space-y-1"><Label>Legal name</Label><Input value={f.legal_name} onChange={(e) => set("legal_name", e.target.value)} placeholder="Best Price Auto Sales Inc" /></div>
            <div className="space-y-1"><Label>Website</Label><Input value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="bestpriceautosales.net" /></div>
            <div className="space-y-1"><Label>Phone</Label><Input value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="978-682-8800" /></div>
            <div className="space-y-1"><Label>Dealership email</Label><Input value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="sales@…" /></div>
            <div className="space-y-1 md:col-span-2"><Label>Street</Label><Input value={f.street} onChange={(e) => set("street", e.target.value)} /></div>
            <div className="space-y-1"><Label>City</Label><Input value={f.city} onChange={(e) => set("city", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>State</Label><Input value={f.state} onChange={(e) => set("state", e.target.value)} maxLength={2} placeholder="MA" /></div><div className="space-y-1"><Label>ZIP</Label><Input value={f.zip} onChange={(e) => set("zip", e.target.value)} /></div></div>
            <div className="space-y-1"><Label>Logo URL</Label><Input value={f.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://…/logo.png" /></div>
            <div className="space-y-1"><Label>Plan</Label><Select value={f.plan} onValueChange={(v) => set("plan", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="trial">Trial</SelectItem><SelectItem value="starter">Starter</SelectItem><SelectItem value="pro">Pro</SelectItem><SelectItem value="enterprise">Enterprise</SelectItem><SelectItem value="demo">Demo</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Brand color</Label><Input type="color" value={f.primary} onChange={(e) => set("primary", e.target.value)} className="h-10 p-1" /></div><div className="space-y-1"><Label>Accent</Label><Input type="color" value={f.accent} onChange={(e) => set("accent", e.target.value)} className="h-10 p-1" /></div></div>
            <div className="space-y-1"><Label>Website platform (inventory sync)</Label><Select value={f.platform} onValueChange={(v) => set("platform", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Dealer Car Search">Dealer Car Search</SelectItem><SelectItem value="none">None / manual inventory</SelectItem></SelectContent></Select></div>
            {f.platform === "Dealer Car Search" && <div className="space-y-1 md:col-span-2"><Label>Dealer Car Search dealer ID</Label><Input value={f.dealerId} onChange={(e) => set("dealerId", e.target.value)} placeholder="e.g. 19988 — from their photo URLs: imagescdn.dealercarsearch.com/Media/<ID>/…" /><p className="text-xs text-muted-foreground">Inventory is pulled from the website every night; you can also hit "Sync now" in their Settings after switching in.</p></div>}
            <div className="md:col-span-2 border-t pt-3 mt-1"><p className="font-semibold text-sm">Owner login</p></div>
            <div className="space-y-1"><Label>Owner name *</Label><Input value={f.ownerName} onChange={(e) => set("ownerName", e.target.value)} placeholder="Ed" /></div>
            <div className="space-y-1"><Label>Owner email (for recovery)</Label><Input value={f.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)} /></div>
            <div className="space-y-1"><Label>Username *</Label><Input value={f.ownerUsername} onChange={(e) => set("ownerUsername", e.target.value)} /></div>
            <div className="space-y-1"><Label>Temporary password *</Label><div className="flex gap-2"><Input value={f.ownerPassword} onChange={(e) => set("ownerPassword", e.target.value)} /><Button type="button" variant="outline" onClick={() => set("ownerPassword", genPassword())}>New</Button></div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button><Button onClick={submit} disabled={busy || !f.name.trim() || !f.ownerName.trim() || !f.ownerUsername.trim() || f.ownerPassword.length < 8}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create dealership"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!created} onOpenChange={(o) => !o && setCreated(null)}>
        {created && <DialogContent>
          <DialogHeader><DialogTitle>{created.name} is ready</DialogTitle><DialogDescription>Hand these to the owner. The password is shown once — it must be changed on first sign-in.</DialogDescription></DialogHeader>
          <div className="rounded-lg bg-muted p-4 font-mono text-sm space-y-1"><p>Sign in at: carsalessoftware.com app (desktop or web)</p><p>Username: <b>{created.username}</b></p><p>Temporary password: <b>{created.password}</b></p></div>
          <DialogFooter><Button variant="outline" onClick={() => { navigator.clipboard.writeText(`CarSales AI OS login for ${created.name}\nUsername: ${created.username}\nTemporary password: ${created.password}\n(You'll be asked to change it on first sign-in.)`); toast.success("Copied"); }}><Copy className="h-4 w-4 mr-1" /> Copy</Button><Button onClick={() => setCreated(null)}>Done</Button></DialogFooter>
        </DialogContent>}
      </Dialog>

      <AddDealershipWizard open={wizard} onOpenChange={setWizard} agencyConnected={!!crm?.agencyConnected} onCreated={load} />
      <Dialog open={!!linkFor} onOpenChange={(o) => !o && !busy && setLinkFor(null)}>
        {linkFor && <DialogContent>
          <DialogHeader><DialogTitle>Connect {linkFor.name} to GoHighLevel</DialogTitle><DialogDescription>Pick their sub-account. The CarSales AI OS app must be installed on it (it is automatically when installed for all sub-accounts).</DialogDescription></DialogHeader>
          {locs === null ? <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading sub-accounts…</p>
            : <Select value={pickLoc} onValueChange={setPickLoc}><SelectTrigger><SelectValue placeholder="Pick a sub-account" /></SelectTrigger><SelectContent>{locs.filter((l) => !l.linkedTenantId || l.linkedTenantId === linkFor.id).map((l) => <SelectItem key={l.id} value={l.id}>{l.name}{l.city ? ` · ${l.city}` : ""}{l.linkedTenantId === linkFor.id ? " (current)" : ""}</SelectItem>)}</SelectContent></Select>}
          {linkFor.ghl?.error && <p className="text-xs text-destructive">{linkFor.ghl.error}</p>}
          <DialogFooter><Button variant="outline" onClick={() => setLinkFor(null)} disabled={busy}>Cancel</Button><Button onClick={doLink} disabled={busy || !pickLoc}>{busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Connect</Button></DialogFooter>
        </DialogContent>}
      </Dialog>
    </div>
  );
}
