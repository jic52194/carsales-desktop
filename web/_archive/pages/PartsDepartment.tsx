import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Package, ShoppingCart, TrendingUp, Scan, BrainCircuit, AlertCircle, CheckCircle2, ClipboardList } from "lucide-react";
import { formatCurrency } from "@/lib/calculations";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

const MOCK_INVENTORY = [
  { id: "PT-1001", name: "Oil Filter - Synthetic", bin: "A-12-04", onHand: 45, reorderPoint: 20, cost: 4.50, retail: 12.99, category: "Maintenance" },
  { id: "PT-1002", name: "Air Filter - Cabin", bin: "B-05-11", onHand: 12, reorderPoint: 15, cost: 8.75, retail: 24.50, category: "Maintenance" },
  { id: "PT-2055", name: "Brake Pads - Front (Ceramic)", bin: "C-01-02", onHand: 8, reorderPoint: 10, cost: 35.00, retail: 89.99, category: "Brakes" },
  { id: "PT-3099", name: "Spark Plug - Iridium", bin: "A-08-15", onHand: 120, reorderPoint: 50, cost: 6.25, retail: 18.50, category: "Ignition" },
  { id: "PT-4102", name: "Alternator Assembly", bin: "D-14-01", onHand: 2, reorderPoint: 3, cost: 145.00, retail: 320.00, category: "Electrical" },
];

