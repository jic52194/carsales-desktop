import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Car, Search, Plus, Calendar, Settings, ShieldAlert, FileText, User, Camera, CheckCircle2, Pen, MapPin, Navigation, Smartphone, BrainCircuit } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import SignatureCanvas from "react-signature-canvas";
import { toast } from "sonner";

const mockFleet = [
  { id: "L001", make: "Toyota", model: "Camry", year: 2024, licensePlate: "XYZ-1234", status: "Out on Loan", customer: "John Doe", expectedReturn: "2024-05-26", tollBalance: "$12.50" },
  { id: "L002", make: "Honda", model: "Accord", year: 2023, licensePlate: "ABC-9876", status: "Available", customer: "-", expectedReturn: "-", tollBalance: "$0.00" },
  { id: "L003", make: "Ford", model: "Explorer", year: 2024, licensePlate: "DEF-4567", status: "Maintenance", customer: "-", expectedReturn: "-", tollBalance: "$0.00" },
  { id: "L004", make: "Lexus", model: "RX 350", year: 2024, licensePlate: "GHI-3456", status: "Out on Loan", customer: "Sarah Smith", expectedReturn: "2024-05-28", tollBalance: "$4.00" },
  { id: "L005", make: "BMW", model: "X5", year: 2023, licensePlate: "JKL-7890", status: "Available", customer: "-", expectedReturn: "-", tollBalance: "$0.00" },
];

