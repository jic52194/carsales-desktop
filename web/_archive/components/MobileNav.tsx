import { NavLink } from "react-router-dom";
import { Home, Car, Users, ListTodo, Calendar, FileText, Target, FileCheck2, Wrench, Truck, LayoutDashboard, LineChart, Activity, ShieldCheck, Receipt, Briefcase, MapPin, Settings, LifeBuoy, DollarSign, Camera, ScanLine } from "lucide-react";
import { useAuth, Role } from "@/lib/auth";

const ROLE_NAV_ITEMS: Record<Role, any[]> = {
  owner: [
    { to: "/command-center", icon: LayoutDashboard, label: "Command" },
    { to: "/", icon: Home, label: "Desking" },
    { to: "/crm", icon: Users, label: "CRM" },
    { to: "/inventory", icon: Car, label: "Inventory" },
    { to: "/reports", icon: LineChart, label: "Reports" },
  ],
  admin: [
    { to: "/command-center", icon: LayoutDashboard, label: "Command" },
    { to: "/", icon: Home, label: "Desking" },
    { to: "/crm", icon: Users, label: "CRM" },
    { to: "/inventory", icon: Car, label: "Inventory" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ],
  manager: [
    { to: "/command-center", icon: LayoutDashboard, label: "Command" },
    { to: "/", icon: Home, label: "Desking" },
    { to: "/crm", icon: Users, label: "CRM" },
    { to: "/inventory", icon: Car, label: "Inventory" },
    { to: "/metrics", icon: LineChart, label: "Metrics" },
  ],
  sales: [
    { to: "/", icon: Home, label: "Desking" },
    { to: "/crm", icon: Users, label: "CRM" },
    { to: "/deal-rescue", icon: LifeBuoy, label: "Rescue" },
    { to: "/video-messages", icon: Camera, label: "Videos" },
    { to: "/tasks", icon: ListTodo, label: "Tasks" },
  ],
  f_and_i: [
    { to: "/", icon: Home, label: "Desking" },
    { to: "/deal-jacket", icon: Briefcase, label: "Deal Jacket" },
    { to: "/contracts", icon: FileText, label: "Contracts" },
    { to: "/lenders", icon: Users, label: "Lenders" },
    { to: "/accounting", icon: ShieldCheck, label: "Acct" },
  ],
  service: [
    { to: "/service", icon: Wrench, label: "Service" },
    { to: "/service-scheduler", icon: Calendar, label: "Scheduler" },
    { to: "/parts-department", icon: Target, label: "Parts" },
    { to: "/tasks", icon: ListTodo, label: "Tasks" },
  ],
  technician: [
    { to: "/technician-bay", icon: Wrench, label: "Tech Bay" },
    { to: "/parts-department", icon: Target, label: "Parts" },
    { to: "/tasks", icon: ListTodo, label: "Tasks" },
  ],
  porter: [
    { to: "/lot-management", icon: MapPin, label: "Lot Mgmt" },
    { to: "/tasks", icon: ListTodo, label: "Tasks" },
    { to: "/inventory", icon: Car, label: "Inventory" },
  ],
  inventory: [
    { to: "/inventory", icon: Car, label: "Inventory" },
    { to: "/appraisals", icon: FileCheck2, label: "Appraisals" },
    { to: "/recon", icon: Wrench, label: "Recon" },
    { to: "/auctions", icon: Target, label: "Auctions" },
    { to: "/wholesale", icon: Truck, label: "Wholesale" },
  ],
  web: [
    { to: "/website", icon: LayoutDashboard, label: "Website" },
    { to: "/customer-portal", icon: Users, label: "Portal" },
  ]
};

export function MobileNav() {
  const { role } = useAuth();
  
  const links = ROLE_NAV_ITEMS[role] || ROLE_NAV_ITEMS['sales'];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border/60 flex justify-around overflow-x-auto snap-x scrollbar-hide h-[88px] pb-[env(safe-area-inset-bottom,16px)] z-40 px-2 shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.2)]">
      {links.map((link) => (
        <NavLink
          key={`${link.to}-${link.label}`}
          to={link.to}
          end={link.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-w-[64px] max-w-[88px] shrink-0 snap-start h-full px-1 transition-all active:scale-95 ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`p-2.5 rounded-2xl transition-all duration-300 flex items-center justify-center ${isActive ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110 -translate-y-1' : 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                <link.icon className="w-6 h-6" />
              </div>
              <span className={`text-[11px] mt-1.5 font-medium transition-all leading-tight text-center ${isActive ? 'font-bold' : 'opacity-70'}`} style={{ maxWidth: 80 }}>
                {link.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
