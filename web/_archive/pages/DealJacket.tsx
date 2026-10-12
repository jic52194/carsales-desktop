import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  FileText, 
  ShieldCheck, 
  Signature, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  DollarSign, 
  User, 
  Car, 
  FileSignature, 
  History,
  Lock,
  ChevronRight,
  Download,
  Share2,
  Check,
  X,
  CreditCard,
  Banknote,
  FileCheck2,
  Plus,
  TrendingUp,
  Sparkles,
  ShieldAlert,
  MessageSquare,
  Send,
  ScanText,
  Activity,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { hapticFeedback } from "@/lib/haptics";

const MOCK_DOCUMENTS = [
  { id: "doc1", name: "Buyer's Guide", status: "Signed", type: "Required", date: "2024-05-12" },
  { id: "doc2", name: "Credit Application", status: "Signed", type: "Required", date: "2024-05-12" },
  { id: "doc3", name: "Odometer Disclosure", status: "Pending", type: "Required", date: null },
  { id: "doc4", name: "Retail Installment Contract", status: "Review", type: "Required", date: null },
  { id: "doc5", name: "Gap Insurance Waiver", status: "Pending", type: "Optional", date: null },
  { id: "doc6", name: "Service Contract", status: "Pending", type: "Optional", date: null },
];

const MOCK_COMPLIANCE = [
  { id: "c1", check: "OFAC / Red Flags", status: "Passed", details: "No matches found in database" },
  { id: "c2", check: "Identity Verification", status: "Passed", details: "ID scanned and verified" },
  { id: "c3", check: "Income Verification", status: "Warning", details: "Pay stub date > 30 days" },
  { id: "c4", check: "Insurance Verification", status: "Pending", details: "Waiting on binder" },
];

const CUSTOMER_STIPULATIONS = [
  { id: "STIP-1", title: "Driver's License", status: "Missing", required: true, description: "Front and back of valid ID" },
  { id: "STIP-2", title: "Proof of Insurance", status: "Missing", required: true, description: "Must show current coverage" },
  { id: "STIP-3", title: "Recent Pay Stub", status: "Uploaded", required: true, description: "Within the last 30 days" },
];

const FI_PACKAGES = [
  { 
    name: "Platinum Protection", 
    price: 3495, 
    monthly: 58,
    features: ["Vehicle Service Contract (7yr/100k)", "Gap Insurance", "Tire & Wheel Protection", "Key Replacement"],
    color: "bg-blue-600"
  },
  { 
    name: "Gold Security", 
    price: 2495, 
    monthly: 42,
    features: ["Vehicle Service Contract (5yr/60k)", "Gap Insurance", "Tire & Wheel Protection"],
    color: "bg-amber-500"
  },
  { 
    name: "Silver Essential", 
    price: 1295, 
    monthly: 22,
    features: ["Gap Insurance", "Tire & Wheel Protection"],
    color: "bg-slate-400"
  }
];

const INITIAL_MESSAGES = [
  { id: 1, sender: "manager", text: "Hi Sarah, I'm reviewing your deal now. We just need a copy of your most recent pay stub to finalize the financing.", time: "10:24 AM", name: "You" },
  { id: 2, sender: "customer", text: "Sure thing, I'll upload it to the vault right now.", time: "10:30 AM", name: "Sarah Jenkins" },
];

