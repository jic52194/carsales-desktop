import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ShieldCheck, AlertTriangle, CheckCircle2, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { useCollection, fullName, fmtDateTime, fmtDate, logActivity, type Deal } from "@/lib/store";
import { useInventory, vTitle } from "@/lib/inventory";
import { useRecords, addRecord, updateRecord, type Rec } from "@/lib/records";
import { useAuth, useUsers } from "@/lib/auth";

type ItemKey = "ofac" | "privacy_notice" | "risk_based_pricing" | "adverse_action" | "red_flags" | "menu_presented";
export interface ComplianceItem { dealId: string; key: ItemKey; done: boolean; by?: string; at?: string; note?: string }
const ITEMS: { key: ItemKey; label: string; hint: string; when: (d: Deal) => boolean }[] = [
  { key: "ofac", label: "OFAC / SDN check", hint: "Screen the buyer (and co-buyer) against the Treasury SDN list before delivery.", when: () => true },
  { key: "red_flags", label: "Red Flags identity verification", hint: "Government ID inspected and matched to the applicant; discrepancies resolved.", when: () => true },
  { key: "privacy_notice", label: "Privacy notice delivered", hint: "GLBA privacy notice given to the customer.", when: () => true },
  { key: "risk_based_pricing", label: "Risk-based pricing / credit score notice", hint: "Required on every financed deal where a credit report was pulled.", when: (d) => d.amountFinanced > 0 || d.apr > 0 },
  { key: "menu_presented", label: "F&I menu presented", hint: "Products offered on a menu with the base payment shown; customer selections recorded.", when: (d) => d.amountFinanced > 0 || d.apr > 0 },
  { key: "adverse_action", label: "Adverse action notice (if declined)", hint: "Sent within 30 days when credit was denied or terms changed. Mark N/A by leaving unchecked only if no application was declined.", when: (d) => d.status === "dead" },
];
const ACTIVE: Deal["status"][] = ["working", "pending_approval", "approved", "funded", "delivered"];

