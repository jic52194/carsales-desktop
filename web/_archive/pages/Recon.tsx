import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { 
  Wrench, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ClipboardList, 
  Plus, 
  Truck, 
  Camera, 
  MoreVertical,
  History,
  TrendingUp,
  ShieldCheck,
  User,
  ExternalLink,
  ChevronRight,
  Pencil,
  Car
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";
import { hapticFeedback } from "@/lib/haptics";

const MOCK_RECON_UNITS = [
  {
    id: "1",
    vehicle: "2021 Honda Civic Sport",
    vin: "1HGCP2F85MAXXXXXX",
    stock: "2405A",
    status: "In Progress",
    progress: 50,
    daysInRecon: 3,
    estimatedCompletion: "2024-05-15",
    currentStep: "Body & Paint",
    technician: "Mike Wilson",
    steps: [
      { name: "Mechanical Inspection", status: "Completed", date: "2024-05-10" },
      { name: "Body & Paint", status: "In Progress", date: "2024-05-12" },
      { name: "Detailing", status: "Pending", date: null },
      { name: "Photography", status: "Pending", date: null }
    ]
  },
  {
    id: "2",
    vehicle: "2024 Toyota Camry SE",
    vin: "4T1B11HK5RUXXXXXX",
    stock: "2408B",
    status: "Priority",
    progress: 25,
    daysInRecon: 1,
    estimatedCompletion: "2024-05-18",
    currentStep: "Mechanical Inspection",
    technician: "Sarah Chen",
    steps: [
      { name: "Mechanical Inspection", status: "In Progress", date: "2024-05-13" },
      { name: "Body & Paint", status: "Pending", date: null },
      { name: "Detailing", status: "Pending", date: null },
      { name: "Photography", status: "Pending", date: null }
    ]
  },
  {
    id: "3",
    vehicle: "2023 Ford F-150 Lariat",
    vin: "1FTFW1E51PFXXXXXX",
    stock: "2412C",
    status: "In Progress",
    progress: 75,
    daysInRecon: 5,
    estimatedCompletion: "2024-05-14",
    currentStep: "Detailing",
    technician: "John Miller",
    steps: [
      { name: "Mechanical Inspection", status: "Completed", date: "2024-05-08" },
      { name: "Body & Paint", status: "Completed", date: "2024-05-11" },
      { name: "Detailing", status: "In Progress", date: "2024-05-13" },
      { name: "Photography", status: "Pending", date: null }
    ]
  },
  {
    id: "4",
    vehicle: "2022 Tesla Model 3",
    vin: "5YJ3E1EB8NFXXXXXX",
    stock: "2415D",
    status: "Ready",
    progress: 100,
    daysInRecon: 2,
    estimatedCompletion: "2024-05-12",
    currentStep: "Photography",
    technician: "Alex Smith",
    steps: [
      { name: "Mechanical Inspection", status: "Completed", date: "2024-05-09" },
      { name: "Body & Paint", status: "Completed", date: "2024-05-10" },
      { name: "Detailing", status: "Completed", date: "2024-05-11" },
      { name: "Photography", status: "Completed", date: "2024-05-12" }
    ]
  }
];

const MOCK_VENDORS = [
  { id: "v1", name: "Elite Paint & Body", contact: "Joe Smith", status: "Active", activeJobs: 3, rating: 4.8 },
  { id: "v2", name: "Precision Dent Repair", contact: "Dave Miller", status: "Active", activeJobs: 1, rating: 4.9 },
  { id: "v3", name: "Quick Shine Detailing", contact: "Elena Rodriguez", status: "Busy", activeJobs: 5, rating: 4.5 }
];

export default function Recon() {
  const [units, setUnits] = useState(MOCK_RECON_UNITS);

  const handleStartTask = (unitId: string) => {
    hapticFeedback();
    toast.success("Task started! Technician has been notified.");
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Reconditioning Tracker</h1>
          <p className="text-slate-500 mt-1">Monitor vehicle preparation from acquisition to frontline ready.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto scrollbar-hide pb-2 md:pb-0">
          <Button variant="outline" className="flex-1 md:flex-none gap-2 bg-white dark:bg-slate-950 border-indigo-200 text-indigo-700 hover:bg-indigo-50" onClick={() => {
            toast.success("Recon Kanban Board Opened", { description: "Track cars through Detail, Paint, Mechanical, and Photos." });
            hapticFeedback();
          }}>
            <ClipboardList className="h-4 w-4" /> Kanban Board
          </Button>
          <Button variant="outline" className="flex-1 md:flex-none gap-2 bg-white dark:bg-slate-950">
            <ClipboardList className="h-4 w-4" /> Reports
          </Button>
          <Button className="flex-1 md:flex-none gap-2">
            <Plus className="h-4 w-4" /> Add Unit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Active Units</p>
              <p className="text-2xl font-bold">12</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Avg. Recon Time</p>
              <p className="text-2xl font-bold">4.2 Days</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Frontline Ready</p>
              <p className="text-2xl font-bold">8</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Pending Intake</p>
              <p className="text-2xl font-bold">5</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-800/50 p-1">
          <TabsTrigger value="active" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950">Active Pipeline</TabsTrigger>
          <TabsTrigger value="vendors" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950">Vendors</TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950">History</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {units.map((unit) => (
              <Card key={unit.id} className="overflow-hidden border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className="h-12 w-12 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                        <Car className="h-6 w-6 text-slate-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{unit.vehicle}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span className="font-mono">{unit.stock}</span>
                          <span>•</span>
                          <span>VIN: {unit.vin.substring(0, 10)}...</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={unit.status === 'Priority' ? 'destructive' : 'secondary'}>
                      {unit.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Overall Progress</span>
                      <span className="font-bold text-primary">{unit.progress}%</span>
                    </div>
                    <Progress value={unit.progress} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Current Stage</p>
                      <p className="font-semibold text-sm flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-amber-500" /> {unit.currentStep}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Assigned Tech</p>
                      <p className="font-semibold text-sm flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-blue-500" /> {unit.technician}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Recon Steps</p>
                    <div className="space-y-2">
                      {unit.steps.map((step, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                          <div className="flex items-center gap-3">
                            {step.status === 'Completed' ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : step.status === 'In Progress' ? (
                              <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border-2 border-slate-200 dark:border-slate-700" />
                            )}
                            <span className={`text-sm ${step.status === 'Completed' ? 'text-slate-500 line-through' : 'font-medium text-slate-700 dark:text-slate-200'}`}>
                              {step.name}
                            </span>
                          </div>
                          {step.date && <span className="text-[10px] text-slate-400">{step.date}</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex gap-2">
                    <Button className="flex-1 gap-2" onClick={() => handleStartTask(unit.id)}>
                      <CheckCircle2 className="h-4 w-4" /> Approve Next Step
                    </Button>
                    <Button variant="outline" size="icon" className="bg-white dark:bg-slate-950">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="vendors" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MOCK_VENDORS.map((vendor) => (
              <Card key={vendor.id} className="border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <User className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <Badge className={vendor.status === 'Active' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''} variant={vendor.status === 'Active' ? 'default' : 'secondary'}>
                      {vendor.status}
                    </Badge>
                  </div>
                  <CardTitle className="mt-4 text-lg">{vendor.name}</CardTitle>
                  <CardDescription>Contact: {vendor.contact}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Active Jobs</span>
                    <span className="font-bold">{vendor.activeJobs}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Service Rating</span>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                      <span className="font-bold">{vendor.rating}</span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button variant="outline" className="w-full gap-2 bg-white dark:bg-slate-950">
                      <ExternalLink className="h-4 w-4" /> View Work Orders
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card className="border-2 border-dashed border-slate-200 dark:border-slate-800 bg-transparent flex items-center justify-center p-8">
              <Button variant="ghost" className="h-full w-full flex flex-col gap-2 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Plus className="h-5 w-5 text-slate-500" />
                </div>
                <span className="font-medium text-slate-500">Add New Vendor</span>
              </Button>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
