import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Gavel, Search, Filter, Clock, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Auctions() {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Live Auctions</h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-primary">
                <BrainCircuit className="h-5 w-5" /> Predictive Sourcing AI
              </CardTitle>
              <CardDescription>Based on local market velocity and your past 30-day sales</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-background rounded-lg border border-primary/10 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">2021-2023 Toyota RAV4</p>
                  <p className="text-xs text-muted-foreground mt-1">High demand in your zip code. Avg turn: 14 days.</p>
                </div>
                <Button size="sm" className="gap-2"><Gavel className="h-4 w-4" /> Auto-Bid up to $22k</Button>
              </div>
              <div className="p-4 bg-background rounded-lg border border-primary/10 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">2020+ Ford F-150 XLT</p>
                  <p className="text-xs text-muted-foreground mt-1">Inventory low. Competitors pricing 5% higher.</p>
                </div>
                <Button size="sm" className="gap-2"><Gavel className="h-4 w-4" /> Auto-Bid up to $34k</Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Live Auction Feed</CardTitle>
              <Badge className="bg-emerald-100 text-emerald-700 animate-pulse">Live API Connected</Badge>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="p-4 border rounded-lg hover:border-primary/50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-lg">2022 Honda CR-V EX-L</h4>
                    <p className="text-sm text-muted-foreground">Manheim Orlando • Lane 4 • Run 112</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-emerald-600">$24,500</p>
                    <p className="text-xs text-muted-foreground">Current Bid</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <Badge variant="outline">Condition: 4.2</Badge>
                  <Badge variant="outline">34k Miles</Badge>
                  <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Est Margin: $2,100</Badge>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">Bid $24,600</Button>
                  <Button variant="outline" className="flex-1">Auto-Bid (Max $25k)</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" /> Upcoming Sales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {['Manheim Orlando', 'Adesa Atlanta', 'IAA Tampa'].map(auction => (
              <div key={auction} className="p-3 border rounded-lg">
                <p className="font-bold text-sm">{auction}</p>
                <p className="text-xs text-slate-500">Starts: Tomorrow 9:00 AM</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ... removed local Badge definition
