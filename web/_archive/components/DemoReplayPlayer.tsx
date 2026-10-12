import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, RotateCcw, X, ChevronRight, Volume2, VolumeX,
  Maximize2, SkipForward,
} from "lucide-react";
import { Button } from "./ui/button";

// ─── Scene Definitions ────────────────────────────────────────────────────────

interface SceneCallout {
  id: string;
  label: string;
  sublabel?: string;
  position: { top: string; left: string };   // % positions within video frame
  arrowDir: "top" | "bottom" | "left" | "right";
  badge?: string;
  delay: number;    // seconds after scene start to show this callout
}

interface Scene {
  id: string;
  title: string;
  subtitle: string;
  duration: number;   // seconds
  bg: string;         // tailwind gradient classes
  icon: string;       // emoji
  callouts: SceneCallout[];
  mockUI: React.ReactNode;
}

// ─── Mock UI Components ───────────────────────────────────────────────────────

const DashboardMock = () => (
  <div className="w-full h-full bg-slate-50 rounded-lg overflow-hidden p-3 space-y-2" data-mock>
    <div className="flex items-center gap-2 mb-2">
      <div className="h-5 w-5 bg-blue-600 rounded-md flex items-center justify-center">
        <span className="text-white text-[8px] font-bold">CS</span>
      </div>
      <span className="text-[9px] font-bold text-slate-700">CarSales AI OS</span>
      <div className="ml-auto flex gap-1">
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[7px] text-emerald-600 font-bold">LIVE</span>
      </div>
    </div>
    <div className="grid grid-cols-4 gap-1.5">
      {[
        { label: "New Leads", value: "24", color: "bg-blue-500" },
        { label: "Appointments", value: "8", color: "bg-emerald-500" },
        { label: "Deals Open", value: "13", color: "bg-amber-500" },
        { label: "Sold MTD", value: "47", color: "bg-violet-500" },
      ].map(m => (
        <div key={m.label} className="bg-white rounded-md p-1.5 border border-slate-100 shadow-sm">
          <div className={`h-1.5 w-4 ${m.color} rounded-full mb-1`} />
          <div className="text-[10px] font-bold text-slate-800">{m.value}</div>
          <div className="text-[7px] text-slate-400">{m.label}</div>
        </div>
      ))}
    </div>
    <div className="bg-white rounded-md border border-slate-100 p-2 shadow-sm">
      <div className="text-[8px] font-bold text-slate-600 mb-1.5">MTD Sales Progress</div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full w-3/5 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[7px] text-slate-400">47 sold</span>
        <span className="text-[7px] text-slate-400">Goal: 75</span>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-1.5">
      {[
        { name: "Mike Torres", value: "$42K", deals: "9", color: "bg-amber-400" },
        { name: "Sarah Lee", value: "$38K", deals: "8", color: "bg-emerald-400" },
      ].map(s => (
        <div key={s.name} className="bg-white rounded-md border border-slate-100 p-1.5 flex items-center gap-1.5 shadow-sm">
          <div className={`h-4 w-4 ${s.color} rounded-full flex items-center justify-center text-[7px] font-bold text-white shrink-0`}>
            {s.name[0]}
          </div>
          <div className="min-w-0">
            <div className="text-[8px] font-bold text-slate-700 truncate">{s.name}</div>
            <div className="text-[7px] text-slate-400">{s.deals} deals · {s.value}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const CRMMock = () => (
  <div className="w-full h-full bg-slate-50 rounded-lg overflow-hidden p-2 space-y-1.5" data-mock>
    <div className="flex items-center justify-between mb-1">
      <span className="text-[9px] font-bold text-slate-700">CRM Pipeline</span>
      <div className="text-[7px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full">47 Active</div>
    </div>
    <div className="flex gap-1.5 overflow-hidden">
      {[
        { stage: "New Lead", count: 12, color: "bg-blue-400" },
        { stage: "Contacted", count: 8, color: "bg-amber-400" },
        { stage: "Appt Set", count: 6, color: "bg-violet-400" },
        { stage: "Working", count: 5, color: "bg-emerald-400" },
      ].map(col => (
        <div key={col.stage} className="flex-1 min-w-0">
          <div className={`h-1 w-full ${col.color} rounded-full mb-1`} />
          <div className="text-[7px] font-bold text-slate-500 truncate mb-1">{col.stage}</div>
          {Array.from({ length: Math.min(col.count, 3) }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded p-1 mb-1 shadow-sm">
              <div className="h-1.5 bg-slate-200 rounded-full mb-0.5 w-full" />
              <div className="h-1.5 bg-slate-100 rounded-full w-2/3" />
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

const InventoryMock = () => (
  <div className="w-full h-full bg-slate-50 rounded-lg overflow-hidden p-2 space-y-1.5" data-mock>
    <div className="flex items-center justify-between mb-1">
      <span className="text-[9px] font-bold text-slate-700">Inventory</span>
      <div className="text-[7px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full">143 Units</div>
    </div>
    {[
      { year: "2024", make: "Toyota", model: "Camry XSE", price: "$31,990", days: 12, status: "Available", color: "bg-emerald-100 text-emerald-700" },
      { year: "2023", make: "Ford", model: "F-150 XLT", price: "$47,500", days: 28, status: "Hot", color: "bg-red-100 text-red-700" },
      { year: "2024", make: "Honda", model: "CR-V Sport", price: "$34,500", days: 5, status: "New", color: "bg-blue-100 text-blue-700" },
      { year: "2022", make: "BMW", model: "X5 M Sport", price: "$58,900", days: 52, status: "Aged", color: "bg-amber-100 text-amber-700" },
    ].map(v => (
      <div key={v.model} className="bg-white border border-slate-100 rounded-md p-1.5 flex items-center gap-2 shadow-sm">
        <div className="h-7 w-10 bg-gradient-to-br from-slate-200 to-slate-100 rounded flex items-center justify-center text-sm shrink-0">🚗</div>
        <div className="flex-1 min-w-0">
          <div className="text-[8px] font-bold text-slate-800 truncate">{v.year} {v.make} {v.model}</div>
          <div className="text-[7px] text-slate-500">{v.price} · {v.days}d in stock</div>
        </div>
        <div className={`text-[7px] font-bold px-1 py-0.5 rounded-full shrink-0 ${v.color}`}>{v.status}</div>
      </div>
    ))}
  </div>
);

const DeskingMock = () => (
  <div className="w-full h-full bg-slate-50 rounded-lg overflow-hidden p-2 space-y-1.5" data-mock>
    <div className="flex items-center justify-between mb-1">
      <span className="text-[9px] font-bold text-slate-700">Deal Desking</span>
      <div className="text-[7px] bg-violet-100 text-violet-700 font-bold px-1.5 py-0.5 rounded-full">Working</div>
    </div>
    <div className="bg-white border border-slate-100 rounded-md p-2 shadow-sm space-y-1">
      <div className="text-[8px] font-bold text-slate-600">2024 Toyota Camry XSE</div>
      <div className="grid grid-cols-2 gap-1">
        {[
          { label: "Sale Price", value: "$31,990" },
          { label: "Trade ACV", value: "$8,500" },
          { label: "Down Pmt", value: "$3,000" },
          { label: "Amount Fin", value: "$20,490" },
        ].map(f => (
          <div key={f.label} className="bg-slate-50 rounded p-1">
            <div className="text-[7px] text-slate-400">{f.label}</div>
            <div className="text-[8px] font-bold text-slate-700">{f.value}</div>
          </div>
        ))}
      </div>
    </div>
    <div className="bg-white border border-slate-100 rounded-md p-2 shadow-sm">
      <div className="text-[8px] font-bold text-slate-600 mb-1">F&I Menu</div>
      <div className="space-y-0.5">
        {[
          { product: "Extended Warranty", price: "$89/mo", selected: true },
          { product: "GAP Insurance", price: "$19/mo", selected: true },
          { product: "Paint Protection", price: "$24/mo", selected: false },
        ].map(p => (
          <div key={p.product} className={`flex items-center gap-1.5 p-1 rounded text-[7px] ${p.selected ? "bg-blue-50 text-blue-700" : "text-slate-400"}`}>
            <div className={`h-2 w-2 rounded-sm border ${p.selected ? "bg-blue-500 border-blue-500" : "border-slate-300"}`} />
            <span className="flex-1">{p.product}</span>
            <span className="font-bold">{p.price}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ReportsMock = () => (
  <div className="w-full h-full bg-slate-50 rounded-lg overflow-hidden p-2 space-y-1.5" data-mock>
    <div className="flex items-center justify-between mb-1">
      <span className="text-[9px] font-bold text-slate-700">Executive Reports</span>
      <div className="text-[7px] text-slate-400">MTD May 2026</div>
    </div>
    <div className="grid grid-cols-3 gap-1">
      {[
        { label: "Total Gross", value: "$284K", delta: "+12%" },
        { label: "Units Sold", value: "47", delta: "+8%" },
        { label: "Close Rate", value: "31%", delta: "+4%" },
      ].map(m => (
        <div key={m.label} className="bg-white border border-slate-100 rounded-md p-1.5 text-center shadow-sm">
          <div className="text-[10px] font-bold text-slate-800">{m.value}</div>
          <div className="text-[7px] text-slate-400">{m.label}</div>
          <div className="text-[7px] text-emerald-600 font-bold">{m.delta}</div>
        </div>
      ))}
    </div>
    <div className="bg-white border border-slate-100 rounded-md p-2 shadow-sm">
      <div className="text-[8px] font-bold text-slate-600 mb-1.5">Lead Source Performance</div>
      <div className="space-y-1">
        {[
          { source: "Website", pct: 72 }, { source: "Walk-in", pct: 55 },
          { source: "Referral", pct: 90 }, { source: "Facebook", pct: 40 },
        ].map(s => (
          <div key={s.source} className="flex items-center gap-1.5">
            <div className="text-[7px] text-slate-500 w-10 shrink-0">{s.source}</div>
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-400 rounded-full" style={{ width: `${s.pct}%` }} />
            </div>
            <div className="text-[7px] font-bold text-slate-600 w-5 text-right">{s.pct}%</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Scenes Array ─────────────────────────────────────────────────────────────

const SCENES: Scene[] = [
  {
    id: "dashboard",
    title: "Dealership Command Center",
    subtitle: "Every KPI your team needs — at a glance",
    duration: 10,
    bg: "from-blue-950 to-blue-900",
    icon: "📊",
    mockUI: <DashboardMock />,
    callouts: [
      {
        id: "kpis",
        label: "Live KPI Cards",
        sublabel: "New leads, appts, deals, sold MTD",
        position: { top: "18%", left: "50%" },
        arrowDir: "bottom",
        badge: "Real-time",
        delay: 1.2,
      },
      {
        id: "leaderboard",
        label: "Sales Leaderboard",
        sublabel: "See who's closing and who needs coaching",
        position: { top: "75%", left: "25%" },
        arrowDir: "top",
        badge: "Motivation",
        delay: 4,
      },
    ],
  },
  {
    id: "crm",
    title: "Lead & CRM Pipeline",
    subtitle: "Never let a lead fall through the cracks",
    duration: 10,
    bg: "from-violet-950 to-violet-900",
    icon: "👥",
    mockUI: <CRMMock />,
    callouts: [
      {
        id: "pipeline",
        label: "Kanban Pipeline",
        sublabel: "Drag leads through every stage",
        position: { top: "20%", left: "50%" },
        arrowDir: "bottom",
        badge: "Drag & Drop",
        delay: 1.0,
      },
      {
        id: "stages",
        label: "12 Deal Stages",
        sublabel: "New → Contacted → Appt → Sold → Lost",
        position: { top: "60%", left: "75%" },
        arrowDir: "left",
        badge: "Trackable",
        delay: 4.5,
      },
    ],
  },
  {
    id: "inventory",
    title: "Inventory Management",
    subtitle: "Every vehicle, status, and opportunity tracked",
    duration: 10,
    bg: "from-emerald-950 to-emerald-900",
    icon: "🚗",
    mockUI: <InventoryMock />,
    callouts: [
      {
        id: "status",
        label: "Smart Status Badges",
        sublabel: "Available · Hot · Aged · In Recon",
        position: { top: "25%", left: "80%" },
        arrowDir: "left",
        badge: "Automated",
        delay: 1.0,
      },
      {
        id: "aging",
        label: "Aging Alerts",
        sublabel: "Auto-flag vehicles over 45 days",
        position: { top: "72%", left: "50%" },
        arrowDir: "top",
        badge: "⚠️ Alert",
        delay: 4.0,
      },
    ],
  },
  {
    id: "desking",
    title: "Deal Desking & F&I Menu",
    subtitle: "Structure every deal. Maximize every back-end.",
    duration: 10,
    bg: "from-amber-950 to-orange-900",
    icon: "💰",
    mockUI: <DeskingMock />,
    callouts: [
      {
        id: "payments",
        label: "Live Payment Calculator",
        sublabel: "Good/Better/Best tiers in seconds",
        position: { top: "28%", left: "50%" },
        arrowDir: "bottom",
        badge: "Instant",
        delay: 1.0,
      },
      {
        id: "fi",
        label: "F&I Product Menu",
        sublabel: "Warranty, GAP, protection packages",
        position: { top: "72%", left: "50%" },
        arrowDir: "top",
        badge: "$$$",
        delay: 4.5,
      },
    ],
  },
  {
    id: "reports",
    title: "Executive Reporting",
    subtitle: "Own the numbers. Own the outcome.",
    duration: 10,
    bg: "from-slate-900 to-slate-800",
    icon: "📈",
    mockUI: <ReportsMock />,
    callouts: [
      {
        id: "gross",
        label: "Gross & Unit Tracking",
        sublabel: "MTD progress vs. goals",
        position: { top: "20%", left: "50%" },
        arrowDir: "bottom",
        badge: "Owner View",
        delay: 1.0,
      },
      {
        id: "source",
        label: "Lead Source ROI",
        sublabel: "Know where your best deals come from",
        position: { top: "70%", left: "50%" },
        arrowDir: "top",
        badge: "Analytics",
        delay: 4.0,
      },
    ],
  },
];

const TOTAL_DURATION = SCENES.reduce((s, sc) => s + sc.duration, 0);

// ─── Callout Bubble ───────────────────────────────────────────────────────────

const CalloutBubble: React.FC<{ callout: SceneCallout; visible: boolean }> = ({ callout, visible }) => {
  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-0 border-t-white/90",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-0 border-b-white/90",
    left: "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-0 border-l-white/90",
    right: "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-0 border-r-white/90",
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={callout.id}
          className="absolute z-20 pointer-events-none"
          style={{ top: callout.position.top, left: callout.position.left, transform: "translate(-50%, -50%)" }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: "spring", damping: 18, stiffness: 200 }}
        >
          {/* Spotlight ring on target */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-white/60"
            style={{ width: 48, height: 48, top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />

          {/* Callout card */}
          <div
            className="relative bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-white/50 px-3 py-2 min-w-[130px] max-w-[200px]"
            style={{
              marginTop: callout.arrowDir === "bottom" ? "-90px" : callout.arrowDir === "top" ? "24px" : 0,
              marginLeft: callout.arrowDir === "right" ? "-220px" : callout.arrowDir === "left" ? "24px" : 0,
            }}
          >
            {callout.badge && (
              <span className="inline-block bg-blue-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full mb-1">
                {callout.badge}
              </span>
            )}
            <p className="text-[11px] font-bold text-slate-800 leading-tight">{callout.label}</p>
            {callout.sublabel && (
              <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">{callout.sublabel}</p>
            )}

            {/* Arrow */}
            <div
              className={`absolute w-0 h-0 border-[6px] border-white/90 ${arrowClasses[callout.arrowDir]}`}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── Main Player Component ────────────────────────────────────────────────────

interface DemoReplayPlayerProps {
  onClose: () => void;
}

export const DemoReplayPlayer: React.FC<DemoReplayPlayerProps> = ({ onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const tick = 0.2; // update every 200ms for smooth progress

  const start = useCallback(() => {
    setHasStarted(true);
    setIsPlaying(true);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => {
          if (prev >= TOTAL_DURATION) {
            setIsPlaying(false);
            return TOTAL_DURATION;
          }
          return prev + tick;
        });
      }, tick * 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying]);

  const reset = () => {
    setElapsed(0);
    setIsPlaying(false);
    setHasStarted(false);
  };

  // Determine current scene
  let sceneElapsed = 0;
  let sceneIdx = 0;
  let timeInScene = 0;
  for (let i = 0; i < SCENES.length; i++) {
    if (elapsed < sceneElapsed + SCENES[i].duration) {
      sceneIdx = i;
      timeInScene = elapsed - sceneElapsed;
      break;
    }
    sceneElapsed += SCENES[i].duration;
    sceneIdx = SCENES.length - 1;
    timeInScene = elapsed - (TOTAL_DURATION - SCENES[SCENES.length - 1].duration);
  }

  const scene = SCENES[sceneIdx];
  const progress = (elapsed / TOTAL_DURATION) * 100;
  const isFinished = elapsed >= TOTAL_DURATION;

  // Visible callouts for current scene
  const visibleCallouts = scene.callouts.filter(c => timeInScene >= c.delay);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, "0")}`;

  const skipToScene = (idx: number) => {
    const t = SCENES.slice(0, idx).reduce((a, s) => a + s.duration, 0);
    setElapsed(t);
    setHasStarted(true);
    setIsPlaying(true);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[400] flex items-center justify-center p-3 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        className="relative z-10 w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl border border-white/10"
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        transition={{ type: "spring", damping: 22 }}
      >
        {/* ── Video Area ── */}
        <div className={`relative w-full bg-gradient-to-br ${scene.bg} overflow-hidden`} style={{ aspectRatio: "16/9" }}>

          {/* Animated background texture */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />

          {/* Scene transition */}
          <AnimatePresence mode="wait">
            <motion.div
              key={scene.id}
              className="absolute inset-0 flex"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.5 }}
            >
              {/* Left: Scene info */}
              <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 z-10">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl sm:text-3xl">{scene.icon}</span>
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/50">
                      Scene {sceneIdx + 1} of {SCENES.length}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-2xl font-bold text-white leading-tight mb-1">{scene.title}</h2>
                  <p className="text-xs sm:text-sm text-white/60 leading-relaxed max-w-xs">{scene.subtitle}</p>
                </motion.div>

                {/* Scene dots */}
                <div className="flex gap-1.5 mt-4">
                  {SCENES.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => skipToScene(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === sceneIdx ? "w-6 bg-white" : i < sceneIdx ? "w-3 bg-white/50" : "w-3 bg-white/20"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Right: Mock UI with callouts */}
              <div className="w-[45%] shrink-0 p-4 relative flex items-center">
                <div className="w-full rounded-lg overflow-hidden shadow-2xl border border-white/10 relative" style={{ aspectRatio: "3/2.2" }}>
                  <div className="w-full h-full scale-[0.85] origin-top-left" style={{ width: "117%", height: "117%" }}>
                    {scene.mockUI}
                  </div>

                  {/* Callout bubbles */}
                  {visibleCallouts.map(c => (
                    <CalloutBubble key={c.id} callout={c} visible={true} />
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Not started overlay */}
          <AnimatePresence>
            {!hasStarted && (
              <motion.div
                className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.button
                  onClick={start}
                  className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
                  whileTap={{ scale: 0.95 }}
                >
                  <Play className="h-7 w-7 sm:h-9 sm:w-9 text-slate-900 translate-x-0.5" />
                </motion.button>
                <p className="text-white/70 text-sm mt-4 font-medium">Play 60-Second Highlight Reel</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Finished overlay */}
          <AnimatePresence>
            {isFinished && (
              <motion.div
                className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="text-4xl mb-3">🎉</div>
                <h3 className="text-xl font-bold text-white mb-1">That's CarSalesSoftware.com</h3>
                <p className="text-white/60 text-sm mb-5 max-w-xs text-center">One platform. Every role. Every deal.</p>
                <div className="flex gap-3">
                  <button
                    onClick={reset}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" /> Watch Again
                  </button>
                  <button
                    onClick={() => window.open("https://carsalessoftware.com/pricing", "_blank")}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-slate-900 text-sm font-bold hover:bg-white/90 transition-colors"
                  >
                    See Pricing <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between z-20">
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1">
              <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">Demo Replay</span>
            </div>
            <button
              onClick={onClose}
              className="h-7 w-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Progress bar (top) */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10 z-30">
            <motion.div
              className="h-full bg-white/80"
              animate={{ width: `${progress}%` }}
              transition={{ duration: tick, ease: "linear" }}
            />
          </div>
        </div>

        {/* ── Controls Bar ── */}
        <div className="bg-slate-950 border-t border-white/10 px-4 py-3 flex items-center gap-3">
          {/* Play / Pause */}
          <button
            onClick={() => isFinished ? reset() : (hasStarted ? setIsPlaying(p => !p) : start())}
            className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors shrink-0"
          >
            {isFinished ? (
              <RotateCcw className="h-4 w-4" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 translate-x-0.5" />
            )}
          </button>

          {/* Skip forward */}
          {!isFinished && (
            <button
              onClick={() => skipToScene(Math.min(sceneIdx + 1, SCENES.length - 1))}
              className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors shrink-0"
              title="Skip to next scene"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Progress bar */}
          <div
            className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer group"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              setElapsed(ratio * TOTAL_DURATION);
              setHasStarted(true);
              setIsPlaying(true);
            }}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full group-hover:opacity-80 transition-opacity"
              animate={{ width: `${progress}%` }}
              transition={{ duration: tick, ease: "linear" }}
            />
          </div>

          {/* Time */}
          <span className="text-[11px] text-white/50 font-mono shrink-0 tabular-nums">
            {formatTime(elapsed)} / {formatTime(TOTAL_DURATION)}
          </span>

          {/* Mute */}
          <button
            onClick={() => setIsMuted(m => !m)}
            className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors shrink-0"
          >
            {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>

          {/* Scene pills */}
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            {SCENES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => skipToScene(i)}
                title={s.title}
                className={`h-6 px-2 rounded-full text-[10px] font-semibold transition-all ${
                  i === sceneIdx
                    ? "bg-white/20 text-white"
                    : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
                }`}
              >
                {s.icon}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DemoReplayPlayer;
