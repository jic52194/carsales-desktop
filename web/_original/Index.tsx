import React, { useState, useMemo, useRef, useEffect } from "react";
import { loadInventory, vImage } from "@/lib/inventory";
import SignatureCanvas from "react-signature-canvas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Separator } from "../components/ui/separator";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { calculateDeal, DealParameters, formatCurrency } from "@/lib/calculations";
import { Calculator, Car, DollarSign, FileText, Printer, Settings2, Search, Save, User, Briefcase, History, Pen, Download, Share2, Copy, Check, Maximize2, Minimize2, Plus, X, ShieldCheck, Sparkles, Activity, BrainCircuit, PieChart as PieChartIcon } from "lucide-react";
import html2canvas from "html2canvas";
import { DealForms } from "../components/DealForms";
import { jsPDF } from "jspdf";
import confetti from "canvas-confetti";
import { Link, useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Slider } from "../components/ui/slider";
import { toast } from "sonner";
import { hapticFeedback } from "@/lib/haptics";

interface SavedDeal {
  id: string;
  date: string;
  customerName: string;
  vehicle: string;
  frontEndGross: number;
  backEndGross: number;
  totalGross: number;
  params: DealParameters;
}

const MOCK_INVENTORY = [
  { id: "v1", year: 2024, make: "Luxury", model: "SUV", vin: "4T1B1111111111111", price: 42500, cost: 38500, nadaRetail: 44000, nadaTrade: 36000, image: "https://vibe.filesafe.space/1778548756560730619/assets/23a6659c-d8fc-4cc7-b123-9979f0ad8d10.png" },
  { id: "v2", year: 2024, make: "Family", model: "Sedan", vin: "1FTF2222222222222", price: 28900, cost: 24000, nadaRetail: 30000, nadaTrade: 22000, image: "https://vibe.filesafe.space/1778548756560730619/assets/c6f562ab-1752-4862-aed2-588f83eff966.png" },
  { id: "v3", year: 2022, make: "Electric", model: "Hatch", vin: "5J6R3333333333333", price: 31500, cost: 28000, nadaRetail: 33000, nadaTrade: 26000, image: "https://vibe.filesafe.space/1778548756560730619/assets/8d95f6e9-8c71-44f9-ae90-24f835422693.png" },
  { id: "v4", year: 2020, make: "Rugged", model: "Truck", vin: "5YJ34444444444444", price: 38200, cost: 34000, nadaRetail: 40000, nadaTrade: 32000, image: "https://vibe.filesafe.space/1778548756560730619/assets/6b6b649f-65d2-4a8b-8d9e-877e5f1c4fe7.png" },
  { id: "v5", year: 2023, make: "Premium", model: "EV", vin: "1N4BL111111111111", price: 52000, cost: 48000, nadaRetail: 54000, nadaTrade: 45000, image: "https://vibe.filesafe.space/1778548756560730619/assets/c9058bfb-e16c-4a65-8c16-28cd3937e3c1.jpg" },
  { id: "v6", year: 2021, make: "Sport", model: "Coupe", vin: "WBA11111111111111", price: 34500, cost: 29000, nadaRetail: 36000, nadaTrade: 27000, image: "https://vibe.filesafe.space/1778548756560730619/assets/cf401772-605e-4d64-b3d3-953608639b6f.jpg" },
  { id: "v7", year: 2021, make: "Adventure", model: "Jeep", vin: "1C4HJ111111111111", price: 29800, cost: 25000, nadaRetail: 31000, nadaTrade: 23000, image: "https://vibe.filesafe.space/1778548756560730619/assets/d1a63a09-19a2-4e19-8f6d-d94af42ce648.jpg" },
];

const MOCK_CUSTOMERS = [
  { id: "c1", name: "Sarah Jenkins", phone: "(555) 123-4567", email: "sarah.j@example.com" },
  { id: "c2", name: "Mike Ross", phone: "(555) 987-6543", email: "mike.ross@example.com" },
  { id: "c3", name: "David Chen", phone: "(555) 555-0000", email: "d.chen@example.com" },
  { id: "c4", name: "Emily Blunt", phone: "(555) 222-3333", email: "emily.b@example.com" },
  { id: "c5", name: "John Doe", phone: "(555) 444-5555", email: "j.doe@example.com" },
];

const MOCK_OPPORTUNITIES = [
  { id: "o1", name: "John Doe - 2024 Camry", stage: "Negotiation" },
  { id: "o2", name: "Jane Smith - F-150", stage: "New Lead" },
  { id: "o3", name: "Acme Corp - Fleet Purchase", stage: "Proposal" },
];

