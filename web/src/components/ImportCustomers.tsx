import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { list, insert, refresh, logActivity, type Customer } from "@/lib/store";
import { useAuth } from "@/lib/auth";

/** Tiny CSV parser (quotes, commas, CRLF). Good enough for DMS / spreadsheet exports. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const FIELDS: { key: keyof Customer | "fullName" | "skip"; label: string; hints: string[] }[] = [
  { key: "skip", label: "— skip —", hints: [] },
  { key: "fullName", label: "Full name (split)", hints: ["name", "customer", "full name", "contact"] },
  { key: "firstName", label: "First name", hints: ["first", "fname", "first name", "given"] },
  { key: "lastName", label: "Last name", hints: ["last", "lname", "last name", "surname"] },
  { key: "phone", label: "Phone", hints: ["phone", "cell", "mobile", "tel"] },
  { key: "email", label: "Email", hints: ["email", "e-mail"] },
  { key: "address", label: "Street", hints: ["address", "street", "addr"] },
  { key: "city", label: "City", hints: ["city", "town"] },
  { key: "state", label: "State", hints: ["state", "st"] },
  { key: "zip", label: "ZIP", hints: ["zip", "postal"] },
  { key: "source", label: "Source", hints: ["source", "lead source", "origin"] },
  { key: "notes", label: "Notes", hints: ["note", "notes", "comment", "comments"] },
];
const guess = (h: string) => { const s = h.toLowerCase().trim(); return FIELDS.slice(1).find((f) => f.hints.some((x) => s === x || s.includes(x)))?.key ?? "skip"; };
const digits = (p?: string) => (p || "").replace(/\D/g, "").slice(-10);

export function ImportCustomers() {
  const { user } = useAuth();
  const [rows, setRows] = useState<string[][]>([]);
  const [map, setMap] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ added: number; skipped: number } | null>(null);
  const header = rows[0] ?? []; const body = rows.slice(1);

  const onFile = async (f: File | undefined) => {
    if (!f) return; const text = await f.text(); const r = parseCsv(text);
    if (r.length < 2) return toast.error("That file has no data rows");
    setRows(r); setMap(r[0].map(guess)); setDone(null);
  };

  const preview = useMemo(() => body.slice(0, 5).map((r) => build(r, map)), [body, map]);
  function build(r: string[], m: string[]): Partial<Customer> {
    const c: any = {};
    m.forEach((k, i) => { const v = (r[i] ?? "").trim(); if (!v || k === "skip") return; if (k === "fullName") { const p = v.split(/\s+/); c.firstName = c.firstName || p[0]; c.lastName = c.lastName || p.slice(1).join(" "); } else c[k] = v; });
    if (c.state) c.state = String(c.state).toUpperCase().slice(0, 2);
    return c;
  }

  const run = async () => {
    if (!map.some((k) => k === "firstName" || k === "fullName")) return toast.error("Map a name column first");
    setBusy(true);
    try {
      await refresh("customers").catch(() => {});
      const existing = list("customers");
      const seenPhone = new Set(existing.map((c) => digits(c.phone)).filter((d) => d.length === 10));
      const seenEmail = new Set(existing.map((c) => (c.email || "").toLowerCase()).filter(Boolean));
      let added = 0, skipped = 0;
      for (const r of body) {
        const c = build(r, map);
        if (!c.firstName) { skipped++; continue; }
        const d = digits(c.phone), e = (c.email || "").toLowerCase();
        if ((d.length === 10 && seenPhone.has(d)) || (e && seenEmail.has(e))) { skipped++; continue; }
        await insert("customers", { ...c, source: c.source || "Import", ownerId: user?.id } as any);
        if (d.length === 10) seenPhone.add(d); if (e) seenEmail.add(e); added++;
      }
      logActivity("import", "customer", undefined, `${added} customers imported, ${skipped} skipped`, user?.id);
      setDone({ added, skipped }); setRows([]); toast.success(`Imported ${added} customers`);
    } catch (e: any) { toast.error(e.message || "Import failed"); } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Import customers</CardTitle><CardDescription>Bring in your existing customer list from a DMS, CRM or spreadsheet (CSV). Duplicates by phone or email are skipped automatically.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        {done && <p className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Imported {done.added} customers, skipped {done.skipped} (blank or already on file).</p>}
        <input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} className="block text-sm" />
        {rows.length > 1 && (<>
          <p className="text-sm text-muted-foreground">{body.length} rows found. Tell us what each column is:</p>
          <div className="grid md:grid-cols-3 gap-2">
            {header.map((h, i) => <div key={i} className="space-y-1"><Label className="text-xs truncate block" title={h}>{h || `Column ${i + 1}`}</Label><Select value={map[i]} onValueChange={(v) => setMap((m) => m.map((x, j) => (j === i ? v : x)))}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent>{FIELDS.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}</SelectContent></Select></div>)}
          </div>
          <div className="rounded-lg border overflow-x-auto"><table className="w-full text-xs"><thead className="bg-muted/50"><tr><th className="px-2 py-1 text-left">Name</th><th className="px-2 py-1 text-left">Phone</th><th className="px-2 py-1 text-left">Email</th><th className="px-2 py-1 text-left">City</th><th className="px-2 py-1 text-left">Source</th></tr></thead><tbody>{preview.map((c, i) => <tr key={i} className="border-t"><td className="px-2 py-1">{c.firstName} {c.lastName}</td><td className="px-2 py-1">{c.phone}</td><td className="px-2 py-1">{c.email}</td><td className="px-2 py-1">{c.city}{c.state ? `, ${c.state}` : ""}</td><td className="px-2 py-1">{c.source || "Import"}</td></tr>)}</tbody></table></div>
          <Button onClick={run} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />} Import {body.length} customers</Button>
        </>)}
      </CardContent>
    </Card>
  );
}
