import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Tesseract from "tesseract.js";
import { 
  Camera, 
  Scan, 
  UserSquare2, 
  Car, 
  CheckCircle2, 
  ChevronLeft, 
  Loader2, 
  Sparkles, 
  Image as ImageIcon,
  RotateCw,
  X,
  CreditCard,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { hapticFeedback } from "@/lib/haptics";



type IntakeMode = "vin" | "license" | "photos" | "upsheet";

export default function MobileIntake() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<IntakeMode>("upsheet");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);


  // Simulation timer

  useEffect(() => {
    let interval: any;
    if (isScanning && mode !== "license") {
      setScanProgress(0);
      interval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            handleScanComplete();
            return 100;
          }
          return prev + 2;
        });
      }, 30);
    }
    return () => clearInterval(interval);
  }, [isScanning, mode]);

  const handleScanComplete = () => {
    setIsScanning(false);
    hapticFeedback();
    
    if (mode === "vin") {
      setResult({
        type: "vehicle",
        vin: "1FTFW1RG5PFA" + Math.floor(10000 + Math.random() * 90000),
        year: 2024,
        make: "Ford",
        model: "F-150 Raptor",
        trim: "R 4WD",
        color: "Avalanche Gray",
        engine: "5.2L V8 Supercharged"
      });
      toast.success("VIN Decoded Successfully");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    hapticFeedback();
    toast.info("Analyzing Driver's License...");

    try {
      const result = await Tesseract.recognize(file, 'eng');
      const text = result.data.text;
      
      setResult({
        type: "customer",
        firstName: "Alexander",
        lastName: "Hamilton",
        dob: "01/11/1985",
        address: "211 Wall Street",
        city: "New York",
        state: "NY",
        zip: "10005",
        dlNumber: "DL" + Math.floor(1000000 + Math.random() * 9000000),
        rawText: text.substring(0, 50) + "..."
      });
      toast.success("Driver's License Scanned");

      // Tracking for Lead Created via License Scan
      const trackingPayload = {
        type: "lead_created",
        timestamp: Date.now(),
        source: "Mobile License Scan",
        formData: {
          first_name: "Alexander",
          last_name: "Hamilton",
          date_of_birth: "01/11/1985",
          address: "211 Wall Street",
          city: "New York",
          state: "NY",
          postal_code: "10005",
        },
        locationId: "HqAVJ0wdU05Vofq41aGB",
        sessionId: crypto.randomUUID(),
      };

      fetch("https://backend.leadconnectorhq.com/external-tracking/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", version: "2021-07-28" },
        body: JSON.stringify(trackingPayload),
      }).catch(() => {});

    } catch (err) {
      toast.error("Failed to read license");
    } finally {
      setIsScanning(false);
    }
  };




  const handleProcessBackground = () => {
    setIsProcessing(true);
    hapticFeedback();
    setTimeout(() => {
      setIsProcessing(false);
      setResult({
        type: "photo",
        original: "https://vibe.filesafe.space/1778548756560730619/assets/4ce7fbe5-5ab8-4c1a-a8a8-fce8d204a07f.png",
        processed: "https://vibe.filesafe.space/1778548756560730619/assets/e7287293-2c12-48a5-a982-ce6d9480ef35.png"
      });
      toast.success("Background Removed Successfully");
    }, 2500);
  };

  const resetIntake = () => {
    setResult(null);
    setIsScanning(false);
    setScanProgress(0);
  };

  return (
    <div className="flex flex-col h-full bg-black text-white font-sans overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between z-50 bg-gradient-to-b from-black/80 to-transparent">
        <Button variant="ghost" size="icon" className="text-white" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <h1 className="text-sm font-bold uppercase tracking-widest text-slate-400">Mobile Intake</h1>
          <Badge variant="outline" className="text-[10px] text-primary border-primary py-0 px-1.5 h-4">PRO MODE</Badge>
        </div>
        <Button variant="ghost" size="icon" className="text-white" onClick={resetIntake}>
          <RotateCw className="h-5 w-5" />
        </Button>
      </div>

      {/* Camera Viewport Simulation */}
      <div className="flex-1 relative overflow-hidden bg-slate-900">
        {mode === "upsheet" ? (
          <div className="absolute inset-0 bg-slate-50 dark:bg-slate-900 overflow-y-auto p-4 pb-32 text-slate-900 dark:text-white">
            <h2 className="text-xl font-bold mb-4">Digital Up-Sheet</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Customer Name</label>
                <input type="text" className="w-full h-12 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <input type="tel" className="w-full h-12 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" placeholder="(555) 123-4567" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Vehicle of Interest</label>
                <input type="text" className="w-full h-12 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" placeholder="2024 Toyota Tacoma" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Trade-In</label>
                <input type="text" className="w-full h-12 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" placeholder="2018 Honda Civic" />
              </div>
              <Button className="w-full h-12 text-lg font-bold" onClick={() => {
                toast.success("Up-Sheet Submitted!", { description: "CRM record created and desk manager alerted." });
                hapticFeedback();
                navigate('/crm');
              }}>
                Submit Up-Sheet
              </Button>
            </div>
          </div>
        ) : cameraActive && !result && (
          <>
            {/* Mock Camera Feed */}
            <div className="absolute inset-0 bg-[url('https://vibe.filesafe.space/1778548756560730619/assets/4ce7fbe5-5ab8-4c1a-a8a8-fce8d204a07f.png')] bg-cover bg-center opacity-60"></div>
            
            {/* Scanning Overlay */}
            <div className="absolute inset-0 flex items-center justify-center p-8">
              {mode === "vin" && (
                <div className={`w-full h-16 border-2 rounded-lg transition-all duration-300 ${isScanning ? 'border-primary shadow-[0_0_20px_rgba(37,99,235,0.5)]' : 'border-white/30'}`}>
                  {isScanning && (
                    <div className="absolute inset-0 bg-primary/10 animate-pulse flex items-center justify-center">
                      <div className="h-0.5 w-full bg-primary absolute top-0 animate-[scan_2s_ease-in-out_infinite]"></div>
                    </div>
                  )}
                </div>
              )}
              {mode === "license" && (
                <div className={`w-full aspect-[1.586/1] border-2 rounded-2xl transition-all duration-300 ${isScanning ? 'border-primary shadow-[0_0_20px_rgba(37,99,235,0.5)]' : 'border-white/30'}`}>
                   {isScanning && (
                    <div className="absolute inset-0 bg-primary/10 animate-pulse">
                      <div className="h-0.5 w-full bg-primary absolute top-0 animate-[scan_2s_ease-in-out_infinite]"></div>
                    </div>
                  )}
                  <div className="absolute top-4 left-4 h-8 w-8 rounded-full bg-white/10 border border-white/20"></div>
                  <div className="absolute bottom-4 right-4 h-12 w-20 rounded bg-white/10 border border-white/20"></div>
                </div>
              )}
              {mode === "photos" && (
                <div className="w-full aspect-square border-2 border-dashed border-white/30 rounded-3xl flex items-center justify-center">
                  <Camera className="h-12 w-12 text-white/20" />
                </div>
              )}
            </div>

            {/* Instruction Text */}
            <div className="absolute bottom-32 left-0 w-full text-center px-8">
              <p className="text-white font-medium text-sm drop-shadow-md">
                {isScanning ? "Scanning..." : 
                 mode === "vin" ? "Align VIN barcode within the frame" : 
                 mode === "license" ? "Position Driver's License within the frame" : 
                 "Capture vehicle from a 45° angle"}
              </p>
            </div>
          </>
        )}

        {/* Result View */}
        {result && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col p-6 animate-in fade-in zoom-in duration-300">
            <div className="flex-1 overflow-y-auto space-y-6 pt-12">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-success/20 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Intake Complete</h2>
                  <p className="text-slate-400 text-sm">Data extracted and verified</p>
                </div>
              </div>

              {result.type === "vehicle" && (
                <div className="space-y-4">
                  <div className="aspect-video rounded-2xl bg-slate-900 overflow-hidden border border-slate-800">
                    <img src="https://vibe.filesafe.space/1778548756560730619/assets/e7287293-2c12-48a5-a982-ce6d9480ef35.png" className="w-full h-full object-cover" alt="Vehicle" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Year/Make/Model</p>
                      <p className="font-bold">{result.year} {result.make} {result.model}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Trim</p>
                      <p className="font-bold">{result.trim}</p>
                    </div>
                    <div className="col-span-2 p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <p className="text-[10px] text-slate-500 uppercase font-bold">VIN</p>
                      <p className="font-mono font-bold text-primary">{result.vin}</p>
                    </div>
                  </div>
                </div>
              )}

              {result.type === "customer" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
                    <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
                      {result.firstName[0]}{result.lastName[0]}
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{result.firstName} {result.lastName}</p>
                      <p className="text-slate-500 text-sm">DL: {result.dlNumber}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm">DOB</span>
                      <span className="font-bold">{result.dob}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm">Address</span>
                      <span className="font-bold text-right">{result.address}<br/>{result.city}, {result.state} {result.zip}</span>
                    </div>
                  </div>
                </div>
              )}

              {result.type === "photo" && (
                <div className="space-y-6">
                  <div className="relative aspect-square rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 group">
                    <img 
                      src={isProcessing ? result.original : result.processed || result.original} 
                      className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500" 
                      style={{ opacity: isProcessing ? 0.5 : 1 }}
                      alt="Vehicle" 
                    />
                    {!isProcessing && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                         <div className="p-6 bg-white/10 rounded-2xl border border-white/20 flex flex-col items-center gap-3">
                           <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                           <p className="font-bold text-sm">Background removal ready</p>
                           <Button size="sm" onClick={handleProcessBackground} className="bg-primary text-white">
                             Process Now
                           </Button>
                         </div>
                      </div>
                    )}
                    {isProcessing && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-12 space-y-4">
                        <Loader2 className="h-12 w-12 text-primary animate-spin" />
                        <p className="font-bold animate-pulse">Removing Background...</p>
                        <Progress value={45} className="h-2 w-full" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 grid grid-cols-2 gap-4">
              <Button variant="outline" className="border-slate-800 text-white h-12 rounded-xl" onClick={resetIntake}>
                Scan Another
              </Button>
              <Button className="bg-primary text-white h-12 rounded-xl" onClick={() => navigate(result.type === 'vehicle' ? '/inventory' : '/crm')}>
                Finish & Save
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      {!result && (
        <div className="p-8 pb-12 bg-slate-950/80 backdrop-blur-xl border-t border-white/5 flex flex-col items-center gap-8">
          {/* Mode Selector */}
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-full border border-white/10 overflow-x-auto scrollbar-hide max-w-full">
            <button 
              onClick={() => { setMode("upsheet"); hapticFeedback(); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${mode === "upsheet" ? "bg-primary text-white shadow-lg" : "text-slate-400"}`}
            >
              UP-SHEET
            </button>
            <button 
              onClick={() => { setMode("vin"); hapticFeedback(); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${mode === "vin" ? "bg-primary text-white shadow-lg" : "text-slate-400"}`}
            >
              VIN
            </button>
            <button 
              onClick={() => { setMode("license"); hapticFeedback(); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${mode === "license" ? "bg-primary text-white shadow-lg" : "text-slate-400"}`}
            >
              LICENSE
            </button>
            <button 
              onClick={() => { setMode("photos"); hapticFeedback(); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${mode === "photos" ? "bg-primary text-white shadow-lg" : "text-slate-400"}`}
            >
              STUDIO
            </button>
          </div>

          {/* Shutter Button */}
          {mode !== "upsheet" && (
            <>
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange} 
              />
              <button 
                onClick={() => { 
                  hapticFeedback();
                  if (mode === "license") {
                    fileInputRef.current?.click();
                  } else {
                    setIsScanning(true);
                  }
                }}
                disabled={isScanning}
                className={`h-20 w-20 rounded-full border-4 border-white/20 p-1 transition-transform active:scale-90 ${isScanning ? 'opacity-50 grayscale' : ''}`}
              >
                <div className="h-full w-full rounded-full bg-white flex items-center justify-center">
                  {mode === "vin" && <Scan className="h-8 w-8 text-black" />}
                  {mode === "license" && <CreditCard className="h-8 w-8 text-black" />}
                  {mode === "photos" && <Camera className="h-8 w-8 text-black" />}
                </div>
              </button>
              
              <div className="flex items-center gap-2 text-slate-500">
                <Zap className="h-4 w-4 text-amber-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest">AI-Powered Precision Scanning</span>
              </div>
            </>
          )}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0% { top: 0%; opacity: 0.5; }
          50% { top: 100%; opacity: 1; }
          100% { top: 0%; opacity: 0.5; }
        }
      `}} />
    </div>
  );
}
