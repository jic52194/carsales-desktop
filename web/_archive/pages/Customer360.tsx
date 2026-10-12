import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Car, Wrench, MessageSquare, Users, Phone, Mail, MapPin, Calendar, DollarSign, TrendingUp, Heart, Home, Briefcase, Star, Clock, AlertCircle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from "recharts";

const CUSTOMER_DATA = {
  name: "Sarah Jenkins",
  initials: "SJ",
  phone: "(555) 123-4567",
  email: "sarah.jenkins@example.com",
  address: "456 Oak Avenue, Springfield, IL 62701",
  since: "March 2021",
  totalSpent: 87400,
  totalDeals: 3,
  creditScore: 742,
  sentiment: "Positive",
  household: [
    { name: "Michael Jenkins", relation: "Spouse", deals: 1, color: "bg-blue-500" },
    { name: "Emily Jenkins", relation: "Daughter", deals: 0, color: "bg-pink-500" },
  ],
};

const PURCHASE_HISTORY = [
  { id: 1, vehicle: "2021 Family Sedan", date: "Mar 2021", price: 24500, type: "New Purchase" },
  { id: 2, vehicle: "2022 Electric Hatch", date: "Aug 2022", price: 31500, type: "Trade-in Upgrade" },
  { id: 3, vehicle: "2024 Luxury SUV", date: "Jan 2024", price: 42500, type: "New Purchase" },
];

const SERVICE_HISTORY = [
  { id: 1, date: "Jan 2024", service: "Oil Change & Tire Rotation", cost: 89, vehicle: "2024 Luxury SUV" },
  { id: 2, date: "Oct 2023", service: "Brake Pad Replacement", cost: 340, vehicle: "2022 Electric Hatch" },
  { id: 3, date: "Jun 2023", service: "Battery Service", cost: 180, vehicle: "2022 Electric Hatch" },
  { id: 4, date: "Mar 2023", service: "Annual Inspection", cost: 45, vehicle: "2021 Family Sedan" },
];

const COMMUNICATIONS = [
  { id: 1, channel: "SMS", date: "2 days ago", summary: "Inquired about 2024 F-150 availability", sentiment: "positive" },
  { id: 2, channel: "Email", date: "1 week ago", summary: "Opened service reminder email", sentiment: "neutral" },
  { id: 3, channel: "Phone", date: "2 weeks ago", summary: "Called about warranty coverage", sentiment: "positive" },
  { id: 4, channel: "SMS", date: "3 weeks ago", summary: "Responded to equity mining offer", sentiment: "positive" },
];

const SPEND_DATA = [
  { name: "Vehicle Purchases", value: 81500, color: "hsl(var(--primary))" },
  { name: "Service & Parts", value: 4200, color: "hsl(var(--success))" },
  { name: "F&I Products", value: 1700, color: "#f59e0b" },
];

export default function Customer360() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-primary/20">
            {CUSTOMER_DATA.initials}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">{CUSTOMER_DATA.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40">
                <Star className="h-3 w-3 mr-1" /> VIP Customer
              </Badge>
              <Badge variant="secondary" className="text-xs">Since {CUSTOMER_DATA.since}</Badge>
              <Badge className="bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40">
                Credit: {CUSTOMER_DATA.creditScore}
              </Badge>
            </div>
          </div>
        </div>
        <div className="md:ml-auto grid grid-cols-3 gap-3">
          <div className="text-center bg-muted/50 rounded-xl p-3">
            <p className="text-2xl font-black text-primary">{CUSTOMER_DATA.totalDeals}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Deals</p>
          </div>
          <div className="text-center bg-muted/50 rounded-xl p-3">
            <p className="text-2xl font-black text-emerald-500">${(CUSTOMER_DATA.totalSpent / 1000).toFixed(0)}k</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Lifetime Value</p>
          </div>
          <div className="text-center bg-muted/50 rounded-xl p-3">
            <p className="text-2xl font-black text-amber-500">A+</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sentiment</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto pb-2 scrollbar-hide">
          <TabsList className="inline-flex w-max md:w-full md:grid md:grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="purchases">Purchases</TabsTrigger>
            <TabsTrigger value="service">Service</TabsTrigger>
            <TabsTrigger value="comms">Communications</TabsTrigger>
            <TabsTrigger value="household">Household</TabsTrigger>
          </TabsList>
        </div>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {CUSTOMER_DATA.phone}</div>
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {CUSTOMER_DATA.email}</div>
                <div className="flex items-start gap-2"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5" /> {CUSTOMER_DATA.address}</div>
                <Separator />
                <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-muted-foreground" /> FICO: <span className="font-bold text-emerald-500">{CUSTOMER_DATA.creditScore}</span></div>
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /> Customer since {CUSTOMER_DATA.since}</div>
              </CardContent>
            </Card>

            {/* Spend Breakdown */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4 text-emerald-500" /> Spend Breakdown</CardTitle>
                <CardDescription>Lifetime spend: ${CUSTOMER_DATA.totalSpent.toLocaleString()}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={SPEND_DATA} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                        {SPEND_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <RechartsTooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Avg Response Time", value: "4 min", icon: Clock, color: "text-emerald-500" },
              { label: "Open Service ROs", value: "1", icon: Wrench, color: "text-amber-500" },
              { label: "Equity Position", value: "+$2,400", icon: TrendingUp, color: "text-emerald-500" },
              { label: "Next Service Due", value: "Mar 2024", icon: Calendar, color: "text-blue-500" },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-lg font-black">{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Purchases */}
        <TabsContent value="purchases" className="space-y-3 mt-4">
          {PURCHASE_HISTORY.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Car className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-bold">{p.vehicle}</p>
                  <p className="text-xs text-muted-foreground">{p.date} · {p.type}</p>
                </div>
                <p className="font-black text-lg text-emerald-500">${p.price.toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Service */}
        <TabsContent value="service" className="space-y-3 mt-4">
          {SERVICE_HISTORY.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30">
                  <Wrench className="h-6 w-6 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="font-bold">{s.service}</p>
                  <p className="text-xs text-muted-foreground">{s.date} · {s.vehicle}</p>
                </div>
                <p className="font-black text-lg">${s.cost}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Communications */}
        <TabsContent value="comms" className="space-y-3 mt-4">
          {COMMUNICATIONS.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30">
                  <MessageSquare className="h-6 w-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">{c.channel}</Badge>
                    <span className="text-xs text-muted-foreground">{c.date}</span>
                  </div>
                  <p className="text-sm mt-1">{c.summary}</p>
                </div>
                <div className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                  c.sentiment === "positive" ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" :
                  c.sentiment === "negative" ? "bg-destructive/10 text-destructive" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {c.sentiment}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Household */}
        <TabsContent value="household" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Home className="h-4 w-4 text-primary" /> Household Members</CardTitle>
              <CardDescription>Track family members who also buy or service here</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {CUSTOMER_DATA.household.map((h, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                  <div className={`h-10 w-10 rounded-full ${h.color} flex items-center justify-center text-white text-sm font-bold`}>
                    {h.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{h.name}</p>
                    <p className="text-xs text-muted-foreground">{h.relation}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">{h.deals} deal(s)</Badge>
                </div>
              ))}
              <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-border/50">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Heart className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-muted-foreground">Add household member</p>
                  <p className="text-xs text-muted-foreground">Link a spouse, child, or business partner</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