export default function Compliance() {
  const { user } = useAuth();
  const users = useUsers();
  const [params, setParams] = useSearchParams();
  const deals = useCollection("deals");
  const customers = useCollection("customers");
  const inventory = useInventory();
  const items = useRecords<ComplianceItem>("compliance_item");
  const dealId = params.get("deal") ?? "";
  const [q, setQ] = useState("");

  const label = (d: Deal) => { const c = customers.find((x) => x.id === d.customerId); const v = inventory.find((x) => x.id === d.vehicleId); return `${fullName(c)} · ${v ? vTitle(v) : "no vehicle"}`; };
  const required = (d: Deal) => ITEMS.filter((i) => i.when(d) && i.key !== "adverse_action");
  const doneFor = (d: Deal) => new Set(items.filter((i) => i.data.dealId === d.id && i.data.done).map((i) => i.data.key));

  const summary = useMemo(() => deals.filter((d) => ACTIVE.includes(d.status)).map((d) => { const req = required(d); const done = doneFor(d); const missing = req.filter((i) => !done.has(i.key)); return { deal: d, req, missing }; }).sort((a, b) => b.missing.length - a.missing.length || b.deal.updatedAt.localeCompare(a.deal.updatedAt)), [deals, items, customers, inventory]);
  const atRisk = summary.filter((s) => s.missing.length > 0);
  const delivering = atRisk.filter((s) => ["funded", "delivered"].includes(s.deal.status));
  const deal = deals.find((d) => d.id === dealId);
  const pick = (id: string) => { if (id) params.set("deal", id); else params.delete("deal"); setParams(params, { replace: true }); };

  const toggle = async (d: Deal, key: ItemKey, done: boolean) => {
    const existing = items.find((i) => i.data.dealId === d.id && i.data.key === key);
    const patch = { done, by: done ? user?.id : undefined, at: done ? new Date().toISOString() : undefined };
    try {
      if (existing) await updateRecord<ComplianceItem>("compliance_item", existing.id, patch);
      else await addRecord<ComplianceItem>("compliance_item", { dealId: d.id, key, ...patch }, user?.id);
      if (done) logActivity("compliance", "deal", d.id, key, user?.id);
    } catch (e: any) { toast.error(e.message || "Could not save"); }
  };
  const setNote = (d: Deal, key: ItemKey, note: string) => {
    const existing = items.find((i) => i.data.dealId === d.id && i.data.key === key);
    if (existing ? existing.data.note === note : !note) return;
    (existing ? updateRecord<ComplianceItem>("compliance_item", existing.id, { note }) : addRecord<ComplianceItem>("compliance_item", { dealId: d.id, key, done: false, note }, user?.id)).catch((e) => toast.error(e.message));
  };

  const list = summary.filter((s) => !q || label(s.deal).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div><h1 className="text-3xl font-black">Compliance</h1><p className="text-muted-foreground">Per-deal checklist and a store-wide view of what's missing</p></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[{ label: "Active deals", val: summary.length, icon: FolderOpen, cls: "" }, { label: "Fully compliant", val: summary.length - atRisk.length, icon: CheckCircle2, cls: "text-emerald-600" }, { label: "Missing items", val: atRisk.length, icon: AlertTriangle, cls: atRisk.length ? "text-amber-600" : "" }, { label: "Funded/delivered with gaps", val: delivering.length, icon: ShieldCheck, cls: delivering.length ? "text-rose-600" : "" }].map((s) => (
          <Card key={s.label}><CardContent className="p-4"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{s.label}</p><s.icon className={`h-4 w-4 ${s.cls}`} /></div><p className={`text-2xl font-black ${s.cls}`}>{s.val}</p></CardContent></Card>))}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Deal checklist</CardTitle><CardDescription>Pick a deal and tick each item as it is completed. Who and when are recorded automatically.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <Select value={dealId || "none"} onValueChange={(v) => pick(v === "none" ? "" : v)}><SelectTrigger className="md:w-[480px]"><SelectValue placeholder="Select a deal" /></SelectTrigger><SelectContent><SelectItem value="none">Select a deal…</SelectItem>{deals.filter((d) => d.status !== "dead" || d.id === dealId).map((d) => <SelectItem key={d.id} value={d.id}>{label(d)} · {d.status.replace("_", " ")}</SelectItem>)}</SelectContent></Select>
          {!deal ? <p className="text-sm text-muted-foreground">{deals.length ? "Choose a deal above, or open one from the summary below." : <>No deals yet — compliance items attach to deals desked in <Link to="/desking" className="text-primary underline">Desking</Link>.</>}</p> : (
            <div className="space-y-2">
              {ITEMS.filter((i) => i.when(deal) || items.some((x) => x.data.dealId === deal.id && x.data.key === i.key && x.data.done)).map((i) => { const rec = items.find((x) => x.data.dealId === deal.id && x.data.key === i.key); const done = !!rec?.data.done; return (
                <div key={i.key} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border p-3">
                  <label className="flex items-start gap-3 flex-1 cursor-pointer"><Checkbox checked={done} onCheckedChange={(c) => toggle(deal, i.key, !!c)} className="mt-0.5" />
                    <span><span className={`font-medium ${done ? "line-through text-muted-foreground" : ""}`}>{i.label}</span><span className="block text-xs text-muted-foreground">{done && rec?.data.at ? `Done ${fmtDateTime(rec.data.at)} by ${users.find((u) => u.id === rec.data.by)?.fullName || "—"}` : i.hint}</span></span></label>
                  <Input className="h-8 sm:w-56" placeholder="Note / reference #" defaultValue={rec?.data.note ?? ""} onBlur={(e) => setNote(deal, i.key, e.target.value)} />
                </div>); })}
              <div className="flex gap-2 pt-1"><Button asChild variant="outline" size="sm"><Link to={`/deals/${deal.id}/jacket`}>Deal jacket</Link></Button><Button asChild variant="outline" size="sm"><Link to={`/desking?deal=${deal.id}`}>Desking</Link></Button></div>
              <p className="text-xs text-muted-foreground">OFAC screening itself happens on your lender portal or a screening vendor — record the result here. Connect a screening provider in Settings → Connections to automate it.</p>
            </div>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between flex-wrap gap-2"><div><CardTitle className="text-base">Store summary</CardTitle><CardDescription>Active deals, most gaps first. Adverse-action notices are tracked on dead deals from the checklist above.</CardDescription></div><Input className="h-8 w-48" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {list.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No active deals{q ? " match" : ""}.</p> : (
            <table className="w-full text-sm"><thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="text-left p-3">Deal</th><th className="text-left p-3">Status</th><th className="text-left p-3">Updated</th><th className="text-left p-3">Missing</th><th className="p-3"></th></tr></thead>
              <tbody>{list.map(({ deal: d, req, missing }) => (
                <tr key={d.id} className="border-t">
                  <td className="p-3 font-medium">{label(d)}</td>
                  <td className="p-3 capitalize whitespace-nowrap">{d.status.replace("_", " ")}</td>
                  <td className="p-3 whitespace-nowrap text-muted-foreground">{fmtDate(d.updatedAt)}</td>
                  <td className="p-3">{missing.length === 0 ? <Badge className="bg-emerald-100 text-emerald-800">Complete ({req.length}/{req.length})</Badge> : <div className="flex flex-wrap gap-1">{missing.map((m) => <Badge key={m.key} variant="outline" className={["funded", "delivered"].includes(d.status) ? "border-rose-300 text-rose-700" : "border-amber-300 text-amber-700"}>{m.label}</Badge>)}</div>}</td>
                  <td className="p-3"><Button size="sm" variant="outline" onClick={() => pick(d.id)}>Open</Button></td>
                </tr>))}</tbody></table>)}
        </CardContent>
      </Card>
    </div>
  );
}
