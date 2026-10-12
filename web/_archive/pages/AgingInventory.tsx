import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, AlertCircle, TrendingDown, DollarSign, Bell, BellRing, Search, ChevronDown, ChevronUp, Tag, Car, X, CheckCircle2, ArrowUpDown, Filter, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Vehicle {
  id: string;
  stock: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  vin: string;
  color: string;
  daysInStock: number;
  listPrice: number;
  cost: number;
  mileage: number;
  status: "Available" | "Pending" | "In Recon" | "Price Reduced";
  leads: number;
  location: string;
  image: string;
  alertFired: boolean;
}

const MOCK_INVENTORY: Vehicle[] = [
  { id: "v1", stock: "A1042", year: 2021, make: "Ford", model: "F-150", trim: "XLT", vin: "1FTFW1ET5MFA12345", color: "Carbonized Gray", daysInStock: 67, listPrice: 38900, cost: 34200, mileage: 28400, status: "Available", leads: 3, location: "Lot A", image: "https://vibe.filesafe.space/1778548756560730619/assets/fd0b15b2-75c0-4b76-ab2a-18cc70c50c8b.png", alertFired: true },
  { id: "v2", stock: "A1055", year: 2020, make: "Chevrolet", model: "Silverado", trim: "LT", vin: "3GCPWCED6LG234567", color: "Summit White", daysInStock: 53, listPrice: 33500, cost: 29800, mileage: 41200, status: "Available", leads: 1, location: "Lot B", image: "https://vibe.filesafe.space/1778548756560730619/assets/572f27c2-49e4-4c2d-9203-7004e51c186e.png", alertFired: true },
  { id: "v3", stock: "A1061", year: 2019, make: "Toyota", model: "Camry", trim: "SE", vin: "4T1B11HK5KU345678", color: "Blueprint", daysInStock: 91, listPrice: 22400, cost: 19500, mileage: 55300, status: "Price Reduced", leads: 2, location: "Lot A", image: "https://vibe.filesafe.space/1778548756560730619/assets/7d4e5561-f29c-40be-b7ce-f226b12d1c8a.png", alertFired: true },
  { id: "v4", stock: "A1078", year: 2022, make: "Honda", model: "CR-V", trim: "EX", vin: "5J6RW2H5XNA456789", color: "Radiant Red", daysInStock: 47, listPrice: 29800, cost: 26100, mileage: 18900, status: "Available", leads: 5, location: "Showroom", image: "https://vibe.filesafe.space/1778548756560730619/assets/25c206a6-1cd3-4eaf-8ac5-b936b7e5afe2.png", alertFired: true },
  { id: "v5", stock: "A1083", year: 2021, make: "Jeep", model: "Grand Cherokee", trim: "Laredo", vin: "1C4RJEAG8MC567890", color: "Bright White", daysInStock: 72, listPrice: 35200, cost: 31000, mileage: 33700, status: "Available", leads: 0, location: "Lot C", image: "https://vibe.filesafe.space/1778548756560730619/assets/11d6e3db-c00a-4583-bd89-bdceea171fc5.png", alertFired: true },
  { id: "v6", stock: "A1091", year: 2023, make: "Tesla", model: "Model 3", trim: "Long Range", vin: "5YJ3E1EA0PF678901", color: "Pearl White", daysInStock: 12, listPrice: 47500, cost: 43000, mileage: 2100, status: "Available", leads: 11, location: "Showroom", image: "https://vibe.filesafe.space/1778548756560730619/assets/fa599a2b-25ca-400a-b8f4-a045176432c7.png", alertFired: false },
  { id: "v7", stock: "A1099", year: 2020, make: "BMW", model: "5 Series", trim: "530i", vin: "WBAJA5C51KWW89012", color: "Mineral Gray", daysInStock: 88, listPrice: 41000, cost: 36800, mileage: 48200, status: "Price Reduced", leads: 2, location: "Lot A", image: "https://vibe.filesafe.space/1778548756560730619/assets/a71f5a73-7eba-40a2-bc72-65a82205e8e1.png", alertFired: true },
  { id: "v8", stock: "A1104", year: 2022, make: "Ram", model: "1500", trim: "Big Horn", vin: "1C6SRFBT3NN890123", color: "Diamond Black", daysInStock: 31, listPrice: 44200, cost: 39500, mileage: 14600, status: "Pending", leads: 4, location: "Lot B", image: "https://vibe.filesafe.space/1778548756560730619/assets/089ad3ce-dfc4-4b69-aa04-2995348f54f5.png", alertFired: false },
  { id: "v9", stock: "A1108", year: 2019, make: "Nissan", model: "Rogue", trim: "SV", vin: "KNMAT2MT0KP901234", color: "Glacier White", daysInStock: 59, listPrice: 19900, cost: 16800, mileage: 62100, status: "Available", leads: 1, location: "Lot C", image: "https://vibe.filesafe.space/1778548756560730619/assets/f6d489e1-9d2d-4547-b012-0ee18892f521.png", alertFired: true },
  { id: "v10", stock: "A1115", year: 2023, make: "Hyundai", model: "Tucson", trim: "Limited", vin: "5NMJE3AE0PH012345", color: "Shimmering Silver", daysInStock: 8, listPrice: 34600, cost: 30200, mileage: 950, status: "In Recon", leads: 0, location: "Recon", image: "https://vibe.filesafe.space/1778548756560730619/assets/c4e3b7ac-247e-4cc9-904b-9b69bc8fec01.png", alertFired: false },
  { id: "v11", stock: "A1122", year: 2020, make: "Dodge", model: "Charger", trim: "R/T", vin: "2C3CDZBT3LH123456", color: "TorRed", daysInStock: 104, listPrice: 31500, cost: 27900, mileage: 38400, status: "Price Reduced", leads: 3, location: "Lot A", image: "https://vibe.filesafe.space/1778548756560730619/assets/c1028cfd-6b46-437a-8ce4-172aa3c9cce3.png", alertFired: true },
  { id: "v12", stock: "A1130", year: 2022, make: "Kia", model: "Telluride", trim: "EX", vin: "5XYP6DHC0NG234567", color: "Gravity Gray", daysInStock: 22, listPrice: 43800, cost: 39100, mileage: 11200, status: "Available", leads: 7, location: "Showroom", image: "https://vibe.filesafe.space/1778548756560730619/assets/264ec821-4fd5-4910-8b4c-cd1019bba8e0.png", alertFired: false },
];

