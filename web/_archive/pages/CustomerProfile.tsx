import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Mail, MessageSquare, Car, DollarSign, ArrowLeft, Plus, FileText, Sparkles, Send, UserCircle, Calculator, CheckCircle2, Calendar, Activity, Pen, ArrowRight, Globe, BrainCircuit, Wrench, Clock, CreditCard, Filter } from "lucide-react";

// Mock data
const CUSTOMER_DATA = {
  id: "1",
  name: "Sarah Jenkins",
  email: "sarah.j@example.com",
  phone: "(555) 123-4567",
  source: "Autotrader",
  temperature: "Hot",
  budget: "$45,000 - $50,000",
  tradeInStatus: "2018 Honda Civic (Pending Appraisal)",
  creditStatus: "Pre-Approved (720+)",
  appointmentStatus: "Scheduled: Tomorrow 2:00 PM",
  nextFollowUp: "Today, 4:00 PM",
  score: 95,
  assignedTo: "Mike Sales",
  created: "Oct 12, 2023",
  lastActive: "Today, 10:45 AM",
  vehicleOfInterest: {
    year: 2023,
    make: "Ford",
    model: "Bronco",
    price: 45000,
    vin: "1FMEE5DP1NLA12345"
  },
  timelineEvents: [
    { id: 12, type: "upcoming", date: "Tomorrow, 2:00 PM", title: "Test Drive Appointment", desc: "Scheduled to test drive the 2023 Ford Bronco.", icon: Calendar, status: "upcoming", author: "Mike Sales", highlight: true },
    { id: 11, type: "service", date: "Today, 8:15 AM", title: "Service RO #4921 Closed", desc: "Customer paid $450.00 for 30k Mile Maintenance on trade-in vehicle.", icon: Wrench, status: "completed", author: "Service Dept" },
    { id: 10, type: "deal", date: "Yesterday, 4:30 PM", title: "Deal Marked as Funded", desc: "Contract funded by Chase Auto. Deal #D-1023 complete.", icon: DollarSign, status: "completed", author: "Finance Team" },
    { id: 9, type: "note", date: "Yesterday, 2:15 PM", title: "Internal Note", desc: "Customer called to confirm insurance was sent. Verified with Geico.", icon: FileText, status: "completed", author: "Mike Sales" },
    { id: 8, type: "sms", date: "Oct 14, 2023, 11:00 AM", title: "SMS Sent", desc: "Hey Sarah, your Bronco is out of detail and ready for pickup!", icon: MessageSquare, status: "completed", author: "Mike Sales" },
    { id: 7, type: "appointment", date: "Oct 13, 2023, 2:00 PM", title: "Appointment Showed", desc: "Sarah arrived for test drive of 2023 Ford Bronco.", icon: CheckCircle2, status: "completed", author: "Showroom" },
    { id: 6, type: "call", date: "Oct 13, 2023, 10:30 AM", title: "Outbound Call - Answered", desc: "Confirmed 2pm appointment. She is bringing her husband.", icon: Phone, status: "completed", author: "Mike Sales" },
    { id: 5, type: "email", date: "Oct 12, 2023, 4:15 PM", title: "Email Received", desc: "Yes, 2pm tomorrow works for me. See you then.", icon: Mail, status: "completed", author: "Sarah Jenkins" },
    { id: 4, type: "email", date: "Oct 12, 2023, 3:30 PM", title: "Email Sent", desc: "Sent pricing proposal and appointment options.", icon: Mail, status: "completed", author: "Mike Sales" },
    { id: 3, type: "vdp_view", date: "Oct 12, 2023, 10:45 AM", title: "Website Activity", desc: "Viewed 2023 Ford Bronco VDP 4 times.", icon: Globe, status: "completed", author: "System" },
    { id: 2, type: "credit", date: "Oct 12, 2023, 10:35 AM", title: "Credit App Submitted", desc: "Pre-approved via Equifax (Score: 720+).", icon: CreditCard, status: "completed", author: "System" },
    { id: 1, type: "lead", date: "Oct 12, 2023, 10:30 AM", title: "Lead Captured", desc: "Submitted web lead via Autotrader.", icon: Sparkles, status: "completed", author: "System" },
  ]
};

