import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useCollection, insert, update, remove, fmtDateTime } from "@/lib/store";
import { useAuth, listUsers } from "@/lib/auth";

export default function Tasks() {
  const { user, hasPermission } = useAuth();
  const tasks = useCollection("tasks");
  const users = listUsers().filter((u) => u.isActive);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [assignee, setAssignee] = useState(user?.id ?? "");
  const [view, setView] = useState<"mine" | "all">("mine");
  const canSeeAll = hasPermission(["manager"]);

  const add = () => {
    if (!title.trim()) return;
    insert("tasks", { title: title.trim(), dueAt: due ? new Date(due).toISOString() : undefined, status: "open", priority, assignedTo: assignee || user?.id });
    setTitle(""); setDue("");
  };
  const visible = tasks.filter((t) => view === "all" || !t.assignedTo || t.assignedTo === user?.id);
  const open = visible.filter((t) => t.status === "open").sort((a, b) => (a.dueAt || "9").localeCompare(b.dueAt || "9"));
  const done = visible.filter((t) => t.status === "done").slice(0, 20);
  const nowIso = new Date().toISOString();

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-black">Tasks</h1><p className="text-muted-foreground">{open.length} open</p></div>
        {canSeeAll && <Select value={view} onValueChange={(v: any) => setView(v)}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="mine">My tasks</SelectItem><SelectItem value="all">Whole store</SelectItem></SelectContent></Select>}
      </div>
      <Card><CardContent className="p-4 flex flex-col md:flex-row gap-2">
        <Input placeholder="Add a task… (e.g. Call back John about the CR-V)" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} className="flex-1" />
        <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="md:w-52" />
        <Select value={priority} onValueChange={(v: any) => setPriority(v)}><SelectTrigger className="md:w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select>
        {canSeeAll && <Select value={assignee} onValueChange={setAssignee}><SelectTrigger className="md:w-44"><SelectValue placeholder="Assign" /></SelectTrigger><SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}</SelectContent></Select>}
        <Button onClick={add}><Plus className="h-4 w-4 mr-1" /> Add</Button>
      </CardContent></Card>

      <Card><CardContent className="p-0 divide-y">
        {open.length === 0 && <p className="p-8 text-center text-muted-foreground">Nothing open. Nice.</p>}
        {open.map((t) => (
          <div key={t.id} className="flex items-center gap-3 px-4 py-3">
            <Checkbox checked={false} onCheckedChange={() => update("tasks", t.id, { status: "done" })} />
            <div className="flex-1">
              <p className="font-medium">{t.title}</p>
              <p className="text-xs text-muted-foreground">{t.dueAt ? <span className={t.dueAt < nowIso ? "text-destructive font-semibold" : ""}>Due {fmtDateTime(t.dueAt)}</span> : "No due date"}{view === "all" && t.assignedTo ? ` · ${users.find((u) => u.id === t.assignedTo)?.fullName ?? ""}` : ""}</p>
            </div>
            {t.priority === "high" && <Badge variant="destructive">High</Badge>}
            <Button size="icon" variant="ghost" onClick={() => remove("tasks", t.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
          </div>
        ))}
      </CardContent></Card>
      {done.length > 0 && (
        <Card><CardContent className="p-0 divide-y opacity-70">
          {done.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-2">
              <Checkbox checked onCheckedChange={() => update("tasks", t.id, { status: "open" })} />
              <p className="flex-1 line-through text-sm">{t.title}</p>
            </div>
          ))}
        </CardContent></Card>
      )}
    </div>
  );
}
