import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Slider } from "../components/ui/slider";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Calculator, Car, Search, Sparkles, TrendingUp, AlertTriangle, CheckCircle2, History, Camera, RefreshCcw, Zap } from "lucide-react";
import { formatCurrency } from "@/lib/calculations";
import { toast } from "sonner";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader, DialogDescription } from "../components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";
export default function Appraisals() {
  const [vin, setVin] = useState("");
  const [isDecoding, setIsDecoding] = useState(false);
  const [vehicle, setVehicle] = useState<{ year?: number; make?: string; model?: string } | null>(null);
  
  // Appraisal Parameters
  const [mileage, setMileage] = useState<number>(0);
  const [condition, setCondition] = useState<string>("good");
  const [targetMargin, setTargetMargin] = useState<number[]>([2500]);
  const [targetTurnDays, setTargetTurnDays] = useState<number[]>([30]);
  const [reconEstimate, setReconEstimate] = useState<number>(800);

  // Recent Appraisals State
  interface AppraisedVehicle {
    id: string;
    date: string;
    vin: string;
    vehicle: string;
    mileage: number;
    condition: string;
    acv: number;
    status: 'Pending' | 'Won' | 'Lost';
  }

  const [recentAppraisals, setRecentAppraisals] = useState<AppraisedVehicle[]>(() => {
    const saved = localStorage.getItem('vibe_recent_appraisals');
    return saved ? JSON.parse(saved) : [
       { id: '1', date: new Date().toLocaleDateString(), vin: '1G1RC6E4XEUXXXXXX', vehicle: '2024 Chevrolet Silverado 1500', mileage: 12500, condition: 'excellent', acv: 42500, status: 'Won' },
       { id: '2', date: new Date(Date.now() - 86400000).toLocaleDateString(), vin: 'JTDKN3DPXFXXXXXXX', vehicle: '2021 Toyota Camry LE', mileage: 45000, condition: 'good', acv: 18200, status: 'Pending' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('vibe_recent_appraisals', JSON.stringify(recentAppraisals));
  }, [recentAppraisals]);

  // Mock Market Data
  const marketRetail = 28500;
  const marketDaysSupply = 45;

  const decodeVIN = async () => {
    if (vin.length !== 17) {
      toast.error("Please enter a valid 17-character VIN");
      return;
    }
    setIsDecoding(true);
    try {
      const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`);
      const data = await response.json();
      const result = data.Results?.[0];
      
      if (result && result.Make) {
        setVehicle({
          year: parseInt(result.ModelYear) || new Date().getFullYear(),
          make: result.Make.charAt(0).toUpperCase() + result.Make.slice(1).toLowerCase(),
          model: result.Model.charAt(0).toUpperCase() + result.Model.slice(1).toLowerCase(),
        });
        toast.success("Vehicle decoded successfully");
      } else {
        toast.error("Could not decode VIN");
      }
    } catch (error) {
      toast.error("Failed to decode VIN");
    } finally {
      setIsDecoding(false);
    }
  };

  // Condition adjustments
  const conditionMultipliers: Record<string, number> = {
    excellent: 1.05,
    good: 1.0,
    fair: 0.9,
    poor: 0.75
  };

  // Calculations
  const conditionAdjustedRetail = marketRetail * (conditionMultipliers[condition] || 1.0);
  const turnStrategyAdjustment = targetTurnDays[0] < 30 ? -1000 : targetTurnDays[0] > 60 ? 1000 : 0; // Aggressive turn means price it lower retail, so we buy it for less
  const suggestedACV = conditionAdjustedRetail - targetMargin[0] - reconEstimate + turnStrategyAdjustment;

  const totalAppraisals = recentAppraisals.length;
  const wonAppraisals = recentAppraisals.filter(a => a.status === 'Won').length;
  const lostAppraisals = recentAppraisals.filter(a => a.status === 'Lost').length;
  const pendingAppraisals = recentAppraisals.filter(a => a.status === 'Pending').length;
  const winRate = totalAppraisals > 0 && (wonAppraisals + lostAppraisals) > 0 
    ? Math.round((wonAppraisals / (wonAppraisals + lostAppraisals)) * 100) 
    : 0;

  const chartData = useMemo(() => {
    const dataByDate: Record<string, { date: string; Total: number; Won: number; Lost: number; Pending: number }> = {};
    
    // Sort appraisals by date ascending
    const sortedAppraisals = [...recentAppraisals].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    sortedAppraisals.forEach(app => {
      if (!dataByDate[app.date]) {
        dataByDate[app.date] = { date: app.date, Total: 0, Won: 0, Lost: 0, Pending: 0 };
      }
      dataByDate[app.date].Total += 1;
      dataByDate[app.date][app.status] += 1;
    });

    return Object.values(dataByDate);
  }, [recentAppraisals]);

  const handleSaveAppraisal = () => {
    if (!vehicle) {
      toast.error("Please decode a vehicle first");
      return;
    }
    
    // Lost Lead Revival Logic
    if (mileage > 100000) {
      toast.info("AI: High Mileage Detected", {
        description: "Automatically drafting a 'Lost Lead Revival' text for the previous owner.",
        icon: <Zap className="h-4 w-4 text-amber-500" />
      });
    }

    const newAppraisal: AppraisedVehicle = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
      vin,
      vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      mileage,
      condition,
      acv: suggestedACV,
      status: 'Pending'
    };
    setRecentAppraisals([newAppraisal, ...recentAppraisals]);
    toast.success("Appraisal saved successfully!");
    
    // Reset form
    setVin("");
    setVehicle(null);
    setMileage(0);
    setReconEstimate(800);
  };

  const handleStatusChange = (id: string, newStatus: 'Pending' | 'Won' | 'Lost') => {
    setRecentAppraisals(prev => prev.map(app => 
      app.id === id ? { ...app, status: newStatus } : app
    ));
    toast.success(`Appraisal status updated to ${newStatus}`);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <ScrollReveal>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Appraisals Studio</h1>
            <p className="text-slate-500 mt-2">Data-driven vehicle valuations based on market metrics and turn strategy.</p>
          </ScrollReveal>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 bg-white dark:bg-slate-900 hidden sm:flex" onClick={() => {
            toast.promise(
              new Promise(resolve => setTimeout(resolve, 2000)),
              {
                loading: 'Connecting to Kelly Blue Book API...',
                success: 'Live market data synced successfully.',
                error: 'Failed to sync market data.'
              }
            );
          }}>
            <RefreshCcw className="h-4 w-4" /> Sync Market Data
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary text-white">
                <Camera className="h-4 w-4" /> Mobile Camera
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px] h-[80vh] flex flex-col p-0 overflow-hidden bg-black text-white border-slate-800">
              <DialogHeader className="p-4 bg-slate-900 absolute top-0 w-full z-10 opacity-80">
                <DialogTitle>Vehicle Photos</DialogTitle>
                <DialogDescription className="text-slate-300">Align vehicle within the guides.</DialogDescription>
              </DialogHeader>
              <div className="flex-1 relative flex items-center justify-center">
                {/* Simulated Camera Viewfinder */}
                <div className="absolute inset-0 bg-slate-800">
                  <img src="https://vibe.filesafe.space/1778548756560730619/assets/26fce0ad-28b7-4796-9302-a7c3de2fe843.jpg" className="w-full h-full object-cover opacity-50 blur-sm" alt="Camera Feed" />
                </div>
                
                {/* Guide Overlay */}
                <div className="absolute inset-4 border-2 border-dashed border-white/50 rounded-xl pointer-events-none flex items-center justify-center">
                  <p className="text-white/50 font-bold tracking-widest uppercase rotate-90 sm:rotate-0">Front Angle</p>
                </div>
                
                {/* Controls */}
                <div className="absolute bottom-0 w-full p-6 bg-gradient-to-t from-black to-transparent flex justify-center items-center gap-8">
                  <Button variant="ghost" size="icon" className="rounded-full bg-slate-800/50 text-white hover:bg-slate-800"><RefreshCcw className="h-5 w-5" /></Button>
                  <Button variant="outline" size="icon" className="h-16 w-16 rounded-full border-4 border-white bg-transparent hover:bg-white/20" onClick={() => toast.success("Photo captured!")}></Button>
                  <Button variant="ghost" size="icon" className="rounded-full bg-slate-800/50 text-white hover:bg-slate-800"><CheckCircle2 className="h-5 w-5" /></Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Sparkles className="h-4 w-4" /> AI Damage Scanner
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col p-0 overflow-hidden bg-slate-950 text-white border-slate-800">
              <DialogHeader className="p-4 bg-slate-900 border-b border-slate-800 shrink-0">
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" /> AI Computer Vision Analysis
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Detecting exterior damage, panel gaps, and paint inconsistencies.
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Image View */}
                <div className="flex-1 relative bg-black flex items-center justify-center p-4">
                  <div className="relative w-full max-w-md aspect-video rounded-lg overflow-hidden border border-slate-800">
                    <img 
                      src="https://vibe.filesafe.space/1778548756560730619/assets/26fce0ad-28b7-4796-9302-a7c3de2fe843.jpg" 
                      alt="Vehicle scan" 
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Simulated AI bounding boxes */}
                    <div className="absolute top-[30%] left-[20%] w-16 h-12 border-2 border-destructive bg-destructive/20 rounded shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse">
                      <div className="absolute -top-6 left-0 bg-destructive text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                        Dent (Severe)
                      </div>
                    </div>
                    
                    <div className="absolute top-[60%] right-[15%] w-24 h-10 border-2 border-amber-500 bg-amber-500/20 rounded shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse" style={{ animationDelay: '0.5s' }}>
                      <div className="absolute -top-6 left-0 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                        Scratches
                      </div>
                    </div>

                    {/* Scanning overlay effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/20 to-transparent w-full h-[20%] animate-scan pointer-events-none" />
                  </div>
                </div>

                {/* Analysis Results Sidebar */}
                <div className="w-full md:w-80 bg-slate-900 border-l border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto">
                  <div>
                    <h3 className="font-bold text-sm text-slate-300 uppercase tracking-wider mb-3">Detected Issues</h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <div className="flex items-start justify-between mb-1">
                          <span className="font-semibold text-destructive text-sm flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Deep Dent</span>
                          <span className="text-xs font-mono text-slate-400">98% Match</span>
                        </div>
                        <p className="text-xs text-slate-400">Front left fender. Requires PDR and potential paint blending.</p>
                        <div className="mt-2 text-sm font-bold text-slate-200">Est. Repair: $450</div>
                      </div>

                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <div className="flex items-start justify-between mb-1">
                          <span className="font-semibold text-amber-500 text-sm flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Surface Scratches</span>
                          <span className="text-xs font-mono text-slate-400">92% Match</span>
                        </div>
                        <p className="text-xs text-slate-400">Rear bumper passenger side. Can be buffed out.</p>
                        <div className="mt-2 text-sm font-bold text-slate-200">Est. Repair: $120</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-800">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm text-slate-400">Total Est. Recon</span>
                      <span className="text-xl font-bold text-destructive">$570</span>
                    </div>
                    <Button 
                      className="w-full bg-primary hover:bg-primary/90 text-white font-bold" 
                      onClick={() => {
                        setReconEstimate(570);
                        toast.success("AI Recon Estimate applied to appraisal.");
                      }}
                    >
                      Apply to Appraisal
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input & Strategy */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Car className="h-5 w-5 text-primary" /> Vehicle Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>VIN</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Enter 17-character VIN" 
                    value={vin} 
                    onChange={(e) => setVin(e.target.value.toUpperCase())}
                    maxLength={17}
                  />
                  <Button onClick={decodeVIN} disabled={isDecoding || vin.length !== 17}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {vehicle && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg overflow-hidden relative">
                  <div className="flex gap-4 items-center relative z-10">
                    <div className="w-24 h-16 bg-white dark:bg-slate-900 rounded-md overflow-hidden shadow-sm shrink-0 border border-slate-200 dark:border-slate-800">
                      <img src="https://vibe.filesafe.space/1778548756560730619/assets/26fce0ad-28b7-4796-9302-a7c3de2fe843.jpg" alt="Decoded Vehicle" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-slate-900 dark:text-white">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                      <p className="text-sm text-slate-500">VIN: {vin}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mileage</Label>
                  <Input 
                    type="number" 
                    value={mileage || ''} 
                    onChange={(e) => setMileage(parseInt(e.target.value) || 0)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select value={condition} onValueChange={setCondition}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Estimated Recon Cost</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                  <Input 
                    type="number" 
                    className="pl-7" 
                    value={reconEstimate || ''} 
                    onChange={(e) => setReconEstimate(parseInt(e.target.value) || 0)} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Pricing Strategy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label>Target Margin (Front-End)</Label>
                  <span className="font-bold">{formatCurrency(targetMargin[0])}</span>
                </div>
                <Slider 
                  value={targetMargin} 
                  onValueChange={setTargetMargin} 
                  max={5000} 
                  min={500} 
                  step={100} 
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label>Target Turn (Days)</Label>
                  <span className="font-bold">{targetTurnDays[0]} Days</span>
                </div>
                <Slider 
                  value={targetTurnDays} 
                  onValueChange={setTargetTurnDays} 
                  max={90} 
                  min={15} 
                  step={5} 
                />
                <p className="text-xs text-slate-500">Faster turn targets require more aggressive (lower) retail pricing.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Valuation & Market */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-2 border-primary/20 shadow-lg overflow-hidden">
            <div className="bg-slate-900 dark:bg-slate-950 p-6 text-white text-center">
              <p className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">Suggested ACV (Actual Cash Value)</p>
              <h2 className="text-6xl font-black">{formatCurrency(suggestedACV)}</h2>
              <div className="mt-4 flex justify-center gap-2">
                <Badge variant="outline" className="border-white/20 text-white bg-white/10">
                  Target: {formatCurrency(conditionAdjustedRetail + turnStrategyAdjustment)} Retail
                </Badge>
              </div>
            </div>
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4">Valuation Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>Base Market Retail</span>
                  <span>{formatCurrency(marketRetail)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>Condition Adjustment ({condition})</span>
                  <span className={conditionAdjustedRetail >= marketRetail ? "text-success" : "text-destructive"}>
                    {conditionAdjustedRetail >= marketRetail ? "+" : ""}{formatCurrency(conditionAdjustedRetail - marketRetail)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>Turn Strategy Adjustment</span>
                  <span className={turnStrategyAdjustment < 0 ? "text-destructive" : "text-success"}>
                    {turnStrategyAdjustment < 0 ? "" : "+"}{formatCurrency(turnStrategyAdjustment)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>Estimated Recon</span>
                  <span className="text-destructive">-{formatCurrency(reconEstimate)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>Target Margin</span>
                  <span className="text-destructive">-{formatCurrency(targetMargin[0])}</span>
                </div>
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center font-bold text-lg">
                  <span>Final ACV</span>
                  <span>{formatCurrency(suggestedACV)}</span>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                <Button className="w-full text-lg h-12" size="lg" onClick={handleSaveAppraisal}>Save Appraisal</Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <AlertTriangle className="h-4 w-4" /> Market Supply
                </div>
                <div className="text-3xl font-bold">{marketDaysSupply} <span className="text-sm font-normal text-slate-500">Days</span></div>
                <p className="text-xs text-slate-500 mt-1">Average market days supply for this segment.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <CheckCircle2 className="h-4 w-4" /> Market Demand
                </div>
                <div className="text-3xl font-bold text-success">High</div>
                <p className="text-xs text-slate-500 mt-1">Strong local search volume for this model.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <History className="h-4 w-4" /> Total Appraisals
            </div>
            <div className="text-3xl font-bold">{totalAppraisals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <TrendingUp className="h-4 w-4" /> Win Rate
            </div>
            <div className="text-3xl font-bold text-primary">{winRate}%</div>
            <p className="text-xs text-slate-500 mt-1">Based on closed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <CheckCircle2 className="h-4 w-4" /> Won
            </div>
            <div className="text-3xl font-bold text-success">{wonAppraisals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <AlertTriangle className="h-4 w-4" /> Lost / Pending
            </div>
            <div className="text-3xl font-bold text-destructive">{lostAppraisals} <span className="text-sm font-normal text-slate-500">/ {pendingAppraisals}</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Appraisal Trends Chart */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Appraisal Trends</CardTitle>
          <CardDescription>Volume and outcome of appraisals over time.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full mt-4">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} allowDecimals={false} />
                  <RechartsTooltip 
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--card-foreground))' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="Won" stackId="a" fill="hsl(var(--success))" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="Pending" stackId="a" fill="hsl(var(--primary))" />
                  <Bar dataKey="Lost" stackId="a" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">Not enough data to display trends.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Appraisals Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-primary" /> Recently Appraised Vehicles</CardTitle>
          <CardDescription>History of your recent appraisals and their acquisition status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>VIN</TableHead>
                  <TableHead>Mileage</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead className="text-right">Final ACV</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentAppraisals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24 text-slate-500">
                      No recent appraisals found.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentAppraisals.map((appraisal) => (
                    <TableRow key={appraisal.id}>
                      <TableCell>{appraisal.date}</TableCell>
                      <TableCell className="font-medium">{appraisal.vehicle}</TableCell>
                      <TableCell className="text-slate-500 text-xs">{appraisal.vin}</TableCell>
                      <TableCell>{appraisal.mileage.toLocaleString()} mi</TableCell>
                      <TableCell className="capitalize">{appraisal.condition}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(appraisal.acv)}</TableCell>
                      <TableCell className="text-center">
                        <Select value={appraisal.status} onValueChange={(val: any) => handleStatusChange(appraisal.id, val)}>
                          <SelectTrigger className={`h-8 w-[110px] mx-auto text-xs font-semibold ${
                            appraisal.status === 'Won' ? 'bg-success text-white border-success focus:ring-success' : 
                            appraisal.status === 'Lost' ? 'bg-destructive text-white border-destructive focus:ring-destructive' : 
                            'bg-secondary text-secondary-foreground'
                          }`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Won">Won</SelectItem>
                            <SelectItem value="Lost">Lost</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
