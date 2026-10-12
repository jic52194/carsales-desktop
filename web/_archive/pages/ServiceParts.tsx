import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Wrench, Package, Clock, User, Plus, Search, Filter, CheckCircle2, AlertCircle, Timer, MoreVertical, ShieldCheck, Activity, Sparkles, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface RepairOrder {
  id: string;
  roNumber: string;
  customer: string;
  vehicle: string;
  advisor: string;
  tech: string;
  status: 'Intake' | 'Inspection' | 'Waiting on Parts' | 'Repairing' | 'Ready';
  estimate: number;
  progress: number;
  promisedTime: string;
  avatar: string;
}

const MOCK_ROS: RepairOrder[] = [
  { id: "1", roNumber: "RO-8842", customer: "Sarah Jenkins", vehicle: "2024 Luxury SUV", advisor: "Jim Advisor", tech: "Mike Tech", status: "Repairing", estimate: 450, progress: 65, promisedTime: "2:00 PM", avatar: "https://vibe.filesafe.space/1778548756560730619/assets/f142b3ca-7909-4c19-970a-c590cabb6515.png" },
  { id: "2", roNumber: "RO-8843", customer: "Mike Ross", vehicle: "2024 Family Sedan", advisor: "Jim Advisor", tech: "Steve Tech", status: "Waiting on Parts", estimate: 1200, progress: 20, promisedTime: "Tomorrow", avatar: "https://vibe.filesafe.space/1778548756560730619/assets/8ba4b31f-8962-4fb4-b004-c6b9cf77c133.png" },
  { id: "3", roNumber: "RO-8844", customer: "David Chen", vehicle: "2021 Sport Compact", advisor: "Sarah Advisor", tech: "Mike Tech", status: "Ready", estimate: 120, progress: 100, promisedTime: "Ready Now", avatar: "https://i.pravatar.cc/150?u=david" },
  { id: "4", roNumber: "RO-8845", customer: "Emily Blunt", vehicle: "2022 Electric Hatch", advisor: "Sarah Advisor", tech: "Steve Tech", status: "Inspection", estimate: 280, progress: 45, promisedTime: "4:30 PM", avatar: "https://i.pravatar.cc/150?u=emily" },
  { id: "5", roNumber: "RO-8846", customer: "John Doe", vehicle: "2020 Rugged Truck", advisor: "Jim Advisor", tech: "Mike Tech", status: "Ready", estimate: 850, progress: 100, promisedTime: "Delivered", avatar: "https://vibe.filesafe.space/1778548756560730619/assets/fea6a1a1-c1ca-4e7c-bcb6-ced02786663f.png" },
  { id: "6", roNumber: "RO-8847", customer: "Amanda Waller", vehicle: "2023 Premium EV", advisor: "Sarah Advisor", tech: "Steve Tech", status: "Intake", estimate: 2100, progress: 10, promisedTime: "Friday", avatar: "https://i.pravatar.cc/150?u=amanda" },
];

const COLUMNS: { id: RepairOrder['status'], title: string }[] = [
  { id: 'Intake', title: 'Intake' },
  { id: 'Inspection', title: 'Inspection' },
  { id: 'Waiting on Parts', title: 'Waiting on Parts' },
  { id: 'Repairing', title: 'Repairing' },
  { id: 'Ready', title: 'Ready' }
];

const SortableROCard = ({ ro }: { ro: RepairOrder }) => {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: ro.id,
    data: { type: "Task", task: ro },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-primary/10 border-2 border-primary border-dashed rounded-xl h-[120px] mb-3 opacity-50"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm cursor-grab active:cursor-grabbing mb-3 hover:border-primary/50 transition-colors group"
    >
      <div className="flex justify-between items-start mb-3">
        <Badge variant="outline" className="font-mono text-[10px] bg-slate-50 dark:bg-slate-900">{ro.roNumber}</Badge>
        <div className="flex items-center gap-1 text-slate-500">
          <Clock className="w-3 h-3" />
          <span className="text-[10px] font-bold">{ro.promisedTime}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="h-8 w-8 border border-slate-200 dark:border-slate-800">
          <AvatarImage src={ro.avatar} />
          <AvatarFallback>{ro.customer.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-bold text-sm leading-none truncate text-slate-900 dark:text-white">{ro.customer}</p>
          <p className="text-[10px] text-slate-500 mt-1 truncate">{ro.vehicle}</p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <Wrench className="w-3 h-3 text-slate-400" />
          <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">{ro.tech}</span>
        </div>
        <span className="text-[10px] font-bold text-slate-900 dark:text-slate-100">${ro.estimate}</span>
      </div>
    </div>
  );
};

