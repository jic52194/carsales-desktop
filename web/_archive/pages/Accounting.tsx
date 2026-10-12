import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, Users, Wallet, Calculator, DollarSign, CalendarIcon, CheckSquare, History, AlertCircle, CheckCircle2, FileDown, Check, X, FileText, ArrowRightLeft, Building2, TrendingUp, Sparkles, Receipt, Banknote, BrainCircuit, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { hapticFeedback } from "@/lib/haptics";
import { Progress } from "@/components/ui/progress";

const MOCK_USERS = [
  { id: 1, name: "Admin User", email: "admin@carsalessoftware.com", role: "admin", status: "Active", payType: "salary", baseRate: 120000, frontEndComm: 0, backEndComm: 0, drawBalance: 0, spiffs: 0, perms: { viewCosts: true, approveDeals: true, exportData: true } },
  { id: 2, name: "Sales Manager", email: "manager@carsalessoftware.com", role: "manager", status: "Active", payType: "base_commission", baseRate: 60000, frontEndComm: 5, backEndComm: 2, drawBalance: 0, spiffs: 500, perms: { viewCosts: true, approveDeals: true, exportData: false } },
  { id: 3, name: "Finance Dept", email: "finance@carsalessoftware.com", role: "f_and_i", status: "Active", payType: "base_commission", baseRate: 50000, frontEndComm: 0, backEndComm: 10, drawBalance: 0, spiffs: 200, perms: { viewCosts: true, approveDeals: false, exportData: false } },
  { id: 4, name: "Sales Rep 1", email: "sales1@carsalessoftware.com", role: "sales", status: "Active", payType: "commission", baseRate: 0, frontEndComm: 25, backEndComm: 5, drawBalance: 1500, spiffs: 150, perms: { viewCosts: false, approveDeals: false, exportData: false } },
];

const MOCK_AUDIT_LOGS = [
  { id: 1, action: "Modified Pay Plan", user: "Admin User", target: "Sales Rep 1", date: "2024-05-10 14:30" },
  { id: 2, action: "Approved Commission", user: "Sales Manager", target: "Deal #24001A", date: "2024-05-09 11:15" },
  { id: 3, action: "Changed Permission", user: "Admin User", target: "Finance Dept", date: "2024-05-08 09:45" },
];

const MOCK_APPROVALS = [
  { id: 1, rep: "Sales Rep 1", deal: "24001A - Toyota Camry", gross: 3500, commission: 875, status: "Pending" },
  { id: 2, rep: "Sales Rep 1", deal: "24045B - Ford F-150", gross: 4200, commission: 1050, status: "Pending" },
];

const MOCK_FLOORPLAN = [
  { id: "FP-101", vin: "1FTEW1E55", vehicle: "2023 Ford F-150", amount: 45000, days: 45, status: "Active", interest: 350 },
  { id: "FP-102", vin: "JTDKN3DP5", vehicle: "2024 Toyota Camry", amount: 28000, days: 12, status: "Active", interest: 85 },
  { id: "FP-103", vin: "3VW5K7AJ3", vehicle: "2022 VW Jetta", amount: 18500, days: 95, status: "Curtailment Due", interest: 520 },
  { id: "FP-104", vin: "5YJ3E1EA5", vehicle: "2023 Tesla Model 3", amount: 32000, days: 22, status: "Active", interest: 150 },
  { id: "FP-105", vin: "1G1RC6E45", vehicle: "2021 Chevy Silverado", amount: 38000, days: 65, status: "Active", interest: 410 },
  { id: "FP-106", vin: "2T1BURHE7", vehicle: "2022 Toyota RAV4", amount: 24500, days: 110, status: "Curtailment Due", interest: 680 },
];

const MOCK_AP_AR = [
  { id: "INV-201", type: "Payable", vendor: "Local Auto Parts", amount: 1250.00, dueDate: "2024-05-15", status: "Pending" },
  { id: "INV-202", type: "Payable", vendor: "Detailing Pros", amount: 850.00, dueDate: "2024-05-12", status: "Overdue" },
  { id: "REC-301", type: "Receivable", vendor: "Ally Financial (CIT)", amount: 35400.00, dueDate: "2024-05-10", status: "Pending" },
];

