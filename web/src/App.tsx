import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LoginScreen } from "@/components/LoginScreen";
import { ChangePasswordScreen } from "@/components/ChangePasswordScreen";
import { TwoFactorScreen } from "@/components/TwoFactorScreen";
import { ViewAsBanner } from "@/components/ViewAsBanner";
import { OnboardingGate } from "@/components/OnboardingGate";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { AiPanel } from "@/components/AiPanel";
import { LeadNotifier } from "@/components/LeadNotifier";
import { AuthProvider, useAuth } from "@/lib/auth";
import { applyTenantTheme, resetTheme, useTenant } from "@/lib/tenant";
import Dashboard from "@/pages/Dashboard";
import Onboarding from "@/pages/Onboarding";
import Inventory from "@/pages/Inventory";
import VDP from "@/pages/VDP";
import Customers from "@/pages/Customers";
import CustomerProfile from "@/pages/CustomerProfile";
import Leads from "@/pages/Leads";
import Desking from "@/pages/Desking";
import Deals from "@/pages/Deals";
import Tasks from "@/pages/Tasks";
import Appointments from "@/pages/Appointments";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import Dealerships from "@/pages/Dealerships";
import Appraisals from "@/pages/Appraisals";
import TestDrives from "@/pages/TestDrives";
import DealJacket from "@/pages/DealJacket";
import CreditApp from "@/pages/CreditApp";
import Lenders from "@/pages/Lenders";
import TitleReg from "@/pages/TitleReg";
import Compliance from "@/pages/Compliance";
import BHPH from "@/pages/BHPH";
import AgingInventory from "@/pages/AgingInventory";
import InventoryPricing from "@/pages/InventoryPricing";
import Recon from "@/pages/Recon";
import PhotoStudio from "@/pages/PhotoStudio";
import LotManagement from "@/pages/LotManagement";
import Acquisition from "@/pages/Acquisition";
import Wholesale from "@/pages/Wholesale";
import Floorplan from "@/pages/Floorplan";
import Auctions from "@/pages/Auctions";
import TextingTemplates from "@/pages/TextingTemplates";
import AIFollowUp from "@/pages/AIFollowUp";
import InboxPage from "@/pages/Inbox";
import Campaigns from "@/pages/Campaigns";
import BDC from "@/pages/BDC";
import VideoMessages from "@/pages/VideoMessages";
import ShowroomKiosk from "@/pages/ShowroomKiosk";
import Website from "@/pages/Website";
import ServiceScheduler from "@/pages/ServiceScheduler";
import ServiceReminders from "@/pages/ServiceReminders";
import TechnicianBay from "@/pages/TechnicianBay";
import Parts from "@/pages/Parts";
import Warranty from "@/pages/Warranty";
import Accounting from "@/pages/Accounting";
import AccountsPayable from "@/pages/AccountsPayable";
import DOC from "@/pages/DOC";
import HR from "@/pages/HR";
import PayPlans from "@/pages/PayPlans";
import Leaderboard from "@/pages/Leaderboard";
import CommandCenter from "@/pages/CommandCenter";
import Metrics from "@/pages/Metrics";
import ReportBuilder from "@/pages/ReportBuilder";
import DashboardBuilder from "@/pages/DashboardBuilder";
import DealHeatmap from "@/pages/DealHeatmap";
import SecurityCenter from "@/pages/SecurityCenter";
import WorkflowBuilder, { useWorkflowRunner } from "@/pages/WorkflowBuilder";
import DealRescue from "@/pages/DealRescue";
import Notifications from "@/pages/Notifications";
import SystemCheck from "@/pages/SystemCheck";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function Shell() {
  const { user, ready, mfaPending, location: store } = useAuth();
  const tenant = useTenant();
  // Store (location) branding wins over the dealership's when the user is attached to a store.
  const brandLogo = store?.logoUrl || tenant.logoUrl;
  const brandName = store?.brandName || tenant.name;

  // Platform (CarSalesSoftware.com) look until signed in; dealership brand after.
  useEffect(() => { if (user) applyTenantTheme(tenant); else resetTheme(); }, [user, tenant]);
  if (!ready) return <div className="fixed inset-0 bg-slate-950" />;
  if (!user && mfaPending) return <TwoFactorScreen />;
  if (!user) return <LoginScreen />;
  // Branded login lives at /login/<slug>; once signed in, land on the app root before the router reads the URL.
  {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const rel = window.location.pathname.startsWith(base) ? window.location.pathname.slice(base.length) : window.location.pathname;
    if (/^\/login(\/|$)/.test(rel)) window.history.replaceState(null, "", base || "/");
  }
  if (user.mustChangePassword) return <ChangePasswordScreen />;

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <OnboardingGate />
      <OfflineIndicator />
      <AiPanel />
      <LeadNotifier />
      <WorkflowRunner />
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={
          <SidebarProvider>
            <AppSidebar />
            <main className="flex-1 w-full bg-slate-50 dark:bg-slate-900 relative flex flex-col min-w-0 h-[100dvh] overflow-hidden">
              <ViewAsBanner />
              <div className="shrink-0 flex items-center gap-3 px-3 md:px-5 h-14 border-b border-border/50 bg-background/90 backdrop-blur-md md:hidden">
                <SidebarTrigger />
                {brandLogo ? <img src={brandLogo} alt="" className="h-7 w-auto object-contain" onError={(e) => { const el = e.target as HTMLImageElement; el.style.display = "none"; (el.nextSibling as HTMLElement | null)?.classList.remove("hidden"); }} /> : null}<span className={`font-bold truncate ${brandLogo ? "hidden" : ""}`}>{brandName}</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/inventory/:id" element={<VDP />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/customers/:id" element={<CustomerProfile />} />
                  <Route path="/leads" element={<Leads />} />
                  <Route path="/desking" element={<Desking />} />
                  <Route path="/deals" element={<Deals />} />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/appointments" element={<Appointments />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/dealerships" element={<Dealerships />} />
                  <Route path="/appraisals" element={<Appraisals />} />
                  <Route path="/test-drives" element={<TestDrives />} />
                  <Route path="/deals/:id/jacket" element={<DealJacket />} />
                  <Route path="/credit-apps" element={<CreditApp />} />
                  <Route path="/lenders" element={<Lenders />} />
                  <Route path="/title-reg" element={<TitleReg />} />
                  <Route path="/compliance" element={<Compliance />} />
                  <Route path="/bhph" element={<BHPH />} />
                  <Route path="/aging" element={<AgingInventory />} />
                  <Route path="/pricing" element={<InventoryPricing />} />
                  <Route path="/recon" element={<Recon />} />
                  <Route path="/photos" element={<PhotoStudio />} />
                  <Route path="/lot" element={<LotManagement />} />
                  <Route path="/acquisition" element={<Acquisition />} />
                  <Route path="/wholesale" element={<Wholesale />} />
                  <Route path="/floorplan" element={<Floorplan />} />
                  <Route path="/auctions" element={<Auctions />} />
                  <Route path="/templates" element={<TextingTemplates />} />
                  <Route path="/follow-up" element={<AIFollowUp />} />
                  <Route path="/inbox" element={<InboxPage />} />
                  <Route path="/campaigns" element={<Campaigns />} />
                  <Route path="/bdc" element={<BDC />} />
                  <Route path="/videos" element={<VideoMessages />} />
                  <Route path="/kiosk" element={<ShowroomKiosk />} />
                  <Route path="/website" element={<Website />} />
                  <Route path="/service" element={<ServiceScheduler />} />
                  <Route path="/service/reminders" element={<ServiceReminders />} />
                  <Route path="/service/bay" element={<TechnicianBay />} />
                  <Route path="/parts" element={<Parts />} />
                  <Route path="/warranty" element={<Warranty />} />
                  <Route path="/accounting" element={<Accounting />} />
                  <Route path="/accounts-payable" element={<AccountsPayable />} />
                  <Route path="/doc" element={<DOC />} />
                  <Route path="/hr" element={<HR />} />
                  <Route path="/pay-plans" element={<PayPlans />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/command" element={<CommandCenter />} />
                  <Route path="/metrics" element={<Metrics />} />
                  <Route path="/report-builder" element={<ReportBuilder />} />
                  <Route path="/my-dashboard" element={<DashboardBuilder />} />
                  <Route path="/heatmap" element={<DealHeatmap />} />
                  <Route path="/security" element={<SecurityCenter />} />
                  <Route path="/workflows" element={<WorkflowBuilder />} />
                  <Route path="/rescue" element={<DealRescue />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/system-check" element={<SystemCheck />} />
                  <Route path="/index.html" element={<Navigate to="/" replace />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </main>
          </SidebarProvider>
        } />
      </Routes>
    </BrowserRouter>
  );
}

function WorkflowRunner() { useWorkflowRunner(); return null; }

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="bottom-center" />
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
