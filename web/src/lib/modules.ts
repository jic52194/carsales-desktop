// Product modules — the full dealership OS, every module on real dealership data.
import type { Role } from "@/lib/auth";
import {
  LayoutDashboard, Car, Users, Kanban, Calculator, FileSignature, ListTodo, Calendar, BarChart3, Settings, Building2,
  KeyRound, Sparkles, Headset, FileText, Landmark, FileBadge, ShieldCheck, Wallet, Hourglass, Tag, Wrench, Camera, MapPin,
  ShoppingCart, Truck, Gavel, MessageSquareText, Inbox, Megaphone, Video, Tablet, Globe, CalendarClock, BellRing, Package,
  Receipt, ClipboardList, Trophy, Gauge, LineChart, TableProperties, LayoutGrid, Flame, LifeBuoy, Zap, Bell, Activity, type LucideIcon,
} from "lucide-react";

export interface Module { path: string; label: string; icon: LucideIcon; group: string; roles: Role[] }

const ALL: Role[] = ["super_admin", "owner", "admin", "manager", "sales", "f_and_i", "service", "inventory", "web", "technician", "porter"];
const SALES: Role[] = ["super_admin", "owner", "admin", "manager", "sales", "f_and_i", "web"];
const MGMT: Role[] = ["super_admin", "owner", "admin", "manager"];
const FI: Role[] = [...MGMT, "f_and_i"];
const INV: Role[] = [...MGMT, "inventory"];
const SVC: Role[] = [...MGMT, "service", "technician"];
const ADMIN: Role[] = ["super_admin", "owner", "admin"];

