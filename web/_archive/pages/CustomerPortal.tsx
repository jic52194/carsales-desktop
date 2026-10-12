import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Car, Calendar, Wrench, FileText, Download, ShieldCheck, Clock, MapPin, Search, PenTool, CheckCircle2, AlertCircle, FileSignature, UploadCloud, FileCheck, MessageSquare, Send, ScanText, Activity, CreditCard, Video, QrCode, Briefcase, BookOpen, BrainCircuit } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import SignaturePad from "react-signature-canvas";
import { toast } from "sonner";
import { hapticFeedback } from "@/lib/haptics";

const VEHICLES = [
  { id: 1, year: 2024, make: "Toyota", model: "Camry XSE", vin: "4T1B11HK5RU******", mileage: 12450, nextService: "15,000 Miles", warranty: "Active until 2027", image: "🚗" },
];

const SERVICE_HISTORY = [
  { id: 101, date: "Oct 12, 2025", type: "10k Mile Service", cost: "$145.00", dealer: "CarSales Motors Main", status: "Completed" },
  { id: 102, date: "May 05, 2025", type: "Tire Rotation & Balance", cost: "$45.00", dealer: "CarSales Motors Main", status: "Completed" },
  { id: 103, date: "Jan 15, 2025", type: "Pre-Delivery Inspection", cost: "$0.00", dealer: "CarSales Motors Main", status: "Completed" },
];

const DOCUMENTS = [
  { id: "DOC-001", title: "Retail Installment Contract", date: "Oct 15, 2025", status: "Needs Signature", type: "contract" },
  { id: "DOC-002", title: "Odometer Disclosure Statement", date: "Oct 15, 2025", status: "Needs Signature", type: "form" },
  { id: "DOC-003", title: "Vehicle Purchase Agreement", date: "Oct 15, 2025", status: "Completed", type: "contract" },
  { id: "DOC-004", title: "Extended Warranty Agreement", date: "Oct 15, 2025", status: "Completed", type: "warranty" },
];

const STIPULATIONS = [
  { id: "STIP-1", title: "Driver's License", status: "Missing", required: true, description: "Front and back of valid ID" },
  { id: "STIP-2", title: "Proof of Insurance", status: "Missing", required: true, description: "Must show current coverage" },
  { id: "STIP-3", title: "Recent Pay Stub", status: "Uploaded", required: true, description: "Within the last 30 days" },
];

const F_AND_I_PRODUCTS = [
  { id: "FI-1", title: "Vehicle Service Contract", status: "Added", icon: "ShieldCheck", price: "$2,495" },
  { id: "FI-2", title: "GAP Coverage", status: "Added", icon: "AlertCircle", price: "$895" },
  { id: "FI-3", title: "Pre-Paid Maintenance", status: "Pending", icon: "Wrench", price: "$1,295" }
];

const INITIAL_MESSAGES = [
  { id: 1, sender: "manager", text: "Hi Sarah, I'm reviewing your deal now. We just need a copy of your most recent pay stub to finalize the financing.", time: "10:24 AM", name: "Mike Wilson (Finance)" },
  { id: 2, sender: "customer", text: "Sure thing, I'll upload it to the vault right now.", time: "10:30 AM", name: "You" },
];

const RECEIPTS = [
  { id: "REC-8921", title: "Service Repair (RO #4820)", date: "Sep 10, 2025", amount: "$345.50", amountValue: 345.50, dateValue: new Date("Sep 10, 2025").getTime(), method: "Visa •••• 4242" },
  { id: "REC-8755", title: "Vehicle Down Payment", date: "Oct 15, 2025", amount: "$2,500.00", amountValue: 2500.00, dateValue: new Date("Oct 15, 2025").getTime(), method: "Bank Transfer" },
];

