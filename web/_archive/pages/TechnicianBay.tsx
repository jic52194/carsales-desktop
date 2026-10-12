import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Wrench, Clock, Camera, CheckCircle2, AlertTriangle, XCircle, Search, Video, Send, BrainCircuit, Scan, ShieldAlert, Flame, Trophy, Star, Award, Zap, Sparkles, Medal } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import confetti from "canvas-confetti";
import { hapticFeedback } from "@/lib/haptics";

const MOCK_ROS = [
  { id: "RO-4921", vehicle: "2021 Ford F-150", customer: "John Doe", status: "In Progress", timeLogged: "1h 15m" },
  { id: "RO-4922", vehicle: "2019 Honda Civic", customer: "Sarah Smith", status: "Waiting", timeLogged: "0h 0m" },
];

export default function TechnicianBay() {
  const [activeRO, setActiveRO] = useState(MOCK_ROS[0]);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [mpiState, setMpiState] = useState<Record<string, 'green' | 'yellow' | 'red'>>({});
  const [partsRequest, setPartsRequest] = useState("");

  const handleClockToggle = () => {
    setIsClockedIn(!isClockedIn);
    toast.success(isClockedIn ? "Clocked out of RO-4921" : "Clocked into RO-4921");
  };

  const setMpiStatus = (item: string, status: 'green' | 'yellow' | 'red') => {
    setMpiState(prev => ({ ...prev, [item]: status }));
  };

  const handleAutoRequest = () => {
    const failedItems = Object.entries(mpiState).filter(([_, status]) => status === 'red' || status === 'yellow').map(([item]) => item);
    
    if (failedItems.length === 0) {
      toast.info("No failed MPI items found to request parts for.");
      return;
    }
    
    const autoStr = `AI Auto-Request based on MPI:\n` + failedItems.map(i => `- Parts for ${i}`).join('\n');
    setPartsRequest(autoStr);
    toast.success("AI generated parts request from MPI");
  };

  const handleRequestParts = () => {
    if (!partsRequest) return;
    
    const existing = JSON.parse(localStorage.getItem('vibe_parts_requests') || '[]');
    const newRequest = {
      id: `REQ-${Math.floor(Math.random() * 10000)}`,
      ro: activeRO.id,
      vehicle: activeRO.vehicle,
      tech: "Current Tech",
      details: partsRequest,
      status: "Pending",
      date: new Date().toISOString(),
    };
    
    localStorage.setItem('vibe_parts_requests', JSON.stringify([newRequest, ...existing]));
    
    toast.success("Parts request sent to Parts Department");
    setPartsRequest("");
  };

  const handleUploadMedia = (type: 'photo' | 'video') => {
    toast.success(`Recorded ${type} of worn brake pads.`, {
      description: "SMS sent to customer with 1-click 'Approve Repair' link."
    });
  };

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto pb-mobile-nav">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Technician Bay</h1>
          <p className="text-muted-foreground">Digital MPI, Time-Clocking, and Parts Request.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            size="lg" 
            variant={isClockedIn ? "destructive" : "default"}
            className="w-full sm:w-auto rounded-full shadow-lg"
            onClick={handleClockToggle}
          >
            <Clock className="mr-2 h-5 w-5" />
            {isClockedIn ? "Clock Out (RO-4921)" : "Clock In"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-lg">My Repair Orders</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search ROs..." className="pl-9 bg-card" />
                </div>
              </div>
              <div className="divide-y">
                {MOCK_ROS.map(ro => (
                  <div 
                    key={ro.id} 
                    className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${activeRO.id === ro.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                    onClick={() => setActiveRO(ro)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-foreground">{ro.id}</span>
                      <Badge variant={ro.status === 'In Progress' ? 'default' : 'secondary'}>{ro.status}</Badge>
                    </div>
                    <p className="text-sm font-medium">{ro.vehicle}</p>
                    <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                      <span>{ro.customer}</span>
                      <span className="flex items-center"><Clock className="h-3 w-3 mr-1"/> {ro.timeLogged}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="mpi" className="w-full">
            <TabsList className="w-full grid grid-cols-4 h-12 p-1 bg-muted/50 rounded-xl">
              <TabsTrigger value="mpi" className="rounded-lg">Multi-Point Inspection</TabsTrigger>
              <TabsTrigger value="media" className="rounded-lg">Photos & Video</TabsTrigger>
              <TabsTrigger value="parts" className="rounded-lg">Parts Request</TabsTrigger>
              <TabsTrigger value="performance" className="rounded-lg">Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="mpi" className="mt-4 space-y-4">
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="bg-muted/30">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-primary" />
                    Digital MPI - {activeRO.vehicle}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {["Tires & Tread Depth", "Brake Pads & Rotors", "Battery Health", "Fluid Levels", "Wiper Blades", "Air Filters"].map(item => (
                      <div key={item} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20">
                        <span className="font-medium">{item}</span>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className={`h-9 w-12 ${mpiState[item] === 'green' ? 'bg-success/20 border-success text-success-foreground' : ''}`}
                            onClick={() => setMpiStatus(item, 'green')}
                          >
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className={`h-9 w-12 ${mpiState[item] === 'yellow' ? 'bg-amber-500/20 border-amber-500 text-amber-700' : ''}`}
                            onClick={() => setMpiStatus(item, 'yellow')}
                          >
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className={`h-9 w-12 ${mpiState[item] === 'red' ? 'bg-destructive/20 border-destructive text-destructive' : ''}`}
                            onClick={() => setMpiStatus(item, 'red')}
                          >
                            <XCircle className="h-5 w-5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-4 border-t bg-slate-50 dark:bg-slate-900/50">
                    <h4 className="font-semibold text-sm mb-3">Interactive Vehicle Diagram</h4>
                    <div className="relative w-full max-w-sm mx-auto aspect-[2/1] bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden border-2 border-slate-300 dark:border-slate-700">
                      <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-bold opacity-50 pointer-events-none">
                        [Top-Down Vehicle View]
                      </div>
                      <button 
                        onClick={() => toast.success("Damage marked: Front Bumper Scratch")}
                        className="absolute top-[10%] left-[45%] w-10 h-10 bg-rose-500/30 hover:bg-rose-500/50 rounded-full border border-rose-500 transition-colors flex items-center justify-center group"
                      >
                        <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-rose-900 dark:text-rose-100">Front</span>
                      </button>
                      <button 
                        onClick={() => toast.success("Damage marked: Driver Side Door Dent")}
                        className="absolute top-[45%] left-[20%] w-10 h-10 bg-amber-500/30 hover:bg-amber-500/50 rounded-full border border-amber-500 transition-colors flex items-center justify-center group"
                      >
                        <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-amber-900 dark:text-amber-100">Door</span>
                      </button>
                      <button 
                        onClick={() => toast.success("Damage marked: Rear Bumper Scrape")}
                        className="absolute bottom-[10%] left-[45%] w-10 h-10 bg-rose-500/30 hover:bg-rose-500/50 rounded-full border border-rose-500 transition-colors flex items-center justify-center group"
                      >
                        <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-rose-900 dark:text-rose-100">Rear</span>
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 text-center">Tap vehicle areas to mark damage or areas needing attention.</p>
                  </div>

                  <div className="p-4 border-t bg-slate-50 dark:bg-slate-900/50">
                    <h4 className="font-semibold text-sm mb-3">Tire Tread Depth Visualizer</h4>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-2">
                        <p className="text-[10px] text-muted-foreground font-bold">FL</p>
                        <p className="text-lg font-black text-destructive">3/32"</p>
                      </div>
                      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-2">
                        <p className="text-[10px] text-muted-foreground font-bold">FR</p>
                        <p className="text-lg font-black text-destructive">3/32"</p>
                      </div>
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
                        <p className="text-[10px] text-muted-foreground font-bold">RL</p>
                        <p className="text-lg font-black text-amber-600">5/32"</p>
                      </div>
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
                        <p className="text-[10px] text-muted-foreground font-bold">RR</p>
                        <p className="text-lg font-black text-amber-600">5/32"</p>
                      </div>
                    </div>
                    <p className="text-xs text-destructive font-medium mt-2 text-center">Replacement required for front tires.</p>
                  </div>

                  <div className="p-4 bg-muted/30 border-t flex justify-end">
                    <Button onClick={() => toast.success("MPI Saved and sent to Service Advisor")}>Save & Submit MPI</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="media" className="mt-4 space-y-4">
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="bg-muted/30">
                  <CardTitle className="text-lg">Customer Media</CardTitle>
                  <CardDescription>Upload photos or videos to justify recommended repairs.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button 
                      variant="outline" 
                      className="h-32 flex flex-col items-center justify-center gap-2 border-dashed border-2 hover:bg-primary/5 hover:border-primary/50"
                      onClick={() => handleUploadMedia('photo')}
                    >
                      <Camera className="h-8 w-8 text-muted-foreground" />
                      <span>Take Photo</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-32 flex flex-col items-center justify-center gap-2 border-dashed border-2 hover:bg-primary/5 hover:border-primary/50"
                      onClick={() => handleUploadMedia('video')}
                    >
                      <Video className="h-8 w-8 text-muted-foreground" />
                      <span>Record Video Walkthrough</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-32 flex flex-col items-center justify-center gap-2 border-dashed border-2 bg-indigo-50/50 hover:bg-indigo-100 border-indigo-200 text-indigo-700"
                      onClick={() => toast.success("AI Tire Scan Complete: 4/32nds remaining. Replacement recommended.")}
                    >
                      <Scan className="h-8 w-8 text-indigo-500" />
                      <span>AI Tire Scanner</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-32 flex flex-col items-center justify-center gap-2 border-dashed border-2 bg-rose-50/50 hover:bg-rose-100 border-rose-200 text-rose-700"
                      onClick={() => toast.success("NHTSA Database Scanned: 1 Active Recall Found (Airbag).")}
                    >
                      <ShieldAlert className="h-8 w-8 text-rose-500" />
                      <span>NHTSA Recall Scan</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="parts" className="mt-4 space-y-4">
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="bg-muted/30">
                  <CardTitle className="text-lg">Request Parts</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Part Description / Number</Label>
                    <Textarea 
                      placeholder="e.g., Front brake pads and rotors for 2021 F-150..." 
                      value={partsRequest}
                      onChange={(e) => setPartsRequest(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={handleRequestParts} className="w-full sm:w-auto" disabled={!partsRequest}>
                      <Send className="mr-2 h-4 w-4" />
                      Send to Parts Dept
                    </Button>
                    <Button onClick={handleAutoRequest} variant="secondary" className="w-full sm:w-auto bg-primary/10 text-primary hover:bg-primary/20">
                      <BrainCircuit className="mr-2 h-4 w-4" />
                      AI Auto-Request from MPI
                    </Button>
                    <Button onClick={() => toast.success("AI drafted warranty claim narrative. Ready for submission.")} variant="outline" className="w-full sm:w-auto border-amber-200 text-amber-700 hover:bg-amber-50">
                      <ShieldAlert className="mr-2 h-4 w-4" />
                      AI Warranty Claim
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance" className="mt-4 space-y-4">
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="bg-muted/30">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Flame className="h-5 w-5 text-orange-500" />
                    Service Up-Sell Heatmap
                  </CardTitle>
                  <CardDescription>MPI recommendation conversion rates by technician.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-lg p-4">
                        <p className="text-sm font-medium text-orange-800 dark:text-orange-400">Top Converter</p>
                        <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">Mike R.</p>
                        <p className="text-xs text-orange-700 dark:text-orange-500 mt-1">68% Conversion Rate</p>
                      </div>
                      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg p-4">
                        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">Total Up-Sell Rev</p>
                        <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-300">$14,250</p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-500 mt-1">This Month</p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-400">Avg. MPI Value</p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">$345</p>
                        <p className="text-xs text-blue-700 dark:text-blue-500 mt-1">Per Repair Order</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Tech Bay Efficiency Matrix</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        <div className="p-4 rounded-xl border border-border/50 bg-card">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">Flat Rate Hours</span>
                            <span className="text-lg font-bold text-primary">42.5</span>
                          </div>
                          <Progress value={100} className="h-2 bg-primary/20" />
                        </div>
                        <div className="p-4 rounded-xl border border-border/50 bg-card">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">Actual Hours Worked</span>
                            <span className="text-lg font-bold text-emerald-500">34.0</span>
                          </div>
                          <Progress value={80} className="h-2 bg-emerald-500/20" />
                        </div>
                      </div>

                      <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Technician Conversion Heatmap</h3>
                      
                      <div className="space-y-3">
                        {[
                          { name: "Mike Ross", rate: 68, color: "bg-orange-500", rev: "$5,200" },
                          { name: "Sarah Jenkins", rate: 54, color: "bg-orange-400", rev: "$4,100" },
                          { name: "David Chen", rate: 42, color: "bg-amber-400", rev: "$2,800" },
                          { name: "Current Tech", rate: 31, color: "bg-amber-300", rev: "$1,450" },
                          { name: "John Doe", rate: 18, color: "bg-yellow-300", rev: "$700" },
                        ].map((tech, i) => (
                          <div key={i} className="flex items-center gap-4">
                            <div className="w-24 shrink-0 text-sm font-medium">{tech.name}</div>
                            <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden relative">
                              <div className={`absolute top-0 left-0 h-full ${tech.color} transition-all duration-1000`} style={{ width: `${tech.rate}%` }}></div>
                            </div>
                            <div className="w-12 shrink-0 text-right text-sm font-bold">{tech.rate}%</div>
                            <div className="w-16 shrink-0 text-right text-sm text-muted-foreground">{tech.rev}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-sm mt-6">
                <CardHeader className="bg-muted/30">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    Customer Approval Timeline
                  </CardTitle>
                  <CardDescription>Average time from MPI sent to customer approval.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-border/50 pb-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Dealership Average</p>
                        <p className="text-2xl font-bold">14m 32s</p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-sm font-medium text-muted-foreground">Fastest Approval</p>
                        <p className="text-2xl font-bold text-success">2m 15s</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Recent Approvals</h3>
                      <div className="space-y-3">
                        {[
                          { customer: "Sarah Jenkins", vehicle: "2024 Luxury SUV", time: "4m 12s", status: "fast" },
                          { customer: "Mike Ross", vehicle: "2021 Honda Accord", time: "18m 45s", status: "average" },
                          { customer: "David Chen", vehicle: "2022 Electric Hatch", time: "42m 10s", status: "slow" },
                          { customer: "Emily Blunt", vehicle: "2020 Rugged Truck", time: "8m 30s", status: "fast" },
                        ].map((approval, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
                            <div>
                              <p className="font-medium text-sm">{approval.customer}</p>
                              <p className="text-xs text-muted-foreground">{approval.vehicle}</p>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${approval.status === 'fast' ? 'text-success' : approval.status === 'slow' ? 'text-destructive' : 'text-amber-500'}`}>
                                {approval.time}
                              </p>
                              <p className="text-xs text-muted-foreground">Time to Approve</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-sm mt-6">
                <CardHeader className="bg-muted/30 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      Gamified Up-Sell Leaderboard
                    </CardTitle>
                    <CardDescription>Live technician rankings and unlocked achievements.</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => {
                    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
                    toast.success("Achievement Unlocked: Up-Sell King! 👑", { description: "You hit $5k in up-sells this week." });
                    hapticFeedback();
                  }} className="bg-yellow-500 hover:bg-yellow-600 text-white shadow-sm">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Claim Reward
                  </Button>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                      {[
                        { rank: 1, name: "Mike Ross", rev: "$5,200", points: 2450, badges: [{ icon: Flame, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/30", title: "On Fire (3 days)" }, { icon: Trophy, color: "text-yellow-500", bg: "bg-yellow-100 dark:bg-yellow-900/30", title: "Weekly Leader" }] },
                        { rank: 2, name: "Sarah Jenkins", rev: "$4,100", points: 1820, badges: [{ icon: Star, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30", title: "Rising Star" }] },
                        { rank: 3, name: "David Chen", rev: "$2,800", points: 1240, badges: [{ icon: Zap, color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-900/30", title: "Fast Approvals" }] },
                        { rank: 4, name: "Current Tech", rev: "$1,450", points: 850, badges: [] },
                      ].map((tech, i) => (
                        <div key={i} className={`flex items-center justify-between p-4 rounded-xl border ${tech.rank === 1 ? 'border-yellow-200 dark:border-yellow-900/50 bg-yellow-50/50 dark:bg-yellow-950/20' : 'border-border/50 bg-card'} hover:shadow-md transition-all duration-300`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${tech.rank === 1 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-400' : tech.rank === 2 ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400' : tech.rank === 3 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-400' : 'bg-muted text-muted-foreground'}`}>
                              {tech.rank}
                            </div>
                            <div>
                              <p className="font-bold text-base">{tech.name}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <Award className="w-3 h-3 text-primary" />
                                <span className="text-xs font-medium text-muted-foreground">{tech.points} XP</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="flex gap-2 hidden sm:flex">
                              {tech.badges.map((badge, j) => (
                                <div key={j} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${badge.bg}`} title={badge.title}>
                                  <badge.icon className={`w-3.5 h-3.5 ${badge.color}`} />
                                  <span className={`text-xs font-semibold ${badge.color}`}>{badge.title}</span>
                                </div>
                              ))}
                            </div>
                            <div className="text-right">
                              <p className="font-black text-lg text-success">{tech.rev}</p>
                              <p className="text-xs text-muted-foreground">Up-Sell Rev</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </div>
  );
}
