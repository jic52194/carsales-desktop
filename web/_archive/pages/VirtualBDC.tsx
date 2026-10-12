import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, MessageSquare, Phone, Calendar, Target, Clock, Zap, TrendingUp, Users, ArrowUpRight, ArrowDownRight, Brain, Sparkles, Send, User, Settings, Activity } from "lucide-react";
import { toast } from "sonner";
import { hapticFeedback } from "@/lib/haptics";
import { Progress } from "@/components/ui/progress";

const AI_CONVERSATIONS = [
  { id: "conv1", customer: "Sarah Jenkins", vehicle: "2024 Luxury SUV", status: "Appointment Set", lastMessage: "Yes, 2pm tomorrow works for me!", time: "2m ago", confidence: 98 },
  { id: "conv2", customer: "Mike Ross", vehicle: "2024 Family Sedan", status: "Negotiating", lastMessage: "What's the best price for cash?", time: "15m ago", confidence: 82 },
  { id: "conv3", customer: "David Chen", vehicle: "2022 Electric Hatch", status: "Qualifying", lastMessage: "Does it have the tech package?", time: "45m ago", confidence: 94 },
  { id: "conv4", customer: "Emily Blunt", vehicle: "2020 Rugged Truck", status: "Handed Off", lastMessage: "Connecting you with Mike now.", time: "1h ago", confidence: 100 },
];

const CHAT_HISTORY = [
  { role: "bot", text: "Hi Sarah! I see you're interested in the 2024 Luxury SUV. It's a great choice. Would you like to check its availability?", time: "10:20 AM" },
  { role: "user", text: "Yes, is it still on the lot?", time: "10:21 AM" },
  { role: "bot", text: "Just checked! It is available. We actually have a few people interested today. Would you like to come in for a test drive?", time: "10:21 AM" },
  { role: "user", text: "Maybe this weekend?", time: "10:22 AM" },
  { role: "bot", text: "I have openings this Saturday at 10am and 2pm. Which works better for you?", time: "10:22 AM" },
  { role: "user", text: "Saturday at 2pm works.", time: "10:23 AM" },
  { role: "bot", text: "Perfect! I've scheduled you for Saturday at 2:00 PM. You'll be meeting with Mike Torres. I'll send a confirmation to your phone now.", time: "10:23 AM" },
];

export default function VirtualBDC() {
  const [selectedConv, setSelectedConv] = useState<any>(AI_CONVERSATIONS[0]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // Simulate active AI thinking
    const interval = setInterval(() => {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 3000);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-violet-600 rounded-2xl flex items-center justify-center shadow-xl shadow-violet-600/20">
            <Bot className="h-10 w-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Virtual BDC Command</h1>
            <p className="text-slate-500 font-bold uppercase text-xs tracking-widest flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              AI Agent is Active
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-900 dark:text-indigo-400 dark:bg-indigo-900/30" onClick={() => {
            toast.success("AI Video Avatar Enabled", { description: "The AI will now send personalized video introductions to all new leads." });
          }}>
            <Sparkles className="mr-2 h-4 w-4" /> Enable AI Video Avatar
          </Button>
          <Button variant="outline" className="gap-2">
            <Settings className="h-4 w-4" /> Agent Settings
          </Button>
        </div>
      </div>

      {/* AI Insights Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "AI Handled Conversations", value: "1,248", delta: "+15%", icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Appointments Set by AI", value: "342", delta: "+8%", icon: Calendar, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Avg. Response Time", value: "< 1 min", delta: "-40%", icon: Clock, color: "text-violet-500", bg: "bg-violet-500/10" },
          { label: "Est. Hours Saved", value: "184 hrs", delta: "+22%", icon: Brain, color: "text-amber-500", bg: "bg-amber-500/10" },
        ].map((stat, i) => (
          <Card key={i} className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{stat.value}</p>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-[10px] px-1.5 py-0 border-emerald-200 dark:border-emerald-500/20">
                    {stat.delta}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-violet-100 dark:border-violet-900/50 shadow-md">
            <CardHeader className="bg-violet-50 dark:bg-violet-950/20 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-violet-600" /> Live Conversations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {AI_CONVERSATIONS.map((conv) => (
                  <div 
                    key={conv.id} 
                    className={`p-4 cursor-pointer transition-colors ${selectedConv.id === conv.id ? 'bg-violet-50/50 dark:bg-violet-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                    onClick={() => setSelectedConv(conv)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold">{conv.customer}</span>
                      <span className="text-xs text-slate-500">{conv.time}</span>
                    </div>
                    <p className="text-xs text-violet-600 font-bold mb-2">{conv.vehicle}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{conv.lastMessage}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <Badge variant="outline" className={conv.status === 'Appointment Set' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}>
                        {conv.status}
                      </Badge>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-violet-600">
                        <Sparkles className="h-3 w-3" /> {conv.confidence}% Match
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col border-violet-100 dark:border-violet-900/50 shadow-md overflow-hidden">
            <CardHeader className="bg-white dark:bg-slate-950 border-b border-border py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-slate-500" />
                  </div>
                  <div>
                    <h3 className="font-bold leading-none">{selectedConv.customer}</h3>
                    <p className="text-xs text-slate-500 mt-1">Interested in {selectedConv.vehicle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-8 gap-1 text-xs">
                    <Phone className="h-3 w-3" /> Take Over
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/20">
              {CHAT_HISTORY.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'bot' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.role === 'bot' ? 'bg-white dark:bg-slate-800 border border-border text-slate-700 dark:text-slate-300 rounded-tl-sm shadow-sm' : 'bg-violet-600 text-white rounded-tr-sm shadow-md'}`}>
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    <p className={`text-[10px] mt-1 ${msg.role === 'bot' ? 'text-slate-400' : 'text-violet-200'}`}>{msg.time}</p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="h-1.5 w-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="h-1.5 w-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </CardContent>
            <div className="p-3 bg-white dark:bg-slate-950 border-t border-border">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Bot className="h-4 w-4 text-violet-400" />
                </div>
                <input 
                  type="text" 
                  disabled
                  placeholder="AI Agent is handling this conversation..." 
                  className="w-full h-10 pl-9 pr-4 rounded-full bg-slate-100 dark:bg-slate-800 border-none text-sm cursor-not-allowed"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
