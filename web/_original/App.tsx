import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { toast } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Home, Car, Users, LayoutDashboard, ListTodo, Calendar, ShieldCheck, Activity, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "@/pages/Index";
import Onboarding from "@/pages/Onboarding";
import { OnboardingGate } from "@/components/OnboardingGate";
import NotFound from "@/pages/NotFound";
import CreditApp from "@/pages/CreditApp";
import Inventory from "@/pages/Inventory";
import Appraisals from "@/pages/Appraisals";
import Accounting from "@/pages/Accounting";
import Metrics from "@/pages/Metrics";
import CRM from "@/pages/CRM";
import Acquisition from "@/pages/Acquisition";
import CommandCenter from "@/pages/CommandCenter";
import VDP from "@/pages/VDP";
import CustomerProfile from "@/pages/CustomerProfile";
import Appointments from "@/pages/Appointments";
import Tasks from "@/pages/Tasks";
import SharedDeal from "@/pages/SharedDeal";
import Screener from "@/pages/Screener";
import Settings from "@/pages/Settings";
import ApplicationStatus from "@/pages/ApplicationStatus";
import BHPH from "@/pages/BHPH";
import ServiceParts from "@/pages/ServiceParts";
import Logistics from "@/pages/Logistics";
import Compliance from "@/pages/Compliance";
import HR from "@/pages/HR";
import Website from "@/pages/Website";
import AgingInventory from "@/pages/AgingInventory";
import SpiffBoard from "@/pages/SpiffBoard";
import PayPlans from "@/pages/PayPlans";
import SalespersonOfMonth from "@/pages/SalespersonOfMonth";
import Inbox from "@/pages/Inbox";
import Auctions from "@/pages/Auctions";
import Wholesale from "@/pages/Wholesale";
import Recon from "@/pages/Recon";
import PhotoStudio from "@/pages/PhotoStudio";
import TitleReg from "@/pages/TitleReg";
import Lenders from "@/pages/Lenders";
import Contracts from "@/pages/Contracts";
import DealJacket from "@/pages/DealJacket";
import Campaigns from "@/pages/Campaigns";
import Floorplan from "@/pages/Floorplan";
import Reports from "@/pages/Reports";
import DOC from "@/pages/DOC";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";
import { getTenant } from "@/lib/tenant";
import { AIAssistant } from "@/components/AIAssistant";
import { CommandPalette } from "@/components/CommandPalette";
import { MobileFab } from "@/components/MobileFab";
import { MobileNav } from "@/components/MobileNav";
import { DemoLockScreen } from "@/components/DemoLockScreen";
import MobileIntake from "@/pages/MobileIntake";
import PushNotifications from "@/pages/PushNotifications";
import TestDrives from "@/pages/TestDrives";
import ServiceScheduler from "@/pages/ServiceScheduler";
import VirtualBDC from "@/pages/VirtualBDC";
import CustomerPortal from "@/pages/CustomerPortal";
import SecurityCenter from "@/pages/SecurityCenter";
import Warranty from "@/pages/Warranty";
import BDCCallCenter from "@/pages/BDCCallCenter";
import ShowroomKiosk from "@/pages/ShowroomKiosk";
import WorkflowBuilder from "@/pages/WorkflowBuilder";
import LotManagement from "@/pages/LotManagement";
import TechnicianBay from "@/pages/TechnicianBay";
import FleetManagement from "@/pages/FleetManagement";
import AccountsPayable from "@/pages/AccountsPayable";
import PartsDepartment from "@/pages/PartsDepartment";
import AIFollowUp from "@/pages/AIFollowUp";
import Gamification from "@/pages/Gamification";
import DealRescue from "@/pages/DealRescue";
import DashboardBuilder from "@/pages/DashboardBuilder";
import Customer360 from "@/pages/Customer360";
import InventoryPricing from "@/pages/InventoryPricing";
import DealHeatmap from "@/pages/DealHeatmap";
import ServiceReminders from "@/pages/ServiceReminders";
import VideoMessages from "@/pages/VideoMessages";
import TextingTemplates from "@/pages/TextingTemplates";
import AuditTrail from "@/pages/AuditTrail";
import ComplianceChecker from "@/pages/ComplianceChecker";
import MobileTradeAppraisal from "@/pages/MobileTradeAppraisal";
import LotScanner from "@/pages/LotScanner";
import ReportBuilder from "@/pages/ReportBuilder";
import { SmartNotifications } from "@/components/SmartNotifications";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { TeamChat } from "@/components/TeamChat";
import { MorningBrief } from "@/components/MorningBrief";
import { useEffect, useState, useMemo } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { RoleDemoSwitcher } from "@/components/RoleDemoSwitcher";
import { DemoTour } from "@/components/DemoTour";
import { WhatsNewModal } from "@/components/WhatsNewModal";
import { BookDemoModal } from "@/components/BookDemoModal";