export default function DealJacket() {
  const [activeTab, setActiveTab] = useState("documents");
  const [signingDoc, setSigningDoc] = useState<string | null>(null);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [newMessage, setNewMessage] = useState("");
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);

  const handleSign = (id: string) => {
    hapticFeedback();
    setSigningDoc(id);
    toast.info("Opening digital signature interface...");
    setTimeout(() => {
      setSigningDoc(null);
      toast.success("Document signed successfully!");
    }, 2000);
  };

  const handleComplianceCheck = () => {
    hapticFeedback();
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: "Running compliance checks...",
        success: "Compliance audit complete!",
        error: "Audit failed",
      }
    );
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setMessages([...messages, { id: Date.now(), sender: "manager", text: newMessage, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), name: "You" }]);
    setNewMessage("");
    hapticFeedback();
  };

  const handleExtractData = (id: string) => {
    hapticFeedback();
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: "Extracting data via AI OCR...",
        success: "Data extracted successfully!",
        error: "Failed to extract data",
      }
    );
    
    setTimeout(() => {
      setOcrResult({
        docType: id === "STIP-3" ? "Pay Stub" : "Driver's License",
        confidence: "98.5%",
        fraudScore: id === "STIP-3" ? "High Risk" : "Passed",
        fraudDetails: id === "STIP-3" ? ["Inconsistent font rendering detected", "PDF metadata indicates recent Photoshop edit", "Calculated YTD does not match gross pay"] : ["Hologram verified via micro-texture analysis", "Font kerning matches state DMV standard"],
        fields: id === "STIP-3" ? [
          { label: "Employer", value: "Acme Corp", match: true },
          { label: "Employee Name", value: "Sarah Jenkins", match: true },
          { label: "Pay Period", value: "10/01/2025 - 10/15/2025", match: true },
          { label: "Gross Pay", value: "$3,250.00", match: true },
          { label: "YTD Earnings", value: "$65,000.00", match: true }
        ] : [
          { label: "Full Name", value: "Sarah Jenkins", match: true },
          { label: "Address", value: "123 Main St, Springfield IL", match: true },
          { label: "DOB", value: "05/12/1985", match: true },
          { label: "License No", value: "D12345678", match: false },
        ]
      });
      setOcrModalOpen(true);
    }, 2000);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8 animate-in fade-in duration-500" data-tour-id="tour-finance">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <FileSignature className="h-7 w-7" />
          </div>
          <div>
            <ScrollReveal>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Deal Jacket</h1>
              <p className="text-slate-500 mt-1 flex items-center gap-2">
                Deal #4592 <ChevronRight className="h-3 w-3" /> John Doe <ChevronRight className="h-3 w-3" /> 2021 Honda Civic
              </p>
            </ScrollReveal>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none gap-2 bg-white dark:bg-slate-950" onClick={() => {
            toast.promise(
              new Promise((resolve) => setTimeout(resolve, 2000)),
              {
                loading: "AI is generating a customized proposal...",
                success: "Proposal generated and saved to documents!",
                error: "Failed to generate proposal",
              }
            );
          }}>
            <Sparkles className="h-4 w-4 text-primary" /> AI Proposal
          </Button>
          <Button variant="outline" className="flex-1 md:flex-none gap-2 bg-white dark:bg-slate-950 hidden sm:flex">
            <Share2 className="h-4 w-4" /> Share
          </Button>
          <Button className="flex-1 md:flex-none gap-2 bg-primary text-white" onClick={handleComplianceCheck}>
            <ShieldCheck className="h-4 w-4" /> Audit Deal
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Summary Stats */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 p-3 rounded-lg flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-800 dark:text-red-300">Credit Freeze Detected</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Experian reports a security freeze. Customer must lift freeze before pulling credit.</p>
            </div>
          </div>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">Deal Readiness Score</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">85%</span>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Ready for Finance</Badge>
              </div>
              <Progress value={85} className="h-2 bg-slate-100 dark:bg-slate-800" />
              <div className="pt-2 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Credit App Submitted
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Trade Appraised
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Down Payment Collected
                </div>
                <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  <AlertCircle className="h-3 w-3" /> Missing Proof of Insurance
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">Finance Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Finance Manager</span>
                <span className="font-medium">Jessica Park</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Credit Status</span>
                <span className="font-medium text-emerald-600">Approved (Tier 1)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Protection Interest</span>
                <span className="font-medium">VSC, GAP</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                Stipulation Tracker
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100" onClick={() => {
                    toast.success("Auto-Stipulation Bot Activated", { description: "AI SMS sent to customer requesting Driver's License and Insurance. They can snap photos to auto-upload to the Deal Jacket."});
                    hapticFeedback();
                  }}>
                    <Sparkles className="h-3 w-3 mr-1" /> AI Auto-Collect
                  </Button>
                  <span className="text-xs font-bold text-emerald-600">1 of 3</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={33} className="h-2 bg-slate-100 dark:bg-slate-800" />
              <div className="space-y-2">
                {CUSTOMER_STIPULATIONS.map(stip => (
                  <div key={stip.id} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      {stip.status === 'Uploaded' ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <AlertCircle className="h-3 w-3 text-amber-500" />}
                      {stip.title}
                    </span>
                    <span className={stip.status === 'Uploaded' ? 'text-emerald-600 font-medium' : 'text-amber-600'}>
                      {stip.status}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Customer Vibe Check
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Sentiment</span>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                  Excited <TrendingUp className="h-3 w-3" />
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-900 dark:text-slate-200">Sales Notes:</span> Customer is thrilled about the new Civic. Very receptive to maintenance packages but price-sensitive on GAP. Highlighted long commute.
                </p>
              </div>
              <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/30">
                <p className="text-xs font-medium text-indigo-700 dark:text-indigo-400">
                  AI Tip: Pitch Platinum Protection for commute peace of mind.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Selling Price</span>
                  <span className="font-bold">$24,500</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">F&I Products</span>
                  <span className="font-bold text-emerald-600">+$2,495</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Taxes & Fees</span>
                  <span className="font-bold">+$1,850</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Down Payment</span>
                  <span className="font-bold text-red-500">-$3,000</span>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                  <span className="font-bold">Amount Financed</span>
                  <span className="font-bold text-lg">$25,845</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-[10px] uppercase font-bold text-primary mb-1">Estimated Monthly</p>
                <p className="text-xl font-bold text-primary">$458.20 /mo</p>
                <p className="text-[10px] text-slate-500">72 months @ 5.9% APR</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center/Right Column: Main Interface */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="documents" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="bg-slate-100 dark:bg-slate-800/50 p-1 w-full lg:w-auto flex flex-wrap h-auto">
              <TabsTrigger value="documents" className="flex-1 lg:flex-none gap-2">
                <FileText className="h-4 w-4" /> Documents
              </TabsTrigger>
              <TabsTrigger value="delivery" className="flex-1 lg:flex-none gap-2">
                <Car className="h-4 w-4" /> Delivery
              </TabsTrigger>
              <TabsTrigger value="menu" className="flex-1 lg:flex-none gap-2">
                <DollarSign className="h-4 w-4" /> F&I Menu
              </TabsTrigger>
              <TabsTrigger value="compliance" className="flex-1 lg:flex-none gap-2">
                <ShieldCheck className="h-4 w-4" /> Compliance
              </TabsTrigger>
              <TabsTrigger value="stipulations" className="flex-1 lg:flex-none gap-2">
                <FileCheck2 className="h-4 w-4" /> Stipulations
              </TabsTrigger>
              <TabsTrigger value="messages" className="flex-1 lg:flex-none gap-2">
                <MessageSquare className="h-4 w-4" /> Messages
              </TabsTrigger>
              <TabsTrigger value="friction" className="flex-1 lg:flex-none gap-2">
                <Activity className="h-4 w-4" /> Deal Friction
              </TabsTrigger>
              <TabsTrigger value="rehash" className="flex-1 lg:flex-none gap-2 text-amber-600 data-[state=active]:text-amber-700 dark:text-amber-500 dark:data-[state=active]:text-amber-400">
                <RefreshCw className="h-4 w-4" /> Deal Re-Hash
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1 lg:flex-none gap-2">
                <History className="h-4 w-4" /> Audit Log
              </TabsTrigger>
            </TabsList>

            <TabsContent value="documents" className="mt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MOCK_DOCUMENTS.map((doc) => (
                  <Card key={doc.id} className="border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          doc.status === 'Signed' ? 'bg-emerald-500/10 text-emerald-600' : 
                          doc.status === 'Review' ? 'bg-amber-500/10 text-amber-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}>
                          {doc.status === 'Signed' ? <FileCheck2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{doc.name}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] h-4 py-0 px-1.5 font-normal">
                              {doc.type}
                            </Badge>
                            {doc.date && <span className="text-[10px] text-slate-400">{doc.date}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.status === 'Signed' ? (
                          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1">
                            <Check className="h-3 w-3" /> Signed
                          </Badge>
                        ) : (
                          <Button 
                            size="sm" 
                            variant={doc.status === 'Review' ? 'secondary' : 'outline'}
                            className="h-8 gap-2"
                            onClick={() => handleSign(doc.id)}
                            disabled={signingDoc === doc.id}
                          >
                            {signingDoc === doc.id ? <Clock className="h-3 w-3 animate-spin" /> : <Signature className="h-3 w-3" />}
                            {doc.status === 'Review' ? 'Review' : 'Sign'}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card className="border-2 border-dashed border-slate-200 dark:border-slate-800 bg-transparent">
                <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                  <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                    <Plus className="h-6 w-6 text-slate-400" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Add External Document</h4>
                  <p className="text-sm text-slate-500 max-w-xs mt-1">Upload trade-in titles, insurance binders, or third-party contracts.</p>
                  <Button variant="outline" className="mt-4 gap-2 bg-white dark:bg-slate-950">
                    <Download className="h-4 w-4" /> Upload PDF / Image
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="delivery" className="mt-6 space-y-6">
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-lg">Post-Sale Delivery Checklist</CardTitle>
                  <CardDescription>Guided mobile UI to ensure a perfect vehicle handover.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      "Connected customer's phone to Bluetooth/CarPlay",
                      "Explained basic vehicle functions and safety features",
                      "Reviewed maintenance schedule and warranty details",
                      "Introduced customer to the Service Department",
                      "Handed over both sets of keys",
                      "Took delivery photo for social media"
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                        <input type="checkbox" className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary" onChange={(e) => {
                          if (e.target.checked) toast.success("Step completed!");
                        }} />
                        <span className="font-medium text-slate-700 dark:text-slate-300">{item}</span>
                      </div>
                    ))}
                    <Button className="w-full mt-4" onClick={() => toast.success("Delivery process completed successfully!")}>Complete Delivery</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="menu" className="mt-6 space-y-6">
              <Card className="border-slate-200 dark:border-slate-800 mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Menu Presentation Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex-1 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                      <p className="text-xs text-slate-500">Platinum Protection</p>
                      <p className="font-bold text-lg">1m 45s</p>
                      <p className="text-[10px] text-emerald-600">Optimum time</p>
                    </div>
                    <div className="flex-1 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                      <p className="text-xs text-slate-500">Gold Security</p>
                      <p className="font-bold text-lg">42s</p>
                      <p className="text-[10px] text-amber-600">Rushed presentation</p>
                    </div>
                    <div className="flex-1 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                      <p className="text-xs text-slate-500">Silver Essential</p>
                      <p className="font-bold text-lg">2m 10s</p>
                      <p className="text-[10px] text-blue-600">Detailed discussion</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {FI_PACKAGES.map((pkg) => (
                  <Card key={pkg.name} className="overflow-hidden border-slate-200 dark:border-slate-800 flex flex-col hover:shadow-lg transition-shadow">
                    <div className={`h-2 ${pkg.color}`} />
                    <CardHeader className="pb-4">
                      <CardTitle className="text-xl font-bold">{pkg.name}</CardTitle>
                      <div className="mt-2">
                        <span className="text-3xl font-bold text-slate-900 dark:text-white">${pkg.price}</span>
                        <span className="text-slate-500 text-sm ml-1">Total</span>
                      </div>
                      <p className="text-sm font-medium text-primary mt-1">+${pkg.monthly}/mo included</p>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-4">
                      <ul className="space-y-2">
                        {pkg.features.map((feature) => (
                          <li key={feature} className="text-sm flex items-start gap-2 text-slate-600 dark:text-slate-400">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                      <Button className="w-full gap-2">Select Package</Button>
                    </div>
                  </Card>
                ))}
              </div>
              <Card className="border-slate-200 dark:border-slate-800 bg-primary/5">
                <CardContent className="p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">PVR Optimization Engine</h4>
                      <p className="text-sm text-slate-500">Based on customer profile, we recommend highlighting Gap Insurance and Maintenance.</p>
                    </div>
                  </div>
                  <Button variant="outline" className="bg-white dark:bg-slate-950 gap-2">
                    <History className="h-4 w-4" /> View Analytics
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="compliance" className="mt-6 space-y-6">
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" /> Compliance Audit Dashboard
                  </CardTitle>
                  <CardDescription>Automated Red Flags, OFAC, and regulatory checks.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {MOCK_COMPLIANCE.map((item) => (
                      <div key={item.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            item.status === 'Passed' ? 'bg-emerald-500/10 text-emerald-600' : 
                            item.status === 'Warning' ? 'bg-amber-500/10 text-amber-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          }`}>
                            {item.status === 'Passed' ? <CheckCircle2 className="h-4 w-4" /> : 
                             item.status === 'Warning' ? <AlertCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-900 dark:text-white">{item.check}</p>
                            <p className="text-xs text-slate-500">{item.details}</p>
                          </div>
                        </div>
                        <Badge variant={item.status === 'Passed' ? 'secondary' : item.status === 'Warning' ? 'destructive' : 'outline'} className={
                          item.status === 'Passed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''
                        }>
                          {item.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold">Lender Stipulations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900">
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                        <AlertCircle className="h-3 w-3" /> Proof of Income Required
                      </p>
                      <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-1">Lender: Chase Auto - Requested on 2024-05-11</p>
                      <Button size="sm" className="mt-3 w-full h-8 bg-amber-500 hover:bg-amber-600 text-white">Upload POI</Button>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold">Identity Verification</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-24 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400">
                        <User className="h-8 w-8" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Driver's License Verified</p>
                        <p className="text-xs text-slate-500">Exp: 2028-10-15</p>
                        <p className="text-xs text-emerald-600 font-medium mt-1">Facial Match: 98%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="stipulations" className="mt-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Customer Stipulations Vault</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" onClick={() => {
                    toast.success("Magic Link sent via SMS to customer's phone!", {
                      description: "They can securely upload documents from their mobile device."
                    });
                    hapticFeedback();
                  }}>
                    <MessageSquare className="h-4 w-4" /> Send Magic Link
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" /> Request New Stip
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {CUSTOMER_STIPULATIONS.map((stip) => (
                  <Card key={stip.id} className="border-slate-200 dark:border-slate-800">
                    <CardContent className="p-4 flex flex-col justify-between h-full space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${stip.status === 'Uploaded' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                            {stip.status === 'Uploaded' ? <FileCheck2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white leading-tight">{stip.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {stip.required && <Badge variant="secondary" className="text-[10px] h-4 py-0 px-1.5 font-normal uppercase">Required</Badge>}
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500">{stip.description}</p>
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <Badge variant={stip.status === 'Uploaded' ? 'outline' : 'secondary'} className={stip.status === 'Uploaded' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700'}>
                          {stip.status}
                        </Badge>
                        {stip.status === 'Uploaded' ? (
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="h-8 px-2 text-primary gap-1 bg-primary/5 hover:bg-primary/10" onClick={() => handleExtractData(stip.id)}>
                              <ScanText className="h-3 w-3" /> AI Document Verification
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-500"><Download className="h-4 w-4" /></Button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" className="h-8">Remind</Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="messages" className="mt-6">
              <Card className="border-slate-200 dark:border-slate-800 h-[600px] flex flex-col overflow-hidden">
                <CardHeader className="pb-4 shrink-0 border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" /> Secure Customer Chat
                  </CardTitle>
                  <CardDescription>Communicate directly with the customer regarding stipulations and financing.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 flex-1 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex flex-col ${msg.sender === 'manager' ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] text-slate-500 mb-1 ml-1">{msg.name} • {msg.time}</span>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.sender === 'manager' ? 'bg-primary text-white rounded-tr-sm' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-tl-sm shadow-sm'}`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 shrink-0">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input 
                        placeholder="Message Sarah Jenkins..." 
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

            <TabsContent value="friction" className="mt-6">
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-amber-500" /> Deal Friction Timeline
                  </CardTitle>
                  <CardDescription>AI analysis of customer hesitation points and objections during the sales process.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {[
                      { point: "Initial Price Presentation", detail: "Customer hesitated for 4 minutes before responding to first pencil. Mentioned 'need to think about it' in text message.", time: "Oct 12, 2:15 PM", icon: DollarSign, color: "text-amber-500", severity: "Medium" },
                      { point: "Trade-in Valuation", detail: "Expressed disappointment with $12,500 offer. Claimed KBB was $14,000. Required manager intervention (+$500).", time: "Oct 12, 3:30 PM", icon: Car, color: "text-red-500", severity: "High" },
                      { point: "F&I Menu Introduction", detail: "Paused on the Platinum Protection package. Asked 3 questions about GAP coverage specifically.", time: "Oct 13, 10:15 AM", icon: ShieldCheck, color: "text-blue-500", severity: "Low" },
                      { point: "Down Payment Request", detail: "Reluctant to put $3,000 down. Initially offered $1,500. Agreed to $3k after payment discussion.", time: "Oct 13, 10:45 AM", icon: Banknote, color: "text-amber-500", severity: "Medium" },
                    ].map((friction, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="relative">
                          <div className={`h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative z-10 ${friction.color}`}>
                            <friction.icon className="h-5 w-5" />
                          </div>
                          {i !== 3 && <div className="absolute top-10 left-5 w-0.5 h-16 bg-slate-100 dark:bg-slate-800 -z-0" />}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{friction.point}</p>
                            <Badge variant="outline" className={
                              friction.severity === 'High' ? 'bg-red-50 text-red-700 border-red-200' :
                              friction.severity === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-blue-50 text-blue-700 border-blue-200'
                            }>
                              {friction.severity} Friction
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 mb-2">{friction.time}</p>
                          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-400">
                            {friction.detail}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rehash" className="mt-6 space-y-6">
              <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <RefreshCw className="h-5 w-5" /> Deal Re-Hash Tool
                  </CardTitle>
                  <CardDescription className="text-amber-600/80 dark:text-amber-500/80">
                    Restructure declined deals or counter-offers to save the deal.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <p className="text-sm font-bold text-slate-500 mb-1">Current Bank Offer</p>
                        <p className="text-2xl font-black text-red-600">Declined</p>
                        <p className="text-xs text-slate-500 mt-1">LTV exceeds maximum 120%</p>
                      </div>
                      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <p className="text-sm font-bold text-slate-500 mb-1">Target Payment</p>
                        <p className="text-2xl font-black">$450/mo</p>
                        <p className="text-xs text-slate-500 mt-1">Customer maximum budget</p>
                      </div>
                      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <p className="text-sm font-bold text-slate-500 mb-1">Required Cash Down</p>
                        <p className="text-2xl font-black text-amber-600">+$1,500</p>
                        <p className="text-xs text-slate-500 mt-1">To reach approved LTV</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-bold text-slate-900 dark:text-white">AI Restructure Options</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20 relative overflow-hidden shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-emerald-600" />
                              <span className="font-bold text-emerald-700 dark:text-emerald-400">Option 1: Drop Rate & Term</span>
                            </div>
                            <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">Highest Approval Odds</Badge>
                          </div>
                          <ul className="text-sm space-y-2 text-emerald-800 dark:text-emerald-300 mb-4">
                            <li className="flex items-start gap-2"><Check className="h-4 w-4 shrink-0 mt-0.5" /> Switch to Credit Union (4.9% APR)</li>
                            <li className="flex items-start gap-2"><Check className="h-4 w-4 shrink-0 mt-0.5" /> Extend term to 84 months</li>
                            <li className="flex items-start gap-2"><Check className="h-4 w-4 shrink-0 mt-0.5" /> Drop GAP insurance (LTV drops to 118%)</li>
                          </ul>
                          <div className="flex items-center justify-between pt-3 border-t border-emerald-200 dark:border-emerald-800">
                            <span className="font-bold text-emerald-900 dark:text-emerald-100">New Payment: $448/mo</span>
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => {
                              toast.success("Deal Re-Hashed!", { description: "Structure updated and sent to new lender." });
                              hapticFeedback();
                            }}>Apply Structure</Button>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/20 relative overflow-hidden shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-blue-600" />
                              <span className="font-bold text-blue-700 dark:text-blue-400">Option 2: Additional Cash</span>
                            </div>
                          </div>
                          <ul className="text-sm space-y-2 text-blue-800 dark:text-blue-300 mb-4">
                            <li className="flex items-start gap-2"><Check className="h-4 w-4 shrink-0 mt-0.5" /> Keep current lender (5.9% APR)</li>
                            <li className="flex items-start gap-2"><Check className="h-4 w-4 shrink-0 mt-0.5" /> Keep term at 72 months</li>
                            <li className="flex items-start gap-2"><Check className="h-4 w-4 shrink-0 mt-0.5" /> Collect additional $1,500 down payment</li>
                          </ul>
                          <div className="flex items-center justify-between pt-3 border-t border-blue-200 dark:border-blue-800">
                            <span className="font-bold text-blue-900 dark:text-blue-100">New Payment: $435/mo</span>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => {
                              toast.success("Customer Notified", { description: "SMS sent requesting additional $1,500 down payment." });
                              hapticFeedback();
                            }}>Text Customer</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle>Audit Log</CardTitle>
                  <CardDescription>Chronological history of all deal jacket activity.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {[
                      { action: "Compliance Audit Completed", user: "System", time: "10 minutes ago", icon: ShieldCheck, color: "text-emerald-500" },
                      { action: "Document Signed: Credit Application", user: "John Doe (Customer)", time: "1 hour ago", icon: Signature, color: "text-blue-500" },
                      { action: "Document Signed: Buyer's Guide", user: "John Doe (Customer)", time: "1 hour ago", icon: Signature, color: "text-blue-500" },
                      { action: "Deal Created", user: "Mike Wilson (Sales)", time: "4 hours ago", icon: Plus, color: "text-slate-400" },
                    ].map((log, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="relative">
                          <div className={`h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative z-10 ${log.color}`}>
                            <log.icon className="h-4 w-4" />
                          </div>
                          {i !== 3 && <div className="absolute top-8 left-4 w-0.5 h-10 bg-slate-100 dark:bg-slate-800 -z-0" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{log.action}</p>
                          <p className="text-xs text-slate-500">{log.user} • {log.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={ocrModalOpen} onOpenChange={setOcrModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanText className="h-5 w-5 text-primary" /> AI Data Extraction
            </DialogTitle>
            <DialogDescription>
              OCR results for {ocrResult?.docType}. Confidence score: <span className="text-emerald-500 font-bold">{ocrResult?.confidence}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {ocrResult?.fraudScore && (
              <div className={`rounded-md border p-4 ${ocrResult.fraudScore === 'High Risk' ? 'border-destructive/50 bg-destructive/10' : 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className={`h-5 w-5 ${ocrResult.fraudScore === 'High Risk' ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`} />
                  <h4 className={`font-semibold ${ocrResult.fraudScore === 'High Risk' ? 'text-destructive' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    AI Fraud Analysis: {ocrResult.fraudScore}
                  </h4>
                </div>
                <ul className="text-sm space-y-1 ml-7">
                  {ocrResult.fraudDetails?.map((detail: string, i: number) => (
                    <li key={i} className={`list-disc ${ocrResult.fraudScore === 'High Risk' ? 'text-destructive/80' : 'text-emerald-600/80 dark:text-emerald-400/80'}`}>
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-md border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900/50">
              <div className="space-y-3">
                {ocrResult?.fields.map((field: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">{field.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{field.value}</span>
                      {field.match ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-blue-700 dark:text-blue-400">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>Data automatically verified against credit application. No manual entry required.</span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setOcrModalOpen(false)} className="w-full">Accept & Verify</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
