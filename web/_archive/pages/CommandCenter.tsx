import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sparkles, TrendingUp, AlertTriangle, Search, Bell, Clock, CheckCircle2, DollarSign, Car, Users, Calendar, Target, ArrowUp, ArrowDown, Flame, Zap, ShieldAlert, BarChart3, MessageSquare, Phone, RefreshCw, Plus, User, ChevronRight, Calculator, LineChart, Shield, ShieldCheck, Activity, Lock, Brain, BrainCircuit, Settings2, GripVertical, Maximize2, FileText, Play } from "lucide-react";
import { toast } from "sonner";
import { hapticFeedback } from "@/lib/haptics";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { RecentActivity } from "@/components/RecentActivity";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableWidget({ id, children, size, onSizeChange }: { id: string, children: React.ReactNode, size: number, onSizeChange: (size: number) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const spanClass = size === 3 ? "col-span-1 lg:col-span-3" : size === 2 ? "col-span-1 lg:col-span-2" : "col-span-1";

  return (
    <div ref={setNodeRef} style={style} className={spanClass}>
      <div className="relative group/widget h-full">
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/widget:opacity-100 transition-opacity z-50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-7 w-7 bg-background/80 backdrop-blur-sm border-border">
                <Maximize2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSizeChange(1)}>1/3 Width</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSizeChange(2)}>2/3 Width</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSizeChange(3)}>Full Width</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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


const TREND_DATA = [
  { day: '1', sales: 2, leads: 15 },
  { day: '5', sales: 4, leads: 22 },
  { day: '10', sales: 3, leads: 18 },
  { day: '15', sales: 7, leads: 35 },
  { day: '20', sales: 5, leads: 28 },
  { day: '25', sales: 8, leads: 42 },
  { day: '30', sales: 12, leads: 50 },
];