const BoardColumn = ({ column, ros }: { column: { id: string, title: string }, ros: RepairOrder[] }) => {
  const { setNodeRef } = useSortable({
    id: column.id,
    data: { type: "Column", column },
  });

  return (
    <div className="flex flex-col bg-slate-100/50 dark:bg-slate-800/30 rounded-2xl p-3 min-w-[320px] max-w-[320px] border border-slate-200/50 dark:border-slate-700/50 shrink-0">
      <div className="flex items-center justify-between mb-4 px-2 pt-1">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">{column.title}</h3>
          <Badge variant="secondary" className="bg-white dark:bg-slate-900 text-xs font-bold">{ros.length}</Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-600">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>
      <div ref={setNodeRef} className="flex-1 overflow-y-auto min-h-[200px] scrollbar-hide">
        <SortableContext items={ros.map(r => r.id)} strategy={verticalListSortingStrategy}>
          {ros.map(ro => (
             <SortableROCard key={ro.id} ro={ro} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};

export default function ServiceParts() {
  const [ros, setRos] = useState<RepairOrder[]>(MOCK_ROS);
  const [activeId, setActiveId] = useState<string | null>(null);

  const columnsId = useMemo(() => COLUMNS.map((col) => col.id), []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveTask) return;

    if (isActiveTask && isOverTask) {
      setRos((prev) => {
        const activeIndex = prev.findIndex((t) => t.id === activeId);
        const overIndex = prev.findIndex((t) => t.id === overId);

        if (prev[activeIndex].status !== prev[overIndex].status) {
          const updated = [...prev];
          updated[activeIndex].status = prev[overIndex].status;
          return arrayMove(updated, activeIndex, overIndex);
        }

        return arrayMove(prev, activeIndex, overIndex);
      });
    }

    if (isActiveTask && isOverColumn) {
      setRos((prev) => {
        const activeIndex = prev.findIndex((t) => t.id === activeId);
        const updated = [...prev];
        updated[activeIndex].status = overId as RepairOrder['status'];
        return arrayMove(updated, activeIndex, activeIndex);
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { over } = event;
    if (!over) return;
    toast.success("Repair Order updated");
  };

  const getStatusBadge = (status: RepairOrder['status']) => {
    switch (status) {
      case 'Intake': return <Badge variant="outline" className="text-slate-600 border-slate-300 bg-slate-50 font-black text-[10px]">{status}</Badge>;
      case 'Inspection': return <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50 font-black text-[10px]"><Search className="w-3 h-3 mr-1" /> {status}</Badge>;
      case 'Waiting on Parts': return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 font-black text-[10px]"><Package className="w-3 h-3 mr-1" /> {status}</Badge>;
      case 'Repairing': return <Badge className="bg-indigo-500 hover:bg-indigo-600 font-black text-[10px]"><Wrench className="w-3 h-3 mr-1" /> {status}</Badge>;
      case 'Ready': return <Badge className="bg-success hover:bg-success/90 font-black text-[10px]"><CheckCircle2 className="w-3 h-3 mr-1" /> {status}</Badge>;
      default: return <Badge className="font-black text-[10px]">{status}</Badge>;
    }
  };

  const activeRO = useMemo(() => ros.find(r => r.id === activeId), [activeId, ros]);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto" data-tour-id="tour-complete">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            Service & Parts <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><ShieldCheck className="h-3 w-3 mr-1" /> AI Certified</Badge>
          </h1>
          <p className="text-slate-500">Manage shop load, parts inventory, and customer repairs.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-white dark:bg-slate-900">
            <Package className="mr-2 h-4 w-4" /> Parts Inventory
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button className="bg-primary text-white">
                <Plus className="mr-2 h-4 w-4" /> Create RO
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
              <div className="flex-1 overflow-y-auto pt-6">
                <h3 className="text-xl font-bold mb-4">Create Repair Order</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Customer Name</label>
                    <Input placeholder="e.g. John Smith" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Vehicle (VIN or Year/Make/Model)</label>
                    <Input placeholder="e.g. 2024 Toyota Camry" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Assigned Advisor</label>
                    <Input placeholder="e.g. Jim Advisor" defaultValue="Jim Advisor" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Customer Complaint / Service Request</label>
                    <textarea 
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                      placeholder="e.g. Oil change and tire rotation, customer states brakes are squeaking"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Promised Time</label>
                    <Input type="datetime-local" />
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t mt-auto">
                <Button className="w-full" onClick={() => toast.success("Repair Order Created!")}>
                  Save & Print RO
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Open ROs", val: ros.length.toString(), icon: Wrench, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Parts Pending", val: "8", icon: Package, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "AI Efficiency", val: "98.2%", icon: Sparkles, color: "text-primary", bg: "bg-primary/10" },
          { label: "Appointments", val: "6", icon: User, color: "text-indigo-500", bg: "bg-indigo-500/10" }
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-2 ${stat.bg} rounded-full`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.val}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="board" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="board">Service Bay Board</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="board" className="mt-0">
          <div className="flex h-[calc(100vh-280px)] min-h-[600px] overflow-hidden">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-4 overflow-x-auto pb-4 w-full scrollbar-hide">
                <SortableContext items={columnsId} strategy={horizontalListSortingStrategy}>
                  {COLUMNS.map(col => (
                    <BoardColumn 
                      key={col.id} 
                      column={col} 
                      ros={ros.filter(r => r.status === col.id)} 
                    />
                  ))}
                </SortableContext>
              </div>
              <DragOverlay>
                {activeRO ? <SortableROCard ro={activeRO} /> : null}
              </DragOverlay>
            </DndContext>
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle>Active Repair Orders</CardTitle>
                  <CardDescription>Live status of vehicles currently in the shop.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input placeholder="Search ROs..." className="pl-9 w-[150px] md:w-[200px] h-9" />
                  </div>
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6">RO #</TableHead>
                        <TableHead>Customer / Vehicle</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead className="text-right pr-6">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ros.map((ro) => (
                        <TableRow key={ro.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                          <TableCell className="pl-6 font-mono font-medium">{ro.roNumber}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={ro.avatar} />
                                <AvatarFallback>{ro.customer.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold text-sm">{ro.customer}</p>
                                <p className="text-xs text-slate-500">{ro.vehicle}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(ro.status)}</TableCell>
                          <TableCell className="w-[150px]">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-medium text-slate-500">
                                <span>{ro.progress}%</span>
                                <span>{ro.promisedTime}</span>
                              </div>
                              <Progress value={ro.progress} className="h-1.5" />
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shop Capacity</CardTitle>
                <CardDescription>Current technician workload.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { name: "Mike Tech", load: 85, jobs: 4 },
                  { name: "Steve Tech", load: 45, jobs: 2 },
                  { name: "Alex Tech", load: 95, jobs: 6 },
                  { name: "Sarah Tech", load: 10, jobs: 1 }
                ].map((tech, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px]">{tech.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{tech.name}</span>
                      </div>
                      <span className="text-xs text-slate-500">{tech.jobs} jobs active</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={tech.load} className={`h-2 flex-1 ${tech.load > 90 ? 'bg-destructive/20' : ''}`} />
                      <span className={`text-xs font-bold w-8 ${tech.load > 90 ? 'text-destructive' : 'text-slate-600'}`}>{tech.load}%</span>
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-900 dark:text-amber-500 uppercase">Parts Alert</p>
                      <p className="text-xs text-amber-800 dark:text-amber-400">3 ROs waiting on backordered brake pads.</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => toast.info("Messaging parts department...")}>
                    Notify Parts Manager
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