export default function PartsDepartment() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [aiSuggestions, setAiSuggestions] = useState(false);
  const [serviceRequests, setServiceRequests] = useState<any[]>([]);

  useEffect(() => {
    const loadRequests = () => {
      const saved = JSON.parse(localStorage.getItem('vibe_parts_requests') || '[]');
      setServiceRequests(saved);
    };
    loadRequests();
    
    window.addEventListener('storage', loadRequests);
    return () => window.removeEventListener('storage', loadRequests);
  }, []);

  const fulfillRequest = (id: string) => {
    const updated = serviceRequests.map(r => r.id === id ? { ...r, status: "Fulfilled" } : r);
    setServiceRequests(updated);
    localStorage.setItem('vibe_parts_requests', JSON.stringify(updated));
    toast.success("Request marked as fulfilled");
  };

  const simulateAiIdentification = () => {
    setIsScanning(true);
    setScanProgress(0);
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        clearInterval(interval);
        setScanProgress(100);
        setTimeout(() => {
          setIsScanning(false);
          setSearchTerm("PT-2055");
          toast.success("AI successfully identified part: Front Ceramic Brake Pads", {
            icon: <BrainCircuit className="w-4 h-4 text-primary" />
          });
        }, 500);
      } else {
        setScanProgress(progress);
      }
    }, 200);
  };

  const simulateAiForecasting = () => {
    setAiSuggestions(true);
    toast.info("AI generated reorder suggestions based on seasonal trends and upcoming service appointments.", {
      icon: <BrainCircuit className="w-4 h-4 text-primary" />
    });
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parts Department</h1>
          <p className="text-muted-foreground">Manage inventory, counter sales, and ordering</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-400 dark:hover:bg-indigo-900/30" onClick={() => {
            toast.success("AI Price Match: Found 3 local competitors. Adjusted retail pricing to remain competitive while maintaining margin.", {
              icon: <BrainCircuit className="w-4 h-4 text-indigo-500" />
            });
          }}>
            <BrainCircuit className="w-4 h-4 mr-2" /> 
            AI Price Match
          </Button>
          <Button variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20" onClick={simulateAiIdentification}>
            <Scan className="w-4 h-4 mr-2" /> 
            AI Part Scanner
          </Button>
          <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-900/30" onClick={() => {
            toast.success("Parts Arrival SMS Sent", { description: "Auto-texted 3 customers that their special order parts have arrived." });
          }}>
            <Package className="w-4 h-4 mr-2" /> Receive Special Orders
          </Button>
          <Button><Plus className="w-4 h-4 mr-2" /> New Ticket</Button>
        </div>
      </div>

      {isScanning && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-primary/20 rounded-xl animate-pulse"></div>
                <div className="absolute inset-0 border-t-4 border-primary rounded-xl animate-spin" style={{ animationDuration: '2s' }}></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Scan className="w-6 h-6 text-primary animate-pulse" />
                </div>
              </div>
              <h3 className="text-lg font-semibold">AI Computer Vision analyzing part geometry...</h3>
              <Progress value={scanProgress} className="h-2 w-full max-w-md" />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Parts Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(124500.50)}</div>
            <p className="text-xs text-muted-foreground mt-1">Cost basis in stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Counter Sales (Today)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(3240.00)}</div>
            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" /> +12% vs yesterday
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">24</div>
            <p className="text-xs text-muted-foreground mt-1">SKUs below reorder point</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary flex items-center gap-2">
              <BrainCircuit className="w-4 h-4" /> AI Demand Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">High</div>
            <p className="text-xs text-primary/80 mt-1">Winter maintenance spike predicted</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="grid w-full grid-cols-5 max-w-[1000px]">
          <TabsTrigger value="inventory"><Package className="w-4 h-4 mr-2" /> Inventory</TabsTrigger>
          <TabsTrigger value="counter"><ShoppingCart className="w-4 h-4 mr-2" /> Counter Sales</TabsTrigger>
          <TabsTrigger value="ordering"><TrendingUp className="w-4 h-4 mr-2" /> Ordering & Receiving</TabsTrigger>
          <TabsTrigger value="requests"><ClipboardList className="w-4 h-4 mr-2" /> Service Requests</TabsTrigger>
          <TabsTrigger value="pricing"><BrainCircuit className="w-4 h-4 mr-2" /> Dynamic Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Parts Master</CardTitle>
                  <CardDescription>Manage your physical inventory and bin locations</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by part # or name..." 
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part #</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Bin Loc</TableHead>
                      <TableHead className="text-right">On Hand</TableHead>
                      <TableHead className="text-right">Retail Price</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_INVENTORY.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toLowerCase().includes(searchTerm.toLowerCase())).map((part) => (
                      <TableRow key={part.id}>
                        <TableCell className="font-medium">{part.id}</TableCell>
                        <TableCell>{part.name}</TableCell>
                        <TableCell>{part.category}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">{part.bin}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={part.onHand <= part.reorderPoint ? "text-destructive font-bold" : ""}>
                            {part.onHand}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(part.retail)}</TableCell>
                        <TableCell>
                          {part.onHand <= part.reorderPoint ? (
                            <Badge variant="destructive" className="flex w-fit items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Reorder
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> In Stock
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="counter" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Counter Point of Sale</CardTitle>
              <CardDescription>Process walk-in and wholesale parts sales</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                <ShoppingCart className="w-12 h-12 mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold text-foreground">Start a New Sale Ticket</h3>
                <p className="max-w-sm mt-2 mb-6">Scan barcodes or manually enter part numbers to build an invoice for a customer.</p>
                <Button><Plus className="w-4 h-4 mr-2" /> Create Ticket</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ordering" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Purchase Orders</h2>
            <Button variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20" onClick={simulateAiForecasting}>
              <BrainCircuit className="w-4 h-4 mr-2" />
              Generate AI Reorder List
            </Button>
          </div>
          
          {aiSuggestions && (
            <Card className="border-primary/30 bg-primary/5 shadow-md shadow-primary/5">
              <CardHeader className="pb-2 border-b border-primary/10">
                <CardTitle className="text-base text-primary flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5" /> AI Recommended Stock Order
                </CardTitle>
                <CardDescription className="text-primary/70">
                  Based on historical velocity, upcoming service appointments, and local weather forecasts.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-primary/10">
                      <TableHead className="text-primary/70">Part</TableHead>
                      <TableHead className="text-primary/70">Reasoning</TableHead>
                      <TableHead className="text-right text-primary/70">Suggested Qty</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-primary/10 border-primary/10">
                      <TableCell className="font-medium">PT-2055 Brake Pads</TableCell>
                      <TableCell className="text-sm text-muted-foreground">8 brake jobs scheduled this week</TableCell>
                      <TableCell className="text-right font-bold">12</TableCell>
                      <TableCell className="text-right"><Button size="sm" variant="outline" className="h-7 border-primary/20 hover:bg-primary hover:text-primary-foreground">Add to PO</Button></TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-primary/10 border-primary/10">
                      <TableCell className="font-medium">PT-9988 Winter Wiper Blades</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Snow forecasted in 4 days</TableCell>
                      <TableCell className="text-right font-bold">40</TableCell>
                      <TableCell className="text-right"><Button size="sm" variant="outline" className="h-7 border-primary/20 hover:bg-primary hover:text-primary-foreground">Add to PO</Button></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Date Created</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">PO-2024-089</TableCell>
                    <TableCell>NAPA Auto Parts</TableCell>
                    <TableCell>Oct 24, 2024</TableCell>
                    <TableCell>Oct 26, 2024</TableCell>
                    <TableCell className="text-right">{formatCurrency(1245.50)}</TableCell>
                    <TableCell><Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200">In Transit</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">PO-2024-088</TableCell>
                    <TableCell>OEM Direct</TableCell>
                    <TableCell>Oct 22, 2024</TableCell>
                    <TableCell>Oct 24, 2024</TableCell>
                    <TableCell className="text-right">{formatCurrency(4500.00)}</TableCell>
                    <TableCell><Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Received</Badge></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="requests" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Bay Parts Requests</CardTitle>
              <CardDescription>Requests generated directly from technician repair orders and digital MPIs</CardDescription>
            </CardHeader>
            <CardContent>
              {serviceRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                  <ClipboardList className="w-12 h-12 mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold text-foreground">No Pending Requests</h3>
                  <p className="max-w-sm mt-2">Parts requests from the service bay will appear here.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Repair Order</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{req.id}</TableCell>
                        <TableCell>{req.ro}</TableCell>
                        <TableCell>{req.vehicle}</TableCell>
                        <TableCell className="max-w-[250px] truncate" title={req.details}>
                          <span className="whitespace-pre-line">{req.details}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={req.status === "Fulfilled" ? "outline" : "default"} className={req.status === "Fulfilled" ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" : ""}>
                            {req.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {req.status !== "Fulfilled" && (
                            <Button size="sm" onClick={() => fulfillRequest(req.id)}>
                              Mark Fulfilled
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="mt-4 space-y-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <BrainCircuit className="w-5 h-5" />
                Dynamic Parts Pricing Matrix
              </CardTitle>
              <CardDescription className="text-primary/70">
                AI automatically adjusts retail pricing based on customer tier, local competitor prices, and current inventory levels.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-primary/10">
                    <TableHead className="text-primary/70">Part Category</TableHead>
                    <TableHead className="text-primary/70">Base Markup</TableHead>
                    <TableHead className="text-primary/70">Wholesale Tier</TableHead>
                    <TableHead className="text-primary/70">Fleet Tier</TableHead>
                    <TableHead className="text-primary/70">Retail / Walk-In</TableHead>
                    <TableHead className="text-right text-primary/70">AI Adjustment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="border-primary/10 hover:bg-primary/10">
                    <TableCell className="font-medium">Maintenance (Filters, Fluids)</TableCell>
                    <TableCell>Cost + 40%</TableCell>
                    <TableCell>Cost + 15%</TableCell>
                    <TableCell>Cost + 20%</TableCell>
                    <TableCell>Cost + 55%</TableCell>
                    <TableCell className="text-right"><Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">+5% (High Demand)</Badge></TableCell>
                  </TableRow>
                  <TableRow className="border-primary/10 hover:bg-primary/10">
                    <TableCell className="font-medium">Brakes & Rotors</TableCell>
                    <TableCell>Cost + 50%</TableCell>
                    <TableCell>Cost + 20%</TableCell>
                    <TableCell>Cost + 25%</TableCell>
                    <TableCell>Cost + 65%</TableCell>
                    <TableCell className="text-right"><Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200">-2% (Competitor Match)</Badge></TableCell>
                  </TableRow>
                  <TableRow className="border-primary/10 hover:bg-primary/10">
                    <TableCell className="font-medium">Electrical (Batteries, Alt)</TableCell>
                    <TableCell>Cost + 35%</TableCell>
                    <TableCell>Cost + 10%</TableCell>
                    <TableCell>Cost + 15%</TableCell>
                    <TableCell>Cost + 45%</TableCell>
                    <TableCell className="text-right"><Badge variant="outline" className="bg-slate-500/10 text-slate-600 border-slate-200">0% (Stable)</Badge></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
