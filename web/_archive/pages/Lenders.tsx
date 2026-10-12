import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Landmark, Star, ShieldCheck, DollarSign, Clock, CheckCircle2, AlertCircle, ExternalLink, Plus, Search, Filter, TrendingDown, Zap, RefreshCw, BrainCircuit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { hapticFeedback } from "@/lib/haptics";

const LENDERS = [
  { 
    id: 1, 
    name: "Chase Auto", 
    rating: 4.8, 
    status: "Preferred", 
    avgApr: "5.49%", 
    maxLtv: "125%", 
    fundingTime: "24h",
    activeDeals: 12,
    type: "Prime"
  },
  { 
    id: 2, 
    name: "Ally Financial", 
    rating: 4.5, 
    status: "Active", 
    avgApr: "6.25%", 
    maxLtv: "120%", 
    fundingTime: "48h",
    activeDeals: 8,
    type: "Prime/Near-Prime"
  },
  { 
    id: 3, 
    name: "Capital One", 
    rating: 4.2, 
    status: "Active", 
    avgApr: "7.10%", 
    maxLtv: "115%", 
    fundingTime: "24h",
    activeDeals: 15,
    type: "Full Spectrum"
  },
  { 
    id: 4, 
    name: "Santander Consumer", 
    rating: 3.9, 
    status: "Active", 
    avgApr: "14.5%", 
    maxLtv: "110%", 
    fundingTime: "72h",
    activeDeals: 5,
    type: "Sub-Prime"
  },
  { 
    id: 5, 
    name: "Local Credit Union", 
    rating: 4.9, 
    status: "Preferred", 
    avgApr: "4.99%", 
    maxLtv: "100%", 
    fundingTime: "5 Days",
    activeDeals: 3,
    type: "Prime"
  }
];

const RECENT_APPS = [
  { id: "APP-4920", customer: "Sarah Jenkins", vehicle: "2024 Luxury SUV", lender: "Chase Auto", status: "Approved", amount: "$42,500", submitted: "2h ago" },
  { id: "APP-4918", customer: "Mike Ross", vehicle: "2024 Family Sedan", lender: "Ally Financial", status: "Pending", amount: "$28,900", submitted: "4h ago" },
  { id: "APP-4915", customer: "David Chen", vehicle: "2021 Sport Compact", lender: "Capital One", status: "Conditioned", amount: "$31,500", submitted: "Yesterday" },
  { id: "APP-4912", customer: "Emily Blunt", vehicle: "2022 Electric Hatch", lender: "Chase Auto", status: "Funded", amount: "$35,200", submitted: "2 days ago" },
];

