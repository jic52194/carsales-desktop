import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, Role } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users, DollarSign, Car, Wrench, Globe, ShieldCheck,
  BarChart3, X, ChevronRight, Sparkles, Check, UserCircle
} from "lucide-react";
import { toast } from "sonner";

interface RoleConfig {
  role: Role;
  label: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  avatarBg: string;
  initials: string;
  persona: string;
  highlights: string[];
  landingRoute: string;
  tagline: string;
}

const ROLES: RoleConfig[] = [
  {
    role: "owner",
    label: "Owner / Executive",
    subtitle: "Full visibility. All access.",
    icon: BarChart3,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    border: "border-violet-200 dark:border-violet-800",
    avatarBg: "bg-violet-600",
    initials: "EX",
    persona: "You see everything — revenue, pipeline, staff activity, and KPIs.",
    highlights: ["Command Center", "Reports & Metrics", "Pay Plans", "HR & Payroll", "All Modules"],
    landingRoute: "/command-center",
    tagline: "See the whole dealership in one view.",
  },
  {
    role: "manager",
    label: "Sales Manager",
    subtitle: "Lead pipeline & team performance.",
    icon: Users,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800",
    avatarBg: "bg-blue-600",
    initials: "SM",
    persona: "Manage leads, desk deals, track your team, and hit your monthly numbers.",
    highlights: ["CRM & Pipeline", "Desking", "Appointments", "Spiff Board", "Reports"],
    landingRoute: "/crm",
    tagline: "Your team, your numbers, your results.",
  },
  {
    role: "sales",
    label: "Sales Associate",
    subtitle: "Leads, follow-ups & deals.",
    icon: Car,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800",
    avatarBg: "bg-emerald-600",
    initials: "SA",
    persona: "Work your leads, set appointments, and close deals from your phone.",
    highlights: ["My Tasks", "CRM Leads", "Desking Tool", "Appointments", "Inventory"],
    landingRoute: "/tasks",
    tagline: "Everything you need to close your next deal.",
  },
  {
    role: "f_and_i",
    label: "F&I Manager",
    subtitle: "Finance, compliance & deal jackets.",
    icon: DollarSign,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
    avatarBg: "bg-amber-600",
    initials: "FI",
    persona: "Present menus, structure deals, manage lenders, and stay compliant.",
    highlights: ["Deal Jacket", "F&I Menu", "Credit Apps", "Lenders", "Compliance"],
    landingRoute: "/deal-jacket",
    tagline: "Structure better deals. Stay compliant. Increase backend.",
  },
  {
    role: "service",
    label: "Service Manager",
    subtitle: "Repair orders & customer experience.",
    icon: Wrench,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200 dark:border-rose-800",
    avatarBg: "bg-rose-600",
    initials: "SV",
    persona: "Track repair orders, manage technicians, and keep customers informed.",
    highlights: ["Service & Parts", "Repair Orders", "Technician Queue", "Appointments", "Notifications"],
    landingRoute: "/service",
    tagline: "Keep the shop moving and customers coming back.",
  },
  {
    role: "technician",
    label: "Service Technician",
    subtitle: "MPIs, repair orders & time-clock.",
    icon: Wrench,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/40",
    border: "border-orange-200 dark:border-orange-800",
    avatarBg: "bg-orange-600",
    initials: "ST",
    persona: "Perform inspections, request parts, and clock time on repair orders.",
    highlights: ["Digital MPI", "Time-Clocking", "Parts Request", "Media Upload"],
    landingRoute: "/technician-bay",
    tagline: "Turn wrenches, not pages.",
  },
  {
    role: "inventory",
    label: "Inventory Manager",
    subtitle: "Vehicles, recon & lot management.",
    icon: Car,
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-50 dark:bg-cyan-950/40",
    border: "border-cyan-200 dark:border-cyan-800",
    avatarBg: "bg-cyan-600",
    initials: "IM",
    persona: "Manage your lot, track recon progress, and keep inventory market-ready.",
    highlights: ["Inventory", "Reconditioning", "Photo Studio", "Aging Inventory", "Auctions"],
    landingRoute: "/inventory",
    tagline: "Right inventory. Right price. Right time.",
  },
  {
    role: "web",
    label: "Web / Marketing",
    subtitle: "Website, listings & campaigns.",
    icon: Globe,
    color: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-50 dark:bg-pink-950/40",
    border: "border-pink-200 dark:border-pink-800",
    avatarBg: "bg-pink-600",
    initials: "WD",
    persona: "Manage listings, run campaigns, and keep the dealership's digital presence sharp.",
    highlights: ["Website CMS", "Campaigns", "Inventory Listings", "Lead Sources", "Photo Studio"],
    landingRoute: "/website",
    tagline: "Drive traffic. Convert leads. Tell the story.",
  },
  {
    role: "porter",
    label: "Lot Attendant / Porter",
    subtitle: "Lot management & tasks.",
    icon: Car,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-950/40",
    border: "border-slate-200 dark:border-slate-800",
    avatarBg: "bg-slate-600",
    initials: "LA",
    persona: "Move cars, wash vehicles, and keep the lot organized from your phone.",
    highlights: ["Lot Management", "Vehicle Washing", "Fueling", "Inventory Location"],
    landingRoute: "/lot-management",
    tagline: "Keep the lot moving and the cars shining.",
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function RoleDemoSwitcher({ isOpen, onClose }: Props) {
  const { role: currentRole, setRole } = useAuth();
  const navigate = useNavigate();
  const [hoveredRole, setHoveredRole] = useState<Role | null>(null);
  const [switching, setSwitching] = useState<Role | null>(null);

  if (!isOpen) return null;

  const handleSelectRole = (config: RoleConfig) => {
    setSwitching(config.role);
    setTimeout(() => {
      setRole(config.role);
      navigate(config.landingRoute);
      onClose();
      setSwitching(null);
      toast.success(`Switched to ${config.label} view`, {
        description: config.tagline,
        duration: 3000,
      });
    }, 400);
  };

  const previewConfig = hoveredRole
    ? ROLES.find(r => r.role === hoveredRole)
    : ROLES.find(r => r.role === currentRole);

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-3xl mx-4 mb-4 md:mb-0 bg-background rounded-2xl shadow-2xl border border-border animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-0 md:zoom-in-95 duration-300 overflow-hidden max-h-[92dvh] flex flex-col">

        {/* Header */}
        <div className="shrink-0 px-5 pt-5 pb-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-bold text-base text-foreground">Role Demo Switcher</h2>
                <p className="text-xs text-muted-foreground">See the platform from any team member's perspective</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors shrink-0"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Current Role Badge */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Currently viewing as:</span>
            <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary bg-primary/5">
              <UserCircle className="h-3 w-3" />
              {ROLES.find(r => r.role === currentRole)?.label || currentRole}
            </Badge>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col md:flex-row">

            {/* Role Grid */}
            <div className="flex-1 p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ROLES.map((config) => {
                const isActive = currentRole === config.role;
                const isSwitching = switching === config.role;
                return (
                  <button
                    key={config.role}
                    onClick={() => handleSelectRole(config)}
                    onMouseEnter={() => setHoveredRole(config.role)}
                    onMouseLeave={() => setHoveredRole(null)}
                    disabled={!!switching}
                    className={`relative w-full text-left p-3.5 rounded-xl border-2 transition-all duration-150 group
                      ${isActive
                        ? `${config.border} ${config.bg}`
                        : 'border-border bg-card hover:border-primary/30 hover:bg-muted/40'}
                      ${isSwitching ? 'scale-95 opacity-70' : ''}
                      ${!!switching && !isSwitching ? 'opacity-40 pointer-events-none' : ''}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className={`${config.avatarBg} text-white text-xs font-bold`}>
                          {config.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-sm text-foreground truncate">{config.label}</span>
                          {isActive && (
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0 shrink-0">
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-snug">{config.subtitle}</p>
                      </div>
                      <div className="shrink-0 flex items-center">
                        {isSwitching ? (
                          <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        ) : isActive ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Preview Panel — desktop only */}
            {previewConfig && (
              <div className="hidden md:flex flex-col w-60 shrink-0 border-l border-border bg-muted/20 p-5 gap-4">
                <div className="flex flex-col items-center text-center gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className={`${previewConfig.avatarBg} text-white text-lg font-bold`}>
                      {previewConfig.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-sm text-foreground">{previewConfig.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{previewConfig.persona}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Key Modules</p>
                  {previewConfig.highlights.map((h) => (
                    <div key={h} className="flex items-center gap-2 text-xs text-foreground">
                      <div className={`h-1.5 w-1.5 rounded-full ${previewConfig.avatarBg} shrink-0`} />
                      {h}
                    </div>
                  ))}
                </div>

                <div className={`mt-auto p-3 rounded-xl ${previewConfig.bg} ${previewConfig.border} border`}>
                  <p className={`text-xs font-semibold leading-snug ${previewConfig.color}`}>
                    "{previewConfig.tagline}"
                  </p>
                </div>

                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => handleSelectRole(previewConfig)}
                  disabled={!!switching}
                >
                  Switch to this View
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">Tap any role to instantly switch the navigation, permissions, and landing screen.</p>
          <Button variant="ghost" size="sm" onClick={onClose} className="shrink-0 text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
