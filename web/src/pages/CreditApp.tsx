import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Send, FileText } from "lucide-react";
import { toast } from "sonner";
import { useCollection, fullName, money, fmtDateTime, logActivity } from "@/lib/store";
import { useInventory, vTitle } from "@/lib/inventory";
import { useRecords, addRecord, updateRecord, type Rec } from "@/lib/records";
import { useAuth } from "@/lib/auth";

type AppStatus = "draft" | "submitted" | "approved" | "declined";
interface Person { firstName: string; lastName: string; phone: string; email: string }
interface Residence { address: string; city: string; state: string; zip: string; housing: "own" | "rent" | "family" | "other"; monthlyPayment: number; years: number }
interface Employment { employer: string; title: string; phone: string; years: number; type: "full_time" | "part_time" | "self" | "retired" | "other"; monthlyGross: number; otherIncome: number; otherSource: string }
export interface CreditApp {
  customerId: string; vehicleId?: string; status: AppStatus; applicant: Person; coApplicant: Person | null;
  residence: Residence; employment: Employment; coEmployment: Employment | null; requestedAmount: number; requestedTerm: number; downPayment: number;
  consent: boolean; consentAt?: string; takenBy?: string; notes: string;
}
const person = (): Person => ({ firstName: "", lastName: "", phone: "", email: "" });
const employment = (): Employment => ({ employer: "", title: "", phone: "", years: 0, type: "full_time", monthlyGross: 0, otherIncome: 0, otherSource: "" });
const residence = (): Residence => ({ address: "", city: "", state: "", zip: "", housing: "rent", monthlyPayment: 0, years: 0 });
const STATUS_CLS: Record<AppStatus, string> = { draft: "bg-muted text-muted-foreground", submitted: "bg-blue-100 text-blue-800", approved: "bg-emerald-100 text-emerald-800", declined: "bg-rose-100 text-rose-800" };

