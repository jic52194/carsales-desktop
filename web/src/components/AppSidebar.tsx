import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuAction, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, LogOut, Star, Store } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useLocations, useStoreFilter, setStoreFilter } from "@/lib/locations";
import { useAuth, ROLE_LABELS } from "@/lib/auth";
import { useTenant } from "@/lib/tenant";
import { GROUPS, modulesFor, moduleForPath, type Module } from "@/lib/modules";
import { useCollection } from "@/lib/store";
import { useRecords } from "@/lib/records";

// ---------- shared, real-data badge counts (sidebar, bottom nav) ----------

interface MessageData { customerId?: string; direction?: string; at?: string }
export const isInbound = (d?: string) => d === "in" || d === "inbound";

/** Customers whose latest inbound message is newer than the latest outbound one. */
export function useUnansweredCustomers(): Map<string, string> {
  const messages = useRecords<MessageData>("message");
  return useMemo(() => {
    const lastIn = new Map<string, string>(); const lastOut = new Map<string, string>();
    for (const m of messages) {
      const cid = m.data?.customerId; if (!cid) continue;
      const at = m.data.at || m.createdAt;
      const map = isInbound(m.data.direction) ? lastIn : lastOut;
      if (!map.has(cid) || (map.get(cid) as string) < at) map.set(cid, at);
    }
    const out = new Map<string, string>();
    for (const [cid, at] of lastIn) if (!lastOut.has(cid) || (lastOut.get(cid) as string) < at) out.set(cid, at);
    return out;
  }, [messages]);
}

export function useNavBadges(): Record<string, number> {
  const { user } = useAuth();
  const tasks = useCollection("tasks");
  const leads = useCollection("leads");
  const appts = useCollection("appointments");
  const deals = useCollection("deals");
  const unanswered = useUnansweredCustomers();
  // Re-evaluate time-based counts once a minute.
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 60_000); return () => clearInterval(t); }, []);
  return useMemo(() => {
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const today = new Date(now).toDateString();
    return {
      "/tasks": tasks.filter((t) => t.status === "open" && (!t.assignedTo || t.assignedTo === user?.id)).length,
      "/leads": leads.filter((l) => l.stage === "new").length,
      "/appointments": appts.filter((a) => new Date(a.startsAt).toDateString() === today && a.startsAt >= nowIso && a.status !== "cancelled").length,
      "/inbox": unanswered.size,
      "/follow-up": leads.filter((l) => l.stage === "new" && now - new Date(l.createdAt).getTime() > 15 * 60_000).length,
      "/rescue": deals.filter((d) => (d.status === "working" || d.status === "pending_approval") && now - new Date(d.updatedAt).getTime() > 3 * 86_400_000).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, leads, appts, deals, unanswered, user?.id, tick]);
}

const BADGE_TONE: Record<string, string> = {
  "/follow-up": "bg-emerald-500 text-white",
  "/rescue": "bg-destructive text-destructive-foreground",
  "/inbox": "bg-destructive text-destructive-foreground",
  "/tasks": "bg-destructive text-destructive-foreground",
};

// ---------- per-device preferences ----------

const GROUPS_KEY = "cso:nav-groups";
const favKey = (userId?: string) => `cso:favs:${userId ?? "anon"}`;
function readJson<T>(key: string, fallback: T): T { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; } }
function writeJson(key: string, v: unknown) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ } }

