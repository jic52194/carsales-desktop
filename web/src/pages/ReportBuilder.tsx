import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Download, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useCollection, get, fullName, logActivity } from "@/lib/store";
import { useInventory, getVehicle, vTitle, vDaysInStock } from "@/lib/inventory";
import { useRecords, addRecord, removeRecord, type Rec } from "@/lib/records";
import { useAuth, listUsers } from "@/lib/auth";
import { downloadCsv, stamp } from "@/lib/csv";

type Dataset = "customers" | "leads" | "deals" | "vehicles" | "appointments" | "tasks";
type FType = "string" | "number" | "date";
type Op = "contains" | "equals" | "gt" | "lt" | "between";
interface Col { key: string; label: string; type: FType; get?: (r: any) => any }
interface Filter { field: string; op: Op; value: string; value2?: string }
/** Saved definition — records kind "report". */
export interface ReportDef { name: string; dataset: Dataset; columns: string[]; filters: Filter[]; sort: { field: string; dir: "asc" | "desc" } }

const userName = (id?: string) => listUsers().find((u) => u.id === id)?.fullName || "";
const cust = (id?: string) => (id ? fullName(get("customers", id)) : "");
const BASE: Col[] = [{ key: "createdAt", label: "Created", type: "date" }, { key: "updatedAt", label: "Updated", type: "date" }];
const COLUMNS: Record<Dataset, Col[]> = {
  customers: [{ key: "firstName", label: "First name", type: "string" }, { key: "lastName", label: "Last name", type: "string" }, { key: "phone", label: "Phone", type: "string" }, { key: "email", label: "Email", type: "string" }, { key: "city", label: "City", type: "string" }, { key: "state", label: "State", type: "string" }, { key: "zip", label: "Zip", type: "string" }, { key: "source", label: "Source", type: "string" }, { key: "owner", label: "Owner", type: "string", get: (r) => userName(r.ownerId) }, ...BASE],
  leads: [{ key: "customer", label: "Customer", type: "string", get: (r) => cust(r.customerId) }, { key: "stage", label: "Stage", type: "string" }, { key: "source", label: "Source", type: "string" }, { key: "assigned", label: "Assigned to", type: "string", get: (r) => userName(r.assignedTo) }, { key: "vehicle", label: "Vehicle", type: "string", get: (r) => vehicleTitle(r.vehicleId) }, { key: "notes", label: "Notes", type: "string" }, ...BASE],
  deals: [{ key: "customer", label: "Customer", type: "string", get: (r) => cust(r.customerId) }, { key: "status", label: "Status", type: "string" }, { key: "salesperson", label: "Salesperson", type: "string", get: (r) => userName(r.salespersonId) }, { key: "vehicle", label: "Vehicle", type: "string", get: (r) => vehicleTitle(r.vehicleId) }, { key: "sellingPrice", label: "Selling price", type: "number" }, { key: "cashDown", label: "Cash down", type: "number" }, { key: "tradeAllowance", label: "Trade allowance", type: "number" }, { key: "amountFinanced", label: "Amount financed", type: "number" }, { key: "termMonths", label: "Term", type: "number" }, { key: "apr", label: "APR", type: "number" }, { key: "monthlyPayment", label: "Payment", type: "number" }, { key: "frontEndGross", label: "Front gross", type: "number" }, { key: "backEndGross", label: "Back gross", type: "number" }, { key: "totalGross", label: "Total gross", type: "number" }, { key: "notes", label: "Notes", type: "string" }, ...BASE],
  vehicles: [{ key: "stockNumber", label: "Stock #", type: "string" }, { key: "vin", label: "VIN", type: "string" }, { key: "year", label: "Year", type: "number" }, { key: "make", label: "Make", type: "string" }, { key: "model", label: "Model", type: "string" }, { key: "trim", label: "Trim", type: "string" }, { key: "bodyStyle", label: "Body", type: "string" }, { key: "mileage", label: "Mileage", type: "number" }, { key: "price", label: "Price", type: "number" }, { key: "cost", label: "Cost", type: "number" }, { key: "exteriorColor", label: "Exterior", type: "string" }, { key: "status", label: "Status", type: "string" }, { key: "source", label: "Source", type: "string" }, { key: "daysInStock", label: "Days in stock", type: "number", get: (r) => vDaysInStock(r) }, { key: "addedAt", label: "Added", type: "date" }, { key: "updatedAt", label: "Updated", type: "date" }],
  appointments: [{ key: "customer", label: "Customer", type: "string", get: (r) => cust(r.customerId) }, { key: "type", label: "Type", type: "string" }, { key: "status", label: "Status", type: "string" }, { key: "startsAt", label: "Starts", type: "date" }, { key: "assigned", label: "Assigned to", type: "string", get: (r) => userName(r.assignedTo) }, { key: "vehicle", label: "Vehicle", type: "string", get: (r) => vehicleTitle(r.vehicleId) }, { key: "notes", label: "Notes", type: "string" }, ...BASE],
  tasks: [{ key: "title", label: "Title", type: "string" }, { key: "status", label: "Status", type: "string" }, { key: "priority", label: "Priority", type: "string" }, { key: "dueAt", label: "Due", type: "date" }, { key: "assigned", label: "Assigned to", type: "string", get: (r) => userName(r.assignedTo) }, { key: "relatedType", label: "Related to", type: "string" }, { key: "notes", label: "Notes", type: "string" }, ...BASE],
};
function vehicleTitle(id?: string) { const v = id ? getVehicle(id) : undefined; return v ? `${vTitle(v)} #${v.stockNumber}` : ""; }
const DEFAULT_COLS: Record<Dataset, string[]> = { customers: ["firstName", "lastName", "phone", "email", "source", "createdAt"], leads: ["customer", "stage", "source", "assigned", "vehicle", "createdAt"], deals: ["customer", "status", "salesperson", "vehicle", "sellingPrice", "totalGross", "updatedAt"], vehicles: ["stockNumber", "year", "make", "model", "mileage", "price", "status", "daysInStock"], appointments: ["customer", "type", "status", "startsAt", "assigned"], tasks: ["title", "status", "priority", "dueAt", "assigned"] };
const OPS: Record<FType, { v: Op; l: string }[]> = { string: [{ v: "contains", l: "contains" }, { v: "equals", l: "equals" }], number: [{ v: "equals", l: "=" }, { v: "gt", l: ">" }, { v: "lt", l: "<" }, { v: "between", l: "between" }], date: [{ v: "gt", l: "after" }, { v: "lt", l: "before" }, { v: "between", l: "between" }] };
const cell = (c: Col, r: any) => (c.get ? c.get(r) : r[c.key]);
const show = (c: Col, v: any) => (v == null || v === "" ? "—" : c.type === "date" ? new Date(v).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : c.type === "number" ? Number(v).toLocaleString() : String(v));