export const MODULES: Module[] = [
  // Today
  { path: "/", label: "Dashboard", icon: LayoutDashboard, group: "Today", roles: ALL },
  { path: "/my-dashboard", label: "My Dashboard", icon: LayoutGrid, group: "Today", roles: ALL },
  { path: "/tasks", label: "My Tasks", icon: ListTodo, group: "Today", roles: ALL },
  { path: "/appointments", label: "Appointments", icon: Calendar, group: "Today", roles: SALES },
  { path: "/notifications", label: "Notifications", icon: Bell, group: "Today", roles: ALL },
  // Sales & CRM
  { path: "/customers", label: "Customers", icon: Users, group: "Sales & CRM", roles: SALES },
  { path: "/leads", label: "Leads & Pipeline", icon: Kanban, group: "Sales & CRM", roles: SALES },
  { path: "/follow-up", label: "AI Follow-Up", icon: Sparkles, group: "Sales & CRM", roles: SALES },
  { path: "/bdc", label: "BDC Call Center", icon: Headset, group: "Sales & CRM", roles: SALES },
  { path: "/test-drives", label: "Test Drives", icon: KeyRound, group: "Sales & CRM", roles: [...SALES, "porter"] },
  { path: "/appraisals", label: "Trade Appraisals", icon: Car, group: "Sales & CRM", roles: [...SALES, "inventory"] },
  { path: "/desking", label: "Desking", icon: Calculator, group: "Sales & CRM", roles: SALES },
  { path: "/deals", label: "Deals", icon: FileSignature, group: "Sales & CRM", roles: SALES },
  { path: "/rescue", label: "Deal Rescue", icon: LifeBuoy, group: "Sales & CRM", roles: SALES },
  // F&I & Compliance
  { path: "/credit-apps", label: "Credit Applications", icon: FileText, group: "F&I & Compliance", roles: SALES },
  { path: "/lenders", label: "Lenders", icon: Landmark, group: "F&I & Compliance", roles: FI },
  { path: "/compliance", label: "Compliance", icon: ShieldCheck, group: "F&I & Compliance", roles: FI },
  { path: "/title-reg", label: "Title & Registration", icon: FileBadge, group: "F&I & Compliance", roles: FI },
  { path: "/warranty", label: "Warranty & Contracts", icon: ShieldCheck, group: "F&I & Compliance", roles: [...FI, "service"] },
  { path: "/bhph", label: "Buy Here Pay Here", icon: Wallet, group: "F&I & Compliance", roles: FI },
  // Inventory & Ops
  { path: "/inventory", label: "Inventory", icon: Car, group: "Inventory & Ops", roles: ALL },
  { path: "/aging", label: "Aging Inventory", icon: Hourglass, group: "Inventory & Ops", roles: INV },
  { path: "/pricing", label: "Pricing Desk", icon: Tag, group: "Inventory & Ops", roles: INV },
  { path: "/recon", label: "Reconditioning", icon: Wrench, group: "Inventory & Ops", roles: [...INV, "service", "technician", "porter"] },
  { path: "/photos", label: "Photo Studio", icon: Camera, group: "Inventory & Ops", roles: [...INV, "web", "porter"] },
  { path: "/lot", label: "Lot Management", icon: MapPin, group: "Inventory & Ops", roles: [...INV, "porter", "sales"] },
  { path: "/acquisition", label: "Acquisition", icon: ShoppingCart, group: "Inventory & Ops", roles: [...INV, "sales"] },
  { path: "/wholesale", label: "Wholesale", icon: Truck, group: "Inventory & Ops", roles: INV },
  { path: "/auctions", label: "Auctions", icon: Gavel, group: "Inventory & Ops", roles: INV },
  { path: "/floorplan", label: "Floorplan", icon: Landmark, group: "Inventory & Ops", roles: [...INV, "f_and_i"] },
  // Marketing
  { path: "/inbox", label: "Inbox", icon: Inbox, group: "Marketing", roles: SALES },
  { path: "/templates", label: "Templates", icon: MessageSquareText, group: "Marketing", roles: SALES },
  { path: "/campaigns", label: "Campaigns", icon: Megaphone, group: "Marketing", roles: [...MGMT, "web"] },
  { path: "/videos", label: "Video Messages", icon: Video, group: "Marketing", roles: SALES },
  { path: "/website", label: "Website", icon: Globe, group: "Marketing", roles: [...MGMT, "web"] },
  { path: "/kiosk", label: "Showroom Kiosk", icon: Tablet, group: "Marketing", roles: SALES },
  // Service
  { path: "/service", label: "Service Scheduler", icon: CalendarClock, group: "Service", roles: SVC },
  { path: "/service/reminders", label: "Service Reminders", icon: BellRing, group: "Service", roles: [...SVC, "web"] },
  { path: "/service/bay", label: "Technician Bay", icon: Wrench, group: "Service", roles: SVC },
  { path: "/parts", label: "Parts", icon: Package, group: "Service", roles: [...SVC, "inventory"] },
  // Back Office
  { path: "/doc", label: "Daily Operating Control", icon: ClipboardList, group: "Back Office", roles: MGMT },
  { path: "/accounting", label: "Deal Accounting", icon: Landmark, group: "Back Office", roles: FI },
  { path: "/accounts-payable", label: "Accounts Payable", icon: Receipt, group: "Back Office", roles: MGMT },
  { path: "/leaderboard", label: "Leaderboard & Spiffs", icon: Trophy, group: "Back Office", roles: [...SALES] },
  { path: "/pay-plans", label: "Pay Plans", icon: Calculator, group: "Back Office", roles: [...ADMIN, "sales"] },
  { path: "/hr", label: "HR & Staff", icon: Users, group: "Back Office", roles: ADMIN },
  // Insights
  { path: "/command", label: "Command Center", icon: Gauge, group: "Insights", roles: MGMT },
  { path: "/reports", label: "Reports", icon: BarChart3, group: "Insights", roles: MGMT },
  { path: "/metrics", label: "Metrics", icon: LineChart, group: "Insights", roles: MGMT },
  { path: "/report-builder", label: "Report Builder", icon: TableProperties, group: "Insights", roles: FI },
  { path: "/heatmap", label: "Deal Heatmap", icon: Flame, group: "Insights", roles: MGMT },
  // Admin
  { path: "/settings", label: "Settings", icon: Settings, group: "Admin", roles: MGMT },
  { path: "/workflows", label: "Workflows", icon: Zap, group: "Admin", roles: MGMT },
  { path: "/security", label: "Security Center", icon: ShieldCheck, group: "Admin", roles: ADMIN },
  { path: "/system-check", label: "System check", icon: Activity, group: "Admin", roles: ADMIN },
  // Platform
  { path: "/dealerships", label: "Dealerships", icon: Building2, group: "Platform", roles: ["super_admin"] },
];

export const GROUPS = ["Today", "Sales & CRM", "F&I & Compliance", "Inventory & Ops", "Marketing", "Service", "Back Office", "Insights", "Admin", "Platform"];
