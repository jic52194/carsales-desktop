import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText as Icon, DollarSign, Car, Wrench, Briefcase, TrendingUp, ArrowUpRight, ArrowDownRight, Activity, BrainCircuit } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { hapticFeedback } from "@/lib/haptics";

const data = [
  { name: "New Sales", value: 42000, color: "hsl(var(--primary))" },
  { name: "Used Sales", value: 38000, color: "hsl(var(--primary))" },
  { name: "Service", value: 25000, color: "hsl(var(--primary))" },
  { name: "Parts", value: 12000, color: "hsl(var(--primary))" },
  { name: "F&I", value: 18000, color: "hsl(var(--primary))" },
];

export default function DOC() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Icon className="h-7 w-7 text-primary" />
            Enterprise Roll-Up Dashboard
          </h1>
          <p className="text-slate-500">Global command center for {new Date().toLocaleDateString()} across 5 locations.</p>
        </div>
        <div className="flex gap-2 items-center">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 py-1 px-3">
            <TrendingUp className="h-3 w-3 mr-1" /> MTD Performance: +12%
          </Badge>
          <Badge className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 py-1 px-3 shadow-lg flex items-center gap-1">
            <BrainCircuit className="h-3 w-3" /> GOD MODE ACTIVE
          </Badge>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => {
          toast.success("DOC PDF Exported", { description: "Morning report generation sent to Dealer Principal." });
          hapticFeedback();
        }}>
          <Icon className="mr-2 h-4 w-4" /> Export DOC PDF
        </Button>
      </div>

      <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-max mb-4 overflow-x-auto max-w-full scrollbar-hide">
        <Button size="sm" variant="default" className="h-8 rounded-md shadow-sm whitespace-nowrap">All Stores (5)</Button>
        <Button size="sm" variant="ghost" className="h-8 rounded-md whitespace-nowrap">Main Store</Button>
        <Button size="sm" variant="ghost" className="h-8 rounded-md whitespace-nowrap">Northside</Button>
        <Button size="sm" variant="ghost" className="h-8 rounded-md whitespace-nowrap">Southpoint</Button>
        <Button size="sm" variant="ghost" className="h-8 rounded-md whitespace-nowrap">West End</Button>
        <Button size="sm" variant="ghost" className="h-8 rounded-md whitespace-nowrap">East Valley</Button>
      </div>

      <Card className="mb-6 bg-indigo-50/50 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/50 shadow-sm">
        <CardContent className="p-5 flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl shrink-0">
            <BrainCircuit className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-indigo-900 dark:text-indigo-300 mb-1">AI Executive Summary</h3>
            <p className="text-sm text-indigo-800/80 dark:text-indigo-200/70 leading-relaxed">
              <strong>Good Morning.</strong> Group total gross is pacing 12% ahead of target. 
              Service revenue at Southpoint is down 2.1% due to technician capacity. 
              AI recommends shifting 2 overflow techs from Main Store to Southpoint today. 
              Used inventory aging is creeping up—consider a $500 price drop on the 12 units over 60 days.
            </p>
          </div>
          <Button variant="outline" className="shrink-0 bg-white dark:bg-slate-950 border-indigo-200 text-indigo-700 hover:bg-indigo-50" onClick={() => {
            toast.success("AI Recommendations Applied", { description: "Tech schedules adjusted and prices updated across 12 units." });
            hapticFeedback();
          }}>
            Apply Recommendations
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-medium text-emerald-600 flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-0.5" /> 8.2%
              </span>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">Total Gross Profit</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">$135,000</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Car className="h-5 w-5 text-blue-500" />
              </div>
              <span className="text-xs font-medium text-emerald-600 flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-0.5" /> 12 units
              </span>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">Units Sold (MTD)</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">48</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Wrench className="h-5 w-5 text-amber-500" />
              </div>
              <span className="text-xs font-medium text-red-600 flex items-center">
                <ArrowDownRight className="h-3 w-3 mr-0.5" /> 2.1%
              </span>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">Service Revenue</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">$25,400</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Briefcase className="h-5 w-5 text-purple-500" />
              </div>
              <span className="text-xs font-medium text-emerald-600 flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-0.5" /> $150
              </span>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">Avg F&I PVR</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">$1,850</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Revenue by Department</CardTitle>
            <CardDescription>Current month-to-date gross profit distribution.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(val) => `$${val/1000}k`} />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Real-Time Cash Flow Visualizer</CardTitle>
            <CardDescription>Accounts Receivable vs Accounts Payable.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Operating Account</span>
                <span className="font-bold text-emerald-500">$452,300</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[75%]" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Contracts in Transit (AR)</span>
                <span className="font-bold text-blue-500">$128,500</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-[45%]" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Floorplan Interest & Payables</span>
                <span className="font-bold text-rose-500">$84,200</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 w-[30%]" />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
                <BrainCircuit className="h-4 w-4" /> AI Month-End Pacing
              </h4>
              <div className="space-y-2">
                <div className="p-3 bg-primary/5 text-sm rounded-lg border border-primary/20">
                  <p className="font-semibold text-primary mb-1">Projected Finish: 142 Units</p>
                  <p className="text-xs text-muted-foreground">You are currently pacing 12 units ahead of your monthly goal. AI recommends holding gross on used inventory.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500" /> Real-Time Dealership Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative h-24 w-24 flex items-center justify-center rounded-full border-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20">
                <span className="text-3xl font-black text-emerald-600">92</span>
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Sales Velocity</span>
                  <span className="font-medium text-emerald-600">Excellent</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Inventory Aging</span>
                  <span className="font-medium text-amber-500">Warning (12 units {'>'} 60 days)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Service Absorption</span>
                  <span className="font-medium text-emerald-600">85% (Target: 80%)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Market Share vs Competitors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-bold">Our Auto Group</span>
                  <span className="font-bold text-primary">34%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                  <div className="bg-primary h-full" style={{ width: '34%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">Bob's Mega Mall</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">28%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                  <div className="bg-slate-400 h-full" style={{ width: '28%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">Highway 99 Motors</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">19%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                  <div className="bg-slate-400 h-full" style={{ width: '19%' }}></div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4 italic">Based on simulated local vehicle registration data (50-mile radius).</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