const MOCK_GL_ACCOUNTS = [
  { id: "1000", name: "Cash in Bank", type: "Asset" },
  { id: "1200", name: "Accounts Receivable", type: "Asset" },
  { id: "1500", name: "Inventory - New Vehicles", type: "Asset" },
  { id: "1510", name: "Inventory - Used Vehicles", type: "Asset" },
  { id: "2000", name: "Accounts Payable", type: "Liability" },
  { id: "2200", name: "Floorplan Notes Payable", type: "Liability" },
  { id: "3000", name: "Vehicle Sales - New", type: "Revenue" },
  { id: "3010", name: "Vehicle Sales - Used", type: "Revenue" },
  { id: "3100", name: "F&I Income", type: "Revenue" },
  { id: "4000", name: "Cost of Goods Sold - Vehicles", type: "Expense" },
];

const MOCK_MAPPINGS = [
  { id: 1, category: "Sales", transactionType: "New Vehicle Sale", defaultGL: "3000", description: "Revenue from new car sales" },
  { id: 2, category: "Sales", transactionType: "Used Vehicle Sale", defaultGL: "3010", description: "Revenue from used car sales" },
  { id: 3, category: "F&I", transactionType: "Finance Reserve", defaultGL: "3100", description: "Bank fee markup and reserve" },
  { id: 4, category: "F&I", transactionType: "Warranty Sales", defaultGL: "3100", description: "VSC and extended warranty" },
  { id: 5, category: "Inventory", transactionType: "Floorplan Interest", defaultGL: "2200", description: "Accrued interest on floorplan" },
  { id: 6, category: "Inventory", transactionType: "Vehicle Purchase", defaultGL: "1510", description: "Acquisition of used inventory" },
];

