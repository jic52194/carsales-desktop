import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Thin banner when the computer loses internet. Local data keeps working; VIN decode and photos need a connection. */
export function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  if (online) return null;
  return <div className="fixed top-0 inset-x-0 z-[90] bg-amber-500 text-amber-950 text-xs font-semibold text-center py-1 flex items-center justify-center gap-2"><WifiOff className="h-3 w-3" /> Offline — your work is saved on this computer; VIN decode and photos resume when you're back online.</div>;
}
