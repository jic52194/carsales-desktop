import React, { useState, useEffect } from 'react';
import { useTenant } from "@/lib/tenant";
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { AnimatedAIChat } from './AnimatedAIChat';


export const DemoLockScreen = ({ children, onBookDemo }: { children: React.ReactNode; onBookDemo?: () => void }) => {
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [password, setPassword] = useState('');
  const tenant = useTenant();


  useEffect(() => {
    const checkAuth = () => {
      const unlocked = sessionStorage.getItem('demo_unlocked');
      const unlockTime = sessionStorage.getItem('demo_unlock_time');
      
      if (unlocked !== 'true' || !unlockTime) {
        setIsUnlocked(false);
        return;
      }

      setIsUnlocked(true);
    };

    checkAuth();
    const interval = setInterval(checkAuth, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem('demo_unlocked');
    sessionStorage.removeItem('demo_unlock_time');
    toast.info('Signed out.');
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1234B') {
      sessionStorage.setItem('demo_unlocked', 'true');
      sessionStorage.setItem('demo_unlock_time', Date.now().toString());
      setIsUnlocked(true);
      toast.success(`Welcome to ${tenant.name}`);
      setPassword('');
    } else {
      toast.error('Incorrect password');
      setPassword('');
    }
  };



  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <div id="demo-scroll-container" className="fixed inset-0 z-[200] bg-slate-50 flex flex-col overflow-y-auto scroll-smooth justify-center pb-32 sm:pb-24">

      <div id="hero" className="flex-1 flex flex-col lg:flex-row items-center justify-center p-4 lg:p-12 gap-8 lg:gap-16 min-h-max shrink-0 pt-8 lg:pt-12 scroll-mt-24">
        
        {/* Left side: Login Form */}
        <div className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-2xl shadow-xl space-y-8 animate-in fade-in zoom-in duration-500 shrink-0">
          <div className="text-center space-y-4">
            <div className="mx-auto flex justify-center mb-6">
              <img src={tenant.logoUrl} alt={tenant.name} className="h-16 w-auto object-contain" />
            </div>
            <p className="text-slate-900 font-bold text-lg">{tenant.name}</p>
            <p className="text-slate-500 text-sm">Enter your dealership password to sign in.</p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-2">
              <Input 
                type="password" 
                placeholder="Enter password..." 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-50 border-slate-200 text-slate-900 text-center text-lg h-12"
                autoFocus
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-bold"
            >
              Sign In <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </form>
          
          <div className="text-center">
            <p className="text-xs text-slate-400">Powered by CarSales AI OS &middot; CarSalesSoftware.com &copy; {new Date().getFullYear()}</p>
          </div>
        </div>

        {/* Right side: Animated AI Panel */}
        <div className="w-full max-w-md h-[500px] lg:h-[600px] animate-in fade-in slide-in-from-right-8 duration-700 delay-300 fill-mode-both shrink-0">
          <AnimatedAIChat />
        </div>

      </div>


    </div>
  );
};

