import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { BrainCircuit, TrendingUp, TrendingDown, DollarSign, Clock, MapPin, ArrowUpRight, ArrowDownRight, Zap } from "lucide-react";
import { toast } from "sonner";

interface VehiclePricing {
  id: string;
  name: string;
  vin: string;
  currentPrice: number;
  aiSuggestedPrice: number;
  marketAvg: number;
  daysOnLot: number;
  competitors: number;
  priceStatus: "overpriced" | "underpriced" | "fair";
  image: string;
}

const VEHICLES: VehiclePricing[] = [
  { id: "v1", name: "2024 Luxury SUV", vin: "4T1B1111111111111", currentPrice: 42500, aiSuggestedPrice: 41000, marketAvg: 41800, daysOnLot: 12, competitors: 8, priceStatus: "overpriced", image: "https://vibe.filesafe.space/1778548756560730619/assets/23a6659c-d8fc-4cc7-b123-9979f0ad8d10.png" },
  { id: "v2", name: "2021 Sport Coupe", vin: "WBA11111111111111", currentPrice: 34500, aiSuggestedPrice: 33000, marketAvg: 33500, daysOnLot: 62, competitors: 15, priceStatus: "overpriced", image: "https://vibe.filesafe.space/1778548756560730619/assets/cf401772-605e-4d64-b3d3-953608639b6f.jpg" },
  { id: "v3", name: "2024 Family Sedan", vin: "1FTF2222222222222", currentPrice: 28900, aiSuggestedPrice: 29500, marketAvg: 29200, daysOnLot: 5, competitors: 6, priceStatus: "underpriced", image: "https://vibe.filesafe.space/1778548756560730619/assets/c6f562ab-1752-4862-aed2-588f83eff966.png" },
  { id: "v4", name: "2023 Premium EV", vin: "1N4BL111111111111", currentPrice: 52000, aiSuggestedPrice: 51800, marketAvg: 51900, daysOnLot: 18, competitors: 4, priceStatus: "fair", image: "https://vibe.filesafe.space/1778548756560730619/assets/c9058bfb-e16c-4a65-8c16-28cd3937e3c1.jpg" },
];

export default function InventoryPricing() {
  const [vehicles, setVehicles] = useState(VEHICLES);
  const [adjusting, setAdjusting] = useState<string | null>(null);

  const applyAIPrice = (id: string) => {
    setVehicles((prev) => prev.map((v) => v.id === id ? { ...v, currentPrice: v.aiSuggestedPrice } : v));
    toast.success("AI price applied!", { description: "Listed price updated across all platforms." });
  };

  const adjustPrice = (id: string, value: number) => {
    setVehicles((prev) => prev.map((v) => v.id === id ? { ...v, currentPrice: value } : v));
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <BrainCircuit className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">AI Inventory Pricing</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Market-driven pricing recommendations powered by AI</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Price Drops Needed</span>
            </div>
            <p className="text-2xl font-black text-destructive">{vehicles.filter(v => v.priceStatus === "overpriced").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Underpriced</span>
            </div>
            <p className="text-2xl font-black text-emerald-500">{vehicles.filter(v => v.priceStatus === "underpriced").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Fair Price</span>
            </div>
            <p className="text-2xl font-black text-primary">{vehicles.filter(v => v.priceStatus === "fair").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Avg Days on Lot</span>
            </div>
            <p className="text-2xl font-black text-amber-500">{Math.round(vehicles.reduce((a, v) => a + v.daysOnLot, 0) / vehicles.length)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vehicles.map((v) => {
          const diff = v.currentPrice - v.aiSuggestedPrice;
          const isOver = diff > 500;
          const isUnder = diff < -500;
          return (
            <Card key={v.id} className="overflow-hidden">
              <div className="flex gap-4 p-4">
                <div className="h-20 w-28 rounded-lg overflow-hidden bg-muted shrink-0">
                  <img src={v.image} alt={v.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm">{v.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{v.vin}</p>
                    </div>
                    <Badge className={`shrink-0 text-[10px] ${
                      v.priceStatus === "overpriced" ? "bg-destructive/10 text-destructive border-destructive/20" :
                      v.priceStatus === "underpriced" ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40" :
                      "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40"
                    }`}>
                      {v.priceStatus === "overpriced" ? "Overpriced" : v.priceStatus === "underpriced" ? "Underpriced" : "Fair Price"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-[10px]">
                    <div>
                      <p className="text-muted-foreground">Days on Lot</p>
                      <p className="font-bold">{v.daysOnLot}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Competitors</p>
                      <p className="font-bold">{v.competitors}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Market Avg</p>
                      <p className="font-bold">${(v.marketAvg / 1000).toFixed(1)}k</p>
                    </div>
                  </div>
                </div>
              </div>

              <CardContent className="px-4 pb-4 pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Current Price</p>
                    <p className="text-xl font-black">${v.currentPrice.toLocaleString()}</p>
                  </div>
                  <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
                    <div className="flex items-center gap-1 mb-1">
                      <Zap className="h-3 w-3 text-primary" />
                      <p className="text-[10px] text-primary uppercase tracking-wider font-bold">AI Suggested</p>
                    </div>
                    <p className="text-xl font-black text-primary">${v.aiSuggestedPrice.toLocaleString()}</p>
                  </div>
                </div>

                {isOver && (
                  <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 rounded-lg p-2">
                    <ArrowDownRight className="h-3.5 w-3.5" />
                    Drop by ${Math.abs(diff).toLocaleString()} to match market
                  </div>
                )}
                {isUnder && (
                  <div className="flex items-center gap-2 text-xs text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-2">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    Increase by ${Math.abs(diff).toLocaleString()} — you're leaving money on the table
                  </div>
                )}

                {adjusting === v.id ? (
                  <div className="space-y-2">
                    <Slider
                      min={Math.round(v.aiSuggestedPrice * 0.85)}
                      max={Math.round(v.aiSuggestedPrice * 1.15)}
                      step={100}
                      value={[v.currentPrice]}
                      onValueChange={(vals) => adjustPrice(v.id, vals[0])}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={() => { setAdjusting(null); toast.success("Price updated!"); }}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setAdjusting(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-primary" onClick={() => applyAIPrice(v.id)}>
                      <BrainCircuit className="h-3.5 w-3.5 mr-1.5" /> Apply AI Price
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setAdjusting(v.id)}>
                      Adjust
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