const THRESHOLD = 45;
const CARRYING_COST_PER_DAY = 35;

const getDaysColor = (days: number) => {
  if (days >= 90) return "text-destructive";
  if (days >= 60) return "text-amber-600 dark:text-amber-400";
  if (days >= 45) return "text-yellow-600 dark:text-yellow-400";
  return "text-success";
};

const getDaysBadge = (days: number) => {
  if (days >= 90) return "bg-destructive/10 text-destructive border-destructive/20";
  if (days >= 60) return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
  if (days >= 45) return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
  return "bg-success/10 text-success border-success/20";
};

const getDaysLabel = (days: number) => {
  if (days >= 90) return "Critical";
  if (days >= 60) return "At Risk";
  if (days >= 45) return "Alert";
  return "Fresh";
};

export default function AgingInventory() {
  const [inventory, setInventory] = useState<Vehicle[]>(MOCK_INVENTORY);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAge, setFilterAge] = useState("all");
  const [sortBy, setSortBy] = useState<"days" | "price" | "leads">("days");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [alertOpen, setAlertOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [newThresholdCrossings, setNewThresholdCrossings] = useState<Vehicle[]>([]);
  const alertTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simulationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Simulate real-time day counter incrementing to demo threshold crossing
  useEffect(() => {
    // Show initial alert banner for already-aged vehicles after 2 seconds
    const initialTimer = setTimeout(() => {
      const aged = inventory.filter(v => v.daysInStock >= THRESHOLD && !dismissedAlerts.has(v.id));
      if (aged.length > 0) {
        toast.warning(
          `${aged.length} vehicles have crossed the ${THRESHOLD}-day threshold and need attention.`,
          {
            icon: <BellRing className="h-4 w-4 text-amber-500" />,
            duration: 6000,
            action: {
              label: "Review Now",
              onClick: () => setFilterAge("aged"),
            },
          }
        );
      }
    }, 2000);

    // Simulate a new vehicle crossing the 45-day mark every 45 seconds for demo
    simulationRef.current = setInterval(() => {
      setInventory(prev => {
        const freshVehicle = prev.find(v => v.daysInStock < THRESHOLD && !v.alertFired);
        if (!freshVehicle) return prev;

        const updated = prev.map(v =>
          v.id === freshVehicle.id ? { ...v, daysInStock: THRESHOLD, alertFired: true } : v
        );

        // Fire the threshold alert toast
        setTimeout(() => {
          toast.error(
            `🚨 Inventory Alert: ${freshVehicle.year} ${freshVehicle.make} ${freshVehicle.model} (Stock #${freshVehicle.stock}) just crossed ${THRESHOLD} days in stock!`,
            {
              duration: 8000,
              action: {
                label: "View Vehicle",
                onClick: () => {
                  setSelectedVehicle({ ...freshVehicle, daysInStock: THRESHOLD, alertFired: true });
                  setAlertOpen(true);
                },
              },
            }
          );
          setNewThresholdCrossings(c => [...c, { ...freshVehicle, daysInStock: THRESHOLD }]);
        }, 100);

        return updated;
      });
    }, 45000);

    return () => {
      clearTimeout(initialTimer);
      if (simulationRef.current) clearInterval(simulationRef.current);
    };
  }, []);

  const agedVehicles = inventory.filter(v => v.daysInStock >= THRESHOLD);
  const criticalVehicles = inventory.filter(v => v.daysInStock >= 90);
  const over60 = inventory.filter(v => v.daysInStock >= 60);
  const totalCarryingCost = agedVehicles.reduce((sum, v) => sum + (v.daysInStock - THRESHOLD) * CARRYING_COST_PER_DAY, 0);
  const potentialLoss = criticalVehicles.reduce((sum, v) => sum + Math.max(0, v.listPrice - v.cost - v.daysInStock * CARRYING_COST_PER_DAY), 0);

  const filtered = inventory
    .filter(v => {
      const q = search.toLowerCase();
      const matchesSearch = !q || `${v.year} ${v.make} ${v.model} ${v.stock} ${v.vin}`.toLowerCase().includes(q);
      const matchesStatus = filterStatus === "all" || v.status === filterStatus;
      const matchesAge =
        filterAge === "all" ? true :
        filterAge === "fresh" ? v.daysInStock < THRESHOLD :
        filterAge === "aged" ? v.daysInStock >= THRESHOLD :
        filterAge === "critical" ? v.daysInStock >= 90 : true;
      return matchesSearch && matchesStatus && matchesAge;
    })
    .sort((a, b) => {
      let diff = 0;
      if (sortBy === "days") diff = a.daysInStock - b.daysInStock;
      else if (sortBy === "price") diff = a.listPrice - b.listPrice;
      else if (sortBy === "leads") diff = a.leads - b.leads;
      return sortDir === "desc" ? -diff : diff;
    });

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const handleMarkdown = (vehicle: Vehicle) => {
    const suggested = Math.round(vehicle.listPrice * 0.95 / 100) * 100;
    toast.success(`Price reduction queued for ${vehicle.year} ${vehicle.make} ${vehicle.model}: ${formatCurrency(vehicle.listPrice)} → ${formatCurrency(suggested)}`, { duration: 5000 });
    setInventory(prev => prev.map(v => v.id === vehicle.id ? { ...v, listPrice: suggested, status: "Price Reduced" } : v));
    setAlertOpen(false);
  };

  const formatCurrency = (n: number) => `$${n.toLocaleString()}`;

  const stats = [
    { label: "Over 45 Days", val: agedVehicles.length.toString(), icon: Clock, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
    { label: "Over 60 Days", val: over60.length.toString(), icon: AlertCircle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    { label: "Over 90 Days (Critical)", val: criticalVehicles.length.toString(), icon: BellRing, color: "text-destructive", bg: "bg-destructive/10 border-destructive/20" },
    { label: "Extra Carrying Costs", val: formatCurrency(totalCarryingCost), icon: DollarSign, color: "text-destructive", bg: "bg-destructive/10 border-destructive/20" },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Aging Inventory</h1>
          <p className="text-sm text-muted-foreground mt-1">Vehicles crossing {THRESHOLD} days trigger automatic alerts. Act fast to protect gross.</p>
        </div>
        <div className="flex items-center gap-2">
          {newThresholdCrossings.length > 0 && (
            <Badge className="bg-destructive/10 text-destructive border border-destructive/20 animate-pulse gap-1.5 px-3 py-1.5">
              <BellRing className="h-3.5 w-3.5" />
              {newThresholdCrossings.length} New Alert{newThresholdCrossings.length > 1 ? "s" : ""}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20"
            onClick={() => {
              toast.success("Lot Heatmap Generated", { description: "Visual grid of the physical dealership lot showing cars >60 days glowing red." });
            }}
          >
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Lot Heatmap</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              toast.info(`Aging report emailed to GM and Sales Manager.`, { duration: 4000 });
            }}
          >
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Send Report</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className={`border ${stat.bg}`}>
            <CardContent className="p-4 md:p-5">
              <div className="flex items-start justify-between mb-3">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="text-xs text-muted-foreground font-medium mb-1">{stat.label}</p>
              <p className={`text-xl md:text-2xl font-bold ${stat.color}`}>{stat.val}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Threshold Alerts Banner */}
      {agedVehicles.filter(v => !dismissedAlerts.has(v.id) && v.daysInStock >= 45 && v.daysInStock < 60).length > 0 && (
        <Card className="border border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <BellRing className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                {agedVehicles.filter(v => v.daysInStock >= 45 && v.daysInStock < 60).length} vehicles just crossed the 45-day mark
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                Consider price reductions or wholesale moves to avoid further carrying costs.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-yellow-700"
              onClick={() => {
                agedVehicles.filter(v => v.daysInStock >= 45 && v.daysInStock < 60).forEach(v =>
                  setDismissedAlerts(prev => new Set([...prev, v.id]))
                );
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by stock #, year, make, model, VIN..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterAge} onValueChange={setFilterAge}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Age Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ages</SelectItem>
                <SelectItem value="fresh">Fresh (Under 45)</SelectItem>
                <SelectItem value="aged">Aged (45+ Days)</SelectItem>
                <SelectItem value="critical">Critical (90+ Days)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Recon">In Recon</SelectItem>
                <SelectItem value="Price Reduced">Price Reduced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Table / Cards */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Inventory Aging Report</CardTitle>
            <CardDescription>{filtered.length} vehicles shown — sorted by {sortBy}</CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <button onClick={() => handleSort("days")} className="flex items-center gap-1 hover:text-foreground transition-colors font-medium">
              Days <ArrowUpDown className="h-3 w-3" />
            </button>
            <button onClick={() => handleSort("price")} className="flex items-center gap-1 hover:text-foreground transition-colors font-medium">
              Price <ArrowUpDown className="h-3 w-3" />
            </button>
            <button onClick={() => handleSort("leads")} className="flex items-center gap-1 hover:text-foreground transition-colors font-medium">
              Leads <ArrowUpDown className="h-3 w-3" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground w-[220px]">Vehicle</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Stock #</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => handleSort("days")}>
                    <span className="flex items-center justify-end gap-1">Days <ArrowUpDown className="h-3.5 w-3.5" /></span>
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => handleSort("price")}>
                    <span className="flex items-center justify-end gap-1">List Price <ArrowUpDown className="h-3.5 w-3.5" /></span>
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Carrying Cost</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => handleSort("leads")}>
                    <span className="flex items-center justify-end gap-1">Leads <ArrowUpDown className="h-3.5 w-3.5" /></span>
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(v => {
                  const carryExtra = Math.max(0, v.daysInStock - THRESHOLD) * CARRYING_COST_PER_DAY;
                  return (
                    <tr key={v.id} className={`hover:bg-muted/30 transition-colors ${v.daysInStock >= 90 ? 'bg-destructive/5' : v.daysInStock >= 45 ? 'bg-amber-500/5' : ''}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-14 rounded-md overflow-hidden bg-muted shrink-0">
                            <img src={v.image} alt={v.model} className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{v.year} {v.make} {v.model}</p>
                            <p className="text-xs text-muted-foreground truncate">{v.trim} · {v.color}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{v.stock}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs">
                          {v.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-base font-bold ${getDaysColor(v.daysInStock)}`}>{v.daysInStock}</span>
                          <Badge variant="outline" className={`text-[10px] font-bold px-1.5 py-0 ${getDaysBadge(v.daysInStock)}`}>
                            {getDaysLabel(v.daysInStock)}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">{formatCurrency(v.listPrice)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={carryExtra > 0 ? "text-destructive font-semibold" : "text-muted-foreground"}>
                          {carryExtra > 0 ? `+${formatCurrency(carryExtra)}` : "—"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={v.leads === 0 ? "text-destructive font-bold" : "text-foreground font-semibold"}>{v.leads}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant={v.daysInStock >= 45 ? "default" : "outline"}
                          className="h-7 text-xs"
                          onClick={() => { setSelectedVehicle(v); setAlertOpen(true); }}
                        >
                          {v.daysInStock >= 45 ? "Take Action" : "View"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-border">
            {filtered.map(v => {
              const carryExtra = Math.max(0, v.daysInStock - THRESHOLD) * CARRYING_COST_PER_DAY;
              return (
                <div
                  key={v.id}
                  className={`p-4 flex items-start gap-3 ${v.daysInStock >= 90 ? 'bg-destructive/5' : v.daysInStock >= 45 ? 'bg-amber-500/5' : ''}`}
                  onClick={() => { setSelectedVehicle(v); setAlertOpen(true); }}
                >
                  <div className="h-14 w-20 rounded-md overflow-hidden bg-muted shrink-0">
                    <img src={v.image} alt={v.model} className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm text-foreground">{v.year} {v.make} {v.model}</p>
                        <p className="text-xs text-muted-foreground">#{v.stock} · {v.mileage.toLocaleString()} mi</p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] font-bold shrink-0 ${getDaysBadge(v.daysInStock)}`}>
                        {v.daysInStock}d
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-sm font-bold">{formatCurrency(v.listPrice)}</span>
                      {carryExtra > 0 && <span className="text-xs text-destructive font-medium">+{formatCurrency(carryExtra)} carrying</span>}
                      <span className="text-xs text-muted-foreground">{v.leads} leads</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-success" />
              <p className="font-semibold">No vehicles match your filters</p>
              <p className="text-sm mt-1">Adjust the age or status filter to see more results.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={alertOpen} onOpenChange={setAlertOpen}>
        <DialogContent className="max-w-lg">
          {selectedVehicle && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedVehicle.daysInStock >= 45 && <AlertCircle className={`h-5 w-5 ${getDaysColor(selectedVehicle.daysInStock)}`} />}
                  {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                </DialogTitle>
                <DialogDescription>
                  Stock #{selectedVehicle.stock} · {selectedVehicle.vin}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="h-40 rounded-xl overflow-hidden bg-muted">
                  <img src={selectedVehicle.image} alt={selectedVehicle.model} className="w-full h-full object-cover" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Days In Stock", val: selectedVehicle.daysInStock.toString(), highlight: selectedVehicle.daysInStock >= THRESHOLD },
                    { label: "List Price", val: formatCurrency(selectedVehicle.listPrice), highlight: false },
                    { label: "Cost Basis", val: formatCurrency(selectedVehicle.cost), highlight: false },
                    { label: "Active Leads", val: selectedVehicle.leads.toString(), highlight: selectedVehicle.leads === 0 },
                    { label: "Mileage", val: `${selectedVehicle.mileage.toLocaleString()} mi`, highlight: false },
                    { label: "Extra Carrying", val: `+${formatCurrency(Math.max(0, selectedVehicle.daysInStock - THRESHOLD) * CARRYING_COST_PER_DAY)}`, highlight: selectedVehicle.daysInStock >= THRESHOLD },
                  ].map((item, i) => (
                    <div key={i} className={`p-3 rounded-lg border ${item.highlight ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-muted/30'}`}>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className={`font-bold mt-0.5 ${item.highlight ? 'text-destructive' : 'text-foreground'}`}>{item.val}</p>
                    </div>
                  ))}
                </div>

                {selectedVehicle.daysInStock >= THRESHOLD && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">Recommended Actions</p>
                    <div className="space-y-2">
                      <Button className="w-full justify-start gap-3" onClick={() => handleMarkdown(selectedVehicle)}>
                        <Tag className="h-4 w-4" />
                        Apply 5% Price Reduction ({formatCurrency(Math.round(selectedVehicle.listPrice * 0.95 / 100) * 100)})
                      </Button>
                      <Button variant="outline" className="w-full justify-start gap-3" onClick={() => {
                        toast.success(`${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model} queued for Spiff promotion.`);
                        setAlertOpen(false);
                      }}>
                        <DollarSign className="h-4 w-4" />
                        Add Salesperson Spiff Incentive
                      </Button>
                      <Button variant="outline" className="w-full justify-start gap-3" onClick={() => {
                        toast.success(`${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model} moved to wholesale queue.`);
                        setAlertOpen(false);
                      }}>
                        <Car className="h-4 w-4" />
                        Move to Wholesale Queue
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
