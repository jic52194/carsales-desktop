import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  LayoutDashboard,
  GripVertical,
  Maximize2,
  Plus,
  X,
  Settings2,
  TrendingUp,
  TrendingDown,
  Users,
  Car,
  DollarSign,
  Calendar,
  Target,
  Clock,
  ListTodo,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Zap,
  Activity,
  BarChart3,
  PieChart,
  Sparkles,
  RefreshCw,
  Save,
  Trash2,
  ArrowUp,
  ArrowDown,
  Phone,
  MessageSquare,
  ShoppingCart,
  Wrench,
  Trophy,
  Briefcase,
  ShieldCheck,
  Wand2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { toast } from "sonner";
import { hapticFeedback } from "@/lib/haptics";

// ─── Types ───────────────────────────────────────────────
type WidgetType =
  | "kpiGrid"
  | "salesTrend"
  | "leadSources"
  | "taskList"
  | "alerts"
  | "leaderboard"
  | "responseTime"
  | "revenueSplit";

interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  size: 1 | 2 | 3; // 1 = 1/3, 2 = 2/3, 3 = full
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "w1", type: "kpiGrid", title: "Key Metrics", size: 3 },
  { id: "w2", type: "salesTrend", title: "Sales vs Leads (30d)", size: 2 },
  { id: "w3", type: "taskList", title: "My Tasks", size: 1 },
  { id: "w4", type: "alerts", title: "Action Items", size: 1 },
  { id: "w5", type: "leadSources", title: "Lead Sources", size: 2 },
  { id: "w6", type: "leaderboard", title: "Top Performers", size: 1 },
  { id: "w7", type: "revenueSplit", title: "Revenue Breakdown", size: 2 },
  { id: "w8", type: "responseTime", title: "Avg Response Time", size: 1 },
];

// ─── Role Templates ──────────────────────────────────────
interface RoleTemplate {
  id: string;
  label: string;
  icon: typeof Users;
  desc: string;
  widgets: WidgetConfig[];
}

const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: "gm",
    label: "General Manager",
    icon: Briefcase,
    desc: "Full-store overview: revenue, KPIs, alerts, and team performance",
    widgets: [
      { id: "rt1", type: "kpiGrid", title: "Key Metrics", size: 3 },
      { id: "rt2", type: "revenueSplit", title: "Revenue Breakdown", size: 2 },
      { id: "rt3", type: "alerts", title: "Action Items", size: 1 },
      { id: "rt4", type: "salesTrend", title: "Sales vs Leads (30d)", size: 2 },
      { id: "rt5", type: "leaderboard", title: "Top Performers", size: 1 },
    ],
  },
  {
    id: "sales_mgr",
    label: "Sales Manager",
    icon: TrendingUp,
    desc: "Pipeline focus: leads, close rates, response times, and tasks",
    widgets: [
      { id: "rt1", type: "kpiGrid", title: "Key Metrics", size: 3 },
      { id: "rt2", type: "salesTrend", title: "Sales vs Leads (30d)", size: 2 },
      { id: "rt3", type: "leadSources", title: "Lead Sources", size: 1 },
      { id: "rt4", type: "responseTime", title: "Avg Response Time", size: 1 },
      { id: "rt5", type: "taskList", title: "My Tasks", size: 1 },
      { id: "rt6", type: "alerts", title: "Action Items", size: 1 },
    ],
  },
  {
    id: "f_and_i",
    label: "F&I Manager",
    icon: ShieldCheck,
    desc: "Finance focus: revenue breakdown, contracts, and deal alerts",
    widgets: [
      { id: "rt1", type: "revenueSplit", title: "Revenue Breakdown", size: 2 },
      { id: "rt2", type: "kpiGrid", title: "Key Metrics", size: 3 },
      { id: "rt3", type: "alerts", title: "Action Items", size: 1 },
      { id: "rt4", type: "salesTrend", title: "Sales vs Leads (30d)", size: 2 },
      { id: "rt5", type: "leaderboard", title: "Top Performers", size: 1 },
    ],
  },
  {
    id: "rep",
    label: "Sales Rep",
    icon: Users,
    desc: "Daily focus: tasks, leads, appointments, and personal leaderboard",
    widgets: [
      { id: "rt1", type: "taskList", title: "My Tasks", size: 1 },
      { id: "rt2", type: "alerts", title: "Action Items", size: 1 },
      { id: "rt3", type: "leadSources", title: "Lead Sources", size: 2 },
      { id: "rt4", type: "responseTime", title: "Avg Response Time", size: 1 },
      { id: "rt5", type: "leaderboard", title: "Top Performers", size: 1 },
      { id: "rt6", type: "kpiGrid", title: "Key Metrics", size: 3 },
    ],
  },
];

