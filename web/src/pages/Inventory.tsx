import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Search, LayoutGrid, List, Loader2, Download } from "lucide-react";
import { downloadCsv, stamp } from "@/lib/csv";
import { toast } from "sonner";
import { useInventory, upsertVehicle, uploadVehiclePhotos, vTitle, vPrice, vMiles, vImage, vDaysInStock, type Vehicle } from "@/lib/inventory";
import { useAuth } from "@/lib/auth";
import { getTenantId } from "@/lib/tenant";
import { money } from "@/lib/store";

const STATUSES = ["Available", "Pending", "Sold", "Recon", "Wholesale", "Hold"];
const blank = { stockNumber: "", vin: "", year: new Date().getFullYear(), make: "", model: "", trim: "", mileage: 0, price: 0, cost: 0, exteriorColor: "", interiorColor: "", transmission: "", drivetrain: "", engine: "", fuelType: "", bodyStyle: "", status: "Available", description: "", imageUrl: "" };

export default function Inventory() {
  const { hasPermission } = useAuth();
  const inventory = useInventory();
  const canEdit = hasPermission(["manager", "inventory"]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("Available");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [sort, setSort] = useState<"newest" | "price_asc" | "price_desc" | "days">("newest");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...blank });
  const [decoding, setDecoding] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = inventory.filter((v) => (status === "all" || v.status === status) && (!s || `${vTitle(v)} ${v.stockNumber} ${v.vin} ${v.exteriorColor ?? ""}`.toLowerCase().includes(s)));
    const by: Record<string, (a: Vehicle, b: Vehicle) => number> = {
      newest: (a, b) => (b.addedAt || "").localeCompare(a.addedAt || ""), price_asc: (a, b) => (a.price ?? 1e12) - (b.price ?? 1e12), price_desc: (a, b) => (b.price ?? -1) - (a.price ?? -1), days: (a, b) => vDaysInStock(b) - vDaysInStock(a),
    };
    return [...list].sort(by[sort]);
  }, [inventory, q, status, sort]);

  const counts = useMemo(() => STATUSES.reduce<Record<string, number>>((acc, s) => { acc[s] = inventory.filter((v) => v.status === s).length; return acc; }, {}), [inventory]);
  const set = (k: keyof typeof blank) => (e: any) => setForm({ ...form, [k]: typeof e === "string" ? e : e.target.value });

  const decodeVin = async () => {
    if (form.vin.length !== 17) return toast.error("VIN must be 17 characters");
    setDecoding(true);
    try {
      const r = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${form.vin}?format=json`);
      const d = (await r.json()).Results?.[0] || {};
      setForm((f) => ({ ...f, year: parseInt(d.ModelYear) || f.year, make: d.Make ? d.Make.replace(/\b\w+/g, (w: string) => w[0] + w.slice(1).toLowerCase()) : f.make, model: d.Model || f.model, trim: d.Trim || f.trim, engine: d.DisplacementL ? `${parseFloat(d.DisplacementL).toFixed(1)}L${d.EngineCylinders ? ` ${d.EngineCylinders}-cyl` : ""}` : f.engine, drivetrain: d.DriveType?.includes("4WD") || d.DriveType?.includes("4x4") ? "4WD" : d.DriveType?.includes("AWD") ? "AWD" : d.DriveType?.includes("Front") ? "FWD" : d.DriveType?.includes("Rear") ? "RWD" : f.drivetrain, bodyStyle: d.BodyClass || f.bodyStyle, fuelType: d.FuelTypePrimary || f.fuelType, transmission: d.TransmissionStyle || f.transmission }));
      toast.success("VIN decoded");
    } catch { toast.error("VIN decode failed (offline?)"); } finally { setDecoding(false); }
  };

  const save = async () => {
    if (!form.stockNumber.trim() || !form.make.trim() || !form.model.trim()) return toast.error("Stock #, make and model are required");
    if (inventory.some((v) => v.stockNumber.toLowerCase() === form.stockNumber.trim().toLowerCase())) return toast.error("Stock number already exists");
    const v: Vehicle = {
      id: `new-${Date.now().toString(36)}`, tenantId: getTenantId(), stockNumber: form.stockNumber.trim(), vin: form.vin.trim().toUpperCase(), year: Number(form.year), make: form.make.trim(), model: form.model.trim(), trim: form.trim.trim(),
      bodyStyle: form.bodyStyle || null, mileage: Number(form.mileage) || 0, price: Number(form.price) || null, cost: Number(form.cost) || null, exteriorColor: form.exteriorColor || null, interiorColor: form.interiorColor || null,
      transmission: form.transmission || null, drivetrain: form.drivetrain || null, engine: form.engine || null, fuelType: form.fuelType || null, images: form.imageUrl ? [form.imageUrl] : [], description: form.description, features: [], status: form.status, addedAt: new Date().toISOString(), source: "manual",
    };
    try {
      const saved = await upsertVehicle(v);
      if (photoFiles.length) { try { const urls = await uploadVehiclePhotos(saved.id, photoFiles); await upsertVehicle({ ...saved, images: [...saved.images, ...urls] }); } catch (e: any) { toast.error(`Saved, but photos failed: ${e.message}`); } }
      toast.success("Vehicle added"); setOpen(false); setForm({ ...blank }); setPhotoFiles([]);
    } catch (e: any) { toast.error(e.message || "Could not save"); }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Inventory</h1><p className="text-muted-foreground">{counts.Available} available · {money(inventory.filter((v) => v.status === "Available").reduce((a, v) => a + (v.price ?? 0), 0))} at asking</p></div>
        {canEdit && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add vehicle</Button>}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Stock #, VIN, make, model" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All ({inventory.length})</SelectItem>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s} ({counts[s]})</SelectItem>)}</SelectContent></Select>
        <Select value={sort} onValueChange={(v: any) => setSort(v)}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Newest</SelectItem><SelectItem value="price_asc">Price ↑</SelectItem><SelectItem value="price_desc">Price ↓</SelectItem><SelectItem value="days">Days in stock</SelectItem></SelectContent></Select>
        <div className="ml-auto flex gap-1"><Button size="icon" variant={view === "grid" ? "default" : "outline"} onClick={() => setView("grid")}><LayoutGrid className="h-4 w-4" /></Button><Button size="icon" variant={view === "table" ? "default" : "outline"} onClick={() => setView("table")}><List className="h-4 w-4" /></Button></div>
      </div>

      {rows.length === 0 ? <Card><CardContent className="p-10 text-center text-muted-foreground">{inventory.length === 0 ? "No vehicles yet. Add one or connect your inventory feed in Settings → Connections." : "No matches."}</CardContent></Card>
      : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {rows.map((v) => (
            <Link key={v.id} to={`/inventory/${v.id}`} className="block">
              <Card className="overflow-hidden h-full hover:shadow-md transition-shadow">
                <div className="aspect-[4/3] bg-muted relative"><img data-car src={vImage(v)} alt={vTitle(v)} className="w-full h-full object-cover" loading="lazy" />
                  <Badge className="absolute top-2 left-2" variant={v.status === "Available" ? "default" : "secondary"}>{v.status}</Badge>
                  {vDaysInStock(v) > 60 && <Badge variant="destructive" className="absolute top-2 right-2">{vDaysInStock(v)}d</Badge>}
                </div>
                <CardContent className="p-4"><p className="text-xs text-muted-foreground">#{v.stockNumber} · {vMiles(v)} mi</p><h3 className="font-bold leading-tight">{vTitle(v)}</h3><p className="text-lg font-black mt-2">{vPrice(v)}</p></CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">VIN</th><th className="px-4 py-3 text-right">Miles</th><th className="px-4 py-3 text-right">Price</th><th className="px-4 py-3 text-right">Cost</th><th className="px-4 py-3 text-right">Days</th><th className="px-4 py-3">Status</th></tr></thead>
          <tbody className="divide-y">{rows.map((v) => <tr key={v.id} className="hover:bg-muted/30"><td className="px-4 py-2 font-mono text-xs">{v.stockNumber}</td><td className="px-4 py-2 font-semibold"><Link to={`/inventory/${v.id}`} className="hover:underline">{vTitle(v)}</Link><span className="block text-xs font-normal text-muted-foreground">{v.exteriorColor}</span></td><td className="px-4 py-2 font-mono text-xs">{v.vin}</td><td className="px-4 py-2 text-right">{vMiles(v)}</td><td className="px-4 py-2 text-right font-semibold">{vPrice(v)}</td><td className="px-4 py-2 text-right text-muted-foreground">{v.cost ? money(v.cost) : "—"}</td><td className="px-4 py-2 text-right">{vDaysInStock(v)}</td><td className="px-4 py-2"><Badge variant="outline">{v.status}</Badge></td></tr>)}</tbody>
        </table></CardContent></Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add vehicle</DialogTitle><DialogDescription>Enter the VIN and decode to auto-fill, or type everything in.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="space-y-1 col-span-2"><Label>VIN</Label><div className="flex gap-2"><Input value={form.vin} onChange={set("vin")} maxLength={17} className="font-mono uppercase" /><Button variant="outline" onClick={decodeVin} disabled={decoding}>{decoding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Decode"}</Button></div></div>
            <div className="space-y-1"><Label>Stock # *</Label><Input value={form.stockNumber} onChange={set("stockNumber")} /></div>
            <div className="space-y-1"><Label>Year</Label><Input type="number" value={form.year} onChange={set("year")} /></div>
            <div className="space-y-1"><Label>Make *</Label><Input value={form.make} onChange={set("make")} /></div>
            <div className="space-y-1"><Label>Model *</Label><Input value={form.model} onChange={set("model")} /></div>
            <div className="space-y-1"><Label>Trim</Label><Input value={form.trim} onChange={set("trim")} /></div>
            <div className="space-y-1"><Label>Mileage</Label><Input type="number" value={form.mileage} onChange={set("mileage")} /></div>
            <div className="space-y-1"><Label>Status</Label><Select value={form.status} onValueChange={set("status")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Asking price</Label><Input type="number" value={form.price} onChange={set("price")} /></div>
            <div className="space-y-1"><Label>Cost</Label><Input type="number" value={form.cost} onChange={set("cost")} /></div>
            <div className="space-y-1"><Label>Exterior color</Label><Input value={form.exteriorColor} onChange={set("exteriorColor")} /></div>
            <div className="space-y-1"><Label>Interior color</Label><Input value={form.interiorColor} onChange={set("interiorColor")} /></div>
            <div className="space-y-1"><Label>Transmission</Label><Input value={form.transmission} onChange={set("transmission")} /></div>
            <div className="space-y-1"><Label>Drivetrain</Label><Input value={form.drivetrain} onChange={set("drivetrain")} /></div>
            <div className="space-y-1"><Label>Engine</Label><Input value={form.engine} onChange={set("engine")} /></div>
            <div className="space-y-1"><Label>Body style</Label><Input value={form.bodyStyle} onChange={set("bodyStyle")} /></div>
            <div className="space-y-1"><Label>Fuel</Label><Input value={form.fuelType} onChange={set("fuelType")} /></div>
            <div className="space-y-1 col-span-2 md:col-span-3"><Label>Photos</Label><Input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setPhotoFiles(Array.from(e.target.files ?? []))} />{photoFiles.length > 0 && <p className="text-xs text-muted-foreground">{photoFiles.length} file{photoFiles.length === 1 ? "" : "s"} selected — uploaded after the vehicle is saved</p>}</div>
            <div className="space-y-1 col-span-2 md:col-span-3"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={set("description")} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Add vehicle</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
