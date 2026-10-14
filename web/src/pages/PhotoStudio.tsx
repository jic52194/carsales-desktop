import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Camera, ChevronLeft, ChevronRight, Star, Trash2, Upload, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { useInventory, upsertVehicle, uploadVehiclePhotos, vTitle, vImage, type Vehicle } from "@/lib/inventory";
import { useAuth } from "@/lib/auth";
import { logActivity } from "@/lib/store";

const SHOT_LIST = ["Front 3/4", "Rear 3/4", "Driver side", "Passenger side", "Front grille", "Rear bumper", "Wheel / tire", "Dashboard", "Front seats", "Rear seats", "Odometer", "Trunk / cargo"];
const TARGET = SHOT_LIST.length;

export default function PhotoStudio() {
  const { user, hasPermission } = useAuth();
  const canEdit = hasPermission(["manager", "inventory", "web", "porter"]);
  const inventory = useInventory();
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState<"all" | "missing">("all");
  const [busy, setBusy] = useState(false);
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const unsold = useMemo(() => inventory.filter((v) => v.status !== "Sold"), [inventory]);
  const list = useMemo(() => (filter === "missing" ? unsold.filter((v) => v.images.length < TARGET) : unsold).sort((a, b) => a.images.length - b.images.length), [unsold, filter]);
  const vehicle = inventory.find((v) => v.id === selectedId) ?? null;
  const images = vehicle?.images ?? [];
  const coverage = useMemo(() => ({ complete: unsold.filter((v) => v.images.length >= TARGET).length, none: unsold.filter((v) => v.images.length === 0).length, total: unsold.reduce((a, v) => a + v.images.length, 0) }), [unsold]);

  const save = async (v: Vehicle, next: string[], action: string) => {
    setBusy(true);
    try { await upsertVehicle({ ...v, images: next }); logActivity(action, "vehicle", v.id, `${vTitle(v)} (${next.length} photos)`, user?.id); }
    catch (e: any) { toast.error(e.message || "Could not save photos"); }
    finally { setBusy(false); }
  };

  const upload = async (files: FileList | null) => {
    if (!vehicle || !files?.length) return;
    setBusy(true);
    try {
      const urls = await uploadVehiclePhotos(vehicle.id, files);
      await upsertVehicle({ ...vehicle, images: [...vehicle.images, ...urls] });
      logActivity("photos_upload", "vehicle", vehicle.id, `${urls.length} photo${urls.length === 1 ? "" : "s"}`, user?.id);
      toast.success(`${urls.length} photo${urls.length === 1 ? "" : "s"} uploaded`);
    } catch (e: any) { toast.error(e.message || "Upload failed"); }
    finally { setBusy(false); }
  };

  const moveImg = (i: number, dir: -1 | 1) => {
    if (!vehicle) return; const j = i + dir; if (j < 0 || j >= images.length) return;
    const next = [...images]; [next[i], next[j]] = [next[j], next[i]]; save(vehicle, next, "photos_reorder");
  };
  const setCover = (i: number) => { if (!vehicle || i === 0) return; const next = [images[i], ...images.filter((_, k) => k !== i)]; save(vehicle, next, "photos_cover"); };
  const confirmDelete = async () => {
    if (!vehicle || deleteIdx == null) return;
    await save(vehicle, images.filter((_, k) => k !== deleteIdx), "photos_delete"); setDeleteIdx(null);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div><h1 className="text-3xl font-black">Photo Studio</h1><p className="text-muted-foreground">Upload, order and manage photos per vehicle. Target is {TARGET} shots per unit.</p></div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Full coverage</p><p className="text-2xl font-black">{coverage.complete}<span className="text-sm font-normal text-muted-foreground"> / {unsold.length}</span></p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">No photos</p><p className="text-2xl font-black">{coverage.none}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Total photos</p><p className="text-2xl font-black">{coverage.total}</p></CardContent></Card>
      </div>

      {unsold.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground"><Camera className="h-8 w-8 mx-auto mb-2 opacity-40" />No vehicles to photograph. Add units in Inventory first.</CardContent></Card>
      ) : (
        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          <div className="space-y-3">
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All unsold ({unsold.length})</SelectItem><SelectItem value="missing">Needs photos ({unsold.filter((v) => v.images.length < TARGET).length})</SelectItem></SelectContent></Select>
            <Card><CardContent className="p-0 max-h-[60vh] overflow-y-auto divide-y">
              {list.length === 0 && <p className="p-4 text-sm text-muted-foreground text-center">Every unit has {TARGET}+ photos.</p>}
              {list.map((v) => (
                <button key={v.id} onClick={() => setSelectedId(v.id)} className={`w-full text-left flex items-center gap-3 p-2 hover:bg-muted/40 ${v.id === selectedId ? "bg-muted" : ""}`}>
                  <img data-car src={vImage(v)} alt="" className="h-12 w-16 object-cover rounded bg-muted shrink-0" loading="lazy" />
                  <div className="min-w-0 flex-1"><p className="text-sm font-semibold truncate">{vTitle(v)}</p><p className="text-xs text-muted-foreground">#{v.stockNumber}</p></div>
                  <Badge variant={v.images.length >= TARGET ? "default" : v.images.length === 0 ? "destructive" : "secondary"}>{v.images.length}/{TARGET}</Badge>
                </button>
              ))}
            </CardContent></Card>
          </div>

          <div className="space-y-4">
            {!vehicle ? (
              <Card><CardContent className="p-10 text-center text-muted-foreground">Select a vehicle on the left to manage its photos.</CardContent></Card>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div><h2 className="text-xl font-bold"><Link to={`/inventory/${vehicle.id}`} className="hover:underline">{vTitle(vehicle)}</Link></h2><p className="text-sm text-muted-foreground">#{vehicle.stockNumber} · {images.length} photo{images.length === 1 ? "" : "s"} · first photo is the cover</p></div>
                  {canEdit && <div><Input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} /><Button disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />} Upload photos</Button></div>}
                </div>

                {images.length === 0 ? (
                  <Card><CardContent className="p-10 text-center text-muted-foreground">No photos yet. Upload JPG, PNG or WebP (max 10 MB each).</CardContent></Card>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                    {images.map((src, i) => (
                      <Card key={`${src}-${i}`} className="overflow-hidden">
                        <div className="aspect-[4/3] bg-muted relative"><img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />{i === 0 && <Badge className="absolute top-2 left-2"><Star className="h-3 w-3 mr-1" /> Cover</Badge>}<span className="absolute bottom-1 right-2 text-xs bg-black/60 text-white rounded px-1">{i + 1}</span></div>
                        {canEdit && <div className="flex items-center justify-between p-1">
                          <div className="flex"><Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0 || busy} onClick={() => moveImg(i, -1)}><ChevronLeft className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === images.length - 1 || busy} onClick={() => moveImg(i, 1)}><ChevronRight className="h-4 w-4" /></Button></div>
                          <div className="flex"><Button size="icon" variant="ghost" className="h-7 w-7" title="Set as cover" disabled={i === 0 || busy} onClick={() => setCover(i)}><Star className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" disabled={busy} onClick={() => setDeleteIdx(i)}><Trash2 className="h-4 w-4" /></Button></div>
                        </div>}
                      </Card>
                    ))}
                  </div>
                )}

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Shot checklist</CardTitle><CardDescription>Progress counts photos uploaded ({images.length} of {TARGET}); shoot in this order so each slot matches.</CardDescription></CardHeader>
                  <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                    {SHOT_LIST.map((label, i) => { const ok = i < images.length; return <div key={label} className={`flex items-center gap-2 rounded border px-2 py-1 ${ok ? "border-primary/40 bg-primary/5" : "text-muted-foreground"}`}><span className={`h-4 w-4 rounded-full border flex items-center justify-center text-[10px] ${ok ? "bg-primary text-primary-foreground border-primary" : ""}`}>{ok ? <Check className="h-3 w-3" /> : i + 1}</span>{label}</div>; })}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={deleteIdx != null} onOpenChange={(o) => !o && setDeleteIdx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remove this photo?</AlertDialogTitle><AlertDialogDescription>It is removed from the vehicle's listing and website immediately.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete}>Remove</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
