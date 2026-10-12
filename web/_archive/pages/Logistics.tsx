import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Truck, MapPin, Navigation, Clock, CheckCircle2, AlertCircle,
  Car, Plus, Phone, ChevronRight, Package, ArrowRight
} from "lucide-react";
import { toast } from "sonner";

const inbound = [
  { id: "TRK-0441", vehicle: "2023 Ford F-150 XLT", from: "Manheim Orlando", driver: "Dave Torres", eta: "4h 20m", stock: "2408A", status: "In Transit", progress: 65 },
  { id: "TRK-0440", vehicle: "2024 Toyota Camry XSE", from: "ADESA Tampa", driver: "Maria Cruz", eta: "Tomorrow 10 AM", stock: "2409B", status: "Scheduled", progress: 5 },
  { id: "TRK-0438", vehicle: "2022 Jeep Wrangler Sport", from: "Dealer Trade — AutoNation", driver: "Carlos Reyes", eta: "Arrived", stock: "2407C", status: "Delivered", progress: 100 },
];

const outbound = [
  { id: "DEL-0229", vehicle: "2024 Honda CR-V EX", to: "1482 Oak Ridge Drive, Brandon FL", buyer: "Sarah Johnson", driver: "Kevin Mills", eta: "Today 3:00 PM", stock: "2404F", status: "En Route" },
  { id: "DEL-0228", vehicle: "2023 Chevrolet Tahoe LT", to: "3901 Bayshore Blvd, Tampa FL", buyer: "James Williams", driver: "Tony Ruiz", eta: "Tomorrow 11 AM", stock: "2402G", status: "Scheduled" },
];

const drivers = [
  { name: "Dave Torres", phone: "(813) 555-8801", status: "On Route", vehicle: "Flatbed #3", initials: "DT", color: "bg-blue-600" },
  { name: "Maria Cruz", phone: "(813) 555-8802", status: "Available", vehicle: "Enclosed Trailer #1", initials: "MC", color: "bg-emerald-600" },
  { name: "Kevin Mills", phone: "(813) 555-8803", status: "On Route", vehicle: "Flatbed #2", initials: "KM", color: "bg-amber-600" },
  { name: "Tony Ruiz", phone: "(813) 555-8804", status: "Standby", vehicle: "Pickup Truck #4", initials: "TR", color: "bg-purple-600" },
];

const statusMap: Record<string, string> = {
  "In Transit": "bg-amber-100 text-amber-700 border-amber-200",
  "Scheduled": "bg-blue-100 text-blue-700 border-blue-200",
  "Delivered": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "En Route": "bg-amber-100 text-amber-700 border-amber-200",
  "On Route": "bg-amber-100 text-amber-700 border-amber-200",
  "Available": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Standby": "bg-muted text-muted-foreground border-border",
};

