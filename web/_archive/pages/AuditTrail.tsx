import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Shield, Search, Filter, FileEdit, DollarSign, FileText, Eye, Download, UserPlus } from "lucide-react";

interface AuditEntry {
  id: string;
  user: string;
  action: string;
  category: "deal" | "price" | "document" | "user" | "system";
  details: string;
  timestamp: string;
  ip: string;
}

const AUDIT_LOG: AuditEntry[] = [
  { id: "1", user: "Mike Ross", action: "Deal Price Changed", category: "deal", details: "Changed selling price from $35,000 to $34,500 on Deal #4521 (John Doe - 2024 Camry)", timestamp: "2024-01-15 10:42 AM", ip: "192.168.1.45" },
  { id: "2", user: "Sarah Jenkins", action: "Document Viewed", category: "document", details: "Viewed credit report for customer #C-2847 (Emily Blunt)", timestamp: "2024-01-15 10:38 AM", ip: "192.168.1.52" },
  { id: "3", user: "David Chen", action: "Contract Generated", category: "document", details: "Generated retail installment contract for Deal #4519", timestamp: "2024-01-15 10:15 AM", ip: "192.168.1.38" },
  { id: "4", user: "System", action: "Inventory Price Auto-Adjusted", category: "price", details: "AI adjusted price on 2021 Sport Coupe from $35,000 to $33,500 (62 days on lot)", timestamp: "2024-01-15 09:00 AM", ip: "system" },
  { id: "5", user: "Mike Ross", action: "Deal Edited", category: "deal", details: "Modified trade allowance from $0 to $8,000 on Deal #4521", timestamp: "2024-01-15 08:45 AM", ip: "192.168.1.45" },
  { id: "6", user: "Sarah Jenkins", action: "User Created", category: "user", details: "Created new user account: jsmith@dealership.com (Sales Associate)", timestamp: "2024-01-14 04:30 PM", ip: "192.168.1.52" },
  { id: "7", user: "David Chen", action: "Report Downloaded", category: "document", details: "Downloaded monthly sales report (PDF)", timestamp: "2024-01-14 03:15 PM", ip: "192.168.1.38" },
  { id: "8", user: "Mike Ross", action: "Document Viewed", category: "document", details: "Viewed driver's license for customer #C-2851 (John Doe)", timestamp: "2024-01-14 02:00 PM", ip: "192.168.1.45" },
];

const ICON_MAP: Record<string, any> = {
  deal: DollarSign,
  price: DollarSign,
  document: FileText,
  user: UserPlus,
  system: Shield,
};

const CATEGORY_COLORS: Record<string, string> = {
  deal: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400",
  price: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
  document: "bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400",
  user: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400",
  system: "bg-muted text-muted-foreground",
};

export default function AuditTrail() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const filtered = AUDIT_LOG.filter((entry) => {
    const matchesSearch = !search || entry.user.toLowerCase().includes(search.toLowerCase()) || entry.details.toLowerCase().includes(search.toLowerCase()) || entry.action.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || entry.category === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Audit Trail</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Every action logged with timestamp and user — full compliance tracking</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by user, action, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          {["all", "deal", "price", "document", "user", "system"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap capitalize transition-all ${
                filter === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity Log</CardTitle>
          <CardDescription>{filtered.length} entries found</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {filtered.map((entry) => {
              const Icon = ICON_MAP[entry.category];
              return (
                <div key={entry.id} className="p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                  <div className={`p-2 rounded-lg shrink-0 ${CATEGORY_COLORS[entry.category]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-sm">{entry.user}</span>
                      <Badge variant="secondary" className="text-[10px]">{entry.action}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{entry.details}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                      <span>{entry.timestamp}</span>
                      <span>IP: {entry.ip}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
