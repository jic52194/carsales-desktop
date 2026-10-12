// Product modules. Only modules that run on real dealership data are enabled;
// everything else stays off the nav until it is built on the backend.
import type { Role } from "@/lib/auth";
import { LayoutDashboard, Car, Users, Kanban, Calculator, FileSignature, ListTodo, Calendar, BarChart3, Settings, type LucideIcon } from "lucide-react";

export interface Module { path: string; label: string; icon: LucideIcon; group: string; roles: Role[] }

const ALL: Role[] = ["super_admin", "owner", "admin", "manager", "sales", "f_and_i", "service", "inventory", "web", "technician", "porter"];
const SALES: Role[] = ["super_admin", "owner", "admin", "manager", "sales", "f_and_i", "web"];
const MGMT: Role[] = ["super_admin", "owner", "admin", "manager"];

export const MODULES: Module[] = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, group: "Today", roles: ALL },
  { path: "/tasks", label: "My Tasks", icon: ListTodo, group: "Today", roles: ALL },
  { path: "/appointments", label: "Appointments", icon: Calendar, group: "Today", roles: SALES },
  { path: "/customers", label: "Customers", icon: Users, group: "Sales", roles: SALES },
  { path: "/leads", label: "Leads & Pipeline", icon: Kanban, group: "Sales", roles: SALES },
  { path: "/desking", label: "Desking", icon: Calculator, group: "Sales", roles: SALES },
  { path: "/deals", label: "Deals", icon: FileSignature, group: "Sales", roles: SALES },
  { path: "/inventory", label: "Inventory", icon: Car, group: "Inventory", roles: ALL },
  { path: "/reports", label: "Reports", icon: BarChart3, group: "Insights", roles: MGMT },
  { path: "/settings", label: "Settings", icon: Settings, group: "Admin", roles: MGMT },
];

export const GROUPS = ["Today", "Sales", "Inventory", "Insights", "Admin"];
