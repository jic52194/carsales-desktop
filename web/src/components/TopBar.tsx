import { Link, NavLink, useLocation } from "react-router-dom";
import { BarChart3, Calculator, Car, ChevronRight, Eye, Gauge, Keyboard, Users, type LucideIcon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenant";
import { modulesFor, moduleForPath } from "@/lib/modules";
import { CommandPaletteButton } from "@/components/CommandPalette";
import { NotificationsBell } from "@/components/NotificationsBell";
import { openShortcuts } from "@/components/KeyboardShortcuts";

const PILLS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/command", label: "Command", icon: Gauge },
  { to: "/desking", label: "Desking", icon: Calculator },
  { to: "/customers", label: "CRM", icon: Users },
  { to: "/inventory", label: "Inventory", icon: Car },
  { to: "/reports", label: "Reports", icon: BarChart3 },
];

/** Sticky app header: page title, quick-nav pills, search, notifications. */
export function TopBar() {
  const { pathname } = useLocation();
  const { user, account, location: store } = useAuth();
  const tenant = useTenant();
  const allowed = new Set(modulesFor(user?.role).map((m) => m.path));
  const pills = PILLS.filter((p) => allowed.has(p.to));
  const mod = moduleForPath(pathname);
  const sub = mod && pathname !== mod.path && pathname.startsWith(mod.path + "/") ? (pathname.endsWith("/jacket") ? "Deal Jacket" : "Details") : null;
  const brandLogo = store?.logoUrl || tenant.logoUrl;
  const brandName = store?.brandName || tenant.name;
  // "View as" lives under System Settings → Users; offered to the real (signed-in) owner/super admin.
  const canViewAs = !!account && (account.role === "owner" || account.role === "super_admin");

  return (
    <header className="shrink-0 sticky top-0 z-30 flex items-center gap-2 px-3 md:px-5 h-14 md:h-16 border-b border-border/50 bg-background/90 backdrop-blur-md">
      <SidebarTrigger className="md:hidden shrink-0" />
      {/* Mobile: brand. Desktop: group › page breadcrumb. */}
      <Link to="/" className="md:hidden flex items-center min-w-0">
        {brandLogo ? <img src={brandLogo} alt={brandName} className="h-7 w-auto max-w-[140px] object-contain" onError={(e) => { const el = e.target as HTMLImageElement; el.style.display = "none"; (el.nextSibling as HTMLElement | null)?.classList.remove("hidden"); }} /> : null}
        <span className={`font-bold truncate ${brandLogo ? "hidden" : ""}`}>{brandName}</span>
      </Link>
      <div className="hidden md:flex flex-col min-w-0 shrink">
        {mod ? (
          <>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 leading-none whitespace-nowrap">{mod.group}{sub && <><ChevronRight className="h-3 w-3" /><Link to={mod.path} className="hover:text-foreground">{mod.label.replace(/\s*\(.*\)$/, "")}</Link></>}</span>
            <span className="font-bold text-base truncate leading-tight mt-0.5" title={sub ?? mod.label}>{sub ?? mod.label.replace(/\s*\(.*\)$/, "")}</span>
          </>
        ) : <span className="font-bold truncate">{brandName}</span>}
      </div>

      <nav aria-label="Quick navigation" className="hidden lg:flex items-center gap-1 mx-auto rounded-full bg-muted/60 border border-border/50 p-1">
        {pills.map((p) => (
          <NavLink key={p.to} to={p.to} className={({ isActive }) => `flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-semibold transition-colors ${isActive ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <p.icon className="h-3.5 w-3.5" /> {p.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-1.5 ml-auto lg:ml-0 shrink-0">
        <CommandPaletteButton />
        <NotificationsBell />
        <Button variant="ghost" size="icon" className="hidden md:inline-flex h-9 w-9" onClick={openShortcuts} title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts"><Keyboard className="h-[18px] w-[18px]" /></Button>
        {canViewAs && (
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex h-8 gap-1.5 text-primary border-primary/20 bg-primary/5 hover:bg-primary/10" title="View the app as another user (System Settings → Users)">
            <Link to="/settings?tab=users"><Eye className="h-3.5 w-3.5" /><span className="hidden xl:inline">View as</span></Link>
          </Button>
        )}
      </div>
    </header>
  );
}
