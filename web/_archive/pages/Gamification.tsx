import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Flame, Target, TrendingUp, Award, Zap, Tv, Maximize2, Users, Star, Crown, CheckCircle2, BrainCircuit, Medal } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import confetti from "canvas-confetti";
import { hapticFeedback } from "@/lib/haptics";

const SALES_LEADERBOARD = [
  { id: 1, name: "Sarah Jenkins", units: 24, gross: 84500, avatar: "https://vibe.filesafe.space/1778548756560730619/assets/f142b3ca-7909-4c19-970a-c590cabb6515.png", streak: 5, status: "Hot" },
  { id: 2, name: "Mike Ross", units: 21, gross: 72300, avatar: "https://vibe.filesafe.space/1778548756560730619/assets/8ba4b31f-8962-4fb4-b004-c6b9cf77c133.png", streak: 3, status: "Steady" },
  { id: 3, name: "David Chen", units: 19, gross: 68100, avatar: "https://i.pravatar.cc/150?u=david", streak: 2, status: "Steady" },
  { id: 4, name: "Emily Blunt", units: 18, gross: 62400, avatar: "https://i.pravatar.cc/150?u=emily", streak: 4, status: "Hot" },
  { id: 5, name: "John Doe", units: 15, gross: 54200, avatar: "https://vibe.filesafe.space/1778548756560730619/assets/fea6a1a1-c1ca-4e7c-bcb6-ced02786663f.png", streak: 1, status: "Rising" },
];

const BDC_LEADERBOARD = [
  { id: 1, name: "Jessica Day", appts: 42, shows: 38, avatar: "https://i.pravatar.cc/150?u=jessica" },
  { id: 2, name: "Winston Bishop", appts: 39, shows: 34, avatar: "https://i.pravatar.cc/150?u=winston" },
  { id: 3, name: "Nick Miller", appts: 35, shows: 30, avatar: "https://i.pravatar.cc/150?u=nick" },
];

