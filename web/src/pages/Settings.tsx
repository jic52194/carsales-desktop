import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import AiVoiceTab from "@/components/AiVoiceTab";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, KeyRound, Download, RotateCcw, Eye, Store, Pencil, Star } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useTenant, saveTenantOverrides, applyTenantTheme, getOnboarding, resetOnboarding, getTenantId } from "@/lib/tenant";
import { useAuth, useUsers, createUser, adminResetPassword, adminSetActive, updateProfile, ROLE_LABELS, type Role, type User } from "@/lib/auth";
import { useLocations, createLocation, updateLocation, setDefault, slugify, type Location } from "@/lib/locations";
import { ConnectionsTab } from "@/components/ConnectionsTab";
import { ImportCustomers } from "@/components/ImportCustomers";
import { ActivityLog } from "@/components/ActivityLog";
import { SecurityTab } from "@/components/SecurityTab";
import { list as listRows } from "@/lib/store";
import { loadInventory } from "@/lib/inventory";

const ASSIGNABLE: Role[] = ["owner", "admin", "manager", "sales", "f_and_i", "inventory", "service", "web", "technician", "porter"];

export default function Settings() {
  const tenant = useTenant();
  const { user, account, viewAs, hasPermission, startViewAs, locations } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "dealership";
  const isAdmin = hasPermission(["admin"]);
  const canViewAs = !viewAs && (account?.role === "owner" || account?.role === "super_admin");
  const [viewFor, setViewFor] = useState<User | null>(null);
  const [viewReason, setViewReason] = useState("");
  const [viewBusy, setViewBusy] = useState(false);
  const [t, setT] = useState({ name: tenant.name, legalName: tenant.legalName ?? "", phone: tenant.phone, email: tenant.email ?? "", website: tenant.website, street: tenant.address.street, city: tenant.address.city, state: tenant.address.state, zip: tenant.address.zip, logoUrl: tenant.logoUrl, primary: tenant.colors.primary, secondary: tenant.colors.secondary, accent: tenant.colors.accent });
  const users = useUsers();
  const [addOpen, setAddOpen] = useState(false);
  const [nu, setNu] = useState({ fullName: "", username: "", email: "", role: "sales" as Role, password: "" });
  const [pwFor, setPwFor] = useState<User | null>(null);
  const [pw, setPw] = useState("");
  const onboarding = getOnboarding();
  const stores = useLocations();
  const [storeDlg, setStoreDlg] = useState<{ id?: string; name: string; slug: string; brandName: string; logoUrl: string; phone: string; street: string; city: string; state: string; zip: string; primary: string; isDefault: boolean; active: boolean } | null>(null);
  const [storeBusy, setStoreBusy] = useState(false);
  const openStore = (l?: Location) => setStoreDlg(l
    ? { id: l.id, name: l.name, slug: l.slug, brandName: l.brandName ?? "", logoUrl: l.logoUrl ?? "", phone: l.phone ?? "", street: l.address?.street ?? "", city: l.address?.city ?? "", state: l.address?.state ?? "", zip: l.address?.zip ?? "", primary: l.colors?.primary ?? tenant.colors.primary, isDefault: l.isDefault, active: l.active }
    : { name: "", slug: "", brandName: "", logoUrl: "", phone: "", street: "", city: "", state: "", zip: "", primary: tenant.colors.primary, isDefault: stores.length === 0, active: true });
  const saveStore = async () => {
    if (!storeDlg) return; const d = storeDlg; if (!d.name.trim()) return toast.error("Store name required");
    setStoreBusy(true);
    const patch = { name: d.name.trim(), slug: d.slug.trim() || slugify(d.name), brandName: d.brandName.trim() || null, logoUrl: d.logoUrl.trim() || null, phone: d.phone.trim() || null, address: { street: d.street, city: d.city, state: d.state, zip: d.zip }, colors: { primary: d.primary }, isDefault: d.isDefault, active: d.active };
    try { if (d.id) await updateLocation(d.id, patch); else await createLocation(patch); toast.success(d.id ? "Store updated" : `${patch.name} added`); setStoreDlg(null); }
    catch (e: any) { toast.error(e.message || "Could not save store"); } finally { setStoreBusy(false); }
  };
  const makeDefault = async (l: Location) => { try { await setDefault(l.id); toast.success(`${l.name} is now the default store`); } catch (e: any) { toast.error(e.message); } };
  const setUserStore = async (u: User, locationId: string | null) => { try { await updateProfile(u.id, { locationId }); toast.success(`${u.fullName} → ${locationId ? stores.find((l) => l.id === locationId)?.name : "All stores"}`); } catch (e: any) { toast.error(e.message); } };
  const sd = (k: string) => (e: any) => setStoreDlg((d) => (d ? { ...d, [k]: e.target.value } : d));
  const setF = (k: keyof typeof t) => (e: any) => setT({ ...t, [k]: e.target.value });

  const saveDealer = async () => {
    try {
      await saveTenantOverrides({ name: t.name, legalName: t.legalName, phone: t.phone, email: t.email || null, website: t.website, address: { street: t.street, city: t.city, state: t.state, zip: t.zip }, logoUrl: t.logoUrl, colors: { primary: t.primary, secondary: t.secondary, accent: t.accent, estimated: false } });
      applyTenantTheme(); toast.success("Dealership settings saved");
    } catch (e: any) { toast.error(e.message || "Could not save"); }
  };
  const addUser = async () => {
    const username = nu.username || nu.fullName.toLowerCase().trim().replace(/\s+/g, ".");
    try {
      await createUser({ ...nu, username });
      setAddOpen(false); setNu({ fullName: "", username: "", email: "", role: "sales", password: "" });
      toast.success(`${nu.fullName} added — username ${username}. They'll set a new password on first sign-in.`);
    } catch (e: any) { toast.error(e.message); }
  };
  const resetPw = async () => { if (!pwFor) return; try { await adminResetPassword(pwFor.id, pw); toast.success("Temporary password set — they'll be asked to change it"); setPwFor(null); setPw(""); } catch (e: any) { toast.error(e.message); } };
  const toggleActive = async (u: User) => { if (u.id === user?.id) return toast.error("You can't deactivate yourself"); try { await adminSetActive(u.id, !u.isActive); } catch (e: any) { toast.error(e.message); } };
  const doViewAs = async () => {
    if (!viewFor || viewReason.trim().length < 5) return toast.error("Give a short reason (at least 5 characters) — it's recorded in the audit log");
    setViewBusy(true);
    try { await startViewAs(viewFor, viewReason.trim()); toast.success(`Now viewing as ${viewFor.fullName}`); setViewFor(null); setViewReason(""); navigate("/"); }
    catch (e: any) { toast.error(e.message); } finally { setViewBusy(false); }
  };
  const exportData = () => {
    const data = { tenant, exportedAt: new Date().toISOString(), inventory: loadInventory(), customers: listRows("customers"), leads: listRows("leads"), deals: listRows("deals"), tasks: listRows("tasks"), appointments: listRows("appointments") };
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })); a.download = `${tenant.slug}-export-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div><h1 className="text-3xl font-black">Settings</h1><p className="text-muted-foreground">{tenant.name}</p></div>
      <Tabs value={tab} onValueChange={(v) => setParams(v === "dealership" ? {} : { tab: v }, { replace: true })}>
        <TabsList className="w-full justify-start overflow-x-auto"><TabsTrigger value="dealership">Dealership</TabsTrigger><TabsTrigger value="branding">Branding</TabsTrigger>{isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}{isAdmin && <TabsTrigger value="stores">Stores</TabsTrigger>}<TabsTrigger value="ai-voice">AI Voice</TabsTrigger><TabsTrigger value="connections">Connections</TabsTrigger><TabsTrigger value="security">Security</TabsTrigger>{isAdmin && <TabsTrigger value="data">Data</TabsTrigger>}</TabsList>

        <TabsContent value="dealership"><Card><CardHeader><CardTitle>Dealership information</CardTitle><CardDescription>{onboarding && !onboarding.preview ? `Confirmed by ${onboarding.completedByName || "dealer admin"} on ${new Date(onboarding.at).toLocaleDateString()}` : "Not yet confirmed by the dealership — the owner/admin will be asked on first sign-in."}</CardDescription></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Dealership name</Label><Input value={t.name} onChange={setF("name")} disabled={!isAdmin} /></div>
            <div className="space-y-1"><Label>Legal name</Label><Input value={t.legalName} onChange={setF("legalName")} disabled={!isAdmin} /></div>
            <div className="space-y-1"><Label>Phone</Label><Input value={t.phone} onChange={setF("phone")} disabled={!isAdmin} /></div>
            <div className="space-y-1"><Label>Email</Label><Input value={t.email} onChange={setF("email")} disabled={!isAdmin} /></div>
            <div className="space-y-1 md:col-span-2"><Label>Website</Label><Input value={t.website} onChange={setF("website")} disabled={!isAdmin} /></div>
            <div className="space-y-1 md:col-span-2"><Label>Street</Label><Input value={t.street} onChange={setF("street")} disabled={!isAdmin} /></div>
            <div className="space-y-1"><Label>City</Label><Input value={t.city} onChange={setF("city")} disabled={!isAdmin} /></div>
            <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label>State</Label><Input value={t.state} onChange={setF("state")} disabled={!isAdmin} /></div><div className="space-y-1"><Label>ZIP</Label><Input value={t.zip} onChange={setF("zip")} disabled={!isAdmin} /></div></div>
            <p className="md:col-span-2 text-xs text-muted-foreground">Hours: {Object.entries(tenant.hours).map(([d, h]) => `${d.slice(0, 3)} ${h}`).join(" · ")}</p>
            {isAdmin && <div className="md:col-span-2 flex gap-2"><Button onClick={saveDealer}>Save</Button><Button variant="outline" onClick={() => { resetOnboarding(); navigate("/onboarding"); }}><RotateCcw className="h-4 w-4 mr-1" /> Re-run onboarding</Button></div>}
          </CardContent></Card></TabsContent>

        <TabsContent value="branding"><Card><CardHeader><CardTitle>Branding</CardTitle><CardDescription>Logo and colors shown to your team inside the app.</CardDescription></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="space-y-1"><Label>Logo URL</Label><Input value={t.logoUrl} onChange={setF("logoUrl")} disabled={!isAdmin} /></div>
              {(["primary", "secondary", "accent"] as const).map((k) => <div key={k} className="flex items-center gap-3"><input type="color" value={t[k]} onChange={setF(k)} disabled={!isAdmin} className="h-10 w-14 rounded border" /><div className="flex-1 space-y-1"><Label className="capitalize">{k}</Label><Input value={t[k]} onChange={setF(k)} disabled={!isAdmin} /></div></div>)}
              {isAdmin && <Button onClick={saveDealer}>Save branding</Button>}
            </div>
            <div className="rounded-xl border p-6 space-y-3 bg-white dark:bg-slate-900"><img src={t.logoUrl} alt="logo" className="h-14 w-auto object-contain" /><div className="h-10 rounded-lg flex items-center px-4 text-white font-bold" style={{ background: t.primary }}>Primary</div><div className="h-10 rounded-lg flex items-center px-4 text-white font-bold" style={{ background: t.secondary }}>Secondary</div><div className="h-10 rounded-lg flex items-center px-4 font-bold" style={{ background: t.accent }}>Accent</div></div>
          </CardContent></Card></TabsContent>

        {isAdmin && <TabsContent value="users"><Card><CardHeader className="flex flex-row items-center justify-between space-y-0"><div><CardTitle>Users</CardTitle><CardDescription>Everyone who can sign in to {tenant.name}. New users must set their own password on first sign-in.</CardDescription></div><Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add user</Button></CardHeader>
          <CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Username</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Store</th><th className="px-4 py-3">Last sign-in</th><th className="px-4 py-3">Active</th><th></th></tr></thead>
            <tbody className="divide-y">{users.map((u) => (
              <tr key={u.id}><td className="px-4 py-3 font-semibold">{u.fullName}{u.mustChangePassword && <Badge variant="outline" className="ml-2 text-[10px]">must set password</Badge>}<span className="block text-xs font-normal text-muted-foreground">{u.email}</span></td><td className="px-4 py-3 font-mono text-xs">{u.username}</td><td className="px-4 py-3"><Badge variant="secondary">{ROLE_LABELS[u.role]}</Badge></td>
                <td className="px-4 py-3"><Select value={u.locationId ?? "__all"} onValueChange={(v) => setUserStore(u, v === "__all" ? null : v)}><SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__all">All stores</SelectItem>{stores.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent></Select></td>
                <td className="px-4 py-3 text-muted-foreground">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "never"}</td>
                <td className="px-4 py-3"><Switch checked={u.isActive} onCheckedChange={() => toggleActive(u)} disabled={u.role === "super_admin" && user?.role !== "super_admin"} /></td>
                <td className="px-4 py-3 text-right whitespace-nowrap">{canViewAs && u.id !== account?.id && u.isActive && <Button size="sm" variant="ghost" title="View the app as this user" onClick={() => { setViewFor(u); setViewReason(""); }}><Eye className="h-4 w-4 mr-1" /> View as</Button>}<Button size="sm" variant="ghost" title="Reset password" onClick={() => setPwFor(u)}><KeyRound className="h-4 w-4" /></Button></td></tr>))}
            </tbody></table></CardContent></Card></TabsContent>}

        {isAdmin && <TabsContent value="stores"><Card><CardHeader className="flex flex-row items-center justify-between space-y-0"><div><CardTitle>Stores</CardTitle><CardDescription>Locations under {tenant.name}. Each store can carry its own brand name, logo and phone; staff assigned to a store only see that store's inventory, leads, deals and appointments. Customers are shared across the group.</CardDescription></div><Button onClick={() => openStore()}><Plus className="h-4 w-4 mr-1" /> Add store</Button></CardHeader>
          <CardContent className="p-0">
            {stores.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No stores yet. With a single location you don't need any — add stores when you open a second rooftop, then assign users to them in the Users tab.</p> : (
              <div className="divide-y">{stores.map((l) => (
                <div key={l.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="h-10 w-10 rounded-lg border bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0">{l.logoUrl ? <img src={l.logoUrl} alt="" className="h-full w-full object-contain" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} /> : <Store className="h-4 w-4 text-muted-foreground" />}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold flex items-center gap-2 flex-wrap">{l.name}{l.isDefault && <Badge className="text-[10px]"><Star className="h-3 w-3 mr-1" /> Default</Badge>}{!l.active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}</p>
                    <p className="text-xs text-muted-foreground truncate">{[l.brandName, l.phone, [l.address?.street, l.address?.city, l.address?.state, l.address?.zip].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "No brand name, phone or address yet"}</p>
                    <p className="text-[11px] text-muted-foreground">{users.filter((u) => u.locationId === l.id).length} user(s) assigned · slug <code>{l.slug}</code></p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground"><Switch checked={l.isDefault} disabled={l.isDefault} onCheckedChange={() => makeDefault(l)} /> Default</label>
                    <Button size="sm" variant="outline" onClick={() => openStore(l)}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
                  </div>
                </div>))}</div>
            )}
          </CardContent></Card></TabsContent>}

        <TabsContent value="ai-voice"><AiVoiceTab canEdit={isAdmin} /></TabsContent>
        <TabsContent value="connections"><ConnectionsTab /></TabsContent>

        <TabsContent value="security"><SecurityTab /></TabsContent>

        {isAdmin && <TabsContent value="data" className="space-y-6"><ImportCustomers /><Card><CardHeader><CardTitle>Data</CardTitle><CardDescription>Your data lives in the CarSales AI OS cloud and syncs to every device. Export a copy any time.</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap gap-2"><Button variant="outline" onClick={exportData}><Download className="h-4 w-4 mr-1" /> Export everything (JSON)</Button></CardContent></Card><ActivityLog /></TabsContent>}
      </Tabs>

      <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogContent><DialogHeader><DialogTitle>Add user</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Full name</Label><Input value={nu.fullName} onChange={(e) => setNu({ ...nu, fullName: e.target.value })} autoFocus /></div>
          <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Username</Label><Input value={nu.username} onChange={(e) => setNu({ ...nu, username: e.target.value })} placeholder={nu.fullName.toLowerCase().trim().replace(/\s+/g, ".") || "first.last"} /></div><div className="space-y-1"><Label>Role</Label><Select value={nu.role} onValueChange={(v: Role) => setNu({ ...nu, role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ASSIGNABLE.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent></Select></div></div>
          <div className="space-y-1"><Label>Email *</Label><Input value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} placeholder="Used for sign-in recovery" /></div>
          <div className="space-y-1"><Label>Temporary password</Label><Input value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} placeholder="They'll be forced to change it" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={addUser}>Add user</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!storeDlg} onOpenChange={(o) => !o && setStoreDlg(null)}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{storeDlg?.id ? "Edit store" : "Add store"}</DialogTitle><DialogDescription>Brand name and logo replace the dealership's in the app for staff assigned to this store.</DialogDescription></DialogHeader>
        {storeDlg && <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Store name *</Label><Input value={storeDlg.name} onChange={sd("name")} placeholder="e.g. Salem NH" autoFocus /></div><div className="space-y-1"><Label>Slug</Label><Input value={storeDlg.slug} onChange={sd("slug")} placeholder={slugify(storeDlg.name || "store")} /></div></div>
          <div className="space-y-1"><Label>Brand name</Label><Input value={storeDlg.brandName} onChange={sd("brandName")} placeholder={tenant.name} /></div>
          <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Logo URL</Label><Input value={storeDlg.logoUrl} onChange={sd("logoUrl")} /></div><div className="space-y-1"><Label>Phone</Label><Input value={storeDlg.phone} onChange={sd("phone")} /></div></div>
          <div className="space-y-1"><Label>Street</Label><Input value={storeDlg.street} onChange={sd("street")} /></div>
          <div className="grid grid-cols-3 gap-3"><div className="space-y-1"><Label>City</Label><Input value={storeDlg.city} onChange={sd("city")} /></div><div className="space-y-1"><Label>State</Label><Input value={storeDlg.state} onChange={sd("state")} /></div><div className="space-y-1"><Label>ZIP</Label><Input value={storeDlg.zip} onChange={sd("zip")} /></div></div>
          <div className="flex items-center gap-3"><input type="color" value={storeDlg.primary} onChange={sd("primary")} className="h-10 w-14 rounded border" /><div className="flex-1 space-y-1"><Label>Primary color</Label><Input value={storeDlg.primary} onChange={sd("primary")} /></div></div>
          <div className="flex items-center gap-6 pt-1"><label className="flex items-center gap-2 text-sm"><Switch checked={storeDlg.isDefault} onCheckedChange={(v) => setStoreDlg({ ...storeDlg, isDefault: v })} /> Default store</label><label className="flex items-center gap-2 text-sm"><Switch checked={storeDlg.active} onCheckedChange={(v) => setStoreDlg({ ...storeDlg, active: v })} /> Active</label></div>
        </div>}
        <DialogFooter><Button variant="outline" onClick={() => setStoreDlg(null)} disabled={storeBusy}>Cancel</Button><Button onClick={saveStore} disabled={storeBusy}>{storeDlg?.id ? "Save" : "Add store"}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!pwFor} onOpenChange={(o) => !o && setPwFor(null)}><DialogContent><DialogHeader><DialogTitle>Reset password · {pwFor?.fullName}</DialogTitle></DialogHeader>
        <div className="space-y-1"><Label>Temporary password</Label><Input value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <DialogFooter><Button variant="outline" onClick={() => setPwFor(null)}>Cancel</Button><Button onClick={resetPw}>Set & require change</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!viewFor} onOpenChange={(o) => !o && setViewFor(null)}><DialogContent><DialogHeader><DialogTitle>View as {viewFor?.fullName}</DialogTitle><DialogDescription>You'll see the app exactly as {viewFor?.fullName.split(" ")[0]} does ({viewFor && ROLE_LABELS[viewFor.role]} · {locations.find((l) => l.id === viewFor?.locationId)?.name ?? "All stores"}). Anything you change is recorded under your own account, and this session is logged.</DialogDescription></DialogHeader>
        <div className="space-y-1"><Label>Reason</Label><Textarea value={viewReason} onChange={(e) => setViewReason(e.target.value)} placeholder="e.g. Checking why their leads list is empty" rows={3} autoFocus /><p className="text-xs text-muted-foreground">At least 5 characters.</p></div>
        <DialogFooter><Button variant="outline" onClick={() => setViewFor(null)} disabled={viewBusy}>Cancel</Button><Button onClick={doViewAs} disabled={viewBusy || viewReason.trim().length < 5}><Eye className="h-4 w-4 mr-1" /> Start viewing</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
