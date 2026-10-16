// Public vehicle page — app.carsalessoftware.com/v/<vehicle id>. No sign-in. This is the link the Phone AI (and staff)
// text to customers: the dealership's branding, photos, price and specs, a call button and a "book a test drive" form
// that drops straight into Leads (lead-intake with the dealership's public intake key).
import { useEffect, useMemo, useState } from "react";
import { supabase, SUPABASE_URL } from "@/lib/supabase";
import { Phone, MapPin, Loader2, CheckCircle2, ExternalLink, ChevronLeft, ChevronRight, Gauge, Fuel, Cog, Palette } from "lucide-react";

type Pub = { vehicle: any; dealer: any };
const money = (n?: number | null) => (n ? n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }) : "Call for price");
const tel = (p?: string) => (p ? `tel:${p.replace(/[^\d+]/g, "")}` : undefined);

export default function PublicVehicle({ id }: { id: string }) {
  const [d, setD] = useState<Pub | null>(null);
  const [missing, setMissing] = useState(false);
  const [i, setI] = useState(0);
  const [f, setF] = useState({ first_name: "", phone: "", when: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    supabase.rpc("public_vehicle", { p_id: id }).then(({ data, error }) => { if (error || !data) setMissing(true); else setD(data as Pub); }, () => setMissing(true));
  }, [id]);

  const v = d?.vehicle, dl = d?.dealer;
  const title = v ? `${v.year} ${v.make} ${v.model}${v.trim ? " " + v.trim : ""}` : "";
  const color = dl?.colors?.primary || "#1D6FE0";
  const imgs: string[] = useMemo(() => (v?.images ?? []).filter(Boolean), [v]);
  useEffect(() => { if (title && dl?.name) document.title = `${title} · ${dl.name}`; }, [title, dl?.name]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (!f.first_name.trim() || f.phone.replace(/\D/g, "").length < 10) { setErr("Add your first name and a 10-digit phone number."); return; }
    setSending(true);
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/lead-intake`, { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: dl.intake_key, first_name: f.first_name, phone: f.phone, stock_number: v.stock_number, source: "Vehicle page", page_url: window.location.href,
          message: [`Wants to see the ${title}`, f.when && `Best time: ${f.when}`, f.message].filter(Boolean).join(" · ") }) });
      if (!r.ok) throw new Error(); setSent(true);
    } catch { setErr("That didn't go through — please call us instead."); } finally { setSending(false); }
  };

  if (missing) return (
    <div className="min-h-[100dvh] grid place-items-center bg-slate-50 p-6 text-center"><div><p className="text-xl font-bold text-slate-900">This vehicle isn't available anymore</p><p className="text-slate-600 mt-1">It may have just sold. Call the dealership for similar options.</p></div></div>
  );
  if (!d) return <div className="min-h-[100dvh] grid place-items-center bg-slate-50"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;

  const a = dl.address ?? {};
  const specs = [
    v.mileage != null && { icon: Gauge, k: "Mileage", val: `${Number(v.mileage).toLocaleString()} mi` },
    v.drivetrain && { icon: Cog, k: "Drivetrain", val: v.drivetrain }, v.engine && { icon: Cog, k: "Engine", val: v.engine },
    v.transmission && { icon: Cog, k: "Transmission", val: v.transmission }, v.fuel_type && { icon: Fuel, k: "Fuel", val: v.fuel_type },
    v.mpg && { icon: Fuel, k: "MPG", val: v.mpg }, v.exterior_color && { icon: Palette, k: "Exterior", val: v.exterior_color },
    v.interior_color && { icon: Palette, k: "Interior", val: v.interior_color },
  ].filter(Boolean) as { icon: any; k: string; val: string }[];

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-3">
          {dl.logo_url ? <img src={dl.logo_url} alt={dl.name} className="h-10 max-w-[160px] object-contain" /> : <p className="font-bold">{dl.name}</p>}
          <div className="flex-1" />
          {dl.phone && <a href={tel(dl.phone)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white font-semibold text-sm" style={{ backgroundColor: color }}><Phone className="h-4 w-4" /> {dl.phone}</a>}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 grid lg:grid-cols-[1fr_340px] gap-6">
        <section className="space-y-4 min-w-0">
          <div className="relative rounded-xl overflow-hidden bg-slate-200 aspect-[4/3]">
            {imgs.length ? <img src={imgs[i]} alt={title} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-slate-500">Photos coming soon</div>}
            {imgs.length > 1 && <>
              <button aria-label="Previous photo" onClick={() => setI((i - 1 + imgs.length) % imgs.length)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white p-2"><ChevronLeft className="h-5 w-5" /></button>
              <button aria-label="Next photo" onClick={() => setI((i + 1) % imgs.length)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white p-2"><ChevronRight className="h-5 w-5" /></button>
              <span className="absolute bottom-2 right-2 rounded bg-black/60 text-white text-xs px-2 py-0.5">{i + 1} / {imgs.length}</span>
            </>}
          </div>
          {imgs.length > 1 && <div className="flex gap-2 overflow-x-auto pb-1">{imgs.slice(0, 20).map((src, n) => <button key={src} onClick={() => setI(n)} className={`shrink-0 h-16 w-20 rounded-md overflow-hidden border-2 ${n === i ? "" : "border-transparent opacity-70"}`} style={n === i ? { borderColor: color } : undefined}><img src={src} alt="" className="h-full w-full object-cover" loading="lazy" /></button>)}</div>}

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
            <p className="text-slate-600 text-sm mt-1">Stock #{v.stock_number}{v.vin ? ` · VIN ${v.vin}` : ""}{v.status !== "Available" ? ` · ${v.status === "Pending" ? "Sale pending" : "Being prepared"}` : ""}</p>
            <p className="text-3xl font-extrabold mt-2" style={{ color }}>{money(v.price)}</p>
          </div>
          {specs.length > 0 && <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{specs.map((s) => <div key={s.k} className="rounded-lg bg-white border p-3"><p className="text-xs text-slate-500 flex items-center gap-1"><s.icon className="h-3.5 w-3.5" />{s.k}</p><p className="font-semibold text-sm mt-0.5">{s.val}</p></div>)}</div>}
          {(v.features ?? []).length > 0 && <div className="rounded-xl bg-white border p-4"><p className="font-semibold mb-2">Features</p><ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-700 list-disc pl-5">{v.features.slice(0, 30).map((x: string) => <li key={x}>{x}</li>)}</ul></div>}
          {v.description && <div className="rounded-xl bg-white border p-4"><p className="font-semibold mb-2">About this vehicle</p><p className="text-sm text-slate-700 whitespace-pre-line">{v.description}</p></div>}
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl bg-white border p-4 lg:sticky lg:top-20">
            {sent ? (
              <div className="text-center py-4"><CheckCircle2 className="h-10 w-10 mx-auto" style={{ color }} /><p className="font-bold mt-2">Got it, {f.first_name}!</p><p className="text-sm text-slate-600 mt-1">We'll text you shortly to lock in your test drive.</p></div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <p className="font-bold text-lg">Book a test drive</p>
                <input className="w-full h-11 rounded-lg border px-3" placeholder="First name" value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} autoComplete="given-name" />
                <input className="w-full h-11 rounded-lg border px-3" placeholder="Mobile number" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" />
                <input className="w-full h-11 rounded-lg border px-3" placeholder="Best day / time (optional)" value={f.when} onChange={(e) => setF({ ...f, when: e.target.value })} />
                <textarea className="w-full rounded-lg border px-3 py-2 text-sm" rows={2} placeholder="Questions? Trade-in? (optional)" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
                {err && <p className="text-sm text-red-600">{err}</p>}
                <button type="submit" disabled={sending} className="w-full h-11 rounded-lg text-white font-semibold disabled:opacity-60" style={{ backgroundColor: color }}>{sending ? "Sending…" : "Request a time"}</button>
                <p className="text-[11px] text-slate-500">By sending, you agree {dl.name} may call or text you about this vehicle. Msg & data rates may apply. Reply STOP to opt out.</p>
              </form>
            )}
          </div>
          <div className="rounded-xl bg-white border p-4 text-sm space-y-2">
            <p className="font-semibold">{dl.name}</p>
            {a.street && <p className="flex gap-2 text-slate-700"><MapPin className="h-4 w-4 mt-0.5 shrink-0" />{a.street}, {a.city}, {a.state} {a.zip}</p>}
            {dl.phone && <a href={tel(dl.phone)} className="flex gap-2 text-slate-700"><Phone className="h-4 w-4 mt-0.5" />{dl.phone}</a>}
            {v.source_url && <a href={v.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline text-slate-700">See it on our website <ExternalLink className="h-3.5 w-3.5" /></a>}
          </div>
          {(dl.disclaimers ?? []).length > 0 && <p className="text-[11px] text-slate-500">{(dl.disclaimers as string[]).join(" ")}</p>}
        </aside>
      </main>
      <footer className="text-center text-xs text-slate-400 pb-8">Powered by CarSalesSoftware.com</footer>
    </div>
  );
}