const queryClient = new QueryClient();

const SwipeHandler = () => {
  const { setOpenMobile, openMobile } = useSidebar();
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      setTouchEnd(null);
      setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: TouchEvent) => {
      setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
      if (!touchStart || !touchEnd) return;
      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;

      if (isRightSwipe && touchStart < 50) {
        setOpenMobile(true);
      }
      
      if (isLeftSwipe && openMobile) {
        setOpenMobile(false);
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [touchStart, touchEnd, openMobile, setOpenMobile]);

  return null;
};


const LiveActivity = () => {
  useEffect(() => {
    const activities = [
      "New lead from Facebook Marketplace",
      "John Doe just submitted a credit app",
      "Inventory updated: 2024 Toyota Camry added",
      "Sales Leaderboard: Mike just closed a deal",
      "Service Dept: New RO #4592 opened",
      "Customer checking in: Sarah Smith (Service)",
      "Price Drop: 2023 Ford F-150 lowered by $500",
    ];

    const interval = setInterval(() => {
      const activity = activities[Math.floor(Math.random() * activities.length)];
      if (Math.random() > 0.8) {
        toast.info(activity, {
          icon: <Activity className="h-4 w-4 text-primary" />,
          duration: 4000,
        });
      }
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  return null;
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>


      <DemoLockScreen>
        {showSplash && (
          <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center animate-out fade-out duration-700 delay-[900ms] fill-mode-forwards pointer-events-none">
            <img src={getTenant().logoUrl} alt={getTenant().name} className="h-16 md:h-20 w-auto object-contain animate-in zoom-in duration-500" />
          </div>
        )}
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AuthProvider>
            <BrowserRouter>
                <OnboardingGate />
                <LiveActivity />
                <AIAssistant />
                <RoleDemoSwitcher isOpen={showRoleSwitcher} onClose={() => setShowRoleSwitcher(false)} />
                <DemoTour />
                <WhatsNewModal />
                {getTenant().id === "demo" && <BookDemoModal />}
                <KeyboardShortcuts />
                <OfflineIndicator />
                <TeamChat />
                <MorningBrief />
                <SidebarProvider>
                  <SwipeHandler />
                  <AppSidebar />
                  <main className="flex-1 w-full bg-slate-50 dark:bg-slate-900 relative flex flex-col min-w-0 h-[100dvh] overflow-hidden animate-in fade-in duration-500">
                    {/* Sticky Header — Desktop + Mobile */}
                    <div className="shrink-0 flex items-center justify-between px-3 md:px-5 h-16 border-b border-border/50 bg-background/90 backdrop-blur-md z-50">
                      <Link to="/" className="flex items-center hover:opacity-80 transition-opacity active:scale-95" data-tour-id="nav-logo">
                        <img src={getTenant().logoUrl} alt={getTenant().name} className="h-10 md:h-11 w-auto max-w-[180px] md:max-w-[220px] object-contain" />
                      </Link>
                      
                      <div className="flex items-center gap-1.5">
                        {getTenant().id === "demo" && (<>
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="h-8 hidden sm:flex font-bold"
                          onClick={() => window.dispatchEvent(new CustomEvent('open-book-demo'))}
                        >
                          Book Your Demo
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 hidden sm:flex text-primary border-primary/20 bg-primary/5 hover:bg-primary/10"
                          onClick={() => window.dispatchEvent(new CustomEvent('start-spotlight-tour'))}
                        >
                          <Play className="h-3 w-3 mr-1.5" />
                          Take the tour
                        </Button>
                        </>)}
                        <button
                          onClick={() => setShowRoleSwitcher(true)}
                          className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors shrink-0"
                          title="Switch Role View"
                          data-tour-id="nav-role-switcher"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                          <span className="text-xs font-semibold text-primary hidden sm:inline">Switch Role</span>
                        </button>
                        <SmartNotifications />
                        <CommandPalette />
                        <div className="md:hidden">
                          <SidebarTrigger />
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto overflow-x-hidden pb-[calc(180px+env(safe-area-inset-bottom,0px))] md:pb-0 overscroll-contain relative">
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/onboarding" element={<Onboarding />} />
                        <Route path="/credit-app" element={<CreditApp />} />
                        <Route 
                          path="/inventory" 
                          element={
                            <ProtectedRoute allowedRoles={['admin', 'manager', 'sales', 'inventory']}>
                              <Inventory />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/appraisals" 
                          element={
                            <ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}>
                              <Appraisals />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/accounting" 
                          element={
                            <ProtectedRoute allowedRoles={['admin', 'f_and_i']}>
                              <Accounting />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/accounts-payable" 
                          element={
                            <ProtectedRoute allowedRoles={['admin', 'f_and_i']}>
                              <AccountsPayable />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/metrics" 
                          element={
                            <ProtectedRoute allowedRoles={['admin', 'manager']}>
                              <Metrics />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/crm" 
                          element={
                            <ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}>
                              <CRM />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/crm/workflows" 
                          element={
                            <ProtectedRoute allowedRoles={['admin', 'manager']}>
                              <WorkflowBuilder />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/acquisition" 
                          element={
                            <ProtectedRoute allowedRoles={['admin', 'manager']}>
                              <Acquisition />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/command-center" 
                          element={
                            <ProtectedRoute allowedRoles={['admin', 'manager']}>
                              <CommandCenter />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/inventory/:id" 
                          element={
                            <ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}>
                              <VDP />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/crm/customer/:id" 
                          element={
                            <ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}>
                              <CustomerProfile />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/appointments" 
                          element={
                            <ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}>
                              <Appointments />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/tasks" 
                          element={
                            <ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}>
                              <Tasks />
                            </ProtectedRoute>
                          } 
                        />
                        <Route path="/deal/:id" element={<SharedDeal />} />
                        <Route path="/status/:id" element={<ApplicationStatus />} />
                        <Route 
                          path="/screener" 
                          element={
                            <ProtectedRoute allowedRoles={['admin', 'manager']}>
                              <Screener />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/settings" 
                          element={
                            <ProtectedRoute allowedRoles={['admin', 'manager']}>
                              <Settings />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/bhph" 
                          element={
                            <ProtectedRoute allowedRoles={['admin', 'manager', 'f_and_i']}>
                              <BHPH />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/service" 
                          element={
                            <ProtectedRoute allowedRoles={['admin', 'manager', 'service']}>
                              <ServiceParts />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/logistics" 
                          element={
                            <ProtectedRoute allowedRoles={['admin', 'manager']}>
                              <Logistics />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/compliance" 
                          element={
                            <ProtectedRoute allowedRoles={['admin', 'f_and_i']}>
                              <Compliance />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/hr" 
                          element={
                            <ProtectedRoute allowedRoles={['admin', 'manager', 'f_and_i']}>
                              <HR />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/website" 
                          element={
                            <ProtectedRoute allowedRoles={['admin', 'manager', 'web']}>
                              <Website />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/aging-inventory" 
                          element={
                            <ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}>
                              <AgingInventory />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/spiff-board" 
                          element={
                            <ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}>
                              <SpiffBoard />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/hall-of-fame" 
                          element={
                            <ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}>
                              <SalespersonOfMonth />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/pay-plans"
                          element={
                            <ProtectedRoute allowedRoles={['admin', 'manager', 'f_and_i']}>
                              <PayPlans />
                            </ProtectedRoute>
                          } 
                        />

                        <Route path="/inbox" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}><Inbox /></ProtectedRoute>} />
                        <Route path="/auctions" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Auctions /></ProtectedRoute>} />
                        <Route path="/wholesale" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Wholesale /></ProtectedRoute>} />
                        <Route path="/recon" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Recon /></ProtectedRoute>} />
                        <Route path="/photo-studio" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}><PhotoStudio /></ProtectedRoute>} />
                        <Route path="/title-reg" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'f_and_i']}><TitleReg /></ProtectedRoute>} />
                        <Route path="/lenders" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'f_and_i']}><Lenders /></ProtectedRoute>} />
                        <Route path="/contracts" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'f_and_i']}><Contracts /></ProtectedRoute>} />
                        <Route path="/deal-jacket" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'f_and_i']}><DealJacket /></ProtectedRoute>} />
                        <Route path="/campaigns" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Campaigns /></ProtectedRoute>} />
                        <Route path="/floorplan" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Floorplan /></ProtectedRoute>} />
                        <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Reports /></ProtectedRoute>} />
                        <Route path="/doc" element={<ProtectedRoute allowedRoles={['admin', 'owner']}><DOC /></ProtectedRoute>} />
                        <Route path="/mobile-intake" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales', 'inventory']}><MobileIntake /></ProtectedRoute>} />
                        <Route path="/notifications" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales', 'service', 'inventory', 'porter', 'technician']}><PushNotifications /></ProtectedRoute>} />
                        <Route path="/test-drives" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}><TestDrives /></ProtectedRoute>} />
                        <Route path="/service-scheduler" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'service']}><ServiceScheduler /></ProtectedRoute>} />
                        <Route path="/warranty" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'f_and_i']}><Warranty /></ProtectedRoute>} />
                        <Route path="/bdc" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}><BDCCallCenter /></ProtectedRoute>} />
                        <Route path="/virtual-bdc" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}><VirtualBDC /></ProtectedRoute>} />
                        <Route path="/customer-portal" element={<CustomerPortal />} />
                        <Route path="/security-center" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><SecurityCenter /></ProtectedRoute>} />
                        <Route path="/kiosk" element={<ShowroomKiosk />} />
                        <Route path="/lot-management" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'inventory', 'porter']}><LotManagement /></ProtectedRoute>} />
                        <Route path="/technician-bay" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'service']}><TechnicianBay /></ProtectedRoute>} />
                        <Route path="/parts-department" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'service', 'inventory']}><PartsDepartment /></ProtectedRoute>} />
                        <Route path="/ai-follow-up" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}><AIFollowUp /></ProtectedRoute>} />
                        <Route path="/gamification" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}><Gamification /></ProtectedRoute>} />
                        <Route path="/deal-rescue" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}><DealRescue /></ProtectedRoute>} />
                        <Route path="/dashboard-builder" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}><DashboardBuilder /></ProtectedRoute>} />
                        <Route path="/customer-360" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}><Customer360 /></ProtectedRoute>} />
                        <Route path="/inventory-pricing" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'inventory']}><InventoryPricing /></ProtectedRoute>} />
                        <Route path="/deal-heatmap" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><DealHeatmap /></ProtectedRoute>} />
                        <Route path="/service-reminders" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'service']}><ServiceReminders /></ProtectedRoute>} />
                        <Route path="/video-messages" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}><VideoMessages /></ProtectedRoute>} />
                        <Route path="/texting-templates" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales']}><TextingTemplates /></ProtectedRoute>} />
                        <Route path="/audit-trail" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><AuditTrail /></ProtectedRoute>} />
                        <Route path="/compliance-checker" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'f_and_i']}><ComplianceChecker /></ProtectedRoute>} />
                        <Route path="/mobile-appraisal" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales', 'inventory']}><MobileTradeAppraisal /></ProtectedRoute>} />
                        <Route path="/lot-scanner" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'inventory', 'porter']}><LotScanner /></ProtectedRoute>} />
                        <Route path="/report-builder" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><ReportBuilder /></ProtectedRoute>} />

                        <Route path="/fleet-management" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'service', 'inventory']}><FleetManagement /></ProtectedRoute>} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </div>
                    
                    <MobileNav />
                    <MobileFab />
                  </main>
                </SidebarProvider>
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </DemoLockScreen>
    </QueryClientProvider>
  );
};

export default App;

