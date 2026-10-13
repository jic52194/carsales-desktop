import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Landmark, Phone, Mail, Filter } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/store";
import { useRecords, addRecord, updateRecord, removeRecord, type Rec } from "@/lib/records";
import { useAuth } from "@/lib/auth";

export interface Lender {
  name: string; contact: string; phone: string; email: string; programs: string;
  minScore: number | null; maxLtv: number | null; maxTerm: number | null; notes: string; active: boolean;
}
const blank = { name: "", contact: "", phone: "", email: "", programs: "", minScore: "", maxLtv: "", maxTerm: "", notes: "", active: true };

export default function Lenders() {
  const { user, hasPermission } = useAuth();
  const canEdit = hasPermission(["super_admin", "owner", "admin", "manager", "f_and_i"]);
  const lenders = useRecords<Lender>("lender");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Rec<Lender> | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [toDelete, setToDelete] = useState<Rec<Lender> | null>(null);
  const [fit, setFit] = useState({ score: "", ltv: "", term: "" });
  const [showInactive, setShowInactive] = useState(false);
  const set = (k: keyof typeof blank) => (e: any) => setForm({ ...form, [k]: typeof e === "string" || typeof e === "boolean" ? e : e.target.value });

  const filtering = !!(fit.score || fit.ltv || fit.term);
  const rows = useMemo(() => {
    const base = lenders.filter((l) => showInactive || l.data.active).sort((a, b) => a.data.name.localeCompare(b.data.name));
    if (!filtering) return base;
    const score = Number(fit.score), ltv = Number(fit.ltv), term = Number(fit.term);
    return base.filter((l) => {
      const d = l.data;
      if (fit.score && d.minScore != null && score < d.minScore) return false;
      if (fit.ltv && d.maxLtv != null && ltv > d.maxLtv) return false;
      if (fit.term && d.maxTerm != null && term > d.maxTerm) return false;
      return true;
    });
  }, [lenders, fit, filtering, showInactive]);

  const startNew = () => { setEditing(null); setForm({ ...blank }); setOpen(true); };
  const startEdit = (l: Rec<Lender>) => {
    setEditing(l);
    setForm({ name: l.data.name, contact: l.data.contact, phone: l.data.phone, email: l.data.email, programs: l.data.programs, minScore: l.data.minScore == null ? "" : String(l.data.minScore), maxLtv: l.data.maxLtv == null ? "" : String(l.data.maxLtv), maxTerm: l.data.maxTerm == null ? "" : String(l.data.maxTerm), notes: l.data.notes, active: l.data.active });
    setOpen(true);
  };
  const save = async () => {
    if (!form.name.trim()) return toast.error("Lender name is required");
    const data: Lender = { name: form.name.trim(), contact: form.contact.trim(), phone: form.phone.trim(), email: form.email.trim(), programs: form.programs.trim(), minScore: form.minScore ? Number(form.minScore) : null, maxLtv: form.maxLtv ? Number(form.maxLtv) : null, maxTerm: form.maxTerm ? Number(form.maxTerm) : null, notes: form.notes, active: form.active };
    try {
      if (editing) { await updateRecord<Lender>("lender", editing.id, data); toast.success("Lender updated"); }
      else { const r = await addRecord<Lender>("lender", data, user?.id); logActivity("create", "lender", r.id, data.name, user?.id); toast.success("Lender added"); }
      setOpen(false);
    } catch (e: any) { toast.error(e.message || "Could not save"); }
  };
  const del = async () => { if (!toDelete) return; try { await removeRecord("lender", toDelete.id); logActivity("delete", "lender", toDelete.id, toDelete.data.name, user?.id); toast.success("Lender removed"); } catch (e: any) { toast.error(e.message); } finally { setToDelete(null); } };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Lenders</h1><p className="text-muted-foreground">{lenders.filter((l) => l.data.active).length} active lender{lenders.filter((l) => l.data.active).length === 1 ? "" : "s"} in your directory</p></div>
        {canEdit && <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" /> Add lender</Button>}
      </div>

      <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Filter className="h-4 w-4" /> Which lenders fit?</CardTitle><CardDescription>Type the customer's numbers; lenders whose minimum score, max LTV or max term rule it out are hidden. Lenders with no limit set always show.</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-3 gap-3 max-w-lg">
          <div className="space-y-1"><Label>Credit score</Label><Input type="number" value={fit.score} onChange={(e) => setFit({ ...fit, score: e.target.value })} placeholder="e.g. 640" /></div>
          <div className="space-y-1"><Label>LTV %</Label><Input type="number" value={fit.ltv} onChange={(e) => setFit({ ...fit, ltv: e.target.value })} placeholder="e.g. 115" /></div>
          <div className="space-y-1"><Label>Term (mo)</Label><Input type="number" value={fit.term} onChange={(e) => setFit({ ...fit, term: e.target.value })} placeholder="e.g. 72" /></div>
        </CardContent></Card>

      <div className="flex items-center gap-2 text-sm"><Switch checked={showInactive} onCheckedChange={setShowInactive} /><span>Show inactive</span>{filtering && <Badge variant="secondary">{rows.length} fit</Badge>}</div>

      {lenders.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground"><Landmark className="h-8 w-8 mx-auto mb-2 opacity-50" />No lenders yet. Add the banks and credit unions you send paper to, with their buy-box (min score, max LTV, max term) so the fit filter can work for you.</CardContent></Card>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No lender in your directory fits those numbers. Loosen the criteria or add a subprime lender.</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {rows.map((l) => { const d = l.data; return (
            <Card key={l.id} className={d.active ? "" : "opacity-60"}><CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-bold">{d.name}</p>{d.contact && <p className="text-sm text-muted-foreground">{d.contact}</p>}</div>
                <div className="flex items-center gap-1">{!d.active && <Badge variant="outline">Inactive</Badge>}{canEdit && <><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(l)}><Pencil className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setToDelete(l)}><Trash2 className="h-3.5 w-3.5" /></Button></>}</div>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {d.phone && <a href={`tel:${d.phone}`} className="inline-flex items-center hover:underline"><Phone className="h-3 w-3 mr-1" />{d.phone}</a>}
                {d.email && <a href={`mailto:${d.email}`} className="inline-flex items-center hover:underline"><Mail className="h-3 w-3 mr-1" />{d.email}</a>}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded bg-muted p-2"><p className="text-[10px] uppercase text-muted-foreground">Min score</p><p className="font-semibold">{d.minScore ?? "—"}</p></div>
                <div className="rounded bg-muted p-2"><p className="text-[10px] uppercase text-muted-foreground">Max LTV</p><p className="font-semibold">{d.maxLtv == null ? "—" : `${d.maxLtv}%`}</p></div>
                <div className="rounded bg-muted p-2"><p className="text-[10px] uppercase text-muted-foreground">Max term</p><p className="font-semibold">{d.maxTerm == null ? "—" : `${d.maxTerm} mo`}</p></div>
              </div>
              {d.programs && <p className="text-sm whitespace-pre-wrap">{d.programs}</p>}
              {d.notes && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{d.notes}</p>}
            </CardContent></Card>); })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit lender" : "Add lender"}</DialogTitle><DialogDescription>Rates and decisions still come from the lender portal — this is your directory and buy-box reference.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2"><Label>Lender name *</Label><Input value={form.name} onChange={set("name")} /></div>
            <div className="space-y-1"><Label>Rep / contact</Label><Input value={form.contact} onChange={set("contact")} /></div>
            <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={set("phone")} /></div>
            <div className="space-y-1 col-span-2"><Label>Email</Label><Input type="email" value={form.email} onChange={set("email")} /></div>
            <div className="space-y-1"><Label>Min credit score</Label><Input type="number" value={form.minScore} onChange={set("minScore")} placeholder="Blank = no minimum" /></div>
            <div className="space-y-1"><Label>Max LTV %</Label><Input type="number" value={form.maxLtv} onChange={set("maxLtv")} placeholder="Blank = no cap" /></div>
            <div className="space-y-1"><Label>Max term (months)</Label><Input type="number" value={form.maxTerm} onChange={set("maxTerm")} placeholder="Blank = no cap" /></div>
            <div className="space-y-1 flex items-end gap-2 pb-2"><Switch checked={form.active} onCheckedChange={set("active")} /><Label>Active</Label></div>
            <div className="space-y-1 col-span-2"><Label>Programs</Label><Textarea rows={3} value={form.programs} onChange={set("programs")} placeholder="Prime/near-prime, used up to 10 yrs / 120k mi, first-time buyer…" /></div>
            <div className="space-y-1 col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={set("notes")} placeholder="Stips they always ask for, funding turnaround, who to call…" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>{editing ? "Save changes" : "Add lender"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove {toDelete?.data.name}?</AlertDialogTitle><AlertDialogDescription>Consider marking the lender inactive instead so history stays intact. Removing cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={del}>Remove</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