export default function Gamification() {
  const [tvMode, setTvMode] = useState(false);
  const [currentTop, setCurrentTop] = useState(SALES_LEADERBOARD[0]);

  useEffect(() => {
    if (tvMode) {
      const interval = setInterval(() => {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#1CAF3F', '#1A4FB1', '#FFD700']
        });
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [tvMode]);

  const toggleTvMode = () => {
    setTvMode(!tvMode);
    hapticFeedback();
    if (!tvMode) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${tvMode ? 'bg-slate-950 text-white p-0' : 'bg-slate-50 dark:bg-slate-900 p-4 md:p-8'}`}>
      <div className={`max-w-7xl mx-auto space-y-6 ${tvMode ? 'max-w-none h-screen flex flex-col p-12' : ''}`}>
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className={`font-black tracking-tighter flex items-center gap-3 ${tvMode ? 'text-6xl uppercase italic' : 'text-3xl'}`}>
              <Trophy className={`${tvMode ? 'h-16 w-16' : 'h-8 w-8'} text-yellow-500`} />
              Dealership Leaderboards
            </h1>
            {!tvMode && <p className="text-slate-500 mt-1">Real-time performance tracking and gamification for the sales floor.</p>}
          </div>
          <Button 
            onClick={toggleTvMode} 
            variant={tvMode ? "outline" : "default"} 
            className={`gap-2 ${tvMode ? 'border-white/20 text-white hover:bg-white/10' : 'bg-primary shadow-lg shadow-primary/20'}`}
          >
            {tvMode ? <><Maximize2 className="h-4 w-4" /> Exit TV Mode</> : <><Tv className="h-4 w-4" /> Enter TV Mode</>}
          </Button>
        </div>

        {tvMode ? (
          /* TV MODE LAYOUT */
          <div className="flex-1 grid grid-cols-12 gap-12 mt-12 overflow-hidden">
            {/* Main Leaderboard */}
            <div className="col-span-8 space-y-8">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                <h2 className="text-4xl font-black uppercase italic mb-8 flex items-center gap-4 text-primary">
                  <Crown className="h-10 w-10 text-yellow-400" /> Top Sales Units - May 2026
                </h2>
                <div className="space-y-6">
                  {SALES_LEADERBOARD.map((user, idx) => (
                    <div key={user.id} className={`flex items-center gap-6 p-6 rounded-2xl transition-all ${idx === 0 ? 'bg-primary/20 border-2 border-primary shadow-[0_0_30px_rgba(26,79,177,0.3)] scale-105' : 'bg-white/5 border border-white/10 opacity-80'}`}>
                      <div className="text-4xl font-black italic w-12 text-slate-500">{idx + 1}</div>
                      <Avatar className="h-20 w-20 border-4 border-white/20">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="text-3xl font-black">{user.name}</h3>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge className="bg-primary text-white text-lg px-4 py-1">{user.units} Units</Badge>
                          <Badge variant="outline" className="text-lg px-4 py-1 border-white/20 text-white/60">$84k Gross</Badge>
                        </div>
                      </div>
                      {user.streak > 3 && (
                        <div className="flex items-center gap-2 text-orange-500 animate-pulse">
                          <Flame className="h-10 w-10 fill-current" />
                          <span className="text-2xl font-black">{user.streak} DAY STREAK</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Side Stats */}
            <div className="col-span-4 space-y-8">
              <Card className="bg-emerald-500/10 border-emerald-500/30 text-white rounded-3xl p-8">
                <h3 className="text-2xl font-black uppercase mb-4 text-emerald-400">Store Goal</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-6xl font-black">142</span>
                    <span className="text-2xl font-bold text-emerald-400/60">/ 200 Units</span>
                  </div>
                  <div className="h-6 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[71%] shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
                  </div>
                  <p className="text-xl text-emerald-400/80 font-medium">71% of Monthly Goal Reached</p>
                </div>
              </Card>

              <Card className="bg-primary/10 border-primary/30 text-white rounded-3xl p-8 flex-1">
                <h3 className="text-2xl font-black uppercase mb-6 text-primary">Performance Trends</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={SALES_LEADERBOARD}>
                      <Bar dataKey="units" radius={[4, 4, 0, 0]}>
                        {SALES_LEADERBOARD.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#1A4FB1' : '#ffffff20'} />
                        ))}
                      </Bar>
                      <XAxis dataKey="name" hide />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>
        ) : (
          /* REGULAR DASHBOARD LAYOUT */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" /> Sales Leaderboard
                  </CardTitle>
                  <CardDescription>Top performing sales consultants this month.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {SALES_LEADERBOARD.map((user, idx) => (
                      <div key={user.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <div className="text-lg font-bold text-slate-400 w-6">{idx + 1}</div>
                        <Avatar className="h-12 w-12 border border-border">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>{user.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {user.name}
                            {user.streak > 3 && <Flame className="h-4 w-4 text-orange-500 fill-current" />}
                          </h4>
                          <p className="text-sm text-slate-500">{user.units} Units · {formatCurrency(user.gross)} Gross</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={user.status === "Hot" ? "default" : "secondary"} className={user.status === "Hot" ? "bg-orange-500 hover:bg-orange-600" : ""}>
                            {user.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Zap className="h-5 w-5 text-yellow-500" /> BDC Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {BDC_LEADERBOARD.map((user, idx) => (
                        <div key={user.id} className="flex items-center gap-3 p-4">
                          <div className="text-sm font-bold text-slate-400">{idx + 1}</div>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>{user.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h5 className="font-bold text-sm">{user.name}</h5>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-slate-500">{user.appts} Appts</span>
                              <span className="text-xs text-emerald-600 font-bold">{user.shows} Shows</span>
                            </div>
                          </div>
                          <div className="text-right text-xs font-black text-primary">
                            {Math.round((user.shows / user.appts) * 100)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-slate-800 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Store Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div className="text-4xl font-black text-primary">142</div>
                      <div className="text-sm font-bold text-slate-500">Goal: 200 Units</div>
                    </div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[71%] shadow-sm" />
                    </div>
                    <p className="text-xs text-slate-500 italic">"At this pace, we are projected to hit 198 units. Let's push for 2 more!" — AI Store Manager</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="space-y-6">
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Hot Streaks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                    <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-lg">
                      <Flame className="h-6 w-6 fill-current" />
                    </div>
                    <div>
                      <h5 className="font-bold text-orange-700 dark:text-orange-400">Sarah Jenkins</h5>
                      <p className="text-xs text-orange-600/80">5 Sold Units in 48 Hours!</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-lg">
                      <Zap className="h-6 w-6 fill-current" />
                    </div>
                    <div>
                      <h5 className="font-bold text-blue-700 dark:text-blue-400">Mike Ross</h5>
                      <p className="text-xs text-blue-600/80">12 Appointments Set Today</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Award className="h-5 w-5 text-purple-500" /> Digital Badges</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-lg">
                      <Medal className="h-5 w-5 fill-current" />
                    </div>
                    <div>
                      <h5 className="font-bold text-purple-700 dark:text-purple-400">Hat Trick Hero</h5>
                      <p className="text-xs text-purple-600/80">3 cars in 1 day (Mike Ross)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg">
                      <Star className="h-5 w-5 fill-current" />
                    </div>
                    <div>
                      <h5 className="font-bold text-emerald-700 dark:text-emerald-400">Perfect F&I Hand</h5>
                      <p className="text-xs text-emerald-600/80">100% Penetration (Derek W.)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                    <BrainCircuit className="h-5 w-5" /> AI Virtual Sales Coach
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-sm">Sarah Jenkins</p>
                      <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">Coach Score: 94/100</Badge>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 italic">"Great job building rapport on the last 3 calls. Try introducing the trade-in valuation slightly earlier in the conversation to prevent friction."</p>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-sm">Mike Ross</p>
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Coach Score: 78/100</Badge>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 italic">"You're rushing the F&I handoff. Let the customer review the numbers for at least 60 seconds before asking for the signature."</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Star className="h-5 w-5 text-yellow-500" /> Recent Achievements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-yellow-500/20 flex items-center justify-center text-yellow-600">
                      <Award className="h-4 w-4" />
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">David Chen</span> earned <span className="text-primary font-bold">"Closer of the Week"</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">Emily Blunt</span> reached <span className="text-primary font-bold">100% CSI Score</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
}
