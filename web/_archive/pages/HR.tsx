import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Users, Receipt, Calendar, UserPlus, DollarSign, Clock, CheckCircle2,
  AlertCircle, TrendingUp, Phone, Mail, Star, Award, ChevronRight,
  FileText, Shield, Briefcase, MoreVertical, BookOpen, AlertTriangle, BrainCircuit
} from "lucide-react";
import { toast } from "sonner";

const employees = [
  { id: 1, name: "James Thornton", title: "General Manager", dept: "Management", status: "Active", phone: "(813) 555-0101", email: "j.thornton@dealer.com", initials: "JT", color: "bg-blue-600", startDate: "Jan 2018", salary: "$95,000", ytdGross: "$49,800", reviews: 4.9, certifications: ["DEALER LICENSE", "OFAC CERTIFIED"] },
  { id: 2, name: "Maria Santos", title: "Sales Manager", dept: "Sales", status: "Active", phone: "(813) 555-0102", email: "m.santos@dealer.com", initials: "MS", color: "bg-emerald-600", startDate: "Mar 2019", salary: "$72,000", ytdGross: "$68,200", reviews: 4.8, certifications: ["SALES CERTIFIED"] },
  { id: 3, name: "Derek Williams", title: "F&I Manager", dept: "Finance", status: "Active", phone: "(813) 555-0103", email: "d.williams@dealer.com", initials: "DW", color: "bg-amber-600", startDate: "Jun 2020", salary: "$85,000", ytdGross: "$92,100", reviews: 4.7, certifications: ["F&I CERTIFIED", "COMPLIANCE"] },
  { id: 4, name: "Keisha Brown", title: "Sales Consultant", dept: "Sales", status: "Active", phone: "(813) 555-0104", email: "k.brown@dealer.com", initials: "KB", color: "bg-purple-600", startDate: "Feb 2021", salary: "$42,000", ytdGross: "$54,300", reviews: 4.9, certifications: ["SALES CERTIFIED"] },
  { id: 5, name: "Tom Nguyen", title: "Service Director", dept: "Service", status: "Active", phone: "(813) 555-0105", email: "t.nguyen@dealer.com", initials: "TN", color: "bg-rose-600", startDate: "Sep 2017", salary: "$78,000", ytdGross: "$39,200", reviews: 4.6, certifications: ["ASE MASTER", "SERVICE ADVISOR"] },
  { id: 6, name: "Ashley Reed", title: "BDC Manager", dept: "BDC", status: "Active", phone: "(813) 555-0106", email: "a.reed@dealer.com", initials: "AR", color: "bg-cyan-600", startDate: "Nov 2021", salary: "$52,000", ytdGross: "$26,500", reviews: 4.8, certifications: ["BDC CERTIFIED"] },
  { id: 7, name: "Marcus Davis", title: "Sales Consultant", dept: "Sales", status: "Active", phone: "(813) 555-0107", email: "m.davis@dealer.com", initials: "MD", color: "bg-indigo-600", startDate: "Jul 2022", salary: "$38,000", ytdGross: "$48,700", reviews: 4.5, certifications: ["SALES CERTIFIED"] },
  { id: 8, name: "Priya Patel", title: "Office Admin", dept: "Admin", status: "Active", phone: "(813) 555-0108", email: "p.patel@dealer.com", initials: "PP", color: "bg-pink-600", startDate: "Jan 2023", salary: "$38,000", ytdGross: "$19,000", reviews: 4.7, certifications: [] },
  { id: 9, name: "Carlos Mendez", title: "Lead Technician", dept: "Service", status: "Active", phone: "(813) 555-0109", email: "c.mendez@dealer.com", initials: "CM", color: "bg-orange-600", startDate: "Apr 2019", salary: "$58,000", ytdGross: "$29,300", reviews: 4.6, certifications: ["ASE CERTIFIED"] },
  { id: 10, name: "Linda Foster", title: "Internet Sales", dept: "BDC", status: "On Leave", phone: "(813) 555-0110", email: "l.foster@dealer.com", initials: "LF", color: "bg-teal-600", startDate: "Aug 2022", salary: "$40,000", ytdGross: "$14,200", reviews: 4.4, certifications: ["SALES CERTIFIED"] },
];

