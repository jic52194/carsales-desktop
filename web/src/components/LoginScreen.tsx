import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, Loader2, Lock, User } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const PLATFORM_LOGO = "https://assets.cdn.filesafe.space/C0zjPUHUreayXhYgJtbb/media/69ee67ab0d66f2a665601086.png";

/** Platform-branded (CarSalesSoftware.com) sign-in. The dealership brand takes over after login. */
export function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try { await login(username, password, remember); }
    catch (err: any) { setError(err.message || "Sign-in failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.25),_transparent_60%)]" />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 space-y-8">
        <div className="text-center space-y-3">
          <img src={PLATFORM_LOGO} alt="CarSalesSoftware.com" className="h-14 w-auto mx-auto object-contain" />
          <h1 className="text-xl font-black text-slate-900">CarSales AI OS</h1>
          <p className="text-sm text-slate-500">Sign in to your dealership</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input id="username" autoFocus autoComplete="username" placeholder="first.last" value={username} onChange={(e) => setUsername(e.target.value)} className="pl-9 h-11" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 h-11" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
            <Label htmlFor="remember" className="text-sm font-normal text-slate-600">Keep me signed in on this computer</Label>
          </div>
          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          <Button type="submit" disabled={busy || !username || !password} className="w-full h-11 text-base font-bold bg-blue-600 hover:bg-blue-700">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign In <ArrowRight className="ml-2 h-4 w-4" /></>}
          </Button>
        </form>
        <p className="text-center text-xs text-slate-400">CarSalesSoftware.com &copy; {new Date().getFullYear()} &middot; Need access? Contact your dealership administrator.</p>
      </div>
    </div>
  );
}
