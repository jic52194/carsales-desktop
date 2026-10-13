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
import { Plus, Trash2, Video, MessageSquare, Mail, ExternalLink, Copy, Search } from "lucide-react";
import { toast } from "sonner";
import { useCollection, fullName, fmtDateTime, logActivity } from "@/lib/store";
import { useInventory, vTitle } from "@/lib/inventory";
import { useRecords, addRecord, removeRecord, type Rec } from "@/lib/records";
import { useAuth, useUsers } from "@/lib/auth";
import { useTenant } from "@/lib/tenant";
import { ComposeMessage } from "@/components/ComposeMessage";
import type { Customer } from "@/lib/store";

export interface VideoMessage { customerId: string; vehicleId: string; url: string; note: string; sentAt: string; by?: string }
const blank = { customerId: "", vehicleId: "", url: "", note: "" };
const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(s.trim());
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

export default function VideoMessages() {
  const { user } = useAuth();
  const users = useUsers();
  const tenant = useTenant();
  const customers = useCollection("customers");
  const inventory = useInventory();
  const videos = useRecords<VideoMessage>("video");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...blank });
  const [toDelete, setToDelete] = useState<Rec<VideoMessage> | null>(null);
  const [compose, setCompose] = useState<{ customer: Customer; channel: "sms" | "email"; body: string; subject: string; vehicleId?: string } | null>(null);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return videos.filter((v) => { if (!term) return true; const c = customers.find((x) => x.id === v.data.customerId); const veh = inventory.find((x) => x.id === v.data.vehicleId); return fullName(c).toLowerCase().includes(term) || (veh ? vTitle(veh).toLowerCase() : "").includes(term) || v.data.note.toLowerCase().includes(term); })
      .sort((a, b) => b.data.sentAt.localeCompare(a.data.sentAt));
  }, [videos, customers, inventory, q]);

  const customer = customers.find((c) => c.id === form.customerId);
  const vehicle = inventory.find((v) => v.id === form.vehicleId);
  const message = (v: VideoMessage) => { const c = customers.find((x) => x.id === v.customerId); const veh = inventory.find((x) => x.id === v.vehicleId); return `Hi ${c?.firstName ?? ""}, here's a quick video${veh ? ` of the ${vTitle(veh)}` : ""} from ${user?.fullName ?? tenant.name}: ${v.url}${v.note ? `\n${v.note}` : ""}`.trim(); };

  const save = async () => {
    if (!form.customerId) return toast.error("Pick a customer");
    if (!isUrl(form.url)) return toast.error("Paste a full link starting with http:// or https://");
    try {
      const data: VideoMessage = { customerId: form.customerId, vehicleId: form.vehicleId, url: form.url.trim(), note: form.note.trim(), sentAt: new Date().toISOString(), by: user?.id };
      const r = await addRecord<VideoMessage>("video", data, user?.id);
      logActivity("video", "customer", form.customerId, `${vehicle ? vTitle(vehicle) + " — " : ""}${data.url}`, user?.id);
      toast.success("Video logged"); setOpen(false); setForm({ ...blank });
      void r;
    } catch (e: any) { toast.error(e.message || "Could not save"); }
  };
  const del = async () => { if (!toDelete) return; try { await removeRecord("video", toDelete.id); toast.success("Removed"); } catch (e: any) { toast.error(e.message); } setToDelete(null); };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Video Walkarounds</h1><p className="text-muted-foreground">Walkaround and thank-you videos you've sent, linked to the customer and the car.</p></div>
        <Button onClick={() => setOpen(true)} disabled={customers.length === 0}><Plus className="h-4 w-4 mr-1" /> Log a video</Button>
      </div>

      <Card><CardContent className="p-4 text-sm text-muted-foreground">
        <p><strong className="text-foreground">How it works:</strong> record the walkaround on your phone (Camera, YouTube unlisted, Loom, Google Drive — anything that gives you a link), paste the link here, then hit <em>Text link</em> to send it. Recording inside the app isn't supported; a shared link plays on any phone without an install.</p>
      </CardContent></Card>

      <div className="relative max-w-sm"><Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" /><Input className="pl-8" placeholder="Search by customer, vehicle or note" value={q} onChange={(e) => setQ(e.target.value)} /></div>

      {rows.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground"><Video className="h-8 w-8 mx-auto mb-2 opacity-40" />{videos.length === 0 ? (customers.length === 0 ? <>No customers yet — add one under <Link className="text-primary underline" to="/customers?new=1">Customers</Link> first.</> : "No videos logged yet. Record one on your phone and paste the link.") : "No videos match your search."}</CardContent></Card>}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rows.map((v) => { const c = customers.find((x) => x.id === v.data.customerId); const veh = inventory.find((x) => x.id === v.data.vehicleId); const by = users.find((u) => u.id === v.data.by); const text = message(v.data); return (
          <Card key={v.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-semibold">{c ? <Link to={`/customers/${c.id}`} className="hover:underline">{fullName(c)}</Link> : "Deleted customer"}</p><p className="text-xs text-muted-foreground">{veh ? vTitle(veh) : "No vehicle"} · {fmtDateTime(v.data.sentAt)}{by ? ` · ${by.fullName}` : ""}</p></div>
                <Badge variant="secondary" className="shrink-0">{host(v.data.url)}</Badge>
              </div>
              <a href={v.data.url} target="_blank" rel="noreferrer" className="text-xs text-primary underline inline-flex items-center gap-1 break-all"><ExternalLink className="h-3 w-3 shrink-0" />{v.data.url}</a>
              {v.data.note && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{v.data.note}</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                {c?.phone ? <Button size="sm" onClick={() => setCompose({ customer: c, channel: "sms", body: text, subject: "", vehicleId: veh?.id })}><MessageSquare className="h-4 w-4 mr-1" /> Text link</Button> : <Button size="sm" disabled><MessageSquare className="h-4 w-4 mr-1" /> No phone</Button>}
                {c?.email && <Button size="sm" variant="outline" onClick={() => setCompose({ customer: c, channel: "email", body: text, subject: veh ? `Video: ${vTitle(veh)}` : "A quick video for you", vehicleId: veh?.id })}><Mail className="h-4 w-4 mr-1" /> Email</Button>}
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(v.data.url); toast.success("Link copied"); }}><Copy className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setToDelete(v)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>); })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log a video</DialogTitle><DialogDescription>Paste the share link from your phone, YouTube, Loom or Drive.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Customer *</Label><Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}><SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger><SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{fullName(c)}{c.phone ? ` · ${c.phone}` : ""}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Vehicle</Label><Select value={form.vehicleId || "none"} onValueChange={(v) => setForm({ ...form, vehicleId: v === "none" ? "" : v })}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{inventory.map((v) => <SelectItem key={v.id} value={v.id}>{vTitle(v)} · #{v.stockNumber}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Video link *</Label><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://youtu.be/…" inputMode="url" />{form.url && !isUrl(form.url) && <p className="text-xs text-destructive">Needs to be a full link starting with https://</p>}</div>
            <div className="space-y-1"><Label>Note</Label><Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Walkaround, pointed out the new tires" /></div>
            {customer && form.url && isUrl(form.url) && <p className="text-xs rounded bg-muted p-2 whitespace-pre-wrap">{message({ customerId: form.customerId, vehicleId: form.vehicleId, url: form.url, note: form.note, sentAt: "" })}</p>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ComposeMessage open={!!compose} onOpenChange={(o) => !o && setCompose(null)} customer={compose?.customer} defaultChannel={compose?.channel} defaultBody={compose?.body} defaultSubject={compose?.subject} vehicleId={compose?.vehicleId} title="Send video link" />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remove this video entry?</AlertDialogTitle><AlertDialogDescription>Only the log entry is removed — the video itself stays wherever it's hosted.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={del}>Remove</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