const WIDGET_CATALOG: { type: WidgetType; title: string; icon: typeof Users; desc: string }[] = [
  { type: "kpiGrid", title: "KPI Grid", icon: BarChart3, desc: "6 key dealership metrics at a glance" },
  { type: "salesTrend", title: "Sales Trend", icon: TrendingUp, desc: "30-day sales vs leads area chart" },
  { type: "leadSources", title: "Lead Sources", icon: Users, desc: "Breakdown of where leads come from" },
  { type: "taskList", title: "Task List", icon: ListTodo, desc: "Your priority to-do items" },
  { type: "alerts", title: "Alerts", icon: AlertTriangle, desc: "Urgent items needing attention" },
  { type: "leaderboard", title: "Leaderboard", icon: Trophy, desc: "Top sales performers this month" },
  { type: "responseTime", title: "Response Time", icon: Clock, desc: "Average lead response time" },
  { type: "revenueSplit", title: "Revenue Split", icon: PieChart, desc: "Front-end vs back-end gross" },
];

// ─── Mock Data ────────────────────────────────────────────
const KPI_DATA = [
  { label: "Leads Today", value: "14", change: "+3", up: true, icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { label: "Appts Today", value: "7", change: "+1", up: true, icon: Calendar, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30" },
  { label: "MTD Sold", value: "28", change: "+5", up: true, icon: Car, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { label: "MTD Gross", value: "$84.2K", change: "+8%", up: true, icon: DollarSign, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
  { label: "Close Rate", value: "22.4%", change: "+1.2%", up: true, icon: Target, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-950/30" },
  { label: "Avg Response", value: "4.2m", change: "-1.1m", up: true, icon: Clock, color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-950/30" },
];

const TREND_DATA = [
  { day: "1", sales: 2, leads: 15 },
  { day: "5", sales: 4, leads: 22 },
  { day: "10", sales: 3, leads: 18 },
  { day: "15", sales: 7, leads: 35 },
  { day: "20", sales: 5, leads: 28 },
  { day: "25", sales: 8, leads: 42 },
  { day: "30", sales: 12, leads: 50 },
];

const LEAD_SOURCES = [
  { source: "Cars.com", leads: 42, fill: "#3b82f6" },
  { source: "Facebook", leads: 35, fill: "#8b5cf6" },
  { source: "Walk-in", leads: 18, fill: "#10b981" },
  { source: "Referral", leads: 12, fill: "#f59e0b" },
  { source: "Website", leads: 9, fill: "#ec4899" },
];

const REVENUE_DATA = [
  { name: "Front-End", value: 52400, fill: "#3b82f6" },
  { name: "Back-End", value: 31800, fill: "#10b981" },
  { name: "Service", value: 18600, fill: "#f59e0b" },
  { name: "Parts", value: 7400, fill: "#ec4899" },
];

const TASKS = [
  { id: 1, title: "Call Sarah Jenkins (hot lead)", priority: "high", done: false, due: "Today 2pm" },
  { id: 2, title: "Review 2021 Accord trade-in", priority: "high", done: false, due: "Today 4pm" },
  { id: 3, title: "Send payoff quote to Mike Ross", priority: "med", done: false, due: "Tomorrow" },
  { id: 4, title: "Follow up on credit app — Emily B.", priority: "med", done: false, due: "Tomorrow" },
  { id: 5, title: "Update 12 aged inventory prices", priority: "low", done: true, due: "Done" },
];

const ALERTS = [
  { id: 1, icon: Flame, title: "Follow-up Overdue", desc: "Sarah Jenkins — 5+ hrs since last contact", color: "text-destructive", bg: "bg-destructive/10", route: "/crm" },
  { id: 2, icon: AlertTriangle, title: "12 Vehicles Over 60 Days", desc: "Aged inventory increasing holding costs", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", route: "/aging-inventory" },
  { id: 3, icon: Zap, title: "Service-to-Sales", desc: "Mike Ross repair bill > 30% ACV — pitch trade", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/30", route: "/crm" },
];

const LEADERBOARD = [
  { rank: 1, name: "Michael Torres", units: 12, gross: "$34,500", avatar: "https://i.pravatar.cc/150?u=miket" },
  { rank: 2, name: "Jessica Park", units: 9, gross: "$26,100", avatar: "https://i.pravatar.cc/150?u=jessp" },
  { rank: 3, name: "David Chen", units: 7, gross: "$23,800", avatar: "https://i.pravatar.cc/150?u=davidc" },
];

const RESPONSE_DATA = [
  { day: "Mon", minutes: 6.2 },
  { day: "Tue", minutes: 5.1 },
  { day: "Wed", minutes: 4.8 },
  { day: "Thu", minutes: 4.2 },
  { day: "Fri", minutes: 3.9 },
  { day: "Sat", minutes: 5.5 },
  { day: "Sun", minutes: 7.1 },
];

// ─── Sortable Widget Wrapper ─────────────────────────────
function SortableWidget({
  config,
  onResize,
  onRemove,
  children,
}: {
  config: WidgetConfig;
  onResize: (size: 1 | 2 | 3) => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: config.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.6 : 1,
  } as React.CSSProperties;

  const spanClass =
    config.size === 3
      ? "col-span-1 lg:col-span-3"
      : config.size === 2
      ? "col-span-1 lg:col-span-2"
      : "col-span-1";

  return (
    <div ref={setNodeRef} style={style} className={spanClass}>
      <div className="relative group/widget h-full">
        {/* Hover controls */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/widget:opacity-100 transition-opacity z-50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-7 w-7 bg-background/80 backdrop-blur-sm border-border">
                <Maximize2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onResize(1)}>1/3 Width</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onResize(2)}>2/3 Width</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onResize(3)}>Full Width</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 bg-background/80 backdrop-blur-sm border-border hover:border-destructive/30 hover:text-destructive"
            onClick={onRemove}
          >
            <X className="h-3 w-3" />
          </Button>
          <div
            {...attributes}
            {...listeners}
            className="p-1.5 bg-background/80 backdrop-blur-sm border border-border rounded-md cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Widget Renderers ─────────────────────────────────────
function WidgetContent({ config }: { config: WidgetConfig }) {
  switch (config.type) {
    case "kpiGrid":
      return (
        <Card className="border-border/50 shadow-sm h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> {config.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {KPI_DATA.map((kpi) => (
                <div
                  key={kpi.label}
                  className={`rounded-xl border border-border/50 p-3 ${kpi.bg} hover:shadow-md transition-all`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-1.5 rounded-lg bg-background/80 border border-border/50`}>
                      <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                    </div>
                    <span
                      className={`text-[10px] font-bold flex items-center gap-0.5 ${
                        kpi.up ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                      }`}
                    >
                      {kpi.up ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                      {kpi.change}
                    </span>
                  </div>
                  <p className="text-xl font-black text-foreground tracking-tight">{kpi.value}</p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">
                    {kpi.label}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );

    case "salesTrend":
      return (
        <Card className="border-border/50 shadow-sm h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" /> {config.title}
            </CardTitle>
            <CardDescription className="text-xs">Units sold vs new leads over last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={TREND_DATA}>
                <defs>
                  <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <RechartsTooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Area type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} fill="url(#gLeads)" name="Leads" />
                <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} fill="url(#gSales)" name="Sales" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      );

    case "leadSources":
      return (
        <Card className="border-border/50 shadow-sm h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" /> {config.title}
            </CardTitle>
            <CardDescription className="text-xs">Where your leads came from this month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={LEAD_SOURCES} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="source" type="category" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={70} />
                <RechartsTooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Bar dataKey="leads" radius={[0, 6, 6, 0]}>
                  {LEAD_SOURCES.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      );

    case "revenueSplit":
      return (
        <Card className="border-border/50 shadow-sm h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <PieChart className="h-4 w-4 text-amber-500" /> {config.title}
            </CardTitle>
            <CardDescription className="text-xs">MTD gross by department</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <RechartsPieChart>
                <Pie data={REVENUE_DATA} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {REVENUE_DATA.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  formatter={(v: number) => `$${v.toLocaleString()}`}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      );

    case "taskList":
      return (
        <Card className="border-border/50 shadow-sm h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-primary" /> {config.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[260px] overflow-y-auto">
            {TASKS.map((t) => (
              <div key={t.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div
                  className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    t.done ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/40"
                  }`}
                >
                  {t.done && <CheckCircle2 className="h-3 w-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${t.done ? "line-through text-muted-foreground" : ""}`}>
                    {t.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        t.priority === "high"
                          ? "bg-destructive/10 text-destructive"
                          : t.priority === "med"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {t.priority}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{t.due}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      );

    case "alerts":
      return (
        <Card className="border-border/50 shadow-sm h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> {config.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ALERTS.map((a) => (
              <Link
                key={a.id}
                to={a.route}
                className={`flex items-start gap-3 p-3 rounded-xl ${a.bg} border border-border/50 hover:shadow-md transition-all`}
              >
                <a.icon className={`h-4 w-4 ${a.color} shrink-0 mt-0.5`} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      );

    case "leaderboard":
      return (
        <Card className="border-border/50 shadow-sm h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" /> {config.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {LEADERBOARD.map((p) => (
              <div key={p.rank} className="flex items-center gap-3">
                <span
                  className={`text-sm font-black w-6 text-center ${
                    p.rank === 1 ? "text-amber-500" : p.rank === 2 ? "text-slate-400" : "text-orange-700"
                  }`}
                >
                  {p.rank}
                </span>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={p.avatar} />
                  <AvatarFallback>{p.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.units} units</p>
                </div>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{p.gross}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      );

    case "responseTime":
      return (
        <Card className="border-border/50 shadow-sm h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-500" /> {config.title}
            </CardTitle>
            <CardDescription className="text-xs">Minutes from lead to first contact</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-3">
              <p className="text-3xl font-black text-foreground">4.2<span className="text-base text-muted-foreground">min</span></p>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 mt-1">
                <ArrowDown className="h-3 w-3 mr-1" /> 1.1m faster
              </Badge>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={RESPONSE_DATA}>
                <defs>
                  <linearGradient id="gResp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <RechartsTooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Area type="monotone" dataKey="minutes" stroke="#06b6d4" strokeWidth={2} fill="url(#gResp)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      );

    default:
      return null;
  }
}

// ─── Main Page ────────────────────────────────────────────
export default function DashboardBuilder() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Load saved layout
  useEffect(() => {
    const saved = localStorage.getItem("vibe_custom_dashboard");
    if (saved) {
      try {
        setWidgets(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    }
  }, []);

  const persist = useCallback((next: WidgetConfig[]) => {
    setWidgets(next);
    localStorage.setItem("vibe_custom_dashboard", JSON.stringify(next));
    setIsDirty(true);
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = widgets.findIndex((w) => w.id === active.id);
      const newIndex = widgets.findIndex((w) => w.id === over.id);
      persist(arrayMove(widgets, oldIndex, newIndex));
      hapticFeedback();
    }
  };

  const handleResize = (id: string, size: 1 | 2 | 3) => {
    persist(widgets.map((w) => (w.id === id ? { ...w, size } : w)));
  };

  const handleRemove = (id: string) => {
    persist(widgets.filter((w) => w.id !== id));
    toast.success("Widget removed");
    hapticFeedback();
  };

  const handleAdd = (type: WidgetType) => {
    const catalog = WIDGET_CATALOG.find((c) => c.type === type)!;
    const newWidget: WidgetConfig = {
      id: `w${Date.now()}`,
      type,
      title: catalog.title,
      size: 1,
    };
    persist([...widgets, newWidget]);
    setIsAddOpen(false);
    toast.success(`${catalog.title} added`);
    hapticFeedback();
  };

  const handleReset = () => {
    persist(DEFAULT_WIDGETS);
    setIsDirty(false);
    toast.success("Dashboard reset to default");
  };

  const handleSave = () => {
    localStorage.setItem("vibe_custom_dashboard", JSON.stringify(widgets));
    setIsDirty(false);
    toast.success("Layout saved");
    hapticFeedback();
  };

  const usedTypes = useMemo(() => new Set(widgets.map((w) => w.type)), [widgets]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <ScrollReveal>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <LayoutDashboard className="h-7 w-7 text-primary" /> My Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Drag widgets to rearrange · hover to resize or remove · build your perfect view
            </p>
          </div>
        </ScrollReveal>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" onClick={handleReset} className="h-9">
            <RefreshCw className="h-4 w-4 mr-2" /> Reset
          </Button>
          <Button
            variant={isDirty ? "default" : "outline"}
            size="sm"
            onClick={handleSave}
            className="h-9"
          >
            <Save className="h-4 w-4 mr-2" /> Save Layout
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9 bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" /> Add Widget
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add a Widget</DialogTitle>
                <DialogDescription>Choose a widget to add to your dashboard.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 max-h-[60vh] overflow-y-auto">
                {WIDGET_CATALOG.map((c) => {
                  const added = usedTypes.has(c.type);
                  return (
                    <button
                      key={c.type}
                      disabled={added}
                      onClick={() => handleAdd(c.type)}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                        added
                          ? "border-border/50 bg-muted/30 opacity-50 cursor-not-allowed"
                          : "border-border hover:border-primary/40 hover:bg-primary/5 hover:shadow-md"
                      }`}
                    >
                      <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                        <c.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{c.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
                        {added && <p className="text-[10px] text-muted-foreground mt-1">Already added</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
            <Activity className="h-3 w-3 mr-1" /> Live
          </Badge>
        </div>
      </div>

      {/* Role Templates */}
      <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-primary/5 to-transparent p-4 md:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Wand2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Role Templates</h2>
          <span className="text-xs text-muted-foreground hidden sm:inline">— one-click layouts for your role</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
          {ROLE_TEMPLATES.map((tpl) => {
            const isActive = widgets.length === tpl.widgets.length && widgets.every((w, i) => w.type === tpl.widgets[i]?.type);
            return (
              <button
                key={tpl.id}
                onClick={() => {
                  persist(tpl.widgets.map((w) => ({ ...w, id: `rt_${tpl.id}_${w.id}` })));
                  toast.success(`${tpl.label} layout applied`);
                  hapticFeedback();
                }}
                className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all min-h-[88px] ${
                  isActive
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border/50 bg-background hover:border-primary/40 hover:bg-primary/5 hover:shadow-md"
                }`}
              >
                <div className={`p-1.5 rounded-lg ${isActive ? "bg-primary/20" : "bg-primary/10"} border border-primary/20`}>
                  <tpl.icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-primary/80"}`} />
                </div>
                <p className="text-xs font-bold text-foreground leading-tight">{tpl.label}</p>
                <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{tpl.desc}</p>
                {isActive && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-primary flex items-center gap-0.5 mt-auto">
                    <CheckCircle2 className="h-2.5 w-2.5" /> Active
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Edit Mode Hint */}
      {isDirty && (
        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          You have unsaved changes. Click "Save Layout" to keep them.
        </div>
      )}

      {/* Widget Grid */}
      {widgets.length === 0 ? (
        <Card className="border-dashed border-2 border-border">
          <CardContent className="py-16 text-center">
            <LayoutDashboard className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-medium">Your dashboard is empty</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Click "Add Widget" to start building your view.</p>
            <Button size="sm" className="mt-4" onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Widget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 grid-flow-row-dense auto-rows-min">
              {widgets.map((w) => (
                <SortableWidget
                  key={w.id}
                  config={w}
                  onResize={(size) => handleResize(w.id, size)}
                  onRemove={() => handleRemove(w.id)}
                >
                  <WidgetContent config={w} />
                </SortableWidget>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Footer hint */}
      <p className="text-xs text-muted-foreground/60 text-center pt-2">
        Tip: Hover any widget to reveal drag, resize, and remove controls. Your layout is saved to this device.
      </p>
    </div>
  );
}
