import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { useCollection, update, get, fullName, money, fmtDate, type Deal, type DealStatus, logActivity } from "@/lib/store";
import { useInventory, vTitle, upsertVehicle } from "@/lib/inventory";
import { useAuth, listUsers } from "@/lib/auth";

const STATUS: { key: DealStatus; label: string; cls: string }[] = [
  { key: "working", label: "Working", cls: "bg-slate-100 text-slate-800" },
  { key: "pending_approval", label: "Pending approval", cls: "bg-amber-100 text-amber-800" },
  { key: "approved", label: "Approved", cls: "bg-blue-100 text-blue-800" },
  { key: "funded", label: "Funded", cls: "bg-emerald-100 text-emerald-800" },
  { key: "delivered", label: "Delivered", cls: "bg-emerald-200 text-emerald-900" },
  { key: "dead", label: "Dead", cls: "bg-red-100 text-red-800" },
];

export default function Deals() {
  const { user, hasPermission } = useAuth();
  const deals = useCollection("deals");
  const inventory = useInventory();
  const users = listUsers();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<"active" | "all" | DealStatus>("active");
  const [open, setOpen] = useState<Deal | null>(null);
  const canApprove = hasPermission(["manager", "f_and_i"]);

  useEffect(() => { const id = params.get("open"); if (id) { const d = deals.find((x) => x.id === id); if (d) setOpen(d); setParams({}, { replace: true }); } }, [params, deals, setParams]);

  const rows = useMemo(() => deals.filter((d) => filter === "all" ? true : filter === "active" ? !["delivered", "dead"].includes(d.status) : d.status === filter), [deals, filter]);
  const setStatus = (d: Deal, status: DealStatus) => {
    update("deals", d.id, { status });
    logActivity("status", "deal", d.id, status, user?.id);
    const v = d.vehicleId ? inventory.find((x) => x.id === d.vehicleId) : undefined;
    if (v) {
      if (["approved", "funded"].includes(status) && v.status === "Available") upsertVehicle({ ...v, status: "Pending" });
      if (status === "delivered") upsertVehicle({ ...v, status: "Sold" });
      if (status === "dead" && v.status === "Pending") upsertVehicle({ ...v, status: "Available" });
    }
    if (d.customerId && status === "delivered") { /* mark lead sold */ }
    toast.success(`Deal ${STATUS.find((s) => s.key === status)?.label.toLowerCase()}`);
    setOpen((o) => (o && o.id === d.id ? { ...o, status } : o));
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Deals</h1><p className="text-muted-foreground">{rows.length} shown · {money(rows.reduce((a, d) => a + (d.totalGross || 0), 0))} gross</p></div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="all">All</SelectItem>{STATUS.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent></Select>
          <Button asChild><Link to="/desking">New deal</Link></Button>
        </div>
      </div>
      <Card><CardContent className="p-0">
        {rows.length === 0 ? <p className="p-8 text-center text-muted-foreground">No deals here yet. Desk one from a lead or from Desking.</p> : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Salesperson</th><th className="px-4 py-3 text-right">Price</th><th className="px-4 py-3 text-right">Payment</th><th className="px-4 py-3 text-right">Gross</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Updated</th><th></th></tr></thead>
            <tbody className="divide-y">
              {rows.map((d) => { const c = get("customers", d.customerId); const v = d.vehicleId ? inventory.find((x) => x.id === d.vehicleId) : undefined; const s = STATUS.find((x) => x.key === d.status)!;
                return (
                  <tr key={d.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setOpen(d)}>
                    <td className="px-4 py-3 font-semibold">{fullName(c)}</td><td className="px-4 py-3">{v ? vTitle(v) : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{users.find((u) => u.id === d.salespersonId)?.fullName ?? "—"}</td>
                    <td className="px-4 py-3 text-right">{money(d.sellingPrice)}</td><td className="px-4 py-3 text-right">{money(d.monthlyPayment)}/mo</td>
                    <td className={`px-4 py-3 text-right font-semibold ${d.totalGross < 0 ? "text-destructive" : ""}`}>{money(d.totalGross)}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className={s.cls}>{s.label}</Badge></td><td className="px-4 py-3 text-muted-foreground">{fmtDate(d.updatedAt)}</td>
                    <td className="px-4 py-3"><Button size="sm" variant="ghost" asChild onClick={(e) => e.stopPropagation()}><Link to={`/desking?deal=${d.id}`}><Pencil className="h-4 w-4" /></Link></Button></td>
                  </tr>);
              })}
            </tbody>
          </table>
        )}
      </CardContent></Card>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        {open && (() => { const c = get("customers", open.customerId); const v = open.vehicleId ? inventory.find((x) => x.id === open.vehicleId) : undefined; return (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>{fullName(c)} · {v ? vTitle(v) : "No vehicle"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <p className="text-muted-foreground">Selling price</p><p className="text-right">{money(open.sellingPrice)}</p>
              <p className="text-muted-foreground">Cash down</p><p className="text-right">{money(open.cashDown)}</p>
              <p className="text-muted-foreground">Trade allowance / ACV</p><p className="text-right">{money(open.tradeAllowance)} / {money(open.tradeAcv)}</p>
              <p className="text-muted-foreground">Amount financed</p><p className="text-right">{money(open.amountFinanced)}</p>
              <p className="text-muted-foreground">Term / APR</p><p className="text-right">{open.termMonths} mo @ {open.apr}%</p>
              <p className="text-muted-foreground font-semibold">Payment</p><p className="text-right font-semibold">{money(open.monthlyPayment)}/mo</p>
              <p className="text-muted-foreground">Front / back gross</p><p className="text-right">{money(open.frontEndGross)} / {money(open.backEndGross)}</p>
              <p className="text-muted-foreground font-semibold">Total gross</p><p className={`text-right font-semibold ${open.totalGross < 0 ? "text-destructive" : ""}`}>{money(open.totalGross)}</p>
            </div>
            <div className="flex flex-wrap gap-2 pt-3">
              <Button asChild variant="outline" size="sm"><Link to={`/desking?deal=${open.id}`}>Edit in Desking</Link></Button>
              {canApprove && open.status === "pending_approval" && <Button size="sm" onClick={() => setStatus(open, "approved")}>Approve</Button>}
              {canApprove && open.status === "approved" && <Button size="sm" onClick={() => setStatus(open, "funded")}>Mark funded</Button>}
              {open.status === "funded" && <Button size="sm" onClick={() => setStatus(open, "delivered")}>Delivered</Button>}
              {!["delivered", "dead"].includes(open.status) && <Button size="sm" variant="destructive" onClick={() => setStatus(open, "dead")}>Dead deal</Button>}
            </div>
          </DialogContent>); })()}
      </Dialog>
    </div>
  );
}
