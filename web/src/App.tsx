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
import { OnboardingGate } from "@/components/OnboardingGate";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { AuthProvider, useAuth } from "@/lib/auth";
import { applyTenantTheme, resetTheme, useTenant } from "@/lib/tenant";
import Dashboard from "@/pages/Dashboard";
import Onboarding from "@/pages/Onboarding";
import Inventory from "@/pages/Inventory";
import VDP from "@/pages/VDP";
import Customers from "@/pages/Customers";
import Leads from "@/pages/Leads";
import Desking from "@/pages/Desking";
import Deals from "@/pages/Deals";
import Tasks from "@/pages/Tasks";
import Appointments from "@/pages/Appointments";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function Shell() {
  const { user, ready } = useAuth();
  const tenant = useTenant();

  // Platform (CarSalesSoftware.com) look until signed in; dealership brand after.
  useEffect(() => { if (user) applyTenantTheme(tenant); else resetTheme(); }, [user, tenant]);

  if (!ready) return <div className="fixed inset-0 bg-slate-950" />;
  if (!user) return <LoginScreen />;
  if (user.mustChangePassword) return <ChangePasswordScreen />;

  return (
    <BrowserRouter>
      <OnboardingGate />
      <OfflineIndicator />
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={
          <SidebarProvider>
            <AppSidebar />
            <main className="flex-1 w-full bg-slate-50 dark:bg-slate-900 relative flex flex-col min-w-0 h-[100dvh] overflow-hidden">
              <div className="shrink-0 flex items-center gap-3 px-3 md:px-5 h-14 border-b border-border/50 bg-background/90 backdrop-blur-md md:hidden">
                <SidebarTrigger />
                <img src={tenant.logoUrl} alt={tenant.name} className="h-7 w-auto object-contain" />
              </div>
              <div className="flex-1 overflow-y-auto">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/inventory/:id" element={<VDP />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/leads" element={<Leads />} />
                  <Route path="/desking" element={<Desking />} />
                  <Route path="/deals" element={<Deals />} />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/appointments" element={<Appointments />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
