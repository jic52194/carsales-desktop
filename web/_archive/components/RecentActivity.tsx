import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Phone, MessageSquare, FileText, Car, DollarSign, Calendar,
  UserPlus, CheckCircle2, AlertCircle, Wrench, TrendingUp, Activity
} from "lucide-react";

interface ActivityItem {
  id: string;
  type: "lead" | "call" | "text" | "deal" | "appointment" | "inventory" | "service" | "compliance";
  user: string;
  userInitials: string;
  userColor: string;
  action: string;
  detail: string;
  time: string;
  amount?: string;
}

const ACTIVITY_SEED: ActivityItem[] = [
  {
    id: "a1",
    type: "lead",
    user: "AI BDC",
    userInitials: "AI",
    userColor: "bg-gradient-to-br from-violet-500 to-purple-600",
    action: "Captured new lead",
    detail: "2024 Ford F-150 — Cars.com inquiry from Sarah Jenkins",
    time: "Just now",
  },
  {
    id: "a2",
    type: "text",
    user: "AI BDC",
    userInitials: "AI",
    userColor: "bg-gradient-to-br from-violet-500 to-purple-600",
    action: "Auto-replied to lead",
    detail: "Sent payment range & booked test drive for 2:30 PM",
    time: "1 min ago",
  },
  {
    id: "a3",
    type: "deal",
    user: "Mike Ross",
    userInitials: "MR",
    userColor: "bg-gradient-to-br from-blue-500 to-blue-600",
    action: "Pushed deal to F&I",
    detail: "2024 Luxury SUV — John Doe — $42,500",
    time: "8 min ago",
    amount: "$3,200 gross",
  },
  {
    id: "a4",
    type: "call",
    user: "Sarah Jenkins",
    userInitials: "SJ",
    userColor: "bg-gradient-to-br from-emerald-500 to-emerald-600",
    action: "Logged outbound call",
    detail: "Follow-up with Mike T. — interested in 2023 EV",
    time: "15 min ago",
  },
  {
    id: "a5",
    type: "appointment",
    user: "Reception",
    userInitials: "RC",
    userColor: "bg-gradient-to-br from-amber-500 to-orange-600",
    action: "Scheduled appointment",
    detail: "Test drive — David Chen — 2022 Electric Hatch",
    time: "22 min ago",
  },
  {
    id: "a6",
    type: "inventory",
    user: "Lot Team",
    userInitials: "LT",
    userColor: "bg-gradient-to-br from-slate-500 to-slate-600",
    action: "Vehicle received",
    detail: "2024 Toyota Camry — Stock #2391A — Photo queue started",
    time: "35 min ago",
  },
  {
    id: "a7",
    type: "service",
    user: "Tech Bay 2",
    userInitials: "T2",
    userColor: "bg-gradient-to-br from-rose-500 to-pink-600",
    action: "MPI completed",
    detail: "RO #4592 — 3 recommendations flagged for approval",
    time: "48 min ago",
  },
  {
    id: "a8",
    type: "deal",
    user: "F&I Desk",
    userInitials: "FI",
    userColor: "bg-gradient-to-br from-indigo-500 to-indigo-600",
    action: "Deal funded",
    detail: "2023 Premium EV — Emily Blunt — Deal #8841",
    time: "1 hr ago",
    amount: "$5,100 gross",
  },
  {
    id: "a9",
    type: "compliance",
    user: "System",
    userInitials: "SY",
    userColor: "bg-gradient-to-br from-red-500 to-red-600",
    action: "Compliance flag raised",
    detail: "Missing proof of income — John Doe deal cannot fund",
    time: "1 hr ago",
  },
  {
    id: "a10",
    type: "lead",
    user: "AI BDC",
    userInitials: "AI",
    userColor: "bg-gradient-to-br from-violet-500 to-purple-600",
    action: "Lead score updated",
    detail: "Sarah Jenkins scored 92 (Hot) — 3x more likely to buy",
    time: "2 hr ago",
  },
];

const ICON_MAP: Record<string, any> = {
  lead: UserPlus,
  call: Phone,
  text: MessageSquare,
  deal: DollarSign,
  appointment: Calendar,
  inventory: Car,
  service: Wrench,
  compliance: AlertCircle,
};

const COLOR_MAP: Record<string, string> = {
  lead: "text-violet-600 bg-violet-50 dark:bg-violet-950/30",
  call: "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
  text: "text-purple-600 bg-purple-50 dark:bg-purple-950/30",
  deal: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
  appointment: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
  inventory: "text-slate-600 bg-slate-50 dark:bg-slate-800/50",
  service: "text-rose-600 bg-rose-50 dark:bg-rose-950/30",
  compliance: "text-red-600 bg-red-50 dark:bg-red-950/30",
};

export function RecentActivity({ maxItems = 10 }: { maxItems?: number }) {
  const [activities, setActivities] = useState<ActivityItem[]>(ACTIVITY_SEED.slice(0, maxItems));

  // Simulate a new activity arriving periodically
  useEffect(() => {
    const pool = [
      { type: "text" as const, user: "AI BDC", userInitials: "AI", userColor: "bg-gradient-to-br from-violet-500 to-purple-600", action: "Auto-replied to lead", detail: "Sent availability & payment estimate instantly", time: "Just now" },
      { type: "lead" as const, user: "AI BDC", userInitials: "AI", userColor: "bg-gradient-to-br from-violet-500 to-purple-600", action: "New lead captured", detail: "Facebook Marketplace — 2021 F-150 inquiry", time: "Just now" },
      { type: "call" as const, user: "Mike Ross", userInitials: "MR", userColor: "bg-gradient-to-br from-blue-500 to-blue-600", action: "Logged inbound call", detail: "Customer asking about weekend specials", time: "Just now" },
    ];

    const interval = setInterval(() => {
      const random = pool[Math.floor(Math.random() * pool.length)];
      const newItem: ActivityItem = {
        id: `live-${Date.now()}`,
        ...random,
      };
      setActivities((prev) => [newItem, ...prev].slice(0, maxItems));
    }, 30000);

    return () => clearInterval(interval);
  }, [maxItems]);

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader className="bg-slate-100/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Live feed across the dealership</CardDescription>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Live</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[440px] overflow-y-auto">
          {activities.map((item, idx) => {
            const Icon = ICON_MAP[item.type];
            return (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${
                  idx !== activities.length - 1 ? "border-b border-slate-100 dark:border-slate-800/50" : ""
                }`}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className={`${item.userColor} text-white text-[10px] font-bold`}>
                    {item.userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{item.user}</span>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${COLOR_MAP[item.type]}`}>
                      <Icon className="h-2.5 w-2.5" />
                      {item.type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-snug mt-0.5">{item.action}</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5 truncate">{item.detail}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{item.time}</span>
                  {item.amount && (
                    <Badge variant="secondary" className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40">
                      <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                      {item.amount}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-2.5 border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/20">
          <button className="w-full text-center text-xs font-semibold text-primary hover:text-primary/80 transition-colors py-1">
            View Full Activity Log
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
