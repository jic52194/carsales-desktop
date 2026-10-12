import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ShieldAlert, ShieldCheck, Key, Users, Activity, Lock, Smartphone, Globe, AlertTriangle, RefreshCw, CheckCircle2, Sparkles } from "lucide-react";
import { hapticFeedback } from "@/lib/haptics";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

const AUDIT_LOGS = [
  { id: 1, action: "Failed Login Attempt", user: "Unknown", ip: "192.168.1.105", location: "Moscow, RU", time: "2 mins ago", severity: "high" },
  { id: 2, action: "Deal Parameter Override", user: "Mike Manager", ip: "10.0.0.45", location: "Dealership HQ", time: "15 mins ago", severity: "medium" },
  { id: 3, action: "Customer PII Export", user: "Sarah Jenkins", ip: "10.0.0.12", location: "Dealership HQ", time: "1 hour ago", severity: "medium" },
  { id: 4, action: "Successful Login", user: "John Owner", ip: "172.16.0.4", location: "Austin, TX", time: "3 hours ago", severity: "low" },
  { id: 5, action: "API Key Generated", user: "Admin", ip: "10.0.0.2", location: "Dealership HQ", time: "1 day ago", severity: "high" },
];

const ACTIVE_SESSIONS = [
  { id: "s1", user: "John Owner", device: "MacBook Pro - Chrome", ip: "172.16.0.4", current: true },
  { id: "s2", user: "Mike Manager", device: "iPad Pro - Safari", ip: "10.0.0.45", current: false },
  { id: "s3", user: "Sarah Jenkins", device: "iPhone 14 - App", ip: "10.0.0.12", current: false },
];

