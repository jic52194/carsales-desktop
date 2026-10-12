import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, Percent, Calculator, FileText, Zap, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import confetti from "canvas-confetti";

export default function PayPlans() {
  const [simUnits, setSimUnits] = useState(15);
  const [simGross, setSimGross] = useState(45000);
  
  const calculateSimulatedPay = () => {
    let base = simGross * 0.25; // 25% front end
    let bonus = simUnits >= 10 ? 1000 : 0;
    if (simUnits >= 15) bonus += 500;
    if (simUnits >= 20) bonus += 1000;
    return base + bonus;
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-7 w-7 text-primary" /> Pay Plans & Spiffs
          </h1>
          <p className="text-slate-500 mt-1">Manage commission structures and automated payouts.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto scrollbar-hide pb-2 md:pb-0">
          <Button variant="outline" className="bg-white dark:bg-slate-950 whitespace-nowrap border-indigo-200 text-indigo-700 hover:bg-indigo-50" onClick={() => {
            toast.success("Commission Voucher Generated", { description: "Auto-generated pay voucher for Deal #4592 (Funded)." });
          }}>
            <FileText className="mr-2 h-4 w-4" /> Commission Vouchers
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap" onClick={() => {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            toast.success("Weekend Spiffs Calculated & Approved!", { description: "$1,450 in spiffs sent to payroll for processing." });
          }}>
            <Zap className="mr-2 h-4 w-4" /> 1-Click Approve Spiffs
          </Button>
        </div>
      </div>
      <Card className="bg-indigo-50/50 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/50 shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300">
            <BrainCircuit className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Interactive Pay Plan Simulator
          </CardTitle>
          <CardDescription className="text-indigo-800/70 dark:text-indigo-200/60">
            Allow sales reps to simulate their monthly commission based on their current plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="space-y-4 md:col-span-2">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Units Sold: {simUnits}</span>
                </div>
                <Slider min={0} max={30} step={1} value={[simUnits]} onValueChange={(v) => setSimUnits(v[0])} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Total Front-End Gross: ${simGross.toLocaleString()}</span>
                </div>
                <Slider min={0} max={100000} step={1000} value={[simGross]} onValueChange={(v) => setSimGross(v[0])} />
              </div>
            </div>
            <div className="bg-white dark:bg-slate-950 p-6 rounded-xl border border-indigo-100 dark:border-indigo-900/50 text-center shadow-sm">
              <p className="text-sm text-slate-500 uppercase tracking-wider font-bold mb-2">Estimated Payout</p>
              <p className="text-4xl font-black text-emerald-600">${calculateSimulatedPay().toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-2">Includes volume bonuses</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales Commission Structure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
              <span className="font-medium">Front-End Gross</span>
              <span className="text-primary font-bold">25%</span>
            </div>
            <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
              <span className="font-medium">Back-End Gross</span>
              <span className="text-primary font-bold">5%</span>
            </div>
            <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
              <span className="font-medium">Unit Bonus (10+)</span>
              <span className="text-primary font-bold">$1,000</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>F&I Bonus Structure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
              <span className="font-medium">PVR Target</span>
              <span className="text-primary font-bold">$1,800</span>
            </div>
            <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
              <span className="font-medium">Product Penetration</span>
              <span className="text-primary font-bold">55%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
