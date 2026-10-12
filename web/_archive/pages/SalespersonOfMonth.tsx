import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Star, Users } from "lucide-react";

export default function SalespersonOfMonth() {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto text-center">
      <div className="space-y-4">
        <div className="inline-block p-4 bg-amber-100 rounded-full mb-4">
          <Trophy className="h-16 w-16 text-amber-600 fill-amber-600" />
        </div>
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">Hall of Fame</h1>
        <p className="text-slate-500 text-lg">Celebrating our top performers.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-8 gap-y-16 mt-8 md:mt-0">
        <div className="pt-12">
          <Card className="relative">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-slate-200 border-4 border-white overflow-hidden shadow-lg">
              <img src="https://vibe.filesafe.space/1778548756560730619/assets/451333b3-3ca6-4111-adc7-c16d79049c09.jpg" alt="Sarah Jenkins" className="w-full h-full object-cover" />
            </div>
            <CardContent className="pt-16 pb-6">
              <h3 className="font-bold text-xl">Sarah Jenkins</h3>
              <p className="text-slate-500 text-sm mb-4">18 Units Sold</p>
              <Medal className="h-8 w-8 text-slate-400 mx-auto" />
            </CardContent>
          </Card>
        </div>
        
        <div className="md:scale-110 md:z-10">
          <Card className="relative border-amber-200 bg-amber-50/20">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-amber-400 border-4 border-white overflow-hidden shadow-lg">
              <img src="https://vibe.filesafe.space/1778548756560730619/assets/37f48ddb-19f0-4be3-9561-773678a0954b.jpg" alt="Mike Reynolds" className="w-full h-full object-cover" />
            </div>
            <CardContent className="pt-16 pb-6">
              <h3 className="font-bold text-xl">Mike Reynolds</h3>
              <p className="text-slate-500 text-sm mb-4">24 Units Sold</p>
              <Star className="h-8 w-8 text-amber-500 fill-amber-500 mx-auto" />
              <p className="mt-2 font-black text-amber-600 text-xs uppercase tracking-widest">April Champion</p>
            </CardContent>
          </Card>
        </div>

        <div className="pt-12">
          <Card className="relative">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-slate-200 border-4 border-white overflow-hidden shadow-lg">
              <img src="https://vibe.filesafe.space/1778548756560730619/assets/38908880-7063-401d-ad7a-8d706f4575f3.jpg" alt="David Chen" className="w-full h-full object-cover" />
            </div>
            <CardContent className="pt-16 pb-6">
              <h3 className="font-bold text-xl">David Chen</h3>
              <p className="text-slate-500 text-sm mb-4">15 Units Sold</p>
              <Medal className="h-8 w-8 text-amber-700 mx-auto opacity-50" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
