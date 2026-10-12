import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Bot, MessageSquare, Workflow, PartyPopper, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const newFeatures = [
  {
    icon: <Sparkles className="h-5 w-5 text-primary" />,
    title: "Interactive Guided Tour",
    description: "Experience a personalized, role-based walkthrough of the OS with our new AI guide, Alex.",
  },
  {
    icon: <Bot className="h-5 w-5 text-emerald-500" />,
    title: "AI Damage Detection",
    description: "Automatically scan trade-in photos to detect and estimate exterior damage in the Appraisals module.",
  },
  {
    icon: <MessageSquare className="h-5 w-5 text-blue-500" />,
    title: "Omnichannel Inbox",
    description: "Manage SMS, Email, and Web Chat in a single, continuous thread per customer.",
  },
  {
    icon: <Workflow className="h-5 w-5 text-purple-500" />,
    title: "CRM Workflows",
    description: "Build visual, drag-and-drop automation sequences to engage leads and prevent missed follow-ups.",
  },
  {
    icon: <PartyPopper className="h-5 w-5 text-amber-500" />,
    title: "Deal Celebrations",
    description: "Enjoy satisfying micro-interactions and confetti when you move a deal to the Sold or Delivered stage.",
  },
];

export function WhatsNewModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if we've shown this version's update modal
    const hasSeenUpdate = localStorage.getItem("hasSeenUpdate_v2");
    if (!hasSeenUpdate) {
      // Small delay to let the initial page load finish
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleShow = () => setIsOpen(true);
    window.addEventListener('show-whats-new', handleShow);
    return () => window.removeEventListener('show-whats-new', handleShow);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("hasSeenUpdate_v2", "true");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-primary/20 shadow-2xl">
        <div className="bg-gradient-to-br from-primary/10 via-background to-background p-6">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                Platform Update
              </span>
              <span className="text-muted-foreground text-sm">Version 2.0</span>
            </div>
            <DialogTitle className="text-2xl font-bold">What&apos;s New in CarSales OS</DialogTitle>
            <DialogDescription className="text-base">
              We've added powerful new AI tools and workflow upgrades to help you sell more cars with less effort.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {newFeatures.map((feature, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="mt-0.5 bg-background shadow-sm border border-border/50 rounded-full p-2 h-fit">
                  {feature.icon}
                </div>
                <div>
                  <h4 className="font-bold text-foreground">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <DialogFooter className="mt-8">
            <Button onClick={handleClose} className="w-full gap-2 text-md h-11">
              <CheckCircle2 className="h-5 w-5" />
              Got it, let's go
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
