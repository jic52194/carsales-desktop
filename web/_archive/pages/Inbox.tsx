import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Inbox as InboxIcon, Mail, MessageSquare, Phone, Search, ArrowLeft, Globe, MessageCircle, Sparkles, Send, ShieldAlert, AlertTriangle, ShieldCheck, UserPlus, Zap, Video } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { hapticFeedback } from "@/lib/haptics";

const MESSAGES = [
  { id: 1, name: "John Doe", msg: "Is the Camry still available?", time: "2m", icon: Globe, channel: "Web Chat", color: "text-blue-500", bg: "bg-blue-500/10", full: "Hey, I saw the 2024 Camry on your website — is it still available? I'd like to come in for a test drive this weekend.", sentiment: "positive" },
  { id: 2, name: "Sarah Jenkins", msg: "Sent you the credit documents", time: "1h", icon: MessageCircle, channel: "WhatsApp", color: "text-emerald-500", bg: "bg-emerald-500/10", full: "Hi, I just emailed over my credit documents and pay stubs. Let me know if you need anything else from me!", sentiment: "neutral" },
  { id: 3, name: "Mike Ross", msg: "Here are the photos", time: "3h", icon: MessageSquare, channel: "SMS", color: "text-purple-500", bg: "bg-purple-500/10", full: "Here are the photos of my trade-in you asked for. Let me know what you think.", sentiment: "positive" },
  { id: 4, name: "Emily Blunt", msg: "Confirming 2pm appointment", time: "5h", icon: Mail, channel: "Email", color: "text-amber-500", bg: "bg-amber-500/10", full: "Just confirming my appointment for tomorrow at 2pm. Looking forward to seeing the SUV!", sentiment: "positive" },
  { id: 5, name: "Angry Customer", msg: "WHERES MY REFUND!?", time: "10m", icon: MessageSquare, channel: "SMS", color: "text-red-500", bg: "bg-red-500/10", full: "I HAVE BEEN WAITING FOR MY REFUND CHECK FOR TWO WEEKS. NO ONE IS CALLING ME BACK. THIS IS RIDICULOUS!", sentiment: "negative" },
];

