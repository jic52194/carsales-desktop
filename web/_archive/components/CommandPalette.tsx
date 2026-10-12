import { useEffect, useState, useMemo } from "react"
import { Calculator, Calendar, Car, CreditCard, LayoutDashboard, Search, Settings, Users, FileText, CheckCircle2, LifeBuoy } from "lucide-react"
import { useNavigate } from "react-router-dom"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "./ui/command"

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const customers = useMemo(() => {
    try {
      const saved = localStorage.getItem('vibe_customers');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  }, [open]);

  const inventory = useMemo(() => {
    try {
      const saved = localStorage.getItem('vibe_inventory');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  }, [open]);

  const deals = useMemo(() => {
    try {
      const saved = localStorage.getItem('vibe_saved_deals');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  }, [open]);

  const tasks = useMemo(() => {
    try {
      const saved = localStorage.getItem('vibe_tasks');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  }, [open]);

  const leads = useMemo(() => {
    try {
      const saved = localStorage.getItem('vibe_crm_leads');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  }, [open]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    const openPalette = () => setOpen(true)

    document.addEventListener("keydown", down)
    window.addEventListener("open-command-palette", openPalette)
    return () => {
      document.removeEventListener("keydown", down)
      window.removeEventListener("open-command-palette", openPalette)
    }
  }, [])

  const runCommand = (command: () => void) => {
    setOpen(false)
    command()
  }

  return (
    <>
      <div 
        className="flex items-center gap-2 px-2 md:px-3 py-1.5 text-sm text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-md cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" 
        onClick={() => setOpen(true)}
      >
        <Search className="w-4 h-4" />
        <span className="hidden md:inline">Search...</span>
        <kbd className="hidden md:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
              <Calculator className="mr-2 h-4 w-4" />
              <span>New Deal (Desking)</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/credit-app"))}>
              <CreditCard className="mr-2 h-4 w-4" />
              <span>New Credit App</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          
          {customers.length > 0 && (
            <>
              <CommandGroup heading="Customers">
                {customers.map((c: any) => (
                  <CommandItem key={`c-${c.id}`} onSelect={() => runCommand(() => navigate(`/crm?customer=${c.id}`))}>
                    <Users className="mr-2 h-4 w-4 text-slate-400" />
                    <span>{c.name}</span>
                    {c.phone && <span className="ml-2 text-xs text-slate-500">{c.phone}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {leads.length > 0 && (
            <>
              <CommandGroup heading="CRM Leads">
                {leads.map((l: any) => (
                  <CommandItem key={`l-${l.id}`} onSelect={() => runCommand(() => navigate(`/crm?lead=${l.id}`))}>
                    <Users className="mr-2 h-4 w-4 text-slate-400" />
                    <span>{l.name}</span>
                    {l.status && <span className="ml-2 text-xs text-slate-500 capitalize">{l.status.replace('_', ' ')}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {tasks.length > 0 && (
            <>
              <CommandGroup heading="Tasks">
                {tasks.map((t: any) => (
                  <CommandItem key={`t-${t.id}`} onSelect={() => runCommand(() => navigate(`/tasks`))}>
                    <CheckCircle2 className="mr-2 h-4 w-4 text-slate-400" />
                    <span>{t.title}</span>
                    {t.status && <span className="ml-2 text-xs text-slate-500 capitalize">{t.status}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {inventory.length > 0 && (
            <>
              <CommandGroup heading="Inventory">
                {inventory.map((v: any) => (
                  <CommandItem key={`v-${v.id}`} onSelect={() => runCommand(() => navigate(`/inventory/${v.id}`))}>
                    <Car className="mr-2 h-4 w-4 text-slate-400" />
                    <span>{v.year} {v.make} {v.model}</span>
                    <span className="ml-2 text-xs text-slate-500">{v.vin}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {deals.length > 0 && (
            <>
              <CommandGroup heading="Saved Deals">
                {deals.map((d: any) => (
                  <CommandItem key={`d-${d.id}`} onSelect={() => runCommand(() => navigate(`/?deal=${d.id}`))}>
                    <FileText className="mr-2 h-4 w-4 text-slate-400" />
                    <span>Deal: {d.customerName} - {d.vehicle}</span>
                    <span className="ml-2 text-xs text-slate-500">{d.date}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => runCommand(() => navigate("/crm", { state: { openNewLead: true } }))}>
              <Users className="mr-2 h-4 w-4" />
              <span>New Lead</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />

          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => runCommand(() => navigate("/inventory"))}>
              <Car className="mr-2 h-4 w-4" />
              <span>Inventory</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/crm"))}>
              <Users className="mr-2 h-4 w-4" />
              <span>CRM & Customers</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/appointments"))}>
              <Calendar className="mr-2 h-4 w-4" />
              <span>Appointments</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/command-center"))}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Command Center</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/appraisals"))}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Appraisals</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/accounting"))}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Accounting</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/aging-inventory"))}>
              <Car className="mr-2 h-4 w-4" />
              <span>Aging Inventory</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/spiff-board"))}>
              <Users className="mr-2 h-4 w-4" />
              <span>Spiff Board</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/settings"))}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/deal-rescue"))}>
              <LifeBuoy className="mr-2 h-4 w-4 text-destructive" />
              <span>Deal Rescue</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/customer-360"))}>
              <Users className="mr-2 h-4 w-4 text-blue-400" />
              <span>Customer 360 Dossier</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/inventory-pricing"))}>
              <Car className="mr-2 h-4 w-4 text-emerald-400" />
              <span>AI Inventory Pricing</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/deal-heatmap"))}>
              <LayoutDashboard className="mr-2 h-4 w-4 text-orange-400" />
              <span>Deal Heatmap</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/video-messages"))}>
              <FileText className="mr-2 h-4 w-4 text-violet-400" />
              <span>Video Walkarounds</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/texting-templates"))}>
              <Users className="mr-2 h-4 w-4 text-blue-400" />
              <span>SMS Templates</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/audit-trail"))}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Audit Trail</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/compliance-checker"))}>
              <Settings className="mr-2 h-4 w-4 text-destructive" />
              <span>Red Flag Compliance Checker</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/mobile-appraisal"))}>
              <Car className="mr-2 h-4 w-4" />
              <span>Mobile Trade Appraisal</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/lot-scanner"))}>
              <Car className="mr-2 h-4 w-4" />
              <span>Lot Walk Scanner</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/report-builder"))}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Custom Report Builder</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/service-reminders"))}>
              <Calendar className="mr-2 h-4 w-4 text-amber-400" />
              <span>Service Reminders</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
