import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ShieldCheck, FileWarning, CheckCircle2, Search, AlertCircle, FileText,
  Clock, User, Car, ChevronRight, Eye, Shield, AlertTriangle, Info,
  BrainCircuit, Sparkles, TrendingDown, UploadCloud, ShieldAlert
} from "lucide-react";
import { toast } from "sonner";
import { hapticFeedback } from "@/lib/haptics";

const ofacChecks = [
  { customer: "Robert Chen", vehicle: "2024 Toyota Camry", date: "Today 9:14 AM", result: "Clear", salesperson: "KB", initials: "KB", color: "bg-purple-600" },
  { customer: "Jennifer Martinez", vehicle: "2023 Ford F-150", date: "Today 8:55 AM", result: "Clear", salesperson: "MD", initials: "MD", color: "bg-indigo-600" },
  { customer: "David Kim", vehicle: "2022 Honda CR-V", date: "Yesterday 4:30 PM", result: "Clear", salesperson: "KB", initials: "KB", color: "bg-purple-600" },
  { customer: "Sandra Mitchell", vehicle: "2024 Jeep Wrangler", date: "Yesterday 2:15 PM", result: "Review", salesperson: "MA", initials: "MA", color: "bg-emerald-600" },
  { customer: "Thomas Anderson", vehicle: "2023 Chevrolet Silverado", date: "May 10, 2026", result: "Clear", salesperson: "MD", initials: "MD", color: "bg-indigo-600" },
  { customer: "Lisa Thompson", vehicle: "2021 BMW X5", date: "May 9, 2026", result: "Clear", salesperson: "KB", initials: "KB", color: "bg-purple-600" },
];

const missingDocs = [
  { deal: "#24-0892", customer: "Robert Chen", vehicle: "2024 Toyota Camry", missing: ["Proof of Insurance", "Title Application"], urgency: "High" },
  { deal: "#24-0889", customer: "Marcus Williams", vehicle: "2023 Honda Accord", missing: ["Second ID Copy"], urgency: "Medium" },
  { deal: "#24-0881", customer: "Priya Patel", vehicle: "2022 Kia Telluride", missing: ["Lien Release"], urgency: "High" },
];

const auditLog = [
  { action: "Deal #24-0891 Finalized", user: "Derek W.", type: "F&I", time: "Today 10:22 AM", status: "ok" },
  { action: "Credit App Submitted — Chen, R.", user: "Keisha B.", type: "Credit", time: "Today 9:14 AM", status: "ok" },
  { action: "OFAC check flagged — Mitchell, S.", user: "System", type: "OFAC", time: "Yesterday 2:15 PM", status: "warn" },
  { action: "Deal #24-0885 documents complete", user: "Derek W.", type: "F&I", time: "Yesterday 1:05 PM", status: "ok" },
  { action: "Lender approval — Ally Financial #0882", user: "System", type: "Finance", time: "May 10, 2026", status: "ok" },
  { action: "Red Flag Rule review completed", user: "James T.", type: "Compliance", time: "May 9, 2026", status: "ok" },
];

