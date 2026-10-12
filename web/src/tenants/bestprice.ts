// Tenant #1 — Best Price Auto Sales, Methuen MA. Data pulled from bestpriceautosales.net on 2026-10-12.
import type { Tenant } from "@/lib/tenant";

export const BESTPRICE_TENANT: Tenant = {
  id: "bestprice",
  slug: "bestprice",
  name: "Best Price Auto Sales",
  legalName: "Best Price Auto Sales Inc",
  tagline: "Your Premier Dealership In Methuen, MA",
  address: { street: "262 Lowell St", city: "Methuen", state: "MA", zip: "01844" },
  secondLocation: { street: "5 Merrimack St", city: "Lawrence", state: "MA", zip: "01843", note: "Second location listed on site; no separate phone/hours" },
  phone: "978-682-8800",
  email: null, // not published on the site — collect during onboarding
  website: "https://bestpriceautosales.net",
  hours: {
    Monday: "9:00 am - 7:00 pm", Tuesday: "9:00 am - 7:00 pm", Wednesday: "9:00 am - 7:00 pm",
    Thursday: "9:00 am - 7:00 pm", Friday: "9:00 am - 7:00 pm", Saturday: "9:00 am - 7:00 pm",
    Sunday: "Appointment Only",
  },
  logoUrl: "https://imagescdn.dealercarsearch.com/DealerImages/19988/30031/logo3.png",
  // Colors estimated from brand (site CSS not readable) — confirm with dealer during onboarding
  colors: { primary: "#C8102E", secondary: "#1F2A44", accent: "#FFD100", estimated: true },
  social: { facebook: "https://www.facebook.com/BestPriceAutoSalesInc" },
  googleMapsUrl: "https://maps.google.com/maps?q=262+Lowell+St+Methuen+MA+01844",
  financing: {
    creditAppUrl: "https://bestpriceautosales.net/creditapp",
    notes: [
      "Works with all credit levels",
      "Advertised price reflects a down payment of $2,995",
      "Non-haggle pricing; immediate delivery; insurance & registration assistance",
      "Capital One Auto Navigator + Credit Acceptance participating dealer",
    ],
  },
  disclaimers: [
    "Price excludes taxes, title, registration, dealer documentation, acquisition fees and/or destination charges.",
    "Pricing and details believed accurate but not guaranteed and subject to change.",
  ],
  inventorySource: { platform: "Dealer Car Search", dealerId: "19988" },
  plan: "starter",
  subscribedAt: "2026-10-12",
  seedVersion: 1,
};