export default function FleetManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [inspectionType, setInspectionType] = useState<"checkout" | "checkin">("checkout");
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  
  const [fuelLevel, setFuelLevel] = useState([100]);
  const [mileage, setMileage] = useState("");
  const [notes, setNotes] = useState("");
  const sigCanvas = useRef<any>(null);

  const handleInspection = (vehicle: any, type: "checkout" | "checkin") => {
    setSelectedVehicle(vehicle);
    setInspectionType(type);
    setFuelLevel(type === "checkout" ? [100] : [75]);
    setMileage(type === "checkout" ? "12500" : "12650");
    setNotes("");
    setInspectionOpen(true);
  };

  const completeInspection = () => {
    if (sigCanvas.current?.isEmpty()) {
      toast.error("Please provide a signature to complete the inspection.");
      return;
    }
    toast.success(`Vehicle successfully ${inspectionType === "checkout" ? "checked out" : "checked in"}!`);
    setInspectionOpen(false);
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Fleet & Loaner Management</h2>
          <p className="text-muted-foreground mt-1">Track loaners, rental agreements, tolls, and fleet availability.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Loaner Agreement
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fleet</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground mt-1">Active vehicles in fleet</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <ShieldAlert className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">12</div>
            <p className="text-xs text-muted-foreground mt-1">Ready for loan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out on Loan</CardTitle>
            <User className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">10</div>
            <p className="text-xs text-muted-foreground mt-1">Currently with customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid Tolls</CardTitle>
            <FileText className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">$16.50</div>
            <p className="text-xs text-muted-foreground mt-1">Needs collection</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Fleet Availability</CardTitle>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by ID, Make, Plate..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-4 flex flex-wrap h-auto">
              <TabsTrigger value="all">All Vehicles</TabsTrigger>
              <TabsTrigger value="available">Available</TabsTrigger>
              <TabsTrigger value="loaned">Out on Loan</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              <TabsTrigger value="map" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Live GPS Map</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="m-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle ID</TableHead>
                      <TableHead>Make/Model</TableHead>
                      <TableHead>License Plate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Expected Return</TableHead>
                      <TableHead className="text-right">Toll Balance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockFleet.map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-medium">{vehicle.id}</TableCell>
                        <TableCell>{vehicle.year} {vehicle.make} {vehicle.model}</TableCell>
                        <TableCell>{vehicle.licensePlate}</TableCell>
                        <TableCell>
                          <Badge variant={
                            vehicle.status === "Available" ? "outline" : 
                            vehicle.status === "Out on Loan" ? "default" : "secondary"
                          } className={vehicle.status === "Available" ? "border-emerald-500 text-emerald-600" : ""}>
                            {vehicle.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{vehicle.customer}</TableCell>
                        <TableCell>{vehicle.expectedReturn}</TableCell>
                        <TableCell className="text-right font-medium text-orange-600">{vehicle.tollBalance !== "$0.00" ? vehicle.tollBalance : "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">Manage</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="available" className="m-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle ID</TableHead>
                      <TableHead>Make/Model</TableHead>
                      <TableHead>License Plate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockFleet.filter(v => v.status === "Available").map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-medium">{vehicle.id}</TableCell>
                        <TableCell>{vehicle.year} {vehicle.make} {vehicle.model}</TableCell>
                        <TableCell>{vehicle.licensePlate}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-emerald-500 text-emerald-600">{vehicle.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="default" size="sm" onClick={() => handleInspection(vehicle, "checkout")}>Loan Out</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="loaned" className="m-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Expected Return</TableHead>
                      <TableHead>Toll Balance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockFleet.filter(v => v.status === "Out on Loan").map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-medium">{vehicle.id}</TableCell>
                        <TableCell>{vehicle.customer}</TableCell>
                        <TableCell>{vehicle.expectedReturn}</TableCell>
                        <TableCell className="font-medium text-orange-600">{vehicle.tollBalance !== "$0.00" ? vehicle.tollBalance : "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" className="mr-2 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100" onClick={() => toast.success("Digital Key sent to customer's Apple/Google Wallet.")}>
                            <Smartphone className="w-4 h-4 mr-1" /> Key
                          </Button>
                          <Button variant="outline" size="sm" className="mr-2">View Agreement</Button>
                          <Button variant="default" size="sm" onClick={() => handleInspection(vehicle, "checkin")}>Check In</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="map" className="m-0">
              <div className="rounded-md border bg-slate-100 dark:bg-slate-900 overflow-hidden relative h-[500px]">
                {/* Simulated Map Background */}
                <div className="absolute inset-0 opacity-20 dark:opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                  <MapPin className="w-96 h-96" />
                </div>
                
                {/* Floating UI Elements */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
                  <Card className="w-64 shadow-lg pointer-events-auto border-primary/20">
                    <CardHeader className="p-3 pb-0">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-primary" /> Active Tracking
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Vehicles Tracked</span>
                          <span className="font-bold">{mockFleet.filter(v => v.status === "Out on Loan").length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">System Status</span>
                          <span className="font-bold text-emerald-500 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Online</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Map Markers for Out on Loan vehicles */}
                {mockFleet.filter(v => v.status === "Out on Loan").map((vehicle, i) => {
                  // Generate some pseudo-random positions based on index
                  const top = 20 + (i * 25) % 60;
                  const left = 20 + (i * 35) % 60;
                  
                  return (
                    <div key={vehicle.id} className="absolute group cursor-pointer" style={{ top: `${top}%`, left: `${left}%` }}>
                      <div className="relative flex items-center justify-center">
                        <div className="absolute w-8 h-8 bg-primary/20 rounded-full animate-ping"></div>
                        <div className="relative w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/40 border-2 border-white dark:border-slate-950 z-10">
                          <Car className="w-4 h-4 text-primary-foreground" />
                        </div>
                        
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 bg-white dark:bg-slate-950 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                          <div className="font-bold text-sm">{vehicle.year} {vehicle.make} {vehicle.model}</div>
                          <div className="text-xs text-muted-foreground mt-1">{vehicle.licensePlate}</div>
                          <div className="mt-2 text-xs border-t pt-2 border-slate-100 dark:border-slate-800">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Customer:</span> {vehicle.customer}
                          </div>
                          <div className="mt-1 text-xs flex items-center justify-between">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Fuel/Battery:</span> 
                            <span className={i % 2 === 0 ? "text-emerald-500 font-bold" : "text-amber-500 font-bold"}>{100 - (i * 15)}%</span>
                          </div>
                          <div className="mt-1 text-xs flex items-center justify-between">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Est Speed:</span> 
                            <span>{Math.floor(25 + (i * 13) % 40)} mph</span>
                          </div>
                          {i === 1 && (
                            <div className="mt-2 text-xs bg-rose-50 text-rose-600 border border-rose-200 p-1.5 rounded flex items-center gap-1 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400">
                              <ShieldAlert className="w-3 h-3" /> Geofence Alert: Out of State
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={inspectionOpen} onOpenChange={setInspectionOpen}>
        <DialogContent className="sm:max-w-[700px] h-[90vh] sm:h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b shrink-0 bg-slate-50 dark:bg-slate-900/50">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Camera className="h-5 w-5 text-primary" />
              Digital Vehicle Walk-Around
            </DialogTitle>
            <DialogDescription>
              {inspectionType === "checkout" ? "Pre-loan" : "Post-loan"} inspection for {selectedVehicle?.year} {selectedVehicle?.make} {selectedVehicle?.model} ({selectedVehicle?.licensePlate})
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Photos Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Exterior Condition Photos</h3>
                {inspectionType === "checkin" && (
                  <Button variant="outline" size="sm" className="h-8 text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100" onClick={() => {
                    toast.success("AI Damage Detection Complete", {
                      description: "Found 1 new scratch on the Passenger Side door since checkout."
                    });
                  }}>
                    <BrainCircuit className="w-4 h-4 mr-2" /> AI Damage Scan
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {["Front", "Driver Side", "Rear", "Pass. Side"].map((angle) => (
                  <div key={angle} className="aspect-square rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2 bg-slate-50/50 dark:bg-slate-900/20 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Camera className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{angle}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Vehicle Stats */}
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-semibold uppercase tracking-wider text-slate-500">Fuel Level</Label>
                  <span className="font-bold text-primary">{fuelLevel[0]}%</span>
                </div>
                <Slider
                  value={fuelLevel}
                  onValueChange={setFuelLevel}
                  max={100}
                  step={5}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-muted-foreground font-medium">
                  <span>Empty</span>
                  <span>1/2</span>
                  <span>Full</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <Label className="text-sm font-semibold uppercase tracking-wider text-slate-500">Current Odometer</Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value)}
                    className="pl-4 pr-12 text-lg font-medium"
                  />
                  <span className="absolute right-4 top-2.5 text-sm font-semibold text-slate-400">mi</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <Label className="text-sm font-semibold uppercase tracking-wider text-slate-500">Damage / Condition Notes</Label>
              <textarea 
                className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Note any scratches, dents, or interior issues..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Signature */}
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Label className="text-sm font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Customer Signature</span>
                <Button variant="ghost" size="sm" onClick={() => sigCanvas.current?.clear()} className="h-6 text-xs">Clear</Button>
              </Label>
              <div className="border-2 border-slate-200 dark:border-slate-700 rounded-lg bg-white overflow-hidden">
                <SignatureCanvas
                  ref={sigCanvas}
                  penColor="black"
                  canvasProps={{
                    className: "w-full h-40 cursor-crosshair",
                  }}
                />
              </div>
              <p className="text-xs text-slate-500 text-center">I acknowledge the condition of the vehicle as documented above.</p>
            </div>
          </div>

          <DialogFooter className="p-6 border-t shrink-0 bg-slate-50 dark:bg-slate-900/50">
            <Button variant="outline" onClick={() => setInspectionOpen(false)}>Cancel</Button>
            <Button onClick={completeInspection} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Complete {inspectionType === "checkout" ? "Check-Out" : "Check-In"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
