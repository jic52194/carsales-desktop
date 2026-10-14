import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Calendar, ListTodo, MessageSquare, UserPlus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/lib/auth";
import { useCollection, fullName } from "@/lib/store";
import { useRecords } from "@/lib/records";
import { isInbound } from "@/components/AppSidebar";

const SEEN_KEY = "cso:notif-seen";
const H = 3_600_000;

interface Item { id: string; at: string; /** when it became a notification (for unread) */ arrived: string; title: string; desc?: string; to: string; kind: "lead" | "message" | "task" | "appt" | "alert" }
const ICON = { lead: UserPlus, message: MessageSquare, task: ListTodo, appt: Calendar, alert: AlertTriangle } as const;
const TONE = {
  lead: "bg-primary/10 text-primary",
  message: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  task: "bg-destructive/10 text-destructive",
  appt: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
} as const;

function ago(iso: string, now: number) {
  const d = now - new Date(iso).getTime();
  if (d < 0) { const m = Math.round(-d / 60_000); return m < 60 ? `in ${m}m` : `in ${Math.round(m / 60)}h`; }
  const m = Math.floor(d / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

/** Real notifications built from the dealership's own data — nothing synthetic. */
export function useNotifications(): Item[] {
  const { user } = useAuth();
  const customers = useCollection("customers");
  const leads = useCollection("leads");
  const tasks = useCollection("tasks");
  const appts = useCollection("appointments");
  const messages = useRecords<{ customerId?: string; direction?: string; body?: string; at?: string; channel?: string }>("message");
  const alerts = useRecords<{ title?: string; desc?: string; at?: string; to?: string }>("alert");
  const { hasPermission } = useAuth();
  const isAdmin = hasPermission(["admin"]);
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 60_000); return () => clearInterval(t); }, []);

  return useMemo(() => {
    const now = Date.now();
    const byId = new Map(customers.map((c) => [c.id, c]));
    const name = (id?: string) => (id && byId.get(id) ? fullName(byId.get(id)) : "Unknown customer");
    const items: Item[] = [];
    for (const l of leads) {
      if (l.stage !== "new" || now - new Date(l.createdAt).getTime() > 48 * H) continue;
      items.push({ id: `lead:${l.id}`, at: l.createdAt, arrived: l.createdAt, kind: "lead", title: `New lead — ${name(l.customerId)}`, desc: l.source ? `Source: ${l.source}` : undefined, to: l.customerId ? `/customers/${l.customerId}` : "/leads" });
    }
    for (const m of messages) {
      if (!isInbound(m.data?.direction)) continue;
      const at = m.data.at || m.createdAt;
      if (now - new Date(at).getTime() > 48 * H) continue;
      items.push({ id: `msg:${m.id}`, at, arrived: at, kind: "message", title: `Message from ${name(m.data.customerId)}`, desc: m.data.body?.slice(0, 90), to: "/inbox" });
    }
    for (const t of tasks) {
      if (t.status !== "open" || !t.dueAt || new Date(t.dueAt).getTime() >= now) continue;
      if (t.assignedTo && t.assignedTo !== user?.id) continue;
      items.push({ id: `task:${t.id}`, at: t.dueAt, arrived: t.dueAt, kind: "task", title: `Overdue: ${t.title}`, desc: t.assignedTo ? "Assigned to you" : "Unassigned", to: "/tasks" });
    }
    const today = new Date(now).toDateString();
    for (const a of appts) {
      const start = new Date(a.startsAt).getTime();
      if (a.status === "cancelled" || new Date(a.startsAt).toDateString() !== today || start < now || start - now > 2 * H) continue;
      const label = a.type.replace("_", " ");
      items.push({ id: `appt:${a.id}`, at: a.startsAt, arrived: new Date(start - 2 * H).toISOString(), kind: "appt", title: `${label[0].toUpperCase()}${label.slice(1)} at ${new Date(a.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`, desc: name(a.customerId), to: "/appointments" });
    }
    if (isAdmin) for (const a of alerts) {
      const at = a.data?.at || a.createdAt;
      if (now - new Date(at).getTime() > 72 * H) continue;
      items.push({ id: `alert:${a.id}`, at, arrived: at, kind: "alert", title: `⚠ ${a.data?.title ?? "Connection problem"}`, desc: a.data?.desc?.slice(0, 110), to: a.data?.to || "/system-check" });
    }
    // Newest first.
    return items.sort((a, b) => (a.at < b.at ? 1 : -1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, leads, tasks, appts, messages, alerts, isAdmin, user?.id, tick]);
}

export function NotificationsBell() {
  const items = useNotifications();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<string>(() => { try { return localStorage.getItem(SEEN_KEY) || ""; } catch { return ""; } });
  // "Unread" = items that became notifications since the bell was last opened.
  const unread = items.filter((i) => !seen || i.arrived > seen).length;
  const markSeen = () => { const iso = new Date().toISOString(); setSeen(iso); try { localStorage.setItem(SEEN_KEY, iso); } catch { /* ignore */ } };
  const now = Date.now();

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) markSeen(); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label={unread ? `${unread} unread notifications` : "Notifications"} title="Notifications">
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-4 text-center">{unread > 9 ? "9+" : unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[calc(100vw-2rem)] max-w-sm p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="font-semibold text-sm">Notifications</p>
          <Link to="/notifications" onClick={() => setOpen(false)} className="text-xs text-primary hover:underline">View all</Link>
        </div>
        {items.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <p className="mt-2 text-sm font-medium">You're all caught up</p>
            <p className="text-xs text-muted-foreground">New leads, inbound messages, overdue tasks and upcoming appointments show up here.</p>
          </div>
        ) : (
          <ul className="max-h-[60vh] overflow-y-auto divide-y">
            {items.slice(0, 40).map((i) => {
              const Icon = ICON[i.kind];
              return (
                <li key={i.id}>
                  <Link to={i.to} onClick={() => setOpen(false)} className="flex gap-3 px-4 py-3 hover:bg-muted/60 transition-colors">
                    <span className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${TONE[i.kind]}`}><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium truncate">{i.title}</span>
                      {i.desc && <span className="block text-xs text-muted-foreground truncate">{i.desc}</span>}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{ago(i.at, now)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
