import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, Wrench, Sparkles, MapPin, Clock, CheckCircle2, AlertCircle, BookOpen } from "lucide-react";

export default function Acquisition() {
  const stages = [
    {
      id: "purchased",
      title: "Purchased / Won",
      icon: <MapPin className="h-4 w-4" />,
      color: "bg-blue-500",
      vehicles: [
        { id: 1, name: "2021 Honda Civic", source: "Manheim Auto Auction", cost: "$18,500", status: "Awaiting Dispatch", days: 1, nada: "$21,500", kbb: "$20,800" },
        { id: 2, name: "2019 Toyota Tacoma", source: "Customer Trade", cost: "$24,000", status: "At Dealership", days: 0, nada: "$27,000", kbb: "$26,500" },
      ]
    },
    {
      id: "transport",
      title: "In Transit",
      icon: <Truck className="h-4 w-4" />,
      color: "bg-amber-500",
      vehicles: [
        { id: 3, name: "2022 Ford F-150", source: "Adesa", cost: "$38,000", status: "ETA: Tomorrow", days: 3, nada: "$42,000", kbb: "$41,000" },
      ]
    },
    {
      id: "recon",
      title: "Recon & Service",
      icon: <Wrench className="h-4 w-4" />,
      color: "bg-purple-500",
      vehicles: [
        { id: 4, name: "2020 Jeep Grand Cherokee", source: "Trade-in", cost: "$26,500", status: "Waiting on Parts", days: 5, alert: true, nada: "$29,500", kbb: "$28,900" },
        { id: 5, name: "2023 Tesla Model 3", source: "Auction", cost: "$31,000", status: "In Shop", days: 2, nada: "$34,000", kbb: "$33,500" },
      ]
    },
    {
      id: "detail",
      title: "Detail & Photos",
      icon: <Sparkles className="h-4 w-4" />,
      color: "bg-teal-500",
      vehicles: [
        { id: 6, name: "2018 Lexus RX", source: "Trade-in", cost: "$29,000", status: "Detailing", days: 4, nada: "$32,000", kbb: "$31,500" },
      ]
    },
    {
      id: "frontline",
      title: "Frontline Ready",
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: "bg-success",
      vehicles: [
        { id: 7, name: "2024 Toyota Camry", source: "Auction", cost: "$25,000", status: "Online", days: 7, nada: "$28,500", kbb: "$27,900" },
      ]
    }
  ];

  return (
    <div className="p-4 md:p-8 max-w-screen-2xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            Vehicle Acquisition & Logistics
          </h1>
          <p className="text-slate-500">Track vehicles from purchase through recon to frontline ready.</p>
        </div>
        <Button>
          Add Acquisition
        </Button>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4 snap-x">
        {stages.map(stage => (
          <div key={stage.id} className="min-w-[320px] w-[320px] flex-shrink-0 snap-start flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-md text-white ${stage.color}`}>
                  {stage.icon}
                </div>
                <h3 className="font-bold text-slate-700 dark:text-slate-300">{stage.title}</h3>
              </div>
              <Badge variant="secondary" className="bg-slate-200 dark:bg-slate-800">{stage.vehicles.length}</Badge>
            </div>

            <div className="flex flex-col gap-3">
              {stage.vehicles.map(vehicle => (
                <Card key={vehicle.id} className={`shadow-sm border-l-4 ${vehicle.alert ? 'border-l-destructive' : 'border-l-transparent'}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm">{vehicle.name}</h4>
                        <p className="text-xs text-slate-500">{vehicle.source}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{vehicle.cost}</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        {vehicle.alert ? <AlertCircle className="h-3 w-3 text-destructive" /> : <Clock className="h-3 w-3" />}
                        <span className={vehicle.alert ? "text-destructive font-medium" : ""}>{vehicle.status}</span>
                      </span>
                      <span>{vehicle.days} {vehicle.days === 1 ? 'day' : 'days'}</span>
                    </div>

                    <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1 text-slate-500">
                        <BookOpen className="h-3 w-3" />
                        <span>Values</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-blue-600 dark:text-blue-400 font-medium" title="KBB Value">KBB: {vehicle.kbb}</span>
                        <span className="text-amber-600 dark:text-amber-400 font-medium" title="NADA Value">NADA: {vehicle.nada}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {stage.vehicles.length === 0 && (
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center text-slate-400 text-sm">
                  No vehicles in this stage
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
