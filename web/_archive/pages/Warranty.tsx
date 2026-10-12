import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ShieldAlert, FileText, Search, Plus, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, BrainCircuit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const WARRANTIES = [
  { id: 1, customer: "John Doe", vehicle: "2020 Ford F-150", provider: "Fidelity", type: "Powertrain", expires: "2026-05-12", status: "active" },
  { id: 2, customer: "Amanda Waller", vehicle: "2023 Premium EV", provider: "OEM Extended", type: "Bumper-to-Bumper", expires: "2028-11-20", status: "active" },
  { id: 3, customer: "Robert California", vehicle: "2018 Honda Civic", provider: "Assurant", type: "Tire & Wheel", expires: "2024-01-15", status: "expired" },
];

export default function Warranty() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" />
            Warranty & Insurance
          </h1>
          <p className="text-slate-500 mt-1">Track active warranties, expirations, and F&I product penetration.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto flex-wrap justify-end">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search policies..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="shrink-0 border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-900 dark:text-indigo-400 dark:bg-indigo-900/30" onClick={() => {
            toast.success("AI Claims Generator", { description: "Auto-drafted 3 warranty claims based on today's completed ROs. Ready for submission." });
          }}>
            <BrainCircuit className="mr-2 h-4 w-4" /> Auto-Draft Claims
          </Button>
          <Button className="shrink-0">
            <Plus className="mr-2 h-4 w-4" /> Add Policy
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-primary/20 shadow-sm">
          <CardHeader className="bg-primary/5 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Active Policies
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {WARRANTIES.map((w) => (
                <div key={w.id} className="p-4 hover:bg-muted/50 transition-colors flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-3 rounded-xl ${w.status === 'active' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-rose-500/20 text-rose-600'}`}>
                      {w.status === 'active' ? <ShieldCheck className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">{w.customer}</h4>
                      <p className="text-sm text-muted-foreground font-medium">{w.vehicle}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-semibold text-primary">{w.provider}</span>
                        <span className="flex items-center gap-1">{w.type}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                      <Badge variant={w.status === 'active' ? 'default' : 'destructive'}>
                        {w.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-sm font-bold flex items-center gap-1">
                      Expires: {w.expires}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">F&I Penetration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-foreground">62%</div>
              <p className="text-sm text-emerald-600 font-bold mt-1">+4% vs last month</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
