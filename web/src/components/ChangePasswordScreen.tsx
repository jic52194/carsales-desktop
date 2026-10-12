import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth, setPassword } from "@/lib/auth";
import { PLATFORM_LOGO } from "@/components/LoginScreen";

/** Blocking screen for accounts flagged must_change_password (new users, admin resets). */
export function ChangePasswordScreen() {
  const { user, refresh, logout } = useAuth();
  const [a, setA] = useState(""); const [b, setB] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (a.length < 6) return toast.error("Use at least 6 characters");
    if (a !== b) return toast.error("Passwords don't match");
    setBusy(true);
    try { await setPassword(user!.id, a); refresh(); toast.success("Password updated"); } catch (err: any) { toast.error(err.message); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 space-y-6">
        <img src={PLATFORM_LOGO} alt="CarSalesSoftware.com" className="h-12 w-auto mx-auto object-contain" />
        <div className="text-center"><h1 className="text-xl font-black text-slate-900">Set your password</h1><p className="text-sm text-slate-500">Hi {user?.fullName.split(" ")[0]} — choose a new password before continuing.</p></div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label>New password</Label><Input type="password" value={a} onChange={(e) => setA(e.target.value)} autoFocus /></div>
          <div className="space-y-1.5"><Label>Confirm</Label><Input type="password" value={b} onChange={(e) => setB(e.target.value)} /></div>
          <Button type="submit" className="w-full h-11 font-bold bg-blue-600 hover:bg-blue-700" disabled={busy}>Save and continue</Button>
          <Button type="button" variant="ghost" className="w-full" onClick={logout}>Sign out</Button>
        </form>
      </div>
    </div>
  );
}
