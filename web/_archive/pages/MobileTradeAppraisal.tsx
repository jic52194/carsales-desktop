import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Camera, ScanLine, Car, DollarSign, Zap, RotateCcw, Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface AppraisalData {
  vin: string;
  year: string;
  make: string;
  model: string;
  mileage: string;
  tradeValue: number;
  retailValue: number;
  equity: number;
}

export default function MobileTradeAppraisal() {
  const [step, setStep] = useState<"scan" | "details" | "photos" | "result">("scan");
  const [vin, setVin] = useState("");
  const [data, setData] = useState<AppraisalData | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const lookupVIN = () => {
    if (vin.length < 10) {
      toast.error("Please enter a valid VIN");
      return;
    }
    setData({
      vin,
      year: "2020",
      make: "Honda",
      model: "Accord EX-L",
      mileage: "45,200",
      tradeValue: 18500,
      retailValue: 23900,
      equity: 18500,
    });
    setStep("details");
    toast.success("VIN decoded!", { description: "2020 Honda Accord EX-L identified." });
  };

  const simulateScan = () => {
    toast.info("Scanning VIN...", { description: "Point camera at windshield VIN plate" });
    setTimeout(() => {
      setVin("1HGCV2F38PA123456");
      toast.success("VIN scanned!");
    }, 1500);
  };

  const addPhoto = () => {
    setPhotos((prev) => [...prev, `photo-${prev.length + 1}`]);
    toast.success(`Photo ${photos.length + 1} captured`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Car className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Mobile Trade Appraisal</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Appraise trades on the lot with photo capture and instant equity</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {["scan", "details", "photos", "result"].map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
              step === s ? "bg-primary text-primary-foreground" :
              ["scan", "details", "photos", "result"].indexOf(step) > i ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
            }`}>
              {["scan", "details", "photos", "result"].indexOf(step) > i ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            {i < 3 && <div className={`h-0.5 w-8 ${["scan", "details", "photos", "result"].indexOf(step) > i ? "bg-emerald-500" : "bg-muted"}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: VIN Scan */}
      {step === "scan" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scan or Enter VIN</CardTitle>
            <CardDescription>Use your camera to scan the VIN plate or enter manually</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-video bg-slate-900 dark:bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center">
              <div className="text-center">
                <ScanLine className="h-12 w-12 text-white/30 mx-auto mb-2" />
                <p className="text-white/40 text-sm">Camera preview</p>
              </div>
              <div className="absolute inset-x-8 top-1/2 h-0.5 bg-primary animate-pulse" />
            </div>
            <Button onClick={simulateScan} className="w-full h-12">
              <Camera className="h-5 w-5 mr-2" /> Scan VIN Plate
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-px bg-border flex-1" />
              <span className="text-xs text-muted-foreground">OR</span>
              <div className="h-px bg-border flex-1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vin">Enter VIN Manually</Label>
              <Input id="vin" value={vin} onChange={(e) => setVin(e.target.value.toUpperCase())} placeholder="1HGCV2F38PA123456" className="font-mono uppercase" maxLength={17} />
            </div>
            <Button onClick={lookupVIN} className="w-full" disabled={vin.length < 10}>
              <Zap className="h-4 w-4 mr-2" /> Decode VIN
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Details */}
      {step === "details" && data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vehicle Details</CardTitle>
            <CardDescription>Review decoded information and enter mileage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Year</Label><Input value={data.year} readOnly className="bg-muted/50" /></div>
              <div><Label className="text-xs">Make</Label><Input value={data.make} readOnly className="bg-muted/50" /></div>
              <div className="col-span-2"><Label className="text-xs">Model</Label><Input value={data.model} readOnly className="bg-muted/50" /></div>
              <div className="col-span-2"><Label className="text-xs">Mileage</Label><Input defaultValue={data.mileage} /></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("scan")} className="flex-1">
                <RotateCcw className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button onClick={() => setStep("photos")} className="flex-1">
                Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Photos */}
      {step === "photos" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Capture Photos</CardTitle>
            <CardDescription>Take photos of the vehicle for condition assessment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {["Front", "Back", "Left", "Right", "Interior", "Odometer"].map((label, i) => (
                <button
                  key={label}
                  onClick={addPhoto}
                  className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all ${
                    photos.length > i ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20" : "border-border hover:border-primary/40"
                  }`}
                >
                  {photos.length > i ? (
                    <Check className="h-6 w-6 text-emerald-500" />
                  ) : (
                    <Camera className="h-6 w-6 text-muted-foreground" />
                  )}
                  <span className="text-[10px] font-semibold">{label}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("details")} className="flex-1">Back</Button>
              <Button onClick={() => setStep("result")} className="flex-1" disabled={photos.length < 3}>
                Get Appraisal <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Result */}
      {step === "result" && data && (
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-5 text-white">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider opacity-90">Appraisal Result</span>
            </div>
            <p className="text-3xl font-black">${data.tradeValue.toLocaleString()}</p>
            <p className="text-sm opacity-90">Trade-In Value</p>
          </div>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Retail Value</p>
                <p className="text-xl font-black">${data.retailValue.toLocaleString()}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-3">
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Profit Potential</p>
                <p className="text-xl font-black text-emerald-500">${(data.retailValue - data.tradeValue).toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-primary/5 border border-primary/10 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-primary">AI Insight</span>
              </div>
              <p className="text-sm text-foreground/80">This vehicle has strong market demand in your area. Suggest acquiring at trade value and retailing at ${data.retailValue.toLocaleString()} for a ${(data.retailValue - data.tradeValue).toLocaleString()} gross profit.</p>
            </div>
            <Badge variant="secondary" className="w-full justify-center py-2">2020 {data.make} {data.model} · {data.mileage} mi · VIN: {data.vin.slice(0, 8)}...</Badge>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setStep("scan"); setPhotos([]); setData(null); setVin(""); }} className="flex-1">
                <RotateCcw className="h-4 w-4 mr-2" /> New Appraisal
              </Button>
              <Button onClick={() => toast.success("Appraisal saved to deal!")} className="flex-1 bg-emerald-500 hover:bg-emerald-600">
                <Check className="h-4 w-4 mr-2" /> Save to Deal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
