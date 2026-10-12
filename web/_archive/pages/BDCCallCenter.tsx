import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, PhoneCall, PhoneForwarded, PhoneMissed, Users, Calendar, CheckCircle2, Search, Play, PhoneOff, BrainCircuit, Mic, MessageSquareQuote, Zap, Activity } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { hapticFeedback } from "@/lib/haptics";

const CALL_LIST = [
  { id: 1, name: "Michael Scott", phone: "(555) 123-4567", intent: "Interested in 2024 F-150", status: "pending", lastContact: "2 days ago", type: "outbound" },
  { id: 2, name: "Pam Beesly", phone: "(555) 987-6543", intent: "Missed Service Appointment", status: "completed", lastContact: "Today 9:00 AM", type: "outbound" },
  { id: 3, name: "Jim Halpert", phone: "(555) 555-5555", intent: "Internet Lead - Website", status: "pending", lastContact: "Never", type: "inbound" },
];

export default function BDCCallCenter() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCall, setActiveCall] = useState<number | null>(null);

  const handleCall = (id: number) => {
    hapticFeedback();
    setActiveCall(id);
    toast.success("Dialing customer...", {
      icon: <PhoneCall className="h-4 w-4 animate-pulse text-emerald-500" />
    });
  };

  const endCall = () => {
    hapticFeedback();
    setActiveCall(null);
    toast.info("Call ended. Log your notes in the CRM.");
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Phone className="h-7 w-7 text-primary" />
            BDC Call Center
          </h1>
          <p className="text-slate-500 mt-1">Manage outbound campaigns, inbound leads, and call scripts.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search call list..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Play className="mr-2 h-4 w-4" /> Start Auto-Dialer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-primary/20 shadow-sm">
          <CardHeader className="bg-primary/5 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <PhoneForwarded className="h-5 w-5 text-primary" />
              Today's Call Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {CALL_LIST.map((call) => (
                <div key={call.id} className={`p-4 transition-colors flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between ${activeCall === call.id ? 'bg-primary/5' : 'hover:bg-muted/50'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-3 rounded-xl ${activeCall === call.id ? 'bg-emerald-500/20 text-emerald-600 animate-pulse' : call.status === 'completed' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-primary/10 text-primary'}`}>
                      {activeCall === call.id ? <PhoneCall className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">{call.name}</h4>
                      <p className="text-sm text-muted-foreground font-medium">{call.phone}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-semibold text-primary">{call.intent}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                      <Badge variant={call.status === 'completed' ? 'secondary' : 'default'}>
                        {call.status.toUpperCase()}
                      </Badge>
                    </div>
                    {activeCall === call.id ? (
                      <Button variant="destructive" size="sm" onClick={endCall}>
                        <PhoneOff className="h-4 w-4 mr-2" /> End Call
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => handleCall(call.id)} disabled={call.status === 'completed'}>
                        <Phone className="h-4 w-4 mr-2" /> Call Now
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {activeCall !== null ? (
            <Card className="border-primary/50 shadow-md shadow-primary/10 animate-in slide-in-from-right-8 duration-300">
              <CardHeader className="bg-primary/5 pb-4 border-b border-primary/10">
                <CardTitle className="flex items-center gap-2 text-primary text-lg">
                  <BrainCircuit className="h-5 w-5 animate-pulse" />
                  Live AI Call Assistant
                </CardTitle>
                <CardDescription>Real-time sentiment and objection handling</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Customer Sentiment</span>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Hesitant</Badge>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 w-1/2 transition-all duration-500"></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Mic className="h-4 w-4" /> Live Transcription & Coaching
                  </span>
                  <div className="bg-muted/50 p-3 rounded-lg text-sm italic text-muted-foreground border border-border">
                    "I just don't know if I can afford the payments on a new F-150 right now with rates being so high..."
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg flex items-start gap-3">
                    <Activity className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">AI Coach Suggestion</p>
                      <p className="text-sm text-emerald-900 dark:text-emerald-200 mt-1">Customer is showing price sensitivity. Pivot to leasing options or highlight the promotional 1.9% APR to reduce payment anxiety.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" /> Dynamic BDC Script Prompter
                    </span>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="cursor-pointer hover:bg-primary/5 text-[10px]" onClick={() => toast.info("Script updated for Price Objection")}>Price Too High</Badge>
                      <Badge variant="outline" className="cursor-pointer hover:bg-primary/5 text-[10px]" onClick={() => toast.info("Script updated for Spouse Objection")}>Need to Ask Wife</Badge>
                      <Badge variant="outline" className="cursor-pointer hover:bg-primary/5 text-[10px]" onClick={() => toast.info("Script updated for Trade Objection")}>Trade Value Low</Badge>
                    </div>
                  </div>
                  <div className="bg-primary/10 p-4 rounded-lg border border-primary/20 text-sm font-medium text-foreground relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:scale-110 transition-transform">
                      <MessageSquareQuote className="h-12 w-12 text-primary" />
                    </div>
                    "I completely understand your concern about rates. What if I told you we have a special promotional rate of 1.9% on remaining 2023 models? Would you be open to coming in to see what that payment looks like?"
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">BDC Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-black text-foreground">142</div>
                  <p className="text-sm text-emerald-600 font-bold mt-1">Calls Made Today</p>
                </CardContent>
              </Card>
              
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    Intelligent Routing
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">AI is currently routing high-intent leads to top performers.</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Internet Leads</span>
                      <span className="font-medium">Routed to Team A</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Service Follow-ups</span>
                      <span className="font-medium">Routed to Team B</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-900/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center justify-between">
                    AI Voice Receptionist
                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20">Active</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-indigo-900/80 dark:text-indigo-200/80 mb-3">AI is currently handling inbound overflow calls, booking appointments, and routing to sales.</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-indigo-700 dark:text-indigo-300">Calls Handled Today</span>
                      <span className="font-bold text-indigo-900 dark:text-indigo-100">24</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-indigo-700 dark:text-indigo-300">Appts Booked</span>
                      <span className="font-bold text-indigo-900 dark:text-indigo-100">6</span>
                    </div>
                  </div>
                  <Button className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white" size="sm" onClick={() => toast.success("AI Voice Receptionist settings opened.")}>
                    Configure AI Receptionist
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}