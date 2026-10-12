import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Activity, AlertTriangle, Calendar, Users, TrendingUp, Search, Filter, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

const PORTFOLIO_STATS = [
  { label: "Active Contracts", val: "142", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10", delta: "+4 this month" },
  { label: "Total Receivables", val: "$1,842,500", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-500/10", delta: "$284k current" },
  { label: "Delinquency Rate", val: "4.2%", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-500/10", delta: "-0.5% from last mo" },
  { label: "Avg. Yield", val: "18.5%", icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-500/10", delta: "Target: 19%" },
];

const RECENT_PAYMENTS = [
  { id: 1, customer: "Robert Jenkins", vehicle: "2018 Toyota Camry", amount: "$450.00", method: "Auto-Pay", status: "Processed", date: "Today, 9:45 AM" },
  { id: 2, customer: "Maria Rodriguez", vehicle: "2017 Honda Civic", amount: "$380.00", method: "Debit Card", status: "Processed", date: "Today, 8:30 AM" },
  { id: 3, customer: "Kevin Smith", vehicle: "2019 Ford Fusion", amount: "$425.00", method: "Cash (In-Store)", status: "Pending", date: "Today, 10:15 AM" },
  { id: 4, customer: "Ashley Thompson", vehicle: "2016 Nissan Altima", amount: "$350.00", method: "ACH", status: "Failed", date: "Yesterday" },
];

const DELINQUENT_ACCOUNTS = [
  { customer: "John Doe", days: 12, amount: "$4,200", lastContact: "2 days ago", action: "Call" },
  { customer: "Sarah Miller", days: 34, amount: "$8,500", lastContact: "Yesterday", action: "Repo Warning" },
  { customer: "Mike Wilson", days: 8, amount: "$3,100", lastContact: "5 days ago", action: "SMS" },
];

export default function BHPH() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-7 w-7 text-primary" />
            BHPH Portfolio
          </h1>
          <p className="text-slate-500">Monitor in-house financing performance, collections, and delinquencies.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none bg-white dark:bg-slate-950">
            <Calendar className="mr-2 h-4 w-4" /> Payment Calendar
          </Button>
          <Button className="flex-1 md:flex-none">
            <Activity className="mr-2 h-4 w-4" /> Collections Queue
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PORTFOLIO_STATS.map((stat, i) => (
          <Card key={i} className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className={`p-2 ${stat.bg} rounded-lg ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <Badge variant="secondary" className="bg-slate-50 text-slate-600 text-[10px]">{stat.delta}</Badge>
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-2xl font-bold mt-1">{stat.val}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Collection Activity</CardTitle>
              <CardDescription>Live payment processing and account updates.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-primary">View All</Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RECENT_PAYMENTS.map((payment) => (
                  <TableRow key={payment.id} className="group">
                    <TableCell className="pl-6">
                      <p className="font-bold text-sm">{payment.customer}</p>
                      <p className="text-[10px] text-slate-500">{payment.vehicle}</p>
                    </TableCell>
                    <TableCell className="text-sm font-bold text-emerald-600">{payment.amount}</TableCell>
                    <TableCell className="text-xs text-slate-600">{payment.method}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] font-bold ${
                        payment.status === 'Processed' ? 'border-emerald-500 text-emerald-700 bg-emerald-50' :
                        payment.status === 'Pending' ? 'border-amber-500 text-amber-700 bg-amber-50' :
                        'border-red-500 text-red-700 bg-red-50'
                      }`}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6 text-xs text-slate-500">{payment.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg">High-Risk Accounts</CardTitle>
            <CardDescription>Accounts 30+ days past due.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {DELINQUENT_ACCOUNTS.map((account, i) => (
              <div key={i} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-sm">{account.customer}</p>
                    <p className="text-xs text-red-600 font-bold">{account.days} Days Past Due</p>
                  </div>
                  <p className="font-black text-slate-900 dark:text-white">{account.amount}</p>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <Clock className="h-3 w-3" />
                    Last Contact: {account.lastContact}
                  </div>
                  <Button size="sm" variant={account.action === 'Repo Warning' ? 'destructive' : 'outline'} className="h-7 text-[10px] px-3">
                    {account.action}
                  </Button>
                </div>
              </div>
            ))}
            
            <div className="pt-4 border-t space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-500">Current Collection Goal</span>
                  <span className="font-bold">$284.5k / $350k</span>
                </div>
                <Progress value={81} className="h-2" />
              </div>
              <Button className="w-full bg-primary/10 text-primary hover:bg-primary/20 border-none h-10">
                Generate Delinquency Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