export default function Lenders() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [apps, setApps] = useState(RECENT_APPS);

  const handleLiveSync = () => {
    setIsSyncing(true);
    hapticFeedback();
    toast.info("Connecting to RouteOne / Dealertrack APIs...");
    
    setTimeout(() => {
      setIsSyncing(false);
      setApps(prev => {
        const newApps = [...prev];
        if (newApps[1].status === "Pending") {
          newApps[1] = { ...newApps[1], status: "Approved", lender: "Ally Financial (Auto-Approved)", amount: "$28,900" };
        }
        return newApps;
      });
      toast.success("Live Approvals synced! 1 new auto-approval.", {
        icon: <Zap className="h-4 w-4 text-emerald-500" />
      });
      hapticFeedback();
    }, 2000);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Landmark className="h-7 w-7 text-primary" />
            Lender Management
          </h1>
          <p className="text-slate-500">Manage bank relationships, track funding status, and review lender performance.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto flex-wrap">
          <Button 
            variant="outline" 
            className="flex-1 md:flex-none bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20"
            onClick={handleLiveSync}
            disabled={isSyncing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} /> 
            {isSyncing ? 'Syncing APIs...' : 'Live API Approvals'}
          </Button>
          <Button 
            className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20"
            onClick={() => {
              toast.success("AI Pre-Approval Match Complete", { description: "Scanned 14 lenders. Top match: Chase Auto (94% odds)." });
              hapticFeedback();
            }}
          >
            <Zap className="mr-2 h-4 w-4" /> AI Approval Match
          </Button>
          <Button 
            className="flex-1 md:flex-none bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
            onClick={() => {
              toast.success("Deal Blasted to Lenders!", { description: "Credit app submitted to 5 preferred lenders with AI-optimized structures." });
              hapticFeedback();
            }}
          >
            <Landmark className="mr-2 h-4 w-4" /> Blast to Lenders
          </Button>
          <Button variant="outline" className="flex-1 md:flex-none bg-white dark:bg-slate-950 border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => {
            toast.success("Lender Approval Tracker Opened", { description: "Kanban board for tracking bank approvals and funding statuses." });
            hapticFeedback();
          }}>
            <Landmark className="mr-2 h-4 w-4" /> Approval Kanban
          </Button>
          <Button variant="outline" className="flex-1 md:flex-none bg-white dark:bg-slate-950">
            <Filter className="mr-2 h-4 w-4" /> Filter
          </Button>
          <Button className="flex-1 md:flex-none">
            <Plus className="mr-2 h-4 w-4" /> Add Lender
          </Button>
        </div>
      </div>

      <Card className="bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/50 shadow-sm mb-6">
        <CardContent className="p-5 flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl shrink-0">
            <RefreshCw className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-emerald-900 dark:text-emerald-300 mb-1">Real-time Lender Portal Integration</h3>
            <p className="text-sm text-emerald-800/80 dark:text-emerald-200/70">
              Live API Approvals synced continuously with RouteOne and Dealertrack.
            </p>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0" onClick={() => toast.success("Sync Successful", { description: "Lender decisions are up to date." })}>
            Force Sync
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-indigo-50/50 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/50 shadow-sm mb-6">
        <CardContent className="p-5 flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl shrink-0">
            <BrainCircuit className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-indigo-900 dark:text-indigo-300 mb-1">AI Stipulation Scanner</h3>
            <p className="text-sm text-indigo-800/80 dark:text-indigo-200/70">
              Automatically scan uploaded documents (POI, POR) to verify they meet lender requirements before submission.
            </p>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0" onClick={() => toast.success("Stips Scanned", { description: "Verified Proof of Income for John Doe. Ready for Capital One." })}>
            Scan Pending Stips
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {LENDERS.slice(0, 3).map((lender) => (
          <Card key={lender.id} className="relative overflow-hidden border-slate-200 dark:border-slate-800">
            {lender.status === 'Preferred' && (
              <div className="absolute top-0 right-0">
                <div className="bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">Preferred</div>
              </div>
            )}
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{lender.name}</CardTitle>
                  <CardDescription>{lender.type}</CardDescription>
                </div>
                <Landmark className="h-5 w-5 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.floor(lender.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                ))}
                <span className="text-xs text-slate-500 ml-2">{lender.rating} Rating</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Avg. APR</p>
                  <p className="text-sm font-bold text-emerald-600">{lender.avgApr}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Max LTV</p>
                  <p className="text-sm font-bold">{lender.maxLtv}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Funding</p>
                  <p className="text-sm font-bold">{lender.fundingTime}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Active Deals</p>
                  <p className="text-sm font-bold">{lender.activeDeals}</p>
                </div>
              </div>

              <Button variant="ghost" size="sm" className="w-full mt-2 text-xs text-primary hover:text-primary hover:bg-primary/5">
                View Lender Guidelines <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Credit Applications</CardTitle>
              <CardDescription>Real-time status of submitted deals.</CardDescription>
            </div>
            <div className="relative w-48 hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input placeholder="Search apps..." className="pl-9 h-9 text-xs bg-slate-50 dark:bg-slate-900 border-none" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Customer</TableHead>
                  <TableHead>Lender</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apps.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="pl-6">
                      <p className="font-bold text-sm">{app.customer}</p>
                      <p className="text-[10px] text-slate-500">{app.vehicle} • {app.submitted}</p>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{app.lender}</TableCell>
                    <TableCell className="text-sm">{app.amount}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] font-bold ${
                        app.status === 'Approved' ? 'border-emerald-500 text-emerald-700 bg-emerald-50' :
                        app.status === 'Funded' ? 'border-blue-500 text-blue-700 bg-blue-50' :
                        app.status === 'Conditioned' ? 'border-amber-500 text-amber-700 bg-amber-50' :
                        'border-slate-300 text-slate-600 bg-slate-50'
                      }`}>
                        {app.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="sm" className="h-8 text-xs">View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg">Lender Performance</CardTitle>
            <CardDescription>Funding volume by lender (MTD).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {[
                { name: "Chase Auto", amount: 245000, color: "bg-primary" },
                { name: "Capital One", amount: 182000, color: "bg-blue-500" },
                { name: "Ally Financial", amount: 125000, color: "bg-indigo-500" },
                { name: "Others", amount: 68000, color: "bg-slate-400" },
              ].map((lender, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{lender.name}</span>
                    <span className="font-bold">${(lender.amount/1000).toFixed(0)}k</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${lender.color}`} 
                      style={{ width: `${(lender.amount / 245000) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-3">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-primary" />
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Avg. Time to Fund</p>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">32.4 Hours</p>
              <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <TrendingDown className="h-3 w-3" /> 4.2h faster than last month
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


