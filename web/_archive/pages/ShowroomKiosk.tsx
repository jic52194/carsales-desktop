import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Car, Search, MapPin, ChevronRight, CheckCircle2, RotateCcw, Scan, QrCode } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const INVENTORY = [
  { id: 1, year: 2024, make: "Ford", model: "F-150 Raptor", price: "$78,500", image: "https://vibe.filesafe.space/1778548756560730619/assets/e7287293-2c12-48a5-a982-ce6d9480ef35.png", type: "New", location: "Front Lot" },
  { id: 2, year: 2023, make: "Toyota", model: "Camry SE", price: "$26,900", image: "https://vibe.filesafe.space/1778548756560730619/assets/f142b3ca-7909-4c19-970a-c590cabb6515.png", type: "Used", location: "Row B" },
  { id: 3, year: 2024, make: "Tesla", model: "Model 3 Performance", price: "$52,990", image: "https://vibe.filesafe.space/1778548756560730619/assets/fea6a1a1-c1ca-4e7c-bcb6-ced02786663f.png", type: "New", location: "Showroom" },
];

export default function ShowroomKiosk() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [step, setStep] = useState<"browse" | "details" | "capture">("browse");
  const [formData, setFormData] = useState({ name: "", phone: "", email: "" });

  // Auto-reset kiosk after 60 seconds of inactivity
  useEffect(() => {
    const timer = setTimeout(() => {
      setSelectedVehicle(null);
      setStep("browse");
      setFormData({ name: "", phone: "", email: "" });
    }, 60000);
    return () => clearTimeout(timer);
  }, [step, selectedVehicle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("browse");
    setSelectedVehicle(null);
    setFormData({ name: "", phone: "", email: "" });
    // In a real app, this would submit to the CRM
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-950 text-white font-sans overflow-hidden relative">
      <div className="absolute inset-0 bg-[url('https://vibe.filesafe.space/1778548756560730619/assets/4ce7fbe5-5ab8-4c1a-a8a8-fce8d204a07f.png')] bg-cover bg-center opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />

      {/* Header */}
      <div className="relative z-10 p-8 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center">
            <Car className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">CarSales Motors</h1>
            <p className="text-primary font-bold tracking-widest uppercase text-sm">Interactive Showroom</p>
          </div>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" size="lg" className="border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/20 h-14 px-8 text-lg rounded-full" onClick={() => toast.success("Service QR Scanner Activated. Please scan your phone.")}>
            <Scan className="mr-2 h-5 w-5" /> Express Drop-off
          </Button>
          {step !== "browse" && (
            <Button variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10 h-14 px-8 text-lg rounded-full" onClick={() => { setStep("browse"); setSelectedVehicle(null); }}>
              <RotateCcw className="mr-2 h-5 w-5" /> Start Over
            </Button>
          )}
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto p-8">
        {step === "browse" && (
          <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-black">Find Your Perfect Vehicle</h2>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto">Browse our live inventory. Tap any vehicle to see details, pricing, and request a test drive.</p>
            </div>

            <div className="relative max-w-3xl mx-auto flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-6 top-6 h-8 w-8 text-slate-400" />
                <Input
                  placeholder="Search by make, model, or type..."
                  className="pl-20 h-20 text-2xl rounded-full bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus-visible:ring-primary focus-visible:ring-offset-0"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button className="h-20 px-8 text-xl rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shrink-0" onClick={() => {
                toast.success("QR Scanner Activated", { description: "Scan the QR code on any vehicle window to desk your own deal." });
              }}>
                <QrCode className="mr-2 h-6 w-6" /> Scan Window QR
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {INVENTORY.map((vehicle) => (
                <Card 
                  key={vehicle.id} 
                  className="bg-white/5 border-white/10 overflow-hidden cursor-pointer hover:bg-white/10 hover:border-primary/50 transition-all duration-300 group"
                  onClick={() => { setSelectedVehicle(vehicle); setStep("details"); }}
                >
                  <div className="aspect-[4/3] bg-black/50 relative overflow-hidden">
                    <img src={vehicle.image} alt={vehicle.model} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute top-4 right-4 bg-primary text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                      {vehicle.type}
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-2xl font-black text-white">{vehicle.year} {vehicle.make}</h3>
                    <p className="text-xl text-slate-300 font-medium">{vehicle.model}</p>
                    <div className="mt-6 flex items-center justify-between">
                      <span className="text-3xl font-black text-primary">{vehicle.price}</span>
                      <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                        <ChevronRight className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {step === "details" && selectedVehicle && (
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500 flex flex-col lg:flex-row gap-12 items-start h-full">
            <div className="flex-1 w-full space-y-6">
              <div className="relative">
                <div className="aspect-[4/3] rounded-3xl overflow-hidden border-4 border-white/10 shadow-2xl relative bg-black/50 group">
                  <img src={selectedVehicle.image} alt={selectedVehicle.model} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
                    <Button variant="outline" className="bg-white/10 border-white/20 text-white rounded-full h-16 px-8 text-lg" onClick={() => toast.success("Interactive 3D Explorer Launched")}>
                      <RotateCcw className="mr-2 h-6 w-6" /> Explore 3D Model
                    </Button>
                  </div>
                </div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-white/20 rounded-full px-8 py-4 flex items-center gap-3 shadow-xl">
                  <MapPin className="h-6 w-6 text-primary" />
                  <span className="text-lg font-bold text-white">Located at: {selectedVehicle.location}</span>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-8 bg-black/40 p-8 rounded-3xl border border-white/10 backdrop-blur-md">
              <div>
                <div className="inline-block bg-primary/20 text-primary font-black px-4 py-1.5 rounded-full uppercase tracking-widest text-sm mb-4">
                  {selectedVehicle.type} Vehicle
                </div>
                <h2 className="text-6xl font-black text-white leading-tight">{selectedVehicle.year} {selectedVehicle.make}</h2>
                <h3 className="text-4xl font-bold text-slate-400 mt-2">{selectedVehicle.model}</h3>
              </div>
              <div className="text-6xl font-black text-primary drop-shadow-[0_0_15px_rgba(37,99,235,0.5)]">
                {selectedVehicle.price}
              </div>
              
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h4 className="text-xl font-bold text-white">Build & Price</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="h-16 justify-start px-6 border-white/20 text-white hover:bg-white/10" onClick={() => toast.success("Added Premium Audio Package (+$1,200)")}>
                    + Premium Audio
                  </Button>
                  <Button variant="outline" className="h-16 justify-start px-6 border-white/20 text-white hover:bg-white/10" onClick={() => toast.success("Added 20' Black Wheels (+$800)")}>
                    + 20" Black Wheels
                  </Button>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/10">
                <h4 className="text-xl font-bold text-white">F&I Self-Service Menu</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => toast.success("Added Extended Warranty (+$45/mo)")}>
                    <div>
                      <p className="font-bold text-white">Extended Warranty</p>
                      <p className="text-sm text-slate-400">5yr / 60k miles coverage</p>
                    </div>
                    <span className="text-primary font-bold">+$45/mo</span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => toast.success("Added GAP Coverage (+$12/mo)")}>
                    <div>
                      <p className="font-bold text-white">GAP Coverage</p>
                      <p className="text-sm text-slate-400">Protect your investment</p>
                    </div>
                    <span className="text-primary font-bold">+$12/mo</span>
                  </div>
                </div>
              </div>

              <div className="pt-8 grid grid-cols-2 gap-4">
                <Button className="h-20 text-2xl font-bold rounded-2xl bg-white text-black hover:bg-slate-200" onClick={() => setStep("capture")}>
                  Test Drive
                </Button>
                <Button className="h-20 text-2xl font-bold rounded-2xl bg-primary text-white hover:bg-primary/90" onClick={() => setStep("capture")}>
                  Get E-Price
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "capture" && (
          <div className="max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-500 h-full flex items-center justify-center">
            <Card className="w-full bg-slate-900/80 backdrop-blur-xl border-white/10 shadow-2xl rounded-3xl overflow-hidden">
              <CardContent className="p-12 space-y-8">
                <div className="text-center space-y-4">
                  <div className="mx-auto h-20 w-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="h-10 w-10 text-primary" />
                  </div>
                  <h2 className="text-4xl font-black text-white">Great Choice!</h2>
                  <p className="text-xl text-slate-400">Enter your info below and a product specialist will bring the keys right to you.</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <Input 
                      placeholder="Full Name" 
                      required 
                      className="h-20 text-2xl rounded-2xl bg-black/50 border-white/10 text-white placeholder:text-slate-600 px-6"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                    <Input 
                      placeholder="Mobile Phone" 
                      type="tel" 
                      required 
                      className="h-20 text-2xl rounded-2xl bg-black/50 border-white/10 text-white placeholder:text-slate-600 px-6"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <Button type="submit" className="w-full h-24 text-3xl font-black rounded-2xl bg-primary text-white hover:bg-primary/90 shadow-[0_0_30px_rgba(37,99,235,0.4)]">
                    Notify Staff Now
                  </Button>
                  <Button className="w-full h-20 text-2xl font-bold rounded-2xl bg-slate-800 text-white hover:bg-slate-700" onClick={(e) => { e.preventDefault(); toast.success("Digital Test Drive Waiver Signed"); }}>
                    Sign Digital Waiver
                  </Button>
                </form>
                <p className="text-center text-slate-500 text-sm font-medium">
                  By submitting, you agree to the test drive terms and to receive SMS updates.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}