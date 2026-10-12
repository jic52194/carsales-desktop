import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Target, TrendingUp, Award, DollarSign, Sparkles, Download, Search, Calendar as CalendarIcon, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { addDays, format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
const salesData = [
  { name: "Jan", units: 42, profit: 120000 },
  { name: "Feb", units: 38, profit: 110000 },
  { name: "Mar", units: 55, profit: 165000 },
  { name: "Apr", units: 48, profit: 140000 },
  { name: "May", units: 62, profit: 185000 },
  { name: "Jun", units: 45, profit: 135000 },
];

const salespersonData = [
  { name: "Mike R.", units: 18 },
  { name: "Sarah J.", units: 14 },
  { name: "David C.", units: 9 },
  { name: "Emily B.", units: 4 },
];

export default function Metrics() {
  const [view, setView] = useState<'visual' | 'table'>('visual');
  const [drillDown, setDrillDown] = useState<{ title: string, data: any[] } | null>(null);
  const [filterText, setFilterText] = useState("");
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(2025, 4, 1),
    to: new Date(2025, 4, 31),
  });
  const [comparePrevious, setComparePrevious] = useState(false);

  const filteredDrillDownData = drillDown?.data.filter(row => 
    Object.values(row).some(val => String(val).toLowerCase().includes(filterText.toLowerCase()))
  ) || [];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto" data-tour-id="tour-staff">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Interactive Analytics</h1>
          <p className="text-slate-500 mt-2">Track dealership performance, sales targets, and KPIs.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-full sm:w-[260px] justify-start text-left font-normal bg-card",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} -{" "}
                      {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <div className="flex items-center space-x-2 bg-card border border-border px-3 py-2 rounded-md">
            <Switch id="compare-mode" checked={comparePrevious} onCheckedChange={setComparePrevious} />
            <Label htmlFor="compare-mode" className="text-sm font-medium cursor-pointer">Compare</Label>
          </div>
          <Button variant="outline" className="bg-white dark:bg-slate-900 hidden sm:flex" onClick={() => {
            toast.promise(
              new Promise(resolve => setTimeout(resolve, 2000)),
              {
                loading: 'AI is analyzing today\'s performance...',
                success: 'Executive Summary Generated! Sent to your email.',
                error: 'Failed to generate summary.'
              }
            );
          }}>
            <Sparkles className="mr-2 h-4 w-4 text-primary" /> AI Summary
          </Button>
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 hidden sm:flex">
            <Button 
              variant={view === 'visual' ? 'default' : 'ghost'} 
              size="sm" 
              className={`h-8 px-4 text-xs ${view === 'visual' ? 'shadow-sm' : ''}`}
              onClick={() => setView('visual')}
            >
              Visual
            </Button>
            <Button 
              variant={view === 'table' ? 'default' : 'ghost'} 
              size="sm" 
              className={`h-8 px-4 text-xs ${view === 'table' ? 'shadow-sm' : ''}`}
              onClick={() => setView('table')}
            >
              Table
            </Button>
          </div>
          <Button><Target className="mr-2 h-4 w-4" /> Set New Goal</Button>
        </div>
      </div>
      
      {view === 'visual' ? (
        <>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border border-border/50 bg-gradient-to-br from-background to-primary/5 dark:to-primary/10 shadow-sm relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center gap-2 text-primary"><TrendingUp className="h-5 w-5" /> Monthly Volume</CardTitle>
                <CardDescription>Total units sold vs target.</CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-4xl font-black tracking-tight text-foreground">45 <span className="text-xl text-muted-foreground font-medium">/ 60</span></div>
                <p className="text-sm text-slate-500 mt-1 font-bold">75% to goal {comparePrevious && <span className="text-emerald-500 ml-2">(+5% vs prev)</span>}</p>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full mt-4 overflow-hidden shadow-inner">
                  <div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: '75%' }}></div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-border/50 bg-gradient-to-br from-background to-emerald-500/5 dark:to-emerald-500/10 shadow-sm relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400"><Award className="h-5 w-5" /> F&I Performance</CardTitle>
                <CardDescription>Average back-end gross per copy.</CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-4xl font-black tracking-tight text-foreground">$1,850</div>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1 bg-emerald-500/10 w-max px-2 py-0.5 rounded-full"><TrendingUp className="h-3 w-3" /> +12% from last month</p>
              </CardContent>
            </Card>
            
            <Card className="border border-border/50 bg-gradient-to-br from-background to-violet-500/5 dark:to-violet-500/10 shadow-sm relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center gap-2 text-violet-600 dark:text-violet-400"><Target className="h-5 w-5" /> Sales CSI</CardTitle>
                <CardDescription>Customer Satisfaction Index.</CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-4xl font-black tracking-tight text-foreground">96.4</div>
                <p className="text-sm font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1 mt-1 bg-violet-500/10 w-max px-2 py-0.5 rounded-full">Top 10% in region</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mt-8">
            <Card className="border border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary"><DollarSign className="h-5 w-5" /> Profit Trends</CardTitle>
                <CardDescription>Gross profit over the last 6 months.</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value/1000}k`} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <RechartsTooltip 
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Profit']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="profit" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={4} 
                      dot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--background))' }} 
                      activeDot={{ 
                        r: 8, 
                        strokeWidth: 0, 
                        fill: 'hsl(var(--primary))', 
                        onClick: (_, event: any) => {
                          const payload = event?.payload;
                          if (!payload) return;
                          setDrillDown({
                            title: `${payload.name} - Profit Breakdown`,
                            data: [
                              { category: "Vehicle Gross", amount: `$${(payload.profit * 0.6).toLocaleString()}` },
                              { category: "F&I", amount: `$${(payload.profit * 0.3).toLocaleString()}` },
                              { category: "Holdback/Reserve", amount: `$${(payload.profit * 0.1).toLocaleString()}` }
                            ]
                          });
                        }, 
                        className: "cursor-pointer hover:opacity-80" 
                      }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary"><Award className="h-5 w-5" /> Salesperson Performance</CardTitle>
                <CardDescription>Units sold by salesperson this month.</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salespersonData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 'bold' }} />
                    <RechartsTooltip 
                      formatter={(value: number) => [value, 'Units Sold']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                    />
                    <Bar dataKey="units" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={32} onClick={(data) => {
                      setDrillDown({
                        title: `${data.name} - Detailed Sales`,
                        data: Array.from({ length: data.units }).map((_, i) => ({
                          id: `deal-${i}`,
                          customer: `Customer ${i + 1}`,
                          vehicle: "2024 Model X",
                          date: "May 2025",
                          gross: `$${Math.floor(Math.random() * 3000 + 1000)}`
                        }))
                      });
                    }} className="cursor-pointer hover:opacity-80" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vendor ROI Tracker</CardTitle>
              <CardDescription>Calculates exact Cost-Per-Lead and Cost-Per-Sale for external marketing sources.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor Source</TableHead>
                      <TableHead>Monthly Spend</TableHead>
                      <TableHead>Total Leads</TableHead>
                      <TableHead>Cost Per Lead (CPL)</TableHead>
                      <TableHead>Units Sold</TableHead>
                      <TableHead>Cost Per Sale (CPS)</TableHead>
                      <TableHead>Total Gross ROI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { name: "Autotrader", spend: 4500, leads: 120, sold: 12, roi: "315%" },
                      { name: "Cars.com", spend: 3800, leads: 95, sold: 8, roi: "240%" },
                      { name: "Facebook Ads", spend: 2500, leads: 210, sold: 15, roi: "480%" },
                      { name: "Google Search", spend: 5200, leads: 180, sold: 22, roi: "520%" },
                    ].map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>${row.spend.toLocaleString()}</TableCell>
                        <TableCell>{row.leads}</TableCell>
                        <TableCell className="font-bold text-amber-600">${Math.round(row.spend / row.leads)}</TableCell>
                        <TableCell>{row.sold}</TableCell>
                        <TableCell className="font-bold text-primary">${Math.round(row.spend / row.sold)}</TableCell>
                        <TableCell className="font-bold text-emerald-600">{row.roi}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" /> Export to CSV</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={!!drillDown} onOpenChange={(open) => {
        if (!open) {
          setDrillDown(null);
          setFilterText("");
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{drillDown?.title}</DialogTitle>
            <DialogDescription>Detailed breakdown of the selected metric.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Filter data..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="overflow-x-auto mt-2 max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  {drillDown?.data && drillDown.data.length > 0 && Object.keys(drillDown.data[0]).map(key => (
                    <TableHead key={key} className="capitalize">{key}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrillDownData.map((row, i) => (
                  <TableRow key={i}>
                    {Object.values(row).map((val: any, j) => (
                      <TableCell key={j}>{val}</TableCell>
                    ))}
                  </TableRow>
                ))}
                {filteredDrillDownData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={drillDown?.data?.[0] ? Object.keys(drillDown.data[0]).length : 1} className="text-center py-4 text-slate-500">
                      No results found matching your filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