const KPI_CARDS = [
  { label: "Leads Today", value: "14", change: "+3", up: true, icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { label: "Appts Today", value: "7", change: "+1", up: true, icon: Calendar, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30" },
  { label: "MTD Sold", value: "28", change: "+5", up: true, icon: Car, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { label: "MTD Gross", value: "$84.2K", change: "+8%", up: true, icon: DollarSign, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
  { label: "Close Rate", value: "22.4%", change: "+1.2%", up: true, icon: Target, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-950/30" },
  { label: "Avg Response", value: "4.2m", change: "-1.1m", up: true, icon: Clock, color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-950/30" },
];

const ALERTS = [
  { id: 1, type: "urgent", icon: Flame, color: "text-destructive", bg: "bg-destructive/10", title: "Follow-up Overdue — Sarah Jenkins", desc: "5+ hrs since last contact. Interested in 2024 Luxury SUV. Call now.", action: "Call Now", route: "/crm" },
  { id: 2, type: "action", icon: ShieldAlert, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", title: "Appraisal Awaiting Approval", desc: "John Doe's 2021 Honda Accord trade-in is pending manager sign-off.", action: "Review", route: "/appraisals" },
  { id: 3, type: "critical", icon: ShieldAlert, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30", title: "High Friction Deal Detected", desc: "John Doe's deal has stalled at Numbers Presented. Sentiment dropping.", action: "Intervene", route: "/deal-rescue" },
  { id: 4, type: "info", icon: AlertTriangle, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30", title: "12 Vehicles Over 60 Days", desc: "Aged inventory is increasing holding costs. Recommend price adjustments.", action: "View Aged", route: "/aging-inventory" },
  { id: 5, type: "urgent", icon: Car, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/30", title: "Service-to-Sales Opportunity", desc: "Mike Ross's repair bill ($3,200) exceeds 30% of his vehicle's ACV. High probability of trade-in.", action: "Pitch Upgrade", route: "/crm" },
];

const LEADERBOARD = [
  { rank: 1, name: "Michael Torres", units: 12, gross: "$34,500", avatar: "https://vibe.filesafe.space/1778548756560730619/assets/fea6a1a1-c1ca-4e7c-bcb6-ced02786663f.png", trend: "up" },
  { rank: 2, name: "Jessica Park", units: 9, gross: "$26,100", avatar: "https://vibe.filesafe.space/1778548756560730619/assets/f142b3ca-7909-4c19-970a-c590cabb6515.png", trend: "up" },
  { rank: 3, name: "David Chen", units: 7, gross: "$23,800", avatar: "https://i.pravatar.cc/150?u=davidcc", trend: "down" },
];

const ACTIVITY = [
  { time: "2m ago", msg: "New lead from Cars.com — Amanda Waller", type: "lead", person: "Amanda Waller" },
  { time: "8m ago", msg: "Deal funded — Dwight Schrute / 2024 F-150", type: "sold", person: "Dwight Schrute" },
  { time: "14m ago", msg: "Appt confirmed — Emily Blunt @ 2:00 PM", type: "appt", person: "Emily Blunt" },
  { time: "22m ago", msg: "Trade-in submitted — Mike Ross / 2019 Accord", type: "trade", person: "Mike Ross" },
  { time: "35m ago", msg: "Credit app submitted — Sarah Jenkins", type: "finance", person: "Sarah Jenkins" },
  { time: "41m ago", msg: "Vehicle reconditioned — 2023 Silverado (ST-4421)", type: "recon", person: "Inventory Team" },
];

const DAILY_SUMMARY = {
  date: "May 24, 2026",
  sold: 4,
  gross: 14200,
  leads: 18,
  appts: 12,
  topPerformer: "Michael Torres",
  topSource: "Facebook Marketplace"
};

const SUGGESTED = [
  "What was our total front-end gross MTD?",
  "Who is our top performing salesperson this week?",
  "Which lead sources have the highest closing ratio?",
  "Show me inventory that has been in recon for 3+ days",
];


export default function CommandCenter() {
  const [query, setQuery] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [widgets, setWidgets] = useState({
    kpis: true,
    aiHub: true,
    alerts: true,
    activityFeed: true,
    mtdProgress: true,
    mtdTrend: true,
    leaderboard: true,
    dailySummary: true,
  });
  const [widgetOrder, setWidgetOrder] = useState([
    'kpis', 'aiHub', 'dailySummary', 'alerts', 'activityFeed', 'mtdProgress', 'mtdTrend', 'leaderboard'
  ]);
  const [widgetSizes, setWidgetSizes] = useState<Record<string, number>>({
    kpis: 3,
    aiHub: 3,
    alerts: 2,
    activityFeed: 2,
    mtdProgress: 1,
    mtdTrend: 1,
    leaderboard: 1,
  });

  // VIP Geofence Arrival Alert
  useEffect(() => {
    const timer = setTimeout(() => {
      toast("VIP Customer Arrived", {
        description: "Geofence Alert: John Doe (2024 F-150 Lead) just pulled into the customer lot.",
        icon: <Car className="h-5 w-5 text-indigo-500" />,
        duration: 8000,
      });
      hapticFeedback();
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Load saved widget preferences
  useEffect(() => {
    const saved = localStorage.getItem('vibe_dashboard_widgets');
    if (saved) {
      try {
        setWidgets(JSON.parse(saved));
      } catch (e) {}
    }
    const savedOrder = localStorage.getItem('vibe_dashboard_widget_order');
    if (savedOrder) {
      try {
        setWidgetOrder(JSON.parse(savedOrder));
      } catch (e) {}
    }
    const savedSizes = localStorage.getItem('vibe_dashboard_widget_sizes');
    if (savedSizes) {
      try {
        setWidgetSizes(JSON.parse(savedSizes));
      } catch (e) {}
    }
  }, []);

  const handleSizeChange = (id: string, size: number) => {
    setWidgetSizes(prev => {
      const next = { ...prev, [id]: size };
      localStorage.setItem('vibe_dashboard_widget_sizes', JSON.stringify(next));
      return next;
    });
  };

  const applyTemplate = (role: string) => {
    let newWidgets = { ...widgets };
    switch (role) {
      case 'gm':
        newWidgets = { kpis: true, aiHub: true, alerts: true, activityFeed: true, mtdProgress: true, mtdTrend: true, leaderboard: true, dailySummary: true };
        break;
      case 'sales_manager':
        newWidgets = { kpis: true, aiHub: false, alerts: true, activityFeed: true, mtdProgress: true, mtdTrend: true, leaderboard: true, dailySummary: true };
        break;
      case 'f_and_i':
        newWidgets = { kpis: true, aiHub: true, alerts: true, activityFeed: false, mtdProgress: false, mtdTrend: false, leaderboard: false, dailySummary: true };
        break;
      case 'sales_rep':
        newWidgets = { kpis: false, aiHub: false, alerts: true, activityFeed: false, mtdProgress: true, mtdTrend: false, leaderboard: true, dailySummary: false };
        break;
    }
    setWidgets(newWidgets);
    localStorage.setItem('vibe_dashboard_widgets', JSON.stringify(newWidgets));
    toast.success("Dashboard template applied!");
  };

  const toggleWidget = (key: keyof typeof widgets) => {
    setWidgets(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('vibe_dashboard_widgets', JSON.stringify(next));
      return next;
    });
  };

  const handleAsk = (q?: string) => {
    const text = q || query;
    if (!text.trim()) return;
    setLoading(true);
    setAiResponse(null);
    setTimeout(() => {
      setAiResponse(`Based on your current dealership data: Your front-end gross MTD is $47,200 (+8% vs. last month). Top contributor: Michael Torres with $14,500. Used car gross is lagging — 6 units are priced above market. Recommend a 3% price reduction on vehicles over 40 days to improve turn rate.`);
      setLoading(false);
    }, 1200);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWidgetOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('vibe_dashboard_widget_order', JSON.stringify(newOrder));
        return newOrder;
      });
      hapticFeedback();
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500" data-tour="tour-command-center">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <ScrollReveal>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2" data-tour-id="tour-dashboard-header">
              <Sparkles className="h-7 w-7 text-primary" /> Command Center
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-sm ml-2 hidden sm:flex">
                <BrainCircuit className="h-4 w-4 mr-1" /> AI Guard Active
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Live dealership overview — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </ScrollReveal>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto mt-3 md:mt-0">
          <Button 
            onClick={() => {
              window.dispatchEvent(new CustomEvent('start-demo-tour'));
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('start-story-mode'));
              }, 100);
            }} 
            className="w-full md:w-auto flex bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 items-center gap-2 h-9"
          >
            <Play className="h-4 w-4 fill-current" /> Watch a deal close itself (60 sec)
          </Button>
          <div className="flex gap-2 w-full md:w-auto">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="hidden md:flex bg-background border-primary/20 text-primary hover:bg-primary/10">
                  <Settings2 className="h-4 w-4 mr-2" /> Customize Dashboard
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Customize Dashboard</DialogTitle>
                  <DialogDescription>Toggle which widgets appear on your command center.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-3 mb-6 pb-6 border-b border-border">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Role Templates</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={() => applyTemplate('gm')} className="justify-start">General Manager</Button>
                      <Button variant="outline" size="sm" onClick={() => applyTemplate('sales_manager')} className="justify-start">Sales Manager</Button>
                      <Button variant="outline" size="sm" onClick={() => applyTemplate('f_and_i')} className="justify-start">F&I Director</Button>
                      <Button variant="outline" size="sm" onClick={() => applyTemplate('sales_rep')} className="justify-start">Sales Rep</Button>
                    </div>
                  </div>
                  
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Individual Widgets</Label>
                  {[
                    { key: 'kpis', label: 'KPI Cards' },
                    { key: 'aiHub', label: 'AI Intelligence Hub' },
                    { key: 'alerts', label: 'Alerts & Action Items' },
                    { key: 'activityFeed', label: 'Live Activity Feed' },
                    { key: 'mtdProgress', label: 'MTD Performance' },
                    { key: 'mtdTrend', label: 'MTD Trend Chart' },
                    { key: 'leaderboard', label: 'Leaderboard' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label className="font-medium">{label}</Label>
                      <Switch 
                        checked={widgets[key as keyof typeof widgets]} 
                        onCheckedChange={() => toggleWidget(key as keyof typeof widgets)} 
                      />
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-sm px-3 py-1 animate-pulse">
              ● Live
            </Badge>
            <Badge variant="outline" className="bg-slate-900 text-white border-primary/20 flex items-center gap-1.5 font-black uppercase text-[10px]">
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              AI Guard Active
            </Badge>
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={widgetOrder}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 grid-flow-row-dense">
            {widgetOrder.map((id) => {
              if (!widgets[id as keyof typeof widgets]) return null;

              if (id === 'kpis') {
                return (
                  <SortableWidget key={id} id={id} size={widgetSizes[id] || 3} onSizeChange={(size) => handleSizeChange(id, size)}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 h-full" data-tour-id="tour-dashboard-kpis">
                      {KPI_CARDS.map((kpi) => (
                        <Card key={kpi.label} className={`border border-border/50 bg-gradient-to-br from-background to-${kpi.color.split('-')[1]}-500/5 dark:to-${kpi.color.split('-')[1]}-500/10 shadow-sm group hover:shadow-md hover:border-${kpi.color.split('-')[1]}-500/30 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden h-full`}>
                          <div className={`absolute top-0 right-0 w-24 h-24 bg-${kpi.color.split('-')[1]}-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`} />
                          <CardContent className="p-4 md:p-5 relative z-10">
                            <div className="flex items-center justify-between mb-3">
                              <div className={`p-2 rounded-lg ${kpi.bg} border border-${kpi.color.split('-')[1]}-500/20 shadow-inner`}>
                                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                              </div>
                              <span className={`text-[11px] font-bold flex items-center gap-0.5 px-2 py-1 rounded-full bg-background/80 shadow-sm border border-border/50 backdrop-blur-sm ${kpi.up ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                                {kpi.up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                {kpi.change}
                              </span>
                            </div>
                            <p className="text-2xl md:text-3xl font-black text-foreground tracking-tight">{kpi.value}</p>
                            <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider mt-1">{kpi.label}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </SortableWidget>
                );
              }

              if (id === 'aiHub') {
                return (
                  <SortableWidget key={id} id={id} size={widgetSizes[id] || 3} onSizeChange={(size) => handleSizeChange(id, size)}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 h-full">
                      <Card className="lg:col-span-2 border-primary/20 shadow-md shadow-primary/5 bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden h-full">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                          <Sparkles className="w-32 h-32 text-primary" />
                        </div>
                        <CardContent className="p-4 md:p-6 relative z-10">
                          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                              <Brain className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1 space-y-1">
                              <h3 className="font-bold text-lg text-foreground">AI Dealership Intelligence</h3>
                              <p className="text-sm text-muted-foreground">Real-time analysis across sales, service, and inventory.</p>
                            </div>
                          </div>

                          <div className="mt-6 relative">
                            <Input 
                              value={query}
                              onChange={(e) => setQuery(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                              placeholder="Ask Alex anything..." 
                              className="pl-4 pr-12 h-12 bg-background/80 backdrop-blur-sm border-primary/20 shadow-sm focus-visible:ring-primary/50 text-base"
                            />
                            <Button size="icon" onClick={() => handleAsk()} disabled={loading} className="absolute right-1 top-1 h-10 w-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg">
                              <Search className="h-5 w-5" />
                            </Button>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {SUGGESTED.map((s) => (
                              <Badge key={s} variant="secondary" onClick={() => { setQuery(s); handleAsk(s); }} className="cursor-pointer hover:bg-secondary/80 bg-background/50 border border-border/50 text-[10px] py-1 px-3">
                                <TrendingUp className="w-3 h-3 mr-1" /> {s}
                              </Badge>
                            ))}
                          </div>
                          
                          {aiResponse && (
                            <div className="mt-4 p-4 bg-background rounded-xl border border-primary/20 text-sm leading-relaxed animate-in slide-in-from-top-2">
                              <div className="flex items-center gap-2 mb-2 text-primary font-semibold text-xs uppercase tracking-wider">
                                <Sparkles className="h-3.5 w-3.5" /> AI Analysis
                              </div>
                              {aiResponse}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="border-border shadow-sm bg-background h-full">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base font-bold flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Security Status
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-3">
                            <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                              <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">Identity Guard</p>
                                <p className="text-xs text-emerald-700 dark:text-emerald-400/80 mt-0.5">Biometric verification enforced for all administrative actions.</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                              <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">Session Security</p>
                                <p className="text-xs text-blue-700 dark:text-blue-400/80 mt-0.5">3 active staff sessions monitored. All encrypted E2E.</p>
                              </div>
                            </div>
                            
                            <Button variant="outline" className="w-full text-xs font-bold" asChild>
                              <Link to="/security-center">View Security Hub</Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </SortableWidget>
                );
              }

              if (id === 'dailySummary') {
                return (
                  <SortableWidget key={id} id={id} size={widgetSizes[id] || 3} onSizeChange={(size) => handleSizeChange(id, size)}>
                    <Card className="border-border shadow-md bg-slate-900 text-white overflow-hidden h-full">
                      <CardHeader className="pb-2 border-b border-white/10 bg-slate-950/50 flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-lg font-black uppercase tracking-tighter italic flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" /> Daily Operating Control (DOC)
                          </CardTitle>
                          <CardDescription className="text-white/40 font-medium">Nightly store summary for {DAILY_SUMMARY.date}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="h-8 border-white/20 text-white hover:bg-white/10 gap-2" onClick={() => {
                            toast.success("Playing Executive Morning Briefing", { description: "Audio podcast summary of yesterday's performance starting now." });
                            hapticFeedback();
                          }}>
                            <Play className="h-3.5 w-3.5 fill-current" /> Listen to Briefing
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 border-white/20 text-white hover:bg-white/10 gap-2 hidden sm:flex" onClick={() => {
                            toast.success("DOC Summary sent to Dealer Principal via SMS!");
                            hapticFeedback();
                          }}>
                            <Zap className="h-3.5 w-3.5 fill-current" /> Send to Principal
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Units Sold</p>
                            <p className="text-4xl font-black text-emerald-400">{DAILY_SUMMARY.sold}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Day's Gross</p>
                            <p className="text-4xl font-black text-primary">${(DAILY_SUMMARY.gross / 1000).toFixed(1)}K</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">New Leads</p>
                            <p className="text-4xl font-black">{DAILY_SUMMARY.leads}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Appts Set</p>
                            <p className="text-4xl font-black">{DAILY_SUMMARY.appts}</p>
                          </div>
                          <div className="col-span-2 space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-white/60">Top Performer</span>
                              <span className="text-xs font-black text-primary uppercase italic">{DAILY_SUMMARY.topPerformer}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-white/60">Top Source</span>
                              <span className="text-xs font-black text-emerald-400 uppercase italic">{DAILY_SUMMARY.topSource}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </SortableWidget>
                );
              }

              if (id === 'alerts') {
                return (
                  <SortableWidget key={id} id={id} size={widgetSizes[id] || 2} onSizeChange={(size) => handleSizeChange(id, size)}>
                    <Card className="border-border shadow-sm bg-background h-full">
                      <CardHeader className="pb-3 border-b border-border/50">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          <Bell className="h-4 w-4 text-primary" /> Active Alerts
                          <Badge className="ml-auto bg-destructive/10 text-destructive border-destructive/20 h-5 px-1.5 text-[10px]">
                            {ALERTS.length} Action Needed
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y divide-border/50">
                          {ALERTS.map((alert) => (
                            <div key={alert.id} className="p-4 hover:bg-muted/30 transition-colors flex gap-4 items-start">
                              <div className={`p-2 rounded-lg ${alert.bg} shrink-0`}>
                                <alert.icon className={`h-5 w-5 ${alert.color}`} />
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-bold">{alert.title}</p>
                                  <span className="text-[10px] font-medium text-muted-foreground">12m ago</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{alert.desc}</p>
                                <Button variant="link" className="p-0 h-auto text-xs font-bold text-primary" asChild>
                                  <Link to={alert.route}>{alert.action} <ChevronRight className="h-3 w-3 ml-0.5" /></Link>
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </SortableWidget>
                );
              }

              if (id === 'activityFeed') {
                return (
                  <SortableWidget key={id} id={id} size={widgetSizes[id] || 2} onSizeChange={(size) => handleSizeChange(id, size)}>
                    <RecentActivity maxItems={10} />
                  </SortableWidget>
                );
              }

              if (id === 'mtdProgress') {
                return (
                  <SortableWidget key={id} id={id} size={widgetSizes[id] || 1} onSizeChange={(size) => handleSizeChange(id, size)}>
                    <Card className="border-border shadow-sm bg-background h-full">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-bold">MTD Units Goal</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Store Performance</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6 pt-2">
                        <div className="flex flex-col items-center">
                          <div className="relative h-32 w-32">
                            <svg className="h-full w-full" viewBox="0 0 100 100">
                              <circle className="stroke-muted fill-none" cx="50" cy="50" r="45" strokeWidth="10" />
                              <circle 
                                className="stroke-primary fill-none transition-all duration-1000 ease-out" 
                                cx="50" cy="50" r="45" strokeWidth="10" 
                                strokeDasharray="282.7" 
                                strokeDashoffset={282.7 * (1 - 0.72)} 
                                strokeLinecap="round" 
                                transform="rotate(-90 50 50)" 
                              />
                              <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="fill-foreground text-2xl font-black italic">72%</text>
                            </svg>
                          </div>
                          <div className="text-center mt-4 space-y-1">
                            <p className="text-2xl font-black">144 / 200</p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase">Units Sold vs Goal</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <div className="p-2 bg-muted/30 rounded-lg text-center">
                            <p className="text-sm font-bold text-primary">+12</p>
                            <p className="text-[9px] text-muted-foreground font-medium">Ahead of Pace</p>
                          </div>
                          <div className="p-2 bg-muted/30 rounded-lg text-center">
                            <p className="text-sm font-bold text-emerald-600">$1.2M</p>
                            <p className="text-[9px] text-muted-foreground font-medium">Revenue</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </SortableWidget>
                );
              }

              if (id === 'mtdTrend') {
                return (
                  <SortableWidget key={id} id={id} size={widgetSizes[id] || 1} onSizeChange={(size) => handleSizeChange(id, size)}>
                    <Card className="border-border shadow-sm bg-background h-full">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-bold">Volume Trend</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Leads vs Sales</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0 pt-2">
                        <div className="h-48 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={TREND_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#1A4FB1" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#1A4FB1" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                              <XAxis dataKey="day" hide />
                              <YAxis hide />
                              <RechartsTooltip 
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '10px' }}
                              />
                              <Area type="monotone" dataKey="leads" stroke="#1A4FB1" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={2} />
                              <Area type="monotone" dataKey="sales" stroke="#1CAF3F" fill="transparent" strokeWidth={2} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="p-4 flex justify-around border-t border-border/50">
                          <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Leads</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Sales</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </SortableWidget>
                );
              }

              if (id === 'leaderboard') {
                return (
                  <SortableWidget key={id} id={id} size={widgetSizes[id] || 1} onSizeChange={(size) => handleSizeChange(id, size)}>
                    <Card className="border-border shadow-sm bg-background h-full">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-bold">Top Performance</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Top Sales Consultants</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-2">
                        {LEADERBOARD.map((s) => (
                          <div key={s.rank} className="flex items-center gap-3 p-2 hover:bg-muted/30 rounded-xl transition-colors">
                            <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black italic shadow-inner">
                              {s.rank}
                            </div>
                            <Avatar className="h-8 w-8 border border-border">
                              <AvatarImage src={s.avatar} />
                              <AvatarFallback>{s.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">{s.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary px-1.5 py-0">
                                  {s.units} units
                                </Badge>
                                <span className="text-[10px] text-muted-foreground font-bold">{s.gross}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </SortableWidget>
                );
              }

              return null;
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

