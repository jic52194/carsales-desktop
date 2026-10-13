// Book a real slot on one of the dealership's GoHighLevel calendars, and mirror it as a local appointment.
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { CalendarCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCollection, insert, remove, fullName, logActivity, type Appointment } from "@/lib/store";
import { useInventory, vTitle } from "@/lib/inventory";
import { useAuth } from "@/lib/auth";
import { ghlCalendars, ghlFreeSlots, ghlBook, ghlErrorMessage, type GhlCalendar } from "@/lib/ghl";

type ApptType = Extract<Appointment["type"], "test_drive" | "sales" | "delivery">;
const TYPES: [ApptType, string][] = [["test_drive", "Test drive"], ["sales", "Sales appointment"], ["delivery", "Delivery"]];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtSlot = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
let calCache: GhlCalendar[] | null = null;

export interface BookGhlDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  customerId?: string;
  vehicleId?: string;
  defaultType?: ApptType;
  onBooked?: (a: Appointment) => void;
}

export function BookGhlDialog({ open, onOpenChange, customerId: fixedCustomer, vehicleId: fixedVehicle, defaultType = "test_drive", onBooked }: BookGhlDialogProps) {
  const { user } = useAuth();
  const customers = useCollection("customers");
  const inventory = useInventory();
  const [customerId, setCustomerId] = useState(fixedCustomer ?? "");
  const [vehicleId, setVehicleId] = useState(fixedVehicle ?? "");
  const [type, setType] = useState<ApptType>(defaultType);
  const [calendars, setCalendars] = useState<GhlCalendar[]>(calCache ?? []);
  const [calendarId, setCalendarId] = useState("");
  const [day, setDay] = useState(ymd(new Date()));
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState("");
  const [notes, setNotes] = useState("");
  const [loadingCals, setLoadingCals] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pickDefaultCal = (cals: GhlCalendar[], t: ApptType) => {
    const active = cals.filter((c) => c.isActive);
    const want = t === "test_drive" ? /test\s*drive/i : t === "delivery" ? /deliver/i : /sales|appoint|consult/i;
    return (active.find((c) => want.test(c.name)) ?? active[0] ?? cals[0])?.id ?? "";
  };

  useEffect(() => {
    if (!open) return;
    setCustomerId(fixedCustomer ?? ""); setVehicleId(fixedVehicle ?? ""); setType(defaultType); setDay(ymd(new Date())); setSlot(""); setNotes(""); setErr(null);
    if (calCache) { setCalendars(calCache); setCalendarId(pickDefaultCal(calCache, defaultType)); return; }
    setLoadingCals(true);
    ghlCalendars().then((r) => { calCache = r.calendars; setCalendars(r.calendars); setCalendarId(pickDefaultCal(r.calendars, defaultType)); })
      .catch((e) => setErr(ghlErrorMessage(e))).finally(() => setLoadingCals(false));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || !calendarId || !day) return;
    let live = true;
    const start = new Date(`${day}T00:00:00`).getTime();
    setLoadingSlots(true); setSlot(""); setSlots([]);
    ghlFreeSlots({ calendarId, startMs: start, endMs: start + 864e5 - 1 })
      .then((r) => { if (live) setSlots((r.slots ?? []).filter((s) => Date.parse(s) > Date.now()).sort()); })
      .catch((e) => { if (live) setErr(ghlErrorMessage(e)); })
      .finally(() => { if (live) setLoadingSlots(false); });
    return () => { live = false; };
  }, [open, calendarId, day]);

  const customer = useMemo(() => customers.find((c) => c.id === customerId), [customers, customerId]);
  const calName = calendars.find((c) => c.id === calendarId)?.name;

  const book = async () => {
    if (!customerId) return toast.error("Pick a customer");
    if (!calendarId || !slot) return toast.error("Pick a calendar and a time");
    setBusy(true);
    let local: Appointment | null = null;
    try {
      local = await insert("appointments", { customerId, vehicleId: vehicleId || undefined, type, startsAt: new Date(slot).toISOString(), status: "scheduled", assignedTo: user?.id, notes: [notes.trim(), calName ? `GoHighLevel: ${calName}` : ""].filter(Boolean).join(" · ") || undefined } as any);
      const v = vehicleId ? inventory.find((x) => x.id === vehicleId) : undefined;
      const label = TYPES.find((t) => t[0] === type)?.[1] ?? "Appointment";
      await ghlBook({ customerId, calendarId, startTime: slot, type: label, appointmentId: local.id, title: `${customer ? fullName(customer) : "Customer"} — ${label}${v ? ` · ${vTitle(v)}` : ""}` });
      logActivity("ghl_book", "appointment", local.id, `${label} ${new Date(slot).toLocaleString()}`, user?.id);
      toast.success(`Booked in GoHighLevel for ${new Date(slot).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`);
      onBooked?.(local); onOpenChange(false);
    } catch (e) {
      if (local) await remove("appointments", local.id).catch(() => {});
      toast.error(ghlErrorMessage(e));
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Book in GoHighLevel</DialogTitle><DialogDescription>Uses the live availability on your GHL calendars; the customer gets GHL's confirmation and the appointment shows here too.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          {err && <p className="text-sm rounded-md border border-amber-300 bg-amber-50 text-amber-900 p-2">{err}</p>}
          {!fixedCustomer && <div className="space-y-1"><Label>Customer *</Label><Select value={customerId} onValueChange={setCustomerId}><SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger><SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{fullName(c)}{c.phone ? ` · ${c.phone}` : ""}</SelectItem>)}</SelectContent></Select></div>}
          {fixedCustomer && customer && <p className="text-sm"><span className="text-muted-foreground">Customer:</span> <strong>{fullName(customer)}</strong></p>}
          {customer && !customer.phone && !customer.email && <p className="text-xs text-destructive">This customer has no phone or email — GoHighLevel needs one to create the contact.</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Type</Label><Select value={type} onValueChange={(v) => { setType(v as ApptType); if (calendars.length) setCalendarId(pickDefaultCal(calendars, v as ApptType)); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TYPES.map((t) => <SelectItem key={t[0]} value={t[0]}>{t[1]}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Day</Label><Input type="date" value={day} min={ymd(new Date())} onChange={(e) => setDay(e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label>GoHighLevel calendar</Label>
            {loadingCals ? <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading calendars…</p> :
              calendars.length === 0 ? <p className="text-sm text-muted-foreground">{err ? "Calendars unavailable." : "No calendars found in this GoHighLevel sub-account — create one in GHL → Calendars."}</p> :
              <Select value={calendarId} onValueChange={setCalendarId}><SelectTrigger><SelectValue placeholder="Choose a calendar" /></SelectTrigger><SelectContent>{calendars.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.isActive ? "" : " (inactive)"}</SelectItem>)}</SelectContent></Select>}
          </div>
          <div className="space-y-1"><Label>Open times</Label>
            {loadingSlots ? <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Checking availability…</p> :
              !calendarId ? <p className="text-sm text-muted-foreground">Pick a calendar first.</p> :
              slots.length === 0 ? <p className="text-sm text-muted-foreground">No open times on this day. Try another day.</p> :
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">{slots.map((s) => <Button key={s} type="button" size="sm" variant={slot === s ? "default" : "outline"} onClick={() => setSlot(s)}>{fmtSlot(s)}</Button>)}</div>}
          </div>
          <div className="space-y-1"><Label>Vehicle</Label><Select value={vehicleId || "none"} onValueChange={(v) => setVehicleId(v === "none" ? "" : v)}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{inventory.filter((v) => v.status === "Available" || v.id === vehicleId).map((v) => <SelectItem key={v.id} value={v.id}>{vTitle(v)} · #{v.stockNumber}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label>Notes (internal)</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter className="gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={book} disabled={busy || !slot || !customerId}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CalendarCheck className="h-4 w-4 mr-1" />} Book</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
