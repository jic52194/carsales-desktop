import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileSignature as Icon, Plus, Search, Filter, Download, Clock, CheckCircle2, AlertCircle, FileText, Smartphone, Fingerprint, PenTool, X, Eraser, Mail, MessageSquare, Send, FileSignature, Lock, Video, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import SignaturePad from "react-signature-canvas";
import { toast } from "sonner";
import { hapticFeedback } from "@/lib/haptics";

const contracts = [
  { id: "C-4592", customer: "John Doe", lender: "Chase Auto", amount: 24500, status: "In Transit", days: 3, notes: "Waiting on title" },
  { id: "C-4591", customer: "Jane Smith", lender: "Capital One", amount: 32000, status: "Funded", days: 5, notes: "" },
  { id: "C-4590", customer: "Acme Corp", lender: "Ally Financial", amount: 45000, status: "Stipulation", days: 8, notes: "Need POI" },
  { id: "C-4589", customer: "Mike Wilson", lender: "Chase Auto", amount: 18900, status: "In Transit", days: 12, notes: "Lender reviewing" },
  { id: "C-4588", customer: "Sarah Brown", lender: "Santander", amount: 22400, status: "Rejected", days: 2, notes: "Fraud alert" },
  { id: "C-4587", customer: "David Miller", lender: "Capital One", amount: 28500, status: "Funded", days: 1, notes: "" },
];

