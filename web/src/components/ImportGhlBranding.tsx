// "Import from GoHighLevel": pulls the sub-account's business profile (name, phone, email, website, address, logo)
// and — when there's a logo — its main brand color. Shows a side-by-side so the admin picks what to copy;
// the values fill the form and are saved with the normal Save button.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ghlLocationProfile, ghlErrorMessage, useGhlStatus } from "@/lib/ghl";

type Form = Record<string, string>;
const FIELDS: { key: string; label: string; from: string }[] = [
  { key: "name", label: "Dealership name", from: "name" }, { key: "phone", label: "Phone", from: "phone" }, { key: "email", label: "Email", from: "email" },
  { key: "website", label: "Website", from: "website" }, { key: "street", label: "Street", from: "street" }, { key: "city", label: "City", from: "city" },
  { key: "state", label: "State", from: "state" }, { key: "zip", label: "ZIP", from: "zip" }, { key: "logoUrl", label: "Logo", from: "logoUrl" }, { key: "primary", label: "Brand color (from logo)", from: "primary" },
];
const STATES: Record<string, string> = { massachusetts: "MA", "new hampshire": "NH", maine: "ME", "rhode island": "RI", connecticut: "CT", vermont: "VT", "new york": "NY", florida: "FL", texas: "TX", california: "CA", "new jersey": "NJ", pennsylvania: "PA" };

/** Dominant saturated color of a logo (skips white/black/gray pixels). Needs the image host to allow CORS. */
async function logoColor(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas"); const w = (c.width = 64), h = (c.height = Math.max(1, Math.round((64 * img.height) / img.width)));
        const ctx = c.getContext("2d")!; ctx.drawImage(img, 0, 0, w, h); const d = ctx.getImageData(0, 0, w, h).data;
        const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
        for (let i = 0; i < d.length; i += 4) {
          const [r, g, b, a] = [d[i], d[i + 1], d[i + 2], d[i + 3]]; if (a < 200) continue;
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx - mn < 40 || mx < 50 || mn > 225) continue;
          const k = `${r >> 5}-${g >> 5}-${b >> 5}`; const e = buckets.get(k) ?? { n: 0, r: 0, g: 0, b: 0 }; e.n++; e.r += r; e.g += g; e.b += b; buckets.set(k, e);
        }
        const top = [...buckets.values()].sort((a, b) => b.n - a.n)[0]; if (!top) return resolve(null);
        const hex = (v: number) => Math.round(v / top.n).toString(16).padStart(2, "0"); resolve(`#${hex(top.r)}${hex(top.g)}${hex(top.b)}`);
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null); img.src = url;
  });
}

export default function ImportGhlBranding({ current, onApply }: { current: Form; onApply: (patch: Form) => void }) {
  const st = useGhlStatus();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [vals, setVals] = useState<Form>({});
  const [pick, setPick] = useState<Record<string, boolean>>({});
  if (!st.connected) return null;

  const start = async () => {
    setBusy(true);
    try {
      const { profile: p } = await ghlLocationProfile();
      const v: Form = { ...p, state: STATES[p.state?.toLowerCase?.() ?? ""] ?? p.state, website: p.website?.replace(/^http:\/\//, "https://") ?? "" } as any;
      if (p.logoUrl) { const col = await logoColor(p.logoUrl); if (col) v.primary = col; }
      const sel: Record<string, boolean> = {};
      for (const f of FIELDS) { const g = (v[f.from] ?? "").trim(); const h = (current[f.key] ?? "").trim(); sel[f.key] = !!g && !h; }
      setVals(v); setPick(sel); setOpen(true);
    } catch (e) { toast.error(ghlErrorMessage(e)); } finally { setBusy(false); }
  };
  const apply = () => {
    const patch: Form = {}; for (const f of FIELDS) if (pick[f.key] && vals[f.from]) patch[f.key] = vals[f.from];
    onApply(patch); setOpen(false); toast.success(`${Object.keys(patch).length} field${Object.keys(patch).length === 1 ? "" : "s"} filled in from GoHighLevel — review and click Save`);
  };
  const rows = FIELDS.filter((f) => (vals[f.from] ?? "").trim());

  return (<>
    <Button variant="outline" size="sm" onClick={start} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />} Import from GoHighLevel</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Import from GoHighLevel</DialogTitle><DialogDescription>Tick what to copy into your settings. Nothing is saved until you click Save on the page.</DialogDescription></DialogHeader>
        <div className="max-h-[60vh] overflow-auto -mx-2">
          <table className="w-full text-sm"><thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="p-2 w-8"></th><th className="p-2">Field</th><th className="p-2">Here now</th><th className="p-2">In GoHighLevel</th></tr></thead>
            <tbody className="divide-y">{rows.map((f) => {
              const g = vals[f.from]; const h = current[f.key] ?? ""; const same = g.trim().toLowerCase() === h.trim().toLowerCase();
              return (
                <tr key={f.key} className={same ? "opacity-50" : ""}>
                  <td className="p-2"><Checkbox checked={!!pick[f.key]} disabled={same} onCheckedChange={(c) => setPick({ ...pick, [f.key]: !!c })} /></td>
                  <td className="p-2 font-medium whitespace-nowrap">{f.label}</td>
                  <td className="p-2 text-muted-foreground break-all">{f.key === "primary" && h ? <span className="inline-flex items-center gap-1.5"><span className="h-4 w-4 rounded border" style={{ background: h }} />{h}</span> : f.key === "logoUrl" && h ? <img src={h} alt="" className="h-8 max-w-[120px] object-contain" /> : h || "—"}</td>
                  <td className="p-2 break-all">{f.key === "primary" ? <span className="inline-flex items-center gap-1.5"><span className="h-4 w-4 rounded border" style={{ background: g }} />{g}</span> : f.key === "logoUrl" ? <img src={g} alt="" className="h-8 max-w-[120px] object-contain" /> : g}{same && <span className="text-xs text-muted-foreground"> (same)</span>}</td>
                </tr>
              );
            })}</tbody></table>
          {rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">Your GoHighLevel business profile is empty.</p>}
          {!vals.logoUrl && <p className="px-2 pt-3 text-xs text-muted-foreground">No logo in GoHighLevel's business profile (Settings → Business Profile) — add one there to import it and its brand color.</p>}
        </div>
        <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={apply} disabled={!Object.values(pick).some(Boolean)}>Fill in selected</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>);
}
