import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Settings, Play, Save, ArrowDown, Mail, MessageSquare, UserPlus, Clock, Zap, CheckCircle2, GripVertical, Trash2, Activity, Users, MousePointerClick, TrendingUp, XCircle, History, GitBranch } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const analyticsData = [
  { name: 'Mon', enrolled: 120, converted: 45 },
  { name: 'Tue', enrolled: 132, converted: 52 },
  { name: 'Wed', enrolled: 101, converted: 38 },
  { name: 'Thu', enrolled: 145, converted: 65 },
  { name: 'Fri', enrolled: 160, converted: 72 },
  { name: 'Sat', enrolled: 85, converted: 30 },
  { name: 'Sun', enrolled: 90, converted: 35 },
];

const executionHistory = [
  { id: 'ex-1', contact: 'John Doe', status: 'completed', date: '2026-05-25 10:30 AM', currentStep: 'Completed' },
  { id: 'ex-2', contact: 'Sarah Jenkins', status: 'running', date: '2026-05-25 09:15 AM', currentStep: 'Wait 15 Minutes' },
  { id: 'ex-3', contact: 'Mike Ross', status: 'failed', date: '2026-05-24 14:20 PM', currentStep: 'Send Welcome SMS' },
  { id: 'ex-4', contact: 'Emily Blunt', status: 'completed', date: '2026-05-24 11:05 AM', currentStep: 'Completed' },
  { id: 'ex-5', contact: 'David Chen', status: 'running', date: '2026-05-23 16:45 PM', currentStep: 'Assign to BDC' },
];

interface WorkflowStep {
  id: string;
  type: 'trigger' | 'action' | 'delay' | 'condition';
  title: string;
  description: string;
  icon: React.ElementType;
  stats?: {
    completed: number;
    failed: number;
    pending: number;
  };
}

