import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Calculator, Calendar, Car, Clock, Kanban, Plus, Search, UserPlus, Users } from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { useAuth } from "@/lib/auth";
import { useCollection, fullName } from "@/lib/store";
import { useInventory, vTitle } from "@/lib/inventory";
import { modulesFor, moduleForPath, MODULES } from "@/lib/modules";

const OPEN_EVT = "cso:open-command";
const RECENT_KEY = "cso:recent-pages";
export const openCommandPalette = () => window.dispatchEvent(new Event(OPEN_EVT));

function readRecent(): string[] { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; } }

/** Trigger button for the top bar (Search ⌘K). */
export function CommandPaletteButton() {
  const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <button type="button" onClick={openCommandPalette} title="Search (Ctrl/⌘ K)" aria-label="Search"
      className="flex items-center gap-2 h-9 px-2.5 md:px-3 text-sm text-muted-foreground bg-muted/70 hover:bg-muted rounded-lg border border-border/50 transition-colors">
      <Search className="h-4 w-4" />
      <span className="hidden lg:inline">Search…</span>
      <kbd className="hidden lg:inline-flex pointer-events-none h-5 select-none items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[10px] font-medium">{mac ? "⌘" : "Ctrl"} K</kbd>
    </button>
  );
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const customers = useCollection("customers");
  const inventory = useInventory();
  const [recent, setRecent] = useState<string[]>(readRecent);
  const [q, setQ] = useState("");
  useEffect(() => { if (!open) setQ(""); }, [open]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen((o) => !o); } };
    const openIt = () => setOpen(true);
    document.addEventListener("keydown", down);
    window.addEventListener(OPEN_EVT, openIt);
    return () => { document.removeEventListener("keydown", down); window.removeEventListener(OPEN_EVT, openIt); };
  }, []);

  // Remember recently visited module pages.
  useEffect(() => {
    const m = moduleForPath(location.pathname);
    if (!m) return;
    setRecent((r) => { const next = [m.path, ...r.filter((p) => p !== m.path)].slice(0, 6); try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ } return next; });
  }, [location.pathname]);

  const pages = modulesFor(user?.role);
  const can = (path: string) => pages.some((m) => m.path === path);
  const recentModules = useMemo(() => recent.map((p) => pages.find((m) => m.path === p)).filter((m): m is (typeof MODULES)[number] => !!m && m.path !== moduleForPath(location.pathname)?.path).slice(0, 5), [recent, pages, location.pathname]);

  // Pre-filter records so big rosters stay fast; nothing is listed until the user types.
  const needle = q.trim().toLowerCase();
  const digits = needle.replace(/\D/g, "");
  const custHits = useMemo(() => {
    if (needle.length < 2) return [];
    return customers.filter((c) => `${fullName(c)} ${c.email ?? ""}`.toLowerCase().includes(needle) || (digits.length >= 3 && (c.phone ?? "").replace(/\D/g, "").includes(digits))).slice(0, 25);
  }, [customers, needle, digits]);
  const vehHits = useMemo(() => {
    if (needle.length < 2) return [];
    return inventory.filter((v) => `${vTitle(v)} ${v.stockNumber ?? ""} ${v.vin ?? ""} ${v.exteriorColor ?? ""}`.toLowerCase().includes(needle)).slice(0, 25);
  }, [inventory, needle]);

  const go = (to: string) => { setOpen(false); navigate(to); };

  const actions = [
    { label: "New customer", to: "/customers?new=1", icon: UserPlus, path: "/customers" },
    { label: "New lead", to: "/leads", icon: Kanban, path: "/leads" },
    { label: "New deal", to: "/desking", icon: Calculator, path: "/desking" },
    { label: "Book appointment", to: "/appointments", icon: Calendar, path: "/appointments" },
    { label: "Add vehicle", to: "/inventory", icon: Plus, path: "/inventory" },
  ].filter((a) => can(a.path));

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput value={q} onValueChange={setQ} placeholder="Search pages, customers, vehicles, actions…" />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>No results found.</CommandEmpty>
        {recentModules.length > 0 && (
          <>
            <CommandGroup heading="Recent">
              {recentModules.map((m) => (
                <CommandItem key={`r:${m.path}`} value={`recent ${m.label} ${m.group}`} onSelect={() => go(m.path)}>
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" /> <span>{m.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{m.group}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        {actions.length > 0 && (
          <>
            <CommandGroup heading="Actions">
              {actions.map((a) => (
                <CommandItem key={a.label} value={`action ${a.label}`} onSelect={() => go(a.to)}>
                  <a.icon className="mr-2 h-4 w-4 text-primary" /> <span>{a.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        <CommandGroup heading="Pages">
          {pages.map((m) => (
            <CommandItem key={m.path} value={`page ${m.label} ${m.group} ${m.path}`} onSelect={() => go(m.path)}>
              <m.icon className="mr-2 h-4 w-4 text-muted-foreground" /> <span>{m.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">{m.group}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        {can("/customers") && custHits.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Customers">
              {custHits.map((c) => (
                <CommandItem key={c.id} value={`customer ${fullName(c)} ${c.phone ?? ""} ${c.email ?? ""} ${q} ${c.id}`} onSelect={() => go(`/customers/${c.id}`)}>
                  <Users className="mr-2 h-4 w-4 text-muted-foreground" /> <span className="truncate">{fullName(c)}</span>
                  <span className="ml-auto text-xs text-muted-foreground truncate max-w-[45%]">{c.phone || c.email || ""}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {vehHits.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Vehicles">
              {vehHits.map((v) => (
                <CommandItem key={v.id} value={`vehicle ${vTitle(v)} ${v.stockNumber ?? ""} ${v.vin ?? ""} ${q} ${v.id}`} onSelect={() => go(`/inventory/${v.id}`)}>
                  <Car className="mr-2 h-4 w-4 text-muted-foreground" /> <span className="truncate">{vTitle(v)}</span>
                  <span className="ml-auto text-xs text-muted-foreground font-mono">{v.stockNumber ? `#${v.stockNumber}` : v.vin ? v.vin.slice(-8) : ""}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
