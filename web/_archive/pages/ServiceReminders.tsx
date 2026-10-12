import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wrench, Bell, Car, Calendar, AlertCircle, Send, BrainCircuit, Clock } from "lucide-react";
import { toast } from "sonner";

interface Reminder {
  id: string;
  customer: string;
  vehicle: string;
  type: "oil" | "tire" | "brake" | "inspection" | "recall";
  dueIn: string;
  mileage: string;
  lastVisit: string;
  priority: "high" | "medium" | "low";
  estimatedRevenue: number;
}

const REMINDERS: Reminder[] = [
  { id: "1", customer: "Sarah Jenkins", vehicle: "2024 Luxury SUV", type: "oil", dueIn: "Overdue 200 mi", mileage: "9,800", lastVisit: "Jan 2024", priority: "high", estimatedRevenue: 89 },
  { id: "2", customer: "John Doe", vehicle: "2021 Family Sedan", type: "brake", dueIn: "Due in 500 mi", mileage: "42,000", lastVisit: "Jun 2023", priority: "high", estimatedRevenue: 340 },
  { id: "3", customer: "Mike Ross", vehicle: "2022 Electric Hatch", type: "tire", dueIn: "Due in 1,200 mi", mileage: "28,000", lastVisit: "Oct 2023", priority: "medium", estimatedRevenue: 680 },
  { id: "4", customer: "Emily Blunt", vehicle: "2020 Rugged Truck", type: "inspection", dueIn: "Due in 2 weeks", mileage: "55,000", lastVisit: "Aug 2023", priority: "medium", estimatedRevenue: 45 },
  { id: "5", customer: "David Chen", vehicle: "2023 Premium EV", type: "recall", dueIn: "Safety Recall", mileage: "12,000", lastVisit: "Dec 2023", priority: "high", estimatedRevenue: 0 },
];

const TYPE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  oil: { label: "Oil Change", icon: Wrench, color: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400" },
  tire: { label: "Tire Rotation", icon: Car, color: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400" },
  brake: { label: "Brake Service", icon: AlertCircle, color: "bg-destructive/10 text-destructive" },
  inspection: { label: "Inspection", icon: Calendar, color: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" },
  recall: { label: "Recall", icon: AlertCircle, color: "bg-destructive/10 text-destructive" },
};

export default function ServiceReminders() {
  const sendReminder = (r: Reminder) => {
    toast.success(`Reminder sent to ${r.customer}`, { description: `AI personalized ${TYPE_LABELS[r.type].label} reminder via SMS + email.` });
  };

  const sendAll = () => {
    toast.success(`Sent ${REMINDERS.length} reminders`, { description: "AI batch-sent personalized service outreach." });
  };

  const totalRevenue = REMINDERS.reduce((a, r) => a + r.estimatedRevenue, 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Predictive Service Reminders</h1>
            <p className="text-sm text-muted-foreground mt-0.5">AI-generated outreach based on mileage, last visit, and recall data</p>
          </div>
        </div>
        <Button onClick={sendAll} className="bg-primary">
          <BrainCircuit className="h-4 w-4 mr-2" /> Send All Reminders
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Bell className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Pending Reminders</span></div>
          <p className="text-2xl font-black">{REMINDERS.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><AlertCircle className="h-4 w-4 text-destructive" /><span className="text-xs text-muted-foreground">High Priority</span></div>
          <p className="text-2xl font-black text-destructive">{REMINDERS.filter(r => r.priority === "high").length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Wrench className="h-4 w-4 text-amber-500" /><span className="text-xs text-muted-foreground">Est. Revenue</span></div>
          <p className="text-2xl font-black text-emerald-500">${totalRevenue.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-blue-500" /><span className="text-xs text-muted-foreground">Avg Response Rate</span></div>
          <p className="text-2xl font-black text-blue-500">34%</p>
        </CardContent></Card>
      </div>

      {/* Reminder Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REMINDERS.map((r) => {
          const typeInfo = TYPE_LABELS[r.type];
          return (
            <Card key={r.id} className={r.priority === "high" ? "border-destructive/20" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl ${typeInfo.color} shrink-0`}>
                    <typeInfo.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-sm">{r.customer}</p>
                      {r.priority === "high" && <Badge className="text-[9px] bg-destructive text-destructive-foreground">URGENT</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{r.vehicle} · {r.mileage} mi</p>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <Badge variant="secondary" className="text-[10px]">{typeInfo.label}</Badge>
                      <span className={r.priority === "high" ? "text-destructive font-semibold" : "text-muted-foreground"}>{r.dueIn}</span>
                      <span className="text-muted-foreground">Last: {r.lastVisit}</span>
                    </div>
                    {r.estimatedRevenue > 0 && (
                      <p className="text-xs text-emerald-500 font-bold mt-2">Est. revenue: ${r.estimatedRevenue}</p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => sendReminder(r)}>
                    <Send className="h-3.5 w-3.5 mr-1" /> Send
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
