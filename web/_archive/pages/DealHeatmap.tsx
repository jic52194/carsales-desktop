import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, TrendingDown, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";

const STAGES = ["New Lead", "Contacted", "Appointment Set", "Showroom Visit", "Negotiation", "F&I", "Funded"];

const HEATMAP_DATA = STAGES.map((stage, i) => ({
  stage,
  stalled: [2, 8, 5, 12, 18, 7, 0][i],
  avgDays: [0.5, 2.1, 3.5, 5.2, 8.1, 4.3, 2.0][i],
  conversionRate: [100, 85, 72, 58, 40, 35, 32][i],
}));

const BOTTLENECKS = [
  { stage: "Negotiation", issue: "18 deals stalled — avg 8.1 days", severity: "critical", insight: "Customers waiting too long for desk approval. Consider auto-approval thresholds." },
  { stage: "Showroom Visit", issue: "12 deals stalled — avg 5.2 days", severity: "high", insight: "Credit pulls taking too long. Pre-qualify before arrival." },
  { stage: "Contacted", issue: "8 deals stalled — avg 2.1 days", severity: "medium", insight: "Follow-up cadence too slow. Enable AI auto-texting." },
];

export default function DealHeatmap() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-destructive/10">
          <Flame className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Deal Friction Heatmap</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visual analytics showing where deals stall in your pipeline</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Flame className="h-4 w-4 text-destructive" /><span className="text-xs text-muted-foreground">Total Stalled</span></div>
          <p className="text-2xl font-black text-destructive">52</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-amber-500" /><span className="text-xs text-muted-foreground">Avg Days Stuck</span></div>
          <p className="text-2xl font-black text-amber-500">5.4</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingDown className="h-4 w-4 text-destructive" /><span className="text-xs text-muted-foreground">Biggest Bottleneck</span></div>
          <p className="text-lg font-black">Negotiation</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-xs text-muted-foreground">Overall Conversion</span></div>
          <p className="text-2xl font-black text-emerald-500">32%</p>
        </CardContent></Card>
      </div>

      {/* Heatmap Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stalled Deals by Stage</CardTitle>
          <CardDescription>Red bars indicate high friction — deals sitting too long at that stage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={HEATMAP_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="stage" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))" }} />
                <Bar dataKey="stalled" radius={[4, 4, 0, 0]}>
                  {HEATMAP_DATA.map((entry, i) => (
                    <Cell key={i} fill={entry.stalled > 10 ? "hsl(var(--destructive))" : entry.stalled > 5 ? "#f59e0b" : "hsl(var(--primary))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Bottleneck Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> AI Bottleneck Analysis</CardTitle>
          <CardDescription>AI-identified friction points with recommended actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {BOTTLENECKS.map((b, i) => (
            <div key={i} className={`rounded-xl p-4 border ${
              b.severity === "critical" ? "bg-destructive/5 border-destructive/20" :
              b.severity === "high" ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40" :
              "bg-muted/50 border-border/50"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={`text-[10px] ${
                  b.severity === "critical" ? "bg-destructive text-destructive-foreground" :
                  b.severity === "high" ? "bg-amber-500 text-white" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {b.severity.toUpperCase()}
                </Badge>
                <span className="font-bold text-sm">{b.stage}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{b.issue}</p>
              <div className="flex items-start gap-2 text-sm">
                <Flame className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-foreground/80"><span className="font-semibold">AI Recommendation:</span> {b.insight}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
