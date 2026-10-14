import { useMemo, useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Phone, Mail, Pencil, Kanban, Download } from "lucide-react";
import { downloadCsv, stamp } from "@/lib/csv";
import { toast } from "sonner";
import { useCollection, insert, update, fullName, fmtDate, type Customer, logActivity } from "@/lib/store";
import { useAuth } from "@/lib/auth";

const SOURCES = ["Walk-in", "Phone", "Website", "Referral", "Facebook", "CarGurus", "Cars.com", "AutoTrader", "Repeat", "Other"];
const empty = { firstName: "", lastName: "", phone: "", email: "", address: "", city: "", state: "MA", zip: "", source: "Walk-in", notes: "" };

export default function Customers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const customers = useCollection("customers");
  const leads = useCollection("leads");
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ ...empty });

  useEffect(() => {
    if (params.get("new")) { setForm({ ...empty }); setEditing(null); setOpen(true); params.delete("new"); setParams(params, { replace: true }); }
    const e = params.get("edit"); const c = e ? customers.find((x) => x.id === e) : undefined;
    if (c) { setEditing(c); setForm({ ...empty, ...c } as any); setOpen(true); params.delete("edit"); setParams(params, { replace: true }); }
  }, [params, setParams, customers]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return customers.filter((c) => !s || `${c.firstName} ${c.lastName} ${c.phone ?? ""} ${c.email ?? ""}`.toLowerCase().includes(s));
  }, [customers, q]);

  const openEdit = (c: Customer) => { setEditing(c); setForm({ ...empty, ...c } as any); setOpen(true); };
  const save = async () => {
    if (!form.firstName.trim()) return toast.error("First name is required");
    try {
      if (editing) { await update("customers", editing.id, form as any); toast.success("Customer updated"); logActivity("update", "customer", editing.id, undefined, user?.id); }
      else { const c = await insert("customers", { ...form, ownerId: user?.id } as any); toast.success("Customer added"); logActivity("create", "customer", c.id, undefined, user?.id); }
      setOpen(false);
    } catch (e: any) { toast.error(e.message || "Could not save"); }
  };
  const set = (k: keyof typeof empty) => (e: any) => setForm({ ...form, [k]: typeof e === "string" ? e : e.target.value });

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Customers</h1><p className="text-muted-foreground">{customers.length} on file</p></div>
        <div className="flex flex-wrap gap-2">
          <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search name, phone, email" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <Button variant="outline" onClick={() => downloadCsv(`customers-${stamp()}`, customers.map((c) => ({ first_name: c.firstName, last_name: c.lastName, phone: c.phone, email: c.email, source: c.source, created: c.createdAt })))}><Download className="h-4 w-4 mr-1" /> Export</Button>
          <Button onClick={() => { setEditing(null); setForm({ ...empty }); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Add customer</Button>
        </div>
      </div>

      {customers.length === 0 ? (
        <Card><CardContent className="p-10 text-center space-y-3">
          <p className="text-lg font-semibold">No customers yet</p>
          <p className="text-muted-foreground">Add your first customer, or import a list later from your DMS / website leads.</p>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add customer</Button>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Open leads</th><th className="px-4 py-3">Added</th><th className="px-4 py-3"></th></tr></thead>
            <tbody className="divide-y">
              {rows.map((c) => {
                const open = leads.filter((l) => l.customerId === c.id && !["sold", "lost"].includes(l.stage)).length;
                return (
                  <tr key={c.id} className="hover:bg-muted/30 cursor-pointer" onClick={(e) => { if (!(e.target as HTMLElement).closest("a,button")) navigate(`/customers/${c.id}`); }}>
                    <td className="px-4 py-3 font-semibold"><Link to={`/customers/${c.id}`} className="hover:text-primary hover:underline">{fullName(c)}</Link>{c.city && <span className="block text-xs font-normal text-muted-foreground">{c.city}, {c.state}</span>}</td>
                    <td className="px-4 py-3 text-muted-foreground"><div className="flex flex-col gap-0.5">{c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-1 hover:text-primary w-fit"><Phone className="h-3 w-3" />{c.phone}</a>}{c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-1 hover:text-primary w-fit"><Mail className="h-3 w-3" />{c.email}</a>}</div></td>
                    <td className="px-4 py-3"><Badge variant="outline">{c.source || "—"}</Badge></td>
                    <td className="px-4 py-3">{open ? <Badge variant="secondary">{open}</Badge> : <span className="text-muted-foreground">0</span>}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(c.createdAt)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" asChild title="Start a lead for this customer" aria-label="New lead"><Link to={`/leads?customer=${c.id}`}><Kanban className="h-4 w-4" /></Link></Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(c)} title="Edit customer" aria-label="Edit customer"><Pencil className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No matches.</td></tr>}
            </tbody>
          </table>
        </CardContent></Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit customer" : "New customer"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>First name *</Label><Input value={form.firstName} onChange={set("firstName")} autoFocus /></div>
            <div className="space-y-1"><Label>Last name</Label><Input value={form.lastName} onChange={set("lastName")} /></div>
            <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={set("phone")} placeholder="978-555-0100" /></div>
            <div className="space-y-1"><Label>Email</Label><Input value={form.email} onChange={set("email")} /></div>
            <div className="space-y-1 col-span-2"><Label>Street</Label><Input value={form.address} onChange={set("address")} /></div>
            <div className="space-y-1"><Label>City</Label><Input value={form.city} onChange={set("city")} /></div>
            <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label>State</Label><Input value={form.state} onChange={set("state")} /></div><div className="space-y-1"><Label>ZIP</Label><Input value={form.zip} onChange={set("zip")} /></div></div>
            <div className="space-y-1 col-span-2"><Label>Source</Label>
              <Select value={form.source} onValueChange={set("source")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1 col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={set("notes")} rows={3} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>{editing ? "Save" : "Add customer"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
