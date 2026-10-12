import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LifeBuoy, AlertTriangle, Clock, ArrowRight, MessageSquareX, Sparkles, CheckCircle2, Trophy, ArrowUp, Activity, FileSearch } from "lucide-react";
import { toast } from "sonner";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import confetti from "canvas-confetti";

const DYING_DEALS = [
  {
    id: "1",
    customer: "Sarah Jenkins",
    vehicle: "2024 Honda CR-V Hybrid",
    stage: "Numbers Presented",
    daysInStage: 4,
    sentiment: "Negative",
    riskFactor: "Price Objection",
    lastMessage: "I saw the same trim at Honda of the Valley for $1,200 less. If you can't match it, I'm going there.",
    value: "$38,500"
  },
  {
    id: "2",
    customer: "Marcus Johnson",
    vehicle: "2023 Ford F-150 Lariat",
    stage: "Finance Review",
    daysInStage: 6,
    sentiment: "Frustrated",
    riskFactor: "Financing Stalled",
    lastMessage: "Why is it taking so long to get an approval? I gave you my pay stubs three days ago.",
    value: "$52,000"
  },
  {
    id: "3",
    customer: "Emily Chen",
    vehicle: "2021 Toyota Camry SE",
    stage: "Vehicle Selected",
    daysInStage: 8,
    sentiment: "Ghosting",
    riskFactor: "Lost Contact",
    lastMessage: "(No response to last 4 messages)",
    value: "$24,900"
  },
  {
    id: "4",
    customer: "David Rodriguez",
    vehicle: "2024 Kia Telluride",
    stage: "Appointment Set",
    daysInStage: 2,
    sentiment: "Negative",
    riskFactor: "Trade-in Value",
    lastMessage: "Your online tool gave me $18k for my trade, but the manager just offered $14k. That feels like a bait and switch.",
    value: "$46,200"
  }
];

const LOST_DEALS = [
  {
    id: "101",
    customer: "James Wilson",
    vehicle: "2024 Ford Bronco",
    lostDate: "2 days ago",
    value: "$58,000",
    autopsy: {
      fatalMoment: "Trade-in Valuation",
      reason: "Customer felt insulted by initial $22k offer on their trade. Competitor offered $25k.",
      aiInsight: "Sales rep pushed too hard on the new car price before validating the customer's attachment to their trade-in.",
      prevention: "Train team on the 'Empathy First' trade walkaround before presenting numbers."
    }
  },
  {
    id: "102",
    customer: "Amanda Clark",
    vehicle: "2023 Tesla Model 3",
    lostDate: "5 days ago",
    value: "$35,000",
    autopsy: {
      fatalMoment: "Response Time",
      reason: "Took 4.5 hours to respond to specific charging question. Customer bought elsewhere.",
      aiInsight: "EV buyers expect tech-speed responses. The 4.5h gap was the exact moment engagement dropped from High to Zero.",
      prevention: "Implement auto-routing for EV-specific questions to the EV specialist team instantly."
    }
  },
  {
    id: "103",
    customer: "Robert Martinez",
    vehicle: "2024 Chevy Silverado",
    lostDate: "1 week ago",
    value: "$62,000",
    autopsy: {
      fatalMoment: "F&I Wait Time",
      reason: "Customer waited 2 hours for finance after agreeing to numbers. Walked out.",
      aiInsight: "Sentiment dropped sharply at the 45-minute mark in the waiting area. Deal was highly probable until then.",
      prevention: "Implement 'Fast-Track' digital signing for Tier 1 credit customers."
    }
  }
];

