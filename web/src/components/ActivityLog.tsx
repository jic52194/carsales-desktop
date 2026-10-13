import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCollection, fmtDateTime, get } from "@/lib/store";
import { useUsers } from "@/lib/auth";
import { getVehicle, vTitle } from "@/lib/inventory";

const VERB: Record<string, string> = { create: "added", update: "updated", status: "changed status of", note: "left a note on", import: "imported", lead_intake: "website lead received", create_user: "created user", switch_tenant: "opened dealership", create_tenant: "created dealership", update_tenant: "updated dealership", sync: "synced inventory" };

/** Who did what, newest first — the dealership's audit trail (admins). */
export function ActivityLog() {
  const activity = useCollection("activity");
  const users = useUsers();
  const who = (id?: string) => users.find((u) => u.id === id)?.fullName || (id ? "Someone" : "System");
  const what = (a: any) => {
    const id = a.entityId;
    if (a.entity === "customer" && id) { const c = get("customers", id); return c ? `${c.firstName} ${c.lastName}`.trim() : "a customer"; }
    if (a.entity === "lead") return "a lead";
    if (a.entity === "deal") return "a deal";
    if (a.entity === "vehicle" && id) { const v = getVehicle(id); return v ? vTitle(v) : "a vehicle"; }
    return a.entity;
  };
  const rows = activity.slice(0, 200);
  return (
    <Card>
      <CardHeader><CardTitle>Activity log</CardTitle><CardDescription>Everything your team and the system did, newest first. Kept for audit and accountability.</CardDescription></CardHeader>
      <CardContent className="divide-y text-sm max-h-[60vh] overflow-y-auto">
        {rows.length === 0 && <p className="text-muted-foreground py-4">Nothing logged yet.</p>}
        {rows.map((a) => (
          <div key={a.id} className="py-2 flex items-start justify-between gap-3">
            <p><span className="font-semibold">{who(a.userId)}</span> {VERB[a.action] || a.action} {what(a)}{a.details ? <span className="text-muted-foreground"> — {String(a.details).slice(0, 140)}</span> : null}</p>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(a.createdAt)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
