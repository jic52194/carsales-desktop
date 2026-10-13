import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Car, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useCollection, insert, logActivity } from "@/lib/store";
import { useInventory, vTitle, vPrice, vImage } from "@/lib/inventory";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenant";

const SOURCE = "Showroom kiosk";
const RESET_MS = 8000;
const digits = (s: string) => s.replace(/\D/g, "");
const blank = { name: "", phone: "", email: "", vehicleId: "", interest: "" };

export default function ShowroomKiosk() {
  const { user } = useAuth();
  const tenant = useTenant();
  const customers = useCollection("customers");
  const inventory = useInventory();
  const [form, setForm] = useState({ ...blank });
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(RESET_MS / 1000);

  const available = useMemo(() => inventory.filter((v) => v.status === "Available"), [inventory]);
  const picks = useMemo(() => { const t = q.trim().toLowerCase(); return (t ? available.filter((v) => vTitle(v).toLowerCase().includes(t) || v.stockNumber?.toLowerCase().includes(t)) : available).slice(0, 8); }, [available, q]);
  const chosen = available.find((v) => v.id === form.vehicleId);

  useEffect(() => {
    if (!done) return;
    setCountdown(RESET_MS / 1000);
    const tick = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    const t = setTimeout(() => { setDone(null); setForm({ ...blank }); setQ(""); }, RESET_MS);
    return () => { clearTimeout(t); clearInterval(tick); };
  }, [done]);

  const submit = async () => {
    const name = form.name.trim(); const phone = digits(form.phone); const email = form.email.trim().toLowerCase();
    if (!name) return toast.error("Please enter your name");
    if (phone.length < 10 && !email) return toast.error("Enter a phone number or an email so we can reach you");
    setBusy(true);
    try {
      const [firstName, ...rest] = name.split(/\s+/);
      let customer = phone ? customers.find((c) => digits(c.phone ?? "") === phone) : undefined;
      if (!customer && email) customer = customers.find((c) => (c.email ?? "").toLowerCase() === email);
      if (!customer) customer = await insert("customers", { firstName, lastName: rest.join(" "), phone: form.phone.trim() || undefined, email: email || undefined, source: SOURCE } as any);
      const notes = [chosen ? `Interested in ${vTitle(chosen)} (#${chosen.stockNumber})` : form.interest.trim() ? `Looking for: ${form.interest.trim()}` : "", "Walked in and signed in at the showroom kiosk"].filter(Boolean).join("\n");
      const lead = await insert("leads", { customerId: customer.id, vehicleId: chosen?.id, stage: "new", source: SOURCE, notes } as any);
      logActivity("create", "lead", lead.id, SOURCE, user?.id);
      setDone(firstName);
    } catch (e: any) { toast.error(e.message || "Something went wrong — please tell a team member"); }
    finally { setBusy(false); }
  };

  if (done) return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 text-center">
      <div className="max-w-xl space-y-4">
        <CheckCircle2 className="h-24 w-24 mx-auto text-emerald-600" />
        <h1 className="text-5xl font-black">Thanks, {done}!</h1>
        <p className="text-2xl text-muted-foreground">A member of the {tenant.name} team will be right with you.</p>
        <p className="text-base text-muted-foreground">This screen resets in {countdown}s.</p>
        <Button size="lg" variant="outline" className="text-lg h-14 px-8" onClick={() => { setDone(null); setForm({ ...blank }); setQ(""); }}>Done</Button>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-3xl mx-auto">
      <div className="text-center space-y-2">
        {tenant.logoUrl && <img src={tenant.logoUrl} alt={tenant.name} className="h-16 mx-auto object-contain" />}
        <h1 className="text-4xl md:text-5xl font-black">Welcome to {tenant.name}</h1>
        <p className="text-xl text-muted-foreground">Sign in and we'll get you with the right person.</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2"><Label className="text-lg">Your name</Label><Input className="h-16 text-2xl" autoComplete="off" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="First and last name" /></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label className="text-lg">Mobile phone</Label><Input className="h-16 text-2xl" type="tel" inputMode="tel" autoComplete="off" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 555-1234" /></div>
            <div className="space-y-2"><Label className="text-lg">Email</Label><Input className="h-16 text-2xl" type="email" inputMode="email" autoComplete="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></div>
          </div>

          <div className="space-y-2">
            <Label className="text-lg">What are you here to see?</Label>
            {chosen ? (
              <div className="flex items-center gap-4 rounded-xl border p-3">
                <img src={vImage(chosen)} alt="" className="h-20 w-28 object-cover rounded-lg" />
                <div className="flex-1"><p className="text-xl font-bold">{vTitle(chosen)}</p><p className="text-muted-foreground">#{chosen.stockNumber} · {vPrice(chosen)}</p></div>
                <Button variant="outline" className="h-12" onClick={() => setForm({ ...form, vehicleId: "" })}>Change</Button>
              </div>
            ) : available.length > 0 ? (
              <>
                <Input className="h-14 text-xl" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search our inventory — e.g. F-150, Civic" />
                <div className="grid sm:grid-cols-2 gap-2">
                  {picks.map((v) => <button key={v.id} onClick={() => setForm({ ...form, vehicleId: v.id })} className="flex items-center gap-3 rounded-xl border p-2 text-left hover:border-primary active:bg-primary/5"><img src={vImage(v)} alt="" className="h-14 w-20 object-cover rounded-lg" /><div className="min-w-0"><p className="font-semibold truncate">{vTitle(v)}</p><p className="text-sm text-muted-foreground">{vPrice(v)}</p></div><ChevronRight className="h-5 w-5 ml-auto text-muted-foreground" /></button>)}
                  {picks.length === 0 && <p className="text-muted-foreground p-2 sm:col-span-2">Nothing matches — tell us below instead.</p>}
                </div>
              </>
            ) : <p className="text-muted-foreground flex items-center gap-2"><Car className="h-5 w-5" /> Tell us what you're looking for below.</p>}
            {!chosen && <Input className="h-14 text-xl" autoComplete="off" value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })} placeholder="Or describe it: 'AWD SUV under $20k', 'a truck for work'…" />}
          </div>

          <Button className="w-full h-20 text-2xl font-bold" onClick={submit} disabled={busy}>{busy ? <Loader2 className="h-6 w-6 animate-spin" /> : "I'm here — let the team know"}</Button>
          <p className="text-center text-sm text-muted-foreground">We'll only use your info to help with your visit. {tenant.phone}</p>
        </CardContent>
      </Card>
    </div>
  );
}
