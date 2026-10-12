import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Camera, Image, CheckCircle2, CloudUpload, Sparkles, Car, Zap,
  RotateCcw, Eye, Download, Trash2, Plus, Star, AlertCircle, Check, Video
} from "lucide-react";
import { toast } from "sonner";

const pendingVehicles = [
  { stock: "2408A", vehicle: "2024 Toyota Camry XSE", photos: 0, required: 18, priority: "High" },
  { stock: "2407B", vehicle: "2023 Ford F-150 Lariat", photos: 4, required: 18, priority: "High" },
  { stock: "2406C", vehicle: "2022 Honda CR-V EX-L", photos: 12, required: 18, priority: "Medium" },
  { stock: "2405D", vehicle: "2024 Jeep Wrangler Sport", photos: 16, required: 18, priority: "Low" },
];

const completedVehicles = [
  { stock: "2404E", vehicle: "2023 Chevrolet Equinox LT", photos: 21, status: "Published", aiProcessed: true },
  { stock: "2403F", vehicle: "2021 BMW X5 xDrive", photos: 24, status: "Published", aiProcessed: true },
  { stock: "2402G", vehicle: "2022 Tesla Model 3", photos: 19, status: "Review", aiProcessed: true },
];

const shotChecklist = [
  { label: "Front 3/4 View", done: true, required: true },
  { label: "Driver Side Profile", done: true, required: true },
  { label: "Rear 3/4 View", done: true, required: true },
  { label: "Passenger Side", done: false, required: true },
  { label: "Front Grille", done: false, required: true },
  { label: "Rear Bumper", done: false, required: true },
  { label: "Interior Front Seats", done: true, required: true },
  { label: "Interior Rear Seats", done: false, required: true },
  { label: "Dashboard / Gauges", done: false, required: true },
  { label: "Center Console", done: false, required: false },
  { label: "Odometer", done: false, required: true },
  { label: "Engine Bay", done: false, required: false },
  { label: "Trunk / Cargo", done: false, required: false },
  { label: "Wheel / Tire Detail", done: false, required: false },
  { label: "VIN Plate", done: false, required: true },
  { label: "Any Damage (if applicable)", done: false, required: false },
];

