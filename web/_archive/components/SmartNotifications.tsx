import { useState, useEffect } from "react";
import { Bell, Check, X, Phone, Calendar, FileText, AlertTriangle, Car, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

interface SmartNotification {
  id: string;
  type: "lead" | "appointment" | "deal" | "inventory" | "compliance";
  title: string;
  desc: string;
  time: string;
  priority: "urgent" | "action" | "info";
  actions: { label: string; icon: any; variant?: string }[];
  resolved?: boolean;
}

const INITIAL_NOTIFS: SmartNotification[] = [
  {
    id: "n1",
    type: "lead",
    title: "New Hot Lead — 2024 F-150",
    desc: "Sarah Jenkins submitted a lead form. AI score: 92 (Hot). Vehicle in stock.",
    time: "2 min ago",
    priority: "urgent",
    actions: [
      { label: "Call Now", icon: Phone },
      { label: "Assign", icon: Check },
    ],
  },
  {
    id: "n2",
    type: "appointment",
    title: "Appointment Confirmed — Mike Ross",
    desc: "Test drive scheduled for today 2:30 PM. 2024 Luxury SUV.",
    time: "12 min ago",
    priority: "action",
    actions: [{ label: "View", icon: Calendar }],
  },
  {
    id: "n3",
    type: "deal",
    title: "Deal Approval Needed — $38k",
    desc: "John Doe's deal needs manager approval. Front-end gross: $3,200.",
    time: "25 min ago",
    priority: "urgent",
    actions: [{ label: "Approve", icon: Check }, { label: "Decline", icon: X }],
  },
  {
    id: "n4",
    type: "compliance",
    title: "Missing Stip — John Doe",
    desc: "Proof of income not uploaded. Deal cannot fund without it.",
    time: "1 hr ago",
    priority: "action",
    actions: [{ label: "Request", icon: FileText }],
  },
  {
    id: "n5",
    type: "inventory",
    title: "Price Drop Suggested — 2021 Sport Coupe",
    desc: "62 days on lot. AI suggests -$1,500 to stay competitive.",
    time: "2 hr ago",
    priority: "info",
    actions: [{ label: "Apply", icon: DollarSign }],
  },
];

const ICON_MAP: Record<string, any> = {
  lead: Bell,
  appointment: Calendar,
  deal: DollarSign,
  inventory: Car,
  compliance: AlertTriangle,
};

const COLOR_MAP: Record<string, string> = {
  urgent: "bg-destructive/10 text-destructive border-destructive/20",
  action: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",
  info: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
};

export function SmartNotifications() {
  const [notifs, setNotifs] = useState<SmartNotification[]>(INITIAL_NOTIFS);
  const [open, setOpen] = useState(false);

  const unresolved = notifs.filter((n) => !n.resolved);

  const resolveNotif = (id: string, actionLabel?: string) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, resolved: true } : n)));
    if (actionLabel) {
      toast.success(`Action: ${actionLabel}`, { description: "Notification resolved." });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="h-9 w-9 rounded-full bg-muted flex items-center justify-center relative hover:bg-muted/80 transition-colors shrink-0"
          title="Notifications"
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unresolved.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-destructive rounded-full flex items-center justify-center text-[10px] font-bold text-destructive-foreground">
              {unresolved.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-bold text-sm">Smart Notifications</h3>
          <Badge variant="secondary" className="text-[10px]">{unresolved.length} active</Badge>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {notifs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              All caught up!
            </div>
          ) : (
            notifs.map((notif) => {
              const Icon = ICON_MAP[notif.type];
              return (
                <div
                  key={notif.id}
                  className={`p-3 border-b last:border-0 transition-all ${notif.resolved ? "opacity-40" : ""}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`p-1.5 rounded-lg border shrink-0 ${COLOR_MAP[notif.priority]}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-tight">{notif.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{notif.desc}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        {notif.actions.map((action) => (
                          <Button
                            key={action.label}
                            size="sm"
                            variant={action.label === "Decline" ? "ghost" : "outline"}
                            className="h-7 px-2.5 text-xs"
                            disabled={notif.resolved}
                            onClick={() => resolveNotif(notif.id, action.label)}
                          >
                            <action.icon className="h-3 w-3 mr-1" />
                            {action.label}
                          </Button>
                        ))}
                        <span className="text-[10px] text-muted-foreground ml-auto">{notif.time}</span>
                      </div>
                    </div>
                    {!notif.resolved && (
                      <button
                        onClick={() => resolveNotif(notif.id)}
                        className="text-muted-foreground hover:text-foreground shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
