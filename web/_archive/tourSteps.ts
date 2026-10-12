export interface TourStep {
  id: string;
  route: string;
  targetSelector: string;
  fallbackSelector?: string;
  title: string;
  body: string;
  voiceoverText: string;
  ctaText: string;
  placement: "top" | "bottom" | "left" | "right" | "center";
  mobilePlacement?: "top" | "bottom" | "center";
  interactive?: boolean;
  action?: string;
  autoAdvanceDelay?: number;
}

export const TOUR_BRANCHES: Record<string, TourStep[]> = {
  intro: [
    {
      id: "portal-welcome",
      route: "/",
      targetSelector: "[data-tour-id='nav-logo']",
      title: "Welcome to CarSalesSoftware OS",
      body: "This is the dealership operating system built to organize leads, appointments, deals, follow-up, inventory, finance handoffs, and team performance.",
      voiceoverText: "Welcome to CarSalesSoftware.com. This is the dealership operating system built to organize leads, appointments, deals, follow-up, inventory, finance handoffs, and team performance.",
      ctaText: "Next",
      placement: "bottom"
    },
    {
      id: "sidebar-overview",
      route: "/",
      targetSelector: "[data-sidebar='menu']",
      fallbackSelector: ".sidebar",
      title: "Your Command Modules",
      body: "Everything you need is organized here by department. Sales, Finance, Service, and Back Office all work from the same unified system.",
      voiceoverText: "Everything you need is organized here by department. Sales, Finance, Service, and Back Office all work from the same unified system.",
      ctaText: "Next",
      placement: "right"
    },
    {
      id: "interactive-selection",
      route: "/",
      targetSelector: "[data-sidebar='menu']",
      fallbackSelector: ".sidebar",
      title: "Choose Your Path",
      body: "Click on any module in the sidebar to explore how it works. For example, click CRM, Inventory, or Service to begin your tailored tour.",
      voiceoverText: "To begin, click on any module in the sidebar that interests you most. We will tailor the rest of the tour based on your selection.",
      ctaText: "Waiting for selection...",
      placement: "right",
      interactive: true
    }
  ],
  sales: [
    {
      id: "dashboard-command-center",
      route: "/command-center",
      targetSelector: "[data-tour-id='tour-dashboard-header']",
      fallbackSelector: "h1",
      title: "Dashboard Command Center",
      body: "Your dashboard shows what needs attention today — hot leads, missed follow-ups, appointments, open deals, and sold units.",
      voiceoverText: "Great choice. Let's start with your dashboard. It shows what needs attention today — hot leads, missed follow-ups, appointments, open deals, and sold units.",
      ctaText: "Next",
      placement: "bottom"
    },
    {
      id: "hot-leads-card",
      route: "/crm",
      targetSelector: "[data-tour-id='tour-hot-leads']",
      fallbackSelector: ".kanban-board",
      title: "Hot Leads",
      body: "Hot leads are buyers most likely to move. Your team can call, text, assign, or schedule an appointment from one place.",
      voiceoverText: "Hot leads are buyers most likely to move. Your team can call, text, assign, or schedule an appointment from one place.",
      ctaText: "Next",
      placement: "right"
    },
    {
      id: "deal-pipeline",
      route: "/crm",
      targetSelector: "[data-tour-id='tour-pipeline']",
      fallbackSelector: ".kanban-board",
      title: "Pipeline",
      body: "The pipeline shows every deal from new lead to sold, with the next action visible at each stage.",
      voiceoverText: "The pipeline shows every deal from new lead to sold, with the next action visible at each stage.",
      ctaText: "Next",
      placement: "bottom"
    },
    {
      id: "conversations-inbox",
      route: "/inbox",
      targetSelector: "[data-tour-id='tour-inbox']",
      fallbackSelector: ".inbox-container",
      title: "Conversations",
      body: "Conversations keep every text, email, missed call, and AI suggestion connected to the buyer.",
      voiceoverText: "Conversations keep every text, email, missed call, and AI suggestion connected to the buyer.",
      ctaText: "Next",
      placement: "right"
    },
    {
      id: "ai-follow-up-panel",
      route: "/crm/workflows",
      targetSelector: "[data-tour-id='tour-ai-followup']",
      fallbackSelector: ".ai-workflow",
      title: "AI Follow-Up",
      body: "AI follow-up helps draft messages, detect missed opportunities, and recover leads before they disappear.",
      voiceoverText: "AI follow-up helps draft messages, detect missed opportunities, and recover leads before they disappear.",
      ctaText: "Finish Tour",
      placement: "right"
    }
  ],
  inventory: [
    {
      id: "inventory-table",
      route: "/inventory",
      targetSelector: "[data-tour-id='tour-inventory']",
      fallbackSelector: ".inventory-table",
      title: "Inventory",
      body: "Inventory connects vehicles to real demand, so managers can see which units have leads, appointments, and active deals.",
      voiceoverText: "Excellent choice. Inventory connects vehicles to real demand, so managers can see which units have leads, appointments, and active deals.",
      ctaText: "Next",
      placement: "top"
    },
    {
      id: "appraisals",
      route: "/appraisals",
      targetSelector: "h1",
      title: "Appraisals & AI Damage Detection",
      body: "Appraise trade-ins quickly with AI computer vision that detects exterior damage from photos.",
      voiceoverText: "Appraise trade-ins quickly with AI computer vision that detects exterior damage from photos.",
      ctaText: "Finish Tour",
      placement: "bottom"
    }
  ],
  finance: [
    {
      id: "finance-handoff",
      route: "/deal-jacket",
      targetSelector: "[data-tour-id='tour-finance']",
      fallbackSelector: ".finance-container",
      title: "Finance Handoff",
      body: "Finance handoff gives the finance manager the customer, vehicle, trade, notes, documents, and deal status without chasing the sales desk.",
      voiceoverText: "Good choice. Finance handoff gives the finance manager the customer, vehicle, trade, notes, documents, and deal status without chasing the sales desk.",
      ctaText: "Next",
      placement: "right"
    },
    {
      id: "contracts",
      route: "/contracts",
      targetSelector: "h1",
      title: "Contracts & eSign",
      body: "Generate digital contracts and capture signatures in-store or remotely via SMS.",
      voiceoverText: "Generate digital contracts and capture signatures in-store or remotely via SMS.",
      ctaText: "Finish Tour",
      placement: "bottom"
    }
  ],
  service: [
    {
      id: "service-bay",
      route: "/technician-bay",
      targetSelector: "h1",
      title: "Technician Bay",
      body: "Technicians can manage digital multi-point inspections, upload videos, and request parts automatically.",
      voiceoverText: "Great choice. Technicians can manage digital multi-point inspections, upload videos, and request parts automatically.",
      ctaText: "Next",
      placement: "bottom"
    },
    {
      id: "parts-department",
      route: "/parts-department",
      targetSelector: "h1",
      title: "Parts Department",
      body: "Manage parts inventory, counter sales, and fulfill automated requests from the service bay.",
      voiceoverText: "Manage parts inventory, counter sales, and fulfill automated requests from the service bay.",
      ctaText: "Finish Tour",
      placement: "bottom"
    }
  ],
  management: [
    {
      id: "reports-dashboard",
      route: "/reports",
      targetSelector: "[data-tour-id='tour-reports-board']",
      fallbackSelector: ".reports-container",
      title: "Reports",
      body: "Reports show what is actually working — lead sources, appointment rates, response time, sold units, and team performance.",
      voiceoverText: "Perfect. Reports show what is actually working — lead sources, appointment rates, response time, sold units, and team performance.",
      ctaText: "Next",
      placement: "top"
    },
    {
      id: "staff-performance",
      route: "/metrics",
      targetSelector: "[data-tour-id='tour-staff']",
      fallbackSelector: ".metrics-container",
      title: "Staff Performance",
      body: "Staff performance shows who is following up, who is setting appointments, and who is helping the dealership sell more cars.",
      voiceoverText: "Staff performance shows who is following up, who is setting appointments, and who is helping the dealership sell more cars.",
      ctaText: "Finish Tour",
      placement: "bottom"
    }
  ],
  storyMode: [
    {
      id: "story-intro",
      route: "/command-center",
      targetSelector: "[data-tour-id='tour-dashboard-header']",
      fallbackSelector: "h1",
      title: "11:47 PM - Store is Closed",
      body: "Watch what happens while your team is home.",
      voiceoverText: "It's 11:47 PM, the store is closed. Watch what happens while your team is home.",
      ctaText: "Next",
      placement: "bottom",
      autoAdvanceDelay: 6000
    },
    {
      id: "story-lead-drop",
      route: "/crm",
      targetSelector: "[data-tour-id='tour-hot-leads']",
      fallbackSelector: ".kanban-board",
      title: "New Lead Arrives",
      body: "A lead just came in after hours - 60% of them do.",
      voiceoverText: "A lead just came in after hours - 60% of them do.",
      ctaText: "Next",
      placement: "right",
      action: "story-trigger-lead",
      autoAdvanceDelay: 7000
    },
    {
      id: "story-ai-reply",
      route: "/crm",
      targetSelector: "[data-tour-id='tour-hot-leads']",
      title: "AI Follow-Up",
      body: "No human touched this. The AI already replied and is booking the appointment.",
      voiceoverText: "No human touched this. The AI already replied and is booking the appointment.",
      ctaText: "Next",
      placement: "right",
      action: "story-trigger-ai-reply",
      autoAdvanceDelay: 8000
    },
    {
      id: "story-appt-set",
      route: "/crm",
      targetSelector: "[data-tour-id='tour-pipeline']",
      title: "Appointment Booked",
      body: "Appointment booked while you slept.",
      voiceoverText: "Appointment booked while you slept.",
      ctaText: "Next",
      placement: "bottom",
      action: "story-trigger-appt",
      autoAdvanceDelay: 6000
    },
    {
      id: "story-desking",
      route: "/?customerName=John%20Smith%20(Live)&vehicle=2024%20Toyota%20Tacoma",
      targetSelector: "[data-tour-id='tour-desking']",
      fallbackSelector: ".card",
      title: "Deal Desking",
      body: "Now your salesperson desks it in seconds, every number optimized.",
      voiceoverText: "Now your salesperson desks it in seconds, every number optimized.",
      ctaText: "Next",
      placement: "center",
      action: "story-trigger-desking",
      autoAdvanceDelay: 8000
    },
    {
      id: "story-deal-done",
      route: "/",
      targetSelector: "[data-tour-id='tour-desking']",
      fallbackSelector: ".card",
      title: "Deal Done",
      body: "From after-hours click to signed deal - that's the whole point.",
      voiceoverText: "From after-hours click to signed deal - that's the whole point.",
      ctaText: "Next",
      placement: "center",
      action: "story-trigger-deal-done",
      autoAdvanceDelay: 8000
    },
    {
      id: "story-recap",
      route: "/",
      targetSelector: "[data-tour-id='tour-desking']",
      fallbackSelector: "body",
      title: "Zero Manual Work",
      body: "This happened with zero manual work. That's CarSales AI OS.",
      voiceoverText: "This happened with zero manual work. That's CarSales AI OS.",
      ctaText: "Finish",
      placement: "center",
      autoAdvanceDelay: 7000
    }
  ],
  spotlight: [
    {
      id: "spotlight-dashboard",
      route: "/command-center",
      targetSelector: "[data-tour-id='tour-dashboard-header']",
      fallbackSelector: "h1",
      title: "Dashboard overview",
      body: "Your whole dealership on one screen.",
      voiceoverText: "Your whole dealership on one screen.",
      ctaText: "Next",
      placement: "bottom"
    },
    {
      id: "spotlight-hygiene",
      route: "/crm",
      targetSelector: "[data-tour-id='tour-data-hygiene']",
      title: "Data Hygiene scanner",
      body: "Find the duplicate and rotting leads costing you deals.",
      voiceoverText: "Find the duplicate and rotting leads costing you deals.",
      ctaText: "Next",
      placement: "bottom",
      action: "spotlight-open-hygiene"
    },
    {
      id: "spotlight-merge",
      route: "/crm",
      targetSelector: "[data-tour-id='tour-merge-leads']",
      title: "Merge Records",
      body: "One click to a clean, single customer record.",
      voiceoverText: "One click to a clean, single customer record.",
      ctaText: "Next",
      placement: "bottom"
    },
    {
      id: "spotlight-scoring",
      route: "/crm",
      targetSelector: "[data-tour-id='tour-predictive-scoring']",
      fallbackSelector: ".badge:contains('Score')",
      title: "AI Lead Score",
      body: "Know which leads will buy before your first call.",
      voiceoverText: "Know which leads will buy before your first call.",
      ctaText: "Next",
      placement: "right",
      action: "spotlight-close-hygiene"
    },
    {
      id: "spotlight-service",
      route: "/fleet-management",
      targetSelector: "h2",
      title: "Service Lane / Fleet Intelligence",
      body: "Profit doesn't stop at the sale.",
      voiceoverText: "Profit doesn't stop at the sale.",
      ctaText: "Next",
      placement: "bottom"
    },
    {
      id: "spotlight-pricing",
      route: "/crm",
      targetSelector: "[data-tour-id='nav-crm']",
      fallbackSelector: "body",
      title: "Explore on Your Own",
      body: "That's the tour! Click around any module in the sidebar to keep exploring the full platform.",
      voiceoverText: "That's the tour! Click around any module in the sidebar to keep exploring the full platform.",
      ctaText: "Done",
      placement: "center"
    }
  ]
};

export const getBranchForRoute = (route: string): string => {
  if (route.includes('/crm') || route.includes('/leads') || route.includes('/command-center') || route.includes('/inbox') || route.includes('/tasks')) return 'sales';
  if (route.includes('/inventory') || route.includes('/appraisals') || route.includes('/recon') || route.includes('/auctions')) return 'inventory';
  if (route.includes('/deal-jacket') || route.includes('/contracts') || route.includes('/lenders') || route.includes('/accounting')) return 'finance';
  if (route.includes('/service') || route.includes('/technician') || route.includes('/parts')) return 'service';
  if (route.includes('/reports') || route.includes('/metrics') || route.includes('/settings')) return 'management';
  return 'sales'; // Default fallback
};

// For backward compatibility if anything imports TOUR_STEPS
export const TOUR_STEPS: TourStep[] = TOUR_BRANCHES.intro;