export default function Index() {
  const location = useLocation();
  // Signature State
  const sigCanvas = useRef<any>(null);
  const [activeSigTarget, setActiveSigTarget] = useState<'proposal' | 'foursquare' | 'fimenu' | 'desking' | null>(null);
  const [signatures, setSignatures] = useState({
    proposal: null as string | null,
    foursquare: null as string | null,
    fimenu: null as string | null,
    desking: null as string | null,
  });

  const handleAcceptSignature = () => {
    if (sigCanvas.current?.isEmpty()) {
      toast.error("Please provide a signature.");
      return;
    }
    const dataUrl = sigCanvas.current?.getTrimmedCanvas().toDataURL("image/png");
    if (activeSigTarget) {
      setSignatures(prev => ({ ...prev, [activeSigTarget]: dataUrl }));
    }
    setActiveSigTarget(null);
  };

  // Initial State
  const [activeTab, setActiveTab] = useState("active");
  const [activeDealTab, setActiveDealTab] = useState("deal");

  const [isDefaultsOpen, setIsDefaultsOpen] = useState(false);
  
  const defaultParams: DealParameters = useMemo(() => {
    const saved = localStorage.getItem('vibe_deal_defaults');
    if (saved) return JSON.parse(saved);
    return {
      sellingPrice: 35000,
      vehicleCost: 32000,
      pack: 2000,
      nadaRetail: 36000,
      tradeAllowance: 0,
      tradePayoff: 0,
      tradeActualCashValue: 0,
      nadaTrade: 0,
      cashDown: 2000,
      docFee: 695,
      taxRate: 6.25,
      nonTaxableFees: 135,
      warrantyRetail: 0,
      warrantyCost: 0,
      gapRetail: 0,
      gapCost: 0,
      maintenanceRetail: 0,
      maintenanceCost: 0,
      termMonths: 72,
      apr: 5.99,
      bankFee: 0,
      dealerReserve: 0,
    };
  }, []);

  const [params, setParams] = useState<DealParameters>(defaultParams);

  const [customers, setCustomers] = useState(() => {
    const saved = localStorage.getItem('vibe_customers');
    return saved ? JSON.parse(saved) : MOCK_CUSTOMERS;
  });
  const [opportunities] = useState(() => {
    const saved = localStorage.getItem('vibe_opportunities');
    return saved ? JSON.parse(saved) : MOCK_OPPORTUNITIES;
  });
  const [inventory] = useState(() => {
    const list = loadInventory();
    if (!list.length) return MOCK_INVENTORY;
    return list.map((v) => ({
      id: v.id, year: v.year, make: v.make, model: `${v.model}${v.trim ? ' ' + v.trim : ''}`, vin: v.vin,
      price: v.price ?? 0, cost: v.cost ?? 0,
      nadaRetail: v.price ?? 0, nadaTrade: v.price ? Math.round(v.price * 0.85) : 0, // placeholders until a valuation API is connected
      image: vImage(v), stockNumber: v.stockNumber, mileage: v.mileage,
    }));
  });

  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [selectedOpportunity, setSelectedOpportunity] = useState<string>("");
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [savedDeals, setSavedDeals] = useState<SavedDeal[]>(() => {
    const saved = localStorage.getItem('vibe_saved_deals');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('vibe_saved_deals', JSON.stringify(savedDeals));
  }, [savedDeals]);
  const [selectedVehicleName, setSelectedVehicleName] = useState<string>("Custom Vehicle");
  const [selectedVehicleImage, setSelectedVehicleImage] = useState<string | null>(null);
  const [deskingTerms, setDeskingTerms] = useState<string[]>(["36", "48", "60", "72"]);
  const [deskingCashDowns, setDeskingCashDowns] = useState<string[]>(["0", "1000", "2000"]);
  const [deskingRates, setDeskingRates] = useState<string[]>(["5.99", "6.99", "7.99"]);
  const [deskingColType, setDeskingColType] = useState<"cashDown" | "apr">("cashDown");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const shareId = useMemo(() => Math.random().toString(36).substring(2, 9).toUpperCase(), [selectedCustomer, selectedVehicleName]);

  const [scenarios, setScenarios] = useState([
    { id: 1, name: 'Option A (Current)', cashDown: defaultParams.cashDown, termMonths: defaultParams.termMonths, apr: defaultParams.apr, tradeAllowance: defaultParams.tradeAllowance },
    { id: 2, name: 'Option B (More Down)', cashDown: defaultParams.cashDown + 2000, termMonths: defaultParams.termMonths, apr: defaultParams.apr, tradeAllowance: defaultParams.tradeAllowance },
    { id: 3, name: 'Option C (Shorter Term)', cashDown: defaultParams.cashDown, termMonths: 60, apr: 4.99, tradeAllowance: defaultParams.tradeAllowance },
  ]);

  const [targetProfit, setTargetProfit] = useState<number>(3000);
  const [adjustVariable, setAdjustVariable] = useState<string>("sellingPrice");

  const handleOptimizeProfit = () => {
    const backEndGross = params.docFee + params.nonTaxableFees + (params.warrantyRetail - params.warrantyCost) + (params.gapRetail - params.gapCost) + (params.maintenanceRetail - params.maintenanceCost) + params.bankFee + params.dealerReserve;
    
    if (adjustVariable === 'sellingPrice') {
      const newSellingPrice = targetProfit - backEndGross + params.vehicleCost + params.pack - params.tradeActualCashValue + params.tradeAllowance;
      setParams(prev => ({ ...prev, sellingPrice: newSellingPrice }));
      toast.success(`Selling price adjusted to ${formatCurrency(newSellingPrice)} to hit target profit`);
    } else if (adjustVariable === 'tradeAllowance') {
      const newTradeAllowance = params.tradeActualCashValue - (targetProfit - backEndGross - params.sellingPrice + params.vehicleCost + params.pack);
      setParams(prev => ({ ...prev, tradeAllowance: Math.max(0, newTradeAllowance) }));
      toast.success(`Trade allowance adjusted to ${formatCurrency(Math.max(0, newTradeAllowance))} to hit target profit`);
    }
  };

  useEffect(() => {
    setScenarios(prev => {
      const newScenarios = [...prev];
      newScenarios[0] = { ...newScenarios[0], cashDown: params.cashDown, termMonths: params.termMonths, apr: params.apr, tradeAllowance: params.tradeAllowance };
      return newScenarios;
    });
  }, [params.cashDown, params.termMonths, params.apr, params.tradeAllowance]);

  const updateScenario = (index: number, field: string, value: number) => {
    setScenarios(prev => {
      const newScenarios = [...prev];
      newScenarios[index] = { ...newScenarios[index], [field]: value };
      return newScenarios;
    });
  };

  // F&I Menu Defaults
  const [fiMenuNaming, setFiMenuNaming] = useState<"metals" | "gbb" | "protection">("metals");
  const fiNamingOptions = {
    metals: { aggressive: "Platinum", medium: "Gold", low: "Silver", base: "Bronze" },
    gbb: { aggressive: "Ultimate", medium: "Best", low: "Better", base: "Good" },
    protection: { aggressive: "Elite", medium: "Premium", low: "Standard", base: "Basic" }
  };

  const [fiMenuDefaults, setFiMenuDefaults] = useState({
    base: [],
    low: ["gap"],
    medium: ["gap", "maintenance"],
    aggressive: ["gap", "maintenance", "warranty"]
  });



  // Handle cross-module routing
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const customerName = searchParams.get('customerName');
    const vehicle = searchParams.get('vehicle');
    const dealId = searchParams.get('deal');
    
    if (dealId) {
      const dealToLoad = savedDeals.find((d: any) => d.id === dealId);
      if (dealToLoad) {
        setParams(dealToLoad.params);
        setSelectedVehicleName(dealToLoad.vehicle);
        const customer = customers.find((c: any) => c.name === dealToLoad.customerName);
        if (customer) setSelectedCustomer(customer.id);
        setActiveTab("active");
      }
    } else {
      if (customerName) {
        const existing = customers.find((c: any) => c.name === customerName);
        if (existing) {
          setSelectedCustomer(existing.id);
        } else {
          const newId = `c${Date.now()}`;
          const newCustomer = { id: newId, name: customerName, phone: "" };
          const newCustomers = [...customers, newCustomer];
          setCustomers(newCustomers);
          localStorage.setItem('vibe_customers', JSON.stringify(newCustomers));
          setSelectedCustomer(newId);
        }
      }
      
      if (vehicle) {
        setSelectedVehicleName(vehicle);
      }
    }
  }, [location.search]);

  const handleVehicleSelect = (vehicle: typeof MOCK_INVENTORY[0]) => {
    setParams(prev => ({
      ...prev,
      sellingPrice: vehicle.price,
      vehicleCost: vehicle.cost,
      nadaRetail: vehicle.nadaRetail,
    }));
    setSelectedVehicleName(`${vehicle.year} ${vehicle.make} ${vehicle.model}`);
    setSelectedVehicleImage(vehicle.image);
    setIsInventoryOpen(false);
    toast.success(`Selected ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setParams((prev) => ({
      ...prev,
      [name]: parseFloat(value) || 0,
    }));
  };


  // Memoize calculations
  const results = useMemo(() => calculateDeal(params), [params]);

  const fiMenuOptions = useMemo(() => {
    const getTierParams = (tierProducts: string[]) => ({
      ...params,
      warrantyRetail: tierProducts.includes("warranty") ? (params.warrantyRetail || 2495) : 0,
      gapRetail: tierProducts.includes("gap") ? (params.gapRetail || 995) : 0,
      maintenanceRetail: tierProducts.includes("maintenance") ? (params.maintenanceRetail || 1295) : 0,
    });

    const getTierPrice = (tierProducts: string[]) => {
      let total = 0;
      if (tierProducts.includes("warranty")) total += (params.warrantyRetail || 2495);
      if (tierProducts.includes("gap")) total += (params.gapRetail || 995);
      if (tierProducts.includes("maintenance")) total += (params.maintenanceRetail || 1295);
      return total;
    };

    return {
      base: calculateDeal(getTierParams(fiMenuDefaults.base)),
      low: calculateDeal(getTierParams(fiMenuDefaults.low)),
      medium: calculateDeal(getTierParams(fiMenuDefaults.medium)),
      aggressive: calculateDeal(getTierParams(fiMenuDefaults.aggressive)),
      lowPrice: getTierPrice(fiMenuDefaults.low),
      mediumPrice: getTierPrice(fiMenuDefaults.medium),
      aggressivePrice: getTierPrice(fiMenuDefaults.aggressive),
    };
  }, [params, fiMenuDefaults]);

  const handleSaveDeal = () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer before saving.");
      return;
    }
    
    const customer = customers.find((c: any) => c.id === selectedCustomer);
    const newDeal: SavedDeal = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
      customerName: customer?.name || "Unknown",
      vehicle: selectedVehicleName,
      frontEndGross: results.frontEndGross,
      backEndGross: results.backEndGross,
      totalGross: results.totalGross,
      params: { ...params }
    };
    
    setSavedDeals(prev => [newDeal, ...prev]);
    hapticFeedback();
    toast.success("Deal saved successfully and attached to opportunity!");
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('presentation-view-capture');
    if (!element) return;
    
    // Find the currently active tab content within the capture area
    const activeContent = element.querySelector('[data-state="active"] > div, [data-state="active"] > .border-2') as HTMLElement;
    const targetElement = activeContent || element;
    
    try {
      toast.info("Generating PDF...");
      
      const canvas = await html2canvas(targetElement, { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Deal-${selectedCustomer || 'Proposal'}.pdf`);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate PDF");
    }
  };

  const handleLoadDeal = (deal: SavedDeal) => {
    setParams(deal.params);
    setSelectedVehicleName(deal.vehicle);
    const customer = customers.find((c: any) => c.name === deal.customerName);
    if (customer) setSelectedCustomer(customer.id);
    setActiveTab("active");
    toast.success("Deal loaded successfully");
  };

  const handleSaveDefaults = () => {
    localStorage.setItem('vibe_deal_defaults', JSON.stringify(params));
    setIsDefaultsOpen(false);
    toast.success("Current parameters saved as defaults");
  };

  useEffect(() => {
    if (isShareOpen) {
      localStorage.setItem(`shared_deal_${shareId}`, JSON.stringify({
        params,
        vehicleName: selectedVehicleName,
        customer: customers.find((c: any) => c.id === selectedCustomer)?.name || "Guest"
      }));
    }
  }, [isShareOpen, shareId, params, selectedVehicleName, selectedCustomer]);

  const handleSaveDealRef = useRef(handleSaveDeal);
  handleSaveDealRef.current = handleSaveDeal;

  useEffect(() => {
    const handleSave = () => handleSaveDealRef.current();
    const handleShare = () => setIsShareOpen(true);
    const handlePresentation = () => setIsPreviewOpen(true);
    
    const handleStoryDesking = () => {
      setActiveTab('presentation');
      setActiveDealTab('whatif');
      setParams(prev => ({ ...prev, cashDown: 5000, termMonths: 60 }));
      toast.success("Desking Optimized", { description: "AI adjusted term and down payment to fit budget." });
    };

    const handleStoryDealDone = () => {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      toast.success("Deal Done!", { description: `Total Gross: ${formatCurrency(results.totalGross)}` });
      handleSaveDealRef.current();
    };
    
    window.addEventListener('trigger-save-deal', handleSave);
    window.addEventListener('trigger-share-deal', handleShare);
    window.addEventListener('trigger-presentation', handlePresentation);
    window.addEventListener('story-trigger-desking', handleStoryDesking);
    window.addEventListener('story-trigger-deal-done', handleStoryDealDone);
    
    return () => {
      window.removeEventListener('trigger-save-deal', handleSave);
      window.removeEventListener('trigger-share-deal', handleShare);
      window.removeEventListener('trigger-presentation', handlePresentation);
      window.removeEventListener('story-trigger-desking', handleStoryDesking);
      window.removeEventListener('story-trigger-deal-done', handleStoryDealDone);
    };
  }, [results.totalGross]);


  // Helper for Array Inputs
  const ArrayInput = ({ label, values, setValues, isCurrency = false, isPercent = false }: { label: string, values: string[], setValues: (vals: string[]) => void, isCurrency?: boolean, isPercent?: boolean }) => (
    <div className="grid gap-2">
      <Label className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {values.map((val, idx) => (
          <div key={idx} className="relative flex items-center">
            {isCurrency && <span className="absolute left-2 text-slate-500 text-sm">$</span>}
            <Input 
              value={val} 
              onChange={(e) => {
                const newVals = [...values];
                newVals[idx] = e.target.value;
                setValues(newVals);
              }}
              className={`w-24 h-11 ${isCurrency ? 'pl-5' : ''} ${isPercent ? 'pr-9' : 'pr-7'} bg-white dark:bg-slate-950`}

            />
            {isPercent && <span className="absolute right-7 text-slate-500 text-sm">%</span>}
            {values.length > 1 && (
              <button 
                onClick={() => setValues(values.filter((_, i) => i !== idx))}
                className="absolute right-2 text-slate-400 hover:text-destructive bg-white dark:bg-slate-950 rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setValues([...values, ""])}
          className="h-10 w-10 shrink-0 bg-white dark:bg-slate-950"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // Helper for Input groups
  const NumberInput = ({ label, name, value, isCurrency = true, hasSlider = false, min = 0, max = 100000, step = 100 }: { label: string, name: keyof DealParameters, value: number, isCurrency?: boolean, hasSlider?: boolean, min?: number, max?: number, step?: number }) => (
    <div className="grid gap-3">
      <div className="flex justify-between items-center">
        <Label htmlFor={String(name)} className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide text-xs">
          {label}
        </Label>
        {hasSlider && (
          <span className="text-sm font-bold text-primary">
            {isCurrency ? formatCurrency(value) : (name === 'apr' ? `${value}%` : value)}
          </span>
        )}
      </div>
      <div className="relative">
        {isCurrency && !hasSlider && <span className="absolute left-3 top-2.5 text-slate-500">$</span>}
        {!isCurrency && name === 'apr' && !hasSlider && <span className="absolute right-3 top-2.5 text-slate-500">%</span>}
        {!hasSlider ? (
          <Input
            id={String(name)}
            name={String(name)}
            type="number"
            step="any"
            value={value || ''}
            onChange={handleInputChange}
            className={`${isCurrency ? 'pl-7' : ''} ${name === 'apr' ? 'pr-7' : ''} bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-primary shadow-sm h-11`}

          />
        ) : (
          <Slider
            min={min}
            max={max}
            step={step}
            value={[value]}
            onValueChange={(vals) => setParams(prev => ({ ...prev, [name]: vals[0] }))}
            className="py-2"
          />
        )}
      </div>
    </div>
  );

  return (
    <div className={`min-h-full bg-slate-50 dark:bg-slate-900 p-4 md:p-8 font-sans print:bg-white print:p-0 transition-all duration-300 ${isFocusMode ? 'fixed inset-0 z-50 bg-slate-100 dark:bg-slate-900 overflow-y-auto' : ''}`}>
      <div className="max-w-7xl mx-auto space-y-6 print:space-y-0 print:max-w-none print:w-full">
        
        {/* Header */}
        <div className="print:hidden mb-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            Deal Desking
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-sm hidden sm:flex">
              <BrainCircuit className="h-4 w-4 mr-1" /> AI Optimizer Active
            </Badge>
          </h1>
          <p className="text-slate-500 mt-1">Structure deals, compare financing options, and present proposals.</p>
        </div>
        <header className="print:hidden mb-4 hidden md:flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40">
              <div className="flex -space-x-2">
                <div className="h-7 w-7 rounded-full ring-2 ring-white dark:ring-slate-900 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm z-30" title="Mike Ross">MR</div>
                <div className="h-7 w-7 rounded-full ring-2 ring-white dark:ring-slate-900 bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm z-20" title="Sarah Jenkins">SJ</div>
                <div className="h-7 w-7 rounded-full ring-2 ring-white dark:ring-slate-900 bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm z-10" title="You">You</div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide whitespace-nowrap">Live Collab</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 items-center overflow-x-auto pb-2 w-full sm:w-auto snap-x scrollbar-hide no-scrollbar">
            <Button variant="outline" size="sm" asChild className="bg-primary/5 dark:bg-primary/10 border-primary/30 text-primary hover:bg-primary/10 dark:hover:bg-primary/20 hover:border-primary/50 whitespace-nowrap snap-start shrink-0 h-9 px-3.5 font-semibold rounded-lg shadow-sm transition-all active:translate-y-0.5">
              <Link to="/credit-app">
                <FileText className="mr-2 h-4 w-4" /> Credit App
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 whitespace-nowrap snap-start shrink-0 h-9 px-3.5 font-semibold rounded-lg shadow-sm transition-all active:translate-y-0.5" onClick={handleSaveDeal}>
              <Save className="mr-2 h-4 w-4" /> Save
            </Button>
            <Button variant="outline" size="sm" className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 whitespace-nowrap snap-start shrink-0 h-9 px-3.5 font-semibold rounded-lg shadow-sm transition-all active:translate-y-0.5" onClick={() => setIsShareOpen(true)}>
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
            <Dialog open={isDefaultsOpen} onOpenChange={setIsDefaultsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 whitespace-nowrap snap-start shrink-0 h-9 px-3.5 font-semibold rounded-lg shadow-sm transition-all active:translate-y-0.5">
                  <Settings2 className="mr-2 h-4 w-4" /> Defaults
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Set Default Deal Parameters</DialogTitle>
                  <DialogDescription>
                    Save the current deal parameters (Tax Rate, Doc Fee, APR, etc.) as the default for all new deals.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-sm text-slate-500 mb-4">Current values that will be saved:</p>
                  <ul className="text-sm space-y-2 mb-6 bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
                    <li><strong>Tax Rate:</strong> {params.taxRate}%</li>
                    <li><strong>Doc Fee:</strong> {formatCurrency(params.docFee)}</li>
                    <li><strong>Default APR:</strong> {params.apr}%</li>
                    <li><strong>Default Term:</strong> {params.termMonths} Months</li>
                  </ul>
                  <Button onClick={handleSaveDefaults} className="w-full">Save Current as Defaults</Button>
                </div>
              </DialogContent>
            </Dialog>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-amber-50 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/50 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/40 hover:border-amber-300 dark:hover:border-amber-700 whitespace-nowrap snap-start shrink-0 h-9 px-3.5 font-semibold rounded-lg shadow-sm transition-all active:translate-y-0.5"
                onClick={() => {
                  toast.success("Approval Requested", {
                    description: "Sent to Desk Manager via push notification.",
                    icon: <Check className="h-4 w-4" />
                  });
                  hapticFeedback();
                }}
              >
                <ShieldCheck className="mr-2 h-4 w-4" /> Request Approval
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 hover:border-emerald-300 dark:hover:border-emerald-700 whitespace-nowrap snap-start shrink-0 h-9 px-3.5 font-semibold rounded-lg shadow-sm transition-all active:translate-y-0.5"
                onClick={() => {
                  toast.success("Deal pushed to Deal Jacket!", {
                    description: `Assigned to ${customers.find((c: any) => c.id === selectedCustomer)?.name || 'Guest'} — Ready for F&I review.`,
                    icon: <Check className="h-4 w-4" />
                  });
                  hapticFeedback();
                }}
              >
                <Briefcase className="mr-2 h-4 w-4" /> Push to Deal Jacket
              </Button>
              <Button size="sm" onClick={() => {
                setIsPreviewOpen(true);
                fetch("https://backend.leadconnectorhq.com/external-tracking/events", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", version: "2021-07-28" },
                  body: JSON.stringify({
                    type: "demo_cta_click",
                    cta_label: "Presentation",
                    locationId: "HqAVJ0wdU05Vofq41aGB",
                    timestamp: Date.now(),
                  }),
                }).catch(() => {});
              }} className="bg-gradient-to-r from-primary to-primary/90 text-white shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 whitespace-nowrap snap-start shrink-0 h-9 px-4 font-bold rounded-lg border-b-2 border-primary-foreground/20 active:translate-y-0.5 transition-all">
                <Printer className="mr-2 h-4 w-4" /> Final Presentation
              </Button>
              <Button size="sm" onClick={() => {
                confetti({
                  particleCount: 150,
                  spread: 70,
                  origin: { y: 0.6 },
                  colors: ['#10b981', '#3b82f6', '#f59e0b']
                });
                toast.success("Deal Marked as Funded! 🎉", {
                  description: "Great job closing the deal."
                });
                hapticFeedback();
              }} className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md shadow-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/40 whitespace-nowrap snap-start shrink-0 h-9 px-4 font-bold rounded-lg border-b-2 border-emerald-700 active:translate-y-0.5 transition-all ml-2">
                <Check className="mr-2 h-4 w-4" /> Mark Funded
              </Button>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsFocusMode(!isFocusMode)} className="hidden md:flex text-slate-500">
            {isFocusMode ? <><Minimize2 className="mr-2 h-4 w-4" /> Exit Focus</> : <><Maximize2 className="mr-2 h-4 w-4" /> Focus Mode</>}
          </Button>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="print:hidden mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <TabsList className="bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-lg w-full md:w-auto grid grid-cols-2">
              <TabsTrigger value="active" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm">Active Deal</TabsTrigger>
              <TabsTrigger value="history" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm">Deal History</TabsTrigger>
            </TabsList>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto px-2 md:px-0">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <User className="h-4 w-4 text-slate-500" />
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger className="w-full sm:w-[200px] h-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 whitespace-nowrap overflow-hidden">
                    <SelectValue placeholder="Select Customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Briefcase className="h-4 w-4 text-slate-500" />
                <Select value={selectedOpportunity} onValueChange={setSelectedOpportunity}>
                  <SelectTrigger className="w-full sm:w-[220px] h-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Select Opportunity..." />
                  </SelectTrigger>
                  <SelectContent>
                    {opportunities.map((o: any) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <TabsContent value="active" className="mt-0 outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block">
              
              {/* Left Column - Inputs (Takes up 8 columns on large screens) */}
              <div className="lg:col-span-8 space-y-6 print:hidden">
            <Tabs value={activeDealTab} onValueChange={setActiveDealTab} className="w-full" data-tour-id="tour-desking">

              <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
                <TabsList className="inline-flex md:grid w-max md:w-full md:grid-cols-6 bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl">
                  <TabsTrigger value="deal" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm whitespace-nowrap">Vehicle & Trade</TabsTrigger>
                  <TabsTrigger value="finance" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm whitespace-nowrap">Terms & Fees</TabsTrigger>
                  <TabsTrigger value="desking" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm whitespace-nowrap">Desking</TabsTrigger>
                  <TabsTrigger value="compare" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm whitespace-nowrap">What-If</TabsTrigger>
                  <TabsTrigger value="addons" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm whitespace-nowrap">Back-End</TabsTrigger>
                  <TabsTrigger value="cost" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm whitespace-nowrap">Internal Cost</TabsTrigger>
                </TabsList>
              </div>
              
              {/* Vehicle & Trade Tab */}
              <TabsContent value="deal" className="mt-6 space-y-6">
                
                {/* Selected Vehicle Banner */}
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 md:gap-4">
                    {selectedVehicleImage ? (
                      <div className="h-12 w-16 md:h-16 md:w-24 bg-slate-200 dark:bg-slate-800 rounded-md overflow-hidden shrink-0 border border-slate-300 dark:border-slate-700">
                        <img src={selectedVehicleImage} alt={selectedVehicleName} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="bg-primary/20 p-2 md:p-3 rounded-full shrink-0">
                        <Car className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs md:text-sm text-slate-500 font-medium">Currently Working On</p>
                      <p className="font-bold text-slate-900 dark:text-white text-base md:text-xl leading-tight">{selectedVehicleName}</p>
                    </div>
                  </div>
                </div>

                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader className="bg-slate-100/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 gap-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Car className="h-5 w-5 text-primary" /> Vehicle Pricing
                    </CardTitle>
                    <Dialog open={isInventoryOpen} onOpenChange={setIsInventoryOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 bg-white dark:bg-slate-950 w-full sm:w-auto">
                          <Search className="h-4 w-4 mr-2" />
                          Search Inventory
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Search Inventory</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <Input placeholder="Search by Year, Make, Model, or VIN..." className="w-full" />
                          <div className="border rounded-md divide-y max-h-[300px] overflow-y-auto">
                            {inventory.map((vehicle: any) => (
                              <div 
                                key={vehicle.id} 
                                className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors" 
                                onClick={() => handleVehicleSelect(vehicle)}
                              >
                                <div className="flex items-center gap-4">
                                  <div className="h-12 w-16 bg-slate-100 rounded overflow-hidden shrink-0">
                                    <img src={vehicle.image} alt={vehicle.model} className="w-full h-full object-cover" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-900 dark:text-white">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                                    <p className="text-sm text-slate-500">VIN: {vehicle.vin}</p>
                                  </div>
                                </div>
                                <div className="text-right flex items-center gap-4">
                                  <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(vehicle.price)}</p>
                                  <Button variant="secondary" size="sm">Select</Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <NumberInput label="Selling Price" name="sellingPrice" value={params.sellingPrice} />
                    <NumberInput label="NADA Retail Value" name="nadaRetail" value={params.nadaRetail} />
                    <NumberInput label="Customer Cash Down" name="cashDown" value={params.cashDown} />
                    <NumberInput label="NADA Trade Value" name="nadaTrade" value={params.nadaTrade} />
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader className="bg-slate-100/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800">
                    <CardTitle className="text-lg">Trade-In Details</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <NumberInput label="Trade Allowance (Given to customer)" name="tradeAllowance" value={params.tradeAllowance} />
                    <NumberInput label="Trade Payoff (Owed to bank)" name="tradePayoff" value={params.tradePayoff} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Finance & Fees Tab */}
              <TabsContent value="finance" className="mt-6 space-y-6">
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader className="bg-slate-100/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800">
                    <CardTitle className="text-lg">Financing Terms</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <NumberInput label="Term (Months)" name="termMonths" value={params.termMonths} isCurrency={false} hasSlider min={12} max={84} step={12} />
                    <NumberInput label="APR (%)" name="apr" value={params.apr} isCurrency={false} hasSlider min={0} max={29.99} step={0.5} />
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader className="bg-slate-100/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800">
                    <CardTitle className="text-lg">Taxes & Fees</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <NumberInput label="Tax Rate (%)" name="taxRate" value={params.taxRate} isCurrency={false} />
                    <NumberInput label="Doc Fee" name="docFee" value={params.docFee} />
                    <NumberInput label="Non-Taxable Fees (Reg/Title)" name="nonTaxableFees" value={params.nonTaxableFees} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Desking Scenarios Tab */}
              <TabsContent value="desking" className="mt-6 space-y-6">
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader className="bg-slate-100/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800">
                    <CardTitle className="text-lg">Desking Grid Settings</CardTitle>
                    <CardDescription>Configure the values to generate a desking matrix.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <ArrayInput label="Terms (Months)" values={deskingTerms} setValues={setDeskingTerms} />
                    <ArrayInput label="Cash Down Options" values={deskingCashDowns} setValues={setDeskingCashDowns} isCurrency />
                    <ArrayInput label="APR Options" values={deskingRates} setValues={setDeskingRates} isPercent />
                    <div className="grid gap-2">
                      <Label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        Grid Columns
                      </Label>
                      <Select value={deskingColType} onValueChange={(val: any) => setDeskingColType(val)}>
                        <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cashDown">Cash Down</SelectItem>
                          <SelectItem value="apr">APR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader className="bg-slate-100/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800">
                    <CardTitle className="text-lg">In-App Accessory Configurator</CardTitle>
                    <CardDescription>Add accessories and see the monthly payment update instantly.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {[
                        { id: 'tint', name: 'Window Tint', price: 299 },
                        { id: 'mats', name: 'All-Weather Mats', price: 199 },
                        { id: 'lift', name: 'Suspension Lift Kit', price: 1295 },
                      ].map(acc => (
                        <div key={acc.id} className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900">
                          <div>
                            <p className="font-bold">{acc.name}</p>
                            <p className="text-xs text-slate-500">+${acc.price}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => {
                            setParams(prev => ({ ...prev, sellingPrice: prev.sellingPrice + acc.price }));
                            toast.success(`${acc.name} added to deal! Payment updated.`);
                          }}>Add to Deal</Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-slate-800 shadow-sm" data-tour-id="fi-menu-section">
                  <CardHeader
                    data-tour="tour-fi-menu-style"
                    className="bg-slate-100/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                  >
                    <div>
                      <CardTitle className="text-lg">F&I Menu Tier Defaults</CardTitle>
                      <CardDescription>Select products and naming conventions for presentation tiers.</CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                        onClick={() => {
                          toast.success("AI Smart Menu generated based on customer profile & vehicle type!");
                          hapticFeedback();
                          setFiMenuDefaults({
                            base: [],
                            low: ["warranty"],
                            medium: ["warranty", "gap"],
                            aggressive: ["warranty", "gap", "maintenance"]
                          });
                          setParams(prev => ({
                            ...prev,
                            warrantyRetail: 2995,
                            gapRetail: 1195,
                            maintenanceRetail: 1495
                          }));
                        }}
                      >
                        <BrainCircuit className="h-4 w-4 mr-2" />
                        AI Smart Menu
                      </Button>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm whitespace-nowrap">Naming Style:</Label>
                        <Select value={fiMenuNaming} onValueChange={(val: any) => setFiMenuNaming(val)}>
                          <SelectTrigger className="w-[180px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="metals">Metals (Platinum/Gold/Silver/Bronze)</SelectItem>
                            <SelectItem value="gbb">Good/Better/Best (Ultimate/Best/Better/Good)</SelectItem>
                            <SelectItem value="protection">Protection (Elite/Premium/Standard/Basic)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-center">{fiNamingOptions[fiMenuNaming].aggressive}</TableHead>
                            <TableHead className="text-center">{fiNamingOptions[fiMenuNaming].medium}</TableHead>
                            <TableHead className="text-center">{fiNamingOptions[fiMenuNaming].low}</TableHead>
                            <TableHead className="text-center">{fiNamingOptions[fiMenuNaming].base}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {["warranty", "maintenance", "gap"].map(product => {
                            const label = product === "warranty" ? "Service Contract" : product === "maintenance" ? "Maintenance" : "GAP Coverage";
                            return (
                              <TableRow key={product}>
                                <TableCell className="font-medium">{label}</TableCell>
                                {["aggressive", "medium", "low", "base"].map(tier => (
                                  <TableCell key={tier} className="text-center">
                                    <input 
                                      type="checkbox" 
                                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                      checked={(fiMenuDefaults as any)[tier].includes(product)}
                                      onChange={(e) => {
                                        setFiMenuDefaults(prev => ({
                                          ...prev,
                                          [tier]: e.target.checked 
                                            ? [...(prev as any)[tier], product]
                                            : (prev as any)[tier].filter((p: string) => p !== product)
                                        }));
                                      }}
                                    />
                                  </TableCell>
                                ))}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* What-If Compare Tab */}
              <TabsContent value="compare" className="mt-6 space-y-6">
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader className="bg-slate-100/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800">
                    <CardTitle className="text-lg">What-If Scenario Comparison</CardTitle>
                    <CardDescription>Compare multiple deal structures side-by-side.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {scenarios.map((scenario, idx) => {
                        const scenarioParams = {
                          ...params,
                          cashDown: scenario.cashDown,
                          termMonths: scenario.termMonths,
                          apr: scenario.apr,
                          tradeAllowance: scenario.tradeAllowance
                        };
                        const res = calculateDeal(scenarioParams);

                        return (
                          <div key={scenario.id} className={`border ${idx === 0 ? 'border-primary shadow-md' : 'border-slate-200 dark:border-slate-800'} rounded-xl p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50`}>
                            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                              <h3 className="font-bold text-lg">{scenario.name}</h3>
                              {idx === 0 && <Badge>Current</Badge>}
                            </div>
                            
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Cash Down</Label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1.5 text-slate-500 text-sm">$</span>
                                  <Input 
                                    type="number" 
                                    value={scenario.cashDown} 
                                    onChange={(e) => updateScenario(idx, 'cashDown', parseFloat(e.target.value) || 0)}
                                    className="h-8 pl-6"
                                    disabled={idx === 0}
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Term (Months)</Label>
                                <Input 
                                  type="number" 
                                  value={scenario.termMonths} 
                                  onChange={(e) => updateScenario(idx, 'termMonths', parseFloat(e.target.value) || 0)}
                                  className="h-8"
                                  disabled={idx === 0}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-slate-500">APR (%)</Label>
                                <div className="relative">
                                  <Input 
                                    type="number" 
                                    value={scenario.apr} 
                                    onChange={(e) => updateScenario(idx, 'apr', parseFloat(e.target.value) || 0)}
                                    className="h-8 pr-6"
                                    disabled={idx === 0}
                                  />
                                  <span className="absolute right-2.5 top-1.5 text-slate-500 text-sm">%</span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Trade Allowance</Label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1.5 text-slate-500 text-sm">$</span>
                                  <Input 
                                    type="number" 
                                    value={scenario.tradeAllowance} 
                                    onChange={(e) => updateScenario(idx, 'tradeAllowance', parseFloat(e.target.value) || 0)}
                                    className="h-8 pl-6"
                                    disabled={idx === 0}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                              <div className="flex justify-between items-center bg-primary/5 p-2 rounded-md">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Payment</span>
                                <span className="text-xl font-black text-primary">{formatCurrency(res.monthlyPayment)}</span>
                              </div>
                              <div className="flex justify-between items-center px-1">
                                <span className="text-sm text-slate-500">Total Gross</span>
                                <span className="text-sm font-bold text-success">{formatCurrency(res.totalGross)}</span>
                              </div>
                              <div className="flex justify-between items-center px-1">
                                <span className="text-sm text-slate-500">Financed</span>
                                <span className="text-sm font-bold">{formatCurrency(res.amountFinanced)}</span>
                              </div>
                            </div>

                            {idx !== 0 && (
                              <Button 
                                className="w-full mt-2 bg-white dark:bg-slate-950" 
                                variant="outline"
                                onClick={() => {
                                  setParams(scenarioParams);
                                  toast.success(`Applied ${scenario.name} to active deal`);
                                }}
                              >
                                Apply to Deal
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Back-End Products Tab */}
              <TabsContent value="addons" className="mt-6 space-y-6">
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader className="bg-slate-100/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800">
                    <CardTitle className="text-lg">F&I Products (Retail to Customer)</CardTitle>
                    <CardDescription>Enter the price the customer pays for these products.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <NumberInput label="Warranty Retail" name="warrantyRetail" value={params.warrantyRetail} />
                    <NumberInput label="GAP Retail" name="gapRetail" value={params.gapRetail} />
                    <NumberInput label="Maintenance Retail" name="maintenanceRetail" value={params.maintenanceRetail} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Internal Cost Tab */}
              <TabsContent value="cost" className="mt-6 space-y-6">
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-primary">
                  <CardHeader className="bg-primary/5 dark:bg-primary/10 border-b border-slate-200 dark:border-slate-800">
                    <CardTitle className="text-lg text-primary">Target Profit Optimizer</CardTitle>
                    <CardDescription>Reverse-calculate deal parameters to hit a specific gross profit margin.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-500 uppercase tracking-wider font-bold">Target Total Gross ($)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                          <Input 
                            type="number" 
                            value={targetProfit} 
                            onChange={(e) => setTargetProfit(Number(e.target.value))} 
                            className="pl-7"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-500 uppercase tracking-wider font-bold">Variable to Adjust</Label>
                        <Select value={adjustVariable} onValueChange={setAdjustVariable}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sellingPrice">Selling Price</SelectItem>
                            <SelectItem value="tradeAllowance">Trade Allowance</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleOptimizeProfit} variant="outline" className="flex-1">Calculate</Button>
                        <Button 
                          onClick={() => {
                            toast.success("AI restructured deal to maximize backend profit while keeping payment identical.");
                            hapticFeedback();
                            setParams(prev => ({
                              ...prev,
                              sellingPrice: prev.sellingPrice - 500,
                              warrantyRetail: prev.warrantyRetail + 700,
                              apr: prev.apr + 0.25
                            }));
                          }} 
                          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          <BrainCircuit className="w-4 h-4 mr-2" /> AI Structure
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-amber-500">
                  <CardHeader className="bg-amber-50/50 dark:bg-amber-950/20 border-b border-slate-200 dark:border-slate-800">
                    <CardTitle className="text-lg text-amber-900 dark:text-amber-500">Internal Costs & Profitability</CardTitle>
                    <CardDescription>These numbers are hidden from the printed customer proposal.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <NumberInput label="Vehicle Cost (Invoice/ACV)" name="vehicleCost" value={params.vehicleCost} />
                      <NumberInput label="Dealership Pack" name="pack" value={params.pack} />
                      <NumberInput label="Trade Actual Cash Value (ACV)" name="tradeActualCashValue" value={params.tradeActualCashValue} />
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-4">
                      <h4 className="font-semibold text-slate-700 dark:text-slate-300">F&I Product Costs</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <NumberInput label="Warranty Cost" name="warrantyCost" value={params.warrantyCost} />
                        <NumberInput label="GAP Cost" name="gapCost" value={params.gapCost} />
                        <NumberInput label="Maintenance Cost" name="maintenanceCost" value={params.maintenanceCost} />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-semibold text-slate-700 dark:text-slate-300">Bank Fees & Reserve</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <NumberInput label="Bank Fee" name="bankFee" value={params.bankFee} />
                        <NumberInput label="Dealer Reserve (Rate Markup)" name="dealerReserve" value={params.dealerReserve} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>
          </div>

          {/* Right Column - Outputs (Takes up 4 columns) */}
          <div className="lg:col-span-4 space-y-6">
            
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
              <DialogContent className="max-w-[95vw] w-full h-[95vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-100 dark:bg-slate-900 print:max-w-none print:h-auto print:bg-white print:border-none print:shadow-none [&>button]:print:hidden">
                <DialogHeader className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-row items-center justify-between shrink-0 print:hidden">
                  <div className="text-left">
                    <DialogTitle className="text-xl">Presentation & Print Preview</DialogTitle>
                    <DialogDescription>Select a layout to present to the customer or print.</DialogDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => window.print()} className="bg-primary hover:bg-primary/90 text-white whitespace-nowrap">
                      <Printer className="mr-2 h-4 w-4" /> Print
                    </Button>
                    <Button size="sm" onClick={handleDownloadPDF} variant="outline" className="bg-white dark:bg-slate-950 whitespace-nowrap">
                      <Download className="mr-2 h-4 w-4" /> PDF
                    </Button>
                  </div>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-4 md:p-8 print:p-0 print:overflow-visible">
                  <div className="max-w-5xl mx-auto">
            <Tabs defaultValue="proposal" className="w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:hidden">
                <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
                  <TabsList className="bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl inline-flex w-max sm:w-auto h-auto">
                    <TabsTrigger value="proposal" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm whitespace-nowrap">Proposal</TabsTrigger>
                    <TabsTrigger value="foursquare" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm whitespace-nowrap">4-Square</TabsTrigger>
                    <TabsTrigger value="fimenu" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm whitespace-nowrap">F&I Menu</TabsTrigger>
                    <TabsTrigger value="desking-grid" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm whitespace-nowrap">Desking Grid</TabsTrigger>
                    <TabsTrigger value="forms" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm whitespace-nowrap">Deal Forms</TabsTrigger>
                  </TabsList>
                </div>
              </div>
              <div id="presentation-view-capture">

              <TabsContent value="proposal" className="mt-0 outline-none">
                {/* Customer Proposal Card (Printable) */}
                <Card className="border-2 border-slate-900 dark:border-slate-700 shadow-xl print:shadow-none print:border-none print:w-full overflow-hidden">
                  <div className="bg-slate-900 dark:bg-slate-800 text-white p-6 print:bg-white print:text-black print:p-0 print:pb-4 print:border-b print:border-black">
                    <div className="flex justify-between items-start">
                      <h2 className="text-2xl font-bold flex items-center gap-2 mt-2">
                        <FileText className="h-6 w-6 print:hidden" />
                        Purchase Proposal
                      </h2>
                      <div className="text-right print:block hidden text-slate-900 dark:text-white print:text-black">
                        <div className="h-12 mb-2 flex justify-end">
                          <div className="h-12 w-12 rounded bg-primary flex items-center justify-center">
                            <Car className="h-8 w-8 text-white" />
                          </div>
                        </div>
                        <div className="text-xs space-y-0.5 mt-2">
                          <p className="font-bold text-sm">CarSales AI OS Demo</p>
                          <p>123 Main Street, Anytown, USA 12345</p>
                          <p>(555) 123-4567 | www.carsalessoftware.com</p>
                        </div>
                        <p className="text-sm mt-3 font-medium">Date: {new Date().toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                  
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-300">
                      
                      {/* Vehicle Price Section */}
                      <div className="p-6 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">Selling Price</span>
                          <span className="text-lg font-semibold">{formatCurrency(params.sellingPrice)}</span>
                        </div>
                        
                        {params.tradeAllowance > 0 && (
                          <div className="flex justify-between items-center text-red-600 dark:text-red-400">
                            <span>Trade Allowance</span>
                            <span>-{formatCurrency(params.tradeAllowance)}</span>
                          </div>
                        )}
                        
                        {params.tradePayoff > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600 dark:text-slate-400">Trade Payoff</span>
                            <span>{formatCurrency(params.tradePayoff)}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 dark:text-slate-400">Taxes & Fees</span>
                          <span>{formatCurrency(results.totalTaxes + params.docFee + params.nonTaxableFees)}</span>
                        </div>

                        {(params.warrantyRetail > 0 || params.gapRetail > 0 || params.maintenanceRetail > 0) && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600 dark:text-slate-400">Selected Options</span>
                            <span>{formatCurrency(params.warrantyRetail + params.gapRetail + params.maintenanceRetail)}</span>
                          </div>
                        )}
                      </div>

                      {/* Summary Section */}
                      <div className="p-6 bg-slate-50 dark:bg-slate-900/50 print:bg-transparent space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">Total Amount Financed</span>
                          <span className="text-xl font-bold">{formatCurrency(results.amountFinanced)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">Cash Down</span>
                          <span className="text-lg font-semibold text-primary">{formatCurrency(params.cashDown)}</span>
                        </div>
                      </div>

                      {/* Payment Section (The most important part) */}
                      <div className="p-8 bg-primary/5 dark:bg-primary/10 print:bg-slate-100 print:border-t-4 print:border-black text-center space-y-2">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Estimated Monthly Payment</p>
                        <div className="text-5xl font-extrabold text-slate-900 dark:text-white print:text-black">
                          {formatCurrency(results.monthlyPayment)}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Based on {params.termMonths} months @ {params.apr}% APR
                        </p>
                      </div>

                      {/* Signature Lines */}
                      <div className="p-8 pt-24 space-y-12 bg-white dark:bg-slate-900 print:bg-transparent">
                        <div className="flex justify-between gap-8 items-end">
                          <div className="flex-1 border-t border-slate-900 dark:border-white print:border-black pt-2 text-sm text-center relative">
                            {signatures.proposal ? (
                              <div className="absolute bottom-full mb-2 left-0 w-full flex justify-center">
                                <img src={signatures.proposal} alt="Signature" className="h-16 object-contain dark:invert print:dark:invert-0" />
                              </div>
                            ) : (
                              <Button variant="outline" size="sm" className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 print:hidden" onClick={() => setActiveSigTarget('proposal')}>
                                <Pen className="w-4 h-4 mr-2" /> Sign Digitally
                              </Button>
                            )}
                            Customer Signature
                          </div>
                          <div className="flex-1 border-t border-slate-900 dark:border-white print:border-black pt-2 text-sm text-center">Date</div>
                        </div>
                        <div className="flex justify-between gap-8 items-end">
                          <div className="flex-1 border-t border-slate-900 dark:border-white print:border-black pt-2 text-sm text-center">Management Approval</div>
                          <div className="flex-1 border-t border-slate-900 dark:border-white print:border-black pt-2 text-sm text-center">Date</div>
                        </div>
                      </div>

                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="foursquare" className="mt-0 outline-none">
                {/* 4-Square Worksheet (Printable) */}
                <Card className="border-2 border-slate-900 dark:border-slate-700 shadow-xl print:shadow-none print:border-none print:w-full overflow-hidden min-h-[600px] print:min-h-0 flex flex-col">
                  <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-6 print:bg-white print:text-black print:p-0 print:pb-4">
                    <div className="text-center space-y-2 flex flex-col items-center">
                      <div className="h-16 mb-2">
                        <div className="h-16 w-16 rounded bg-primary flex items-center justify-center mx-auto">
                          <Car className="h-10 w-10 text-white" />
                        </div>
                      </div>
                      <div className="text-xs space-y-0.5 print:text-black text-slate-600 dark:text-slate-400 mb-6">
                        <p className="font-bold text-sm">Auto Sales OS Demo</p>
                        <p>123 Main Street, Anytown, USA 12345</p>
                        <p>(555) 123-4567 | www.autosalesos.com</p>
                      </div>
                      <h2 className="text-3xl font-black uppercase tracking-widest border-b-4 border-slate-900 dark:border-white print:border-black pb-4 inline-block px-8 mt-2">Customer Worksheet</h2>
                      <p className="text-sm font-medium text-slate-500 print:text-black mt-2">Date: {new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <CardContent className="p-0 flex-1 flex flex-col print:bg-white print:text-black">
                    <div className="grid grid-cols-2 flex-1 border-y-4 border-slate-900 dark:border-slate-700 print:border-black min-h-[400px] print:min-h-[600px]">
                      
                      {/* Top Left: Price */}
                      <div className="border-r-4 border-b-4 border-slate-900 dark:border-slate-700 print:border-black p-4 sm:p-8 flex flex-col justify-center items-center space-y-2 sm:space-y-4 bg-slate-50 dark:bg-slate-800/50 print:bg-transparent">
                        <span className="text-xs sm:text-xl font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 print:text-slate-600">Vehicle Price</span>
                        <span className="text-2xl sm:text-5xl font-black text-slate-900 dark:text-white print:text-black">{formatCurrency(params.sellingPrice)}</span>
                      </div>
                      
                      {/* Top Right: Trade */}
                      <div className="border-b-4 border-slate-900 dark:border-slate-700 print:border-black p-4 sm:p-8 flex flex-col justify-center items-center space-y-2 sm:space-y-4 bg-white dark:bg-slate-900 print:bg-transparent">
                        <span className="text-xs sm:text-xl font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 print:text-slate-600">Trade Allowance</span>
                        <span className="text-2xl sm:text-5xl font-black text-slate-900 dark:text-white print:text-black">{formatCurrency(params.tradeAllowance)}</span>
                      </div>
                      
                      {/* Bottom Left: Down Payment */}
                      <div className="border-r-4 border-slate-900 dark:border-slate-700 print:border-black p-4 sm:p-8 flex flex-col justify-center items-center space-y-2 sm:space-y-4 bg-white dark:bg-slate-900 print:bg-transparent">
                        <span className="text-xs sm:text-xl font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 print:text-slate-600">Cash Down</span>
                        <span className="text-2xl sm:text-5xl font-black text-slate-900 dark:text-white print:text-black">{formatCurrency(params.cashDown)}</span>
                      </div>
                      
                      {/* Bottom Right: Monthly Payment */}
                      <div className="p-4 sm:p-8 flex flex-col justify-center items-center space-y-2 sm:space-y-4 bg-primary/5 dark:bg-primary/10 print:bg-transparent">
                        <span className="text-xs sm:text-xl font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 print:text-slate-600">Monthly Payment</span>
                        <span className="text-3xl sm:text-6xl font-black text-slate-900 dark:text-white print:text-black">{formatCurrency(results.monthlyPayment)}</span>
                        <span className="text-[10px] sm:text-sm font-medium text-slate-500 dark:text-slate-400 print:text-slate-500">Up to {params.termMonths} Months</span>
                      </div>

                    </div>

                    {/* Signature Lines */}
                    <div className="p-8 pt-24 space-y-16 bg-white dark:bg-slate-900 print:bg-transparent">
                      <p className="text-center font-bold text-lg text-slate-900 dark:text-white print:text-black">
                        I agree to purchase the vehicle under the terms outlined above.
                      </p>
                      <div className="flex justify-between gap-12 items-end">
                        <div className="flex-1 border-t-2 border-slate-900 dark:border-white print:border-black pt-2 text-sm font-bold text-center uppercase tracking-wider text-slate-900 dark:text-white print:text-black relative">
                          {signatures.foursquare ? (
                            <div className="absolute bottom-full mb-2 left-0 w-full flex justify-center">
                              <img src={signatures.foursquare} alt="Signature" className="h-16 object-contain dark:invert print:dark:invert-0" />
                            </div>
                          ) : (
                            <Button variant="outline" size="sm" className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 print:hidden" onClick={() => setActiveSigTarget('foursquare')}>
                              <Pen className="w-4 h-4 mr-2" /> Sign Digitally
                            </Button>
                          )}
                          Customer Approval
                        </div>
                        <div className="flex-1 border-t-2 border-slate-900 dark:border-white print:border-black pt-2 text-sm font-bold text-center uppercase tracking-wider text-slate-900 dark:text-white print:text-black">Management Approval</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fimenu" className="mt-0 outline-none">
                {/* F&I Menu Worksheet (Printable) */}
                <Card className="border-2 border-slate-900 dark:border-slate-700 shadow-xl print:shadow-none print:border-none print:w-full overflow-hidden">
                  <div className="bg-slate-900 dark:bg-slate-800 text-white p-6 print:bg-white print:text-black print:p-0 print:pb-4 print:border-b print:border-black">
                    <div className="flex justify-between items-start">
                      <h2 className="text-2xl font-bold flex items-center gap-2 mt-2">
                        <FileText className="h-6 w-6 print:hidden" />
                        Protection Options
                      </h2>
                      <div className="text-right print:block hidden text-slate-900 dark:text-white print:text-black">
                        <div className="h-12 mb-2 flex justify-end">
                          <div className="h-12 w-12 rounded bg-primary flex items-center justify-center">
                            <Car className="h-8 w-8 text-white" />
                          </div>
                        </div>
                        <div className="text-xs space-y-0.5 mt-2">
                          <p className="font-bold text-sm">Auto Sales OS Demo</p>
                          <p>123 Main Street, Anytown, USA 12345</p>
                          <p>(555) 123-4567 | www.autosalesos.com</p>
                        </div>
                        <p className="text-sm mt-3 font-medium">Vehicle: {selectedVehicleName}</p>
                      </div>
                    </div>
                  </div>
                  
                  <CardContent className="p-0 print:bg-white print:text-black">
                    <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-700 print:divide-slate-300">
                      
                      {/* Aggressive Option */}
                      <div className="p-6 flex flex-col items-center space-y-6">
                        <div className="text-center">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white print:text-black uppercase tracking-wider">{fiNamingOptions[fiMenuNaming].aggressive}</h3>
                          <p className="text-sm text-slate-500">Ultimate Protection</p>
                        </div>
                        <div className="flex-1 w-full space-y-4">
                          <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${fiMenuDefaults.aggressive.includes('warranty') ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}></div><span className={`text-sm ${fiMenuDefaults.aggressive.includes('warranty') ? 'font-medium' : 'text-slate-400 line-through'}`}>Vehicle Service Contract</span></div>
                          <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${fiMenuDefaults.aggressive.includes('maintenance') ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}></div><span className={`text-sm ${fiMenuDefaults.aggressive.includes('maintenance') ? 'font-medium' : 'text-slate-400 line-through'}`}>Pre-Paid Maintenance</span></div>
                          <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${fiMenuDefaults.aggressive.includes('gap') ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}></div><span className={`text-sm ${fiMenuDefaults.aggressive.includes('gap') ? 'font-medium' : 'text-slate-400 line-through'}`}>GAP Coverage</span></div>
                        </div>
                        <div className="w-full pt-6 border-t border-slate-200 dark:border-slate-700 print:border-slate-300 text-center">
                          <p className="text-sm text-slate-500 mb-1">{params.termMonths} Months</p>
                          <p className="text-3xl font-black text-slate-900 dark:text-white print:text-black">{formatCurrency(fiMenuOptions.aggressive.monthlyPayment)}</p>
                        </div>
                      </div>

                      {/* Medium Option */}
                      <div className="p-6 flex flex-col items-center space-y-6 bg-slate-50 dark:bg-slate-900 print:bg-transparent">
                        <div className="text-center">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white print:text-black uppercase tracking-wider">{fiNamingOptions[fiMenuNaming].medium}</h3>
                          <p className="text-sm text-slate-500">Value Protection</p>
                        </div>
                        <div className="flex-1 w-full space-y-4">
                          <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${fiMenuDefaults.medium.includes('warranty') ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}></div><span className={`text-sm ${fiMenuDefaults.medium.includes('warranty') ? 'font-medium' : 'text-slate-400 line-through'}`}>Vehicle Service Contract</span></div>
                          <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${fiMenuDefaults.medium.includes('maintenance') ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}></div><span className={`text-sm ${fiMenuDefaults.medium.includes('maintenance') ? 'font-medium' : 'text-slate-400 line-through'}`}>Pre-Paid Maintenance</span></div>
                          <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${fiMenuDefaults.medium.includes('gap') ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}></div><span className={`text-sm ${fiMenuDefaults.medium.includes('gap') ? 'font-medium' : 'text-slate-400 line-through'}`}>GAP Coverage</span></div>
                        </div>
                        <div className="w-full pt-6 border-t border-slate-200 dark:border-slate-700 print:border-slate-300 text-center">
                          <p className="text-sm text-slate-500 mb-1">{params.termMonths} Months</p>
                          <p className="text-3xl font-black text-slate-900 dark:text-white print:text-black">{formatCurrency(fiMenuOptions.medium.monthlyPayment)}</p>
                        </div>
                      </div>

                      {/* Low Option */}
                      <div className="p-6 flex flex-col items-center space-y-6">
                        <div className="text-center">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white print:text-black uppercase tracking-wider">{fiNamingOptions[fiMenuNaming].low}</h3>
                          <p className="text-sm text-slate-500">Basic Protection</p>
                        </div>
                        <div className="flex-1 w-full space-y-4">
                          <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${fiMenuDefaults.low.includes('warranty') ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}></div><span className={`text-sm ${fiMenuDefaults.low.includes('warranty') ? 'font-medium' : 'text-slate-400 line-through'}`}>Vehicle Service Contract</span></div>
                          <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${fiMenuDefaults.low.includes('maintenance') ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}></div><span className={`text-sm ${fiMenuDefaults.low.includes('maintenance') ? 'font-medium' : 'text-slate-400 line-through'}`}>Pre-Paid Maintenance</span></div>
                          <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${fiMenuDefaults.low.includes('gap') ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}></div><span className={`text-sm ${fiMenuDefaults.low.includes('gap') ? 'font-medium' : 'text-slate-400 line-through'}`}>GAP Coverage</span></div>
                        </div>
                        <div className="w-full pt-6 border-t border-slate-200 dark:border-slate-700 print:border-slate-300 text-center">
                          <p className="text-sm text-slate-500 mb-1">{params.termMonths} Months</p>
                          <p className="text-3xl font-black text-slate-900 dark:text-white print:text-black">{formatCurrency(fiMenuOptions.low.monthlyPayment)}</p>
                        </div>
                      </div>

                      {/* Base Option */}
                      <div className="p-6 flex flex-col items-center space-y-6 bg-slate-50 dark:bg-slate-900 print:bg-transparent">
                        <div className="text-center">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white print:text-black uppercase tracking-wider">{fiNamingOptions[fiMenuNaming].base}</h3>
                          <p className="text-sm text-slate-500">No Additional Protection</p>
                        </div>
                        <div className="flex-1 w-full space-y-4">
                          <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${fiMenuDefaults.base.includes('warranty') ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}></div><span className={`text-sm ${fiMenuDefaults.base.includes('warranty') ? 'font-medium' : 'text-slate-400 line-through'}`}>Vehicle Service Contract</span></div>
                          <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${fiMenuDefaults.base.includes('maintenance') ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}></div><span className={`text-sm ${fiMenuDefaults.base.includes('maintenance') ? 'font-medium' : 'text-slate-400 line-through'}`}>Pre-Paid Maintenance</span></div>
                          <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${fiMenuDefaults.base.includes('gap') ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}></div><span className={`text-sm ${fiMenuDefaults.base.includes('gap') ? 'font-medium' : 'text-slate-400 line-through'}`}>GAP Coverage</span></div>
                        </div>
                        <div className="w-full pt-6 border-t border-slate-200 dark:border-slate-700 print:border-slate-300 text-center">
                          <p className="text-sm text-slate-500 mb-1">{params.termMonths} Months</p>
                          <p className="text-3xl font-black text-slate-900 dark:text-white print:text-black">{formatCurrency(fiMenuOptions.base.monthlyPayment)}</p>
                        </div>
                      </div>

                    </div>

                    {/* Customer Selection Signature */}
                    <div className="p-8 pt-16 space-y-8 bg-white dark:bg-slate-900 print:bg-transparent border-t border-slate-200 dark:border-slate-700 print:border-black">
                      <p className="text-center font-bold text-lg text-slate-900 dark:text-white print:text-black">
                        I acknowledge that these options have been presented to me and I select the option signed below.
                      </p>
                      <div className="flex justify-between gap-12 items-end">
                        <div className="flex-1 border-t-2 border-slate-900 dark:border-white print:border-black pt-2 text-sm font-bold text-center uppercase tracking-wider text-slate-900 dark:text-white print:text-black relative">
                          {signatures.fimenu ? (
                            <div className="absolute bottom-full mb-2 left-0 w-full flex justify-center">
                              <img src={signatures.fimenu} alt="Signature" className="h-16 object-contain dark:invert print:dark:invert-0" />
                            </div>
                          ) : (
                            <Button variant="outline" size="sm" className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 print:hidden" onClick={() => setActiveSigTarget('fimenu')}>
                              <Pen className="w-4 h-4 mr-2" /> Sign Digitally
                            </Button>
                          )}
                          Customer Signature
                        </div>
                        <div className="flex-1 border-t-2 border-slate-900 dark:border-white print:border-black pt-2 text-sm font-bold text-center uppercase tracking-wider text-slate-900 dark:text-white print:text-black">Date</div>
                      </div>
                    </div>

                    {/* Waiver of Protection */}
                    <div className="p-8 pt-12 space-y-8 bg-slate-50 dark:bg-slate-800/50 print:bg-transparent border-t border-slate-200 dark:border-slate-700 print:border-black">
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          <div className="w-5 h-5 border-2 border-slate-900 dark:border-white print:border-black rounded-sm flex items-center justify-center">
                            {fiMenuDefaults.base.length === 0 && <Check className="w-4 h-4 text-slate-900 dark:text-white print:text-black" />}
                          </div>
                        </div>
                        <div>
                          <p className="font-bold text-lg text-slate-900 dark:text-white print:text-black mb-2">
                            Waiver of Protection (Decline All)
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400 print:text-black">
                            I acknowledge that the dealership has offered me optional protection products including a Vehicle Service Contract, Pre-Paid Maintenance, and GAP Coverage. I understand the benefits of these products but choose to decline all of them. I understand that I will be solely responsible for any repair costs, maintenance, or gap in insurance coverage.
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between gap-12 items-end pt-8">
                        <div className="flex-1 border-t-2 border-slate-900 dark:border-white print:border-black pt-2 text-sm font-bold text-center uppercase tracking-wider text-slate-900 dark:text-white print:text-black">
                          Customer Initials (Decline All)
                        </div>
                        <div className="flex-1 border-t-2 border-slate-900 dark:border-white print:border-black pt-2 text-sm font-bold text-center uppercase tracking-wider text-slate-900 dark:text-white print:text-black">
                          Date
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="desking-grid" className="mt-0 outline-none">
                <Card className="border-2 border-slate-900 dark:border-slate-700 shadow-xl print:shadow-none print:border-none print:w-full overflow-hidden">
                  <div className="bg-slate-900 dark:bg-slate-800 text-white p-6 print:bg-white print:text-black print:p-0 print:pb-4 print:border-b print:border-black">
                    <div className="flex justify-between items-start">
                      <h2 className="text-2xl font-bold flex items-center gap-2 mt-2">
                        <Calculator className="h-6 w-6 print:hidden" />
                        Desking Options
                      </h2>
                      <div className="text-right print:block hidden text-slate-900 dark:text-white print:text-black">
                        <div className="h-12 mb-2 flex justify-end">
                          <div className="h-12 w-12 rounded bg-primary flex items-center justify-center">
                            <Car className="h-8 w-8 text-white" />
                          </div>
                        </div>
                        <div className="text-xs space-y-0.5 mt-2">
                          <p className="font-bold text-sm">Auto Sales OS Demo</p>
                          <p>123 Main Street, Anytown, USA 12345</p>
                          <p>(555) 123-4567 | www.autosalesos.com</p>
                        </div>
                        <p className="text-sm mt-3 font-medium">Vehicle: {selectedVehicleName}</p>
                      </div>
                    </div>
                  </div>
                  
                  <CardContent className="p-6 print:bg-white print:text-black">
                    <div className="overflow-x-auto">
                      <Table className="border print:border-black">
                        <TableHeader>
                          <TableRow className="bg-slate-100 dark:bg-slate-800/50 print:bg-transparent">
                            <TableHead className="font-bold text-slate-900 dark:text-white print:text-black border-r print:border-black w-[150px] whitespace-nowrap">
                              Term \ {deskingColType === 'cashDown' ? 'Cash Down' : 'APR'}
                            </TableHead>
                            {(deskingColType === 'cashDown' ? deskingCashDowns : deskingRates).map((val, i) => {
                              const parsedVal = parseFloat(val.trim());
                              return !isNaN(parsedVal) ? (
                                <TableHead key={i} className="text-center font-bold text-slate-900 dark:text-white print:text-black border-r print:border-black whitespace-nowrap">
                                  {deskingColType === 'cashDown' ? formatCurrency(parsedVal) : `${parsedVal}%`}
                                </TableHead>
                              ) : null;
                            })}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {deskingTerms.map((t, rowIdx) => {
                            const term = parseInt(t.trim());
                            if (isNaN(term)) return null;
                            
                            return (
                              <TableRow key={rowIdx} className="print:border-black">
                                <TableCell className="font-bold text-slate-900 dark:text-white print:text-black border-r print:border-black bg-slate-50 dark:bg-slate-900/50 print:bg-transparent">
                                  {term} Months
                                </TableCell>
                                {(deskingColType === 'cashDown' ? deskingCashDowns : deskingRates).map((val, colIdx) => {
                                  const parsedVal = parseFloat(val.trim());
                                  if (isNaN(parsedVal)) return null;
                                  
                                  const scenarioParams = { 
                                    ...params, 
                                    termMonths: term, 
                                    ...(deskingColType === 'cashDown' ? { cashDown: parsedVal } : { apr: parsedVal })
                                  };
                                  const scenarioResults = calculateDeal(scenarioParams);
                                  
                                  return (
                                    <TableCell key={colIdx} className="text-center text-xl font-black text-slate-900 dark:text-white print:text-black border-r print:border-black">
                                      {formatCurrency(scenarioResults.monthlyPayment)}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="mt-8 text-sm text-slate-500 dark:text-slate-400 print:text-black">
                      <p>* Payments based on {params.apr}% APR (W.A.C.). Includes {formatCurrency(results.totalTaxes + params.docFee + params.nonTaxableFees)} in estimated taxes and fees.</p>
                      <p>* Trade allowance: {formatCurrency(params.tradeAllowance)}</p>
                    </div>

                    {/* Customer Selection Signature */}
                    <div className="mt-12 space-y-8 bg-white dark:bg-slate-900 print:bg-transparent border-t border-slate-200 dark:border-slate-700 print:border-black pt-24">
                      <p className="text-center font-bold text-lg text-slate-900 dark:text-white print:text-black">
                        I select the payment option circled above.
                      </p>
                      <div className="flex justify-between gap-12 items-end">
                        <div className="flex-1 border-t-2 border-slate-900 dark:border-white print:border-black pt-2 text-sm font-bold text-center uppercase tracking-wider text-slate-900 dark:text-white print:text-black relative">
                          {signatures.desking ? (
                            <div className="absolute bottom-full mb-2 left-0 w-full flex justify-center">
                              <img src={signatures.desking} alt="Signature" className="h-16 object-contain dark:invert print:dark:invert-0" />
                            </div>
                          ) : (
                            <Button variant="outline" size="sm" className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 print:hidden" onClick={() => setActiveSigTarget('desking')}>
                              <Pen className="w-4 h-4 mr-2" /> Sign Digitally
                            </Button>
                          )}
                          Customer Signature
                        </div>
                        <div className="flex-1 border-t-2 border-slate-900 dark:border-white print:border-black pt-2 text-sm font-bold text-center uppercase tracking-wider text-slate-900 dark:text-white print:text-black">Date</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </TabsContent>
                <TabsContent value="forms" className="mt-0 outline-none">
                  <DealForms 
                    params={params} 
                    customerName={customers.find((c: any) => c.id === selectedCustomer)?.name || "Guest Customer"} 
                    vehicleName={selectedVehicleName} 
                  />
                </TabsContent>
              </div>
            </Tabs>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Profitability Dashboard (Hidden on Print) */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
              <CardHeader className="bg-slate-100/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5 text-success" /> Deal Profitability
                </CardTitle>
                <CardDescription>Internal use only. Do not show to customer.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Front-End Gross</span>
                    <span className={`font-semibold ${results.frontEndGross >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(results.frontEndGross)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Back-End Gross</span>
                    <span className={`font-semibold ${results.backEndGross >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(results.backEndGross)}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-bold text-slate-900 dark:text-white">Total Gross Profit</span>
                  <span className={`text-2xl font-extrabold ${results.totalGross >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(results.totalGross)}
                  </span>
                </div>

                {/* Interactive Deal Structure Visualizer */}
                <div className="pt-2 pb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <PieChartIcon className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Margin Breakdown</h4>
                  </div>
                  <Tabs defaultValue="split" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="split">Margin Split</TabsTrigger>
                      <TabsTrigger value="centers">Profit Centers</TabsTrigger>
                    </TabsList>
                    <TabsContent value="split" className="mt-0">
                      <div className="h-[220px] w-full relative">
                        {results.totalGross > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Metal (Front)', value: Math.max(0, results.frontEndGross), color: 'hsl(var(--primary))' },
                                  { name: 'F&I (Back)', value: Math.max(0, results.backEndGross), color: 'hsl(var(--success))' }
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                              >
                                {
                                    [
                                      { name: 'Metal (Front)', value: Math.max(0, results.frontEndGross), color: 'hsl(var(--primary))' },
                                      { name: 'F&I (Back)', value: Math.max(0, results.backEndGross), color: 'hsl(var(--success))' }
                                    ].map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} className="cursor-pointer hover:opacity-80" onClick={() => {
                                        toast.info(`${entry.name} Details`, { description: `Total value: ${formatCurrency(entry.value)}`});
                                      }} />
                                    ))
                                  }
                              </Pie>
                              <RechartsTooltip 
                                formatter={(value: number) => formatCurrency(value)}
                                contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                              />
                              <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-destructive/10 rounded-xl border border-destructive/20 text-destructive font-semibold">
                            Negative Total Gross
                          </div>
                        )}
                        {results.totalGross > 0 && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
                            <span className="text-xs text-slate-500 font-medium">Total</span>
                            <span className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(results.totalGross)}</span>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    <TabsContent value="centers" className="mt-0">
                      <div className="h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              { name: 'Vehicle', value: Math.max(0, params.sellingPrice - params.vehicleCost - params.pack) },
                              { name: 'Fees', value: params.docFee },
                              { name: 'Warranty', value: Math.max(0, params.warrantyRetail - params.warrantyCost) },
                              { name: 'GAP', value: Math.max(0, params.gapRetail - params.gapCost) },
                              { name: 'Maint.', value: Math.max(0, params.maintenanceRetail - params.maintenanceCost) },
                              { name: 'Reserve', value: params.dealerReserve }
                            ].filter(d => d.value > 0).sort((a, b) => b.value - a.value)}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                            <XAxis type="number" tickFormatter={(value) => `$${value}`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis dataKey="name" type="category" width={60} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <RechartsTooltip 
                              formatter={(value: number) => formatCurrency(value)}
                              contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                            />
                            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                              {
                                [
                                  { name: 'Vehicle', value: Math.max(0, params.sellingPrice - params.vehicleCost - params.pack) },
                                  { name: 'Fees', value: params.docFee },
                                  { name: 'Warranty', value: Math.max(0, params.warrantyRetail - params.warrantyCost) },
                                  { name: 'GAP', value: Math.max(0, params.gapRetail - params.gapCost) },
                                  { name: 'Maint.', value: Math.max(0, params.maintenanceRetail - params.maintenanceCost) },
                                  { name: 'Reserve', value: params.dealerReserve }
                                  ].filter(d => d.value > 0).sort((a, b) => b.value - a.value).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['Vehicle', 'Fees'].includes(entry.name) ? 'hsl(var(--primary))' : 'hsl(var(--success))'} className="cursor-pointer hover:opacity-80" onClick={() => {
                                      toast.info(`${entry.name} Details`, { description: `Total value: ${formatCurrency(entry.value)}`});
                                    }} />
                                  ))
                                }
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                <Separator />
                
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:scale-110 transition-transform">
                    <Sparkles className="h-12 w-12 text-primary" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">AI Profit Optimizer</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                    "I recommend adding GAP and a 3-year VSC. Based on customer credit profile, this increases total gross by $1,450 while staying within the target monthly payment of $600."
                  </p>
                  <Button variant="link" className="h-auto p-0 text-[10px] font-black text-primary uppercase mt-2">Apply AI Recommendation</Button>
                </div>

                <Separator />
                
                <div className="space-y-4 pt-2">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300">Deal Intelligence</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-slate-500">Amount Financed</p>
                      <p className="font-semibold">{formatCurrency(results.amountFinanced)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-500">LTV (Loan-to-Value)</p>
                      <p className={`font-semibold ${results.ltv > 120 ? 'text-destructive' : 'text-success'}`}>
                        {results.ltv.toFixed(1)}%
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-500">NADA Retail</p>
                      <p className="font-semibold">{formatCurrency(params.nadaRetail)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-500">NADA Trade</p>
                      <p className="font-semibold">{formatCurrency(params.nadaTrade)}</p>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

          </div>
        </div>
        </TabsContent>

        <TabsContent value="history" className="mt-0 outline-none print:hidden">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="bg-slate-100/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800">
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-5 w-5 text-primary" /> Saved Deals History
              </CardTitle>
              <CardDescription>View and manage your previously saved deals.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {savedDeals.length === 0 ? (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                  <History className="h-12 w-12 text-slate-300 mb-4" />
                  <p>No deals saved yet. Save an active deal to see it here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6">Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead className="text-right">Front-End</TableHead>
                        <TableHead className="text-right">Back-End</TableHead>
                        <TableHead className="text-right">Total Gross</TableHead>
                        <TableHead className="text-right pr-6">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {savedDeals.map((deal) => (
                        <TableRow key={deal.id}>
                          <TableCell className="pl-6 whitespace-nowrap">{deal.date}</TableCell>
                          <TableCell className="font-medium whitespace-nowrap">{deal.customerName}</TableCell>
                          <TableCell className="whitespace-nowrap">{deal.vehicle}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{formatCurrency(deal.frontEndGross)}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{formatCurrency(deal.backEndGross)}</TableCell>
                          <TableCell className="text-right font-bold text-success whitespace-nowrap">{formatCurrency(deal.totalGross)}</TableCell>
                          <TableCell className="text-right pr-6 whitespace-nowrap">
                            <Button variant="ghost" size="sm" onClick={() => handleLoadDeal(deal)}>Load Deal</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>

      {/* Signature Capture Dialog */}
      <Dialog open={!!activeSigTarget} onOpenChange={(open) => !open && setActiveSigTarget(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>E-Signature Capture</DialogTitle>
            <DialogDescription>
              Please sign below to authorize this document.
            </DialogDescription>
          </DialogHeader>
          <div className="border-2 border-slate-200 dark:border-slate-700 rounded-lg bg-white overflow-hidden my-4">
            <SignatureCanvas
              ref={sigCanvas}
              penColor="black"
              canvasProps={{
                className: "w-full h-64 cursor-crosshair",
              }}
            />
          </div>
          <div className="flex justify-between items-center">
            <Button variant="ghost" onClick={() => sigCanvas.current?.clear()}>
              Clear Signature
            </Button>
            <div className="space-x-2">
              <Button variant="outline" onClick={() => setActiveSigTarget(null)}>
                Cancel
              </Button>
              <Button onClick={handleAcceptSignature}>
                Accept Signature
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={isShareOpen} onOpenChange={(open) => { setIsShareOpen(open); if(!open) setIsCopied(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Deal</DialogTitle>
            <DialogDescription>
              Anyone with this link will be able to view this active proposal.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 mt-4">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="share-link" className="sr-only">
                Link
              </Label>
              <Input
                id="share-link"
                defaultValue={`https://os.autosalesdemo.com/deal/${shareId}`}
                readOnly
                className="bg-slate-50 dark:bg-slate-900 font-mono text-sm"
              />
            </div>
            <Button type="button" size="sm" className="px-3 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => {
              navigator.clipboard.writeText(`https://os.autosalesdemo.com/deal/${shareId}`);
              setIsCopied(true);
              toast.success("Link copied to clipboard!");
              setTimeout(() => setIsCopied(false), 2000);
            }}>
              <span className="sr-only">Copy</span>
              {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
