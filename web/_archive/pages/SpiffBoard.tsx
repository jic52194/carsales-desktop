import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flame, Trophy, DollarSign, Target, Gift } from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { hapticFeedback } from "@/lib/haptics";

export default function SpiffBoard() {
  const triggerConfetti = () => {
    hapticFeedback();
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f97316', '#eab308', '#ef4444']
    });
    toast.success("Bounty Claimed!", { description: "You have 48 hours to sell this unit and collect the bonus." });
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <Card className="bg-gradient-to-br from-emerald-600 to-emerald-900 text-white border-none shadow-lg">
          <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider">Live Commission Calculator (MTD)</p>
                <h2 className="text-3xl md:text-4xl font-black">$14,250.00</h2>
              </div>
            </div>
            <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">View Breakdown</Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Flame className="h-7 w-7 text-orange-500 fill-orange-500" /> Active Spiffs
        </h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: "Weekend Warrior", desc: "First 3 units sold this weekend", prize: "$500", icon: Trophy },
          { title: "Old Age Bonus", desc: "Sell any unit over 90 days", prize: "$250", icon: DollarSign },
          { title: "F&I Hat Trick", desc: "3 full-back deals in a row", prize: "$300", icon: Target }
        ].map((spiff, i) => {
          const SpiffIcon = spiff.icon;
          return (
            <Card key={i} className="border-orange-200 bg-orange-50/30">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{spiff.title}</CardTitle>
                  <SpiffIcon className="h-6 w-6 text-orange-500" />
                </div>
                <p className="text-sm text-slate-500">{spiff.desc}</p>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-orange-600">{spiff.prize}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      <div className="mt-12">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" /> Eligible Spiff Vehicles
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <Card className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4 bg-gradient-to-br from-indigo-900 to-purple-900 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Flame className="w-48 h-48" />
            </div>
            <CardContent className="p-8 relative z-10 flex flex-col items-center text-center">
              <Badge className="bg-white/20 text-white hover:bg-white/30 mb-4 border-none px-3 py-1 text-xs">AI AGING INVENTORY BOUNTY</Badge>
              <h3 className="text-3xl font-black mb-2">Swipe to Claim Bounties</h3>
              <p className="text-indigo-200 max-w-md mb-8">AI has attached dynamic bonus spiffs to our oldest inventory. Swipe right to claim a bounty and commit to selling it this week.</p>
              
              <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden text-slate-900 transform transition-all hover:scale-105 cursor-grab active:cursor-grabbing border-4 border-white">
                <div className="h-48 w-full overflow-hidden relative">
                  <div className="absolute top-3 right-3 bg-red-500 text-white font-black px-3 py-1 rounded-full shadow-lg text-sm z-10">
                    112 Days Old
                  </div>
                  <img src="https://vibe.filesafe.space/1778548756560730619/assets/23a6659c-d8fc-4cc7-b123-9979f0ad8d10.png" alt="Car" className="w-full h-full object-cover" />
                </div>
                <div className="p-6 text-left">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-xl font-black">2021 Chevy Silverado</h4>
                    <span className="text-2xl font-black text-green-600">+$500</span>
                  </div>
                  <p className="text-slate-500 text-sm mb-4">Stock: C21-892 • High demand in local market.</p>
                  <div className="flex gap-4">
                    <Button variant="outline" className="flex-1 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl h-12 text-lg">Skip</Button>
                    <Button onClick={triggerConfetti} className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl h-12 text-lg shadow-lg shadow-green-500/30 group">
                      <Gift className="mr-2 h-5 w-5 group-hover:animate-bounce" /> Claim Bounty
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {[
            { year: 2022, make: "Ford", model: "F-150 Lariat", stock: "F22-104", days: 94, spiff: "$250", image: "https://vibe.filesafe.space/1778548756560730619/assets/6b6b649f-65d2-4a8b-8d9e-877e5f1c4fe7.png" },
            { year: 2021, make: "Chevrolet", model: "Silverado", stock: "C21-892", days: 112, spiff: "$500", image: "https://vibe.filesafe.space/1778548756560730619/assets/23a6659c-d8fc-4cc7-b123-9979f0ad8d10.png" },
            { year: 2023, make: "BMW", model: "X5 xDrive40i", stock: "B23-045", days: 65, spiff: "$200", image: "https://vibe.filesafe.space/1778548756560730619/assets/c9058bfb-e16c-4a65-8c16-28cd3937e3c1.jpg" },
            { year: 2020, make: "Toyota", Highlander: "Highlander", stock: "T20-991", days: 45, spiff: "$150", image: "https://vibe.filesafe.space/1778548756560730619/assets/c6f562ab-1752-4862-aed2-588f83eff966.png" },
            { year: 2024, make: "Audi", model: "Q7 Premium", stock: "A24-112", days: 120, spiff: "$750", image: "https://vibe.filesafe.space/1778548756560730619/assets/cf401772-605e-4d64-b3d3-953608639b6f.jpg" },
            { year: 2019, make: "Honda", model: "CR-V EX-L", stock: "H19-334", days: 88, spiff: "$250", image: "https://vibe.filesafe.space/1778548756560730619/assets/d1a63a09-19a2-4e19-8f6d-d94af42ce648.jpg" },
            { year: 2022, make: "Ram", model: "1500 Big Horn", stock: "R22-567", days: 105, spiff: "$400", image: "https://vibe.filesafe.space/1778548756560730619/assets/6b6b649f-65d2-4a8b-8d9e-877e5f1c4fe7.png" },
            { year: 2023, make: "Mercedes-Benz", model: "GLE 350", stock: "M23-889", days: 72, spiff: "$300", image: "https://vibe.filesafe.space/1778548756560730619/assets/c9058bfb-e16c-4a65-8c16-28cd3937e3c1.jpg" },
          ].map((car, i) => (
            <Card key={i} className="overflow-hidden border-slate-200 dark:border-slate-800 flex flex-col">
              <div className="h-40 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img src={car.image} alt={`${car.year} ${car.make} ${car.model}`} className="w-full h-full object-cover transition-transform hover:scale-105" />
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 border-t border-slate-200 dark:border-slate-800 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-900 dark:text-white leading-tight">{car.year} {car.make} {car.model}</h3>
                    <span className="bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 shrink-0 ml-2">
                      <Flame className="h-3 w-3" /> {car.spiff}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <span>Stk: {car.stock}</span>
                  <span className="font-medium text-red-500 dark:text-red-400">{car.days} Days Old</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
