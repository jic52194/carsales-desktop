import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileBadge2, History, Search, Printer, BrainCircuit, ScanText, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function TitleReg() {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <FileBadge2 className="h-7 w-7 text-primary" /> Title & Registration
          </h1>
          <p className="text-slate-500 mt-1">Automated DMV tracking and paperwork compliance.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-900 dark:text-indigo-400 dark:bg-indigo-900/30" onClick={() => toast.success("AI Auditor Complete", { description: "Scanned 42 deals. 3 missing state forms identified and flagged." })}>
            <BrainCircuit className="mr-2 h-4 w-4" /> Run AI Document Auditor
          </Button>
          <Button onClick={() => toast.success("AI OCR Scan Complete", { description: "Found 1 missing customer signature on the Odometer Disclosure. SMS sent to customer to e-sign." })} className="bg-primary hover:bg-primary/90 text-white">
            <ScanText className="mr-2 h-4 w-4" /> Scan for Signatures
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Automated Title Tracker</CardTitle>
          <CardDescription>Real-time status of all DMV paperwork.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {[
              { customer: "Sarah Jenkins", vehicle: "2024 Luxury SUV", status: "Ready for DMV", days: 2, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-100" },
              { customer: "Mike Ross", vehicle: "2024 Family Sedan", status: "Missing Odometer Sig.", days: 5, icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-100" },
              { customer: "Emily Blunt", vehicle: "2020 Rugged Truck", status: "Processing at State", days: 12, icon: History, color: "text-blue-500", bg: "bg-blue-100" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${item.bg}`}>
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{item.customer}</p>
                    <p className="text-xs text-muted-foreground">{item.vehicle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <Badge variant="outline" className={item.status.includes('Missing') ? 'border-amber-200 text-amber-700 bg-amber-50' : ''}>{item.status}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{item.days} days in queue</p>
                  </div>
                  <Button variant="ghost" size="sm">View</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">State DMV Status</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
            <span className="font-medium text-emerald-700">DMV Online Connection</span>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-emerald-600">Stable</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Temp Tag Inventory</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <span className="text-2xl font-bold">84</span>
            <span className="text-xs text-slate-500">Tags remaining</span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