export default function Accounting() {
  const [editingUser, setEditingUser] = useState<any>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [approvalsOpen, setApprovalsOpen] = useState(false);
  const [frontEndGross, setFrontEndGross] = useState<number>(3500);
  const [backEndGross, setBackEndGross] = useState<number>(2100);
  const [pack, setPack] = useState<number>(500);
  const [commissionRate, setCommissionRate] = useState<number>(25);
  const [backEndCommissionRate, setBackEndCommissionRate] = useState<number>(5);

  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  const totalGross = frontEndGross + backEndGross;
  const payableFrontEnd = Math.max(0, frontEndGross - pack);
  const frontEndCommission = payableFrontEnd * (commissionRate / 100);
  const backEndCommission = backEndGross * (backEndCommissionRate / 100);
  const totalCommission = frontEndCommission + backEndCommission;

  const agingData = useMemo(() => {
    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    MOCK_FLOORPLAN.forEach(item => {
      if (item.days <= 30) buckets['0-30'] += item.amount;
      else if (item.days <= 60) buckets['31-60'] += item.amount;
      else if (item.days <= 90) buckets['61-90'] += item.amount;
      else buckets['90+'] += item.amount;
    });
    return [
      { name: '0-30 Days', value: buckets['0-30'] },
      { name: '31-60 Days', value: buckets['31-60'] },
      { name: '61-90 Days', value: buckets['61-90'] },
      { name: '90+ Days', value: buckets['90+'] },
    ];
  }, []);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            Accounting Suite
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3 mr-1" /> AI Reconciled
            </Badge>
          </h1>
          <p className="text-slate-500 mt-2">Manage dealership finances, floorplan, AP/AR, and payroll.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-full sm:w-[260px] justify-start text-left font-normal bg-white dark:bg-slate-950",
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
          <Button onClick={() => {
            toast.success("QuickBooks Online sync completed successfully!");
            hapticFeedback();
          }} className="bg-primary hover:bg-primary/90 text-white">
            <ArrowRightLeft className="mr-2 h-4 w-4" /> Sync ERP
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl inline-flex w-max mb-6 overflow-x-auto max-w-full">
          <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm">Overview</TabsTrigger>
          <TabsTrigger value="ap-ar" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm">AP / AR</TabsTrigger>
          <TabsTrigger value="floorplan" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm">Floorplan</TabsTrigger>
          <TabsTrigger value="payroll" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm">Payroll & Roles</TabsTrigger>
          <TabsTrigger value="gl-mapping" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm">GL Mapping</TabsTrigger>
          <TabsTrigger value="month-end" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm">Month-End Close</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-slate-500">Operating Cash</p>
                  <DollarSign className="h-4 w-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold">$1.2M</div>
                <p className="text-xs text-emerald-500 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" /> +4.5% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-slate-500">Contracts in Transit (CIT)</p>
                  <FileText className="h-4 w-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold">$485,000</div>
                <p className="text-xs text-slate-500 mt-1">12 deals pending funding</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-slate-500">Total AP</p>
                  <Receipt className="h-4 w-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold">$42,500</div>
                <p className="text-xs text-destructive flex items-center mt-1">
                  $8,200 overdue
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-slate-500">Floorplan Balance</p>
                  <Building2 className="h-4 w-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold">$2.8M</div>
                <p className="text-xs text-slate-500 mt-1">68 units financed</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-amber-800 dark:text-amber-500 flex items-center gap-2 text-lg">
                  <CheckSquare className="h-5 w-5" /> Accounting Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded border border-amber-200 dark:border-amber-900">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium">Floorplan Curtailments Due</span>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs">Review</Button>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded border border-amber-200 dark:border-amber-900">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium">Unreconciled Bank Transactions (14)</span>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs">Reconcile</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-primary flex items-center gap-2 text-lg">
                  <BrainCircuit className="h-5 w-5" /> AI Financial Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <p className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>Based on current burn rate and incoming CIT, operating cash will dip below $1M by the 15th. Recommended to delay vendor payments by 3 days.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>Recon costs are trending 12% higher this month. Anomaly detected in "Detailing Pros" invoices.</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ap-ar" className="mt-0">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>Accounts Payable & Receivable</CardTitle>
                <CardDescription>Manage incoming and outgoing payments.</CardDescription>
              </div>
              <Button onClick={() => {
                toast.success("AI Invoice Scanner started", {
                  description: "Processing receipts from the inbox..."
                });
                hapticFeedback();
              }} className="gap-2">
                <ScanLine className="h-4 w-4" /> AI Receipt OCR
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Vendor / Source</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_AP_AR.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.id}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={item.type === 'Payable' ? 'text-destructive border-destructive/30 bg-destructive/10' : 'text-success border-success/30 bg-success/10'}>
                            {item.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.vendor}</TableCell>
                        <TableCell>{item.dueDate}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={item.status === 'Overdue' ? 'bg-destructive text-destructive-foreground' : ''}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold">${item.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">View</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="floorplan" className="mt-0">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>Floorplan Management</CardTitle>
                <CardDescription>Track vehicle financing and curtailments.</CardDescription>
              </div>
              <Button variant="outline" className="gap-2">
                <FileDown className="h-4 w-4" /> Export Report
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-500 font-medium">Floorplan Aging (Dollars)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={agingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis tickFormatter={(val) => `$${val/1000}k`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <RechartsTooltip 
                            formatter={(value: number) => `$${value.toLocaleString()}`}
                            contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                          />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {agingData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.name === '90+ Days' ? 'hsl(var(--destructive))' : entry.name === '61-90 Days' ? 'hsl(var(--amber-500))' : 'hsl(var(--primary))'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-500 font-medium">Floorplan Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px] w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Active (Current)', value: agingData[0].value + agingData[1].value + agingData[2].value, color: 'hsl(var(--success))' },
                              { name: 'Curtailment Due', value: agingData[3].value, color: 'hsl(var(--destructive))' }
                            ]}
                            cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" stroke="none"
                          >
                            <Cell fill="hsl(var(--success))" />
                            <Cell fill="hsl(var(--destructive))" />
                          </Pie>
                          <RechartsTooltip 
                            formatter={(value: number) => `$${value.toLocaleString()}`}
                            contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                          />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                  <p className="text-sm text-slate-500">Total Financed</p>
                  <p className="text-2xl font-bold">${(agingData.reduce((a, b) => a + b.value, 0)).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                  <p className="text-sm text-slate-500">Available Credit</p>
                  <p className="text-2xl font-bold">$1,155,000</p>
                </div>
                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-sm text-destructive font-medium">Curtailments Due</p>
                  <p className="text-2xl font-bold text-destructive">${agingData[3].value.toLocaleString()}</p>
                </div>
              </div>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                    <TableRow>
                      <TableHead>VIN</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Days on Plan</TableHead>
                      <TableHead>Accrued Int.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_FLOORPLAN.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.vin}</TableCell>
                        <TableCell className="font-medium">{item.vehicle}</TableCell>
                        <TableCell>${item.amount.toLocaleString()}</TableCell>
                        <TableCell>{item.days} days</TableCell>
                        <TableCell className="text-destructive">${item.interest}</TableCell>
                        <TableCell>
                          <Badge variant={item.status === 'Curtailment Due' ? 'destructive' : 'secondary'}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">Payoff</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="mt-0 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> Commission Payroll</CardTitle>
                <CardDescription>Review and approve sales commissions.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">$42,500</div>
                <p className="text-sm text-slate-500">Pending payout this period</p>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setApprovalsOpen(true)}>Approve</Button>
                  <Button className="flex-1"><FileDown className="mr-2 h-4 w-4" /> Payroll Export</Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> User Management</CardTitle>
                <CardDescription>Manage roles, pay plans, and permissions.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-3xl font-bold">24</div>
                    <p className="text-sm text-slate-500">Active Employees</p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline"><Users className="mr-2 h-4 w-4" /> Manage</Button>
                    </DialogTrigger>
                    {/* ... keep existing code (User Management Dialog) */}
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>User Management</DialogTitle>
                        <DialogDescription>Manage system access, roles, and permissions for dealership personnel.</DialogDescription>
                      </DialogHeader>
                      <div className="pt-4">
                        <div className="flex justify-between items-center mb-4">
                          <Input placeholder="Search users..." className="max-w-xs" />
                          <Button size="sm">Add New User</Button>
                        </div>
                        <div className="border rounded-md overflow-hidden">
                          <Table>
                            <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {MOCK_USERS.map((user) => (
                                <TableRow key={user.id}>
                                  <TableCell className="font-medium">{user.name}</TableCell>
                                  <TableCell className="text-slate-500">{user.email}</TableCell>
                                  <TableCell>
                                    <Select defaultValue={user.role}>
                                      <SelectTrigger className="w-[140px] h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="admin">Administrator</SelectItem>
                                        <SelectItem value="manager">Manager</SelectItem>
                                        <SelectItem value="f_and_i">F&I Manager</SelectItem>
                                        <SelectItem value="sales">Sales Rep</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">{user.status}</Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setEditingUser(user)}>Edit</Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setAuditOpen(true)}><History className="mr-2 h-4 w-4" /> Audit Logs</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" /> Deal Washout & Commission Calculator</CardTitle>
              <CardDescription>Calculate sales commissions and pack deductions for individual deals.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Deal Financials</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Front-End Gross ($)</Label>
                        <Input type="number" value={frontEndGross} onChange={e => setFrontEndGross(Number(e.target.value))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Back-End Gross ($)</Label>
                        <Input type="number" value={backEndGross} onChange={e => setBackEndGross(Number(e.target.value))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Dealership Pack ($)</Label>
                        <Input type="number" value={pack} onChange={e => setPack(Number(e.target.value))} />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Commission Structure</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Front-End Rate (%)</Label>
                        <Input type="number" value={commissionRate} onChange={e => setCommissionRate(Number(e.target.value))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Back-End Rate (%)</Label>
                        <Input type="number" value={backEndCommissionRate} onChange={e => setBackEndCommissionRate(Number(e.target.value))} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 space-y-6">
                  <h3 className="font-bold text-xl flex items-center gap-2"><DollarSign className="h-5 w-5 text-success" /> Washout Summary</h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Total Deal Gross</span>
                      <span>${totalGross.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Less Pack Deduction</span>
                      <span className="text-destructive">-${pack.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Payable Front-End</span>
                      <span>${payableFrontEnd.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Front-End Commission ({commissionRate}%)</span>
                      <span>${frontEndCommission.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Back-End Commission ({backEndCommissionRate}%)</span>
                      <span>${backEndCommission.toFixed(2)}</span>
                    </div>
                    <Separator className="bg-primary/20" />
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-lg font-bold">Total Sales Commission</span>
                      <span className="text-3xl font-black text-success">${totalCommission.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gl-mapping" className="mt-0">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>General Ledger (GL) Mapping</CardTitle>
                <CardDescription>Map system transaction types to your chart of accounts.</CardDescription>
              </div>
              <Button onClick={() => {
                toast.success("GL Mappings Saved", { description: "Transaction routing has been updated." });
                hapticFeedback();
              }}>
                Save Mappings
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Transaction Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Mapped GL Account</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_MAPPINGS.map((mapping) => (
                      <TableRow key={mapping.id}>
                        <TableCell>
                          <Badge variant="secondary">{mapping.category}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{mapping.transactionType}</TableCell>
                        <TableCell className="text-slate-500">{mapping.description}</TableCell>
                        <TableCell>
                          <Select defaultValue={mapping.defaultGL}>
                            <SelectTrigger className="w-[280px]">
                              <SelectValue placeholder="Select GL Account" />
                            </SelectTrigger>
                            <SelectContent>
                              {MOCK_GL_ACCOUNTS.map(acc => (
                                <SelectItem key={acc.id} value={acc.id}>
                                  <span className="font-mono text-slate-500 mr-2">{acc.id}</span>
                                  {acc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="month-end" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Month-End Close Checklist</CardTitle>
              <CardDescription>Track progress for the period close.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Progress value={65} className="flex-1 h-3" />
                  <span className="font-bold text-sm">65% Complete</span>
                </div>
                
                <div className="space-y-3 border rounded-lg p-4 bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <span className="font-medium line-through text-slate-500">Reconcile Bank Accounts</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <span className="font-medium line-through text-slate-500">Process Payroll & Commissions</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full border-2 border-slate-300 dark:border-slate-600"></div>
                    <span className="font-medium">Floorplan Reconciliation</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full border-2 border-slate-300 dark:border-slate-600"></div>
                    <span className="font-medium">Post Depreciation Entries</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full border-2 border-slate-300 dark:border-slate-600"></div>
                    <span className="font-medium">Finalize Financial Statements</span>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={() => {
                    toast.success("AI Auto-Close initialized.", {
                      description: "Running automated reconciliation tasks in the background."
                    });
                    hapticFeedback();
                  }} className="gap-2 bg-primary">
                    <BrainCircuit className="h-4 w-4" /> Run Auto-Close
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Audit Logs Dialog */}
      <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>System Audit Logs</DialogTitle>
            <DialogDescription>Track changes to permissions, pay plans, and approvals.</DialogDescription>
          </DialogHeader>
          <div className="border rounded-md overflow-hidden mt-4">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_AUDIT_LOGS.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-slate-500 whitespace-nowrap">{log.date}</TableCell>
                    <TableCell className="font-medium">{log.user}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.target}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manager Approvals Dialog */}
      <Dialog open={approvalsOpen} onOpenChange={setApprovalsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manager Approvals</DialogTitle>
            <DialogDescription>Review and approve pending commissions before payroll processing.</DialogDescription>
          </DialogHeader>
          <div className="border rounded-md overflow-hidden mt-4">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                <TableRow>
                  <TableHead>Rep</TableHead>
                  <TableHead>Deal</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_APPROVALS.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.rep}</TableCell>
                    <TableCell>{app.deal}</TableCell>
                    <TableCell className="text-right">${app.gross}</TableCell>
                    <TableCell className="text-right font-bold text-success">${app.commission}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        <Button size="icon" variant="outline" className="h-8 w-8 text-success hover:text-success hover:bg-success/10"><Check className="h-4 w-4" /></Button>
                        <Button size="icon" variant="outline" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"><X className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User & Compensation</DialogTitle>
            <DialogDescription>Configure {editingUser?.name}'s profile and pay structure.</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <Tabs defaultValue="compensation" className="mt-4">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
                <TabsTrigger value="compensation">Compensation</TabsTrigger>
              </TabsList>
              <TabsContent value="profile" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input defaultValue={editingUser.name} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input defaultValue={editingUser.email} />
                  </div>
                  <div className="space-y-2">
                    <Label>System Role</Label>
                    <Select defaultValue={editingUser.role}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrator</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="f_and_i">F&I Manager</SelectItem>
                        <SelectItem value="sales">Sales Rep</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Account Status</Label>
                    <Select defaultValue={editingUser.status}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Suspended">Suspended</SelectItem>
                        <SelectItem value="Terminated">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="permissions" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
                    <div>
                      <Label className="text-sm font-semibold">View Vehicle Costs</Label>
                      <p className="text-xs text-slate-500">Allow seeing true ACV and pack</p>
                    </div>
                    <input type="checkbox" className="w-4 h-4" defaultChecked={editingUser.perms?.viewCosts} />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
                    <div>
                      <Label className="text-sm font-semibold">Approve Deals</Label>
                      <p className="text-xs text-slate-500">Allow manager override & approval</p>
                    </div>
                    <input type="checkbox" className="w-4 h-4" defaultChecked={editingUser.perms?.approveDeals} />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
                    <div>
                      <Label className="text-sm font-semibold">Export Data</Label>
                      <p className="text-xs text-slate-500">Allow exporting lists to CSV/PDF</p>
                    </div>
                    <input type="checkbox" className="w-4 h-4" defaultChecked={editingUser.perms?.exportData} />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="compensation" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Pay Type</Label>
                    <Select defaultValue={editingUser.payType} onValueChange={(v) => setEditingUser({...editingUser, payType: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="salary">Salary (Exempt)</SelectItem>
                        <SelectItem value="hourly">Hourly (Non-Exempt)</SelectItem>
                        <SelectItem value="commission">Commission Only</SelectItem>
                        <SelectItem value="base_commission">Base + Commission</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {['salary', 'hourly', 'base_commission'].includes(editingUser.payType) && (
                    <div className="space-y-2">
                      <Label>{editingUser.payType === 'hourly' ? 'Hourly Rate ($)' : 'Base Salary ($/yr)'}</Label>
                      <Input type="number" defaultValue={editingUser.baseRate} />
                    </div>
                  )}

                  {['commission', 'base_commission'].includes(editingUser.payType) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Front-End Commission (%)</Label>
                        <Input type="number" defaultValue={editingUser.frontEndComm} />
                      </div>
                      <div className="space-y-2">
                        <Label>Back-End Commission (%)</Label>
                        <Input type="number" defaultValue={editingUser.backEndComm} />
                      </div>
                    </div>
                  )}
                  
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label>Current Draw Balance ($)</Label>
                      <Input type="number" defaultValue={editingUser.drawBalance} />
                      <p className="text-xs text-slate-500">Advances to be deducted from next check</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Pending Spiffs/Bonuses ($)</Label>
                      <Input type="number" defaultValue={editingUser.spiffs} />
                      <p className="text-xs text-slate-500">One-off bonuses for next check</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button onClick={() => setEditingUser(null)}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