export default function Inbox() {
  const [selected, setSelected] = useState<number | null>(null);
  const selectedMsg = MESSAGES.find(m => m.id === selected);

  return (
    <div className="p-4 md:p-8 space-y-4 max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col" data-tour-id="tour-inbox">
      <div className="flex items-center justify-between">
        <ScrollReveal>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            Unified Inbox
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs hidden sm:flex">
              <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp Business API Connected
            </Badge>
          </h1>
        </ScrollReveal>
      </div>

      {/* Mobile: Show list OR conversation */}
      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
        
        {/* Sidebar - always visible on desktop, hidden on mobile when message selected */}
        <Card className={`flex flex-col ${selected !== null ? 'hidden md:flex' : 'flex'} w-full md:w-80 shrink-0`}>
          <CardHeader className="p-3 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 h-9 text-sm" placeholder="Search messages..." />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {MESSAGES.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelected(item.id)}
                className={`p-4 border-b cursor-pointer transition-colors hover:bg-muted/50 ${selected === item.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded-md ${item.bg}`}>
                      <item.icon className={`h-3 w-3 ${item.color}`} />
                    </div>
                    <span className="font-bold text-sm">{item.name}</span>
                    {item.sentiment === 'negative' && <Badge variant="destructive" className="h-4 px-1 text-[8px] animate-pulse"><AlertTriangle className="h-2 w-2 mr-0.5" /> Frustrated</Badge>}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{item.time}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{item.msg}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Conversation Panel */}
        <Card className={`flex-1 flex flex-col ${selected === null ? 'hidden md:flex' : 'flex'}`}>
          {selectedMsg ? (
            <>
              <CardHeader className="p-4 border-b">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setSelected(null)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {selectedMsg.name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{selectedMsg.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedMsg.time} ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedMsg.sentiment === 'negative' && (
                    <>
                      <Badge variant="outline" className="hidden sm:inline-flex bg-red-50 text-red-700 border-red-200 animate-pulse">
                        <AlertTriangle className="h-3 w-3 mr-1" /> BDC Director Alerted
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        className="h-8 gap-2 font-bold shadow-lg shadow-destructive/20"
                        onClick={() => {
                          toast.success("Stealth Manager Takeover Initiated!", {
                            description: "You have seamlessly hijacked this conversation. The customer doesn't know.",
                            icon: <ShieldAlert className="h-4 w-4" />
                          });
                          hapticFeedback();
                        }}
                      >
                        <Zap className="h-3.5 w-3.5 fill-current" /> Manager Takeover
                      </Button>
                    </>
                  )}
                  <Button variant="outline" size="sm" className="h-8 hidden sm:flex">
                    <UserPlus className="h-4 w-4 mr-2" /> Assign
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-4 overflow-y-auto">
                <div className="max-w-sm bg-muted rounded-2xl rounded-tl-sm p-3 text-sm">
                  {selectedMsg.full}
                </div>
              </CardContent>
              <div className="p-3 border-t bg-slate-50 dark:bg-slate-900/50">
                <div className="mb-3 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30">
                  <div className="flex items-center gap-2 mb-2 text-indigo-700 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="h-3.5 w-3.5" /> AI Suggestion {selectedMsg.sentiment === 'negative' ? '(Objection Handling)' : ''}
                  </div>
                  {selectedMsg.sentiment === 'negative' ? (
                    <div className="space-y-3">
                      <div className="p-2 bg-white dark:bg-slate-900 rounded border border-indigo-100 dark:border-indigo-900">
                        <p className="text-[10px] font-bold text-indigo-500 uppercase mb-1">Option 1: Empathy & De-escalation</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 italic">"I completely understand your frustration regarding the refund. I'm looking into this right now with our accounting team and will call you back in 10 minutes with an exact update. I'm so sorry for the delay."</p>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] mt-1 text-indigo-600">Use Draft</Button>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-900 rounded border border-indigo-100 dark:border-indigo-900">
                        <p className="text-[10px] font-bold text-indigo-500 uppercase mb-1">Option 2: Direct Action</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 italic">"You are completely right to be upset. Let me get my General Manager involved immediately to expedite this. What is the best number to reach you right now?"</p>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] mt-1 text-indigo-600">Use Draft</Button>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-900 rounded border border-indigo-100 dark:border-indigo-900">
                        <p className="text-[10px] font-bold text-indigo-500 uppercase mb-1">Option 3: Transparency</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 italic">"I apologize for the wait. The check was mailed out yesterday via USPS, but I am verifying the tracking number for you right now so you know exactly when it will arrive."</p>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] mt-1 text-indigo-600">Use Draft</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-slate-700 dark:text-slate-300 italic">
                        "Hi {selectedMsg.name.split(' ')[0]}, yes it is! We just had it detailed. When would you like to come in? I have openings at 2:15 PM and 4:30 PM today."
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" className="h-7 text-xs bg-white dark:bg-slate-950 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                          Use Draft
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs bg-white dark:bg-slate-950 border-slate-200 text-slate-600 hover:bg-slate-50">
                          Generate New
                        </Button>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="outline" className="shrink-0 h-10 w-10 text-muted-foreground" title="Record Video Message" onClick={() => toast.success("Recording 30-second walkaround video...")}>
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline" className="shrink-0 h-10 w-10 text-indigo-500 border-indigo-200 hover:bg-indigo-50" title="AI Auto-Translate" onClick={() => toast.success("AI Language Translation Enabled", { description: "Messages will automatically translate to the customer's native language." })}>
                    <Globe className="h-4 w-4" />
                  </Button>
                  <Input className="h-10 text-sm bg-white dark:bg-slate-950 shadow-sm" placeholder="Type a reply..." />
                  <Button size="icon" className="shrink-0 h-10 w-10"><Send className="h-4 w-4" /></Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-3">
                <InboxIcon className="h-12 w-12 mx-auto opacity-20" />
                <p className="text-sm">Select a conversation to start messaging.</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
