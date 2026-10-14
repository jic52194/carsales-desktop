import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Compass, Home, Users, Car, Kanban } from "lucide-react";

const QUICK = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/leads", label: "Leads & Pipeline", icon: Kanban },
  { to: "/inventory", label: "Inventory", icon: Car },
];

export default function NotFound() {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="text-center max-w-md space-y-4">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 text-primary grid place-items-center"><Compass className="h-7 w-7" /></div>
        <h1 className="text-3xl font-black">Page not found</h1>
        <p className="text-muted-foreground">There's nothing at <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{pathname}</code>. It may have moved — try one of these, or press <kbd className="text-xs border rounded px-1">Ctrl K</kbd> to search.</p>
        <div className="grid grid-cols-2 gap-2 pt-2">
          {QUICK.map((q) => <Button key={q.to} asChild variant="outline" className="justify-start"><Link to={q.to}><q.icon className="h-4 w-4 mr-2" />{q.label}</Link></Button>)}
        </div>
      </div>
    </div>
  );
}