export default function Compliance() {
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" /> Compliance & Audit
          </h1>
          <p className="text-muted-foreground text-sm mt-1">OFAC screening, document compliance, deal audit trails, and Red Flag Rule monitoring.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
            toast.success("OFAC & Red Flags Check Complete", { description: "Customer cleared. No matches found." });
            hapticFeedback();
          }}>
            <Search className="h-4 w-4" /> Run OFAC Check
          </Button>
          <Button size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => {
            toast.success("Compliance Guardian Audit Complete", { description: "No Truth in Lending Act or Red Flag violations detected." });
            hapticFeedback();
          }}>
            <BrainCircuit className="h-4 w-4" /> AI Compliance Guardian
          </Button>
          <Button size="sm" className="gap-1.5">
            <FileText className="h-4 w-4" /> Export Audit Log
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "OFAC Cleared (MTD)", val: "100%", sub: "94 of 94 checks passed", icon: ShieldCheck, color: "text-emerald-600" },
          { label: "Missing Documents", val: "3", sub: "Deals need attention", icon: FileWarning, color: "text-rose-600" },
          { label: "Audit Score", val: "98/100", sub: "Last formal review: Apr 2026", icon: CheckCircle2, color: "text-primary" },
          { label: "Pending Reviews", val: "1", sub: "OFAC flag requires follow-up", icon: AlertCircle, color: "text-amber-600" },
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

      <Tabs defaultValue="ofac">
        <TabsList className="w-full md:w-auto flex flex-wrap h-auto">
          <TabsTrigger value="ofac" className="flex-1 md:flex-none">Red Flag / OFAC</TabsTrigger>
          <TabsTrigger value="docs" className="flex-1 md:flex-none">Stipulations & Docs</TabsTrigger>
          <TabsTrigger value="audit" className="flex-1 md:flex-none">AI Contract Audit</TabsTrigger>
          <TabsTrigger value="chargebacks" className="flex-1 md:flex-none">Chargeback Risk</TabsTrigger>
          <TabsTrigger value="auditlog" className="flex-1 md:flex-none">Compliance Audit Log</TabsTrigger>
        </TabsList>

        {/* OFAC TAB */}
        <TabsContent value="ofac" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Red Flag Identity & OFAC Log</CardTitle>
              <CardDescription>Simulated OFAC and identity fraud checks run during deal processing.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {ofacChecks.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 hover:bg-muted/20 transition-colors">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className={`${c.color} text-white text-xs font-bold`}>{c.initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{c.customer}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.vehicle} · {c.date}</p>
                    </div>
                    <Badge className={`text-[10px] shrink-0 ${c.result === 'Clear' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                      {c.result === 'Clear' ? <CheckCircle2 className="h-3 w-3 mr-1 inline" /> : <AlertTriangle className="h-3 w-3 mr-1 inline" />}
                      {c.result}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MISSING DOCS */}
        <TabsContent value="docs" className="mt-4 space-y-3">
          {missingDocs.map((deal, i) => (
            <Card key={i} className={`border-l-4 ${deal.urgency === 'High' ? 'border-l-rose-500' : 'border-l-amber-500'}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${deal.urgency === 'High' ? 'bg-rose-100' : 'bg-amber-100'}`}>
                      <FileWarning className={`h-4 w-4 ${deal.urgency === 'High' ? 'text-rose-600' : 'text-amber-600'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm">Deal {deal.deal}</p>
                        <Badge variant="outline" className={`text-[10px] ${deal.urgency === 'High' ? 'border-rose-300 text-rose-700 bg-rose-50' : 'border-amber-300 text-amber-700 bg-amber-50'}`}>
                          {deal.urgency} Priority
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{deal.customer} — {deal.vehicle}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {deal.missing.map(doc => (
                          <Badge key={doc} variant="outline" className="text-[10px] border-destructive/30 text-destructive bg-destructive/5">
                            Missing: {doc}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0 text-xs">Resolve</Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card className="border-dashed border-2 border-emerald-300 bg-emerald-50/50">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-800 text-sm">All other deals are fully documented</p>
                <p className="text-xs text-emerald-700">3 deals above require attention before title processing can begin.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI CONTRACT AUDIT */}
        <TabsContent value="audit" className="mt-4 space-y-4">
          <Card className="bg-indigo-50/50 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/50 shadow-sm mb-6">
            <CardContent className="p-5 flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl shrink-0">
                <ShieldAlert className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-indigo-900 dark:text-indigo-300 mb-1">AI Compliance Guardian</h3>
                <p className="text-sm text-indigo-800/80 dark:text-indigo-200/70">
                  Actively scanning deals for missing signatures, Truth in Lending Act violations, and Red Flag compliance.
                </p>
              </div>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0" onClick={() => toast.success("Scan Complete", { description: "No compliance violations found in the current deal queue." })}>
                Run Guardian Scan
              </Button>
            </CardContent>
          </Card>
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="pb-2 bg-primary/5">
              <CardTitle className="text-base flex items-center gap-2 text-primary">
                <BrainCircuit className="h-5 w-5" /> AI Contract Audit
              </CardTitle>
              <CardDescription>Automated scanning for missing signatures, initials, and compliance errors.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4 border-b border-border bg-card">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold">Deal #24-0892: Robert Chen</h4>
                    <p className="text-sm text-muted-foreground">Retail Installment Contract (PDF)</p>
                  </div>
                  <Button size="sm" variant="outline" className="gap-2">
                    <UploadCloud className="h-4 w-4" /> Upload Contract
                  </Button>
                </div>
              </div>
              <div className="divide-y divide-border">
                <div className="p-4 flex items-start gap-4 hover:bg-muted/20">
                  <div className="p-2 bg-destructive/10 rounded-full shrink-0">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Missing Buyer Signature on Page 3</p>
                    <p className="text-xs text-muted-foreground">Arbitration Agreement section requires wet or digital signature.</p>
                  </div>
                  <Button size="sm" variant="secondary">Send eSign Link</Button>
                </div>
                <div className="p-4 flex items-start gap-4 hover:bg-muted/20">
                  <div className="p-2 bg-amber-500/10 rounded-full shrink-0">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Missing Co-Buyer Initials on Page 1</p>
                    <p className="text-xs text-muted-foreground">Truth in Lending disclosures must be initialed by all parties.</p>
                  </div>
                  <Button size="sm" variant="secondary">Send eSign Link</Button>
                </div>
                <div className="p-4 flex items-start gap-4 hover:bg-muted/20">
                  <div className="p-2 bg-success/10 rounded-full shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Odometer Disclosure</p>
                    <p className="text-xs text-muted-foreground">Fully executed and verified.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CHARGEBACK RISK */}
        <TabsContent value="chargebacks" className="mt-4 space-y-4">
          <Card className="border-amber-500/20 shadow-sm border-l-4 border-l-amber-500">
            <CardHeader className="pb-2 bg-amber-500/5">
              <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-500">
                <TrendingDown className="h-5 w-5" /> Predictive Chargeback Analytics
              </CardTitle>
              <CardDescription>AI risk assessment for early product cancellations and chargebacks.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Total Risk Exposure</p>
                  <p className="text-3xl font-bold text-amber-600">$12,450</p>
                  <p className="text-xs text-muted-foreground">Across 8 high-risk deals</p>
                </div>
                <div className="md:col-span-2 space-y-4">
                  <h4 className="text-sm font-bold">High Risk Deals (Next 30 Days)</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">Deal #24-0750 (VSC & GAP)</p>
                        <p className="text-xs text-muted-foreground">Customer traded in a vehicle after 6 months previously.</p>
                      </div>
                      <Badge variant="destructive">85% Risk</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">Deal #24-0812 (Tire & Wheel)</p>
                        <p className="text-xs text-muted-foreground">Out of state buyer, historically high cancellation rate.</p>
                      </div>
                      <Badge className="bg-amber-500 hover:bg-amber-600">62% Risk</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMPLIANCE AUDIT LOG */}
        <TabsContent value="auditlog" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" /> Immutable Compliance Audit Log
              </CardTitle>
              <CardDescription>Timestamped timeline of every price change, manager approval, and document signature.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                {auditLog.map((log, i) => (
                  <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${log.status === 'ok' ? 'bg-emerald-500' : 'bg-amber-500'} text-white z-10`}>
                      {log.status === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border bg-card shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-[10px]">{log.type}</Badge>
                        <time className="text-[10px] text-muted-foreground font-medium">{log.time}</time>
                      </div>
                      <p className="font-bold text-sm">{log.action}</p>
                      <p className="text-xs text-muted-foreground mt-1">Authorized by: <span className="font-medium text-foreground">{log.user}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