export default function Logistics() {
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Truck className="h-7 w-7 text-primary" /> Logistics & Transport
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Track inbound vehicle transports, customer deliveries, and driver assignments.</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm" className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-900 dark:text-indigo-400 dark:bg-indigo-900/30" onClick={() => {
            toast.success("AI Route Optimized", { description: "Saved 1.5 hours of drive time and 22 miles across all active outbound deliveries." });
          }}>
            <Navigation className="mr-2 h-4 w-4" /> AI Optimize Routes
          </Button>
          <Button variant="outline" size="sm" className="bg-white dark:bg-slate-950" onClick={() => {
            toast.success("Geofence Alert Enabled", { description: "You will be notified when TRK-0441 is within 5 miles of the dealership." });
          }}>
            <MapPin className="mr-2 h-4 w-4" /> Geofence Alerts
          </Button>
          <Button size="sm" className="gap-1.5 shrink-0">
            <Plus className="h-4 w-4" /> Schedule Transport
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Inbound Vehicles", val: "2", sub: "1 delivered today", icon: Package, color: "text-primary" },
          { label: "Active Deliveries", val: "1", sub: "En route to customer", icon: Navigation, color: "text-amber-600" },
          { label: "Drivers On Duty", val: "2", sub: "2 available/standby", icon: Truck, color: "text-emerald-600" },
          { label: "Avg. Delivery Time", val: "1.4 Days", sub: "Rolling 30-day avg", icon: Clock, color: "text-purple-600" },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <kpi.icon className={`h-4 w-4 ${kpi.color} mb-2`} />
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-xl font-bold">{kpi.val}</p>
              <p className="text-[11px] text-muted-foreground">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="inbound">
        <TabsList className="w-full md:w-auto flex flex-wrap h-auto">
          <TabsTrigger value="inbound" className="flex-1 md:flex-none">
            <Package className="h-3.5 w-3.5 mr-1.5" />Inbound
          </TabsTrigger>
          <TabsTrigger value="outbound" className="flex-1 md:flex-none">
            <Navigation className="h-3.5 w-3.5 mr-1.5" />Outbound
          </TabsTrigger>
          <TabsTrigger value="transfers" className="flex-1 md:flex-none">
            <ArrowRight className="h-3.5 w-3.5 mr-1.5" />Store Transfers
          </TabsTrigger>
          <TabsTrigger value="drivers" className="flex-1 md:flex-none">
            <Truck className="h-3.5 w-3.5 mr-1.5" />Drivers
          </TabsTrigger>
        </TabsList>

        {/* INBOUND */}
        <TabsContent value="inbound" className="mt-4 space-y-3">
          {inbound.map((item, i) => (
            <Card key={i} className={`border-l-4 ${item.status === 'Delivered' ? 'border-l-emerald-500' : item.status === 'In Transit' ? 'border-l-amber-500' : 'border-l-blue-500'}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 ${item.status === 'Delivered' ? 'bg-emerald-100' : item.status === 'In Transit' ? 'bg-amber-100' : 'bg-blue-100'}`}>
                    {item.status === 'Delivered'
                      ? <CheckCircle2 className={`h-5 w-5 text-emerald-600`} />
                      : <Truck className={`h-5 w-5 ${item.status === 'In Transit' ? 'text-amber-600' : 'text-blue-600'}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-bold text-sm">{item.vehicle}</p>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${statusMap[item.status]}`}>{item.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">From: {item.from}</p>

                    {/* Route visualization */}
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className="text-muted-foreground font-medium">{item.from.split(' ')[0]}</span>
                      <div className="flex-1 relative h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`absolute left-0 top-0 h-full rounded-full transition-all ${item.status === 'Delivered' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground font-medium">Lot</span>
                    </div>

                    <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-muted-foreground">
                      <span><MapPin className="h-3 w-3 inline mr-0.5" />Stock #{item.stock}</span>
                      <span><Clock className="h-3 w-3 inline mr-0.5" />ETA: {item.eta}</span>
                      <span>Driver: {item.driver}</span>
                    </div>
                  </div>
                  {item.status !== 'Delivered' && (
                    <Button size="sm" variant="outline" className="text-xs h-7 shrink-0">
                      <Phone className="h-3 w-3 mr-1" />Call
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* OUTBOUND */}
        <TabsContent value="outbound" className="mt-4 space-y-3">
          {outbound.map((item, i) => (
            <Card key={i} className={`border-l-4 ${item.status === 'En Route' ? 'border-l-amber-500' : 'border-l-blue-500'}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 ${item.status === 'En Route' ? 'bg-amber-100' : 'bg-blue-100'}`}>
                    <Navigation className={`h-5 w-5 ${item.status === 'En Route' ? 'text-amber-600' : 'text-blue-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-bold text-sm">{item.vehicle}</p>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${statusMap[item.status]}`}>{item.status}</Badge>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Car className="h-3 w-3 shrink-0" />
                      <span className="font-medium text-foreground">{item.buyer}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{item.to}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      <span><Clock className="h-3 w-3 inline mr-0.5" />ETA: {item.eta}</span>
                      <span>Driver: {item.driver}</span>
                      <span>Stock #{item.stock}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" className="text-xs h-7">Track</Button>
                    <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card className="border-dashed border-2 border-border">
            <CardContent className="p-5 flex flex-col sm:flex-row items-center gap-4 text-muted-foreground">
              <Navigation className="h-8 w-8 opacity-40 shrink-0" />
              <div>
                <p className="font-medium text-sm text-foreground">No additional outbound deliveries scheduled</p>
                <p className="text-xs">Home deliveries and dealer transfers will appear here when scheduled.</p>
              </div>
              <Button variant="outline" size="sm" className="shrink-0 ml-auto">Schedule Delivery</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRANSFERS */}
        <TabsContent value="transfers" className="mt-4 space-y-3">
          <Card className="border-dashed border-2 border-border">
            <CardContent className="p-5 flex flex-col sm:flex-row items-center gap-4 text-muted-foreground">
              <ArrowRight className="h-8 w-8 opacity-40 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm text-foreground">Group-Wide Inventory Transfer</p>
                <p className="text-xs">Request moving a vehicle from Store A to Store B, including transport logistics.</p>
              </div>
              <Button size="sm" className="shrink-0 ml-auto" onClick={() => toast.success("Transfer Request Initiated", { description: "Transport logistics team notified." })}>Request Transfer</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DRIVERS */}
        <TabsContent value="drivers" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {drivers.map((driver, i) => (
              <Card key={i} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className={`${driver.color} text-white font-bold`}>{driver.initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">{driver.name}</p>
                      <p className="text-xs text-muted-foreground">{driver.vehicle}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${statusMap[driver.status]}`}>{driver.status}</Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3 shrink-0" />{driver.phone}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="flex-1 text-xs h-7">Assign Job</Button>
                    <Button variant="ghost" size="sm" className="flex-1 text-xs h-7">
                      <Phone className="h-3 w-3 mr-1" />Call
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card className="border-dashed border-2 border-border hover:border-primary/40 transition-colors cursor-pointer">
              <CardContent className="p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Plus className="h-6 w-6" />
                <p className="text-sm font-medium">Add Driver</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