export function AppSidebar() {
  const location = useLocation();
  const { setOpenMobile } = useSidebar();
  const { user, account, viewAs, location: store, logout } = useAuth();
  const tenant = useTenant();
  const allLocations = useLocations();
  const storeFilter = useStoreFilter();
  // Owners/admins (or anyone not bound to a store) can look at one store or all of them combined.
  const canSwitch = !!user && allLocations.length > 1 && (!store || ["owner", "admin", "super_admin"].includes(user.role));
  const selected = allLocations.find((l) => l.id === storeFilter);
  // A filter left behind by another account on this device must not narrow a user who can't switch.
  useEffect(() => { if (user && !canSwitch && storeFilter) setStoreFilter(""); }, [user?.id, canSwitch, storeFilter]);
  // Store (location) branding wins over the dealership's when the user is attached to a store.
  const brandLogo = store?.logoUrl || selected?.logoUrl || tenant.logoUrl;
  const brandName = store?.brandName || selected?.brandName || tenant.name;
  const whoLabel = user ? `${ROLE_LABELS[user.role]} · ${store ? `${store.name} · ${store.brandName || tenant.name}` : "All stores"}` : "";
  const badges = useNavBadges();
  const visible = modulesFor(user?.role);
  const activeModule = moduleForPath(location.pathname);

  // Collapsed groups (persisted). The group holding the current page is always open.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => readJson(GROUPS_KEY, {}));
  const toggleGroup = (g: string, open: boolean) => setCollapsed((c) => { const next = { ...c, [g]: !open }; writeJson(GROUPS_KEY, next); return next; });

  // Favorites, per signed-in (effective) user.
  const [favs, setFavs] = useState<string[]>([]);
  useEffect(() => { setFavs(readJson<string[]>(favKey(user?.id), [])); }, [user?.id]);
  const toggleFav = (path: string) => setFavs((f) => { const next = f.includes(path) ? f.filter((p) => p !== path) : [...f, path]; writeJson(favKey(user?.id), next); return next; });
  const favModules = favs.map((p) => visible.find((m) => m.path === p)).filter(Boolean) as Module[];

  const renderItem = (m: Module, keyPrefix = "") => {
    const active = activeModule?.path === m.path;
    const count = badges[m.path] ?? 0;
    const fav = favs.includes(m.path);
    return (
      <SidebarMenuItem key={keyPrefix + m.path}>
        <SidebarMenuButton asChild isActive={active} className={count > 0 ? "pr-14" : "pr-8"}><Link to={m.path} onClick={() => setOpenMobile(false)}><m.icon className="h-4 w-4" /> <span>{m.label}</span></Link></SidebarMenuButton>
        <SidebarMenuAction showOnHover onClick={() => toggleFav(m.path)} className={count > 0 ? "right-8" : ""} title={fav ? "Remove from Favorites" : "Add to Favorites"} aria-label={fav ? `Unpin ${m.label}` : `Pin ${m.label}`}>
          <Star className={`h-3.5 w-3.5 ${fav ? "fill-amber-400 text-amber-400" : ""}`} />
        </SidebarMenuAction>
        {count > 0 && <SidebarMenuBadge className={`${BADGE_TONE[m.path] ?? "bg-primary text-primary-foreground"} rounded-full text-[10px] px-1.5 min-w-[20px] flex items-center justify-center`}>{count > 99 ? "99+" : count}</SidebarMenuBadge>}
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border/50 p-4">
        <Link to="/" className="block hover:opacity-80 transition-opacity active:scale-95" onClick={() => setOpenMobile(false)}>
          {brandLogo && <img src={brandLogo} alt={brandName} className="h-9 w-auto max-w-[180px] object-contain" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />}
          <p className="text-xs font-semibold mt-1 truncate">{brandName}</p>
        </Link>
        {canSwitch ? (
          <Select value={storeFilter || "__all"} onValueChange={(v) => setStoreFilter(v === "__all" ? "" : v)}>
            <SelectTrigger className="mt-2 h-8 text-xs" title="Which store's data to show"><Store className="h-3.5 w-3.5 mr-1.5 shrink-0 text-muted-foreground" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All stores (combined)</SelectItem>
              {allLocations.filter((l) => l.active).map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : store ? <p className="text-[11px] text-muted-foreground mt-1 truncate flex items-center gap-1"><Store className="h-3 w-3" /> {store.name}</p> : null}
      </SidebarHeader>
      <SidebarContent data-sidebar="menu">
        {favModules.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-1.5"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> Favorites</SidebarGroupLabel>
            <SidebarGroupContent><SidebarMenu>{favModules.map((m) => renderItem(m, "fav:"))}</SidebarMenu></SidebarGroupContent>
          </SidebarGroup>
        )}
        {GROUPS.map((g) => {
          const items = visible.filter((m) => m.group === g);
          if (!items.length) return null;
          const holdsActive = activeModule?.group === g;
          const open = holdsActive || !collapsed[g];
          const groupCount = items.reduce((n, m) => n + (badges[m.path] ?? 0), 0);
          return (
            <Collapsible key={g} open={open} onOpenChange={(o) => toggleGroup(g, o)} className="group/collapsible">
              <SidebarGroup className="py-1">
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="w-full flex items-center gap-1 hover:text-sidebar-foreground transition-colors" disabled={holdsActive} title={holdsActive ? undefined : open ? `Collapse ${g}` : `Expand ${g}`}>
                    <span className="flex-1 text-left">{g}</span>
                    {!open && groupCount > 0 && <span className="rounded-full bg-primary/15 text-primary text-[10px] px-1.5 tabular-nums">{groupCount > 99 ? "99+" : groupCount}</span>}
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-90"} ${holdsActive ? "opacity-30" : ""}`} />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent><SidebarMenu>{items.map((m) => renderItem(m))}</SidebarMenu></SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/50 p-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">{user?.fullName.split(" ").map((s) => s[0]).join("").slice(0, 2)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user?.fullName}</p>
            <p className="text-[11px] text-muted-foreground truncate" title={whoLabel}>{whoLabel}</p>
            {viewAs && account && <p className="text-[10px] text-amber-600 dark:text-amber-400 truncate" title={`Viewing as ${user?.fullName} via ${account.fullName}`}>via {account.fullName}</p>}
          </div>
          <Button size="icon" variant="ghost" onClick={logout} title="Sign out"><LogOut className="h-4 w-4" /></Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">Powered by CarSalesSoftware.com</p>
      </SidebarFooter>
    </Sidebar>
  );
}
