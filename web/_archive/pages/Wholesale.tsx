import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2, DollarSign, Truck, FileText, Plus, Eye, TrendingDown,
  CheckCircle2, Clock, AlertCircle, Car, ChevronRight, Phone, Mail
} from "lucide-react";
import { toast } from "sonner";
import { hapticFeedback } from "@/lib/haptics";
const wholesaleListings = [
  { stock: "2388A", vehicle: "2018 Honda Civic EX", miles: "94,200", asking: "$11,800", mmr: "$10,900", age: 68, status: "Listed", buyer: "AutoNation Tampa", buyerInitials: "AN", buyerColor: "bg-blue-600" },
  { stock: "2381C", vehicle: "2019 Ford Explorer XLT", miles: "78,400", asking: "$18,500", mmr: "$17,200", age: 72, status: "Negotiating", buyer: "Hendrick Auto", buyerInitials: "HA", buyerColor: "bg-emerald-600" },
  { stock: "2376B", vehicle: "2017 Toyota Corolla LE", miles: "112,000", asking: "$9,200", mmr: "$8,800", age: 85, status: "Listed", buyer: null, buyerInitials: "", buyerColor: "" },
  { stock: "2370D", vehicle: "2016 Chevrolet Malibu LT", miles: "103,500", asking: "$8,400", mmr: "$7,900", age: 91, status: "Pending Sale", buyer: "DriveTime Autos", buyerInitials: "DT", buyerColor: "bg-amber-600" },
];

const receivables = [
  { deal: "WS-0441", buyer: "AutoNation Tampa", vehicle: "2017 Ford Fusion SE", amount: "$10,200", due: "Today", status: "Overdue" },
  { deal: "WS-0439", buyer: "Hendrick Auto", vehicle: "2018 Nissan Altima", amount: "$12,400", due: "May 16", status: "Pending" },
  { deal: "WS-0438", buyer: "DriveTime Autos", vehicle: "2016 Kia Optima", amount: "$8,800", due: "May 18", status: "Pending" },
  { deal: "WS-0435", buyer: "CarMax Exchange", vehicle: "2019 Hyundai Sonata", amount: "$13,100", due: "May 8", status: "Paid" },
];

const buyers = [
  { name: "AutoNation Tampa", contact: "Greg Simmons", phone: "(813) 555-4400", email: "greg@an-tampa.com", deals: 14, initials: "AN", color: "bg-blue-600" },
  { name: "Hendrick Auto", contact: "Paula Jackson", phone: "(813) 555-5500", email: "p.jackson@hendrick.com", deals: 9, initials: "HA", color: "bg-emerald-600" },
  { name: "DriveTime Autos", contact: "Sam Walker", phone: "(813) 555-6600", email: "s.walker@drivetime.com", deals: 7, initials: "DT", color: "bg-amber-600" },
  { name: "CarMax Exchange", contact: "Amy Chen", phone: "(813) 555-7700", email: "a.chen@carmax.com", deals: 12, initials: "CX", color: "bg-purple-600" },
];

