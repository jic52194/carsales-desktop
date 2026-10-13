import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Calculator, Calendar, Pencil, ExternalLink, ChevronLeft, ChevronRight, Upload, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getVehicle, upsertVehicle, uploadVehiclePhotos, vTitle, vPrice, vDaysInStock, PLACEHOLDER_IMG, useInventory, type Vehicle } from "@/lib/inventory";
import { useCollection, get, fullName, money } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { carfaxUrl } from "@/lib/integrations";

const STATUSES = ["Available", "Pending", "Sold", "Recon", "Wholesale", "Hold"];

export default function VDP() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  useInventory(); // subscribe
  const v = id ? getVehicle(id) : undefined;
  const leads = useCollection("leads").filter((l) => l.vehicleId === id);
  const deals = useCollection("deals").filter((d) => d.vehicleId === id);
  const [i, setI] = useState(0);
  const [edit, setEdit] = useState<Vehicle | null>(null);
  const [uploading, setUploading] = useState(false);
  const onUpload = async (files: FileList | null) => { if (!files || !edit) return; setUploading(true); try { const urls = await uploadVehiclePhotos(edit.id, files); setEdit({ ...edit, images: [...edit.images, ...urls] }); toast.success(`${urls.length} photo${urls.length === 1 ? "" : "s"} uploaded`); } catch (e: any) { toast.error(e.message); } finally { setUploading(false); } };
  const canEdit = hasPermission(["manager", "inventory"]);

  if (!v) return <div className="p-8"><Button variant="ghost" onClick={() => navigate("/inventory")}><ArrowLeft className="h-4 w-4 mr-1" /> Inventory</Button><p className="mt-6 text-muted-foreground">Vehicle not found.</p></div>;
  const imgs = v.images.length ? v.images : [PLACEHOLDER_IMG];
  const spec = (l: string, val?: string | number | null) => <div><p className="text-xs text-muted-foreground">{l}</p><p className="font-semibold">{val || "—"}</p></div>;
  const saveEdit = async () => { if (!edit) return; try { await upsertVehicle({ ...edit, price: edit.price === null || isNaN(Number(edit.price)) ? null : Number(edit.price), cost: edit.cost == null || isNaN(Number(edit.cost)) ? null : Number(edit.cost), mileage: Number(edit.mileage) || 0 }); toast.success("Saved"); setEdit(null); } catch (e: any) { toast.error(e.message || "Could not save"); } };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div><div className="flex items-center gap-2"><Badge variant="outline" className="font-mono">#{v.stockNumber}</Badge><Badge variant={v.status === "Available" ? "default" : "secondary"}>{v.status}</Badge><span className="text-xs text-muted-foreground">{vDaysInStock(v)} days in stock</span></div><h1 className="text-2xl md:text-3xl font-black">{vTitle(v)}</h1></div>
        </div>
        <div className="flex gap-2">
          {canEdit && <Button variant="outline" onClick={() => setEdit({ ...v })}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>}
          <Button variant="outline" asChild><Link to={`/appointments?vehicle=${v.id}&customer=`}><Calendar className="h-4 w-4 mr-1" /> Test drive</Link></Button>
          <Button asChild><Link to={`/desking?vehicle=${v.id}`}><Calculator className="h-4 w-4 mr-1" /> Desk a deal</Link></Button>
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden"><div className="relative aspect-[16/10] bg-muted"><img src={imgs[i]} alt={vTitle(v)} className="w-full h-full object-cover" />
            {imgs.length > 1 && <><Button size="icon" variant="secondary" className="absolute left-2 top-1/2 -translate-y-1/2" onClick={() => setI((i - 1 + imgs.length) % imgs.length)}><ChevronLeft /></Button><Button size="icon" variant="secondary" className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setI((i + 1) % imgs.length)}><ChevronRight /></Button><span className="absolute bottom-2 right-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded">{i + 1}/{imgs.length}</span></>}
          </div></Card>
          <Card><CardHeader><CardTitle className="text-base">Specifications</CardTitle></CardHeader><CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {spec("Mileage", v.mileage.toLocaleString())}{spec("VIN", v.vin)}{spec("Exterior", v.exteriorColor)}{spec("Interior", v.interiorColor)}{spec("Engine", v.engine)}{spec("Transmission", v.transmission)}{spec("Drivetrain", v.drivetrain)}{spec("Body", v.bodyStyle)}{spec("Fuel", v.fuelType)}{spec("MPG", v.mpg)}
          </CardContent></Card>
          {v.description && <Card><CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader><CardContent className="text-sm whitespace-pre-wrap">{v.description}</CardContent></Card>}
          {v.features.length > 0 && <Card><CardHeader><CardTitle className="text-base">Features</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-1.5">{v.features.map((f) => <Badge key={f} variant="outline">{f}</Badge>)}</CardContent></Card>}
        </div>
        <div className="space-y-6">
          <Card><CardContent className="p-5 space-y-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Asking price</p><p className="text-4xl font-black">{vPrice(v)}</p>
            {canEdit && <p className="text-sm text-muted-foreground">Cost {v.cost ? money(v.cost) : "— not entered"}{v.cost && v.price ? ` · potential front gross ${money(v.price - v.cost)}` : ""}</p>}
            <div className="flex flex-col gap-1">
              {v.vin && <a className="text-xs text-primary inline-flex items-center gap-1" href={carfaxUrl(v.vin)} target="_blank" rel="noreferrer">CARFAX report <ExternalLink className="h-3 w-3" /></a>}
              {v.sourceUrl && <a className="text-xs text-primary inline-flex items-center gap-1" href={v.sourceUrl} target="_blank" rel="noreferrer">View on dealer website <ExternalLink className="h-3 w-3" /></a>}
            </div>
          </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Activity</CardTitle></CardHeader><CardContent className="text-sm space-y-2">
            <p>{leads.length} lead{leads.length === 1 ? "" : "s"} · {deals.length} deal{deals.length === 1 ? "" : "s"}</p>
            {leads.slice(0, 5).map((l) => <div key={l.id} className="flex justify-between"><span>{fullName(get("customers", l.customerId))}</span><Badge variant="secondary" className="capitalize">{l.stage}</Badge></div>)}
            {deals.slice(0, 5).map((d) => <div key={d.id} className="flex justify-between"><Link to={`/deals?open=${d.id}`} className="hover:underline">{fullName(get("customers", d.customerId))}</Link><span className="capitalize text-muted-foreground">{d.status.replace("_", " ")}</span></div>)}
            {leads.length + deals.length === 0 && <p className="text-muted-foreground">No activity on this unit yet.</p>}
          </CardContent></Card>
          <Card><CardContent className="p-5 text-xs text-muted-foreground"><p>Added {new Date(v.addedAt || Date.now()).toLocaleDateString()}</p>{v.source && <p>Source: {v.source}</p>}</CardContent></Card>
        </div>
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        {edit && <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Edit {vTitle(edit)}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Asking price</Label><Input type="number" value={edit.price ?? ""} onChange={(e) => setEdit({ ...edit, price: e.target.value === "" ? null : Number(e.target.value) })} /></div>
            <div className="space-y-1"><Label>Cost</Label><Input type="number" value={edit.cost ?? ""} onChange={(e) => setEdit({ ...edit, cost: e.target.value === "" ? null : Number(e.target.value) })} /></div>
            <div className="space-y-1"><Label>Mileage</Label><Input type="number" value={edit.mileage} onChange={(e) => setEdit({ ...edit, mileage: Number(e.target.value) })} /></div>
            <div className="space-y-1"><Label>Status</Label><Select value={edit.status} onValueChange={(s) => setEdit({ ...edit, status: s })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Stock #</Label><Input value={edit.stockNumber} onChange={(e) => setEdit({ ...edit, stockNumber: e.target.value })} /></div>
            <div className="space-y-1"><Label>VIN</Label><Input value={edit.vin} onChange={(e) => setEdit({ ...edit, vin: e.target.value.toUpperCase() })} className="font-mono" /></div>
            <div className="space-y-1"><Label>Exterior</Label><Input value={edit.exteriorColor ?? ""} onChange={(e) => setEdit({ ...edit, exteriorColor: e.target.value })} /></div>
            <div className="space-y-1"><Label>Interior</Label><Input value={edit.interiorColor ?? ""} onChange={(e) => setEdit({ ...edit, interiorColor: e.target.value })} /></div>
            <div className="space-y-2 col-span-2"><Label>Photos</Label>
              <div className="flex flex-wrap gap-2">{edit.images.map((u, idx) => <div key={u + idx} className="relative h-16 w-20 rounded overflow-hidden border"><img src={u} className="h-full w-full object-cover" /><button type="button" onClick={() => setEdit({ ...edit, images: edit.images.filter((_, j) => j !== idx) })} className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded p-0.5"><Trash2 className="h-3 w-3" /></button>{idx === 0 && <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] text-center">cover</span>}</div>)}</div>
              <label className="inline-flex items-center gap-2 text-sm cursor-pointer rounded-md border px-3 py-2 hover:bg-muted">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => onUpload(e.target.files)} /></label>
            </div>
            <div className="space-y-1 col-span-2"><Label>Description</Label><Textarea rows={4} value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={saveEdit}>Save</Button></DialogFooter>
        </DialogContent>}
      </Dialog>
    </div>
  );
}
