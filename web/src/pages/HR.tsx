import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Users, Download, Pencil } from "lucide-react";
import { toast } from "sonner";
import { fmtDate, logActivity } from "@/lib/store";
import { useRecords, addRecord, updateRecord } from "@/lib/records";
import { useAuth, useUsers, ROLE_LABELS, type User } from "@/lib/auth";
import { downloadCsv, stamp } from "@/lib/csv";

/** Employee file keyed by profile id — records kind "hr_employee". No pay data lives here. */
export interface HrEmployee { userId: string; title: string; hireDate: string; phone: string; emergencyName: string; emergencyPhone: string; notes: string; docs: { i9: boolean; w4: boolean; handbook: boolean; license: boolean } }

const DOCS: { key: keyof HrEmployee["docs"]; label: string }[] = [{ key: "i9", label: "I-9" }, { key: "w4", label: "W-4" }, { key: "handbook", label: "Handbook signed" }, { key: "license", label: "License on file" }];
const EMPTY = { title: "", hireDate: "", phone: "", emergencyName: "", emergencyPhone: "", notes: "", docs: { i9: false, w4: false, handbook: false, license: false } };
const tenure = (hire: string) => { if (!hire) return "—"; const m = Math.floor((Date.now() - new Date(hire + "T00:00:00").getTime()) / (30.44 * 86400e3)); return m < 12 ? `${m} mo` : `${Math.floor(m / 12)} yr ${m % 12} mo`; };

