import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wallet as Icon, TrendingDown, TrendingUp, AlertCircle, Calendar, Plus, Download, Search, Filter, BrainCircuit } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const pieData = [
  { name: "Toyota Financial", value: 1200000, color: "hsl(var(--primary))" },
  { name: "Ally Floorplan", value: 850000, color: "hsl(var(--primary) / 0.7)" },
  { name: "NextGear Capital", value: 450000, color: "hsl(var(--primary) / 0.4)" },
];

const barData = [
  { name: "0-30 Days", value: 1800000 },
  { name: "31-60 Days", value: 450000 },
  { name: "61-90 Days", value: 150000 },
  { name: "91+ Days", value: 100000 },
];

export default function Floorplan() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Icon className="h-7 w-7 text-primary" />
            Floorplan Management
          </h1>
          <p className="text-slate-500">Monitor credit line utilization, interest expenses, and curtailment schedules.</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-900 dark:text-indigo-400 dark:bg-indigo-900/30" onClick={() => {
            toast.success("Smart Audit Complete", { description: "AI identified 3 units approaching 90 days. Recommended $500 price drop to avoid $1,200 in upcoming interest penalties." });
          }}>
            <BrainCircuit className="mr-2 h-4 w-4" /> Smart Floorplan Audit
          </Button>
          <Button variant="outline" className="bg-white dark:bg-slate-950">
            <Calendar className="mr-2 h-4 w-4" /> View Audits
          </Button>
          <Button className="bg-primary text-white">
            <Plus className="mr-2 h-4 w-4" /> New Payoff
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">68% Utilized</Badge>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">Total Line Used</p>
              <h3 className="text-2xl font-bold">$2,500,000</h3>
              <p className="text-xs text-slate-400 mt-1">Of $3,750,000 Total Limit</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                <TrendingDown className="h-5 w-5" />
              </div>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">MTD</Badge>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">Interest Expense</p>
              <h3 className="text-2xl font-bold">$12,450</h3>
              <p className="text-xs text-slate-400 mt-1">Avg Rate: 8.25%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                <AlertCircle className="h-5 w-5" />
              </div>
              <Badge variant="secondary" className="bg-red-50 text-red-700">Critical</Badge>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">Upcoming Curtailments</p>
              <h3 className="text-2xl font-bold">$45,200</h3>
              <p className="text-xs text-slate-400 mt-1">Due within 7 days</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                <TrendingUp className="h-5 w-5" />
              </div>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">Good</Badge>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">Turn Rate</p>
              <h3 className="text-2xl font-bold">42 Days</h3>
              <p className="text-xs text-slate-400 mt-1">Rolling 90-day average</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Lender Distribution</CardTitle>
            <CardDescription>Breakdown of floorplan balance by institution.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Aging by Dollars</CardTitle>
            <CardDescription>Total floorplan balance aged by units in stock.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `$${val/1000000}M`} />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Critical Curtailment Schedule</CardTitle>
            <CardDescription>Units requiring paydown to avoid excessive interest or line reduction.</CardDescription>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0" onClick={() => toast.success("AI Optimizer Applied", { description: "Reallocated $15,000 from operating account to pay off 3 high-interest units." })}>
            <BrainCircuit className="mr-2 h-4 w-4" /> AI Optimize Payoffs
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { stock: "2405A", vehicle: "2021 Ford F-150", due: "Tomorrow", amount: 4500, progress: 95 },
            { stock: "2395F", vehicle: "2017 BMW 3 Series", due: "3 Days", amount: 2800, progress: 80 },
            { stock: "2390H", vehicle: "2023 Kia Telluride", due: "12 Days", amount: 6200, progress: 40 },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
              <div className="w-16 font-mono text-xs font-bold text-slate-500">{item.stock}</div>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-sm">{item.vehicle}</span>
                  <span className="text-xs font-bold text-red-600">Due {item.due}</span>
                </div>
                <Progress value={item.progress} className="h-1.5" />
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">${item.amount.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500 uppercase">Paydown Amt</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