const payrollHistory = [
  { period: "May 1–15, 2026", amount: "$48,420", employees: 24, status: "Processing", date: "May 15, 2026" },
  { period: "Apr 16–30, 2026", amount: "$51,240", employees: 24, status: "Paid", date: "Apr 30, 2026" },
  { period: "Apr 1–15, 2026", amount: "$49,800", employees: 24, status: "Paid", date: "Apr 15, 2026" },
  { period: "Mar 16–31, 2026", amount: "$52,100", employees: 23, status: "Paid", date: "Mar 31, 2026" },
  { period: "Mar 1–15, 2026", amount: "$47,650", employees: 23, status: "Paid", date: "Mar 15, 2026" },
];

const openRoles = [
  { title: "Sales Consultant", dept: "Sales", posted: "5 days ago", applicants: 12, urgent: true },
  { title: "Service Advisor", dept: "Service", posted: "2 weeks ago", applicants: 7, urgent: false },
];

export default function HR() {
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const selected = selectedEmployee !== null ? employees[selectedEmployee] : null;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" /> HR & Payroll
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage employees, payroll, certifications, and open positions.</p>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0">
          <UserPlus className="h-4 w-4" /> Add Employee
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Headcount", val: "24", sub: "10 shown + 14 others", icon: Users, color: "text-primary" },
          { label: "Next Payroll", val: "May 15", sub: "$48,420 est.", icon: Receipt, color: "text-emerald-600" },
          { label: "Open Roles", val: "2", sub: "19 total applicants", icon: Briefcase, color: "text-amber-600" },
          { label: "Certifications Due", val: "4", sub: "Expiring in 30 days", icon: Shield, color: "text-rose-600" },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-muted"><kpi.icon className={`h-4 w-4 ${kpi.color}`} /></div>
              </div>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-xl font-bold">{kpi.val}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="directory">
        <TabsList className="w-full md:w-auto flex flex-wrap h-auto">
          <TabsTrigger value="directory" className="flex-1 md:flex-none">Directory</TabsTrigger>
          <TabsTrigger value="payroll" className="flex-1 md:flex-none">Payroll</TabsTrigger>
          <TabsTrigger value="hiring" className="flex-1 md:flex-none">Hiring</TabsTrigger>
          <TabsTrigger value="training" className="flex-1 md:flex-none">Training & Autopsy</TabsTrigger>
          <TabsTrigger value="reviews" className="flex-1 md:flex-none" onClick={() => toast.success("Manager 1-on-1 Log Opened", { description: "Document weekly coaching sessions with sales reps." })}>1-on-1 Logs</TabsTrigger>
        </TabsList>

        {/* DIRECTORY */}
        <TabsContent value="directory" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Employee Cards */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {employees.map((emp, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedEmployee(selectedEmployee === i ? null : i)}
                  className={`text-left p-3.5 rounded-xl border-2 transition-all hover:border-primary/30 ${selectedEmployee === i ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className={`${emp.color} text-white font-bold`}>{emp.initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{emp.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{emp.title}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${emp.status === 'Active' ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : 'border-amber-300 text-amber-700 bg-amber-50'}`}>
                      {emp.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{emp.reviews}</span>
                    <span>{emp.dept}</span>
                    <span>Since {emp.startDate}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Detail Panel */}
            <div>
              {selected ? (
                <Card className="sticky top-4">
                  <CardContent className="p-0">
                    <div className={`${selected.color} h-24 rounded-t-xl flex items-end justify-center pb-3`}>
                      <Avatar className="h-16 w-16 border-4 border-background shadow-lg">
                        <AvatarFallback className={`${selected.color} text-white text-xl font-bold`}>{selected.initials}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="text-center">
                        <p className="font-bold text-foreground">{selected.name}</p>
                        <p className="text-xs text-primary font-semibold">{selected.title}</p>
                        <Badge variant="outline" className="mt-1 text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50">{selected.status}</Badge>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5 shrink-0" /><span className="text-foreground">{selected.phone}</span></div>
                        <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5 shrink-0" /><span className="text-foreground text-xs">{selected.email}</span></div>
                        <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-3.5 w-3.5 shrink-0" /><span className="text-foreground">Started {selected.startDate}</span></div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-muted rounded-lg p-2.5 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Base Salary</p>
                          <p className="font-bold text-sm">{selected.salary}</p>
                        </div>
                        <div className="bg-muted rounded-lg p-2.5 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">YTD Gross</p>
                          <p className="font-bold text-sm text-emerald-600">{selected.ytdGross}</p>
                        </div>
                      </div>

                      {selected.certifications.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Certifications</p>
                          <div className="flex flex-wrap gap-1.5">
                            {selected.certifications.map(cert => (
                              <Badge key={cert} variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">{cert}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-bold text-muted-foreground uppercase">Performance</p>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(s => <Star key={s} className={`h-3 w-3 ${s <= Math.floor(selected.reviews) ? 'fill-amber-400 text-amber-400' : 'text-muted'}`} />)}
                          </div>
                        </div>
                        <Progress value={selected.reviews * 20} className="h-1.5" />
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 text-xs">Edit Profile</Button>
                        <Button size="sm" className="flex-1 text-xs">View Payroll</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed border-2 border-border">
                  <CardContent className="p-8 flex flex-col items-center justify-center text-center gap-3">
                    <Users className="h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-muted-foreground">Select an employee to view their profile, compensation, and certifications.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* PAYROLL */}
        <TabsContent value="payroll" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground font-medium mb-1">Next Payroll Run</p>
                <p className="text-2xl font-bold text-foreground">May 15, 2026</p>
                <p className="text-sm text-primary font-semibold mt-1">$48,420 estimated</p>
                <p className="text-xs text-muted-foreground">24 active employees</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground font-medium mb-1">MTD Payroll Cost</p>
                <p className="text-2xl font-bold">$48,420</p>
                <p className="text-xs text-muted-foreground mt-1">Period: May 1–15</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground font-medium mb-1">YTD Payroll Total</p>
                <p className="text-2xl font-bold">$248,210</p>
                <p className="text-xs text-muted-foreground mt-1">Jan 1 – May 14, 2026</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Payroll History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {payrollHistory.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${p.status === 'Processing' ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                        {p.status === 'Processing'
                          ? <Clock className="h-4 w-4 text-amber-600" />
                          : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{p.period}</p>
                        <p className="text-xs text-muted-foreground">{p.employees} employees · Processed {p.date}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="font-bold">{p.amount}</p>
                        <Badge variant="outline" className={`text-[10px] ${p.status === 'Processing' ? 'border-amber-300 text-amber-700 bg-amber-50' : 'border-emerald-300 text-emerald-700 bg-emerald-50'}`}>
                          {p.status}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs hidden sm:flex">
                        <FileText className="h-3.5 w-3.5 mr-1" /> Report
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HIRING */}
        <TabsContent value="hiring" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Track open positions and candidate applications.</p>
            <Button size="sm" className="gap-1.5"><UserPlus className="h-4 w-4" /> Post a Role</Button>
          </div>

          {openRoles.map((role, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold">{role.title}</p>
                        {role.urgent && <Badge className="bg-rose-500 text-white text-[10px]">Urgent</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{role.dept} Department · Posted {role.posted}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-bold text-primary">{role.applicants}</p>
                    <p className="text-xs text-muted-foreground">applicants</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="text-xs">View Applicants</Button>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">Edit Posting</Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card className="border-dashed border-2 border-border">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
              <div className="p-3 rounded-xl bg-muted">
                <Award className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="font-semibold">No active hires needed beyond open roles</p>
                <p className="text-sm text-muted-foreground">Staff levels are healthy. Monitor turnover and capacity here.</p>
              </div>
              <Button variant="outline" size="sm">Create Posting</Button>
            </CardContent>
          </Card>

          <Card className="bg-indigo-50/50 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/50 shadow-sm mt-6">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <BrainCircuit className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-indigo-900 dark:text-indigo-300">Automated AI Onboarding</h3>
              </div>
              <p className="text-sm text-indigo-800/80 dark:text-indigo-200/70 mb-4">
                Generate a personalized 30-day onboarding and training plan for new hires based on their role and experience level.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="bg-white dark:bg-slate-950 text-indigo-700" onClick={() => toast.success("AI Onboarding Plan Generated", { description: "30-day plan created for Sales Consultant role and emailed to new hire." })}>
                  Generate Sales Plan
                </Button>
                <Button variant="outline" className="bg-white dark:bg-slate-950 text-indigo-700" onClick={() => toast.success("AI Onboarding Plan Generated", { description: "30-day plan created for Service role and emailed to new hire." })}>
                  Generate Service Plan
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRAINING & AUTOPSY */}
        <TabsContent value="training" className="mt-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-bold">Training & Deal Autopsy Insights</h2>
              <p className="text-sm text-muted-foreground">Track common failure points and AI-generated prevention plans from lost deals.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-900 dark:text-indigo-400 dark:bg-indigo-900/30" onClick={() => {
                toast.warning("AI Attrition Alert", { description: "Marcus Davis has shown a 40% drop in CRM activity over 2 weeks. Suggested action: Schedule a 1-on-1 check-in." });
              }}>
                <BrainCircuit className="mr-2 h-4 w-4" /> Run Attrition Predictor
              </Button>
              <Button size="sm" className="gap-1.5"><BookOpen className="h-4 w-4" /> Assign Training</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-destructive/5 border-destructive/20 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <p className="font-bold text-destructive">Top Failure Point</p>
                </div>
                <p className="text-2xl font-black">Trade-in Valuation</p>
                <p className="text-sm text-muted-foreground mt-1">Responsible for 42% of lost deals this month.</p>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <p className="font-bold text-primary">Avg. Fatal Moment</p>
                </div>
                <p className="text-2xl font-black">45 Min Wait</p>
                <p className="text-sm text-muted-foreground mt-1">F&I wait time is causing significant drop-off.</p>
              </CardContent>
            </Card>
            <Card className="bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/50 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <BrainCircuit className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <p className="font-bold text-indigo-600 dark:text-indigo-400">AI Training Needs</p>
                </div>
                <p className="text-2xl font-black">Empathy First</p>
                <p className="text-sm text-muted-foreground mt-1">Recommended module for 3 sales reps.</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent Autopsy Insights</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {[
                  { fatal: "Trade-in Valuation", reason: "Customer felt insulted by initial $22k offer.", prevention: "Train team on the 'Empathy First' trade walkaround before presenting numbers.", date: "2 days ago", rep: "Marcus Davis" },
                  { fatal: "Response Time", reason: "Took 4.5 hours to respond to specific EV question.", prevention: "Implement auto-routing for EV-specific questions to the EV specialist team instantly.", date: "5 days ago", rep: "Keisha Brown" },
                  { fatal: "F&I Wait Time", reason: "Customer waited 2 hours for finance after agreeing to numbers.", prevention: "Implement 'Fast-Track' digital signing for Tier 1 credit customers.", date: "1 week ago", rep: "Derek Williams" }
                ].map((insight, i) => (
                  <div key={i} className="p-4 hover:bg-muted/20 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5">{insight.fatal}</Badge>
                          <span className="text-xs text-muted-foreground">Lost {insight.date} · Rep: {insight.rep}</span>
                        </div>
                        <p className="text-sm font-medium">{insight.reason}</p>
                        <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-md p-3 border border-emerald-100 dark:border-emerald-900/30 mt-2">
                          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" /> AI Prevention Plan
                          </p>
                          <p className="text-sm text-emerald-900/80 dark:text-emerald-200/70">{insight.prevention}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="shrink-0 mt-2 md:mt-0">
                        Assign Module
                      </Button>
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