export default function SecurityCenter() {
  const [logs, setLogs] = useState(AUDIT_LOGS);
  const [sessions, setSessions] = useState(ACTIVE_SESSIONS);
  const [isLocked, setIsLocked] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [authStep, setAuthStep] = useState<'idle' | 'scanning' | 'success'>('idle');

  const handleBiometricAuth = () => {
    setIsScanning(true);
    setAuthStep('scanning');
    hapticFeedback();
    
    setTimeout(() => {
      setAuthStep('success');
      hapticFeedback();
      setTimeout(() => {
        setIsLocked(false);
        toast.success("Biometric identity verified.");
      }, 800);
    }, 2000);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high": return <Badge variant="destructive" className="flex items-center gap-1 font-black uppercase text-[10px]"><ShieldAlert className="w-3 h-3" /> High</Badge>;
      case "medium": return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1 font-black uppercase text-[10px]"><AlertTriangle className="w-3 h-3" /> Medium</Badge>;
      case "low": return <Badge variant="secondary" className="bg-slate-100 text-slate-600 flex items-center gap-1 font-black uppercase text-[10px]"><ShieldCheck className="w-3 h-3" /> Low</Badge>;
      default: return null;
    }
  };

  if (isLocked) {
    return (
      <div className="min-h-full flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
        <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden rounded-3xl">
          <div className="bg-slate-900 p-12 flex flex-col items-center text-center space-y-8">
            <div className="relative">
              <div className={`h-24 w-24 rounded-full border-2 border-primary/20 flex items-center justify-center transition-all duration-500 ${authStep === 'scanning' ? 'scale-110' : ''}`}>
                {authStep === 'idle' && <Shield className="h-10 w-10 text-primary animate-pulse" />}
                {authStep === 'scanning' && (
                  <div className="relative">
                    <Users className="h-10 w-10 text-primary" />
                    <div className="absolute inset-0 bg-primary/20 animate-scan border-t-2 border-primary w-full h-1" />
                  </div>
                )}
                {authStep === 'success' && <ShieldCheck className="h-12 w-12 text-emerald-500 animate-in zoom-in duration-300" />}
              </div>
              {authStep === 'scanning' && (
                <div className="absolute -inset-4 border-2 border-primary/30 border-dashed rounded-full animate-spin-slow" />
              )}
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tight">Security Access Required</h2>
              <p className="text-slate-400 text-sm font-medium">Verify your identity to access the Security Center</p>
            </div>

            <Button 
              onClick={handleBiometricAuth}
              disabled={authStep !== 'idle'}
              className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 group"
            >
              {authStep === 'idle' ? (
                <span className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  Verify Identity
                </span>
              ) : authStep === 'scanning' ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Scanning Face ID...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Identity Verified
                </span>
              )}
            </Button>

            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest pt-4">
              <Lock className="h-3 w-3" />
              End-to-End Encrypted
      </div>

      <Card className="border-primary/20 bg-primary/5 shadow-lg shadow-primary/5 overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
          <Sparkles className="h-24 w-24 text-primary" />
        </div>
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
              <Sparkles className="h-10 w-10 text-primary animate-pulse" />
            </div>
            <div className="flex-1 space-y-3 text-center md:text-left">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">AI Security Intelligence</h3>
              <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                "System is currently performing at 98.4% security efficiency. I've detected 3 unusual login patterns from roaming sales reps and automatically enforced 2FA challenges. No immediate threats found, but recommend rotating the CDK Global API keys as they expire in 48 hours."
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-2">
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">98% Store Health</Badge>
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20">3 Auto-Challenges</Badge>
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Key Rotation Due</Badge>
              </div>
            </div>
            <Button className="shrink-0 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 font-bold px-8 h-12 rounded-xl shadow-lg">
              Full AI Audit
            </Button>
          </div>
        </CardContent>
      </Card>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-slate-900 dark:bg-white rounded-2xl flex items-center justify-center shadow-xl">
            <Shield className="h-10 w-10 text-white dark:text-slate-900" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Security Center</h1>
            <p className="text-slate-500 font-bold uppercase text-xs tracking-widest flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              System Secured
            </p>
          </div>
        </div>
        <Button className="gap-2 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
          <Key className="h-4 w-4" /> Rotate API Keys
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/50 dark:bg-emerald-900/10">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Threat Level</p>
                <p className="text-4xl font-black text-emerald-800 dark:text-emerald-300">LOW</p>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-800/50 rounded-xl">
                <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-sm text-emerald-600 dark:text-emerald-500 mt-4 font-medium">All systems operating normally. No active breaches.</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Active Sessions</p>
                <p className="text-4xl font-black text-slate-900 dark:text-white">{sessions.length}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-4 font-medium">Across 3 different IP addresses.</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Blocked Attacks</p>
                <p className="text-4xl font-black text-slate-900 dark:text-white">142</p>
              </div>
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <Lock className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-4 font-medium">In the last 30 days via WAF.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-md">
          <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary" /> Security Audit Log
            </CardTitle>
            <CardDescription>Real-time monitoring of all sensitive system actions.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Action</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>User / IP</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right pr-6">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="pl-6 font-medium">{log.action}</TableCell>
                      <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                      <TableCell>
                        <div className="text-sm font-bold">{log.user}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{log.ip}</div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 flex items-center gap-1 mt-2">
                        <Globe className="h-3 w-3" /> {log.location}
                      </TableCell>
                      <TableCell className="text-right pr-6 text-xs text-slate-500 font-medium">{log.time}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="h-5 w-5 text-primary" /> Active Sessions
            </CardTitle>
            <CardDescription>Currently logged in devices.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {sessions.map((session) => (
                <div key={session.id} className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-sm">{session.device}</p>
                      <p className="text-xs font-medium text-slate-500 mt-1">{session.user} • {session.ip}</p>
                    </div>
                    {session.current ? (
                      <Badge className="bg-emerald-500">Current</Badge>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs text-destructive hover:bg-destructive hover:text-white"
                        onClick={() => {
                          setSessions(sessions.filter(s => s.id !== session.id));
                          toast.success("Session revoked successfully.");
                        }}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
