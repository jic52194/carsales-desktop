import { Plus, UserPlus, Car, ScanBarcode, Camera, CalendarPlus, CheckSquare, FileText, Save, Share2, Printer, Scan, Smartphone, Video, Wrench, MapPin, Package, Sparkles } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from './ui/dropdown-menu';
import { useLocation, useNavigate } from 'react-router-dom';

export function MobileFab() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const isIndex = location.pathname === '/';

  return (
    <div className="md:hidden fixed bottom-[104px] right-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="bg-primary text-primary-foreground p-4 rounded-full shadow-[0_8px_30px_-8px_rgba(var(--primary),0.5)] active:scale-90 transition-all flex items-center justify-center hover:bg-primary/90 h-[60px] w-[60px]">
            <Plus className="h-7 w-7" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 mb-2 rounded-xl shadow-xl border-slate-200/50 dark:border-slate-800/50 backdrop-blur-xl bg-white/95 dark:bg-slate-950/95">
          <DropdownMenuLabel className="text-xs text-slate-500 uppercase tracking-wider">Quick Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/crm', { state: { openNewLead: true } })} className="py-3 cursor-pointer">
            <UserPlus className="mr-3 h-5 w-5 text-blue-500" /> 
            <span className="font-medium text-base">New Lead</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/appraisals')} className="py-3 cursor-pointer">
            <Car className="mr-3 h-5 w-5 text-emerald-500" /> 
            <span className="font-medium text-base">New Appraisal</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/mobile-intake')} className="py-3 cursor-pointer">
            <Scan className="mr-3 h-5 w-5 text-amber-500" /> 
            <span className="font-medium text-base">Mobile Intake</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/mobile-intake')} className="py-3 cursor-pointer">
            <Camera className="mr-3 h-5 w-5 text-purple-500" /> 
            <span className="font-medium text-base">Photo Studio</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/appointments')} className="py-3 cursor-pointer">
            <CalendarPlus className="mr-3 h-5 w-5 text-rose-500" /> 
            <span className="font-medium text-base">Book Appointment</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/tasks')} className="py-3 cursor-pointer">
            <CheckSquare className="mr-3 h-5 w-5 text-indigo-500" /> 
            <span className="font-medium text-base">Add Task</span>
          </DropdownMenuItem>
          
          {isIndex && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-slate-500 uppercase tracking-wider">Deal Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigate('/credit-app')} className="py-3 cursor-pointer">
                <FileText className="mr-3 h-5 w-5 text-slate-500" /> <span className="font-medium text-base">Credit App</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('trigger-save-deal'))} className="py-3 cursor-pointer">
                <Save className="mr-3 h-5 w-5 text-slate-500" /> <span className="font-medium text-base">Save Deal</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('trigger-share-deal'))} className="py-3 cursor-pointer">
                <Share2 className="mr-3 h-5 w-5 text-slate-500" /> <span className="font-medium text-base">Share Deal</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('trigger-presentation'))} className="py-3 cursor-pointer">
                <Printer className="mr-3 h-5 w-5 text-slate-500" /> <span className="font-medium text-base">Presentation</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
