import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { PLATFORM_LOGO } from "@/components/LoginScreen";

/** Shown after a correct password when the account has an authenticator app enrolled. */
export function TwoFactorScreen() {
  const { completeMfa, logout } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async (c: string) => {
    if (busy || c.length !== 6) return;
    setBusy(true); setError(null);
    try { await completeMfa(c); }
    catch (err: any) { setError(err.message || "That code didn't work"); setCode(""); setTimeout(() => inputRef.current?.focus(), 0); }
    finally { setBusy(false); }
  };
  useEffect(() => { if (code.length === 6) submit(code); }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-[200] bg-[#f6f7f9] overflow-y-auto">
      <div className="min-h-full flex flex-col items-center justify-center px-4 py-10">
        <img src={PLATFORM_LOGO} alt="CarSalesSoftware.com" className="h-14 w-auto object-contain mb-8" />
        <div className="w-full max-w-[380px] bg-white border border-slate-200 rounded-2xl shadow-sm p-7">
          <div className="flex items-center gap-2 mb-1"><ShieldCheck className="h-5 w-5 text-blue-600" /><h1 className="text-xl font-bold text-slate-900">Two-factor verification</h1></div>
          <p className="text-sm text-slate-500 mb-6">Enter the 6-digit code from your authenticator app.</p>
          <form onSubmit={(e) => { e.preventDefault(); submit(code); }} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="totp" className="font-semibold text-slate-800">Authentication code</Label>
              <Input ref={inputRef} id="totp" autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} placeholder="123456" value={code} disabled={busy}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} className="h-12 bg-slate-50 text-center text-2xl tracking-[0.5em] font-mono" />
            </div>
            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
            <Button type="submit" disabled={busy || code.length !== 6} className="w-full h-11 text-base font-bold bg-blue-600 hover:bg-blue-700">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
            </Button>
          </form>
          <div className="border-t my-6" />
          <Button type="button" variant="ghost" className="w-full" onClick={logout}>Use a different account</Button>
        </div>
        <p className="text-xs text-slate-500 mt-6">Powered by CarSalesSoftware.com</p>
      </div>
    </div>
  );
}