export default function CustomerPortal() {
  const [activeTab, setActiveTab] = useState("garage");
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState<any>(null);
  const sigCanvas = useRef<SignaturePad>(null);
  const [documents, setDocuments] = useState(DOCUMENTS);
  const [stipulations, setStipulations] = useState(STIPULATIONS);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [newMessage, setNewMessage] = useState("");
  const [receiptSort, setReceiptSort] = useState("date-desc");

  const sortedReceipts = [...RECEIPTS].sort((a, b) => {
    if (receiptSort === "date-desc") return b.dateValue - a.dateValue;
    if (receiptSort === "date-asc") return a.dateValue - b.dateValue;
    if (receiptSort === "amount-desc") return b.amountValue - a.amountValue;
    if (receiptSort === "amount-asc") return a.amountValue - b.amountValue;
    return 0;
  });

  const handleOpenSign = (doc: any) => {
    setActiveDoc(doc);
    setIsSignModalOpen(true);
    hapticFeedback();
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
    hapticFeedback();
  };

  const saveSignature = () => {
    if (sigCanvas.current?.isEmpty()) {
      toast.error("Please provide a signature before saving.");
      return;
    }
    
    setDocuments(docs => docs.map(d => d.id === activeDoc.id ? { ...d, status: "Completed" } : d));
    setIsSignModalOpen(false);
    toast.success(`${activeDoc?.title} signed successfully!`, {
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    });
    hapticFeedback();
    sigCanvas.current?.clear();
  };

  const handleUploadStip = (id: string) => {
    setStipulations(stips => stips.map(s => s.id === id ? { ...s, status: "Uploaded" } : s));
    toast.success("Document uploaded successfully!", {
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    });
    hapticFeedback();
    
    setTimeout(() => {
      toast.info("AI is scanning document for verification...", {
        icon: <ScanText className="h-4 w-4 text-blue-500" />
      });
      setTimeout(() => {
        toast.success("Document data verified automatically by AI OCR!", {
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        });
      }, 2500);
    }, 1000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setMessages([...messages, { id: Date.now(), sender: "customer", text: newMessage, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), name: "You" }]);
    setNewMessage("");
    hapticFeedback();
  };

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-primary p-6 md:p-10 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 pointer-events-none">
          <Car className="h-48 w-48" />
        </div>
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <svg className="absolute -inset-2 w-20 h-20 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#F59E0B" strokeWidth="4" strokeDasharray="283" strokeDashoffset="56" className="drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                </svg>
                <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 relative z-10">
                  <span className="text-2xl font-black text-white">SJ</span>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-primary z-20 shadow-sm">
                  GOLD
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">Hi, Sarah Jenkins</h1>
                <p className="text-white/80 font-medium">Customer Since 2025 • 2,450 pts to Platinum</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button className="bg-white text-primary hover:bg-slate-100 font-bold">
                <Calendar className="mr-2 h-4 w-4" /> Book Service
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-8 -mt-8 relative z-20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-6">
            <TabsList className="bg-white/90 backdrop-blur-md shadow-sm border border-slate-200 dark:border-slate-700 p-1 rounded-full flex-wrap h-auto">
              <TabsTrigger value="garage" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-white">My Garage</TabsTrigger>
              <TabsTrigger value="service-tracker" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-white">Service Tracker</TabsTrigger>
              <TabsTrigger value="trade-tracker" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-white">Trade-In Appraisal</TabsTrigger>
              <TabsTrigger value="documents" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-white">Documents</TabsTrigger>
              <TabsTrigger value="vault" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-white">Vault</TabsTrigger>
              <TabsTrigger value="virtual-fi" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-white">Virtual F&I</TabsTrigger>
              <TabsTrigger value="digital-glovebox" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-white">Digital Glovebox</TabsTrigger>
              <TabsTrigger value="messages" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-white">Messages</TabsTrigger>
            </TabsList>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <TabsContent value="garage" className="space-y-6 mt-0 border-none p-0 outline-none">
            <Card className="border-none shadow-lg overflow-hidden">
              {/* Feature 7: Virtual Garage (Endowment Effect) */}
              <CardHeader className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Car className="h-5 w-5 text-primary" /> My Virtual Garage
                  </CardTitle>
                  <Button variant="outline" size="sm" className="h-8">Add Vehicle</Button>
                </div>
                <CardDescription>Vehicles you own, and deals you're currently working on.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 opacity-10">
                    <Car className="h-32 w-32 text-primary" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-primary hover:bg-primary">Pending Deal</Badge>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-6 items-start">
                    <div className="h-24 w-32 rounded-lg bg-white dark:bg-slate-800 border-2 border-primary/20 overflow-hidden shrink-0 shadow-sm relative">
                      <img src="https://vibe.filesafe.space/1778548756560730619/assets/8d95f6e9-8c71-44f9-ae90-24f835422693.png" alt="Pending Vehicle" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold">2022 Electric Hatch</h2>
                      <p className="text-sm text-slate-500 font-medium">Reserved for Sarah Jenkins</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" className="bg-primary text-white h-8 text-xs">Resume Deal</Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs">View Sticker</Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100" onClick={() => toast.success("Live video requested! Salesperson notified.")}>
                          <Video className="h-3 w-3 mr-1" /> Request Live Walkaround
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                {VEHICLES.map((v) => (
                  <div key={v.id} className="p-6">
                    <div className="flex flex-col sm:flex-row gap-6 items-start">
                      <div className="h-32 w-32 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-6xl shrink-0 shadow-inner">
                        {v.image}
                      </div>
                      <div className="flex-1 space-y-4 w-full">
                        <div>
                          <div className="flex justify-between items-start">
                            <h2 className="text-2xl font-bold">{v.year} {v.make} {v.model}</h2>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400">
                              <ShieldCheck className="mr-1 h-3 w-3" /> {v.warranty}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-500 font-mono mt-1">VIN: {v.vin}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                            <p className="text-xs text-slate-500 font-medium mb-1">Current Mileage</p>
                            <p className="font-bold text-lg">{v.mileage.toLocaleString()} mi</p>
                          </div>
                          <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
                            <p className="text-xs text-primary font-medium mb-1">Next Service Due</p>
                            <p className="font-bold text-lg text-primary">{v.nextService}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                          <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
                            <div className="flex items-center gap-2 mb-2">
                              <BrainCircuit className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                              <span className="font-bold text-indigo-700 dark:text-indigo-400 text-sm">AI Predictor</span>
                            </div>
                            <p className="text-sm text-indigo-600/80 dark:text-indigo-400/80 mb-3">Brake pads will likely need replacement in <strong>2,400 miles</strong>.</p>
                            <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700 h-8" onClick={() => toast.success("Service scheduled successfully!")}>Pre-book Service</Button>
                          </div>
                          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-2 mb-2">
                              <UploadCloud className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                              <span className="font-bold text-slate-700 dark:text-slate-400 text-sm">OTA Update Available</span>
                            </div>
                            <p className="text-sm text-slate-600/80 dark:text-slate-400/80 mb-3">Version 2025.4.1 includes performance improvements.</p>
                            <Button size="sm" variant="outline" className="h-8 w-full" onClick={() => toast.success("OTA Update initiated. Your vehicle will update overnight.")}>Install Update</Button>
                          </div>
                        </div>
                        <Button className="w-full mt-4 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200" onClick={() => toast.success("Added to Apple Wallet!", { description: "Vehicle info and service dates are now in your digital wallet." })}>
                          Add to Apple Wallet / Google Pay
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Test Drive Tracking Card */}
            <Card className="border-none shadow-lg">
              <CardHeader className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xl flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" /> Live Test Drive Delivery
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Car className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Your Salesperson is on the way!</h3>
                    <p className="text-sm text-slate-500">Michael is driving the 2024 Luxury SUV to your location.</p>
                  </div>
                </div>
                <div className="h-48 w-full bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden relative border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Live Map View</span>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping blur-sm"></div>
                      <Car className="h-8 w-8 text-primary relative z-10" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 right-4 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 font-bold text-sm">
                    4 min away
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary" /> Service History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {SERVICE_HISTORY.map((record) => (
                    <div key={record.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{record.type}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3" /> {record.date} • {record.dealer}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-sm">{record.cost}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            </TabsContent>

            <TabsContent value="trade-tracker" className="space-y-6 mt-0 border-none p-0 outline-none">
              <Card className="border-none shadow-lg mb-6">
                <CardHeader className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" /> Instant Trade-In Valuation
                  </CardTitle>
                  <CardDescription>Get a guaranteed offer in 2 steps. No strings attached.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">License Plate or VIN</label>
                        <div className="flex gap-2">
                          <Input placeholder="Enter License Plate or VIN" className="h-12 text-lg" />
                          <Button className="h-12 px-6 bg-primary" onClick={() => toast.success("Vehicle found! 2019 Honda Accord EX-L")}>Lookup</Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Current Mileage</label>
                        <Input type="number" placeholder="e.g. 45000" className="h-12 text-lg" />
                      </div>
                      <Button className="w-full h-12 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => toast.success("Your guaranteed offer is $18,500!", { description: "Valid for 7 days or 250 miles." })}>
                        Get Instant Offer
                      </Button>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                      <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                        <ShieldCheck className="h-8 w-8" />
                      </div>
                      <h4 className="font-bold text-lg mb-2">Guaranteed Cash Offer</h4>
                      <p className="text-sm text-slate-500">Our AI analyzes local market data to give you the highest possible value for your trade. You can apply this directly to your next vehicle or walk away with a check.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardHeader className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" /> Live Trade-In Appraisal Tracker
                  </CardTitle>
                  <CardDescription>Watch the status of your trade appraisal live while you wait.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
                    <div className="h-20 w-20 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                      <Car className="h-10 w-10 text-amber-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold">2019 Honda Accord EX-L</h3>
                      <p className="text-amber-600 dark:text-amber-400 font-medium">Currently in Service Bay for Inspection</p>
                    </div>
                  </div>

                  <div className="mb-10 hidden md:block">
                    <div className="flex justify-between mb-2 text-sm font-medium px-2">
                      <span className="text-emerald-500 flex flex-col items-center gap-1"><CheckCircle2 className="h-5 w-5" /> Keys Handed Over</span>
                      <span className="text-emerald-500 flex flex-col items-center gap-1"><CheckCircle2 className="h-5 w-5" /> Test Drive</span>
                      <span className="text-primary flex flex-col items-center gap-1"><CheckCircle2 className="h-5 w-5 animate-pulse" /> Shop Inspection</span>
                      <span className="text-muted-foreground flex flex-col items-center gap-1"><Clock className="h-5 w-5" /> Manager Review</span>
                      <span className="text-muted-foreground flex flex-col items-center gap-1"><Clock className="h-5 w-5" /> Offer Ready</span>
                    </div>
                    <Progress value={60} className="h-3 bg-slate-100 dark:bg-slate-800" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="service-tracker" className="space-y-6 mt-0 border-none p-0 outline-none">
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" /> Live Service Tracker
                  </CardTitle>
                  <CardDescription>Real-time updates on your vehicle's repair status.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
                    <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold">2024 Toyota Camry XSE</h3>
                      <p className="text-emerald-600 dark:text-emerald-400 font-medium">RO #4921 • Ready for Pickup</p>
                      
                      <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Wrench className="h-4 w-4 text-blue-600" />
                          <span className="font-bold text-blue-700 dark:text-blue-400 text-sm">Technician Video Update</span>
                        </div>
                        <p className="text-sm text-blue-600/80 dark:text-blue-400/80 mb-3">Your technician recorded a video showing the worn brake pads.</p>
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700 h-8">Watch Video</Button>
                          <Button size="sm" variant="outline" className="border-blue-600/30 text-blue-600 hover:bg-blue-500/10 h-8" onClick={() => toast.success("Repair Approved!")}>Approve Repair</Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-start md:items-end gap-2 w-full md:w-auto bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-sm font-medium text-muted-foreground">Balance Due: <span className="text-xl font-bold text-foreground ml-1">$450.00</span></p>
                      <div className="flex flex-wrap gap-2 w-full justify-end">
                        <Button className="bg-primary text-white flex-1 shadow-lg shadow-primary/30" onClick={() => {
                          toast.success("Payment processed successfully!", {
                            icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          });
                          hapticFeedback();
                        }}>
                          <CreditCard className="mr-2 h-4 w-4" /> 1-Click Pay
                        </Button>
                        <Button variant="outline" className="flex-1 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100" onClick={() => toast.success("Pre-approved for Service Financing via Sunbit!")}>
                          Finance Bill
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => toast.success("Uber ride requested to Dealership. Arriving in 4 mins.")}>
                          <Car className="mr-2 h-4 w-4" /> Request Uber
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => toast.success("Connecting to Live Bay Camera...")}>
                          <Video className="mr-2 h-4 w-4 text-red-500" /> Live Bay Cam
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => toast.success("Express Drop-Off QR Code Generated")}>
                          <QrCode className="mr-2 h-4 w-4" /> Express QR
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mb-10 hidden md:block">
                    <div className="flex justify-between mb-2 text-sm font-medium px-2">
                      <span className="text-emerald-500 flex flex-col items-center gap-1"><CheckCircle2 className="h-5 w-5" /> Intake</span>
                      <span className="text-emerald-500 flex flex-col items-center gap-1"><CheckCircle2 className="h-5 w-5" /> Inspection</span>
                      <span className="text-emerald-500 flex flex-col items-center gap-1"><CheckCircle2 className="h-5 w-5" /> Parts</span>
                      <span className="text-emerald-500 flex flex-col items-center gap-1"><CheckCircle2 className="h-5 w-5" /> Repairing</span>
                      <span className="text-primary flex flex-col items-center gap-1"><CheckCircle2 className="h-5 w-5 animate-pulse" /> Ready</span>
                    </div>
                    <Progress value={100} className="h-3" />
                  </div>

                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted"></div>
                    <div className="space-y-8 relative">
                      {[
                        { title: "Vehicle Intake", time: "08:15 AM", status: "completed", desc: "Vehicle checked in and keys received." },
                        { title: "Multi-Point Inspection", time: "09:30 AM", status: "completed", desc: "Digital inspection completed by technician. Video sent to your phone.", hasTireVisualizer: true },
                        { title: "Waiting on Parts", time: "10:45 AM", status: "completed", desc: "Brake pads ordered from parts department." },
                        { title: "Repairing", time: "11:30 AM", status: "completed", desc: "Technician finished working on your vehicle." },
                        { title: "Ready for Pickup", time: "Current", status: "active", desc: "Vehicle washed and ready for you. Please pay your balance." },
                      ].map((step, idx) => (
                        <div key={idx} className="flex gap-6 items-start relative group">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 z-10 border-4 border-card transition-transform group-hover:scale-110 ${
                            step.status === 'completed' ? 'bg-emerald-500 text-white' :
                            step.status === 'active' ? 'bg-primary text-white animate-pulse shadow-lg shadow-primary/30' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {step.status === 'completed' ? <CheckCircle2 className="h-4 w-4" /> : 
                             step.status === 'active' ? <Wrench className="h-4 w-4" /> :
                             <Clock className="h-4 w-4" />}
                          </div>
                          <div className={`flex-1 rounded-xl p-4 -mt-3 transition-colors ${step.status === 'active' ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/50'}`}>
                            <div className="flex justify-between items-start">
                              <h4 className={`font-bold ${step.status === 'active' ? 'text-primary' : step.status === 'pending' ? 'text-muted-foreground' : ''}`}>{step.title}</h4>
                              <span className="text-xs font-medium text-muted-foreground bg-background px-2 py-1 rounded-full border border-border/50">{step.time}</span>
                            </div>
                            <p className="text-sm mt-1 text-foreground/80">{step.desc}</p>
                            {step.hasTireVisualizer && (
                              <div className="mt-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                                <h5 className="font-semibold text-sm mb-3">Tire Tread Depth Visualizer</h5>
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
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-6 mt-0 border-none p-0 outline-none">
              <Card className="border-indigo-100 dark:border-indigo-900 shadow-lg overflow-hidden">
                <div className="bg-indigo-50 dark:bg-indigo-950/30 p-4 border-b border-indigo-100 dark:border-indigo-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="font-semibold text-indigo-900 dark:text-indigo-300">Secure Document Vault</h3>
                  </div>
                  <Badge variant="outline" className="bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900 dark:text-indigo-300 dark:border-indigo-800">
                    Encrypted
                  </Badge>
                </div>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {documents.map((doc) => (
                      <div key={doc.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${doc.status === 'Completed' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-primary/10 text-primary'}`}>
                            {doc.status === 'Completed' ? <CheckCircle2 className="h-5 w-5" /> : <PenTool className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{doc.title}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              {doc.date} • {doc.id}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {doc.status === 'Completed' ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 hidden sm:inline-flex">Completed</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 hidden sm:inline-flex">Needs Signature</Badge>
                          )}
                          
                          {doc.status === 'Completed' ? (
                            <Button variant="ghost" size="sm" className="h-8 text-slate-500 hover:text-primary">
                              <Download className="h-4 w-4 mr-2" /> Download
                            </Button>
                          ) : (
                            <Button size="sm" className="h-8 bg-primary text-white" onClick={() => handleOpenSign(doc)}>
                              <PenTool className="h-4 w-4 mr-2" /> Sign Now
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardHeader className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" /> Payment History
                      </CardTitle>
                      <CardDescription>View and download your past receipts and invoices.</CardDescription>
                    </div>
                    <Select value={receiptSort} onValueChange={setReceiptSort}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date-desc">Newest First</SelectItem>
                        <SelectItem value="date-asc">Oldest First</SelectItem>
                        <SelectItem value="amount-desc">Amount: High to Low</SelectItem>
                        <SelectItem value="amount-asc">Amount: Low to High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sortedReceipts.map((receipt) => (
                      <div key={receipt.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">{receipt.title}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              {receipt.date} • {receipt.method}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                          <span className="font-bold text-sm bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{receipt.amount}</span>
                          <Button variant="ghost" size="sm" className="h-8 text-slate-500 hover:text-primary">
                            <Download className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Receipt</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="digital-glovebox" className="space-y-6 mt-0 border-none p-0 outline-none">
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-indigo-500" /> Digital Glovebox
                  </CardTitle>
                  <CardDescription>Always have your important vehicle documents on hand.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-center space-y-3 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors">
                      <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold">Digital Registration</h4>
                        <p className="text-xs text-slate-500">Expires 10/2025</p>
                      </div>
                      <Button variant="outline" size="sm" className="w-full">View ID Card</Button>
                    </div>
                    <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-center space-y-3 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors">
                      <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600">
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold">Insurance Card</h4>
                        <p className="text-xs text-slate-500">State Farm - Active</p>
                      </div>
                      <Button variant="outline" size="sm" className="w-full">View Policy</Button>
                    </div>
                    <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-center space-y-3 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors">
                      <div className="h-12 w-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600">
                        <BookOpen className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold">Owner's Manual</h4>
                        <p className="text-xs text-slate-500">Interactive PDF</p>
                      </div>
                      <Button variant="outline" size="sm" className="w-full">Open Manual</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vault" className="space-y-6 mt-0 border-none p-0 outline-none">
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <UploadCloud className="h-5 w-5 text-primary" /> Document Vault
                  </CardTitle>
                  <CardDescription>Securely upload required stipulations for your current deal.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {stipulations.map((stip) => (
                      <div key={stip.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${stip.status === 'Uploaded' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                            {stip.status === 'Uploaded' ? <FileCheck className="h-6 w-6" /> : <UploadCloud className="h-6 w-6" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-base">{stip.title}</p>
                              {stip.required && <Badge variant="secondary" className="text-[10px] uppercase">Required</Badge>}
                            </div>
                            <p className="text-sm text-slate-500 mt-0.5">{stip.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                          {stip.status === 'Uploaded' ? (
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 w-full sm:w-auto justify-center">Verified</Badge>
                              <Button variant="ghost" size="sm" className="hidden sm:flex h-9 text-slate-500 hover:text-primary">
                                <Search className="h-4 w-4 mr-2" /> View
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" className="w-full sm:w-auto h-9 bg-primary text-white" onClick={() => handleUploadStip(stip.id)}>
                              <UploadCloud className="h-4 w-4 mr-2" /> Upload File
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="virtual-fi" className="space-y-6 mt-0 border-none p-0 outline-none">
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Activity className="h-5 w-5 text-indigo-500" /> Virtual F&I Assistant
                  </CardTitle>
                  <CardDescription>Learn about your protection options before visiting the finance office.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-full md:w-1/3 space-y-4">
                      <div className="h-48 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center relative overflow-hidden">
                        <img src="https://vibe.filesafe.space/1778548756560730619/assets/9440550d-431f-431f-852d-ae8b80fd935f.jpg" alt="Virtual Assistant" className="w-full h-full object-cover opacity-80" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4">
                          <p className="text-white font-bold">Jessica (AI Assistant)</p>
                          <p className="text-white/80 text-xs">Finance Specialist</p>
                        </div>
                        <div className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse">
                          LIVE
                        </div>
                      </div>
                      <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => toast.info("Connecting to AI Video Assistant...")}>
                        Start Video Chat
                      </Button>
                    </div>
                    <div className="flex-1 space-y-4 w-full">
                      <h3 className="font-bold text-lg">Recommended Protection</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 relative">
                          <div className="absolute -top-3 -right-3 bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">Highly Recommended</div>
                          <h4 className="font-bold text-indigo-900 dark:text-indigo-400">GAP Coverage</h4>
                          <p className="text-xs text-indigo-700/80 dark:text-indigo-400/80 mt-1 mb-3">Protects you if your vehicle is totaled and you owe more than it's worth.</p>
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-indigo-900 dark:text-indigo-400">+$12/mo</span>
                            <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700">Add to Deal</Button>
                          </div>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                          <h4 className="font-bold">Vehicle Service Contract</h4>
                          <p className="text-xs text-slate-500 mt-1 mb-3">Extends your bumper-to-bumper coverage to 7 years / 100,000 miles.</p>
                          <div className="flex justify-between items-center">
                            <span className="font-bold">+$34/mo</span>
                            <Button size="sm" variant="outline" className="h-7 text-xs">Add to Deal</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="messages" className="space-y-6 mt-0 border-none p-0 outline-none">
              <Card className="border-none shadow-lg h-[600px] flex flex-col overflow-hidden">
                <CardHeader className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" /> Secure Messaging
                  </CardTitle>
                  <CardDescription>Chat directly with your finance manager.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 flex-1 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex flex-col ${msg.sender === 'customer' ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] text-slate-500 mb-1 ml-1">{msg.name} • {msg.time}</span>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.sender === 'customer' ? 'bg-primary text-white rounded-tr-sm' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-tl-sm shadow-sm'}`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 shrink-0">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input 
                        placeholder="Type your message..." 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="rounded-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                      />
                      <Button type="submit" size="icon" className="rounded-full shrink-0 bg-primary text-white">
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="border-none shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 text-white">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-2">Trade-In Value</h3>
                <p className="text-slate-300 text-sm mb-6">Your Camry's estimated value has increased due to high market demand.</p>
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10 text-center mb-6">
                  <p className="text-sm text-slate-300 font-medium mb-1">Estimated Value</p>
                  <p className="text-3xl font-black text-emerald-400">$22,500 - $24,000</p>
                </div>
                <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 font-bold">
                  Get Firm Offer
                </Button>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-base">My Dealership</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">CarSales Motors Main</p>
                    <p className="text-xs text-slate-500 mt-0.5">123 Auto Row Blvd<br/>Springfield, IL 62704</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Service Hours</p>
                    <p className="text-xs text-slate-500 mt-0.5">Mon-Fri: 7am - 6pm<br/>Sat: 8am - 2pm</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-2">Contact Dealership</Button>
              </CardContent>
            </Card>
          </div>

        </div>
        </Tabs>
      </div>

      <Dialog open={isSignModalOpen} onOpenChange={setIsSignModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5 text-primary" />
              Digital Signature
            </DialogTitle>
            <DialogDescription>
              Document: <strong className="text-slate-900 dark:text-white">{activeDoc?.title}</strong>
              <br/>
              Please sign below to authorize this document.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 overflow-hidden relative touch-none">
              <SignaturePad 
                ref={sigCanvas}
                canvasProps={{
                  className: "w-full h-48 sm:h-64 cursor-crosshair"
                }}
                penColor="black"
                backgroundColor="transparent"
              />
              <div className="absolute bottom-2 right-2 flex gap-2 pointer-events-none">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest pointer-events-auto">Sign Here</span>
              </div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg text-sm text-slate-500 flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <p>
                By signing, you agree that this digital signature is the legally binding equivalent to your handwritten signature.
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={clearSignature} className="sm:mr-auto">
              Clear
            </Button>
            <Button variant="outline" onClick={() => setIsSignModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveSignature} className="bg-primary text-white">
              <CheckCircle2 className="h-4 w-4 mr-2" /> Apply Signature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
