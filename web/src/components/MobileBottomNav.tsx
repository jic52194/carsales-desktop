import { NavLink } from "react-router-dom";
import { Car, Home, Inbox, Menu, Users, type LucideIcon } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { modulesFor } from "@/lib/modules";
import { useNavBadges } from "@/components/AppSidebar";

/** Fixed bottom tab bar on phones. "More" opens the full sidebar. */
export function MobileBottomNav() {
  const { user } = useAuth();
  const { setOpenMobile } = useSidebar();
  const badges = useNavBadges();
  const allowed = new Set(modulesFor(user?.role).map((m) => m.path));
  const tabs: { to: string; label: string; icon: LucideIcon; badge?: number }[] = [
    { to: "/", label: "Home", icon: Home },
    { to: "/customers", label: "CRM", icon: Users },
    { to: "/inventory", label: "Inventory", icon: Car },
    { to: "/inbox", label: "Inbox", icon: Inbox, badge: badges["/inbox"] },
  ].filter((t) => allowed.has(t.to));

  const cell = "relative flex flex-1 flex-col items-center justify-center gap-0.5 h-full min-w-0 text-[11px] font-medium transition-colors active:scale-95";
  return (
    <nav aria-label="Primary" className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/60 shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.2)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-16 px-1">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.to === "/"} className={({ isActive }) => `${cell} ${isActive ? "text-primary" : "text-muted-foreground"}`}>
            {({ isActive }) => (
              <>
                <span className={`relative flex items-center justify-center h-8 w-12 rounded-2xl transition-all ${isActive ? "bg-primary/15" : ""}`}>
                  <t.icon className="h-5 w-5" />
                  {!!t.badge && <span className="absolute -top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-4 text-center">{t.badge > 9 ? "9+" : t.badge}</span>}
                </span>
                <span className={isActive ? "font-bold" : ""}>{t.label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button type="button" onClick={() => setOpenMobile(true)} className={`${cell} text-muted-foreground`} aria-label="Open menu">
          <span className="flex items-center justify-center h-8 w-12 rounded-2xl"><Menu className="h-5 w-5" /></span>
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
