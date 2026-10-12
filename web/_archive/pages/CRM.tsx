import React, { useState, useMemo, useEffect } from "react";
import { loadInventory } from "@/lib/inventory";
import confetti from "canvas-confetti";
import { PullToRefresh } from "@/components/PullToRefresh";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Mic, Phone, Mail, Sparkles, UserCircle, GripVertical, Calendar, FileText, CheckCircle2, Clock, Calculator, Database, Car, Flame, MessageSquare, Zap, ShieldCheck, Activity, Brain, Video, PlayCircle, Play, FastForward, Plus, Shield, Camera, Share2, AlertTriangle, UserPlus, ShieldAlert } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Separator } from "../components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragStartEvent, 
  DragEndEvent,
  useDroppable,
  useDraggable
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { hapticFeedback } from "@/lib/haptics";
import { toast } from "sonner";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

type LeadStatus = "new" | "contacted" | "appointment_set" | "showed" | "vehicle_selected" | "numbers_presented" | "finance_app" | "finance_review" | "approved" | "contracting" | "delivered" | "sold" | "lost";

interface Lead {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  vehicle: string;
  score: number;
  status: LeadStatus;
  activity: string;
  avatar?: string;
  lastContact?: string;
  lastAction?: 'phone' | 'email' | 'sms' | 'meeting';
  isOnline?: boolean;
  recentSentiments?: ('positive' | 'neutral' | 'negative')[];
  frictionDensity?: 'high' | 'medium' | 'low';
  price?: string;
  socialSignal?: string;
  churnRisk?: string;
}

const INITIAL_LEADS: Lead[] = [
  { id: 1, name: "Sarah Jenkins", vehicle: "2024 Luxury SUV", score: 95, status: "new", activity: "Viewed VDP 4 times today", avatar: "https://vibe.filesafe.space/1778548756560730619/assets/f142b3ca-7909-4c19-970a-c590cabb6515.png", lastContact: "2h ago", lastAction: 'sms', isOnline: true, recentSentiments: ['neutral', 'positive', 'positive'], frictionDensity: 'low', price: "$45,000" },
  { id: 2, name: "Mike & Elena Ross", vehicle: "2024 Family Sedan", score: 72, status: "contacted", activity: "Submitted trade-in form", avatar: "https://vibe.filesafe.space/1778548756560730619/assets/8ba4b31f-8962-4fb4-b004-c6b9cf77c133.png", lastContact: "1d ago", lastAction: 'phone', recentSentiments: ['positive', 'neutral', 'negative'], frictionDensity: 'medium', price: "$28,500" },
  { id: 3, name: "David Chen", vehicle: "2021 Sport Compact", score: 45, status: "new", activity: "Browsed inventory 2 days ago", avatar: "https://i.pravatar.cc/150?u=david", lastContact: "3d ago", lastAction: 'email', recentSentiments: ['neutral', 'neutral', 'neutral'], frictionDensity: 'low', price: "$22,000" },
  { id: 4, name: "Emily Blunt", vehicle: "2022 Electric Hatch", score: 88, status: "appointment_set", activity: "Scheduled for tomorrow", avatar: "https://i.pravatar.cc/150?u=emily", lastContact: "4h ago", lastAction: 'meeting', isOnline: true, recentSentiments: ['positive', 'positive', 'positive'], frictionDensity: 'low', price: "$32,000", socialSignal: "Just tweeted: 'Time for a new car!'" },
  { id: 5, name: "John Doe", vehicle: "2020 Rugged Truck", score: 60, status: "numbers_presented", activity: "Counter offer sent", avatar: "https://vibe.filesafe.space/1778548756560730619/assets/fea6a1a1-c1ca-4e7c-bcb6-ced02786663f.png", lastContact: "5h ago", lastAction: 'sms', recentSentiments: ['negative', 'negative', 'neutral'], frictionDensity: 'high', price: "$35,000", churnRisk: "High: Shopping at CarMax" },
  { id: 6, name: "Amanda Waller", vehicle: "2023 Premium EV", score: 92, status: "new", activity: "Inquired via Facebook", avatar: "https://i.pravatar.cc/150?u=amanda", lastContact: "12m ago", lastAction: 'sms', isOnline: true, recentSentiments: ['positive', 'neutral', 'positive'], frictionDensity: 'low', price: "$55,000" },
  { id: 7, name: "Robert California", vehicle: "2024 Luxury SUV", score: 35, status: "contacted", activity: "Left voicemail", avatar: "https://i.pravatar.cc/150?u=robert", lastContact: "2d ago", lastAction: 'phone', recentSentiments: ['negative', 'neutral', 'negative'], frictionDensity: 'high', price: "$65,000" },
  { id: 8, name: "Jim Halpert", vehicle: "2021 Adventure Jeep", score: 85, status: "appointment_set", activity: "Test drive completed", avatar: "https://i.pravatar.cc/150?u=jim", lastContact: "6h ago", lastAction: 'meeting', recentSentiments: ['positive', 'positive', 'positive'], frictionDensity: 'low', price: "$29,000" },
  { id: 9, name: "Pam Beesly", vehicle: "2024 Family Sedan", score: 78, status: "finance_review", activity: "Reviewing finance terms", avatar: "https://i.pravatar.cc/150?u=pam", lastContact: "3h ago", lastAction: 'email', recentSentiments: ['neutral', 'positive', 'positive'], frictionDensity: 'low', price: "$27,500" },
  { id: 10, name: "Dwight Schrute", vehicle: "2020 Rugged Truck", score: 100, status: "sold", activity: "Deal funded", avatar: "https://i.pravatar.cc/150?u=dwight", lastContact: "1w ago", lastAction: 'meeting', recentSentiments: ['positive', 'positive', 'positive'], frictionDensity: 'low', price: "$38,000" },
  { id: 11, name: "Sarah Jenkins", vehicle: "Unknown", score: 40, status: "contacted", activity: "Emailed 3 weeks ago", avatar: "https://vibe.filesafe.space/1778548756560730619/assets/f142b3ca-7909-4c19-970a-c590cabb6515.png", lastContact: "3w ago", lastAction: 'email', recentSentiments: ['neutral', 'neutral', 'neutral'], frictionDensity: 'medium' },
];

