import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LogOut, Store } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useLocations, useStoreFilter, setStoreFilter } from "@/lib/locations";
import { useAuth, ROLE_LABELS } from "@/lib/auth";
import { useTenant } from "@/lib/tenant";
import { MODULES, GROUPS } from "@/lib/modules";
import { useCollection } from "@/lib/store";

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
  const tasks = useCollection("tasks");
  const leads = useCollection("leads");
  const appts = useCollection("appointments");
  const nowIso = new Date().toISOString();
  const today = new Date().toDateString();
  const badges: Record<string, number> = {
    "/tasks": tasks.filter((t) => t.status === "open" && (!t.assignedTo || t.assignedTo === user?.id)).length,
    "/leads": leads.filter((l) => l.stage === "new").length,
    "/appointments": appts.filter((a) => new Date(a.startsAt).toDateString() === today && a.startsAt >= nowIso && a.status !== "cancelled").length,
  };
  const visible = MODULES.filter((m) => user && m.roles.includes(user.role));

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border/50 p-4">
        <Link to="/" className="block hover:opacity-80 transition-opacity" onClick={() => setOpenMobile(false)}>
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
      <SidebarContent>
        {GROUPS.map((g) => {
          const items = visible.filter((m) => m.group === g);
          if (!items.length) return null;
          return (
            <SidebarGroup key={g}>
              <SidebarGroupLabel>{g}</SidebarGroupLabel>
              <SidebarGroupContent><SidebarMenu>
                {items.map((m) => {
                  const active = m.path === "/" ? location.pathname === "/" : location.pathname.startsWith(m.path);
                  return (
                    <SidebarMenuItem key={m.path}>
                      <SidebarMenuButton asChild isActive={active}><Link to={m.path} onClick={() => setOpenMobile(false)}><m.icon className="h-4 w-4" /> <span>{m.label}</span></Link></SidebarMenuButton>
                      {badges[m.path] > 0 && <SidebarMenuBadge className="bg-primary text-primary-foreground rounded-full text-[10px] px-1.5 min-w-[20px] flex items-center justify-center">{badges[m.path]}</SidebarMenuBadge>}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu></SidebarGroupContent>
            </SidebarGroup>
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