const SortableStep = ({ step, onRemove, onEdit }: { step: WorkflowStep, onRemove: (id: string) => void, onEdit: (step: WorkflowStep) => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  const Icon = step.icon;

  return (
    <div ref={setNodeRef} style={style} className={`relative flex flex-col items-center group ${isDragging ? 'opacity-50' : ''}`}>
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm group-hover:border-primary/50 transition-colors">
        <div className="flex items-start gap-4">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 mt-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <GripVertical className="h-5 w-5" />
          </div>
          <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
            step.type === 'trigger' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' :
            step.type === 'delay' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' :
            step.type === 'condition' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' :
            'bg-primary/10 text-primary'
          }`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h4 className="font-semibold text-slate-900 dark:text-white text-sm truncate">{step.title}</h4>
            <p className="text-xs text-slate-500 truncate">{step.description}</p>
          </div>
          <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={() => onEdit(step)}>
            <Settings className="h-4 w-4" />
          </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-destructive" onClick={() => onRemove(step.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {step.stats && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 ml-11">
            <div className="flex items-center gap-1.5" title="Completed">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{step.stats.completed}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Failed">
              <XCircle className="h-3.5 w-3.5 text-destructive" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{step.stats.failed}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Pending/Waiting">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{step.stats.pending}</span>
            </div>
          </div>
        )}
      </div>
      <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 my-1 group-last:hidden"></div>
      <div className="absolute -bottom-3 z-10 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-0.5 text-slate-400 group-last:hidden">
        <ArrowDown className="h-3 w-3" />
      </div>
    </div>
  );
};

const TEMPLATES = [
  {
    id: 'anniversary',
    name: 'Automated Anniversary Gifts',
    description: 'Triggers a physical mailer or gift basket exactly 1 year after the purchase date.',
    steps: [
      { id: 'step-1', type: 'trigger', title: 'Deal Funded', description: 'When a deal moves to Funded', icon: Zap, stats: { completed: 450, failed: 0, pending: 0 } },
      { id: 'step-2', type: 'delay', title: 'Wait 365 Days', description: 'Delay exactly 1 year', icon: Clock, stats: { completed: 0, failed: 0, pending: 450 } },
      { id: 'step-3', type: 'action', title: 'Send Gift Basket', description: 'Send order to Sendoso API', icon: UserPlus, stats: { completed: 0, failed: 0, pending: 0 } },
      { id: 'step-4', type: 'action', title: 'Send SMS', description: 'Send template: "Happy Anniversary!"', icon: MessageSquare, stats: { completed: 0, failed: 0, pending: 0 } },
    ] as WorkflowStep[]
  },
  {
    id: 'internet-lead',
    name: 'Internet Lead Follow-Up',
    description: 'Automated sequence for new third-party internet leads.',
    steps: [
      { id: 'step-1', type: 'trigger', title: 'New Internet Lead', description: 'When a new lead arrives from Cars.com', icon: Zap, stats: { completed: 833, failed: 0, pending: 0 } },
      { id: 'step-2', type: 'action', title: 'Send Welcome SMS', description: 'Send template: "Internet Lead Welcome"', icon: MessageSquare, stats: { completed: 810, failed: 12, pending: 11 } },
      { id: 'step-3', type: 'delay', title: 'Wait 15 Minutes', description: 'Delay before next action', icon: Clock, stats: { completed: 790, failed: 0, pending: 20 } },
      { id: 'step-3b', type: 'condition', title: 'Has Phone Number?', description: 'If lead provided a valid phone', icon: GitBranch, stats: { completed: 790, failed: 0, pending: 0 } },
      { id: 'step-4', type: 'action', title: 'Send Intro Email', description: 'Send template: "Vehicle Availability"', icon: Mail, stats: { completed: 785, failed: 5, pending: 0 } },
      { id: 'step-5', type: 'action', title: 'Assign to BDC', description: 'Assign lead to round-robin group', icon: UserPlus, stats: { completed: 785, failed: 0, pending: 0 } },
    ] as WorkflowStep[]
  },
  {
    id: 'no-show',
    name: 'No-Show Reactivation',
    description: 'Follow up with appointments that did not show.',
    steps: [
      { id: 'step-1', type: 'trigger', title: 'Appointment Status: No-Show', description: 'When appointment status changes to No-Show', icon: Zap, stats: { completed: 142, failed: 0, pending: 0 } },
      { id: 'step-2', type: 'action', title: 'Send SMS', description: 'Send template: "Missed You"', icon: MessageSquare, stats: { completed: 138, failed: 4, pending: 0 } },
      { id: 'step-3', type: 'delay', title: 'Wait 1 Day', description: 'Delay 24 hours', icon: Clock, stats: { completed: 95, failed: 0, pending: 43 } },
      { id: 'step-4', type: 'action', title: 'Create Task', description: 'Task: "Call No-Show Customer"', icon: UserPlus, stats: { completed: 95, failed: 0, pending: 0 } },
    ] as WorkflowStep[]
  },
  {
    id: 'sold-followup',
    name: 'Post-Sale 30 Day Check-in',
    description: 'Automated follow-up 30 days after vehicle delivery.',
    steps: [
      { id: 'step-1', type: 'trigger', title: 'Vehicle Sold', description: 'When deal status changes to Delivered', icon: Zap, stats: { completed: 412, failed: 0, pending: 0 } },
      { id: 'step-2', type: 'delay', title: 'Wait 30 Days', description: 'Delay 30 days', icon: Clock, stats: { completed: 250, failed: 0, pending: 162 } },
      { id: 'step-3', type: 'action', title: 'Send Email', description: 'Send template: "How is your new car?"', icon: Mail, stats: { completed: 248, failed: 2, pending: 0 } },
      { id: 'step-4', type: 'action', title: 'Send SMS', description: 'Send template: "30 Day Check-in"', icon: MessageSquare, stats: { completed: 245, failed: 3, pending: 0 } },
    ] as WorkflowStep[]
  }
];

export default function WorkflowBuilder() {
  const [activeTemplate, setActiveTemplate] = useState(TEMPLATES[0]);
  const [steps, setSteps] = useState<WorkflowStep[]>(TEMPLATES[0].steps);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setSteps((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter(s => s.id !== id));
    toast.success("Step removed from workflow");
  };

  const handleEditStep = (updatedStep: WorkflowStep) => {
    setSteps(steps.map(s => s.id === updatedStep.id ? updatedStep : s));
    setEditingStep(null);
    toast.success("Step updated");
  };

  const addStep = (type: 'action' | 'delay' | 'condition', title: string, icon: React.ElementType) => {
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      type,
      title,
      description: 'Configure this step...',
      icon
    };
    setSteps([...steps, newStep]);
    setIsAddOpen(false);
    toast.success("New step added");
  };

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 p-4 md:p-8 font-sans" data-tour-id="tour-ai-followup">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <Tabs defaultValue="builder" className="w-full">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {activeTemplate.name}
                </h1>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                </Badge>
              </div>
              <p className="text-slate-500 text-sm mb-4">{activeTemplate.description}</p>
              
              <TabsList className="bg-slate-100 dark:bg-slate-800">
                <TabsTrigger value="builder" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950">
                  <Settings className="w-4 h-4 mr-2" /> Builder
                </TabsTrigger>
                <TabsTrigger value="analytics" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950">
                  <Activity className="w-4 h-4 mr-2" /> Analytics
                </TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950">
                  <History className="w-4 h-4 mr-2" /> History
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="flex items-center gap-3 self-start md:self-auto">
              <div className="relative group">
                <Button variant="outline" className="bg-white dark:bg-slate-950">
                  Templates <ArrowDown className="h-3 w-3 ml-2" />
                </Button>
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-2">
                  <div className="text-xs font-semibold text-slate-500 px-2 pb-2 pt-1 uppercase tracking-wider">Pre-built Automations</div>
                  {TEMPLATES.map(t => (
                    <button 
                      key={t.id}
                      onClick={() => {
                        setActiveTemplate(t);
                        setSteps([...t.steps]);
                        toast.success(`Loaded template: ${t.name}`);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeTemplate.id === t.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
              <Button variant="outline" className="bg-white dark:bg-slate-950">
                <Play className="h-4 w-4 mr-2 text-primary" /> Test
              </Button>
              <Button onClick={() => toast.success("Workflow saved successfully")}>
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
            </div>
          </div>

          <TabsContent value="builder" className="m-0">
            {/* Builder Area */}
            <div className="bg-slate-100/50 dark:bg-slate-800/20 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 min-h-[500px] flex flex-col items-center">
              
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={steps}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="w-full flex flex-col items-center relative pb-8">
                    {steps.map((step) => (
                      <SortableStep key={step.id} step={step} onRemove={removeStep} onEdit={setEditingStep} />
                    ))}
                    
                    {/* Add Step Button */}
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="mt-6 rounded-full bg-white dark:bg-slate-900 border-dashed border-2 hover:border-primary hover:bg-primary/5 shadow-sm">
                          <Plus className="h-4 w-4 mr-2" /> Add Step
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Add Workflow Step</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <button onClick={() => addStep('action', 'Send SMS', MessageSquare)} className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary hover:bg-primary/5 transition-colors text-left">
                            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <MessageSquare className="h-5 w-5" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm">Send SMS Message</h4>
                              <p className="text-xs text-slate-500">Send an automated text to the customer.</p>
                            </div>
                          </button>
                          <button onClick={() => addStep('action', 'Send Email', Mail)} className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary hover:bg-primary/5 transition-colors text-left">
                            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <Mail className="h-5 w-5" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm">Send Email</h4>
                              <p className="text-xs text-slate-500">Send an automated email template.</p>
                            </div>
                          </button>
                          <button onClick={() => addStep('delay', 'Time Delay', Clock)} className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary hover:bg-primary/5 transition-colors text-left">
                            <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 flex items-center justify-center shrink-0">
                              <Clock className="h-5 w-5" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm">Add Delay</h4>
                              <p className="text-xs text-slate-500">Wait a specific amount of time before continuing.</p>
                            </div>
                          </button>
                          <button onClick={() => addStep('condition', 'If/Else Condition', GitBranch)} className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary hover:bg-primary/5 transition-colors text-left">
                            <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center shrink-0">
                              <GitBranch className="h-5 w-5" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm">If/Else Condition</h4>
                              <p className="text-xs text-slate-500">Branch the workflow based on data or actions.</p>
                            </div>
                          </button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Edit Step Dialog */}
                    <Dialog open={!!editingStep} onOpenChange={(open) => !open && setEditingStep(null)}>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Edit Step</DialogTitle>
                        </DialogHeader>
                        {editingStep && (
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Step Title</Label>
                              <Input 
                                value={editingStep.title} 
                                onChange={(e) => setEditingStep({...editingStep, title: e.target.value})} 
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Description</Label>
                              <Input 
                                value={editingStep.description} 
                                onChange={(e) => setEditingStep({...editingStep, description: e.target.value})} 
                              />
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                              <Button variant="outline" onClick={() => setEditingStep(null)}>Cancel</Button>
                              <Button onClick={() => handleEditStep(editingStep)}>Save Changes</Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="m-0 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Users className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Total Enrolled</p>
                      <h3 className="text-3xl font-bold">833</h3>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <MousePointerClick className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Conversion Rate</p>
                      <h3 className="text-3xl font-bold">40.5%</h3>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Total Converted</p>
                      <h3 className="text-3xl font-bold">337</h3>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Enrollment vs Conversion</CardTitle>
                <CardDescription>Performance over the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorEnrolled" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorConverted" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Area type="monotone" dataKey="enrolled" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorEnrolled)" />
                      <Area type="monotone" dataKey="converted" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorConverted)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="m-0 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Execution History</CardTitle>
                <CardDescription>Recent workflow executions and their current status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                      <TableRow>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Current Step</TableHead>
                        <TableHead className="text-right">Last Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {executionHistory.map((run) => (
                        <TableRow key={run.id}>
                          <TableCell className="font-medium">{run.contact}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              run.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20' :
                              run.status === 'running' ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20' :
                              'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:border-red-500/20'
                            }>
                              {run.status === 'completed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                              {run.status === 'running' && <Activity className="h-3 w-3 mr-1" />}
                              {run.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                              {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-400">{run.currentStep}</TableCell>
                          <TableCell className="text-right text-slate-500">{run.date}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
