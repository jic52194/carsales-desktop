import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, ShieldCheck, ShieldOff, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth, setPassword } from "@/lib/auth";

interface Factor { id: string; friendly_name?: string | null; status: "verified" | "unverified"; created_at?: string }

/** Settings → Security: authenticator-app 2FA for the signed-in account + change password. */
export function SecurityTab() {
  const { account, aal } = useAuth();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [loading, setLoading] = useState(true);
  // enrollment flow
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [removeFor, setRemoveFor] = useState<Factor | null>(null);
  // change password
  const [pwA, setPwA] = useState(""); const [pwB, setPwB] = useState(""); const [pwBusy, setPwBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const { data, error } = await supabase.auth.mfa.listFactors(); if (error) throw error; setFactors(((data?.totp ?? []) as any[]).map((f) => ({ id: f.id, friendly_name: f.friendly_name, status: f.status, created_at: f.created_at }))); }
    catch (e: any) { toast.error(e.message || "Couldn't load 2FA status"); setFactors([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const verified = (factors ?? []).filter((f) => f.status === "verified");
  const stale = (factors ?? []).filter((f) => f.status !== "verified");

  const startEnroll = async () => {
    setBusy(true);
    try {
      // Supabase refuses a second factor with the same name; clear abandoned, unverified ones first.
      for (const f of stale) { await supabase.auth.mfa.unenroll({ factorId: f.id }).catch(() => {}); }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "CarSales AI OS" });
      if (error) throw error;
      setEnroll({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret }); setCode("");
    } catch (e: any) { toast.error(e.message || "Couldn't start setup"); }
    finally { setBusy(false); }
  };
  const cancelEnroll = async () => {
    if (enroll) await supabase.auth.mfa.unenroll({ factorId: enroll.factorId }).catch(() => {});
    setEnroll(null); setCode(""); load();
  };
  const confirmEnroll = async () => {
    if (!enroll || code.length !== 6) return;
    setBusy(true);
    try {
      const { data: ch, error: e1 } = await supabase.auth.mfa.challenge({ factorId: enroll.factorId }); if (e1) throw e1;
      const { error: e2 } = await supabase.auth.mfa.verify({ factorId: enroll.factorId, challengeId: ch.id, code });
      if (e2) throw new Error(/invalid|expired/i.test(e2.message) ? "That code didn't work. Codes change every 30 seconds — try the current one." : e2.message);
      toast.success("Authenticator app connected. You'll be asked for a code at your next sign-in.");
      setEnroll(null); setCode(""); await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };
  const removeFactor = async () => {
    if (!removeFor) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: removeFor.id });
      if (error) throw new Error(/aal2|assurance|insufficient/i.test(error.message) ? "To remove your authenticator, sign out and sign back in with your code first, then try again." : error.message);
      toast.success("Authenticator removed"); setRemoveFor(null); await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };
  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwA.length < 6) return toast.error("Use at least 6 characters");
    if (pwA !== pwB) return toast.error("Passwords don't match");
    setPwBusy(true);
    try { await setPassword(account!.id, pwA); toast.success("Password updated"); setPwA(""); setPwB(""); } catch (err: any) { toast.error(err.message); } finally { setPwBusy(false); }
  };

  const qrSrc = enroll ? (enroll.qr.startsWith("data:") ? enroll.qr : `data:image/svg+xml;utf8,${encodeURIComponent(enroll.qr)}`) : "";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">Two-factor authentication {!loading && (verified.length ? <Badge className="bg-emerald-600 hover:bg-emerald-600">On</Badge> : <Badge variant="outline">Off</Badge>)}</CardTitle>
            <CardDescription>Admins and owners with 2FA on must enter a code from their authenticator app to sign in; sensitive settings (users, pay plans, HR, accounting) require it.</CardDescription>
          </div>
          {!loading && !verified.length && <Button onClick={startEnroll} disabled={busy}><ShieldCheck className="h-4 w-4 mr-1" /> Set up authenticator</Button>}
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Checking…</p>
            : verified.length ? verified.map((f) => (
              <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-emerald-600" /><div><p className="text-sm font-semibold">{f.friendly_name || "Authenticator app"}</p><p className="text-xs text-muted-foreground">{f.created_at ? `Added ${new Date(f.created_at).toLocaleDateString()}` : "Time-based one-time codes"}{aal === "aal2" ? " · verified this session" : ""}</p></div></div>
                <Button variant="outline" size="sm" onClick={() => setRemoveFor(f)} disabled={busy}><ShieldOff className="h-4 w-4 mr-1" /> Remove authenticator</Button>
              </div>))
            : <p className="text-sm text-muted-foreground">No authenticator app is connected to your account ({account?.username}). Use Google Authenticator, Microsoft Authenticator, 1Password or any TOTP app.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Change password</CardTitle><CardDescription>Choose a new password for your own account.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="grid sm:grid-cols-2 gap-3 max-w-xl">
            <div className="space-y-1"><Label>New password</Label><Input type="password" autoComplete="new-password" value={pwA} onChange={(e) => setPwA(e.target.value)} /></div>
            <div className="space-y-1"><Label>Confirm</Label><Input type="password" autoComplete="new-password" value={pwB} onChange={(e) => setPwB(e.target.value)} /></div>
            <div className="sm:col-span-2"><Button type="submit" disabled={pwBusy || !pwA || !pwB}>{pwBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}</Button></div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={!!enroll} onOpenChange={(o) => { if (!o) cancelEnroll(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Set up authenticator</DialogTitle><DialogDescription>Scan the code with your authenticator app, then enter the 6-digit code it shows.</DialogDescription></DialogHeader>
          {enroll && (
            <div className="space-y-4">
              <div className="flex justify-center"><img src={qrSrc} alt="Scan with your authenticator app" className="h-48 w-48 rounded-lg border bg-white p-2" /></div>
              <div className="space-y-1"><Label className="text-xs text-muted-foreground">Can't scan? Enter this key manually</Label><p className="font-mono text-sm break-all rounded-md bg-muted px-3 py-2 select-all">{enroll.secret}</p></div>
              <div className="space-y-1"><Label htmlFor="enroll-code">6-digit code</Label><Input id="enroll-code" autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} onKeyDown={(e) => { if (e.key === "Enter") confirmEnroll(); }} className="text-center text-xl tracking-[0.4em] font-mono" /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={cancelEnroll} disabled={busy}>Cancel</Button><Button onClick={confirmEnroll} disabled={busy || code.length !== 6}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & turn on"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removeFor} onOpenChange={(o) => !o && setRemoveFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remove authenticator?</AlertDialogTitle><AlertDialogDescription>Your account will sign in with just a password. Admins and owners lose access to sensitive settings until 2FA is set up again.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel><AlertDialogAction onClick={(e) => { e.preventDefault(); removeFactor(); }} disabled={busy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
