import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Copy, MessageSquare, Mail, FileText, Phone } from "lucide-react";
import { toast } from "sonner";
import { useCollection, fullName, logActivity, type Customer } from "@/lib/store";
import { useInventory, vTitle, type Vehicle } from "@/lib/inventory";
import { useRecords, addRecord, updateRecord, removeRecord, type Rec } from "@/lib/records";
import { useAuth, type User } from "@/lib/auth";
import { useTenant, type Tenant } from "@/lib/tenant";

export type TemplateChannel = "sms" | "email" | "script";
export interface Template { name: string; channel: TemplateChannel; subject: string; body: string }

export const MERGE_FIELDS = ["{first_name}", "{vehicle}", "{dealer}", "{salesperson}", "{phone}"];

/** Replace merge fields with real values. Missing values become an empty string, never a fake. */
export function mergeTemplate(text: string, ctx: { customer?: Customer | null; vehicle?: Vehicle | null; tenant?: Tenant | null; user?: User | null }) {
  const map: Record<string, string> = {
    "{first_name}": ctx.customer?.firstName ?? "",
    "{vehicle}": ctx.vehicle ? vTitle(ctx.vehicle) : "",
    "{dealer}": ctx.tenant?.name ?? "",
    "{salesperson}": ctx.user?.fullName ?? "",
    "{phone}": ctx.tenant?.phone ?? "",
  };
  return text.replace(/\{(first_name|vehicle|dealer|salesperson|phone)\}/g, (m) => map[m] ?? "");
}
export const smsHref = (phone: string | undefined, body: string) => `sms:${(phone ?? "").replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(body)}`;
export const mailtoHref = (email: string | undefined, subject: string, body: string) => `mailto:${email ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

const CHANNELS: { key: TemplateChannel; label: string }[] = [{ key: "sms", label: "Text (SMS)" }, { key: "email", label: "Email" }, { key: "script", label: "Phone script" }];
const blank: Template = { name: "", channel: "sms", subject: "", body: "" };

export default function TextingTemplates() {
  const { user, hasPermission } = useAuth();
  const canEdit = hasPermission(["manager", "web", "sales"]);
  const tenant = useTenant();
  const templates = useRecords<Template>("template");
  const customers = useCollection("customers");
  const inventory = useInventory();
  const [filter, setFilter] = useState<"all" | TemplateChannel>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Rec<Template> | null>(null);
  const [form, setForm] = useState<Template>({ ...blank });
  const [toDelete, setToDelete] = useState<Rec<Template> | null>(null);
  const [selected, setSelected] = useState<Rec<Template> | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");

  const rows = useMemo(() => templates.filter((t) => filter === "all" || t.data.channel === filter).sort((a, b) => a.data.name.localeCompare(b.data.name)), [templates, filter]);
  const customer = customers.find((c) => c.id === customerId) ?? null;
  const vehicle = inventory.find((v) => v.id === vehicleId) ?? null;
  const ctx = { customer, vehicle, tenant, user };
  const merged = selected ? { subject: mergeTemplate(selected.data.subject, ctx), body: mergeTemplate(selected.data.body, ctx) } : null;

  const startNew = () => { setEditing(null); setForm({ ...blank }); setOpen(true); };
  const startEdit = (t: Rec<Template>) => { setEditing(t); setForm({ ...t.data }); setOpen(true); };
  const save = async () => {
    if (!form.name.trim() || !form.body.trim()) return toast.error("Name and body are required");
    try {
      if (editing) { await updateRecord<Template>("template", editing.id, form); toast.success("Template updated"); }
      else { const r = await addRecord<Template>("template", form, user?.id); logActivity("create", "template", r.id, form.name, user?.id); toast.success("Template saved"); }
      setOpen(false);
    } catch (e: any) { toast.error(e.message || "Could not save"); }
  };
  const del = async () => {
    if (!toDelete) return;
    try { await removeRecord("template", toDelete.id); if (selected?.id === toDelete.id) setSelected(null); toast.success("Deleted"); } catch (e: any) { toast.error(e.message); }
    setToDelete(null);
  };
  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied"); };
  const insertField = (f: string) => setForm({ ...form, body: form.body + f });
  const icon = (c: TemplateChannel) => (c === "sms" ? <MessageSquare className="h-4 w-4" /> : c === "email" ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Message Templates</h1><p className="text-muted-foreground">Reusable texts, emails and phone scripts with merge fields. Preview with a real customer, then send from your phone or email.</p></div>
        {canEdit && <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" /> New template</Button>}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "sms", "email", "script"] as const).map((k) => <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}>{k === "all" ? "All" : CHANNELS.find((c) => c.key === k)?.label}</Button>)}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-2">
          {rows.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No templates yet. {canEdit ? "Create your first one — a quick follow-up text or an appointment reminder is a good start." : "Ask a manager to add some."}
            </CardContent></Card>
          )}
          {rows.map((t) => (
            <button key={t.id} onClick={() => setSelected(t)} className={`w-full text-left rounded-lg border p-3 hover:shadow-sm transition-shadow ${selected?.id === t.id ? "border-primary bg-primary/5" : "bg-background"}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm truncate">{t.data.name}</p>
                <Badge variant="secondary" className="gap-1 shrink-0">{icon(t.data.channel)} {CHANNELS.find((c) => c.key === t.data.channel)?.label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.data.body}</p>
            </button>
          ))}
        </div>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>{selected ? `Merge fields filled from your dealership, the signed-in rep, and the customer/vehicle you choose.` : "Pick a template on the left."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selected && merged && (
              <>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Customer</Label>
                    <Select value={customerId} onValueChange={(v) => setCustomerId(v === "none" ? "" : v)}><SelectTrigger><SelectValue placeholder={customers.length ? "Choose customer" : "No customers yet"} /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{fullName(c)}{c.phone ? ` · ${c.phone}` : ""}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1"><Label>Vehicle</Label>
                    <Select value={vehicleId} onValueChange={(v) => setVehicleId(v === "none" ? "" : v)}><SelectTrigger><SelectValue placeholder={inventory.length ? "Choose vehicle" : "No inventory yet"} /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{inventory.map((v) => <SelectItem key={v.id} value={v.id}>{vTitle(v)} · #{v.stockNumber}</SelectItem>)}</SelectContent></Select></div>
                </div>
                {selected.data.channel === "email" && <div className="space-y-1"><Label>Subject</Label><p className="rounded-md border p-2 text-sm">{merged.subject || <span className="text-muted-foreground">(no subject)</span>}</p></div>}
                <div className="space-y-1"><Label>{selected.data.channel === "script" ? "Script" : "Message"}</Label><p className="rounded-md border bg-muted/40 p-3 text-sm whitespace-pre-wrap min-h-[120px]">{merged.body}</p></div>
                {!customer && <p className="text-xs text-muted-foreground">No customer chosen — {"{first_name}"} and {"{vehicle}"} are blank until you pick one.</p>}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => copy(merged.body)}><Copy className="h-4 w-4 mr-1" /> Copy</Button>
                  {selected.data.channel !== "email" && (customer?.phone
                    ? <Button asChild><a href={smsHref(customer.phone, merged.body)} onClick={() => logActivity("sms", "customer", customer.id, selected.data.name, user?.id)}><MessageSquare className="h-4 w-4 mr-1" /> Text {customer.phone}</a></Button>
                    : <Button disabled><MessageSquare className="h-4 w-4 mr-1" /> Text</Button>)}
                  {selected.data.channel !== "script" && <Button asChild variant="secondary"><a href={mailtoHref(customer?.email, merged.subject || selected.data.name, merged.body)} onClick={() => customer && logActivity("email", "customer", customer.id, selected.data.name, user?.id)}><Mail className="h-4 w-4 mr-1" /> Email{customer?.email ? ` ${customer.email}` : ""}</a></Button>}
                  {canEdit && <><Button variant="ghost" size="icon" onClick={() => startEdit(selected)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setToDelete(selected)}><Trash2 className="h-4 w-4 text-destructive" /></Button></>}
                </div>
                {customer && !customer.phone && selected.data.channel === "sms" && <p className="text-xs text-amber-700">{fullName(customer)} has no phone on file.</p>}
                <p className="text-xs text-muted-foreground">Text and Email open your phone's messaging app or your mail client. Sending straight from the app arrives once GoHighLevel is connected in Settings → Connections.</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit template" : "New template"}</DialogTitle><DialogDescription>Merge fields are replaced with real values when you preview or send.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Quick follow-up" /></div>
              <div className="space-y-1"><Label>Channel</Label><Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v as TemplateChannel })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CHANNELS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            {form.channel === "email" && <div className="space-y-1"><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Still thinking about the {vehicle}?" /></div>}
            <div className="space-y-1"><Label>Body *</Label><Textarea rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Hi {first_name}, it's {salesperson} at {dealer}. The {vehicle} is still here — want to come by today? {phone}" /></div>
            <div className="flex flex-wrap gap-1">{MERGE_FIELDS.map((f) => <Button key={f} type="button" size="sm" variant="outline" className="h-7 text-xs font-mono" onClick={() => insertField(f)}>{f}</Button>)}</div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>{editing ? "Save" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete "{toDelete?.data.name}"?</AlertDialogTitle><AlertDialogDescription>Campaigns and BDC scripts that use this template will lose it.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={del}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
