import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScanLine, MapPin, Check, Camera, Package, AlertCircle, Zap, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface ScanResult {
  id: string;
  vin: string;
  stock: string;
  location: string;
  status: "found" | "missing" | "wrong_location";
  scanned: boolean;
}

const LOT_INVENTORY: ScanResult[] = [
  { id: "1", vin: "4T1B1111", stock: "STK-001", location: "Row A-12", status: "found", scanned: true },
  { id: "2", vin: "1FTF2222", stock: "STK-002", location: "Row A-15", status: "found", scanned: true },
  { id: "3", vin: "5J6R3333", stock: "STK-003", location: "Row B-08", status: "found", scanned: true },
  { id: "4", vin: "5YJ34444", stock: "STK-004", location: "Row B-10", status: "wrong_location", scanned: true },
  { id: "5", vin: "1N4BL111", stock: "STK-005", location: "Row C-01", status: "found", scanned: true },
  { id: "6", vin: "WBA1111", stock: "STK-006", location: "Row C-05", status: "missing", scanned: false },
  { id: "7", vin: "1C4HJ11", stock: "STK-007", location: "Row D-03", status: "found", scanned: true },
  { id: "8", vin: "2T3W111", stock: "STK-008", location: "Row D-07", status: "missing", scanned: false },
];

export default function LotScanner() {
  const [scanning, setScanning] = useState(false);
  const [inventory, setInventory] = useState(LOT_INVENTORY);

  const scannedCount = inventory.filter((i) => i.scanned).length;
  const issuesCount = inventory.filter((i) => i.status === "wrong_location" || i.status === "missing").length;

  const startScan = () => {
    setScanning(true);
    toast.info("Lot walk started", { description: "Scan inventory stickers to update location and status." });
    setTimeout(() => {
      setScanning(false);
      toast.success("Lot walk complete!", { description: `${scannedCount} vehicles scanned, ${issuesCount} issues found.` });
    }, 3000);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <ScanLine className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Lot Walk Scanner</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Scan inventory stickers to update location, status, and photos in bulk</p>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bold text-sm">Lot Walk Progress</p>
              <p className="text-xs text-muted-foreground">{scannedCount} of {inventory.length} vehicles scanned</p>
            </div>
            <div className="flex items-center gap-2">
              {issuesCount > 0 && (
                <Badge className="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40">
                  <AlertCircle className="h-3 w-3 mr-1" /> {issuesCount} issues
                </Badge>
              )}
              <Button size="sm" onClick={startScan} disabled={scanning}>
                {scanning ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <ScanLine className="h-4 w-4 mr-1.5" />}
                {scanning ? "Scanning..." : "Start Lot Walk"}
              </Button>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(scannedCount / inventory.length) * 100}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* Scanner View */}
      {scanning && (
        <Card>
          <CardContent className="p-0">
            <div className="relative aspect-video bg-slate-900 dark:bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center">
              <div className="text-center">
                <Camera className="h-12 w-12 text-white/30 mx-auto mb-2" />
                <p className="text-white/40 text-sm">Scanning... Point at inventory sticker</p>
              </div>
              <div className="absolute inset-x-8 top-1/2 h-0.5 bg-primary animate-pulse" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inventory Status</CardTitle>
          <CardDescription>Live update as you scan the lot</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {inventory.map((item) => (
              <div key={item.id} className="p-3 flex items-center gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${
                  item.status === "found" ? "bg-emerald-50 dark:bg-emerald-950/30" :
                  item.status === "wrong_location" ? "bg-amber-50 dark:bg-amber-950/30" :
                  "bg-destructive/10"
                }`}>
                  {item.scanned ? (
                    item.status === "found" ? <Check className="h-4 w-4 text-emerald-500" /> :
                    item.status === "wrong_location" ? <AlertCircle className="h-4 w-4 text-amber-500" /> :
                    <Package className="h-4 w-4 text-destructive" />
                  ) : (
                    <Package className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm font-mono">{item.stock} · {item.vin}...</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {item.location}
                    </span>
                    {item.status === "wrong_location" && (
                      <Badge className="text-[9px] bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40">
                        WRONG LOCATION
                      </Badge>
                    )}
                    {item.status === "missing" && (
                      <Badge className="text-[9px] bg-destructive/10 text-destructive border-destructive/20">
                        NOT FOUND
                      </Badge>
                    )}
                  </div>
                </div>
                {item.scanned && <Check className="h-4 w-4 text-emerald-500 shrink-0" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
