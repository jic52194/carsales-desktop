import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, BrainCircuit, FileText } from "lucide-react";
import { toast } from "sonner";

interface RedFlag {
  id: string;
  severity: "critical" | "warning" | "info";
  category: string;
  title: string;
  desc: string;
  resolved: boolean;
}

const INITIAL_FLAGS: RedFlag[] = [
  { id: "1", severity: "critical", category: "Finance", title: "Loan-to-Value Exceeds 140%", desc: "Deal #4521 — LTV is 145% on $38,000 financed. This exceeds most lender guidelines.", resolved: false },
  { id: "2", severity: "critical", category: "Documentation", title: "Missing Proof of Income", desc: "Deal #4521 — Customer has not uploaded pay stubs or tax returns. Cannot fund.", resolved: false },
  { id: "3", severity: "warning", category: "Disclosure", title: "Undisclosed Fee Detected", desc: "Deal #4519 — $395 etch fee not disclosed on buyer's order. Must be itemized.", resolved: false },
  { id: "4", severity: "warning", category: "Pricing", title: "Price Discrepancy", desc: "Deal #4521 — Window sticker price ($35,500) differs from contract price ($34,500).", resolved: false },
  { id: "5", severity: "info", category: "Compliance", title: "Privacy Notice Not Acknowledged", desc: "Deal #4519 — GLBA privacy notice has not been signed by customer.", resolved: false },
  { id: "6", severity: "warning", category: "Finance", title: "APR Markup Exceeds 2%", desc: "Deal #4521 — Dealer reserve of 2.5% may trigger rate disclosure requirements.", resolved: false },
];

const SEVERITY_CONFIG = {
  critical: { color: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle, label: "CRITICAL" },
  warning: { color: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40", icon: AlertTriangle, label: "WARNING" },
  info: { color: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40", icon: CheckCircle2, label: "INFO" },
};

export default function ComplianceChecker() {
  const [flags, setFlags] = useState(INITIAL_FLAGS);
  const [scanning, setScanning] = useState(false);

  const unresolved = flags.filter((f) => !f.resolved);
  const criticalCount = unresolved.filter((f) => f.severity === "critical").length;

  const runScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      toast.success("Compliance scan complete", { description: `${unresolved.length} flags found across ${new Set(unresolved.map(f => f.category)).size} categories.` });
    }, 2500);
  };

  const resolve = (id: string) => {
    setFlags((prev) => prev.map((f) => f.id === id ? { ...f, resolved: true } : f));
    toast.success("Flag resolved");
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-destructive/10">
          <ShieldAlert className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Red Flag Compliance Checker</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Auto-scan deals for compliance red flags before they become problems</p>
        </div>
      </div>

      {/* Status Banner */}
      <Card className={criticalCount > 0 ? "border-destructive/30" : "border-emerald-200 dark:border-emerald-800/40"}>
        <CardContent className="p-4 flex items-center gap-4">
          <div className={`p-3 rounded-xl ${criticalCount > 0 ? "bg-destructive/10" : "bg-emerald-50 dark:bg-emerald-950/30"}`}>
            {criticalCount > 0 ? <ShieldAlert className="h-6 w-6 text-destructive" /> : <ShieldCheck className="h-6 w-6 text-emerald-500" />}
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">
              {criticalCount > 0 ? `${criticalCount} Critical Issues Found` : "All Clear — No Critical Issues"}
            </p>
            <p className="text-xs text-muted-foreground">{unresolved.length} total unresolved flags across all deals</p>
          </div>
          <Button onClick={runScan} disabled={scanning} className="shrink-0">
            <BrainCircuit className={`h-4 w-4 mr-2 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "Scanning..." : "Run AI Scan"}
          </Button>
        </CardContent>
      </Card>

      {/* Flags */}
      <div className="space-y-3">
        {flags.map((flag) => {
          const config = SEVERITY_CONFIG[flag.severity];
          const Icon = config.icon;
          return (
            <Card key={flag.id} className={flag.resolved ? "opacity-50" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg border shrink-0 ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`text-[9px] ${config.color} border`}>{config.label}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{flag.category}</Badge>
                    </div>
                    <p className="font-bold text-sm">{flag.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{flag.desc}</p>
                  </div>
                  {!flag.resolved && (
                    <Button size="sm" variant="outline" className="shrink-0" onClick={() => resolve(flag.id)}>
                      Resolve
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
