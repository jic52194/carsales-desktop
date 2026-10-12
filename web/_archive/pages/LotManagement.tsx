import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Droplets, Fuel, QrCode, Car, CheckCircle2, Navigation, Search, BrainCircuit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MOCK_TASKS = [
  { id: "T-1", vin: "1FTEW1E55", vehicle: "2023 Ford F-150", location: "Service Lot A", type: "Wash", priority: "High", status: "Pending" },
  { id: "T-2", vin: "JTDKN3DP5", vehicle: "2024 Toyota Camry", location: "Showroom Pad", type: "Move", destination: "Delivery Bay", priority: "High", status: "Pending" },
  { id: "T-3", vin: "3VW5K7AJ3", vehicle: "2022 VW Jetta", location: "Back Lot C", type: "Fuel", priority: "Medium", status: "Pending" },
  { id: "T-4", vin: "5YJ3E1EA5", vehicle: "2023 Tesla Model 3", location: "Detailing", type: "Charge", priority: "Medium", status: "In Progress" },
];

export default function LotManagement() {
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [searchQuery, setSearchQuery] = useState("");

  const handleCompleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    toast.success("Task completed!", {
      icon: <CheckCircle2 className="h-4 w-4 text-success" />
    });
  };

  const filteredTasks = tasks.filter(t => 
    t.vehicle.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto pb-mobile-nav">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lot Management</h1>
          <p className="text-muted-foreground">Mobile-first view for lot attendants and porters.</p>
        </div>
        <Button size="lg" className="w-full sm:w-auto rounded-full shadow-lg shadow-primary/20">
          <QrCode className="mr-2 h-5 w-5" />
          Scan VIN / QR
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Car className="h-6 w-6 text-primary mb-2" />
            <p className="text-2xl font-bold">{tasks.filter(t => t.type === "Move").length}</p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">To Move</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/10">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Droplets className="h-6 w-6 text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{tasks.filter(t => t.type === "Wash").length}</p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">To Wash</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/10">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Fuel className="h-6 w-6 text-amber-500 mb-2" />
            <p className="text-2xl font-bold">{tasks.filter(t => t.type === "Fuel" || t.type === "Charge").length}</p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">To Fuel</p>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/10">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="h-6 w-6 text-success mb-2" />
            <p className="text-2xl font-bold">12</p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Done Today</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search by vehicle, task type..." 
          className="pl-9 h-12 rounded-xl bg-card border-border shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Tabs defaultValue="all" className="w-full">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <TabsList className="w-full sm:w-auto grid grid-cols-4 h-12 p-1 bg-muted/50 rounded-xl flex-1">
            <TabsTrigger value="all" className="rounded-lg">All</TabsTrigger>
            <TabsTrigger value="move" className="rounded-lg">Move</TabsTrigger>
            <TabsTrigger value="wash" className="rounded-lg">Wash</TabsTrigger>
            <TabsTrigger value="fuel" className="rounded-lg">Fuel</TabsTrigger>
          </TabsList>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto scrollbar-hide">
            <Button variant="outline" className="h-12 border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-900 dark:text-indigo-400 dark:bg-indigo-900/30 whitespace-nowrap" onClick={() => {
              toast.success("AI Wash Queue Generated", { description: "Added 4 vehicles scheduled for delivery today to the priority wash queue." });
            }}>
              <BrainCircuit className="mr-2 h-4 w-4" /> Predictive Wash Queue
            </Button>
            <Button variant="outline" className="h-12 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:bg-slate-900 whitespace-nowrap" onClick={() => {
              toast.success("Digital Lot Map Opened", { description: "Showing real-time exact parking spots for all 420 vehicles." });
            }}>
              <MapPin className="mr-2 h-4 w-4 text-rose-500" /> Digital Lot Map
            </Button>
          </div>
        </div>

        <TabsContent value="all" className="space-y-4">
          {filteredTasks.map(task => (
            <TaskCard key={task.id} task={task} onComplete={handleCompleteTask} />
          ))}
          {filteredTasks.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">All caught up!</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="move" className="space-y-4">
          {filteredTasks.filter(t => t.type === "Move").map(task => (
            <TaskCard key={task.id} task={task} onComplete={handleCompleteTask} />
          ))}
        </TabsContent>

        <TabsContent value="wash" className="space-y-4">
          {filteredTasks.filter(t => t.type === "Wash").map(task => (
            <TaskCard key={task.id} task={task} onComplete={handleCompleteTask} />
          ))}
        </TabsContent>

        <TabsContent value="fuel" className="space-y-4">
          {filteredTasks.filter(t => t.type === "Fuel" || t.type === "Charge").map(task => (
            <TaskCard key={task.id} task={task} onComplete={handleCompleteTask} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TaskCard({ task, onComplete }: { task: any, onComplete: (id: string) => void }) {
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [newLocation, setNewLocation] = useState("");

  const getTaskIcon = () => {
    switch (task.type) {
      case "Move": return <Navigation className="h-5 w-5 text-primary" />;
      case "Wash": return <Droplets className="h-5 w-5 text-blue-500" />;
      case "Fuel": return <Fuel className="h-5 w-5 text-amber-500" />;
      case "Charge": return <Fuel className="h-5 w-5 text-emerald-500" />;
      default: return <Car className="h-5 w-5 text-primary" />;
    }
  };

  const getTaskColor = () => {
    switch (task.type) {
      case "Move": return "bg-primary/10 text-primary border-primary/20";
      case "Wash": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "Fuel": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "Charge": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      default: return "bg-primary/10 text-primary border-primary/20";
    }
  };

  const handleUpdateLocation = () => {
    if (!newLocation) return;
    toast.success(`Location updated to ${newLocation}`);
    setIsUpdatingLocation(false);
  };

  return (
    <Card className="overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col">
        <div className="p-4 flex gap-4">
          <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${getTaskColor()}`}>
            {getTaskIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">{task.vehicle}</h3>
              {task.priority === "High" && (
                <Badge variant="destructive" className="shrink-0 text-[10px] px-1.5 py-0 h-4">URGENT</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate mb-2">VIN: {task.vin.slice(-6)}</p>
            
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <MapPin className="h-3.5 w-3.5" />
                <span>From: <span className="font-medium text-foreground">{task.location}</span></span>
              </div>
              {task.destination && (
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <Navigation className="h-3.5 w-3.5" />
                  <span>To: <span className="font-medium text-foreground">{task.destination}</span></span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-muted/30 p-3 flex items-center justify-between border-t border-border/50 flex-wrap gap-2">
          <Badge variant="outline" className={getTaskColor()}>{task.type}</Badge>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Sheet open={isUpdatingLocation} onOpenChange={setIsUpdatingLocation}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 flex-1 sm:flex-none">Update Loc</Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl h-[50vh]">
                <SheetHeader className="mb-4">
                  <SheetTitle>Update Vehicle Location</SheetTitle>
                  <SheetDescription>Set the new physical location for {task.vehicle}</SheetDescription>
                </SheetHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">New Location</label>
                    <Select value={newLocation} onValueChange={setNewLocation}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Showroom Pad">Showroom Pad</SelectItem>
                        <SelectItem value="Service Lot A">Service Lot A</SelectItem>
                        <SelectItem value="Service Lot B">Service Lot B</SelectItem>
                        <SelectItem value="Back Lot C">Back Lot C</SelectItem>
                        <SelectItem value="Delivery Bay">Delivery Bay</SelectItem>
                        <SelectItem value="Detailing">Detailing</SelectItem>
                        <SelectItem value="Wash Bay">Wash Bay</SelectItem>
                        <SelectItem value="Customer Parking">Customer Parking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={handleUpdateLocation} disabled={!newLocation}>
                    Save Location
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <Button size="sm" className="h-8 flex-1 sm:flex-none" onClick={() => onComplete(task.id)}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Complete
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