export default function Contracts() {
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isIpadMode, setIsIpadMode] = useState(false);
  const [sendMethod, setSendMethod] = useState("email");
  const [sendContact, setSendContact] = useState("");
  const [activeContract, setActiveContract] = useState<any>(null);
  const sigCanvas = useRef<SignaturePad>(null);

  const handleOpenSend = (contract?: any) => {
    setActiveContract(contract || contracts[0]);
    setIsSendModalOpen(true);
    setSendContact(sendMethod === "email" ? "customer@example.com" : "(555) 123-4567");
    hapticFeedback();
  };

  const handleSendContract = () => {
    setIsSendModalOpen(false);
    toast.success(`Contract sent to ${activeContract?.customer} via ${sendMethod === "email" ? "Email" : "SMS"}!`, {
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    });
    hapticFeedback();
  };

  const handleOpenSign = (contract: any) => {
    setActiveContract(contract);
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
    
    // Simulate saving the signature
    setIsSignModalOpen(false);
    toast.success(`Signature captured for ${activeContract?.customer}'s contract!`, {
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    });
    hapticFeedback();
    sigCanvas.current?.clear();
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Icon className="h-8 w-8 text-primary" />
            Contract Tracking
          </h1>
          <p className="text-slate-500">Monitor CIT (Contracts in Transit), funding status, and stipulation resolution.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Button variant="outline" className="bg-white dark:bg-slate-950 w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" /> Export CIT Report
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto" onClick={() => {
            toast.promise(new Promise(r => setTimeout(r, 1500)), {
              loading: "Validating deal structure against lender guidelines...",
              success: "E-Contracting API: Deal successfully pushed to RouteOne/Dealertrack!",
              error: "Validation failed"
            });
            hapticFeedback();
          }}>
            <Send className="mr-2 h-4 w-4" /> Push to RouteOne
          </Button>
          <Button className="bg-primary text-white w-full sm:w-auto" onClick={() => handleOpenSend()}>
            <Smartphone className="mr-2 h-4 w-4" /> Remote eContract
          </Button>
          <Button variant="outline" className="bg-white dark:bg-slate-950 w-full sm:w-auto border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-400 dark:bg-indigo-900/30" onClick={() => {
            toast.success("E-Contracting Vault Opened", { description: "Secure digital storage tab for all signed deal documents with audit trails." });
          }}>
            <Lock className="mr-2 h-4 w-4" /> Secure Vault
          </Button>
          <Button variant="outline" className="bg-white dark:bg-slate-950 w-full sm:w-auto border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-400 dark:bg-amber-900/30" onClick={() => {
            toast.success("F&I Product Video Sent", { description: "Short SMS explainer video of GAP/Warranty sent to customer's phone." });
          }}>
            <Video className="mr-2 h-4 w-4" /> F&I Video Pitch
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto" onClick={() => {
            setIsIpadMode(true);
            toast.success("iPad Mode Launched", { description: "Customer presentation view activated. Locking interface." });
            hapticFeedback();
          }}>
            <FileSignature className="mr-2 h-4 w-4" /> iPad Presentation
          </Button>
          <Button className="bg-primary text-white w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> New Contract
          </Button>
        </div>
      </div>

      <Card className="bg-indigo-50/50 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/50 shadow-sm mb-6">
        <CardContent className="p-5 flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl shrink-0">
            <BrainCircuit className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-indigo-900 dark:text-indigo-300 mb-1">AI Dynamic F&I Menu</h3>
            <p className="text-sm text-indigo-800/80 dark:text-indigo-200/70">
              Generate a personalized F&I product presentation based on the customer's driving habits, vehicle type, and credit profile.
            </p>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0" onClick={() => toast.success("Menu Generated", { description: "Created personalized presentation highlighting GAP and Tire & Wheel protection." })}>
            Generate Menu
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Clock className="h-5 w-5" />
              </div>
              <Badge variant="secondary" className="bg-amber-50 text-amber-700">8 Units</Badge>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">CIT Total</p>
              <h3 className="text-2xl font-bold">$185,400</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">MTD</Badge>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">Total Funded</p>
              <h3 className="text-2xl font-bold">$1.2M</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                <AlertCircle className="h-5 w-5" />
              </div>
              <Badge variant="secondary" className="bg-red-50 text-red-700">Critical</Badge>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">Contracts &gt; 10 Days</p>
              <h3 className="text-2xl font-bold text-red-600">3</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                <FileText className="h-5 w-5" />
              </div>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700">Pending</Badge>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">Avg Funding Time</p>
              <h3 className="text-2xl font-bold">4.2 Days</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input placeholder="Search contracts..." className="pl-9 bg-white dark:bg-slate-950 h-10" />
          </div>
          <Button variant="outline" className="bg-white dark:bg-slate-950 h-10">
            <Filter className="mr-2 h-4 w-4" /> Filter
          </Button>
        </div>

        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contract ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Lender</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Days in CIT</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell className="font-mono text-xs font-bold text-slate-500">{contract.id}</TableCell>
                    <TableCell className="font-medium">{contract.customer}</TableCell>
                    <TableCell>{contract.lender}</TableCell>
                    <TableCell className="font-semibold">${contract.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={`
                          ${contract.status === "Funded" ? "border-emerald-500 text-emerald-600 bg-emerald-50" : ""}
                          ${contract.status === "Stipulation" ? "border-amber-500 text-amber-600 bg-amber-50" : ""}
                          ${contract.status === "Rejected" ? "border-red-500 text-red-600 bg-red-50" : ""}
                          ${contract.status === "In Transit" ? "border-blue-500 text-blue-600 bg-blue-50" : ""}
                        `}
                      >
                        {contract.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${contract.days > 10 ? 'text-red-600' : ''}`}>{contract.days}</span>
                        {contract.days > 10 && <AlertCircle className="h-3 w-3 text-red-600" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {contract.status === "Funded" && (
                          <Button variant="outline" size="sm" className="h-8 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => {
                            toast.success("Digital Deal Envelope Sent", { description: "Secure SMS link sent to customer to download signed documents." });
                            hapticFeedback();
                          }}>
                            <Mail className="h-3 w-3 mr-1" /> Digital Deal Envelope
                          </Button>
                        )}
                        {contract.status === "Stipulation" && (
                          <Button variant="outline" size="sm" className="h-8 text-xs text-blue-600 border-blue-200 hover:bg-blue-50">
                            <Smartphone className="h-3 w-3 mr-1" /> Request Stips
                          </Button>
                        )}
                        {contract.status === "In Transit" && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => handleOpenSend(contract)}
                            >
                              <Send className="h-3 w-3 mr-1" /> Send
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-xs text-purple-600 border-purple-200 hover:bg-purple-50"
                              onClick={() => handleOpenSign(contract)}
                            >
                              <PenTool className="h-3 w-3 mr-1" /> eSign Capture
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="sm" className="h-8">Details</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {contracts.map((contract) => (
              <div key={contract.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] font-bold text-slate-400">{contract.id}</span>
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] h-5 px-1.5
                          ${contract.status === "Funded" ? "border-emerald-500 text-emerald-600 bg-emerald-50" : ""}
                          ${contract.status === "Stipulation" ? "border-amber-500 text-amber-600 bg-amber-50" : ""}
                          ${contract.status === "Rejected" ? "border-red-500 text-red-600 bg-red-50" : ""}
                          ${contract.status === "In Transit" ? "border-blue-500 text-blue-600 bg-blue-50" : ""}
                        `}
                      >
                        {contract.status}
                      </Badge>
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{contract.customer}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{contract.lender}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900 dark:text-white">${contract.amount.toLocaleString()}</p>
                    <div className="flex items-center justify-end gap-1.5 mt-1">
                      <span className={`text-xs font-bold ${contract.days > 10 ? 'text-red-600' : 'text-slate-500'}`}>{contract.days}d in CIT</span>
                      {contract.days > 10 && <AlertCircle className="h-3 w-3 text-red-600" />}
                    </div>
                  </div>
                </div>
                {contract.notes && (
                  <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900 p-2 rounded italic">
                    Note: {contract.notes}
                  </p>
                )}
                <div className="pt-1 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 h-9">Details</Button>
                  {contract.status === "Funded" && (
                    <Button variant="secondary" size="sm" className="flex-1 h-9 bg-emerald-50 text-emerald-600 hover:bg-emerald-100" onClick={() => {
                      toast.success("Digital Deal Envelope Sent", { description: "Secure SMS link sent to customer." });
                      hapticFeedback();
                    }}>
                      <Mail className="h-4 w-4 mr-1" /> Deal Envelope
                    </Button>
                  )}
                  {contract.status === "Stipulation" && (
                    <Button variant="secondary" size="sm" className="flex-1 h-9 bg-blue-50 text-blue-600 hover:bg-blue-100">
                      <Smartphone className="h-4 w-4 mr-1" /> Stips
                    </Button>
                  )}
                  {contract.status === "In Transit" && (
                    <>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="flex-1 h-9 bg-blue-50 text-blue-600 hover:bg-blue-100"
                        onClick={() => handleOpenSend(contract)}
                      >
                        <Send className="h-4 w-4 mr-1" /> Send
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="flex-1 h-9 bg-purple-50 text-purple-600 hover:bg-purple-100"
                        onClick={() => handleOpenSign(contract)}
                      >
                        <PenTool className="h-4 w-4 mr-1" /> eSign
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Dialog open={isSignModalOpen} onOpenChange={setIsSignModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5 text-primary" />
              Digital Signature Capture
            </DialogTitle>
            <DialogDescription>
              Customer: <strong className="text-slate-900 dark:text-white">{activeContract?.customer}</strong>
              <br/>
              Contract: {activeContract?.id}
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
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={clearSignature} className="sm:mr-auto">
              <Eraser className="h-4 w-4 mr-2" /> Clear
            </Button>
            <Button variant="outline" onClick={() => setIsSignModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveSignature} className="bg-primary text-white">
              <CheckCircle2 className="h-4 w-4 mr-2" /> Save Signature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSendModalOpen} onOpenChange={setIsSendModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Send Remote eContract
            </DialogTitle>
            <DialogDescription>
              Customer: <strong className="text-slate-900 dark:text-white">{activeContract?.customer}</strong>
              <br/>
              Contract: {activeContract?.id}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <RadioGroup value={sendMethod} onValueChange={(v) => {
              setSendMethod(v);
              setSendContact(v === "email" ? "customer@example.com" : "(555) 123-4567");
            }} className="grid grid-cols-2 gap-4">
              <div>
                <RadioGroupItem value="email" id="email" className="peer sr-only" />
                <Label
                  htmlFor="email"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-slate-200 bg-transparent p-4 hover:bg-slate-50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 dark:border-slate-800 dark:hover:bg-slate-900 cursor-pointer"
                >
                  <Mail className="mb-3 h-6 w-6 text-slate-500" />
                  Email
                </Label>
              </div>
              <div>
                <RadioGroupItem value="sms" id="sms" className="peer sr-only" />
                <Label
                  htmlFor="sms"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-slate-200 bg-transparent p-4 hover:bg-slate-50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 dark:border-slate-800 dark:hover:bg-slate-900 cursor-pointer"
                >
                  <MessageSquare className="mb-3 h-6 w-6 text-slate-500" />
                  SMS Text
                </Label>
              </div>
            </RadioGroup>

            <div className="space-y-2">
              <Label>{sendMethod === "email" ? "Email Address" : "Mobile Number"}</Label>
              <Input 
                value={sendContact} 
                onChange={(e) => setSendContact(e.target.value)}
                placeholder={sendMethod === "email" ? "Enter email address" : "Enter mobile number"}
              />
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg text-sm text-slate-500 flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <p>
                The customer will receive a secure link to review and sign their contract package. They will be required to authenticate their identity before signing.
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsSendModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendContract} className="bg-primary text-white">
              <Send className="h-4 w-4 mr-2" /> Send Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* iPad Mode Dialog */}
      <Dialog open={isIpadMode} onOpenChange={setIsIpadMode}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-slate-950 rounded-3xl border-4 border-slate-900 shadow-2xl">
          <div className="flex-1 overflow-y-auto">
            <div className="bg-slate-900 text-white p-8 pb-12 rounded-b-[3rem] shadow-lg">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black">Choose Your Protection</h2>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => setIsIpadMode(false)}>
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <p className="text-xl text-slate-300">Select the package that best fits your driving habits.</p>
            </div>
            <div className="p-8 -mt-8 max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { name: "Platinum", price: 3495, monthly: 58, color: "bg-indigo-600", features: ["Vehicle Service Contract (7yr/100k)", "Gap Insurance", "Tire & Wheel Protection", "Key Replacement"] },
                  { name: "Gold", price: 2495, monthly: 42, color: "bg-amber-500", features: ["Vehicle Service Contract (5yr/60k)", "Gap Insurance", "Tire & Wheel Protection"] },
                  { name: "Silver", price: 1295, monthly: 22, color: "bg-slate-400", features: ["Gap Insurance", "Tire & Wheel Protection"] }
                ].map((pkg) => (
                  <Card key={pkg.name} className="overflow-hidden border-2 border-slate-200 dark:border-slate-800 flex flex-col hover:shadow-xl transition-shadow cursor-pointer hover:border-primary group">
                    <div className={`h-3 ${pkg.color}`} />
                    <CardHeader className="pb-4 text-center">
                      <CardTitle className="text-3xl font-black">{pkg.name}</CardTitle>
                      <div className="mt-4">
                        <span className="text-5xl font-black text-slate-900 dark:text-white">${pkg.price}</span>
                      </div>
                      <p className="text-lg font-bold text-primary mt-2">+${pkg.monthly}/mo</p>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-4 px-6 pb-8">
                      <ul className="space-y-4">
                        {pkg.features.map((feature) => (
                          <li key={feature} className="text-base flex items-start gap-3 text-slate-600 dark:text-slate-400">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                      <Button className="w-full h-14 text-xl font-bold group-hover:bg-primary group-hover:text-white transition-colors" variant="outline" onClick={() => {
                        toast.success(`${pkg.name} Package Selected!`, { description: "Contract updated automatically." });
                        setIsIpadMode(false);
                      }}>Select Package</Button>
                    </div>
                  </Card>
                ))}
              </div>
              <div className="mt-8 text-center">
                <Button variant="ghost" className="text-slate-500 hover:text-slate-700" onClick={() => setIsIpadMode(false)}>Decline Optional Coverage</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
