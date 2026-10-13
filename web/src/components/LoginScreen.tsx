import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Download } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const PLATFORM_LOGO = "https://assets.cdn.filesafe.space/C0zjPUHUreayXhYgJtbb/media/69ee67ab0d66f2a665601086.png";
export const WINDOWS_APP_URL = "https://github.com/jic52194/carsales-desktop/releases/latest/download/CarSalesAIOS-Setup.exe";
const isDesktop = typeof window !== "undefined" && !!(window as any).carsalesNative;
export const LOGIN_SLUG_KEY = "cso:login-slug";

export interface TenantBrand { slug: string; name: string; logo_url?: string | null; colors?: { primary?: string; secondary?: string; accent?: string } | null; tagline?: string | null }

/** Path relative to the app base, e.g. "/login/best-price" → "login/best-price". */
export function appRelativePath(): string {
  if (typeof window === "undefined") return "";
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  let p = window.location.pathname;
  if (base && p.startsWith(base)) p = p.slice(base.length);
  return p.replace(/^\/+/, "");
}
/** Dealer slug from /login/<slug>, falling back to the last slug used on this device (desktop app). */
export function loginSlugFromLocation(): string | null {
  const m = appRelativePath().match(/^login\/([a-z0-9][a-z0-9-]*)\/?$/i);
  if (m) return m[1].toLowerCase();
  try { return localStorage.getItem(LOGIN_SLUG_KEY); } catch { return null; }
}

/** Platform-branded (CarSalesSoftware.com) sign-in; shows the dealership's brand at /login/<slug>. */
export function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brand, setBrand] = useState<TenantBrand | null>(null);

  useEffect(() => {
    const slug = loginSlugFromLocation();
    if (!slug) return;
    let alive = true;
    supabase.rpc("tenant_brand", { p_slug: slug }).then(({ data }) => {
      if (!alive) return;
      const b = (Array.isArray(data) ? data[0] : data) as TenantBrand | null;
      if (b && b.name) { setBrand(b); try { localStorage.setItem(LOGIN_SLUG_KEY, b.slug || slug); } catch {} }
      else { try { if (localStorage.getItem(LOGIN_SLUG_KEY) === slug) localStorage.removeItem(LOGIN_SLUG_KEY); } catch {} }
    }, () => {});
    return () => { alive = false; };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try { await login(username, password); }
    catch (err: any) { setError(err.message || "Sign-in failed"); }
    finally { setBusy(false); }
  };

  const primary = brand?.colors?.primary && /^#[0-9a-f]{6}$/i.test(brand.colors.primary) ? brand.colors.primary : null;
  const title = brand ? `Sign in to ${brand.name}` : "Sign in to CarSales AI OS";
  const tagline = brand?.tagline || "Inventory, customers, desking and deals for your dealership.";

  return (
    <div className="fixed inset-0 z-[200] bg-[#f6f7f9] overflow-y-auto">
      <div className="min-h-full flex flex-col items-center justify-center px-4 py-10">
        {brand?.logo_url
          ? <img src={brand.logo_url} alt={brand.name} className="h-16 w-auto max-w-[260px] object-contain mb-8" onError={(e) => { (e.target as HTMLImageElement).src = PLATFORM_LOGO; }} />
          : brand
            ? <h2 className="text-2xl font-black text-slate-900 mb-8 text-center">{brand.name}</h2>
            : <img src={PLATFORM_LOGO} alt="CarSalesSoftware.com" className="h-14 w-auto object-contain mb-8" />}
        <div className="w-full max-w-[380px] bg-white border border-slate-200 rounded-2xl shadow-sm p-7">
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500 mt-1 mb-6">{tagline}</p>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="font-semibold text-slate-800">Username or email</Label>
              <Input id="username" autoFocus autoComplete="username" placeholder="username or you@company.com" value={username} onChange={(e) => setUsername(e.target.value)} className="h-11 bg-slate-50" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="font-semibold text-slate-800">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 bg-slate-50" />
            </div>
            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
            <Button type="submit" disabled={busy || !username || !password} className={`w-full h-11 text-base font-bold ${primary ? "text-white hover:opacity-90" : "bg-blue-600 hover:bg-blue-700"}`} style={primary ? { backgroundColor: primary } : undefined}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>
          {!isDesktop && (
            <>
              <div className="border-t my-6" />
              <Button asChild variant="outline" className="w-full h-11"><a href={WINDOWS_APP_URL}><Download className="h-4 w-4 mr-2" /> Download desktop app (Windows)</a></Button>
              <p className="text-xs text-slate-500 text-center mt-3">Native app with auto-updates and offline access.</p>
            </>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-6">Powered by CarSalesSoftware.com{!isDesktop && <> · <a className="underline" href={WINDOWS_APP_URL}>Get the Windows app</a></>}</p>
      </div>
    </div>
  );
}