export default function DealRescue() {
  const [deals, setDeals] = useState(DYING_DEALS);
  const [lostDeals] = useState(LOST_DEALS);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [resolutionAction, setResolutionAction] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [levelUpManager, setLevelUpManager] = useState<string | null>(null);

  const [leaderboard, setLeaderboard] = useState([
    { id: 1, name: "Mike Ross", saved: 12, value: "$450k", winRate: "68%" },
    { id: 2, name: "Sarah Jenkins", saved: 8, value: "$310k", winRate: "54%" },
    { id: 3, name: "David Chen", saved: 5, value: "$185k", winRate: "42%" },
    { id: 4, name: "You", saved: 4, value: "$150k", winRate: "38%" },
    { id: 5, name: "Jessica Park", saved: 3, value: "$120k", winRate: "31%" },
  ]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto pb-mobile-nav">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <LifeBuoy className="h-8 w-8 text-destructive" />
            Deal Rescue
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            AI-detected at-risk deals with negative sentiment or stalled momentum.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-white dark:bg-slate-950">
            Export List
          </Button>
          <Button 
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => toast.success("AI Rescue Campaign initiated for 14 at-risk deals.")}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Auto-Rescue All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-slate-950 border-destructive/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Deals at Risk</p>
                <p className="text-3xl font-bold text-destructive mt-1">14</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-slate-950 border-amber-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Value at Risk</p>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-500 mt-1">$485k</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-500 border-2 px-2 py-1 text-lg">$</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-950 border-success/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Rescued This Month</p>
                <p className="text-3xl font-bold text-success mt-1">8</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <LifeBuoy className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

<Tabs defaultValue="at_risk" className="w-full">
        <TabsList className="mb-6 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-lg">
          <TabsTrigger value="at_risk" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm">At-Risk Deals</TabsTrigger>
          <TabsTrigger value="autopsy" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm">Deal Autopsies (Lost)</TabsTrigger>
        </TabsList>

        <TabsContent value="at_risk" className="m-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle>Needs Immediate Attention</CardTitle>
            <CardDescription>Deals flagged by AI due to negative sentiment or delays.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                  <TableRow>
                    <TableHead className="w-[200px]">Customer & Vehicle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Risk Factor</TableHead>
                    <TableHead className="max-w-[300px]">Last Interaction</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.map((deal) => (
                    <TableRow key={deal.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                      <TableCell>
                        <div className="font-medium text-slate-900 dark:text-white">{deal.customer}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{deal.vehicle}</div>
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">{deal.value}</div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1.5">
                          <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300">
                            {deal.stage}
                          </Badge>
                          <div className="flex items-center text-xs text-amber-600 dark:text-amber-500 font-medium">
                            <Clock className="h-3 w-3 mr-1" />
                            {deal.daysInStage} days stalled
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1.5">
                          <Badge variant="destructive" className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-none">
                            {deal.sentiment}
                          </Badge>
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            {deal.riskFactor}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="flex gap-2 items-start bg-slate-50 dark:bg-slate-900/50 p-2 rounded-md border border-slate-100 dark:border-slate-800">
                          <MessageSquareX className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                          <p className="text-xs text-slate-600 dark:text-slate-400 italic line-clamp-2">
                            "{deal.lastMessage}"
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col gap-2 items-end">
                          <Button 
                            size="sm" 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white w-full max-w-[140px]"
                            onClick={() => toast.success(`AI intervention drafted for ${deal.customer}`)}
                          >
                            <Sparkles className="h-3 w-3 mr-1.5" />
                            AI Intervene
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="w-full max-w-[140px] text-xs h-8"
                            onClick={() => {
                              setSelectedDeal(deal);
                              setShowResolutionModal(true);
                            }}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1.5" />
                            Resolve Friction
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm h-full">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-amber-500" />
              Rescue Leaderboard
            </CardTitle>
            <CardDescription>Top managers saving at-risk deals this month.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {leaderboard.map((manager, idx) => (
                <div key={manager.id} className={`p-4 flex items-center justify-between transition-all duration-500 ${levelUpManager === manager.name ? 'bg-success/10 scale-[1.02] rounded-lg shadow-sm z-10 relative border border-success/30' : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors duration-500 ${levelUpManager === manager.name ? 'bg-success text-white' : idx === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500' : idx === 1 ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' : idx === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-500' : 'bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400'}`}>
                      {levelUpManager === manager.name ? <ArrowUp className="h-4 w-4" /> : `#${idx + 1}`}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-slate-900 dark:text-white">{manager.name}</p>
                        {levelUpManager === manager.name && (
                          <Badge className="bg-success hover:bg-success text-white animate-bounce shadow-sm text-[10px] px-1.5 py-0 h-4">RANK UP! 🚀</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{manager.saved} Deals Rescued</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-sm transition-colors duration-500 ${levelUpManager === manager.name ? 'text-success' : 'text-success'}`}>{manager.value}</p>
                    <p className="text-xs text-slate-500">{manager.winRate} Win Rate</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
</div>
        </TabsContent>

        <TabsContent value="autopsy" className="m-0 space-y-4">
          <div className="flex justify-end mb-2">
            <Button onClick={() => {
              toast.success("Carfax Competitor Scan Complete", {
                description: "AI found 2 lost leads purchased at 'City Chevrolet' and updated their records.",
              });
            }} className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm">
              <FileSearch className="h-4 w-4 mr-2" /> Run Competitor VIN Scan
            </Button>
          </div>
          {lostDeals.map((deal) => (
            <Card key={deal.id} className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <div className="p-6 md:w-1/3 bg-slate-50/50 dark:bg-slate-900/30 border-r border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-none">
                        Lost {deal.lostDate}
                      </Badge>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{deal.value}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{deal.customer}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{deal.vehicle}</p>
                  </div>
                  <Button variant="outline" className="mt-6 w-full text-xs">
                    <FileSearch className="h-3 w-3 mr-2" />
                    View Full Deal Jacket
                  </Button>
                </div>
                
                <div className="p-6 md:w-2/3 space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-1">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        Fatal Moment: <span className="text-destructive">{deal.autopsy.fatalMoment}</span>
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                        {deal.autopsy.reason}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg p-4 border border-indigo-100 dark:border-indigo-900/30">
                      <h5 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5 mb-2">
                        <Sparkles className="h-3.5 w-3.5" /> AI Insight
                      </h5>
                      <p className="text-sm text-indigo-900/80 dark:text-indigo-200/70">
                        {deal.autopsy.aiInsight}
                      </p>
                    </div>
                    
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg p-4 border border-emerald-100 dark:border-emerald-900/30">
                      <h5 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mb-2">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Prevention Plan
                      </h5>
                      <p className="text-sm text-emerald-900/80 dark:text-emerald-200/70">
                        {deal.autopsy.prevention}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          
          <div className="flex justify-center mt-6">
            <Button asChild variant="outline" className="gap-2">
              <Link to="/hr">
                <Activity className="h-4 w-4" />
                View Full Training Dashboard
              </Link>
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showResolutionModal} onOpenChange={setShowResolutionModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Log Friction Resolution</DialogTitle>
            <DialogDescription>
              Record the steps taken to save the deal for {selectedDeal?.customer}. This will be logged for manager training and AI learning.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Resolution Action</Label>
              <Select value={resolutionAction} onValueChange={setResolutionAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Select primary action taken" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discount">Discounted Price</SelectItem>
                  <SelectItem value="trade_bump">Bumped Trade-in Value</SelectItem>
                  <SelectItem value="lender_switch">Switched Lender / Rate</SelectItem>
                  <SelectItem value="manager_tov">Manager TOV (Takeover)</SelectItem>
                  <SelectItem value="throw_in">Added Accessory / Service</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Resolution Notes</Label>
              <Textarea 
                placeholder="e.g., Discounted $500 to match competitor offer..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="resize-none h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolutionModal(false)}>Cancel</Button>
            <Button onClick={() => {
              toast.success("Resolution Logged", {
                description: "The deal rescue has been recorded for training purposes."
              });
              setDeals(deals.filter(d => d.id !== selectedDeal?.id));
              
              const newLeaderboard = [...leaderboard];
              const youIndex = newLeaderboard.findIndex(m => m.name === "You");
              if (youIndex > 0) {
                newLeaderboard[youIndex].saved += 1;
                // Add deal value to You
                const currentVal = parseInt(newLeaderboard[youIndex].value.replace(/\D/g, ''));
                const addedVal = selectedDeal ? parseInt(selectedDeal.value.replace(/\D/g, '')) / 1000 : 38;
                newLeaderboard[youIndex].value = `$${Math.round(currentVal + addedVal)}k`;
                
                const temp = newLeaderboard[youIndex - 1];
                newLeaderboard[youIndex - 1] = newLeaderboard[youIndex];
                newLeaderboard[youIndex] = temp;
                setLeaderboard(newLeaderboard);
                setLevelUpManager("You");
                
                confetti({
                  particleCount: 100,
                  spread: 70,
                  origin: { y: 0.6 }
                });
                
                setTimeout(() => setLevelUpManager(null), 3500);
              }

              setShowResolutionModal(false);
              setResolutionAction("");
              setResolutionNotes("");
            }}>Save Resolution</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
