import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { ArrowUpDown, Download, Tag, Truck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { toast } from "sonner";
import { downloadCsv, stamp } from "@/lib/csv";
import { useInventory, upsertVehicle, vTitle, vDaysInStock, type Vehicle } from "@/lib/inventory";
import { useAuth } from "@/lib/auth";
import { logActivity, money } from "@/lib/store";
import { addRecord } from "@/lib/records";

type BucketKey = "0-30" | "31-60" | "61-90" | "90+";
const BUCKETS: { key: BucketKey; label: string; min: number; max: number; color: string }[] = [
  { key: "0-30", label: "0–30 days", min: 0, max: 30, color: "hsl(var(--primary))" },
  { key: "31-60", label: "31–60 days", min: 31, max: 60, color: "hsl(var(--chart-2, 200 70% 50%))" },
  { key: "61-90", label: "61–90 days", min: 61, max: 90, color: "hsl(38 92% 50%)" },
  { key: "90+", label: "90+ days", min: 91, max: Infinity, color: "hsl(0 72% 51%)" },
];
const bucketOf = (days: number): BucketKey => (days <= 30 ? "0-30" : days <= 60 ? "31-60" : days <= 90 ? "61-90" : "90+");
const margin = (v: Vehicle) => (v.price != null && v.cost != null ? v.price - v.cost : null);
type SortKey = "days" | "price" | "cost";

export default function AgingInventory() {
  const { user, hasPermission } = useAuth();
  const canEdit = hasPermission(["manager", "inventory"]);
  const inventory = useInventory();
  const [bucket, setBucket] = useState<BucketKey | "all">("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "days", dir: -1 });
  const [pricing, setPricing] = useState<Vehicle | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [wholesaling, setWholesaling] = useState<Vehicle | null>(null);

  // Aging only applies to units still for sale (not Sold / Wholesale).
  const active = useMemo(() => inventory.filter((v) => v.status !== "Sold" && v.status !== "Wholesale"), [inventory]);

  const stats = useMemo(() => BUCKETS.map((b) => {
    const units = active.filter((v) => bucketOf(vDaysInStock(v)) === b.key);
    return { ...b, units: units.length, asking: units.reduce((a, v) => a + (v.price ?? 0), 0), cost: units.reduce((a, v) => a + (v.cost ?? 0), 0) };
  }), [active]);

  const rows = useMemo(() => {
    const list = active.filter((v) => bucket === "all" || bucketOf(vDaysInStock(v)) === bucket);
    const val = (v: Vehicle) => (sort.key === "days" ? vDaysInStock(v) : sort.key === "price" ? v.price ?? -1 : v.cost ?? -1);
    return [...list].sort((a, b) => (val(a) - val(b)) * sort.dir);
  }, [active, bucket, sort]);

  const toggleSort = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : -1 }));
  const avgDays = active.length ? Math.round(active.reduce((a, v) => a + vDaysInStock(v), 0) / active.length) : 0;

  const savePrice = async () => {
    if (!pricing) return;
    const to = Number(newPrice);
    if (!to || to <= 0) return toast.error("Enter a valid price");
    try {
      await upsertVehicle({ ...pricing, price: to });
      await addRecord("price_change", { vehicleId: pricing.id, from: pricing.price, to, by: user?.id, at: new Date().toISOString(), source: "aging" }, user?.id);
      logActivity("price_change", "vehicle", pricing.id, `${vTitle(pricing)}: ${money(pricing.price)} → ${money(to)}`, user?.id);
      toast.success("Price updated"); setPricing(null);
    } catch (e: any) { toast.error(e.message || "Could not update price"); }
  };

  const markWholesale = async () => {
    if (!wholesaling) return;
    try {
      await upsertVehicle({ ...wholesaling, status: "Wholesale" });
      logActivity("mark_wholesale", "vehicle", wholesaling.id, vTitle(wholesaling), user?.id);
      toast.success(`${vTitle(wholesaling)} moved to Wholesale`); setWholesaling(null);
    } catch (e: any) { toast.error(e.message || "Could not update"); }
  };

  const exportCsv = () => downloadCsv(`aging-${stamp()}.csv`, rows.map((v) => ({ stock: v.stockNumber, vehicle: vTitle(v), vin: v.vin, days: vDaysInStock(v), price: v.price ?? "", cost: v.cost ?? "", margin: margin(v) ?? "", status: v.status })));

  const SortBtn = ({ k, children }: { k: SortKey; children: ReactNode }) => (
    <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(k)}>{children}<ArrowUpDown className={`h-3 w-3 ${sort.key === k ? "opacity-100" : "opacity-40"}`} /></button>
  );

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Aging Inventory</h1><p className="text-muted-foreground">{active.length} units in stock · average {avgDays} days on lot</p></div>
        <Button variant="outline" onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.key} className={`cursor-pointer transition-shadow ${bucket === s.key ? "ring-2 ring-primary" : "hover:shadow-md"}`} onClick={() => setBucket(bucket === s.key ? "all" : s.key)}>
            <CardContent className="p-4">
              <p className="text-xs uppercase text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-black">{s.units} <span className="text-sm font-normal text-muted-foreground">units</span></p>
              <p className="text-xs text-muted-foreground mt-1">Asking {money(s.asking)}{s.cost ? ` · Cost ${money(s.cost)}` : ""}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {active.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">No vehicles in stock. Add units in Inventory or connect your feed in Settings → Connections, and aging will populate automatically from each unit's added date.</CardContent></Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Units per aging bucket</CardTitle><CardDescription>Counted from each vehicle's days in stock.</CardDescription></CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(val: any) => [`${val} units`, "Units"]} />
                  <Bar dataKey="units" radius={[4, 4, 0, 0]}>{stats.map((s) => <Cell key={s.key} fill={s.color} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr>
                <th className="px-4 py-3">Stock</th><th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3 text-right"><SortBtn k="days">Days</SortBtn></th>
                <th className="px-4 py-3 text-right"><SortBtn k="price">Price</SortBtn></th>
                <th className="px-4 py-3 text-right"><SortBtn k="cost">Cost</SortBtn></th>
                <th className="px-4 py-3 text-right">Margin</th><th className="px-4 py-3">Status</th>{canEdit && <th className="px-4 py-3 text-right">Actions</th>}
              </tr></thead>
              <tbody className="divide-y">
                {rows.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No units in this bucket.</td></tr>}
                {rows.map((v) => { const d = vDaysInStock(v); const m = margin(v); return (
                  <tr key={v.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2 font-mono text-xs">{v.stockNumber}</td>
                    <td className="px-4 py-2 font-semibold"><Link to={`/inventory/${v.id}`} className="hover:underline">{vTitle(v)}</Link><span className="block text-xs font-normal text-muted-foreground">{v.mileage.toLocaleString()} mi{v.exteriorColor ? ` · ${v.exteriorColor}` : ""}</span></td>
                    <td className="px-4 py-2 text-right"><Badge variant={d > 90 ? "destructive" : d > 60 ? "secondary" : "outline"}>{d}d</Badge></td>
                    <td className="px-4 py-2 text-right font-semibold">{money(v.price)}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{v.cost != null ? money(v.cost) : "—"}</td>
                    <td className={`px-4 py-2 text-right ${m != null && m < 0 ? "text-destructive" : ""}`}>{m != null ? money(m) : <span className="text-muted-foreground" title="Add a cost to see margin">—</span>}</td>
                    <td className="px-4 py-2"><Badge variant="outline">{v.status}</Badge></td>
                    {canEdit && <td className="px-4 py-2 text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => { setPricing(v); setNewPrice(v.price != null ? String(v.price) : ""); }}><Tag className="h-3.5 w-3.5 mr-1" /> Price</Button>
                      <Button size="sm" variant="ghost" onClick={() => setWholesaling(v)}><Truck className="h-3.5 w-3.5 mr-1" /> Wholesale</Button>
                    </td>}
                  </tr>
                ); })}
              </tbody>
            </table>
          </CardContent></Card>
        </>
      )}

      <Dialog open={!!pricing} onOpenChange={(o) => !o && setPricing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Change price</DialogTitle><DialogDescription>{pricing ? `${vTitle(pricing)} · currently ${money(pricing.price)} · ${vDaysInStock(pricing)} days in stock` : ""}</DialogDescription></DialogHeader>
          <div className="space-y-1"><Label>New asking price</Label><Input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} autoFocus /></div>
          {pricing && pricing.cost != null && newPrice && <p className="text-xs text-muted-foreground">Margin at this price: {money(Number(newPrice) - pricing.cost)}</p>}
          <DialogFooter><Button variant="outline" onClick={() => setPricing(null)}>Cancel</Button><Button onClick={savePrice}>Save price</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!wholesaling} onOpenChange={(o) => !o && setWholesaling(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Mark for wholesale?</AlertDialogTitle><AlertDialogDescription>{wholesaling ? `${vTitle(wholesaling)} will be removed from retail availability and appear on the Wholesale list.` : ""}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={markWholesale}>Mark for wholesale</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
