import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Car, Clock, MapPin, User, CheckCircle2, AlertTriangle, Calendar, Search, ShieldCheck, Activity } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const TEST_DRIVES = [
  { id: 1, customer: "Sarah Jenkins", vehicle: "2024 Luxury SUV", salesperson: "Michael Torres", status: "active", time: "14:30", duration: "15m", route: "Highway Route A", licenseVerified: true },
  { id: 2, customer: "David Chen", vehicle: "2021 Sport Compact", salesperson: "Jessica Park", status: "scheduled", time: "16:00", duration: "-", route: "City Route B", licenseVerified: false },
  { id: 3, customer: "Emily Blunt", vehicle: "2022 Electric Hatch", salesperson: "Michael Torres", status: "completed", time: "10:15", duration: "22m", route: "Highway Route A", licenseVerified: true },
];

export default function TestDrives() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Car className="h-7 w-7 text-primary" />
            Test Drive Tracker
          </h1>
          <p className="text-slate-500 mt-1">Manage active test drives, routes, and license verifications.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customer or vehicle..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button className="shrink-0">
            <Car className="mr-2 h-4 w-4" /> New Test Drive
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Test Drives */}
        <Card className="md:col-span-2 border-primary/20 shadow-sm">
          <CardHeader className="bg-primary/5 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary animate-pulse" />
              Active & Scheduled Drives
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {TEST_DRIVES.filter(td => td.status !== "completed").map((td) => (
                <div key={td.id} className="p-4 hover:bg-muted/50 transition-colors flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-3 rounded-xl ${td.status === 'active' ? 'bg-primary/20 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      <Car className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">{td.customer}</h4>
                      <p className="text-sm text-muted-foreground font-medium">{td.vehicle}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> {td.salesperson}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {td.route}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                      {td.licenseVerified ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/30"><ShieldCheck className="h-3 w-3 mr-1" /> License OK</Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-600/30 bg-amber-50 dark:bg-amber-950/30"><AlertTriangle className="h-3 w-3 mr-1" /> Needs ID</Badge>
                      )}
                      <Badge variant={td.status === 'active' ? 'default' : 'secondary'} className={td.status === 'active' ? 'animate-pulse' : ''}>
                        {td.status === 'active' ? 'On Route' : 'Scheduled'}
                      </Badge>
                    </div>
                    {td.status === 'active' && (
                      <Button size="sm" variant="outline" className="h-7 text-[10px] uppercase tracking-wider font-bold border-blue-500/30 text-blue-600 bg-blue-50 dark:bg-blue-950/30 w-full" onClick={() => toast.success("Live tracking link sent to customer via SMS!")}>
                        <MapPin className="h-3 w-3 mr-1" /> Share Live Map
                      </Button>
                    )}
                    <div className="text-sm font-bold flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {td.time} {td.status === 'active' && <span className="text-primary ml-1">({td.duration})</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats & Completed */}
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Today's Drives</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-foreground">8</div>
              <p className="text-sm text-emerald-600 font-bold mt-1">+2 from yesterday</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Completed Today
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {TEST_DRIVES.filter(td => td.status === "completed").map((td) => (
                  <div key={td.id} className="p-3 text-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold">{td.customer}</span>
                      <span className="text-xs text-muted-foreground">{td.duration}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{td.vehicle}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

