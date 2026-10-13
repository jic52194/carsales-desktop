import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Gavel, Trash2, ExternalLink, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { useInventory, upsertVehicle, getVehicle, vTitle } from "@/lib/inventory";
import { useRecords, addRecord, updateRecord, removeRecord, type Rec } from "@/lib/records";
import { useAuth } from "@/lib/auth";
import { getTenantId } from "@/lib/tenant";
import { logActivity, money, fmtDate } from "@/lib/store";

export interface Auction { name: string; date: string; location: string; url: string; laneNotes: string }
export type LotResult = "pending" | "won" | "lost";
export interface AuctionLot { auctionId: string; vehicleId: string | null; description: string; lane: string; maxBid: number | null; result: LotResult; price: number | null; stockedVehicleId?: string }

const blankAuction = { name: "", date: new Date().toISOString().slice(0, 10), location: "", url: "", laneNotes: "" };
const blankLot = { vehicleId: "", description: "", lane: "", maxBid: "", result: "pending" as LotResult, price: "" };

export default function Auctions() {
  const { user, hasPermission } = useAuth();
  const canEdit = hasPermission(["manager", "inventory"]);
  const inventory = useInventory();
  const auctions = useRecords<Auction>("auction");
  const lots = useRecords<AuctionLot>("auction_lot");
  const [selectedId, setSelectedId] = useState("");
  const [aOpen, setAOpen] = useState(false);
  const [aForm, setAForm] = useState({ ...blankAuction });
  const [lotOpen, setLotOpen] = useState(false);
  const [lotEditing, setLotEditing] = useState<Rec<AuctionLot> | null>(null);
  const [lotForm, setLotForm] = useState({ ...blankLot });
  const [toDelete, setToDelete] = useState<Rec<Auction> | null>(null);
  const [toStock, setToStock] = useState<Rec<AuctionLot> | null>(null);
  const [stock, setStock] = useState({ stockNumber: "", year: "", make: "", model: "", vin: "" });

  const sorted = useMemo(() => [...auctions].sort((a, b) => b.data.date.localeCompare(a.data.date)), [auctions]);
  const selected = auctions.find((a) => a.id === selectedId) ?? sorted[0] ?? null;
  const myLots = useMemo(() => (selected ? lots.filter((l) => l.data.auctionId === selected.id) : []), [lots, selected]);
  const lotStats = (id: string) => { const ls = lots.filter((l) => l.data.auctionId === id); return { n: ls.length, won: ls.filter((l) => l.data.result === "won").length, spent: ls.filter((l) => l.data.result === "won").reduce((a, l) => a + (l.data.price ?? 0), 0) }; };
  const lotTitle = (l: AuctionLot) => { const v = l.vehicleId ? getVehicle(l.vehicleId) : undefined; return v ? `${vTitle(v)} (#${v.stockNumber})` : l.description || "Untitled lot"; };

  const saveAuction = async () => {
    if (!aForm.name.trim()) return toast.error("Auction name is required");
    try { const r = await addRecord<Auction>("auction", { ...aForm, name: aForm.name.trim() }, user?.id); setSelectedId(r.id); toast.success("Auction added"); setAOpen(false); setAForm({ ...blankAuction }); }
    catch (e: any) { toast.error(e.message || "Could not save"); }
  };
  const deleteAuction = async () => {
    if (!toDelete) return;
    try { for (const l of lots.filter((x) => x.data.auctionId === toDelete.id)) await removeRecord("auction_lot", l.id); await removeRecord("auction", toDelete.id); toast.success("Auction deleted"); setToDelete(null); setSelectedId(""); }
    catch (e: any) { toast.error(e.message); }
  };

  const openLot = (l?: Rec<AuctionLot>) => { setLotEditing(l ?? null); setLotForm(l ? { vehicleId: l.data.vehicleId ?? "", description: l.data.description, lane: l.data.lane, maxBid: l.data.maxBid != null ? String(l.data.maxBid) : "", result: l.data.result, price: l.data.price != null ? String(l.data.price) : "" } : { ...blankLot }); setLotOpen(true); };
  const saveLot = async () => {
    if (!selected) return;
    if (!lotForm.vehicleId && !lotForm.description.trim()) return toast.error("Pick a vehicle or describe the lot");
    const data: AuctionLot = { auctionId: selected.id, vehicleId: lotForm.vehicleId || null, description: lotForm.description.trim(), lane: lotForm.lane.trim(), maxBid: lotForm.maxBid === "" ? null : Number(lotForm.maxBid), result: lotForm.result, price: lotForm.price === "" ? null : Number(lotForm.price), stockedVehicleId: lotEditing?.data.stockedVehicleId };
    try { if (lotEditing) await updateRecord<AuctionLot>("auction_lot", lotEditing.id, data); else await addRecord<AuctionLot>("auction_lot", data, user?.id); toast.success("Lot saved"); setLotOpen(false); }
    catch (e: any) { toast.error(e.message || "Could not save"); }
  };
  const deleteLot = async () => { if (!lotEditing) return; try { await removeRecord("auction_lot", lotEditing.id); setLotOpen(false); toast.success("Lot removed"); } catch (e: any) { toast.error(e.message); } };

  const openStock = (l: Rec<AuctionLot>) => { setToStock(l); setStock({ stockNumber: "", year: "", make: "", model: "", vin: "" }); };
  const addToInventory = async () => {
    if (!toStock || !selected) return;
    if (!stock.stockNumber.trim() || !stock.make.trim() || !stock.model.trim()) return toast.error("Stock #, make and model are required");
    if (inventory.some((v) => v.stockNumber.toLowerCase() === stock.stockNumber.trim().toLowerCase())) return toast.error("Stock number already exists");
    try {
      const saved = await upsertVehicle({ id: `new-${Date.now().toString(36)}`, tenantId: getTenantId(), stockNumber: stock.stockNumber.trim(), vin: stock.vin.trim().toUpperCase(), year: Number(stock.year) || new Date().getFullYear(), make: stock.make.trim(), model: stock.model.trim(), trim: "", mileage: 0, price: null, cost: toStock.data.price, images: [], features: [], status: "Recon", source: `auction:${selected.data.name}`, addedAt: new Date().toISOString() });
      await updateRecord<AuctionLot>("auction_lot", toStock.id, { stockedVehicleId: saved.id });
      logActivity("auction_stocked", "vehicle", saved.id, `${vTitle(saved)} bought at ${selected.data.name} for ${money(toStock.data.price)}`, user?.id);
      toast.success(`${vTitle(saved)} added to inventory (Recon)`); setToStock(null);
    } catch (e: any) { toast.error(e.message || "Could not add"); }
  };

  const sellable = inventory.filter((v) => v.status !== "Sold");

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Auctions</h1><p className="text-muted-foreground">Run lists, max bids and results for every sale you attend or run online.</p></div>
        {canEdit && <Button onClick={() => setAOpen(true)}><Plus className="h-4 w-4 mr-1" /> New auction</Button>}
      </div>

      {auctions.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground"><Gavel className="h-8 w-8 mx-auto mb-2 opacity-40" />No auctions yet. Add a sale (Manheim, ADESA, a local lane or an online sale), build its run list with max bids, then record what you won.</CardContent></Card>
      ) : (
        <div className="grid lg:grid-cols-[300px_1fr] gap-6">
          <Card><CardContent className="p-0 divide-y max-h-[70vh] overflow-y-auto">
            {sorted.map((a) => { const s = lotStats(a.id); return (
              <button key={a.id} onClick={() => setSelectedId(a.id)} className={`w-full text-left p-3 hover:bg-muted/40 ${selected?.id === a.id ? "bg-muted" : ""}`}>
                <p className="font-semibold text-sm">{a.data.name}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(a.data.date)}{a.data.location ? ` · ${a.data.location}` : ""}</p>
                <p className="text-xs mt-1">{s.n} lot{s.n === 1 ? "" : "s"} · {s.won} won{s.spent ? ` · ${money(s.spent)}` : ""}</p>
              </button>
            ); })}
          </CardContent></Card>

          {selected && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">{selected.data.name}</h2>
                  <p className="text-sm text-muted-foreground">{fmtDate(selected.data.date)}{selected.data.location ? ` · ${selected.data.location}` : ""}{selected.data.url && <> · <a href={selected.data.url} target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">Open sale <ExternalLink className="h-3 w-3" /></a></>}</p>
                  {selected.data.laneNotes && <p className="text-sm mt-1 whitespace-pre-wrap">{selected.data.laneNotes}</p>}
                </div>
                {canEdit && <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => openLot()}><Plus className="h-4 w-4 mr-1" /> Add lot</Button><Button size="sm" variant="ghost" className="text-destructive" onClick={() => setToDelete(selected)}><Trash2 className="h-4 w-4" /></Button></div>}
              </div>

              {myLots.length === 0 ? <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No lots on this run list yet. Add the units you plan to bid on (or the units you're consigning) with a max bid.</CardContent></Card> : (
                <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Lot</th><th className="px-4 py-3">Lane</th><th className="px-4 py-3 text-right">Max bid</th><th className="px-4 py-3">Result</th><th className="px-4 py-3 text-right">Price</th><th className="px-4 py-3"></th></tr></thead>
                  <tbody className="divide-y">{myLots.map((l) => { const stocked = l.data.stockedVehicleId ? getVehicle(l.data.stockedVehicleId) : undefined; return (
                    <tr key={l.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => canEdit && openLot(l)}>
                      <td className="px-4 py-2 font-semibold">{lotTitle(l.data)}{stocked && <span className="block text-xs font-normal"><Link to={`/inventory/${stocked.id}`} onClick={(e) => e.stopPropagation()} className="underline">In stock #{stocked.stockNumber}</Link></span>}</td>
                      <td className="px-4 py-2">{l.data.lane || "—"}</td>
                      <td className="px-4 py-2 text-right">{money(l.data.maxBid)}</td>
                      <td className="px-4 py-2"><Badge variant={l.data.result === "won" ? "default" : l.data.result === "lost" ? "secondary" : "outline"}>{l.data.result}</Badge></td>
                      <td className="px-4 py-2 text-right font-semibold">{money(l.data.price)}</td>
                      <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>{canEdit && l.data.result === "won" && !l.data.vehicleId && !stocked && <Button size="sm" onClick={() => openStock(l)}><PackagePlus className="h-3.5 w-3.5 mr-1" /> Add to inventory</Button>}</td>
                    </tr>
                  ); })}</tbody>
                </table></CardContent></Card>
              )}
            </div>
          )}
        </div>
      )}

      <Dialog open={aOpen} onOpenChange={setAOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New auction</DialogTitle><DialogDescription>A physical sale or an online event.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2"><Label>Name *</Label><Input value={aForm.name} onChange={(e) => setAForm({ ...aForm, name: e.target.value })} placeholder="Manheim NE Tuesday sale" /></div>
            <div className="space-y-1"><Label>Date</Label><Input type="date" value={aForm.date} onChange={(e) => setAForm({ ...aForm, date: e.target.value })} /></div>
            <div className="space-y-1"><Label>Location</Label><Input value={aForm.location} onChange={(e) => setAForm({ ...aForm, location: e.target.value })} placeholder="City or 'Online'" /></div>
            <div className="space-y-1 col-span-2"><Label>Online URL</Label><Input value={aForm.url} onChange={(e) => setAForm({ ...aForm, url: e.target.value })} placeholder="https://" /></div>
            <div className="space-y-1 col-span-2"><Label>Lane notes</Label><Textarea rows={2} value={aForm.laneNotes} onChange={(e) => setAForm({ ...aForm, laneNotes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAOpen(false)}>Cancel</Button><Button onClick={saveAuction}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={lotOpen} onOpenChange={setLotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{lotEditing ? "Edit lot" : "Add lot"}</DialogTitle><DialogDescription>Pick one of your vehicles (consigning) or describe a unit you want to buy.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2"><Label>Your vehicle (optional)</Label><Select value={lotForm.vehicleId || "none"} onValueChange={(v) => setLotForm({ ...lotForm, vehicleId: v === "none" ? "" : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Not one of ours</SelectItem>{sellable.map((v) => <SelectItem key={v.id} value={v.id}>#{v.stockNumber} · {vTitle(v)}</SelectItem>)}</SelectContent></Select></div>
            {!lotForm.vehicleId && <div className="space-y-1 col-span-2"><Label>Description</Label><Input value={lotForm.description} onChange={(e) => setLotForm({ ...lotForm, description: e.target.value })} placeholder="2021 Toyota RAV4 XLE, 38k, VIN…" /></div>}
            <div className="space-y-1"><Label>Lane / run #</Label><Input value={lotForm.lane} onChange={(e) => setLotForm({ ...lotForm, lane: e.target.value })} /></div>
            <div className="space-y-1"><Label>Max bid</Label><Input type="number" value={lotForm.maxBid} onChange={(e) => setLotForm({ ...lotForm, maxBid: e.target.value })} /></div>
            <div className="space-y-1"><Label>Result</Label><Select value={lotForm.result} onValueChange={(v: LotResult) => setLotForm({ ...lotForm, result: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="won">Won</SelectItem><SelectItem value="lost">Lost</SelectItem></SelectContent></Select></div>
            <div className="space-y-1"><Label>Hammer price</Label><Input type="number" value={lotForm.price} onChange={(e) => setLotForm({ ...lotForm, price: e.target.value })} /></div>
          </div>
          <DialogFooter className="flex-row justify-between sm:justify-between">
            {lotEditing ? <Button variant="ghost" className="text-destructive" onClick={deleteLot}><Trash2 className="h-4 w-4 mr-1" /> Remove</Button> : <span />}
            <div className="flex gap-2"><Button variant="outline" onClick={() => setLotOpen(false)}>Cancel</Button><Button onClick={saveLot}>Save</Button></div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!toStock} onOpenChange={(o) => !o && setToStock(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add to inventory</DialogTitle><DialogDescription>{toStock ? `"${toStock.data.description}" enters inventory in Recon with cost ${money(toStock.data.price)}.` : ""}</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Stock # *</Label><Input value={stock.stockNumber} onChange={(e) => setStock({ ...stock, stockNumber: e.target.value })} autoFocus /></div>
            <div className="space-y-1"><Label>Year</Label><Input type="number" value={stock.year} onChange={(e) => setStock({ ...stock, year: e.target.value })} /></div>
            <div className="space-y-1"><Label>Make *</Label><Input value={stock.make} onChange={(e) => setStock({ ...stock, make: e.target.value })} /></div>
            <div className="space-y-1"><Label>Model *</Label><Input value={stock.model} onChange={(e) => setStock({ ...stock, model: e.target.value })} /></div>
            <div className="space-y-1 col-span-2"><Label>VIN</Label><Input value={stock.vin} onChange={(e) => setStock({ ...stock, vin: e.target.value })} maxLength={17} className="font-mono uppercase" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setToStock(null)}>Cancel</Button><Button onClick={addToInventory}>Add vehicle</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete {toDelete?.data.name}?</AlertDialogTitle><AlertDialogDescription>The auction and all {toDelete ? lotStats(toDelete.id).n : 0} of its lots are deleted. Vehicles already added to inventory are kept.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={deleteAuction}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