export default function ReportBuilder() {
  const { user } = useAuth();
  const customers = useCollection("customers"); const leads = useCollection("leads"); const deals = useCollection("deals");
  const appointments = useCollection("appointments"); const tasks = useCollection("tasks"); const vehicles = useInventory();
  const saved = useRecords<ReportDef>("report");
  const [def, setDef] = useState<ReportDef>({ name: "", dataset: "leads", columns: DEFAULT_COLS.leads, filters: [], sort: { field: "createdAt", dir: "desc" } });
  const [toDelete, setToDelete] = useState<Rec<ReportDef> | null>(null);
  const cols = COLUMNS[def.dataset];
  const selected = cols.filter((c) => def.columns.includes(c.key));
  const source: any[] = { customers, leads, deals, vehicles, appointments, tasks }[def.dataset];

  const rows = useMemo(() => {
    const colOf = (k: string) => cols.find((c) => c.key === k);
    const pass = (r: any) => def.filters.every((f) => {
      const c = colOf(f.field); if (!c || f.value === "") return true;
      const v = cell(c, r);
      if (c.type === "string") { const s = String(v ?? "").toLowerCase(), q = f.value.toLowerCase(); return f.op === "equals" ? s === q : s.includes(q); }
      const n = c.type === "date" ? (v ? new Date(v).getTime() : NaN) : Number(v);
      const a = c.type === "date" ? new Date(f.value).getTime() : Number(f.value), b = c.type === "date" ? new Date((f.value2 || f.value) + "T23:59:59").getTime() : Number(f.value2 ?? f.value);
      if (isNaN(n)) return false;
      return f.op === "equals" ? n === a : f.op === "gt" ? n > a : f.op === "lt" ? n < a : n >= a && n <= b;
    });
    const sc = colOf(def.sort.field);
    const out = source.filter(pass);
    if (sc) out.sort((x, y) => { const a = cell(sc, x), b = cell(sc, y); const r = sc.type === "string" ? String(a ?? "").localeCompare(String(b ?? "")) : (sc.type === "date" ? new Date(a || 0).getTime() - new Date(b || 0).getTime() : Number(a ?? 0) - Number(b ?? 0)); return def.sort.dir === "asc" ? r : -r; });
    return out;
  }, [source, def, cols]);

  const setDataset = (d: Dataset) => setDef({ ...def, dataset: d, columns: DEFAULT_COLS[d], filters: [], sort: { field: COLUMNS[d].some((c) => c.key === "createdAt") ? "createdAt" : COLUMNS[d][0].key, dir: "desc" } });
  const toggleCol = (k: string) => setDef({ ...def, columns: def.columns.includes(k) ? def.columns.filter((x) => x !== k) : [...def.columns, k] });
  const setFilter = (i: number, patch: Partial<Filter>) => setDef({ ...def, filters: def.filters.map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  const addFilter = () => setDef({ ...def, filters: [...def.filters, { field: cols[0].key, op: OPS[cols[0].type][0].v, value: "" }] });

  const save = async () => {
    if (!def.name.trim()) return toast.error("Give the report a name");
    if (!def.columns.length) return toast.error("Pick at least one column");
    try { const r = await addRecord<ReportDef>("report", { ...def, name: def.name.trim() }, user?.id); logActivity("create", "report", r.id, def.name, user?.id); toast.success("Report saved"); } catch (e: any) { toast.error(e.message || "Could not save"); }
  };
  const del = async () => { if (!toDelete) return; try { await removeRecord("report", toDelete.id); toast.success("Report deleted"); } catch (e: any) { toast.error(e.message); } setToDelete(null); };
  const exportCsv = () => downloadCsv(`${def.name || def.dataset}-${stamp()}`, rows.map((r) => Object.fromEntries(selected.map((c) => [c.label, cell(c, r) ?? ""]))));

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div><h1 className="text-3xl font-black">Report Builder</h1><p className="text-muted-foreground">Pick a dataset, columns and filters. Save definitions your team can re-run; export to CSV any time.</p></div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-base">Definition</CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Dataset</Label><Select value={def.dataset} onValueChange={(v) => setDataset(v as Dataset)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(COLUMNS) as Dataset[]).map((d) => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Report name</Label><Input value={def.name} onChange={(e) => setDef({ ...def, name: e.target.value })} placeholder="e.g. Aged units over $20k" /></div>
          </div>
          <div className="space-y-1"><Label>Columns</Label><div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">{cols.map((c) => <label key={c.key} className="flex items-center gap-1.5 cursor-pointer"><Checkbox checked={def.columns.includes(c.key)} onCheckedChange={() => toggleCol(c.key)} />{c.label}</label>)}</div></div>
          <div className="space-y-2"><div className="flex items-center justify-between"><Label>Filters</Label><Button size="sm" variant="outline" onClick={addFilter}><Plus className="h-3 w-3 mr-1" /> Add filter</Button></div>
            {def.filters.length === 0 && <p className="text-xs text-muted-foreground">No filters — all {source.length} rows.</p>}
            {def.filters.map((f, i) => { const c = cols.find((x) => x.key === f.field) || cols[0]; const inputType = c.type === "date" ? "date" : c.type === "number" ? "number" : "text"; return (
              <div key={i} className="grid grid-cols-2 sm:grid-cols-[1fr_auto_1fr_1fr_auto] gap-2 items-center">
                <Select value={f.field} onValueChange={(v) => { const nc = cols.find((x) => x.key === v)!; setFilter(i, { field: v, op: OPS[nc.type][0].v, value: "", value2: "" }); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{cols.map((x) => <SelectItem key={x.key} value={x.key}>{x.label}</SelectItem>)}</SelectContent></Select>
                <Select value={f.op} onValueChange={(v) => setFilter(i, { op: v as Op })}><SelectTrigger className="w-full sm:w-28"><SelectValue /></SelectTrigger><SelectContent>{OPS[c.type].map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent></Select>
                <Input type={inputType} value={f.value} onChange={(e) => setFilter(i, { value: e.target.value })} placeholder="value" />
                {f.op === "between" ? <Input type={inputType} value={f.value2 || ""} onChange={(e) => setFilter(i, { value2: e.target.value })} placeholder="and" /> : <span className="hidden sm:block" />}
                <Button size="icon" variant="ghost" onClick={() => setDef({ ...def, filters: def.filters.filter((_, j) => j !== i) })}><X className="h-4 w-4" /></Button>
              </div>); })}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:max-w-md">
            <div className="space-y-1"><Label>Sort by</Label><Select value={def.sort.field} onValueChange={(v) => setDef({ ...def, sort: { ...def.sort, field: v } })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{cols.map((x) => <SelectItem key={x.key} value={x.key}>{x.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Direction</Label><Select value={def.sort.dir} onValueChange={(v) => setDef({ ...def, sort: { ...def.sort, dir: v as any } })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="asc">Ascending</SelectItem><SelectItem value="desc">Descending</SelectItem></SelectContent></Select></div>
          </div>
          <div className="flex flex-wrap gap-2"><Button onClick={save}><Save className="h-4 w-4 mr-1" /> Save report</Button><Button variant="outline" onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4 mr-1" /> Export CSV ({rows.length})</Button></div>
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-base">Saved reports</CardTitle><CardDescription>Shared with everyone at the dealership</CardDescription></CardHeader><CardContent className="divide-y">
          {saved.length === 0 && <p className="text-sm text-muted-foreground py-2">Nothing saved yet. Build a report and click Save.</p>}
          {saved.map((r) => <div key={r.id} className="py-2 flex items-center justify-between gap-2"><button className="text-left text-sm hover:text-primary" onClick={() => setDef({ ...r.data, filters: r.data.filters || [] })}><span className="font-medium">{r.data.name}</span><span className="block text-xs text-muted-foreground capitalize">{r.data.dataset} · {r.data.columns.length} columns · {(r.data.filters || []).length} filters</span></button><Button size="icon" variant="ghost" onClick={() => setToDelete(r)}><Trash2 className="h-4 w-4" /></Button></div>)}
        </CardContent></Card>
      </div>

      <Card><CardHeader className="flex flex-row items-center justify-between space-y-0"><div><CardTitle className="text-base">Preview</CardTitle><CardDescription>{rows.length} matching rows{rows.length > 200 ? " · showing first 200" : ""}</CardDescription></div><Badge variant="secondary" className="capitalize">{def.dataset}</Badge></CardHeader><CardContent className="overflow-x-auto">
        {selected.length === 0 ? <p className="text-sm text-muted-foreground">Pick at least one column.</p> : rows.length === 0 ? <p className="text-sm text-muted-foreground">No {def.dataset} match these filters.</p> : (
          <table className="w-full text-sm"><thead><tr className="text-left text-xs text-muted-foreground border-b">{selected.map((c) => <th key={c.key} className="py-2 pr-3 whitespace-nowrap">{c.label}</th>)}</tr></thead>
            <tbody>{rows.slice(0, 200).map((r) => <tr key={r.id} className="border-b last:border-0">{selected.map((c) => <td key={c.key} className="py-1.5 pr-3 whitespace-nowrap max-w-[16rem] truncate">{show(c, cell(c, r))}</td>)}</tr>)}</tbody></table>
        )}
      </CardContent></Card>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete "{toDelete?.data.name}"?</AlertDialogTitle><AlertDialogDescription>This removes the saved definition for everyone. Your data is not affected.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={del}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
