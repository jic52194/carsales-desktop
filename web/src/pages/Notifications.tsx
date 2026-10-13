import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bell, BellRing, BellOff, CheckCircle2, Clock, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useRecords, addRecord, updateRecord } from "@/lib/records";
import { useAuth } from "@/lib/auth";

/** Per-user preferences — records kind "notif_pref", one record per userId. */
export interface NotifPref { userId: string; new_lead: boolean; appointment_reminder: boolean; overdue_task: boolean; deal_status: boolean }
type PrefKey = Exclude<keyof NotifPref, "userId">;
const DEFAULTS: Omit<NotifPref, "userId"> = { new_lead: true, appointment_reminder: true, overdue_task: true, deal_status: false };

const PREFS: { key: PrefKey; title: string; desc: string; status: "live" | "planned"; how: string }[] = [
  { key: "new_lead", title: "New lead", desc: "A lead arrives from the website, an import or a teammate.", status: "live", how: "In-app toast + desktop notification the moment the lead row is created (Supabase Realtime). Your choice is saved now; the live alert starts honoring it in the next app update." },
  { key: "appointment_reminder", title: "Appointment reminder", desc: "Heads-up before a test drive, delivery or sales appointment you own.", status: "planned", how: "Will be sent by the backend scheduler as SMS via GoHighLevel once that connection is live. Today the appointment shows on your Dashboard." },
  { key: "overdue_task", title: "Overdue task", desc: "A task assigned to you passes its due time.", status: "planned", how: "Planned as a desktop + SMS nudge. Today overdue tasks are flagged on the Dashboard and in My Tasks." },
  { key: "deal_status", title: "Deal status changes", desc: "A deal you're on moves to approved, funded, delivered or dead.", status: "planned", how: "Planned for managers and F&I. Today status changes are visible on the Deals board and in the Activity log." },
];

export default function Notifications() {
  const { user } = useAuth();
  const prefs = useRecords<NotifPref>("notif_pref");
  const mine = useMemo(() => prefs.find((p) => p.data.userId === user?.id), [prefs, user?.id]);
  const value: Omit<NotifPref, "userId"> = { ...DEFAULTS, ...(mine?.data ?? {}) };
  const supported = typeof window !== "undefined" && "Notification" in window;
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(supported ? Notification.permission : "unsupported");
  const [saving, setSaving] = useState(false);

  const set = async (key: PrefKey, on: boolean) => {
    if (!user) return;
    setSaving(true);
    try { if (mine) await updateRecord<NotifPref>("notif_pref", mine.id, { [key]: on } as Partial<NotifPref>); else await addRecord<NotifPref>("notif_pref", { userId: user.id, ...DEFAULTS, [key]: on }, user.id); }
    catch (e: any) { toast.error(e.message || "Could not save"); }
    finally { setSaving(false); }
  };

  const test = async () => {
    if (!supported) return toast.error("This browser doesn't support desktop notifications");
    let p = Notification.permission;
    if (p === "default") { try { p = await Notification.requestPermission(); } catch { /* ignored */ } setPerm(p); }
    if (p !== "granted") return toast.error("Desktop notifications are blocked", { description: "Allow notifications for this app in your browser or OS settings, then try again." });
    try { const n = new Notification("CarSales AI OS", { body: `Desktop notifications are working, ${user?.fullName.split(" ")[0] || "there"}.`, icon: "/favicon.svg", tag: "cso-test" }); n.onclick = () => window.focus(); toast.success("Sent — check the corner of your screen"); }
    catch (e: any) { toast.error(e.message || "Could not show a notification"); }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div><h1 className="text-3xl font-black">Notifications</h1><p className="text-muted-foreground">What you want to be told about, and how it reaches you.{saving ? " Saving…" : ""}</p></div>

      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Desktop notifications</CardTitle><CardDescription>Native alerts on this device while the app is open (browser or Windows app). Permission is per device.</CardDescription></CardHeader><CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          {perm === "granted" ? <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Allowed on this device</> : perm === "denied" ? <><BellOff className="h-4 w-4 text-destructive" /> Blocked on this device — re-enable in your browser's site settings</> : perm === "unsupported" ? <><BellOff className="h-4 w-4 text-muted-foreground" /> Not supported in this browser</> : <><Clock className="h-4 w-4 text-amber-600" /> Not asked yet — the test button will ask</>}
        </div>
        <Button onClick={test} disabled={perm === "unsupported"}><BellRing className="h-4 w-4 mr-1" /> Test desktop notification</Button>
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="text-base">What to notify me about</CardTitle><CardDescription>Saved to your account and used by every channel as it comes online.</CardDescription></CardHeader><CardContent className="divide-y">
        {PREFS.map((p) => (
          <div key={p.key} className="py-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold flex items-center gap-2">{p.title}{p.status === "live" ? <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">fires today</Badge> : <Badge variant="outline" className="text-[10px]">coming with SMS</Badge>}</p>
              <p className="text-sm text-muted-foreground">{p.desc}</p>
              <p className="text-xs text-muted-foreground mt-1">{p.how}</p>
            </div>
            <Switch checked={value[p.key]} onCheckedChange={(v) => set(p.key, v)} />
          </div>
        ))}
      </CardContent></Card>

      <Card className="bg-muted/40"><CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> How delivery works</CardTitle></CardHeader><CardContent className="text-sm space-y-2 text-muted-foreground">
        <p><span className="font-medium text-foreground">Today:</span> new-lead alerts are pushed live to every signed-in device as an in-app toast and, where allowed, a desktop notification. The backend also creates the first follow-up task for each new lead automatically.</p>
        <p><span className="font-medium text-foreground">Next:</span> SMS and email delivery through GoHighLevel for reminders, overdue tasks and deal status — once GHL is connected in <Link to="/settings" className="text-primary underline-offset-2 hover:underline">Settings → Connections</Link>. Your choices above carry over; nothing to redo.</p>
        <p>Turning a switch off here only affects you. Managers still see everything on the Dashboard and in the Activity log.</p>
      </CardContent></Card>
    </div>
  );
}
