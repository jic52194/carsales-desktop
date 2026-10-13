import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarMenuBadge,
  SidebarHeader,
  SidebarFooter,
  useSidebar
} from "@/components/ui/sidebar";
import { useTenant } from "@/lib/tenant";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Calculator, Car, LineChart, ShieldCheck, FileText, UserCircle, MapPin, Sparkles, FileCheck2, Calendar, Users, ListTodo, Target, Activity, Wrench, Truck, FileSignature, Receipt, Globe, Clock, DollarSign, Flame, Trophy, Inbox as InboxIcon, Gavel, Building2, Camera, FileBadge2, ShieldAlert, Landmark, Megaphone, Wallet, BarChart3, Users2, Briefcase, RotateCcw, Share2, Copy, Check, PhoneCall, Monitor, MonitorSmartphone, Bot, Shield, Package, ChevronUp, ChevronDown, Award, LifeBuoy, LayoutDashboard } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth, Role } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";


export function AppSidebar() {
  const location = useLocation();
  const { role, setRole, hasPermission } = useAuth();
  const { setOpenMobile } = useSidebar();
  const [isCopied, setIsCopied] = useState(false);
  const isMobile = useIsMobile();
  const [isFooterOpen, setIsFooterOpen] = useState(true);

  useEffect(() => {
    setIsFooterOpen(!isMobile);
  }, [isMobile]);
  
  const handleLinkClick = () => {
    setOpenMobile(false);
  };

  const tenant = useTenant();
  const shareUrl = "https://carsalessoftware.com/demo";

  return (
    <Sidebar>
      <SidebarHeader className={`border-b border-sidebar-border/50 ${isMobile ? 'p-4 flex items-center justify-center' : 'p-4'}`}>
        <Link to="/" className="block hover:opacity-80 transition-opacity active:scale-95" onClick={handleLinkClick}>
          <img src={tenant.logoUrl} alt={tenant.name} className={`w-auto object-contain ${isMobile ? 'h-16 max-w-[200px]' : 'h-9 max-w-[180px]'}`} />
        </Link>
      </SidebarHeader>
      <SidebarContent data-sidebar="menu">
        {/* TODAY */}
        <SidebarGroup>
          <SidebarGroupLabel>Today</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {hasPermission(['admin', 'manager', 'sales']) && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/dashboard-builder'} data-tour-id="nav-dashboard-builder">
                      <Link to="/dashboard-builder" onClick={handleLinkClick}><LayoutDashboard className="h-4 w-4" /> <span>My Dashboard</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/tasks'} data-tour-id="nav-tasks">
                      <Link to="/tasks" onClick={handleLinkClick}><ListTodo className="h-4 w-4" /> <span>My Tasks</span></Link>
                    </SidebarMenuButton>
                    <SidebarMenuBadge className="bg-destructive text-destructive-foreground rounded-full text-[10px] px-1.5 min-w-[20px] flex items-center justify-center">12</SidebarMenuBadge>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/inbox'}>
                      <Link to="/inbox" onClick={handleLinkClick}><InboxIcon className="h-4 w-4" /> <span>Inbox</span></Link>
                    </SidebarMenuButton>
                    <SidebarMenuBadge className="bg-destructive text-destructive-foreground rounded-full text-[10px] px-1.5 min-w-[20px] flex items-center justify-center">3</SidebarMenuBadge>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* SALES */}
        <SidebarGroup>
          <SidebarGroupLabel>Sales & CRM</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === '/'} data-tour-id="nav-home">
                  <Link to="/" onClick={handleLinkClick}><Calculator className="h-4 w-4" /> <span>Desking</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {hasPermission(['admin', 'manager', 'sales']) && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/crm'} data-tour-id="nav-crm">
                      <Link to="/crm" onClick={handleLinkClick}><Users className="h-4 w-4" /> <span>Customers (CRM)</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/customer-360'}>
                      <Link to="/customer-360" onClick={handleLinkClick}><UserCircle className="h-4 w-4" /> <span>Customer 360</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/deal-heatmap'}>
                      <Link to="/deal-heatmap" onClick={handleLinkClick}><Activity className="h-4 w-4 text-orange-500" /> <span>Deal Heatmap</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/crm/workflows'} data-tour-id="nav-workflows">
                      <Link to="/crm/workflows" onClick={handleLinkClick}><Activity className="h-4 w-4" /> <span>Workflows</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/ai-follow-up'}>
                      <Link to="/ai-follow-up" onClick={handleLinkClick}><Sparkles className="h-4 w-4 text-emerald-500" /> <span>AI Follow-Up</span></Link>
                    </SidebarMenuButton>
                    <SidebarMenuBadge className="bg-emerald-500 text-white rounded-full text-[10px] px-1.5 min-w-[20px] flex items-center justify-center animate-pulse">3</SidebarMenuBadge>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/deal-rescue'}>
                      <Link to="/deal-rescue" onClick={handleLinkClick}><LifeBuoy className="h-4 w-4 text-destructive" /> <span>Deal Rescue</span></Link>
                    </SidebarMenuButton>
                    <SidebarMenuBadge className="bg-destructive text-white rounded-full text-[10px] px-1.5 min-w-[20px] flex items-center justify-center animate-pulse">14</SidebarMenuBadge>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/gamification'}>
                      <Link to="/gamification" onClick={handleLinkClick}><Trophy className="h-4 w-4 text-yellow-500" /> <span>Leaderboards</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/virtual-bdc'}>
                      <Link to="/virtual-bdc" onClick={handleLinkClick}><Bot className="h-4 w-4 text-violet-500" /> <span>Virtual BDC</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/bdc'}>
                      <Link to="/bdc" onClick={handleLinkClick}><PhoneCall className="h-4 w-4" /> <span>BDC Call Center</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/appointments'} data-tour-id="nav-appointments">
                      <Link to="/appointments" onClick={handleLinkClick}><Calendar className="h-4 w-4" /> <span>Appointments</span></Link>
                    </SidebarMenuButton>
                    <SidebarMenuBadge className="bg-primary text-primary-foreground rounded-full text-[10px] px-1.5 min-w-[20px] flex items-center justify-center">2</SidebarMenuBadge>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/test-drives'}>
                      <Link to="/test-drives" onClick={handleLinkClick}><Car className="h-4 w-4" /> <span>Test Drives</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/appraisals'} data-tour-id="nav-appraisals">
                      <Link to="/appraisals" onClick={handleLinkClick}><FileCheck2 className="h-4 w-4" /> <span>Appraisals</span></Link>
                    </SidebarMenuButton>
                    <SidebarMenuBadge className="bg-amber-500 text-white rounded-full text-[10px] px-1.5 min-w-[20px] flex items-center justify-center">5</SidebarMenuBadge>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/video-messages'}>
                      <Link to="/video-messages" onClick={handleLinkClick}><Camera className="h-4 w-4" /> <span>Video Walkarounds</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/texting-templates'}>
                      <Link to="/texting-templates" onClick={handleLinkClick}><PhoneCall className="h-4 w-4" /> <span>SMS Templates</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/spiff-board'}>
                      <Link to="/spiff-board" onClick={handleLinkClick}><Flame className="h-4 w-4" /> <span>Spiff Board</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/hall-of-fame'}>
                      <Link to="/hall-of-fame" onClick={handleLinkClick}><Trophy className="h-4 w-4" /> <span>Hall of Fame</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* INVENTORY */}
        <SidebarGroup>
          <SidebarGroupLabel>Inventory & Ops</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {hasPermission(['admin', 'manager', 'sales', 'inventory']) && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/inventory'} data-tour-id="nav-inventory">
                      <Link to="/inventory" onClick={handleLinkClick}><Car className="h-4 w-4" /> <span>Inventory</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/inventory-pricing'}>
                      <Link to="/inventory-pricing" onClick={handleLinkClick}><DollarSign className="h-4 w-4 text-emerald-500" /> <span>AI Pricing</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/mobile-appraisal'}>
                      <Link to="/mobile-appraisal" onClick={handleLinkClick}><FileCheck2 className="h-4 w-4" /> <span>Mobile Appraisal</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/aging-inventory'}>
                      <Link to="/aging-inventory" onClick={handleLinkClick}><Clock className="h-4 w-4" /> <span>Aging Inventory</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
              {hasPermission(['admin', 'manager', 'inventory']) && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/screener'}>
                      <Link to="/screener" onClick={handleLinkClick}><Target className="h-4 w-4" /> <span>Inventory Screener</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/acquisition'}>
                      <Link to="/acquisition" onClick={handleLinkClick}><MapPin className="h-4 w-4" /> <span>Acquisition</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/auctions'}>
                      <Link to="/auctions" onClick={handleLinkClick}><Gavel className="h-4 w-4" /> <span>Auctions</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/wholesale'}>
                      <Link to="/wholesale" onClick={handleLinkClick}><Building2 className="h-4 w-4" /> <span>Wholesale</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/recon'}>
                      <Link to="/recon" onClick={handleLinkClick}><Wrench className="h-4 w-4" /> <span>Reconditioning</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/photo-studio'}>
                      <Link to="/photo-studio" onClick={handleLinkClick}><Camera className="h-4 w-4" /> <span>Photo Studio</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/kiosk'}>
                      <Link to="/kiosk" onClick={handleLinkClick}><Monitor className="h-4 w-4" /> <span>Showroom Kiosk</span></Link>
                    </SidebarMenuButton>
                    <SidebarMenuBadge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[8px] uppercase font-black">AI Auto</SidebarMenuBadge>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/logistics'}>
                      <Link to="/logistics" onClick={handleLinkClick}><Truck className="h-4 w-4" /> <span>Logistics & Transport</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/floorplan'}>
                      <Link to="/floorplan" onClick={handleLinkClick}><Wallet className="h-4 w-4" /> <span>Floorplan</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
              {hasPermission(['admin', 'manager', 'inventory', 'porter']) && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/lot-management'}>
                      <Link to="/lot-management" onClick={handleLinkClick}><MapPin className="h-4 w-4" /> <span>Lot Management</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/lot-scanner'}>
                      <Link to="/lot-scanner" onClick={handleLinkClick}><MapPin className="h-4 w-4 text-primary" /> <span>Lot Walk Scanner</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* F&I */}
        <SidebarGroup>
          <SidebarGroupLabel>F&I & Compliance</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === '/credit-app'}>
                  <Link to="/credit-app" onClick={handleLinkClick}><FileText className="h-4 w-4" /> <span>Credit Apps</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {hasPermission(['admin', 'f_and_i']) && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/contracts'}>
                      <Link to="/contracts" onClick={handleLinkClick}><FileSignature className="h-4 w-4" /> <span>Contracts</span></Link>
                    </SidebarMenuButton>
                    <SidebarMenuBadge className="bg-emerald-500 text-white rounded-full text-[10px] px-1.5 min-w-[20px] flex items-center justify-center">8</SidebarMenuBadge>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/deal-jacket'} data-tour-id="nav-deal-jacket">
                      <Link to="/deal-jacket" onClick={handleLinkClick}><Briefcase className="h-4 w-4" /> <span>Deal Jacket</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/lenders'}>
                      <Link to="/lenders" onClick={handleLinkClick}><Landmark className="h-4 w-4" /> <span>Lenders</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/warranty'}>
                      <Link to="/warranty" onClick={handleLinkClick}><Shield className="h-4 w-4" /> <span>Warranty & Ins.</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/compliance'}>
                      <Link to="/compliance" onClick={handleLinkClick}><ShieldAlert className="h-4 w-4" /> <span>Compliance</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/compliance-checker'}>
                      <Link to="/compliance-checker" onClick={handleLinkClick}><ShieldAlert className="h-4 w-4 text-destructive" /> <span>Red Flag Checker</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/audit-trail'}>
                      <Link to="/audit-trail" onClick={handleLinkClick}><Shield className="h-4 w-4" /> <span>Audit Trail</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/title-reg'}>
                      <Link to="/title-reg" onClick={handleLinkClick}><FileBadge2 className="h-4 w-4" /> <span>Title & Reg</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* SERVICE */}
        {hasPermission(['admin', 'manager', 'service']) && (
          <SidebarGroup>
            <SidebarGroupLabel>Service</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === '/service-scheduler'}>
                    <Link to="/service-scheduler" onClick={handleLinkClick}><Calendar className="h-4 w-4" /> <span>Scheduler</span></Link>
                  </SidebarMenuButton>
                  <SidebarMenuBadge className="bg-destructive text-destructive-foreground rounded-full text-[10px] px-1.5 min-w-[20px] flex items-center justify-center">1</SidebarMenuBadge>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === '/service-reminders'}>
                    <Link to="/service-reminders" onClick={handleLinkClick}><Sparkles className="h-4 w-4 text-amber-500" /> <span>Service Reminders</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/technician-bay'}>
                      <Link to="/technician-bay" onClick={handleLinkClick}><Wrench className="h-4 w-4" /> <span>Technician Bay</span></Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === '/parts-department'}>
                    <Link to="/parts-department" onClick={handleLinkClick}><Package className="h-4 w-4" /> <span>Parts Department</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === '/fleet-management'}>
                    <Link to="/fleet-management" onClick={handleLinkClick}><Car className="h-4 w-4" /> <span>Fleet & Loaners</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/service'} data-tour-id="nav-service">
                      <Link to="/service" onClick={handleLinkClick}><Wrench className="h-4 w-4" /> <span>Service & Parts</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* BHPH */}
        {hasPermission(['admin', 'f_and_i']) && (
          <SidebarGroup>
            <SidebarGroupLabel>BHPH</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === '/bhph'}>
                    <Link to="/bhph" onClick={handleLinkClick}><Activity className="h-4 w-4" /> <span>BHPH Portfolio</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* OFFICE */}
        {hasPermission(['admin', 'manager', 'f_and_i']) && (
          <SidebarGroup>
            <SidebarGroupLabel>Back Office</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === '/accounting'}>
                    <Link to="/accounting" onClick={handleLinkClick}><ShieldCheck className="h-4 w-4" /> <span>Accounting</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === '/accounts-payable'}>
                    <Link to="/accounts-payable" onClick={handleLinkClick}><Building2 className="h-4 w-4" /> <span>Accounts Payable</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === '/hr'}>
                    <Link to="/hr" onClick={handleLinkClick}><Users2 className="h-4 w-4" /> <span>HR & Payroll</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === '/pay-plans'}>
                    <Link to="/pay-plans" onClick={handleLinkClick}><DollarSign className="h-4 w-4" /> <span>Pay Plans</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* MARKETING */}
        {hasPermission(['admin', 'manager']) && (
          <SidebarGroup>
            <SidebarGroupLabel>Marketing</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === '/campaigns'}>
                    <Link to="/campaigns" onClick={handleLinkClick}><Megaphone className="h-4 w-4" /> <span>Campaigns</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === '/website'} className={hasPermission(['admin', 'manager', 'web']) ? "" : "hidden"}>
                    <Link to="/website" onClick={handleLinkClick}><Globe className="h-4 w-4" /> <span>Website CMS</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/customer-portal'} data-tour-id="nav-customer-portal">
                      <Link to="/customer-portal" onClick={handleLinkClick}><MonitorSmartphone className="h-4 w-4" /> <span>Customer Portal</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* INSIGHTS */}
        {hasPermission(['admin', 'manager']) && (
          <SidebarGroup>
            <SidebarGroupLabel>Insights</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === '/command-center'} data-tour-id="nav-command-center">
                    <Link to="/command-center" onClick={handleLinkClick}><Sparkles className="h-4 w-4" /> <span>Command Center</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === '/doc'}>
                    <Link to="/doc" onClick={handleLinkClick}><FileText className="h-4 w-4" /> <span>Daily Op Control</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === '/metrics'}>
                    <Link to="/metrics" onClick={handleLinkClick}><LineChart className="h-4 w-4" /> <span>Metrics</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === '/reports'} data-tour-id="nav-reports">
                    <Link to="/reports" onClick={handleLinkClick}><BarChart3 className="h-4 w-4" /> <span>Reports</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === '/report-builder'}>
                    <Link to="/report-builder" onClick={handleLinkClick}><BarChart3 className="h-4 w-4 text-primary" /> <span>Report Builder</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* SETTINGS */}
        {hasPermission(['admin', 'manager']) && (
          <SidebarGroup>
            <SidebarGroupLabel>Settings</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === '/settings'} data-tour-id="nav-settings">
                    <Link to="/settings" onClick={handleLinkClick}><Sparkles className="h-4 w-4" /> <span>System Settings</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === '/security-center'}>
                    <Link to="/security-center" onClick={handleLinkClick}><Shield className="h-4 w-4" /> <span>Security Center</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <Collapsible open={isFooterOpen} onOpenChange={setIsFooterOpen} className="w-full space-y-4">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full flex items-center justify-between p-2 h-auto text-sidebar-foreground/70 hover:text-sidebar-foreground">
              <div className="flex items-center gap-2 text-sm font-medium">
                <UserCircle className="h-4 w-4" />
                <span>Active Role & Settings</span>
              </div>
              {isFooterOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4">
            <div className="space-y-2">
              <Select value={role} onValueChange={(val) => setRole(val as Role)}>
                <SelectTrigger className="w-full bg-sidebar-accent border-sidebar-border">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner / Executive (All Access)</SelectItem>
                  <SelectItem value="admin">System Admin</SelectItem>
                  <SelectItem value="manager">Sales Manager</SelectItem>
                  <SelectItem value="sales">Sales Associate</SelectItem>
                  <SelectItem value="f_and_i">F&I Manager</SelectItem>
                  <SelectItem value="service">Service Manager</SelectItem>
                  <SelectItem value="technician">Service Technician</SelectItem>
                  <SelectItem value="inventory">Inventory Manager</SelectItem>
                  <SelectItem value="web">Web Designer</SelectItem>
                  <SelectItem value="porter">Lot Attendant / Porter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {tenant.id === "demo" && (
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start text-primary hover:text-primary hover:bg-primary/10 border-primary/20"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share this Demo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Share CarSales OS</DialogTitle>
                  <DialogDescription>
                    Send this demo to a colleague or dealer friend to show them what they're missing.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex items-center space-x-2 mt-4">
                  <div className="grid flex-1 gap-2">
                    <Label htmlFor="demo-link" className="sr-only">
                      Link
                    </Label>
                    <Input
                      id="demo-link"
                      defaultValue={shareUrl}
                      readOnly
                      className="bg-slate-50 dark:bg-slate-900 font-mono text-sm"
                    />
                  </div>
                  <Button type="button" size="sm" className="px-3 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    setIsCopied(true);
                    toast.success("Demo link copied to clipboard!");
                    setTimeout(() => setIsCopied(false), 2000);
                  }}>
                    <span className="sr-only">Copy</span>
                    {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            )}

            {tenant.id === "demo" && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900"
              onClick={() => {
                window.dispatchEvent(new Event('start-demo-tour'));
                setOpenMobile(false);
              }}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Start Guided Tour
            </Button>
            )}



            {tenant.id === "demo" && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={() => {
                window.dispatchEvent(new Event('show-whats-new'));
                setOpenMobile(false);
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              View What's New
            </Button>
            )}

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
              onClick={() => {
                sessionStorage.removeItem('demo_unlocked');
                sessionStorage.removeItem('demo_unlock_time');
                window.location.reload();
              }}
            >
              <ShieldAlert className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </SidebarFooter>
    </Sidebar>
  );
}
