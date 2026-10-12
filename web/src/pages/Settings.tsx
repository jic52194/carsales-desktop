import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, KeyRound, Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useTenant, saveTenantOverrides, applyTenantTheme, getOnboarding, resetOnboarding, getTenantId } from "@/lib/tenant";
import { useAuth, listUsers, createUser, updateUser, setPassword, ROLE_LABELS, type Role, type User } from "@/lib/auth";
import { INTEGRATIONS } from "@/pages/Onboarding";
import { list as listRows } from "@/lib/store";
import { loadInventory } from "@/lib/inventory";

const ASSIGNABLE: Role[] = ["owner", "admin", "manager", "sales", "f_and_i", "inventory", "service", "web", "technician", "porter"];

export default function Settings() {
  const tenant = useTenant();
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const isAdmin = hasPermission(["admin"]);
  const [t, setT] = useState({ name: tenant.name, legalName: tenant.legalName ?? "", phone: tenant.phone, email: tenant.email ?? "", website: tenant.website, street: tenant.address.street, city: tenant.address.city, state: tenant.address.state, zip: tenant.address.zip, logoUrl: tenant.logoUrl, primary: tenant.colors.primary, secondary: tenant.colors.secondary, accent: tenant.colors.accent });
  const [users, setUsers] = useState<User[]>(listUsers());
  const [addOpen, setAddOpen] = useState(false);
  const [nu, setNu] = useState({ fullName: "", username: "", email: "", role: "sales" as Role, password: "" });
  const [pwFor, setPwFor] = useState<User | null>(null);
  const [pw, setPw] = useState("");
  const onboarding = getOnboarding();
  const setF = (k: keyof typeof t) => (e: any) => setT({ ...t, [k]: e.target.value });

  const saveDealer = () => {
    saveTenantOverrides({ name: t.name, legalName: t.legalName, phone: t.phone, email: t.email || null, website: t.website, address: { street: t.street, city: t.city, state: t.state, zip: t.zip }, logoUrl: t.logoUrl, colors: { primary: t.primary, secondary: t.secondary, accent: t.accent, estimated: false } });
    applyTenantTheme(); toast.success("Dealership settings saved");
  };
  const addUser = async () => {
    try {
      const u = await createUser({ ...nu, username: nu.username || nu.fullName.toLowerCase().trim().replace(/\s+/g, "."), tenantId: getTenantId(), mustChangePassword: true });
      setUsers(listUsers()); setAddOpen(false); setNu({ fullName: "", username: "", email: "", role: "sales", password: "" });
      toast.success(`${u.fullName} added — username ${u.username}. They'll set a new password on first sign-in.`);
    } catch (e: any) { toast.error(e.message); }
  };
  const resetPw = async () => { if (!pwFor) return; try { await setPassword(pwFor.id, pw); updateUser(pwFor.id, { mustChangePassword: true }); setUsers(listUsers()); toast.success("Temporary password set"); setPwFor(null); setPw(""); } catch (e: any) { toast.error(e.message); } };
  const toggleActive = (u: User) => { if (u.id === user?.id) return toast.error("You can't deactivate yourself"); updateUser(u.id, { isActive: !u.isActive }); setUsers(listUsers()); };
  const exportData = () => {
    const data = { tenant, exportedAt: new Date().toISOString(), inventory: loadInventory(), customers: listRows("customers"), leads: listRows("leads"), deals: listRows("deals"), tasks: listRows("tasks"), appointments: listRows("appointments") };
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })); a.download = `${tenant.slug}-export-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div><h1 className="text-3xl font-black">Settings</h1><p className="text-muted-foreground">{tenant.name}</p></div>
      <Tabs defaultValue="dealership">
        <TabsList><TabsTrigger value="dealership">Dealership</TabsTrigger><TabsTrigger value="branding">Branding</TabsTrigger>{isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}<TabsTrigger value="connections">Connections</TabsTrigger>{isAdmin && <TabsTrigger value="data">Data</TabsTrigger>}</TabsList>

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
          <CardContent className="p-0"><table className="w-full text-sm"><thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Username</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Last sign-in</th><th className="px-4 py-3">Active</th><th></th></tr></thead>
            <tbody className="divide-y">{users.filter((u) => u.tenantId === getTenantId() || u.role === "super_admin").map((u) => (
              <tr key={u.id}><td className="px-4 py-3 font-semibold">{u.fullName}{u.mustChangePassword && <Badge variant="outline" className="ml-2 text-[10px]">must set password</Badge>}<span className="block text-xs font-normal text-muted-foreground">{u.email}</span></td><td className="px-4 py-3 font-mono text-xs">{u.username}</td><td className="px-4 py-3"><Badge variant="secondary">{ROLE_LABELS[u.role]}</Badge></td><td className="px-4 py-3 text-muted-foreground">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "never"}</td>
                <td className="px-4 py-3"><Switch checked={u.isActive} onCheckedChange={() => toggleActive(u)} disabled={u.role === "super_admin" && user?.role !== "super_admin"} /></td>
                <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => setPwFor(u)}><KeyRound className="h-4 w-4" /></Button></td></tr>))}
            </tbody></table></CardContent></Card></TabsContent>}

        <TabsContent value="connections"><Card><CardHeader><CardTitle>Connections & integrations</CardTitle><CardDescription>What's live today and what needs an API key or the cloud backend.</CardDescription></CardHeader>
          <CardContent className="divide-y">{INTEGRATIONS.map((i) => <div key={i.name} className="py-3 flex flex-col md:flex-row md:items-center gap-2"><div className="flex-1"><p className="font-semibold">{i.name}</p><p className="text-xs text-muted-foreground">{i.need} — <span className="italic">{i.api}</span></p></div><Badge variant="outline" className={i.status === "live" ? "bg-emerald-100 text-emerald-800" : i.status === "imported-once" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}>{i.status === "live" ? "Working now" : i.status === "imported-once" ? "Imported once" : i.status === "needs-backend" ? "Needs cloud backend" : "Needs API key"}</Badge></div>)}</CardContent></Card></TabsContent>

        {isAdmin && <TabsContent value="data"><Card><CardHeader><CardTitle>Data</CardTitle><CardDescription>This build stores data on this computer. The cloud backend syncs it across every device.</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap gap-2"><Button variant="outline" onClick={exportData}><Download className="h-4 w-4 mr-1" /> Export everything (JSON)</Button></CardContent></Card></TabsContent>}
      </Tabs>

      <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogContent><DialogHeader><DialogTitle>Add user</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Full name</Label><Input value={nu.fullName} onChange={(e) => setNu({ ...nu, fullName: e.target.value })} autoFocus /></div>
          <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Username</Label><Input value={nu.username} onChange={(e) => setNu({ ...nu, username: e.target.value })} placeholder={nu.fullName.toLowerCase().trim().replace(/\s+/g, ".") || "first.last"} /></div><div className="space-y-1"><Label>Role</Label><Select value={nu.role} onValueChange={(v: Role) => setNu({ ...nu, role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ASSIGNABLE.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent></Select></div></div>
          <div className="space-y-1"><Label>Email</Label><Input value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} /></div>
          <div className="space-y-1"><Label>Temporary password</Label><Input value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} placeholder="They'll be forced to change it" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={addUser}>Add user</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!pwFor} onOpenChange={(o) => !o && setPwFor(null)}><DialogContent><DialogHeader><DialogTitle>Reset password · {pwFor?.fullName}</DialogTitle></DialogHeader>
        <div className="space-y-1"><Label>Temporary password</Label><Input value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <DialogFooter><Button variant="outline" onClick={() => setPwFor(null)}>Cancel</Button><Button onClick={resetPw}>Set & require change</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