export default function PhotoStudio() {
  const [activeVehicle, setActiveVehicle] = useState(1);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiDone, setAiDone] = useState(false);
  const vehicle = pendingVehicles[activeVehicle];
  const completedShots = shotChecklist.filter(s => s.done).length;

  const handleAI = () => {
    setAiProcessing(true);
    setTimeout(() => { setAiProcessing(false); setAiDone(true); }, 2200);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Camera className="h-7 w-7 text-primary" /> Photo Studio
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Capture, process, and publish vehicle photos with AI background removal.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Eye className="h-4 w-4" /> Preview Listing
          </Button>
          <Button size="sm" className="gap-1.5">
            <CloudUpload className="h-4 w-4" /> Publish to Web
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Missing Photo Alerts", val: "4", sub: "Units missing photos (<15)", color: "text-rose-600", icon: AlertCircle },
          { label: "Photos Taken Today", val: "37", sub: "Across 3 vehicles", color: "text-primary", icon: Camera },
          { label: "AI Processed Today", val: "34", sub: "Background removed", color: "text-purple-600", icon: Sparkles },
          { label: "Published to Website", val: "62", sub: "Last 7 days", color: "text-emerald-600", icon: CheckCircle2 },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <kpi.icon className={`h-4 w-4 ${kpi.color} mb-2`} />
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-xl font-bold">{kpi.val}</p>
              <p className="text-[11px] text-muted-foreground">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Vehicle Queue */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Photo Queue</p>

          {pendingVehicles.map((v, i) => (
            <button
              key={i}
              onClick={() => setActiveVehicle(i)}
              className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${activeVehicle === i ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm truncate">{v.vehicle}</span>
                <Badge className={`text-[10px] shrink-0 ml-2 ${v.priority === 'High' ? 'bg-rose-500 text-white' : v.priority === 'Medium' ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                  {v.priority}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={(v.photos / v.required) * 100} className="h-1.5 flex-1" />
                <span className="text-xs text-muted-foreground shrink-0">{v.photos}/{v.required}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Stock #{v.stock}</p>
            </button>
          ))}

          <div className="pt-2 border-t border-border">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Completed</p>
            {completedVehicles.map((v, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{v.vehicle}</p>
                    <p className="text-[11px] text-muted-foreground">{v.photos} photos · {v.status}</p>
                  </div>
                </div>
                {v.aiProcessed && <Sparkles className="h-3.5 w-3.5 text-purple-500 shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* Center + Right: Studio */}
        <div className="lg:col-span-2 space-y-4">
          {/* Active vehicle header */}
          <Card>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl">
                  <Car className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold">{vehicle.vehicle}</p>
                  <p className="text-xs text-muted-foreground">Stock #{vehicle.stock} · {completedShots} of {shotChecklist.length} shots captured</p>
                </div>
              </div>
              <Progress value={(completedShots / shotChecklist.length) * 100} className="h-2 w-24 shrink-0" />
            </CardContent>
          </Card>

          {/* Live Capture Area */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" /> Live Capture
              </CardTitle>
              <CardDescription>Point your device camera at the vehicle and capture each angle.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="bg-slate-900 relative overflow-hidden">
                {/* Camera viewfinder mockup */}
                <div className="aspect-video flex items-center justify-center relative">
                  {/* Grid overlay */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                    {[...Array(9)].map((_, i) => (
                      <div key={i} className="border border-white/10" />
                    ))}
                  </div>

                  {/* Car silhouette mockup */}
                  <div className="relative flex flex-col items-center gap-2">
                    <div className="text-6xl md:text-8xl">🚗</div>
                    <p className="text-white/60 text-xs font-medium">Live Camera Feed</p>
                    <p className="text-white/40 text-[11px]">Next: Passenger Side Profile</p>
                  </div>

                  {/* Corner brackets */}
                  <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-sm" />
                  <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-sm" />
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-sm" />
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-sm" />
                </div>

                {/* Capture controls */}
                <div className="flex items-center justify-center gap-6 py-4 bg-slate-800/80">
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-white/60 hover:text-white hover:bg-white/10">
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                  <button className="h-16 w-16 rounded-full bg-white border-4 border-white/20 flex items-center justify-center hover:bg-white/90 transition-all active:scale-95 shadow-2xl">
                    <div className="h-12 w-12 rounded-full bg-slate-900" />
                  </button>
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-white/60 hover:text-white hover:bg-white/10">
                    <Image className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shot checklist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Shot Checklist</CardTitle>
                <CardDescription>{completedShots}/{shotChecklist.length} complete</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1.5 max-h-64 overflow-y-auto">
                {shotChecklist.map((shot, i) => (
                  <div key={i} className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-2">
                      {shot.done
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        : <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />}
                      <span className={`text-xs ${shot.done ? 'text-foreground' : 'text-muted-foreground'}`}>{shot.label}</span>
                    </div>
                    {shot.required && <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary/30 text-primary">REQ</Badge>}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* AI Processing */}
            <Card className={`overflow-hidden transition-all ${aiDone ? 'border-emerald-400' : 'border-purple-300/60'}`}>
              <CardHeader className="pb-2 bg-gradient-to-br from-purple-500/10 to-primary/10">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" /> AI Background Removal
                </CardTitle>
                <CardDescription>Instantly remove backgrounds and enhance vehicle photos.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Before/After mockup */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-[10px] text-muted-foreground font-bold mb-2">BEFORE</p>
                    <div className="text-3xl">🚗</div>
                    <div className="h-4 mt-2 bg-gradient-to-r from-green-200 via-blue-100 to-green-300 rounded opacity-60" />
                  </div>
                  <div className={`rounded-lg p-3 text-center border-2 ${aiDone ? 'border-emerald-400 bg-emerald-50/50' : 'border-dashed border-border bg-muted/30'}`}>
                    <p className="text-[10px] text-muted-foreground font-bold mb-2">AFTER</p>
                    {aiDone ? (
                      <>
                        <div className="text-3xl">🚗</div>
                        <div className="h-4 mt-2 bg-white rounded border border-border" />
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-10">
                        {aiProcessing
                          ? <div className="h-5 w-5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                          : <Zap className="h-5 w-5 text-muted-foreground/40" />}
                      </div>
                    )}
                  </div>
                </div>

                {aiDone ? (
                  <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold bg-emerald-50 rounded-lg p-2">
                    <Check className="h-4 w-4 shrink-0" /> Background removed · Ready to publish
                  </div>
                ) : (
                  <Button
                    className="w-full gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
                    size="sm"
                    onClick={handleAI}
                    disabled={aiProcessing}
                  >
                    {aiProcessing ? (
                      <><div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> Processing...</>
                    ) : (
                      <><Sparkles className="h-3.5 w-3.5" /> Run AI Enhancement</>
                    )}
                  </Button>
                )}

                {aiDone && (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs"><Download className="h-3.5 w-3.5" />Download</Button>
                      <Button size="sm" className="flex-1 gap-1 text-xs"><CloudUpload className="h-3.5 w-3.5" />Publish</Button>
                    </div>
                    <Button size="sm" variant="secondary" className="w-full gap-1.5 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200" onClick={() => toast.success("AI Video Walkaround Generated!", { description: "Photos stitched into a narrated video." })}>
                      <Video className="h-3.5 w-3.5" /> Generate AI Video Walkaround
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
