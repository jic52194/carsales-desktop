import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LoginScreen } from "@/components/LoginScreen";
import { ChangePasswordScreen } from "@/components/ChangePasswordScreen";
import { TwoFactorScreen } from "@/components/TwoFactorScreen";
import { ViewAsBanner } from "@/components/ViewAsBanner";
import DemoBanner from "@/components/DemoBanner";
import BillingBanner from "@/components/BillingBanner";
import { OnboardingGate } from "@/components/OnboardingGate";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { AiPanel } from "@/components/AiPanel";
import { LeadNotifier } from "@/components/LeadNotifier";
import { TopBar } from "@/components/TopBar";
import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { MobileBottomNav } from "@/components/MobileBottomNav";
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
import WorkflowBuilder from "@/pages/WorkflowBuilder";
import Automations from "@/pages/Automations";
import DealRescue from "@/pages/DealRescue";
import Notifications from "@/pages/Notifications";
import SystemCheck from "@/pages/SystemCheck";
import NotFound from "@/pages/NotFound";
import PublicVehicle from "@/pages/PublicVehicle";

const queryClient = new QueryClient();

function Shell() {
  const { user, ready, mfaPending } = useAuth();
  const tenant = useTenant();

  // Platform (CarSalesSoftware.com) look until signed in; dealership brand after.
  useEffect(() => { if (user) applyTenantTheme(tenant); else resetTheme(); }, [user, tenant]);
  // Public pages (no sign-in): /v/<vehicle id> — the vehicle link texted to customers.
  {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const rel = window.location.pathname.startsWith(base) ? window.location.pathname.slice(base.length) : window.location.pathname;
    const pv = rel.match(/^\/v\/([0-9a-f-]{36})\/?$/i);
    if (pv) return <PublicVehicle id={pv[1]} />;
  }
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
      <CommandPalette />
      <KeyboardShortcuts />
      {/* Keep the floating AI button clear of the phone bottom nav. */}
      <style>{`@media (max-width: 767px){button[title="AI assistant"]{bottom:calc(5.25rem + env(safe-area-inset-bottom))!important}button[title="AI assistant"]+div{bottom:calc(9rem + env(safe-area-inset-bottom))!important}}`}</style>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={
          <SidebarProvider>
            <AppSidebar />
            <main className="flex-1 w-full bg-slate-50 dark:bg-slate-900 relative flex flex-col min-w-0 h-[100dvh] overflow-hidden">
              <ViewAsBanner />
              <DemoBanner />
              <BillingBanner />
              <TopBar />
              <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
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
                  <Route path="/automations" element={<Automations />} />
                  <Route path="/rescue" element={<DealRescue />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/system-check" element={<SystemCheck />} />
                  {/* Original (demo) URLs → real routes */}
                  <Route path="/crm" element={<Navigate to="/customers" replace />} />
                  <Route path="/customer-360" element={<Navigate to="/customers" replace />} />
                  <Route path="/dashboard-builder" element={<Navigate to="/my-dashboard" replace />} />
                  <Route path="/ai-follow-up" element={<Navigate to="/follow-up" replace />} />
                  <Route path="/deal-rescue" element={<Navigate to="/rescue" replace />} />
                  <Route path="/virtual-bdc" element={<Navigate to="/bdc" replace />} />
                  <Route path="/video-messages" element={<Navigate to="/videos" replace />} />
                  <Route path="/texting-templates" element={<Navigate to="/templates" replace />} />
                  <Route path="/spiff-board" element={<Navigate to="/leaderboard" replace />} />
                  <Route path="/gamification" element={<Navigate to="/leaderboard" replace />} />
                  <Route path="/hall-of-fame" element={<Navigate to="/leaderboard" replace />} />
                  <Route path="/inventory-pricing" element={<Navigate to="/pricing" replace />} />
                  <Route path="/aging-inventory" element={<Navigate to="/aging" replace />} />
                  <Route path="/photo-studio" element={<Navigate to="/photos" replace />} />
                  <Route path="/lot-management" element={<Navigate to="/lot" replace />} />
                  <Route path="/credit-app" element={<Navigate to="/credit-apps" replace />} />
                  <Route path="/deal-jacket" element={<Navigate to="/deals" replace />} />
                  <Route path="/service-scheduler" element={<Navigate to="/service" replace />} />
                  <Route path="/service-reminders" element={<Navigate to="/service/reminders" replace />} />
                  <Route path="/technician-bay" element={<Navigate to="/service/bay" replace />} />
                  <Route path="/parts-department" element={<Navigate to="/parts" replace />} />
                  <Route path="/command-center" element={<Navigate to="/command" replace />} />
                  <Route path="/security-center" element={<Navigate to="/security" replace />} />
                  <Route path="/deal-heatmap" element={<Navigate to="/heatmap" replace />} />
                  <Route path="/crm/workflows" element={<Navigate to="/workflows" replace />} />
                  <Route path="/index.html" element={<Navigate to="/" replace />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
              <MobileBottomNav />
            </main>
          </SidebarProvider>
        } />
      </Routes>
    </BrowserRouter>
  );
}


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