export default function Wholesale() {
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary" /> Wholesale Channel
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage dealer-to-dealer sales, aged inventory disposals, and receivables.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0 bg-white dark:bg-slate-950 border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => {
            toast.success("AI Aged Pruning Complete", { description: "Auto-suggested 4 vehicles over 90 days to send to Manheim." });
            hapticFeedback();
          }}>
            <TrendingDown className="h-4 w-4" /> AI Aged Pruning
          </Button>
          <Button size="sm" className="gap-1.5 shrink-0">
            <Plus className="h-4 w-4" /> List Vehicle
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Units Listed", val: "4", sub: "Ready for wholesale", icon: Car, color: "text-primary" },
          { label: "MTD Revenue", val: "$44,500", sub: "3 units sold", icon: DollarSign, color: "text-emerald-600" },
          { label: "Avg. Days to Sale", val: "11 Days", sub: "Below 30-day target", icon: Clock, color: "text-amber-600" },
          { label: "Overdue Receivables", val: "1", sub: "$10,200 past due", icon: AlertCircle, color: "text-rose-600" },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <kpi.icon className={`h-4 w-4 ${kpi.color} mb-2`} />
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-xl font-bold">{kpi.val}</p>
              <p className="text-[11px] text-muted-foreground">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="listings">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="listings" className="flex-1 md:flex-none">Listings</TabsTrigger>
          <TabsTrigger value="receivables" className="flex-1 md:flex-none">Receivables</TabsTrigger>
          <TabsTrigger value="buyers" className="flex-1 md:flex-none">Buyers</TabsTrigger>
        </TabsList>

        {/* LISTINGS */}
        <TabsContent value="listings" className="mt-4 space-y-3">
          {wholesaleListings.map((unit, i) => (
            <Card key={i} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-muted rounded-xl h-14 w-20 flex items-center justify-center shrink-0 text-2xl">🚗</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-bold text-sm">{unit.vehicle}</p>
                      <Badge className={`text-[10px] shrink-0 ${
                        unit.status === 'Pending Sale' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                        unit.status === 'Negotiating' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                        'bg-blue-100 text-blue-700 border-blue-200'
                      }`}>{unit.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Stock #{unit.stock} · {unit.miles} mi · {unit.age} days in stock</p>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Asking</p>
                        <p className="font-bold text-sm text-foreground">{unit.asking}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">MMR</p>
                        <p className="font-bold text-sm text-muted-foreground">{unit.mmr}</p>
                      </div>
                      {unit.buyer && (
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className={`${unit.buyerColor} text-white text-[10px]`}>{unit.buyerInitials}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">{unit.buyer}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" className="text-xs h-7">Negotiate</Button>
                    <Button size="sm" variant="ghost" className="text-xs h-7">Remove</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* RECEIVABLES */}
        <TabsContent value="receivables" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Wholesale Receivables</CardTitle>
              <CardDescription>Outstanding and completed wholesale payments from dealer buyers.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {receivables.map((rec, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 hover:bg-muted/20 transition-colors">
                    <div className={`p-2 rounded-lg shrink-0 ${rec.status === 'Overdue' ? 'bg-rose-100' : rec.status === 'Paid' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                      {rec.status === 'Paid' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : rec.status === 'Overdue' ? <AlertCircle className="h-4 w-4 text-rose-600" /> : <Clock className="h-4 w-4 text-amber-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{rec.buyer}</p>
                      <p className="text-xs text-muted-foreground">{rec.deal} · {rec.vehicle} · Due {rec.due}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{rec.amount}</p>
                      <Badge variant="outline" className={`text-[10px] ${
                        rec.status === 'Overdue' ? 'border-rose-300 text-rose-700 bg-rose-50' :
                        rec.status === 'Paid' ? 'border-emerald-300 text-emerald-700 bg-emerald-50' :
                        'border-amber-300 text-amber-700 bg-amber-50'
                      }`}>{rec.status}</Badge>
                    </div>
                    {rec.status !== 'Paid' && <Button size="sm" variant="outline" className="text-xs h-7 shrink-0">Follow Up</Button>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BUYERS */}
        <TabsContent value="buyers" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {buyers.map((buyer, i) => (
              <Card key={i} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className={`${buyer.color} text-white font-bold`}>{buyer.initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-sm">{buyer.name}</p>
                      <p className="text-xs text-muted-foreground">{buyer.contact}</p>
                    </div>
                    <Badge variant="secondary" className="ml-auto text-xs">{buyer.deals} deals</Badge>
                  </div>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5"><Phone className="h-3 w-3 shrink-0" />{buyer.phone}</div>
                    <div className="flex items-center gap-1.5"><Mail className="h-3 w-3 shrink-0" />{buyer.email}</div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="flex-1 text-xs h-7">Contact</Button>
                    <Button variant="ghost" size="sm" className="flex-1 text-xs h-7">History</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card className="border-dashed border-2 border-border hover:border-primary/40 transition-colors cursor-pointer">
              <CardContent className="p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Plus className="h-6 w-6" />
                <p className="text-sm font-medium">Add Buyer</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
