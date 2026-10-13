import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth, ROLE_LABELS } from "@/lib/auth";

/** Global banner while an owner/super-admin is viewing the app as another user. */
export function ViewAsBanner() {
  const { viewAs, location, endViewAs } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!viewAs) return null;
  const u = viewAs.user;
  const store = location?.name ?? "All stores";
  const exit = async () => { setBusy(true); try { await endViewAs(); toast.success("Back to your own account"); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); } };
  return (
    <div className="shrink-0 z-50 flex flex-wrap items-center gap-x-3 gap-y-1 px-3 md:px-5 py-2 bg-amber-400 text-amber-950 text-sm">
      <Eye className="h-4 w-4 shrink-0" />
      <span className="font-semibold">Viewing as {u.fullName}</span>
      <span className="text-amber-900/80">({ROLE_LABELS[u.role]} · {store})</span>
      <span className="hidden sm:inline text-amber-900/80">— changes you make are recorded under your own account</span>
      <Button size="sm" variant="outline" className="ml-auto h-7 bg-white/70 border-amber-700/30 hover:bg-white text-amber-950" onClick={exit} disabled={busy}>{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Exit View-as"}</Button>
    </div>
  );
}