const COLUMNS: { id: LeadStatus; title: string; color: string }[] = [
  { id: "new", title: "New Lead", color: "border-blue-500" },
  { id: "contacted", title: "Contacted", color: "border-amber-500" },
  { id: "appointment_set", title: "Appointment Set", color: "border-purple-500" },
  { id: "showed", title: "Showed", color: "border-pink-500" },
  { id: "vehicle_selected", title: "Vehicle Selected", color: "border-indigo-500" },
  { id: "numbers_presented", title: "Numbers Presented", color: "border-orange-500" },
  { id: "finance_app", title: "Finance App", color: "border-teal-500" },
  { id: "finance_review", title: "Finance Review", color: "border-cyan-500" },
  { id: "approved", title: "Approved", color: "border-emerald-500" },
  { id: "contracting", title: "Contracting", color: "border-rose-500" },
  { id: "delivered", title: "Delivered", color: "border-fuchsia-500" },
  { id: "sold", title: "Sold", color: "border-success" },
  { id: "lost", title: "Lost", color: "border-slate-500" },
];

function LeadCard({ lead, isOverlay = false }: { lead: Lead, isOverlay?: boolean }) {
  const isHot = lead.score >= 90;
  
  const ActionIcon = () => {
    switch(lead.lastAction) {
      case 'phone': return <Phone className="h-3 w-3" />;
      case 'email': return <Mail className="h-3 w-3" />;
      case 'sms': return <MessageSquare className="h-3 w-3" />;
      case 'meeting': return <Calendar className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <Card 
      className={`border-l-4 ${isHot ? 'border-l-orange-500' : 'border-l-primary'} ${lead.frictionDensity === 'high' ? 'ring-2 ring-red-500/50 bg-red-50/30 dark:bg-red-950/10' : lead.frictionDensity === 'medium' ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''} ${isOverlay ? 'shadow-xl scale-105 rotate-2 cursor-grabbing' : 'hover:shadow-md cursor-grab active:shadow-lg transition-all'} group overflow-hidden relative`}
    >
      {lead.isOnline && (
        <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[8px] font-black uppercase py-1 px-4 rotate-45 translate-x-4 -translate-y-1 shadow-sm">
            Active
          </div>
        </div>
      )}
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-2.5">
            <GripVertical className="h-4 w-4 text-slate-300 mt-1 shrink-0 hidden md:block group-hover:text-primary transition-colors" />
            <div className="relative">
              <Avatar className="h-10 w-10 shrink-0 shadow-sm border border-border group-hover:ring-2 group-hover:ring-primary/20 transition-all">
                <AvatarImage src={lead.avatar || `https://i.pravatar.cc/150?u=${lead.name}`} />
                <AvatarFallback>{lead.name.charAt(0)}</AvatarFallback>
              </Avatar>
              {lead.isOnline && (
                <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background shadow-sm" />
              )}
              {isHot && !lead.isOnline && (
                <div className="absolute -top-1 -right-1 bg-orange-500 text-white rounded-full p-0.5 shadow-sm animate-bounce">
                  <Flame className="h-2.5 w-2.5" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                {lead.name}
                {isHot && <span className="text-[8px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-tighter bg-orange-500/10 px-1 rounded">Hot</span>}
              </h4>
              <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                {lead.vehicle}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge data-tour-id="tour-predictive-scoring" variant="outline" className={`shrink-0 font-black text-[10px] ${lead.score > 80 ? "text-success border-success/30 bg-success/5" : lead.score > 50 ? "text-amber-600 border-amber-500/30 bg-amber-500/5" : "text-slate-600 border-slate-400/30 bg-slate-400/5"}`} title="Predictive AI Lead Score">
              <Brain className="h-3 w-3 mr-1" />
              {lead.score}
            </Badge>
            {lead.lastContact && (
              <span className="text-[9px] text-muted-foreground font-bold uppercase flex items-center gap-1">
                <ActionIcon /> {lead.lastContact}
              </span>
            )}
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2 border border-slate-100 dark:border-slate-800 group-hover:border-primary/20 transition-colors">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" /> 
          <div className="flex-1 min-w-0">
            <span className="truncate italic font-medium">{lead.activity}</span>
          <div className="flex items-center justify-between mt-1.5">
            <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-emerald-500/5 text-emerald-600 border-emerald-500/20">AI: High Intent</Badge>
            <div className="flex items-center gap-2">
              {lead.frictionDensity && lead.frictionDensity !== 'low' && (
                <Badge variant="outline" className={`text-[8px] h-3.5 px-1 font-bold shadow-sm ${
                  lead.frictionDensity === 'high' ? 'bg-red-500/10 text-red-600 border-red-500/30' :
                  'bg-amber-500/10 text-amber-600 border-amber-500/30'
                }`} title={`AI detected ${lead.frictionDensity} friction in recent interactions.`}>
                  <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> 
                  {lead.frictionDensity.toUpperCase()} FRICTION
                </Badge>
              )}
              {lead.recentSentiments && lead.recentSentiments.length > 0 && (
                <div className="flex items-center gap-0.5 bg-slate-200/50 dark:bg-slate-800/50 p-0.5 rounded" title="AI Sentiment Heatmap (Last 3 Messages)">
                  {lead.recentSentiments.map((s, i) => (
                    <div key={i} className={`h-2.5 w-3.5 rounded-[2px] ${
                      s === 'positive' ? 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.4)]' :
                      s === 'negative' ? 'bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.4)]' : 'bg-amber-400'
                    }`} />
                  ))}
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
        {lead.socialSignal && (
          <div className="mt-1.5 flex items-center gap-1.5 p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md border border-blue-100 dark:border-blue-800/50">
            <Sparkles className="h-3 w-3 shrink-0" />
            <span className="text-[10px] font-medium truncate" title="AI Social Listening Signal">{lead.socialSignal}</span>
          </div>
        )}
        {lead.id === 2 && (
          <div className="mt-1.5 flex items-center gap-1.5 p-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-100 dark:border-emerald-800/50">
            <Car className="h-3 w-3 shrink-0" />
            <span className="text-[10px] font-medium truncate" title="Predictive Trade-In Alert">Positive Equity: 2021 Accord</span>
          </div>
        )}
        {lead.churnRisk && (
          <div className="mt-1.5 flex items-center gap-1.5 p-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-md border border-rose-100 dark:border-rose-800/50">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            <span className="text-[10px] font-medium truncate" title="Predictive Churn Scoring">Churn Risk: {lead.churnRisk}</span>
          </div>
        )}
        <div className="flex gap-1.5 pt-1 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all flex-wrap">
          <Button size="icon" variant="outline" className="flex-1 h-8 bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900 text-blue-600 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); hapticFeedback(); toast.info(`Calling ${lead.name}...`); }}><Phone className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="outline" className="flex-1 h-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50" onClick={(e) => { e.stopPropagation(); hapticFeedback(); toast.info(`SMS to ${lead.name}...`); }}><MessageSquare className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="outline" className="flex-1 h-8 bg-white dark:bg-slate-900 border-purple-200 dark:border-purple-900 text-purple-600 hover:bg-purple-50" onClick={(e) => { e.stopPropagation(); hapticFeedback(); toast.success(`Ringless Voicemail Dropped`, { description: "Pre-recorded manager voicemail sent to customer's inbox." }); }} title="Ringless Voicemail Drop"><Mic className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="outline" className="flex-1 h-8 bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900 text-indigo-600 hover:bg-indigo-50" onClick={(e) => { e.stopPropagation(); hapticFeedback(); toast.success(`Generated AI Avatar Video for ${lead.name}`, { description: "Personalized AI video greeting sent via SMS." }); }} title="AI Video Avatar Generator"><Brain className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="outline" className="flex-1 h-8 bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-900 text-emerald-600 hover:bg-emerald-50" onClick={(e) => { e.stopPropagation(); hapticFeedback(); toast.info(`Generating Test Drive Waiver for ${lead.name}...`); }} title="Digital Test Drive Waiver"><Shield className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="secondary" className="flex-1 h-8 shadow-sm" asChild onClick={(e) => e.stopPropagation()}><Link to={`/?customerName=${encodeURIComponent(lead.name)}&vehicle=${encodeURIComponent(lead.vehicle)}`}><Calculator className="h-3.5 w-3.5" /></Link></Button>
          <Button size="icon" variant="secondary" className="flex-1 h-8 shadow-sm" asChild onClick={(e) => e.stopPropagation()}><Link to={`/crm/customer/${lead.id}`}><UserCircle className="h-3.5 w-3.5" /></Link></Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DraggableLead({ lead, onClick }: { lead: Lead, onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id.toString(),
    data: lead,
  });
  
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="touch-none pb-3" onClick={onClick}>
      <LeadCard lead={lead} />
    </div>
  );
}

function DroppableColumn({ column, leads, onLeadClick }: { column: typeof COLUMNS[0], leads: Lead[], onLeadClick: (lead: Lead) => void }) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div 
      ref={setNodeRef}
      data-tour-id={column.id === 'new' ? 'tour-hot-leads' : undefined}
      className={`min-w-[280px] sm:min-w-[320px] w-[280px] sm:w-[320px] flex-shrink-0 snap-start bg-slate-100/50 dark:bg-slate-800/20 rounded-2xl p-3 sm:p-4 flex flex-col transition-colors duration-200 ${isOver ? 'bg-slate-200/50 dark:bg-slate-700/30 ring-2 ring-primary/20' : ''}`}
    >
      <div className={`flex items-center justify-between mb-4 pb-2 border-b-2 ${column.color}`}>
        <h3 className="font-bold text-slate-700 dark:text-slate-300">{column.title}</h3>
        <Badge variant="secondary" className="font-bold">{leads.length}</Badge>
      </div>
      
      <div className="flex-1 flex flex-col">
        {leads.map(lead => (
          <DraggableLead key={lead.id} lead={lead} onClick={() => onLeadClick(lead)} />
        ))}
        {leads.length === 0 && (
          <div className="flex-1 min-h-[120px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-400 text-xs font-medium">
            Drop lead here
          </div>
        )}
      </div>
    </div>
  );
}

export default function CRM() {
  const location = useLocation();
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');
  const [frictionFilter, setFrictionFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (sentimentFilter !== 'all') {
      result = result.filter(lead => lead.recentSentiments?.some(s => s === sentimentFilter));
    }
    if (frictionFilter !== 'all') {
      result = result.filter(lead => lead.frictionDensity === frictionFilter);
    }
    return result;
  }, [leads, sentimentFilter, frictionFilter]);
  
  const [showMapping, setShowMapping] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  
  const [showDuplicatesPrompt, setShowDuplicatesPrompt] = useState(false);
  const [duplicatesCount, setDuplicatesCount] = useState(0);
  const [pendingLeads, setPendingLeads] = useState<Lead[]>([]);
  
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({ name: '', phone: '', email: '', vehicle: '' });
  const [showVehicleSuggestions, setShowVehicleSuggestions] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<Lead | null>(null);
  const [showHygieneModal, setShowHygieneModal] = useState(false);

  const potentialDuplicates = useMemo(() => {
    const duplicates: { lead1: Lead, lead2: Lead, reason: string }[] = [];
    const nameMap = new Map<string, Lead>();
    
    leads.forEach(l => {
      const key = l.name.toLowerCase();
      if (nameMap.has(key)) {
        duplicates.push({ lead1: nameMap.get(key)!, lead2: l, reason: "Exact Name Match" });
      } else {
        nameMap.set(key, l);
      }
    });
    
    return duplicates;
  }, [leads]);

  const inventory = useMemo(() => loadInventory().map((v) => ({ id: v.id, year: v.year, make: v.make, model: v.model, stockNumber: v.stockNumber })), []);

  const filteredInventory = useMemo(() => {
    if (!newLeadForm.vehicle) return [];
    const search = newLeadForm.vehicle.toLowerCase();
    return inventory.filter((v: any) => 
      `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(search) ||
      (v.stockNumber && v.stockNumber.toLowerCase().includes(search)) ||
      (v.stock && v.stock.toLowerCase().includes(search))
    ).slice(0, 5);
  }, [newLeadForm.vehicle, inventory]);

  useEffect(() => {
    if (highFrictionCount > 0) {
      toast.error(`Manager Alert: ${highFrictionCount} deals in High Friction`, {
        description: "Immediate intervention recommended to prevent lost deals.",
        icon: <ShieldAlert className="h-4 w-4" />,
        duration: 5000,
        action: {
          label: "View Deals",
          onClick: () => setFrictionFilter("high")
        }
      });

      const highValueFrictionDeals = leads.filter(l => l.frictionDensity === 'high' && l.price && parseInt(l.price.replace(/\D/g, '')) > 30000);
      if (highValueFrictionDeals.length > 0) {
        setTimeout(() => {
          toast.info(`Automated SMS Sent to GM`, {
            description: `${highValueFrictionDeals.length} high-value deal(s) (>$30k) entered High Friction status.`,
            icon: <Phone className="h-4 w-4" />,
            duration: 6000,
          });
        }, 1500);
      }
    }
  }, []);

  useEffect(() => {
    if (location.state?.openNewLead) {
      setShowNewLeadModal(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (!newLeadForm.name && !newLeadForm.phone && !newLeadForm.email) {
      setDuplicateWarning(null);
      return;
    }
    
    // Check for duplicates
    const duplicate = leads.find(l => {
      const matchName = newLeadForm.name && l.name.toLowerCase() === newLeadForm.name.toLowerCase();
      const matchPhone = newLeadForm.phone && l.phone && l.phone === newLeadForm.phone;
      const matchEmail = newLeadForm.email && l.email && l.email.toLowerCase() === newLeadForm.email.toLowerCase();
      return matchName || matchPhone || matchEmail;
    });
    
    setDuplicateWarning(duplicate || null);
  }, [newLeadForm.name, newLeadForm.phone, newLeadForm.email, leads]);

  useEffect(() => {
    const handleStoryLead = () => {
      hapticFeedback();
      const newLead: Lead = { 
        id: Date.now(), 
        name: "John Smith (Live)", 
        vehicle: "2024 Toyota Tacoma", 
        score: 95, 
        status: "new", 
        activity: "Requested ePrice via Cars.com", 
        lastContact: "Just now", 
        lastAction: 'sms', 
        isOnline: true,
        recentSentiments: ['neutral']
      };
      setLeads(prev => [newLead, ...prev]);
      toast.success("Live Lead Dropped!", {
        description: "New internet lead from cars.com just arrived.",
        icon: <Zap className="h-4 w-4 text-emerald-500" />
      });
    };

    const handleStoryAiReply = () => {
      hapticFeedback();
      toast.success("AI Follow-Up Sent", {
        description: "Alex AI replied in 8 seconds.",
        icon: <Brain className="h-4 w-4 text-primary" />
      });
      setLeads(prev => prev.map(l => 
        l.name === "John Smith (Live)" 
          ? { ...l, activity: "AI booked appointment for tomorrow", lastContact: "Just now (AI)", recentSentiments: ['neutral', 'positive'] } 
          : l
      ));
    };

    const handleStoryAppt = () => {
      hapticFeedback();
      setLeads(prev => prev.map(l => 
        l.name === "John Smith (Live)" 
          ? { ...l, status: "appointment_set" } 
          : l
      ));
      toast.success("Appointment Booked!", {
        description: "John Smith confirmed for tomorrow at 10:00 AM."
      });
    };

    window.addEventListener('story-trigger-lead', handleStoryLead);
    window.addEventListener('story-trigger-ai-reply', handleStoryAiReply);
    window.addEventListener('story-trigger-appt', handleStoryAppt);

    return () => {
      window.removeEventListener('story-trigger-lead', handleStoryLead);
      window.removeEventListener('story-trigger-ai-reply', handleStoryAiReply);
      window.removeEventListener('story-trigger-appt', handleStoryAppt);
    };
  }, []);
  useEffect(() => {
    const handleOpenHygiene = () => setShowHygieneModal(true);
    const handleCloseHygiene = () => {
      setShowHygieneModal(false);
      setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
    };
    
    window.addEventListener('spotlight-open-hygiene', handleOpenHygiene);
    window.addEventListener('spotlight-close-hygiene', handleCloseHygiene);
    
    return () => {
      window.removeEventListener('spotlight-open-hygiene', handleOpenHygiene);
      window.removeEventListener('spotlight-close-hygiene', handleCloseHygiene);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(parseInt(event.active.id as string));
    hapticFeedback();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (over) {
      const leadId = parseInt(active.id as string);
      const newStatus = over.id as LeadStatus;
      
      const lead = leads.find(l => l.id === leadId);
      if (lead && lead.status !== newStatus) {
        setLeads(leads.map(l => 
          l.id === leadId ? { ...l, status: newStatus } : l
        ));
        
        if (newStatus === 'sold' || newStatus === 'delivered') {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#1CAF3F', '#1A4FB1', '#ffffff']
          });
          toast.success("Deal Funded! 🎉", {
            description: "Great job closing the deal. Time to celebrate!",
          });

          setTimeout(() => {
            if (lead.recentSentiments?.includes('negative')) {
              toast.error("Google Review Gate: Negative Sentiment", {
                description: "Customer had friction. Routed to GM for a follow-up call instead of sending review link.",
              });
            } else {
              toast.success("Google Review Gate: Link Sent", {
                description: "Customer had positive sentiment. Automated Google Review request sent via SMS.",
              });
            }
          }, 2000);
        }
        
        hapticFeedback();
      }
    }
  };

  const activeLead = activeId ? leads.find(l => l.id === activeId) : null;
  const columns = useMemo(() => COLUMNS, []);
  const highFrictionCount = leads.filter(l => l.frictionDensity === 'high').length;

  return (
    <PullToRefresh onRefresh={async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Pipeline refreshed!");
    }}>
    <div className="p-4 md:p-8 max-w-full mx-auto space-y-6 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <ScrollReveal>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2" data-tour="tour-crm">
              Sales Pipeline <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20"><Sparkles className="h-3 w-3 mr-1" /> AI Scored</Badge>
              <Button variant="outline" size="sm" className="ml-2 h-8 text-xs bg-white dark:bg-slate-950" onClick={() => window.dispatchEvent(new Event('start-spotlight-tour'))}>
                <Play className="h-3 w-3 mr-1" /> Take the tour
              </Button>
            </h1>
          </ScrollReveal>

          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              <Button 
                variant={view === 'kanban' ? 'default' : 'ghost'} 
                size="sm" 
                className={`h-7 px-3 text-xs ${view === 'kanban' ? 'shadow-sm' : ''}`}
                onClick={() => setView('kanban')}
              >
                Kanban
              </Button>
              <Button 
                variant={view === 'table' ? 'default' : 'ghost'} 
                size="sm" 
                className={`h-7 px-3 text-xs ${view === 'table' ? 'shadow-sm' : ''}`}
                onClick={() => setView('table')}
              >
                Table
              </Button>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <Label className="text-[10px] font-bold uppercase text-slate-500 whitespace-nowrap">Mood Filter:</Label>
              <Select value={sentimentFilter} onValueChange={(val: any) => setSentimentFilter(val)}>
                <SelectTrigger className="h-7 w-[110px] text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Moods</SelectItem>
                  <SelectItem value="positive" className="text-emerald-600">Positive</SelectItem>
                  <SelectItem value="neutral" className="text-amber-600">Neutral</SelectItem>
                  <SelectItem value="negative" className="text-rose-600 font-bold">Negative ⚠️</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <Label className="text-[10px] font-bold uppercase text-slate-500 whitespace-nowrap">Friction Filter:</Label>
              <Select value={frictionFilter} onValueChange={(val: any) => setFrictionFilter(val)}>
                <SelectTrigger className="h-7 w-[110px] text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Friction</SelectItem>
                  <SelectItem value="high" className="text-red-600 font-bold">High Friction</SelectItem>
                  <SelectItem value="medium" className="text-amber-600">Medium Friction</SelectItem>
                  <SelectItem value="low" className="text-blue-600">Low Friction</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <Link to="/crm/workflows" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              <FastForward className="h-3 w-3" />
              Manage Drip Campaigns
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none bg-white dark:bg-slate-900 h-10" onClick={() => {
            toast.success("Smart Price Drop Alerts Sent", { description: "Push notifications sent to 14 leads who viewed vehicles that just had a price reduction." });
            hapticFeedback();
          }}>
            <Activity className="h-4 w-4 mr-2 text-emerald-500" />
            Price Drop Alerts
          </Button>
          <Button 
            className="flex-1 md:flex-none bg-primary hover:bg-primary/90 text-white h-10 shadow-lg shadow-primary/20"
            onClick={() => setShowNewLeadModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Lead
          </Button>
          <Button variant="outline" className="flex-1 md:flex-none bg-white dark:bg-slate-900 h-10" onClick={() => {
            toast.promise(
              new Promise((resolve) => setTimeout(resolve, 1500)),
              {
                loading: 'Connecting to API...',
                success: () => {
                  setLeads(prev => [
                    { id: Date.now(), name: "Alex Johnson (API Sync)", vehicle: "2024 Honda Accord", score: 82, status: "new", activity: "Synced from LeadConnector", recentSentiments: ['neutral', 'positive'] },
                    ...prev
                  ]);
                  return 'Synced new leads!';
                },
                error: 'Failed to sync leads'
              }
            );
          }}>
            <Database className="h-4 w-4 mr-2" />
            Sync
          </Button>
          <Button data-tour-id="simulate-lead-btn" variant="outline" className="flex-1 md:flex-none bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20 h-10" onClick={() => {
            hapticFeedback();
            toast.success("Live Lead Dropped!", {
              description: "New internet lead from cars.com just arrived.",
              icon: <Zap className="h-4 w-4 text-emerald-500" />
            });
            setLeads(prev => [
              { id: Date.now(), name: "John Smith (Live)", vehicle: "2024 Toyota Tacoma", score: 95, status: "new", activity: "Requested ePrice via Cars.com", lastContact: "Just now", lastAction: 'email', isOnline: true, recentSentiments: ['neutral'] },
              ...prev
            ]);
          }}>
            <Zap className="h-4 w-4 mr-2" />
            Simulate Lead
          </Button>
          <Button variant="outline" className="flex-1 md:flex-none bg-white dark:bg-slate-900 h-10 hidden sm:flex" onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv,.xlsx';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                  const text = e.target?.result as string;
                  const lines = text.split('\n').filter(l => l.trim().length > 0);
                  const firstLine = lines[0] || "";
                  const headers = firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                  const dataRows = lines.slice(1).map(line => line.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')));
                  setCsvHeaders(headers);
                  setCsvData(dataRows);
                  setShowMapping(true);
                };
                reader.readAsText(file);
              }
            };
            input.click();
          }}>
            <FileText className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" className="flex-1 md:flex-none bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 h-10 hidden sm:flex" onClick={() => {
            toast.success("Equity Mining Complete", { description: "Found 24 past buyers with positive equity. Upgrade emails sent!" });
            hapticFeedback();
          }}>
            <Database className="h-4 w-4 mr-2" />
            Equity Mining
          </Button>
          <Button data-tour-id="tour-data-hygiene" variant="outline" className="flex-1 md:flex-none bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20 h-10 hidden sm:flex" onClick={() => setShowHygieneModal(true)}>
            <ShieldCheck className="h-4 w-4 mr-2" />
            Data Hygiene
          </Button>
          <Button 
            className="flex-1 md:flex-none bg-primary hover:bg-primary/90 text-white h-10 shadow-lg shadow-primary/20"
            onClick={() => {
              toast.info("Recording voice log...", {
                description: "AI is listening and transcribing your notes...",
                duration: 4000,
                icon: <Mic className="h-4 w-4 text-primary animate-pulse" />
              });
              setTimeout(() => {
                toast.success("Voice log transcribed!", {
                  description: "'Customer wants to see the F-150 in Blue tomorrow at 2 PM.'",
                });
              }, 4500);
            }}
          >
            <Mic className="h-4 w-4 mr-2" />
            Voice Log
          </Button>
        </div>
      </div>

      {highFrictionCount > 0 && (
        <div className="p-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h4 className="font-bold text-red-800 dark:text-red-300">Manager Alert: High Friction Deals</h4>
              <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">
                <span className="font-bold">{highFrictionCount}</span> active deals are showing signs of stalling or negative sentiment.
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="shrink-0 bg-white dark:bg-slate-950 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 w-full sm:w-auto"
            onClick={() => setFrictionFilter("high")}
          >
            Review Deals Now
          </Button>
        </div>
      )}

      {view === 'kanban' ? (
        <div data-tour-id="tour-crm-board">
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 overflow-x-auto pb-6 snap-x min-h-[600px] scrollbar-hide -mx-4 px-4" data-tour="tour-pipeline" data-tour-id="tour-pipeline">
              {columns.map(column => (
                <DroppableColumn 
                  key={column.id} 
                  column={column} 
                  leads={filteredLeads.filter(l => l.status === column.id)}
                  onLeadClick={(lead) => setSelectedLead(lead)}
                />
              ))}
            </div>

            <DragOverlay>
              {activeLead ? <LeadCard lead={activeLead} isOverlay /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-4 py-3">Lead Name</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Recent Activity</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedLead(lead)}>
                    <td className="px-4 py-3 font-medium text-foreground flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={lead.avatar} />
                        <AvatarFallback>{lead.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {lead.name}
                      {lead.frictionDensity && lead.frictionDensity !== 'low' && (
                        <AlertTriangle className={`h-3 w-3 ${lead.frictionDensity === 'high' ? 'text-red-500' : 'text-amber-500'}`} />
                      )}
                    </td>
                    <td className="px-4 py-3">{lead.vehicle}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="capitalize">{lead.status.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="font-bold">{lead.score}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">{lead.activity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-2xl">
          {selectedLead && (
            <div className="flex flex-col max-h-[90vh]">
              <div className="p-6 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-white dark:border-slate-800 shadow-md">
                      <AvatarImage src={selectedLead.avatar || `https://i.pravatar.cc/150?u=${selectedLead.name}`} />
                      <AvatarFallback>{selectedLead.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">{selectedLead.name}</DialogTitle>
                      <DialogDescription className="text-base font-medium text-primary mt-0.5">{selectedLead.vehicle}</DialogDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className={`h-8 px-3 font-bold flex items-center gap-1.5 ${selectedLead.score > 80 ? "text-success border-success/30 bg-success/5" : "text-amber-600 border-amber-500/30 bg-amber-500/5"}`}>
                    <Sparkles className="h-3.5 w-3.5" />
                    AI Score: {selectedLead.score}
                  </Badge>
                </div>
                <div className="mt-4 flex items-center gap-2 p-2.5 bg-primary/5 border border-primary/10 rounded-xl">
                  <Activity className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    <span className="font-bold text-primary">AI Insight:</span> Customer has viewed the VDP 4 times in the last 2 hours. High purchase probability.
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="grid w-full grid-cols-5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
                    <TabsTrigger value="details" className="rounded-lg text-xs">Details</TabsTrigger>
                    <TabsTrigger value="activity" className="rounded-lg text-xs">Activity</TabsTrigger>
                    <TabsTrigger value="journey" className="rounded-lg text-xs">Journey</TabsTrigger>
                    <TabsTrigger value="calls" className="rounded-lg text-xs">Calls (AI)</TabsTrigger>
                    <TabsTrigger value="campaigns" className="rounded-lg text-xs">Drip</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="details" className="space-y-6 mt-0">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Current Status</p>
                        <Badge variant="secondary" className="capitalize px-3 py-1 text-sm font-semibold">
                          {selectedLead.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Lead Source</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Website VDP</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Contact Information</h4>
                      <div className="grid gap-3">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
                            <Phone className="h-4 w-4" />
                          </div>
                          <span className="font-bold text-slate-700 dark:text-slate-300">(555) 123-4567</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-slate-600">
                            <Mail className="h-4 w-4" />
                          </div>
                          <span className="font-bold text-slate-700 dark:text-slate-300 truncate">{selectedLead.name.toLowerCase().replace(' ', '.')}@example.com</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row gap-3">
                      <Button className="flex-1 h-12 text-lg shadow-md shadow-primary/20" variant="default" asChild>
                        <Link to={`/?customerName=${encodeURIComponent(selectedLead.name)}&vehicle=${encodeURIComponent(selectedLead.vehicle)}`}>
                          <Calculator className="h-5 w-5 mr-2" />
                          Desk Deal
                        </Link>
                      </Button>
                      <Button className="flex-1 h-12 text-lg" variant="secondary" asChild>
                        <Link to={`/crm/customer/${selectedLead.id}`}>
                          <UserCircle className="h-5 w-5 mr-2" />
                          Profile
                        </Link>
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="journey" className="mt-0">
                    <div className="space-y-0 relative before:absolute before:inset-0 before:left-4 before:h-full before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                      {[
                        { step: "Lead Captured", date: "2 days ago", desc: "Facebook Marketplace Inquiry", status: "completed", icon: Sparkles },
                        { step: "Initial Contact", date: "Yesterday, 9:00 AM", desc: "Phone call - Discussed 2024 SUV", status: "completed", icon: Phone },
                        { step: "Appointment Set", date: "Yesterday, 10:15 AM", desc: "Set for Saturday at 11:00 AM", status: "completed", icon: Calendar },
                        { step: "Test Drive", date: "Pending", desc: "Scheduled for Saturday", status: "current", icon: Car },
                        { step: "Deal Proposal", date: "TBD", desc: "Awaiting test drive completion", status: "upcoming", icon: Calculator },
                        { step: "Closed / Won", date: "TBD", desc: "Final delivery and funding", status: "upcoming", icon: CheckCircle2 }
                      ].map((item, idx) => (
                        <div key={idx} className="relative pl-10 pb-6 last:pb-0">
                          <div className={`absolute left-0 top-1 w-8 h-8 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center z-10 
                            ${item.status === 'completed' ? 'bg-emerald-500 text-white' : item.status === 'current' ? 'bg-primary text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                            <item.icon className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <div className="flex items-center justify-between">
                              <p className={`text-sm font-bold ${item.status === 'upcoming' ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>{item.step}</p>
                              <span className="text-[10px] font-medium text-slate-500">{item.date}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="activity" className="space-y-6 mt-0">
                    <div className="space-y-6">
                      <div className="flex gap-4">
                        <div className="mt-0.5 bg-primary/10 p-2.5 rounded-xl h-fit shadow-sm">
                          <Sparkles className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{selectedLead.activity}</p>
                          <p className="text-xs text-slate-500 mt-1.5 font-medium">Today, 2:30 PM</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="mt-0.5 bg-slate-100 dark:bg-slate-800 p-2.5 rounded-xl h-fit">
                          <Mail className="h-5 w-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Automated follow-up email sent</p>
                          <p className="text-xs text-slate-500 mt-1.5 font-medium">Yesterday, 10:15 AM</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="mt-0.5 bg-slate-100 dark:bg-slate-800 p-2.5 rounded-xl h-fit">
                          <CheckCircle2 className="h-5 w-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Lead created</p>
                          <p className="text-xs text-slate-500 mt-1.5 font-medium">2 days ago</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="calls" className="mt-0">
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                              <Phone className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-bold">Outbound Call</p>
                              <p className="text-xs text-slate-500">Yesterday, 2:15 PM • 4m 12s</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-primary/10 text-primary">AI Summarized</Badge>
                        </div>
                        <div className="space-y-3">
                          <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                            <p className="text-xs font-bold text-slate-500 mb-1 uppercase">AI Summary</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300">Customer is very interested in the F-150. Mentioned they are cross-shopping with a Silverado. Needs to check with spouse tonight. Scheduled follow-up for tomorrow morning.</p>
                          </div>
                          <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                            <p className="text-xs font-bold text-slate-500 mb-1 uppercase">Key Action Items</p>
                            <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-300 space-y-1">
                              <li>Send comparative specs (F-150 vs Silverado)</li>
                              <li>Call tomorrow at 10 AM</li>
                            </ul>
                          </div>
                          <Button variant="outline" className="w-full text-xs h-8 bg-white dark:bg-slate-900"><PlayCircle className="h-3 w-3 mr-2" /> Play Recording & View Full Transcript</Button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="campaigns" className="mt-0">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold">Active Sequences</h4>
                        <Button size="sm" className="h-8"><Plus className="h-3 w-3 mr-1" /> Enroll</Button>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
                            <FastForward className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold">Aggressive Follow-up (Trucks)</p>
                            <p className="text-xs text-slate-500">Step 2 of 5 • Next: SMS tomorrow</p>
                          </div>
                        </div>
                        <Badge className="bg-emerald-500 text-white border-transparent">Active</Badge>
                      </div>
                      
                      <div className="mt-6">
                        <h4 className="text-sm font-bold mb-3">Available Drip Campaigns</h4>
                        <div className="grid gap-2">
                          {["Holiday Sales Event", "Long-term Nurture", "Post-Test Drive", "Lost Deal Revival"].map(camp => (
                            <div key={camp} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg">
                              <span className="text-sm font-medium">{camp}</span>
                              <Button variant="ghost" size="sm" className="h-7 text-xs">Preview</Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                <Button variant="outline" className="w-full h-11 rounded-xl" onClick={() => setSelectedLead(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showMapping} onOpenChange={setShowMapping}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Map CSV Columns</DialogTitle>
            <DialogDescription>
              Match the columns from your imported file.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {[
              { id: "name", label: "Full Name", required: true },
              { id: "vehicle", label: "Vehicle of Interest", required: true },
              { id: "score", label: "Lead Score", required: false },
            ].map(field => (
              <div key={field.id} className="grid grid-cols-2 gap-4 items-center">
                <Label className="text-right font-bold text-sm">
                  {field.label} {field.required && <span className="text-destructive">*</span>}
                </Label>
                <Select
                  value={fieldMapping[field.id] || ""}
                  onValueChange={(val) => setFieldMapping((prev: any) => ({ ...prev, [field.id]: val }))}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Column" />
                  </SelectTrigger>
                  <SelectContent>
                    {csvHeaders.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMapping(false)}>Cancel</Button>
            <Button 
              disabled={isImporting || !fieldMapping.name || !fieldMapping.vehicle}
              onClick={() => {
                const nameIdx = csvHeaders.indexOf(fieldMapping.name);
                const vehicleIdx = csvHeaders.indexOf(fieldMapping.vehicle);
                const scoreIdx = fieldMapping.score ? csvHeaders.indexOf(fieldMapping.score) : -1;
                const newLeads: Lead[] = csvData.map((row, i) => ({
                  id: Date.now() + i,
                  name: row[nameIdx] || "Unknown",
                  vehicle: row[vehicleIdx] || "Unknown Vehicle",
                  score: scoreIdx >= 0 && row[scoreIdx] ? parseInt(row[scoreIdx]) : 50,
                  status: "new",
                  activity: "Imported via CSV",
                  recentSentiments: ['neutral']
                }));
                const duplicates = newLeads.filter(nl => leads.some(existing => existing.name.toLowerCase() === nl.name.toLowerCase()));
                if (duplicates.length > 0) {
                  setPendingLeads(newLeads);
                  setDuplicatesCount(duplicates.length);
                  setShowDuplicatesPrompt(true);
                  setShowMapping(false);
                } else {
                  setIsImporting(true);
                  setTimeout(() => {
                    setLeads(prev => [...newLeads, ...prev]);
                    setIsImporting(false);
                    setShowMapping(false);
                    setFieldMapping({});
                    toast.success(`Imported ${newLeads.length} leads!`);
                  }, 1000);
                }
              }}
            >
              {isImporting ? "Importing..." : "Import Leads"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDuplicatesPrompt} onOpenChange={setShowDuplicatesPrompt}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Duplicates Detected</DialogTitle>
            <DialogDescription>
              We found {duplicatesCount} lead(s) in your import that already exist.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto"
              onClick={() => {
                setIsImporting(true);
                setTimeout(() => {
                  const uniqueLeads = pendingLeads.filter(nl => !leads.some(existing => existing.name.toLowerCase() === nl.name.toLowerCase()));
                  setLeads(prev => [...uniqueLeads, ...prev]);
                  setIsImporting(false);
                  setShowDuplicatesPrompt(false);
                  setFieldMapping({});
                  toast.success(`Imported ${uniqueLeads.length} new leads.`);
                }, 1000);
              }}
            >
              Skip Duplicates
            </Button>
            <Button 
              className="w-full sm:w-auto"
              onClick={() => {
                setIsImporting(true);
                setTimeout(() => {
                  setLeads(prev => [...pendingLeads, ...prev]);
                  setIsImporting(false);
                  setShowDuplicatesPrompt(false);
                  setFieldMapping({});
                  toast.success(`Imported all ${pendingLeads.length} leads.`);
                }, 1000);
              }}
            >
              Import All Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showHygieneModal} onOpenChange={setShowHygieneModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Weekly Duplicate Scan</DialogTitle>
            <DialogDescription>
              Our AI automatically scans your CRM weekly for potential duplicate records.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {potentialDuplicates.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <ShieldCheck className="h-12 w-12 mx-auto text-emerald-500 mb-3 opacity-50" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">Your CRM is clean!</p>
                <p className="text-sm">No duplicates found in the latest scan.</p>
              </div>
            ) : (
              potentialDuplicates.map((dup, idx) => (
                <div key={idx} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                      {dup.reason}
                    </Badge>
                    <span className="text-xs text-slate-500">Detected recently</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                      <p className="font-bold text-sm truncate">{dup.lead1.name}</p>
                      <p className="text-xs text-slate-500 mt-1">Status: {dup.lead1.status.replace('_', ' ')}</p>
                      <p className="text-xs text-slate-500">Score: {dup.lead1.score}</p>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                      <p className="font-bold text-sm truncate">{dup.lead2.name}</p>
                      <p className="text-xs text-slate-500 mt-1">Status: {dup.lead2.status.replace('_', ' ')}</p>
                      <p className="text-xs text-slate-500">Score: {dup.lead2.score}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => {
                      setLeads(prev => {
                        const updated = [...prev];
                        const primaryIdx = updated.findIndex(l => l.id === dup.lead1.id);
                        const secondaryIdx = updated.findIndex(l => l.id === dup.lead2.id);
                        if (primaryIdx > -1 && secondaryIdx > -1) {
                          updated[primaryIdx] = {
                            ...updated[primaryIdx],
                            activity: `${updated[primaryIdx].activity} | ${updated[secondaryIdx].activity}`,
                            score: Math.max(updated[primaryIdx].score, updated[secondaryIdx].score),
                            lastContact: "Just now (Merged)"
                          };
                          updated.splice(secondaryIdx, 1);
                        }
                        return updated;
                      });
                      toast.success(`Merged duplicates for ${dup.lead1.name}`, {
                        description: "Combined conversation history, activities, and lead scores."
                      });
                    }} data-tour-id="tour-merge-leads">
                      Merge Records
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                      toast.info("Dismissed suggestion");
                    }}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHygieneModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewLeadModal} onOpenChange={setShowNewLeadModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>
              Enter the details of the new prospective buyer.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                placeholder="John Doe" 
                value={newLeadForm.name}
                onChange={e => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input 
                id="phone" 
                placeholder="(555) 123-4567" 
                value={newLeadForm.phone}
                onChange={e => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="john@example.com" 
                value={newLeadForm.email}
                onChange={e => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2 relative">
              <Label htmlFor="vehicle">Vehicle of Interest</Label>
              <Input 
                id="vehicle" 
                placeholder="2024 Toyota Tacoma" 
                value={newLeadForm.vehicle}
                onChange={e => {
                  setNewLeadForm({ ...newLeadForm, vehicle: e.target.value });
                  setShowVehicleSuggestions(true);
                }}
                onFocus={() => setShowVehicleSuggestions(true)}
                onBlur={() => setTimeout(() => setShowVehicleSuggestions(false), 200)}
                autoComplete="off"
              />
              {/* Force reload */ showVehicleSuggestions && newLeadForm.vehicle && filteredInventory.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg z-50 overflow-hidden">
                  {filteredInventory.map((v: any) => (
                    <div 
                      key={v.id} 
                      className="px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex justify-between items-center"
                      onClick={() => {
                        setNewLeadForm({ ...newLeadForm, vehicle: `${v.year} ${v.make} ${v.model}` });
                        setShowVehicleSuggestions(false);
                      }}
                    >
                      <span className="font-medium text-slate-700 dark:text-slate-300">{v.year} {v.make} {v.model}</span>
                      <span className="text-xs text-slate-500">Stock: {v.stockNumber || v.stock || 'N/A'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {duplicateWarning && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-2 flex items-start gap-3">
              <div className="bg-amber-100 dark:bg-amber-900/50 p-1.5 rounded-full text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Duplicate Detected</h4>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  A lead with similar details already exists: <span className="font-bold">{duplicateWarning.name}</span> 
                  (Status: {duplicateWarning.status.replace('_', ' ')}).
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => setShowNewLeadModal(false)}>
              Cancel
            </Button>
            <div className="flex gap-2">
              {duplicateWarning && (
                <Button type="button" variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => {
                  toast.info(`Opened existing lead: ${duplicateWarning.name}`);
                  setShowNewLeadModal(false);
                  setSelectedLead(duplicateWarning);
                }}>
                  View Existing
                </Button>
              )}
              <Button type="button" variant={duplicateWarning ? "destructive" : "default"} onClick={() => {
                if (!newLeadForm.name) {
                  toast.error("Name is required");
                  return;
                }
                const newLead: Lead = {
                  id: Date.now(),
                  name: newLeadForm.name,
                  phone: newLeadForm.phone,
                  email: newLeadForm.email,
                  vehicle: newLeadForm.vehicle || "Undecided",
                  score: Math.floor(Math.random() * 40) + 50, // 50-90 score
                  status: "new",
                  activity: "Manually Added",
                  lastContact: "Just now",
                  lastAction: "phone",
                  recentSentiments: ['neutral']
                };
                setLeads(prev => [newLead, ...prev]);
                setShowNewLeadModal(false);
                setNewLeadForm({ name: '', phone: '', email: '', vehicle: '' });
                toast.success(duplicateWarning ? "Lead added as duplicate!" : "Lead Saved Successfully!", {
                  description: `AI: Routed to Sarah Jenkins based on 92% close rate for ${newLeadForm.vehicle || 'this segment'}.`,
                  icon: <Brain className="h-4 w-4 text-primary" />
                });
                hapticFeedback();
              }}>
                {duplicateWarning ? "Save Anyway" : "Save Lead"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PullToRefresh>
  );
}