export default function CustomerProfile() {
  const { id } = useParams();
  const customer = CUSTOMER_DATA; // In a real app, fetch based on ID

  const [notes, setNotes] = useState([
    { id: 1, text: "Customer is looking to trade in their 2018 Honda Civic. Needs to be under $500/mo.", date: "Oct 12, 2023, 10:30 AM", author: "Mike Sales" }
  ]);
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailTone, setEmailTone] = useState("professional");
  const [emailDraft, setEmailDraft] = useState("");
  const [filterType, setFilterType] = useState("all");

  const filteredEvents = customer.timelineEvents.filter(event => {
    if (filterType === "all") return true;
    if (filterType === "sales") return ["deal", "upcoming", "appointment", "credit", "lead"].includes(event.type);
    if (filterType === "service") return ["service"].includes(event.type);
    if (filterType === "comms") return ["sms", "call", "email", "vdp_view"].includes(event.type);
    if (filterType === "notes") return ["note"].includes(event.type);
    return true;
  });

  const filteredNotes = notes.filter(() => {
    if (filterType === "all" || filterType === "notes") return true;
    return false;
  });

  const generateAIEmail = (tone: string) => {
    let draft = "";
    if (tone === "professional") {
      draft = `Hi ${customer.name},\n\nI hope this email finds you well. I wanted to follow up regarding your interest in the ${customer.vehicleOfInterest.year} ${customer.vehicleOfInterest.model}. We have some excellent financing options available this month that I believe would suit your budget.\n\nPlease let me know when you might be available for a brief call to discuss this further.\n\nBest regards,\nSales Team`;
    } else if (tone === "friendly") {
      draft = `Hey ${customer.name}!\n\nJust wanted to check in and see how your search for the ${customer.vehicleOfInterest.year} ${customer.vehicleOfInterest.model} is going. We just got a fresh batch of inventory in, and I'd love to show you a few options that match what you're looking for.\n\nWhen are you free to swing by for a test drive?\n\nCheers,\nSales Team`;
    } else if (tone === "urgent") {
      draft = `Hi ${customer.name},\n\nI'm reaching out because the ${customer.vehicleOfInterest.year} ${customer.vehicleOfInterest.model} you were looking at is currently generating a lot of interest. I want to make sure you have the first opportunity to secure it.\n\nIf you're still interested, please let me know as soon as possible so I can hold the keys for you.\n\nBest,\nSales Team`;
    }
    setEmailDraft(draft);
  };

  const handleOpenEmailModal = () => {
    generateAIEmail(emailTone);
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = () => {
    // Add activity to show the email was sent
    customer.timelineEvents.unshift({
      id: Date.now(),
      type: "email",
      date: "Just now",
      title: "Email Sent",
      desc: `Sent AI generated email (${emailTone} tone)`,
      icon: Sparkles,
      status: "completed",
      author: "Current User"
    });
    setIsEmailModalOpen(false);
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const note = {
      id: Date.now(),
      text: newNote,
      date: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
      author: "Current User"
    };
    setNotes([note, ...notes]);
    setNewNote("");
    setIsAddingNote(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6" data-tour="tour-customer-profile" data-tour-id="tour-customer-profile">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/crm"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <ScrollReveal>
            <h1 className="text-2xl font-bold">Customer Profile</h1>
            <p className="text-sm text-slate-500">View and manage customer details</p>
          </ScrollReveal>
        </div>
      </div>

      {/* Header Card */}
      <Card data-tour="tour-customer-profile">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                  {customer.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold flex flex-wrap items-center gap-2">
                  {customer.name}
                  <Badge className="bg-orange-500 hover:bg-orange-600">{customer.temperature}</Badge>
                  <Badge variant="outline" className="text-orange-600 border-orange-500/30 bg-orange-500/5">AI Score: {customer.score}</Badge>
                </h2>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-slate-500 mt-1">
                  <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> {customer.phone}</span>
                  <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> {customer.email}</span>
                  <span className="flex items-center gap-1"><Globe className="h-4 w-4" /> Source: {customer.source}</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full md:w-auto">
              <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto"><Phone className="h-4 w-4 mr-2" /> Call</Button>
              <Button variant="outline" className="w-full sm:w-auto"><MessageSquare className="h-4 w-4 mr-2" /> SMS</Button>
              <Button variant="outline" className="w-full sm:w-auto"><Mail className="h-4 w-4 mr-2" /> Email</Button>
              <Button variant="secondary" className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" /> Log Activity</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned To</span>
                <span className="font-medium">{customer.assignedTo}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-slate-500">Next Follow-Up</span>
                <span className="font-medium text-orange-600 dark:text-orange-400">{customer.nextFollowUp}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-slate-500">Appointment</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">{customer.appointmentStatus}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-slate-500">Created</span>
                <span className="font-medium">{customer.created}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-slate-500">Last Active</span>
                <span className="font-medium">{customer.lastActive}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Vehicle of Interest</CardTitle>
              <Button variant="ghost" size="icon"><Car className="h-4 w-4 text-slate-500" /></Button>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg space-y-2 border border-slate-100 dark:border-slate-800">
                <p className="font-bold text-lg">{customer.vehicleOfInterest.year} {customer.vehicleOfInterest.make} {customer.vehicleOfInterest.model}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Price</span>
                  <span className="font-semibold text-primary">${customer.vehicleOfInterest.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">VIN</span>
                  <span className="font-mono">{customer.vehicleOfInterest.vin}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Budget</span>
                  <span className="font-medium">{customer.budget}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Trade-In</span>
                  <span className="font-medium">{customer.tradeInStatus}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Credit</span>
                  <span className="font-medium">{customer.creditStatus}</span>
                </div>
                <Button className="w-full mt-2" variant="outline" size="sm" asChild>
                   <Link to={`/?customerName=${encodeURIComponent(customer.name)}&vehicle=${encodeURIComponent(`${customer.vehicleOfInterest.year} ${customer.vehicleOfInterest.make} ${customer.vehicleOfInterest.model}`)}`}>Start Deal</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Activity & Deals */}
        <div className="lg:col-span-2">
          <Card className="mb-6 border-indigo-500/20 shadow-md shadow-indigo-500/5 bg-gradient-to-br from-indigo-50 dark:from-indigo-950/30 to-background">
            <CardContent className="p-5 flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="h-10 w-10 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                <BrainCircuit className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-1 flex items-center gap-2">
                  AI Suggested Next Action
                  <Badge variant="outline" className="text-[9px] uppercase tracking-widest bg-white dark:bg-slate-950 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">High Confidence</Badge>
                </h3>
                <p className="text-sm text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed">
                  Sarah viewed the Bronco VDP 4 times today. She has an appointment scheduled for tomorrow. Send a quick SMS to confirm the appointment and mention we just washed the Bronco for her test drive.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full md:w-auto">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white w-full md:w-auto">
                  <Send className="h-3 w-3 mr-2" /> Send AI Draft
                </Button>
                <Button size="sm" variant="outline" className="border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-white/50 dark:bg-slate-950/50 hover:bg-white dark:hover:bg-slate-900 w-full md:w-auto">
                  <Pen className="h-3 w-3 mr-2" /> Edit Draft
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="bg-slate-100/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" /> Unified Timeline
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="h-8 w-[140px] text-xs bg-white dark:bg-slate-950">
                      <Filter className="h-3 w-3 mr-2 text-slate-500" />
                      <SelectValue placeholder="Filter..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Events</SelectItem>
                      <SelectItem value="sales">Sales & Deals</SelectItem>
                      <SelectItem value="service">Service History</SelectItem>
                      <SelectItem value="comms">Communications</SelectItem>
                      <SelectItem value="notes">Internal Notes</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="h-8 text-xs bg-white dark:bg-slate-950" onClick={() => setIsAddingNote(!isAddingNote)}>
                    <Plus className="h-3 w-3 mr-1" /> Add Note
                  </Button>
                </div>
              </div>
              {isAddingNote && (
                <div className="mt-4 space-y-3 bg-white dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                  <Textarea 
                    placeholder="Type your note here..." 
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[80px] bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setIsAddingNote(false); setNewNote(""); }}>Cancel</Button>
                    <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim()}>
                      <Send className="h-4 w-4 mr-2" /> Save Note
                    </Button>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative space-y-0 before:absolute before:inset-0 before:left-[70px] sm:before:left-[86px] before:h-full before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {/* Dynamically added notes */}
                {filteredNotes.map(note => (
                  <div key={note.id} className="relative pl-24 sm:pl-32 pb-8 last:pb-0 group">
                    <div className="absolute left-0 top-1 w-16 sm:w-20 text-right pr-4 text-xs font-medium text-slate-500 mt-2">
                      {note.date.split(',')[0]}
                      <div className="text-[10px] text-slate-400">{note.date.split(',')[1]?.trim() || ''}</div>
                    </div>
                    <div className="absolute left-[58px] sm:left-[74px] top-1.5 w-6 h-6 rounded-full border-4 border-white dark:border-slate-950 flex items-center justify-center z-10 transition-transform group-hover:scale-110 bg-amber-500 text-white">
                      <FileText className="h-3 w-3" />
                    </div>
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">Internal Note</h4>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{note.text}</p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <UserCircle className="h-3 w-3" /> {note.author}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Timeline Events */}
                {filteredEvents.map((event, idx) => (
                  <div key={event.id} className="relative pl-24 sm:pl-32 pb-8 last:pb-0 group">
                    <div className="absolute left-0 top-1 w-16 sm:w-20 text-right pr-4 text-xs font-medium text-slate-500 mt-2">
                      {event.date.split(',')[0]}
                      <div className="text-[10px] text-slate-400">{event.date.split(',')[1]?.trim() || ''}</div>
                    </div>
                    <div className={`absolute left-[58px] sm:left-[74px] top-1.5 w-6 h-6 rounded-full border-4 border-white dark:border-slate-950 flex items-center justify-center z-10 transition-transform group-hover:scale-110
                      ${event.status === 'upcoming' ? 'bg-primary text-white ring-4 ring-primary/20 animate-pulse' : 
                        event.type === 'service' ? 'bg-orange-500 text-white' :
                        event.type === 'deal' ? 'bg-emerald-500 text-white' :
                        event.type === 'sms' || event.type === 'email' || event.type === 'call' ? 'bg-blue-500 text-white' :
                        event.type === 'note' ? 'bg-amber-500 text-white' :
                        'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                      <event.icon className="h-3 w-3" />
                    </div>
                    <div className={`p-4 rounded-xl border transition-all ${event.highlight ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700'}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className={`font-bold text-sm flex items-center gap-2 ${event.status === 'upcoming' ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>
                          {event.title}
                          {event.highlight && <Badge className="text-[9px] h-4 px-1.5 bg-primary/20 text-primary hover:bg-primary/30 border-none">UPCOMING</Badge>}
                        </h4>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{event.desc}</p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <UserCircle className="h-3 w-3" /> {event.author}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
