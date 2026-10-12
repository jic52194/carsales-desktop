import { useState, useEffect } from "react";
import { Sun, TrendingUp, Calendar, AlertCircle, Flame, X, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BriefData {
  date: string;
  yesterday: { sales: number; revenue: string; gross: string };
  today: { appointments: number; hotLeads: number; tasks: number };
  alerts: string[];
}

const MOCK_BRIEF: BriefData = {
  date: new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
  yesterday: { sales: 4, revenue: "$142,500", gross: "$18,200" },
  today: { appointments: 7, hotLeads: 12, tasks: 5 },
  alerts: [
    "3 deals pending F&I review",
    "2021 Sport Coupe hit 62 days on lot — price drop suggested",
    "Sarah Jenkins hasn't followed up on her hot lead in 5+ hours",
  ],
};

export function MorningBrief() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem("morning_brief_seen");
    const hour = new Date().getHours();
    if (!seen && hour >= 5 && hour < 12) {
      setTimeout(() => setShow(true), 2000);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    sessionStorage.setItem("morning_brief_seen", Date.now().toString());
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-background rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white relative">
          <button onClick={dismiss} className="absolute top-3 right-3 text-white/80 hover:text-white">
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Coffee className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider opacity-90">Daily Morning Brief</span>
          </div>
          <h2 className="text-2xl font-black">Good morning! ☀️</h2>
          <p className="text-sm opacity-90 mt-1">{MOCK_BRIEF.date}</p>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Yesterday */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Yesterday's Results</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <TrendingUp className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
                <p className="text-xl font-black">{MOCK_BRIEF.yesterday.sales}</p>
                <p className="text-[10px] text-muted-foreground">Cars Sold</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <p className="text-xl font-black">{MOCK_BRIEF.yesterday.revenue}</p>
                <p className="text-[10px] text-muted-foreground">Revenue</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-emerald-500">{MOCK_BRIEF.yesterday.gross}</p>
                <p className="text-[10px] text-muted-foreground">Gross</p>
              </div>
            </div>
          </div>

          {/* Today */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Today's Pipeline</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3 text-center">
                <Calendar className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                <p className="text-xl font-black">{MOCK_BRIEF.today.appointments}</p>
                <p className="text-[10px] text-muted-foreground">Appointments</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-3 text-center">
                <Flame className="h-4 w-4 text-destructive mx-auto mb-1" />
                <p className="text-xl font-black">{MOCK_BRIEF.today.hotLeads}</p>
                <p className="text-[10px] text-muted-foreground">Hot Leads</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3 text-center">
                <AlertCircle className="h-4 w-4 text-amber-500 mx-auto mb-1" />
                <p className="text-xl font-black">{MOCK_BRIEF.today.tasks}</p>
                <p className="text-[10px] text-muted-foreground">Open Tasks</p>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">⚠️ Needs Attention</h3>
            <div className="space-y-1.5">
              {MOCK_BRIEF.alerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-2 text-sm bg-destructive/5 border border-destructive/10 rounded-lg p-2.5">
                  <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                  <span className="text-foreground/80">{alert}</span>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={dismiss} className="w-full h-11 font-bold">
            Let's sell some cars! 🚗
          </Button>
        </div>
      </div>
    </div>
  );
}