export default function HR() {
  const { user, hasPermission } = useAuth();
  const users = useUsers();
  const files = useRecords<HrEmployee>("hr_employee");
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(EMPTY);

  const fileFor = (id: string) => files.find((f) => f.data.userId === id);
  const rows = useMemo(() => { const s = q.trim().toLowerCase(); return users.filter((u) => (showInactive || u.isActive) && (!s || u.fullName.toLowerCase().includes(s) || u.username.includes(s) || (fileFor(u.id)?.data.title ?? "").toLowerCase().includes(s))).sort((a, b) => a.fullName.localeCompare(b.fullName)); }, [users, files, q, showInactive]);
  if (!hasPermission(["admin"])) return <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center"><h2 className="text-2xl font-bold mb-2">Admins only</h2><p className="text-muted-foreground max-w-md">Employee files are restricted to owners and admins.</p></div>;

  const docsDone = (f?: HrEmployee) => (f ? DOCS.filter((d) => f.docs?.[d.key]).length : 0);
  const incomplete = users.filter((u) => u.isActive && docsDone(fileFor(u.id)?.data) < DOCS.length).length;

  const openEdit = (u: User) => { const f = fileFor(u.id)?.data; setEditing(u); setForm(f ? { title: f.title ?? "", hireDate: f.hireDate ?? "", phone: f.phone ?? "", emergencyName: f.emergencyName ?? "", emergencyPhone: f.emergencyPhone ?? "", notes: f.notes ?? "", docs: { ...EMPTY.docs, ...(f.docs ?? {}) } } : EMPTY); };
  const save = async () => {
    if (!editing) return; const existing = fileFor(editing.id);
    try {
      if (existing) await updateRecord<HrEmployee>("hr_employee", existing.id, { ...form }); else await addRecord<HrEmployee>("hr_employee", { userId: editing.id, ...form }, user?.id);
      logActivity("hr_file_updated", "user", editing.id, editing.fullName, user?.id); toast.success("Employee file saved"); setEditing(null);
    } catch (e: any) { toast.error(e.message || "Could not save"); }
  };
  const exportCsv = () => downloadCsv(`staff-directory-${stamp()}`, rows.map((u) => { const f = fileFor(u.id)?.data; return { name: u.fullName, username: u.username, role: ROLE_LABELS[u.role], title: f?.title ?? "", hireDate: f?.hireDate ?? "", phone: f?.phone ?? "", email: u.email ?? "", emergencyContact: f?.emergencyName ?? "", emergencyPhone: f?.emergencyPhone ?? "", docsComplete: `${docsDone(f)}/${DOCS.length}`, active: u.isActive ? "yes" : "no" }; }));

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">HR & Staff Directory</h1><p className="text-muted-foreground">{users.filter((u) => u.isActive).length} active staff · {incomplete} with onboarding documents outstanding</p></div>
        <Button variant="outline" onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4 mr-1" /> CSV</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Search name, username, title…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={showInactive} onCheckedChange={(c) => setShowInactive(!!c)} /> Show deactivated</label>
      </div>

      {rows.length === 0 ? <Card><CardContent className="p-10 text-center text-muted-foreground"><Users className="h-8 w-8 mx-auto mb-2 opacity-40" />{users.length === 0 ? "No staff accounts yet. Add users in Settings → Users; their employee files live here." : "No staff match."}</CardContent></Card> : (
        <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase"><tr><th className="text-left p-3">Name</th><th className="text-left p-3">Role / title</th><th className="text-left p-3">Hired</th><th className="text-left p-3">Phone</th><th className="text-left p-3">Emergency contact</th><th className="text-left p-3">Documents</th><th className="p-3"></th></tr></thead>
          <tbody className="divide-y">{rows.map((u) => { const f = fileFor(u.id)?.data; const n = docsDone(f); return (
            <tr key={u.id} className={!u.isActive ? "opacity-60" : ""}>
              <td className="p-3 font-medium">{u.fullName}<span className="block text-xs text-muted-foreground font-normal">@{u.username}{u.email ? ` · ${u.email}` : ""}</span></td>
              <td className="p-3">{ROLE_LABELS[u.role]}{f?.title && <span className="block text-xs text-muted-foreground">{f.title}</span>}</td>
              <td className="p-3 whitespace-nowrap">{f?.hireDate ? <>{fmtDate(f.hireDate)}<span className="block text-xs text-muted-foreground">{tenure(f.hireDate)}</span></> : "—"}</td>
              <td className="p-3">{f?.phone || "—"}</td>
              <td className="p-3">{f?.emergencyName ? <>{f.emergencyName}<span className="block text-xs text-muted-foreground">{f.emergencyPhone}</span></> : "—"}</td>
              <td className="p-3"><Badge variant={n === DOCS.length ? "secondary" : "outline"} className={n < DOCS.length ? "border-amber-400 text-amber-700" : ""}>{n}/{DOCS.length}</Badge>{!u.isActive && <Badge variant="outline" className="ml-1">Deactivated</Badge>}</td>
              <td className="p-3 text-right"><Button size="sm" variant="outline" className="h-7 px-2" onClick={() => openEdit(u)}><Pencil className="h-3.5 w-3.5 mr-1" /> {f ? "Edit" : "Create file"}</Button></td>
            </tr>); })}</tbody>
        </table></CardContent></Card>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.fullName}</DialogTitle><DialogDescription>{editing && ROLE_LABELS[editing.role]} · login and role are managed in Settings → Users. Pay is not stored here.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Senior Sales Consultant" /></div>
            <div className="space-y-1"><Label>Hire date</Label><Input type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} /></div>
            <div className="space-y-1 col-span-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1"><Label>Emergency contact</Label><Input value={form.emergencyName} onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} /></div>
            <div className="space-y-1"><Label>Emergency phone</Label><Input value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} /></div>
            <div className="space-y-2 col-span-2"><Label>Onboarding documents</Label>
              <div className="grid grid-cols-2 gap-2">{DOCS.map((d) => <label key={d.key} className="flex items-center gap-2 text-sm rounded-md border p-2"><Checkbox checked={form.docs[d.key]} onCheckedChange={(c) => setForm({ ...form, docs: { ...form.docs, [d.key]: !!c } })} /> {d.label}</label>)}</div>
            </div>
            <div className="space-y-1 col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Certifications, schedule, reviews…" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
