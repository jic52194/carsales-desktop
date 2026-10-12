import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TOUR_BRANCHES, getBranchForRoute, TourStep } from '@/tourSteps';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, ChevronRight, ChevronLeft, X, Volume2, VolumeX, Bot, Sparkles, Pause } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

export function DemoTour() {
  const [isActive, setIsActive] = useState(false);
  const [activeBranch, setActiveBranch] = useState<string>('intro');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const currentSteps = TOUR_BRANCHES[activeBranch] || TOUR_BRANCHES.intro;
  const currentStep = currentSteps[currentStepIndex];

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (isMuted) return;
    
    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find a good English voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) || 
                           voices.find(v => v.lang === 'en-US');
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  }, [isMuted, stopSpeaking]);

  const updateTargetRect = useCallback(() => {
    if (!isActive || !currentStep) return;
    
    let el = document.querySelector(currentStep.targetSelector) as HTMLElement;
    if (!el && currentStep.fallbackSelector) {
      el = document.querySelector(currentStep.fallbackSelector) as HTMLElement;
    }
    
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Wait a bit for scroll to finish
      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
        // Only speak after we found and scrolled to the target
        if (currentStep) {
          speak(currentStep.voiceoverText);
        }
      }, 500);
    } else {
      setTargetRect(null);
      // Speak anyway if we couldn't find the target, so it doesn't get stuck
      if (currentStep) {
        speak(currentStep.voiceoverText);
      }
    }
  }, [isActive, currentStep, speak]);

  // Handle route changes and interactive branching
  useEffect(() => {
    if (!isActive || !currentStep) return;

    if (currentStep.interactive) {
      // If we are in an interactive step and the route changes, switch to the new branch!
      if (location.pathname !== currentStep.route) {
        const newBranch = getBranchForRoute(location.pathname);
        
        console.log(`[Analytics] Tour path selected: ${newBranch} via ${location.pathname}`);
        toast.success(`Great choice! Let's explore the ${newBranch} features.`);
        
        setActiveBranch(newBranch);
        setCurrentStepIndex(0);
      }
    } else if (location.pathname !== currentStep.route) {
      // Normal step: enforce the route
      navigate(currentStep.route);
    }
  }, [isActive, currentStep, location.pathname, navigate]);

  // Update rect when route changes or step changes
  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => {
        updateTargetRect();
        if (currentStep?.action && !isPaused) {
          window.dispatchEvent(new CustomEvent(currentStep.action));
        }
      }, 800); // Wait for page load/animation
      
      let autoAdvanceTimer: NodeJS.Timeout;
      if (currentStep?.autoAdvanceDelay && !isPaused) {
        autoAdvanceTimer = setTimeout(() => {
          nextStep();
        }, currentStep.autoAdvanceDelay);
      }
      
      return () => {
        clearTimeout(timer);
        if (autoAdvanceTimer!) clearTimeout(autoAdvanceTimer);
      };
    }
  }, [isActive, currentStepIndex, location.pathname, updateTargetRect, currentStep, isPaused]);

  // Handle resize
  useEffect(() => {
    window.addEventListener('resize', updateTargetRect);
    return () => window.removeEventListener('resize', updateTargetRect);
  }, [updateTargetRect]);

  const startTour = (branch: string = 'intro') => {
    setIsActive(true);
    setActiveBranch(branch);
    setCurrentStepIndex(0);
    setIsPaused(false);
  };

  const stopTour = () => {
    setIsActive(false);
    stopSpeaking();
    setTargetRect(null);
    toast.info("Tour stopped. Feel free to explore!");
  };

  const nextStep = () => {
    if (currentStepIndex < currentSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      stopTour();
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // Listen for global start event
  useEffect(() => {
    const handleStart = () => startTour();
    const handleStartStory = () => startTour('storyMode');
    const handleStartSpotlight = () => startTour('spotlight');
    
    window.addEventListener('start-demo-tour', handleStart);
    window.addEventListener('start-story-mode', handleStartStory);
    window.addEventListener('start-spotlight-tour', handleStartSpotlight);
    
    return () => {
      window.removeEventListener('start-demo-tour', handleStart);
      window.removeEventListener('start-story-mode', handleStartStory);
      window.removeEventListener('start-spotlight-tour', handleStartSpotlight);
    };
  }, []);

  // Auto-launch spotlight tour
  useEffect(() => {
    const isUnlocked = sessionStorage.getItem('demo_unlocked') === 'true';
    const hasSeenSpotlight = localStorage.getItem('spotlight_tour_seen') === 'true';
    
    if (isUnlocked && !hasSeenSpotlight) {
      const timer = setTimeout(() => {
        startTour('spotlight');
        localStorage.setItem('spotlight_tour_seen', 'true');
      }, 2000); // 2 seconds after unlock
      return () => clearTimeout(timer);
    }
  }, []);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Overlay - allows clicks through during interactive steps */}
      <div className={`absolute inset-0 transition-all duration-500 ${currentStep?.interactive ? 'bg-slate-900/40 pointer-events-none' : 'bg-slate-900/60 backdrop-blur-sm pointer-events-auto'}`} />
      
      {/* Highlight Cutout */}
      {targetRect && (
        <div 
          className={`absolute border-2 border-primary rounded-xl shadow-[0_0_0_9999px_rgba(15,23,42,0.6),0_0_30px_rgba(26,79,177,0.5)] transition-all duration-500 ease-in-out ${currentStep?.interactive ? 'pointer-events-none' : 'pointer-events-auto'}`}
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        >
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-emerald-500 rounded-full" />
        </div>
      )}

      {/* Tooltip Dialog */}
      <Card 
        className="absolute w-[calc(100vw-32px)] sm:w-[360px] shadow-2xl border-primary/30 bg-background/95 backdrop-blur-xl pointer-events-auto transition-all duration-500 ease-in-out z-[101] overflow-hidden"
        style={{
          ...(targetRect ? {
            top: targetRect.bottom + 24 > window.innerHeight - 200 
                 ? Math.max(20, targetRect.top - 240) 
                 : targetRect.bottom + 24,
            left: window.innerWidth < 640 
              ? 16 
              : Math.min(
                  window.innerWidth - 380, 
                  Math.max(20, targetRect.left + (targetRect.width / 2) - 180)
                )
          } : {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          })
        }}
      >
        <div className="h-1.5 w-full bg-muted overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500" 
            style={{ width: `${((currentStepIndex + 1) / currentSteps.length) * 100}%` }}
          />
        </div>
        <CardContent className="p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="relative">
              <Avatar className="h-10 w-10 border-2 border-primary/20 shadow-sm">
                <AvatarImage src="https://vibe.filesafe.space/1778548756560730619/assets/8ba4b31f-8962-4fb4-b004-c6b9cf77c133.png" />
                <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
              </Avatar>
              {isSpeaking && (
                <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-0.5 shadow-sm">
                  <div className="flex items-end gap-0.5 h-2.5 px-0.5">
                    <div className="w-0.5 bg-white h-1.5 animate-pulse" style={{ animationDelay: '0ms' }} />
                    <div className="w-0.5 bg-white h-2.5 animate-pulse" style={{ animationDelay: '150ms' }} />
                    <div className="w-0.5 bg-white h-1 animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg leading-tight text-foreground flex items-center gap-1.5">
                  {currentStep?.title}
                </h3>
                <button onClick={stopTour} className="text-muted-foreground hover:text-foreground shrink-0 p-1 bg-muted/50 rounded-md transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs font-semibold text-primary mt-0.5 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Alex (AI Guide)
              </p>
            </div>
          </div>
          
          <div className="bg-muted/30 p-3 rounded-lg border border-border/50 mb-5 relative">
            <div className="absolute -left-1.5 top-4 w-3 h-3 bg-muted/30 border-l border-t border-border/50 rotate-[-45deg]" />
            <p className="text-sm text-foreground leading-relaxed relative z-10 font-medium">
              "{currentStep?.body}"
            </p>
            {currentStep?.id === 'interactive-selection' && (
              <div className="mt-4 relative z-10">
                <Button 
                  onClick={() => {
                    setActiveBranch('storyMode');
                    setCurrentStepIndex(0);
                    navigate('/command-center');
                  }} 
                  className="w-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 flex items-center justify-center gap-2 h-11"
                >
                  <Play className="h-4 w-4 fill-current" /> Watch a deal close itself (60 sec)
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  setIsMuted(!isMuted);
                  if (!isMuted) stopSpeaking();
                  else speak(currentStep?.voiceoverText || "");
                }}
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${isMuted ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                title={isMuted ? "Unmute Voiceover" : "Mute Voiceover"}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <div className="flex items-center gap-1.5 ml-2">
                {currentSteps.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStepIndex ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {currentStep?.autoAdvanceDelay && (
                <Button 
                  onClick={() => setIsPaused(!isPaused)} 
                  size="sm" 
                  variant="outline"
                  className="w-8 h-8 p-0"
                  title={isPaused ? "Resume" : "Pause"}
                >
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-3.5 w-3.5" />}
                </Button>
              )}
              <Button 
                onClick={stopTour} 
                size="sm" 
                variant="ghost"
                className="text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Skip
              </Button>
              <Button 
                onClick={prevStep} 
                size="sm" 
                variant="outline"
                className="w-8 h-8 p-0"
                disabled={currentStepIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                onClick={nextStep} 
                size="sm" 
                className="gap-1.5 font-bold shadow-md shadow-primary/20"
                disabled={currentStep?.interactive}
              >
                {currentStep?.ctaText}
                {!currentStep?.interactive && currentStepIndex < currentSteps.length - 1 && <ChevronRight className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