const num = (v: string) => Number(v) || 0;
function P({ v, on }: { v: Person; on: (p: Person) => void }) {
  return (
  <div className="grid grid-cols-2 gap-3">
    <div className="space-y-1"><Label>First name</Label><Input value={v.firstName} onChange={(e) => on({ ...v, firstName: e.target.value })} /></div>
    <div className="space-y-1"><Label>Last name</Label><Input value={v.lastName} onChange={(e) => on({ ...v, lastName: e.target.value })} /></div>
    <div className="space-y-1"><Label>Phone</Label><Input value={v.phone} onChange={(e) => on({ ...v, phone: e.target.value })} /></div>
    <div className="space-y-1"><Label>Email</Label><Input value={v.email} onChange={(e) => on({ ...v, email: e.target.value })} /></div>
  </div>
  );
}
function E({ v, on }: { v: Employment; on: (p: Employment) => void }) {
  return (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    <div className="space-y-1 col-span-2"><Label>Employer</Label><Input value={v.employer} onChange={(e) => on({ ...v, employer: e.target.value })} /></div>
    <div className="space-y-1"><Label>Title</Label><Input value={v.title} onChange={(e) => on({ ...v, title: e.target.value })} /></div>
    <div className="space-y-1"><Label>Type</Label><Select value={v.type} onValueChange={(t) => on({ ...v, type: t as Employment["type"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="full_time">Full-time</SelectItem><SelectItem value="part_time">Part-time</SelectItem><SelectItem value="self">Self-employed</SelectItem><SelectItem value="retired">Retired</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
    <div className="space-y-1"><Label>Work phone</Label><Input value={v.phone} onChange={(e) => on({ ...v, phone: e.target.value })} /></div>
    <div className="space-y-1"><Label>Years there</Label><Input type="number" value={v.years || ""} onChange={(e) => on({ ...v, years: num(e.target.value) })} /></div>
    <div className="space-y-1"><Label>Monthly gross ($)</Label><Input type="number" value={v.monthlyGross || ""} onChange={(e) => on({ ...v, monthlyGross: num(e.target.value) })} /></div>
    <div className="space-y-1"><Label>Other income ($/mo)</Label><Input type="number" value={v.otherIncome || ""} onChange={(e) => on({ ...v, otherIncome: num(e.target.value) })} /></div>
    {v.otherIncome > 0 && <div className="space-y-1 col-span-2 md:col-span-4"><Label>Other income source</Label><Input value={v.otherSource} onChange={(e) => on({ ...v, otherSource: e.target.value })} placeholder="Alimony, child support or separate maintenance need not be disclosed unless relied upon" /></div>}
  </div>
  );
}

export default function CreditAppPage() {
  const { user } = useAuth();
  const apps = useRecords<CreditApp>("credit_app");
  const customers = useCollection("customers");
  const inventory = useInventory();
  const [params] = useSearchParams();
  const [editing, setEditing] = useState<Rec<CreditApp> | null>(null);
  const [open, setOpen] = useState(() => !!params.get("customer"));
  const [filter, setFilter] = useState<"all" | AppStatus>("all");
  const blank = (): CreditApp => ({ customerId: params.get("customer") ?? "", vehicleId: params.get("vehicle") ?? undefined, status: "draft", applicant: person(), coApplicant: null, residence: residence(), employment: employment(), coEmployment: null, requestedAmount: 0, requestedTerm: 60, downPayment: 0, consent: false, notes: "" });
  const [f, setF] = useState<CreditApp>(blank);
  const rows = useMemo(() => apps.filter((a) => filter === "all" || a.data.status === filter), [apps, filter]);

  const startNew = () => { setEditing(null); setF(blank()); setOpen(true); };
  const startEdit = (r: Rec<CreditApp>) => { setEditing(r); setF({ ...blank(), ...r.data }); setOpen(true); };
  const pickCustomer = (id: string) => {
    const c = customers.find((x) => x.id === id);
    setF({ ...f, customerId: id, applicant: c ? { firstName: c.firstName, lastName: c.lastName, phone: c.phone ?? "", email: c.email ?? "" } : f.applicant, residence: c ? { ...f.residence, address: c.address ?? f.residence.address, city: c.city ?? f.residence.city, state: c.state ?? f.residence.state, zip: c.zip ?? f.residence.zip } : f.residence });
  };
  const save = async (status: AppStatus = f.status) => {
    if (!f.customerId) return toast.error("Pick a customer");
    if (!f.applicant.firstName || !f.applicant.lastName) return toast.error("Applicant name is required");
    if (!f.consent) return toast.error("The applicant must consent to a credit inquiry before saving");
    const data: CreditApp = { ...f, status, consentAt: f.consentAt ?? new Date().toISOString(), takenBy: f.takenBy ?? user?.id };
    try {
      if (editing) { await updateRecord<CreditApp>("credit_app", editing.id, data); toast.success("Application updated"); }
      else { const r = await addRecord<CreditApp>("credit_app", data, user?.id); logActivity("create", "credit_app", r.id, fullName(customers.find((c) => c.id === f.customerId)), user?.id); toast.success("Application saved"); }
      setOpen(false);
    } catch (e: any) { toast.error(e.message || "Could not save"); }
  };
  const setStatus = (r: Rec<CreditApp>, status: AppStatus) => updateRecord<CreditApp>("credit_app", r.id, { status }).then(() => logActivity("status", "credit_app", r.id, status, user?.id)).catch((e) => toast.error(e.message));
  const totalIncome = f.employment.monthlyGross + f.employment.otherIncome + (f.coEmployment ? f.coEmployment.monthlyGross + f.coEmployment.otherIncome : 0);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Credit Applications</h1><p className="text-muted-foreground">{apps.filter((a) => a.data.status === "draft").length} drafts · {apps.filter((a) => a.data.status === "submitted").length} awaiting decision</p></div>
        <Button onClick={startNew} disabled={customers.length === 0}><Plus className="h-4 w-4 mr-1" /> New application</Button>
      </div>
      {customers.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">Add a <Link className="text-primary underline" to="/customers?new=1">customer</Link> first — applications are attached to a customer.</CardContent></Card>}
      <div className="flex gap-2 flex-wrap">{(["all", "draft", "submitted", "approved", "declined"] as const).map((s) => <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} className="capitalize" onClick={() => setFilter(s)}>{s}</Button>)}</div>

      {rows.length === 0 ? (customers.length > 0 && <Card><CardContent className="p-8 text-center text-muted-foreground"><FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />No applications{filter !== "all" ? ` with status ${filter}` : ""}. Start one with the customer in front of you; sensitive identifiers (SSN, DOB, license #) are entered on the lender portal, not here.</CardContent></Card>) : (
        <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="text-left p-3">Applicant</th><th className="text-left p-3">Vehicle</th><th className="text-right p-3">Requested</th><th className="text-right p-3">Income /mo</th><th className="text-left p-3">Taken</th><th className="text-left p-3">Status</th><th className="p-3"></th></tr></thead>
          <tbody>{rows.map((r) => { const d = r.data; const v = inventory.find((x) => x.id === d.vehicleId); const inc = d.employment.monthlyGross + d.employment.otherIncome + (d.coEmployment ? d.coEmployment.monthlyGross + d.coEmployment.otherIncome : 0); return (
            <tr key={r.id} className="border-t">
              <td className="p-3"><p className="font-semibold">{d.applicant.firstName} {d.applicant.lastName}{d.coApplicant ? ` + ${d.coApplicant.firstName} ${d.coApplicant.lastName}` : ""}</p><p className="text-xs text-muted-foreground">{d.applicant.phone}</p></td>
              <td className="p-3">{v ? vTitle(v) : "—"}</td><td className="p-3 text-right">{money(d.requestedAmount)} / {d.requestedTerm} mo</td><td className="p-3 text-right">{money(inc)}</td>
              <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(r.createdAt)}</td>
              <td className="p-3"><Select value={d.status} onValueChange={(s) => setStatus(r, s as AppStatus)}><SelectTrigger className={`h-8 w-32 ${STATUS_CLS[d.status]}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="submitted">Submitted</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="declined">Declined</SelectItem></SelectContent></Select></td>
              <td className="p-3"><Button size="sm" variant="outline" onClick={() => startEdit(r)}>Open</Button></td>
            </tr>); })}</tbody></table></CardContent></Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Credit application" : "New credit application"}</DialogTitle><DialogDescription>Fill this in with the customer. SSN, date of birth and driver's license number are captured on the lender portal and are never stored in this app.</DialogDescription></DialogHeader>
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Customer *</Label><Select value={f.customerId} onValueChange={pickCustomer}><SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger><SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{fullName(c)}{c.phone ? ` · ${c.phone}` : ""}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Vehicle</Label><Select value={f.vehicleId || "none"} onValueChange={(v) => setF({ ...f, vehicleId: v === "none" ? undefined : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Not chosen yet</SelectItem>{inventory.filter((v) => v.status !== "Sold").map((v) => <SelectItem key={v.id} value={v.id}>{vTitle(v)} · #{v.stockNumber}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <section className="space-y-2"><h3 className="font-bold">Applicant</h3><P v={f.applicant} on={(p) => setF({ ...f, applicant: p })} /></section>
            <section className="space-y-2"><h3 className="font-bold">Residence</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1 col-span-2"><Label>Street</Label><Input value={f.residence.address} onChange={(e) => setF({ ...f, residence: { ...f.residence, address: e.target.value } })} /></div>
                <div className="space-y-1"><Label>City</Label><Input value={f.residence.city} onChange={(e) => setF({ ...f, residence: { ...f.residence, city: e.target.value } })} /></div>
                <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label>State</Label><Input value={f.residence.state} onChange={(e) => setF({ ...f, residence: { ...f.residence, state: e.target.value } })} /></div><div className="space-y-1"><Label>ZIP</Label><Input value={f.residence.zip} onChange={(e) => setF({ ...f, residence: { ...f.residence, zip: e.target.value } })} /></div></div>
                <div className="space-y-1"><Label>Housing</Label><Select value={f.residence.housing} onValueChange={(h) => setF({ ...f, residence: { ...f.residence, housing: h as Residence["housing"] } })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="own">Own</SelectItem><SelectItem value="rent">Rent</SelectItem><SelectItem value="family">With family</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
                <div className="space-y-1"><Label>Monthly rent/mortgage ($)</Label><Input type="number" value={f.residence.monthlyPayment || ""} onChange={(e) => setF({ ...f, residence: { ...f.residence, monthlyPayment: num(e.target.value) } })} /></div>
                <div className="space-y-1"><Label>Years at address</Label><Input type="number" value={f.residence.years || ""} onChange={(e) => setF({ ...f, residence: { ...f.residence, years: num(e.target.value) } })} /></div>
              </div></section>
            <section className="space-y-2"><h3 className="font-bold">Employment & income</h3><E v={f.employment} on={(p) => setF({ ...f, employment: p })} /></section>
            <section className="space-y-2">
              <div className="flex items-center gap-2"><Switch checked={!!f.coApplicant} onCheckedChange={(c) => setF({ ...f, coApplicant: c ? person() : null, coEmployment: c ? employment() : null })} /><h3 className="font-bold">Co-applicant</h3></div>
              {f.coApplicant && f.coEmployment && <div className="space-y-3 rounded-lg border p-3"><P v={f.coApplicant} on={(p) => setF({ ...f, coApplicant: p })} /><E v={f.coEmployment} on={(p) => setF({ ...f, coEmployment: p })} /></div>}
            </section>
            <section className="space-y-2"><h3 className="font-bold">Request</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1"><Label>Amount ($)</Label><Input type="number" value={f.requestedAmount || ""} onChange={(e) => setF({ ...f, requestedAmount: num(e.target.value) })} /></div>
                <div className="space-y-1"><Label>Term (mo)</Label><Input type="number" value={f.requestedTerm || ""} onChange={(e) => setF({ ...f, requestedTerm: num(e.target.value) })} /></div>
                <div className="space-y-1"><Label>Down ($)</Label><Input type="number" value={f.downPayment || ""} onChange={(e) => setF({ ...f, downPayment: num(e.target.value) })} /></div>
              </div>
              <p className="text-xs text-muted-foreground">Total stated household income: <b>{money(totalIncome)}/mo</b>{f.residence.monthlyPayment ? ` · housing ${money(f.residence.monthlyPayment)}/mo` : ""}</p>
            </section>
            <div className="space-y-1"><Label>Notes</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
            <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer"><Checkbox checked={f.consent} onCheckedChange={(c) => setF({ ...f, consent: !!c })} className="mt-0.5" />
              <span className="text-sm">The applicant(s) authorize the dealership and its lenders to obtain consumer credit reports and verify the information provided.{f.consentAt && <span className="block text-xs text-muted-foreground">Consent recorded {fmtDateTime(f.consentAt)}</span>}</span></label>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex-1 text-xs text-muted-foreground self-center">Submit to lender: connect RouteOne/Dealertrack in Settings → Connections.</div>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="outline" disabled><Send className="h-4 w-4 mr-1" /> Submit to lender</Button>
            <Button onClick={() => save()}>{editing ? "Save changes" : "Save application"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
