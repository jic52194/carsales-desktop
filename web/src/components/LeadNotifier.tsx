import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { refresh, get } from "@/lib/store";
import { getVehicle, vTitle } from "@/lib/inventory";
import { listRecords } from "@/lib/records";

/** Live new-lead alerts: in-app toast + native desktop notification (Electron / browser), via Supabase Realtime. */
export function LeadNotifier() {
  const { user } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!user) return;
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {});
    const ch = supabase.channel("leads-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, async (payload) => {
        const row: any = payload.new;
        const pref = listRecords<any>("notif_pref").find((r) => r.data?.userId === user.id)?.data;
        if (pref && pref.new_lead === false) { await refresh("customers").catch(() => {}); await refresh("leads").catch(() => {}); await refresh("tasks").catch(() => {}); return; }
        await refresh("customers").catch(() => {});
        await refresh("leads").catch(() => {});
        await refresh("tasks").catch(() => {});
        const c = get("customers", row.customer_id);
        const v = row.vehicle_id ? getVehicle(row.vehicle_id) : undefined;
        const who = c ? `${c.firstName} ${c.lastName}`.trim() : "New customer";
        const what = v ? vTitle(v) : (row.source || "Website");
        toast.success(`New lead: ${who}`, { description: what, action: { label: "Open", onClick: () => nav("/leads") }, duration: 15000 });
        try { if ("Notification" in window && Notification.permission === "granted") { const n = new Notification(`New lead — ${who}`, { body: `${what}${row.message ? `\n"${String(row.message).slice(0, 120)}"` : ""}`, tag: `lead-${row.id}` }); n.onclick = () => { window.focus(); nav("/leads"); }; } } catch {}
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, nav]);
  return null;
}
