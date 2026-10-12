import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wrench, Clock, Calendar, CheckCircle2, AlertTriangle, Search, Plus, Car, BrainCircuit, RefreshCw } from "lucide-react";
import { hapticFeedback } from "@/lib/haptics";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const SCHEDULED_SERVICES = [
  { id: 1, customer: "John Doe", vehicle: "2020 Ford F-150", service: "10k Mile Maintenance", time: "08:00 AM", status: "arrived", advisor: "Tom B.", sentiment: "happy" },
  { id: 2, customer: "Amanda Waller", vehicle: "2023 Premium EV", service: "Tire Rotation & Balance", time: "09:30 AM", status: "scheduled", advisor: "Sarah M.", sentiment: "frustrated" },
  { id: 3, customer: "Robert California", vehicle: "2024 Luxury SUV", service: "Brake Pad Replacement", time: "11:00 AM", status: "in-progress", advisor: "Tom B.", sentiment: "neutral" },
];

export default function ServiceScheduler() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Wrench className="h-7 w-7 text-primary" />
            Service Scheduler
          </h1>
          <p className="text-slate-500 mt-1">Manage service appointments, walk-ins, and advisor assignments.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto flex-wrap justify-end">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search appointments..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="shrink-0 border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-900/30" onClick={() => {
            toast.success("NHTSA Database Scanned: 2 Open Recalls Found for today's appointments.");
          }}>
            <AlertTriangle className="mr-2 h-4 w-4" /> Recall Scan
          </Button>
          <Button variant="outline" className="shrink-0" onClick={() => {
            toast.success("Express Drop-Off QR codes sent via SMS to all scheduled customers today.");
          }}>
            <Car className="mr-2 h-4 w-4" /> Send Drop-Off QRs
          </Button>
          <Button className="shrink-0">
            <Plus className="mr-2 h-4 w-4" /> New Appointment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-primary/20 shadow-sm">
          <CardHeader className="bg-primary/5 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {SCHEDULED_SERVICES.map((apt) => (
                <div key={apt.id} className="p-4 hover:bg-muted/50 transition-colors flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-3 rounded-xl ${apt.status === 'arrived' ? 'bg-emerald-500/20 text-emerald-600' : apt.status === 'in-progress' ? 'bg-amber-500/20 text-amber-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      <Wrench className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground flex items-center gap-2">
                        {apt.customer}
                        {apt.id === 1 && (
                          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 cursor-pointer hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800" onClick={() => toast.info("Service-to-Sales Opportunity: Vehicle has $4,200 positive equity.")}>
                            <BrainCircuit className="w-3 h-3 mr-1" /> Equity Alert
                          </Badge>
                        )}
                      </h4>
                      <p className="text-sm text-muted-foreground font-medium">{apt.vehicle}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-semibold text-primary">{apt.service}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                      {apt.sentiment === 'frustrated' && (
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800" title="Customer expressed frustration in recent communications">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Frustrated
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-slate-600 bg-slate-50 dark:bg-slate-900">Adv: {apt.advisor}</Badge>
                      <Badge variant={apt.status === 'arrived' ? 'default' : apt.status === 'in-progress' ? 'destructive' : 'secondary'} className={apt.status === 'in-progress' ? 'bg-amber-500 hover:bg-amber-600' : ''}>
                        {apt.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => toast.success("Uber requested for " + apt.customer)}>
                        <Car className="h-3 w-3 mr-1" /> Uber
                      </Button>
                      <div className="text-sm font-bold flex items-center gap-1 h-7">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {apt.time}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-sm border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center justify-between">
                Live ALPR Feed
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 animate-pulse">Scanning</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-24 bg-slate-900 rounded-lg relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-12 border-2 border-dashed border-blue-500/50 rounded-lg animate-pulse flex items-center justify-center">
                    <span className="text-blue-500/50 text-xs font-mono uppercase tracking-widest">Awaiting Plate...</span>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="relative z-10 bg-white/10 text-white border-white/20 hover:bg-white/20" onClick={() => {
                  toast.success("ALPR Match: John Doe (2020 F-150)", { description: "Customer pulled into service drive. Service profile opened." });
                  hapticFeedback();
                }}>
                  Simulate Vehicle Arrival
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Shop Capacity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-foreground">82%</div>
              <p className="text-sm text-amber-600 font-bold mt-1">High Volume Today</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-900/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                <Car className="w-4 h-4" /> Mobile Service
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">Van #1 (Mike)</span>
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">En Route</Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">Van #2 (Sarah)</span>
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">On Site</Badge>
                </div>
                <Button className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white" size="sm" onClick={() => toast.success("Dispatching new mobile service request...")}>
                  Dispatch Mobile Tech
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-900/10 relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <BrainCircuit className="w-4 h-4" /> Predictive Scheduling
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium">Mike Johnson (2021 Tundra)</span>
                    <span className="text-[10px] text-slate-500">Predicted: 30k Mile Service Due</span>
                  </div>
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">High Prob</Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium">Lisa Ray (2022 CR-V)</span>
                    <span className="text-[10px] text-slate-500">Predicted: Brakes (Telematics)</span>
                  </div>
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">Med Prob</Badge>
                </div>
                <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-2 leading-tight">AI analyzes connected car telematics and past service intervals to predict upcoming needs.</p>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" size="sm" onClick={() => {
                  toast.success("Automated service reminders sent with 1-click booking links!", {
                    icon: <BrainCircuit className="w-4 h-4 text-emerald-100" />
                  });
                }}>
                  Auto-Schedule & Notify
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-900/10 relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4" /> Predictive Parts Order
                </div>
                <div className="flex items-center gap-1.5 text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                  </span>
                  Live Sync
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium">Brake Pads (Front)</span>
                    <span className="text-[10px] text-slate-500">In Stock: 2 | Required: 5</span>
                  </div>
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} /> 3 Needed
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium">Cabin Air Filters</span>
                    <span className="text-[10px] text-slate-500">In Stock: 1 | Required: 6</span>
                  </div>
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} /> 5 Needed
                  </Badge>
                </div>
                <p className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 mt-2 leading-tight">AI identified these parts are needed for tomorrow's scheduled appointments but are low in stock. Syncing live with Parts Dept.</p>
                <div className="flex gap-2 mt-2">
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" size="sm" onClick={() => {
                    toast.success("Parts auto-ordered from the Parts Department!", {
                      icon: <BrainCircuit className="w-4 h-4 text-primary" />
                    });
                  }}>
                    Auto-Order Parts
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}