import React, { useState, useRef } from "react";
import { DealParameters, formatCurrency } from "@/lib/calculations";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import SignaturePad from "react-signature-canvas";
import { PenTool, CheckCircle2, Eraser, Send, Mail, MessageSquare, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { hapticFeedback } from "@/lib/haptics";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface DealFormsProps {
  params: DealParameters;
  customerName: string;
  vehicleName: string;
  vin?: string;
}

export function DealForms({ params, customerName, vehicleName, vin = "1HGCM82633A00435" }: DealFormsProps) {
  const [activeForm, setActiveForm] = useState("odometer");
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [sendMethod, setSendMethod] = useState("email");
  const [sendContact, setSendContact] = useState("");
  const [signatures, setSignatures] = useState<Record<string, string>>({});
  const sigCanvas = useRef<SignaturePad>(null);

  const handleOpenSend = () => {
    setIsSendModalOpen(true);
    setSendContact(sendMethod === "email" ? "customer@example.com" : "(555) 123-4567");
    hapticFeedback();
  };

  const handleSendContract = () => {
    setIsSendModalOpen(false);
    toast.success(`Document sent to ${customerName} via ${sendMethod === "email" ? "Email" : "SMS"}!`, {
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    });
    hapticFeedback();
  };

  const handleOpenSign = () => {
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
    
    setSignatures(prev => ({
      ...prev,
      [activeForm]: sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png') || ""
    }));
    
    setIsSignModalOpen(false);
    toast.success(`Signature captured for ${forms.find(f => f.id === activeForm)?.name}`, {
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    });
    hapticFeedback();
    setTimeout(() => sigCanvas.current?.clear(), 300);
  };

  const forms = [
    { id: "odometer", name: "Odometer Disclosure" },
    { id: "buyers_guide", name: "Buyers Guide" },
    { id: "warranty", name: "Limited Warranty" },
    { id: "contingent", name: "Sales Contingent on Financing" },
    { id: "insurance", name: "Agreement to Provide Insurance" },
    { id: "law553", name: "Bank Contract (Law 553)" },
    { id: "invoice", name: "Invoice" },
    { id: "we_owe", name: "We Owe Form" },
    { id: "purchase_agreement", name: "Purchase & Sales Agreement" },
  ];

  // Render a generic form header
  const renderHeader = (title: string) => (
    <div className="text-center mb-8 border-b-2 border-black pb-4">
      <h2 className="text-2xl font-black uppercase tracking-widest">{title}</h2>
      <p className="text-sm mt-2">Auto Sales AI OS Demo | 123 Main Street, Anytown, USA</p>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      <div className="w-full md:w-64 shrink-0 print:hidden">
        <div className="flex flex-col gap-2">
          <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">Deal Forms</h3>
          <div className="md:hidden mb-4">
            <select 
              value={activeForm} 
              onChange={(e) => setActiveForm(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium"
            >
              {forms.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <div className="hidden md:flex flex-col gap-2">
            {forms.map(f => (
              <Button 
                key={f.id} 
                variant={activeForm === f.id ? "default" : "outline"}
                className="justify-start text-left w-full h-10"
                onClick={() => setActiveForm(f.id)}
              >
                {f.name}
              </Button>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <Button 
              variant="outline" 
              className="bg-white dark:bg-slate-950 w-full"
              onClick={handleOpenSend}
            >
              <Send className="h-4 w-4 mr-2" />
              Send to Customer
            </Button>
            <Button 
              className="bg-primary text-white w-full"
              onClick={() => window.print()}
            >
              Print Package
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm p-8 print:p-0 print:border-none print:shadow-none min-h-[800px]" id="printable-form">
        
        {activeForm === "odometer" && (
          <div className="space-y-6 text-black dark:text-white print:text-black">
            {renderHeader("Odometer Disclosure Statement")}
            <p>Federal law (and State law, if applicable) requires that you state the mileage upon transfer of ownership. Failure to complete or providing a false statement may result in fines and/or imprisonment.</p>
            <p>I, <strong>Auto Sales AI OS Demo</strong>, state that the odometer now reads <strong>34,562</strong> (no tenths) miles and to the best of my knowledge that it reflects the actual mileage of the vehicle described below, unless one of the following statements is checked.</p>
            <div className="space-y-2 mt-4">
              <p>[ ] (1) I hereby certify that to the best of my knowledge the odometer reading reflects the amount of mileage in excess of its mechanical limits.</p>
              <p>[ ] (2) I hereby certify that the odometer reading is NOT the actual mileage. WARNING - ODOMETER DISCREPANCY.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-8 border border-slate-300 dark:border-slate-700 print:border-black p-4">
              <div><strong>Make:</strong> {vehicleName.split(' ')[1] || 'Make'}</div>
              <div><strong>Model:</strong> {vehicleName.split(' ').slice(2).join(' ') || 'Model'}</div>
              <div><strong>Year:</strong> {vehicleName.split(' ')[0] || 'Year'}</div>
              <div><strong>VIN:</strong> {vin}</div>
            </div>
            <div className="mt-12 space-y-12">
              <div className="flex justify-between gap-8 items-end">
                <div className="flex-1 border-t border-black dark:border-white print:border-black pt-2 relative">
                  <span className="absolute -top-6 text-xs font-bold text-slate-500 uppercase">Transferor's Signature (Seller)</span>
                  <div className="h-12 flex items-center">
                    <span className="font-script text-2xl text-slate-800 dark:text-slate-200">Auto Sales AI OS Demo</span>
                  </div>
                </div>
                <div className="w-48 border-t border-black dark:border-white print:border-black pt-2 relative">
                  <span className="absolute -top-6 text-xs font-bold text-slate-500 uppercase">Date</span>
                  <div className="h-12 flex items-center">
                    {new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex justify-between gap-8 items-end">
                <div className="flex-1 border-t border-black dark:border-white print:border-black pt-2 relative group">
                  <span className="absolute -top-6 text-xs font-bold text-slate-500 uppercase">Transferee's Signature (Buyer: {customerName})</span>
                  <div className="h-16 flex items-center justify-between">
                    {signatures[activeForm] ? (
                      <img src={signatures[activeForm]} alt="Customer Signature" className="h-16 object-contain" />
                    ) : (
                      <span className="text-slate-300 dark:text-slate-700 italic">Awaiting Signature...</span>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="print:hidden opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={handleOpenSign}
                    >
                      <PenTool className="h-4 w-4 mr-2" /> Sign
                    </Button>
                  </div>
                </div>
                <div className="w-48 border-t border-black dark:border-white print:border-black pt-2 relative">
                  <span className="absolute -top-6 text-xs font-bold text-slate-500 uppercase">Date</span>
                  <div className="h-16 flex items-center">
                    {signatures[activeForm] ? new Date().toLocaleDateString() : ""}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Generic fallback for other forms */}
        {activeForm !== "odometer" && (
          <div className="space-y-6 text-black dark:text-white print:text-black">
            {renderHeader(forms.find(f => f.id === activeForm)?.name || "Form")}
            <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
              <div><strong>Customer:</strong> {customerName}</div>
              <div><strong>Date:</strong> {new Date().toLocaleDateString()}</div>
              <div><strong>Vehicle:</strong> {vehicleName}</div>
              <div><strong>VIN:</strong> {vin}</div>
            </div>
            
            <div className="min-h-[400px] border-2 border-dashed border-slate-300 dark:border-slate-700 print:border-slate-300 flex items-center justify-center p-8 text-center text-slate-500 dark:text-slate-400">
              <p>Standard boilerplate text for {forms.find(f => f.id === activeForm)?.name} goes here.<br/>This area would contain all the legal disclosures, terms, and conditions specific to your state and dealership.</p>
            </div>

            <div className="mt-12 space-y-12">
              <div className="flex justify-between gap-8 items-end">
                <div className="flex-1 border-t border-black dark:border-white print:border-black pt-2 relative group">
                  <span className="absolute -top-6 text-xs font-bold text-slate-500 uppercase">Customer Signature</span>
                  <div className="h-16 flex items-center justify-between">
                    {signatures[activeForm] ? (
                      <img src={signatures[activeForm]} alt="Customer Signature" className="h-16 object-contain" />
                    ) : (
                      <span className="text-slate-300 dark:text-slate-700 italic">Awaiting Signature...</span>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="print:hidden opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={handleOpenSign}
                    >
                      <PenTool className="h-4 w-4 mr-2" /> Sign
                    </Button>
                  </div>
                </div>
                <div className="w-48 border-t border-black dark:border-white print:border-black pt-2 relative">
                  <span className="absolute -top-6 text-xs font-bold text-slate-500 uppercase">Date</span>
                  <div className="h-16 flex items-center">
                    {signatures[activeForm] ? new Date().toLocaleDateString() : ""}
                  </div>
                </div>
              </div>
              <div className="flex justify-between gap-8 items-end">
                <div className="flex-1 border-t border-black dark:border-white print:border-black pt-2 relative">
                  <span className="absolute -top-6 text-xs font-bold text-slate-500 uppercase">Dealership Representative</span>
                  <div className="h-12 flex items-center">
                    <span className="font-script text-2xl text-slate-800 dark:text-slate-200">Auto Sales AI OS Demo</span>
                  </div>
                </div>
                <div className="w-48 border-t border-black dark:border-white print:border-black pt-2 relative">
                  <span className="absolute -top-6 text-xs font-bold text-slate-500 uppercase">Date</span>
                  <div className="h-12 flex items-center">
                    {new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isSignModalOpen} onOpenChange={setIsSignModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5 text-primary" />
              Digital Signature Capture
            </DialogTitle>
            <DialogDescription>
              Customer: <strong className="text-slate-900 dark:text-white">{customerName}</strong>
              <br/>
              Document: {forms.find(f => f.id === activeForm)?.name}
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
              Send Documents for Signature
            </DialogTitle>
            <DialogDescription>
              Customer: <strong className="text-slate-900 dark:text-white">{customerName}</strong>
              <br/>
              Vehicle: {vehicleName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <RadioGroup value={sendMethod} onValueChange={(v) => {
              setSendMethod(v);
              setSendContact(v === "email" ? "customer@example.com" : "(555) 123-4567");
            }} className="grid grid-cols-2 gap-4">
              <div>
                <RadioGroupItem value="email" id="email2" className="peer sr-only" />
                <Label
                  htmlFor="email2"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-slate-200 bg-transparent p-4 hover:bg-slate-50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 dark:border-slate-800 dark:hover:bg-slate-900 cursor-pointer"
                >
                  <Mail className="mb-3 h-6 w-6 text-slate-500" />
                  Email
                </Label>
              </div>
              <div>
                <RadioGroupItem value="sms" id="sms2" className="peer sr-only" />
                <Label
                  htmlFor="sms2"
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
    </div>
  );
}
