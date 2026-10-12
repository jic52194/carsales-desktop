import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Screener() {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Inventory Screener</h1>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input className="pl-10" placeholder="Search criteria..." />
            </div>
            <Filter className="h-5 w-5 text-slate-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-slate-500 border-2 border-dashed rounded-lg">
            No active screens matches your criteria.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
