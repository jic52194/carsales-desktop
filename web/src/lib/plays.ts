// Automation plays — the follow-up sequences CarSales AI OS runs for every dealership (seq-run edge function, every 5 min).
// ONE source of truth: this file is copied to supabase/functions/seq-run/plays.ts at deploy, so the screen and the
// cloud engine always agree. A dealership can switch a play on/off and edit or skip any step (tenants.automations).
//
// Step timing: `at` is minutes from the anchor — "enrolled" (when the customer entered the play) or "appointment"
// (the appointment start; negative = before). Texts and emails only go out during quiet-hours-safe times
// (9am–8pm Mon–Sat, noon–6pm Sun, dealership time zone); tasks go any time.
// Message variables: {first_name} {customer} {dealership} {salesperson} {vehicle} {link} {appt_time} {appt_clock}
// {address} {phone} {review_link} {arrival} {arrival_price} {arrival_link}
// `ai` steps: the AI writes the text from `intent` + the customer's data (falls back to `body` if AI is unavailable).

export type PlayGroup = "door" | "rescue" | "nurture" | "after";
export type StepKind = "sms" | "email" | "task" | "ai";
export interface PlayStep {
  id: string; kind: StepKind; at: number; anchor?: "enrolled" | "appointment";
  body: string; subject?: string; intent?: string;
  /** task: who gets it */ assign?: "owner" | "manager";
  /** skip this step if the appointment is closer than this many minutes when the play starts */ minLead?: number;
  label: string;
}
export interface Play {
  key: string; group: PlayGroup; name: string; why: string; trigger: string; stops: string; steps: PlayStep[];
  /** plays a customer can be in alongside others without the 1-text-per-day throttle */ urgent?: boolean;
}

const M = 1, H = 60, D = 1440;

export const PLAYS: Play[] = [
  // ── Get them in the door ──
  {
    key: "new_lead", group: "door", name: "New lead — speed to lead + 14-day follow-up", urgent: true,
    why: "The first dealer to answer usually sells the car. Texts in seconds (the built-in \"respond to new lead\" task still gets a person calling), then keeps in touch for two weeks.",
    trigger: "A new lead comes in (website, phone, third-party, walk-in)", stops: "They reply, book an appointment, the lead moves past Contacted, or they opt out",
    steps: [
      { id: "t0", kind: "sms", at: 0, label: "Instant text", body: "Hi {first_name}, this is {salesperson} at {dealership}. Got your request{about_vehicle}! Is it still the one you want to see? I can have it ready for a test drive today or tomorrow." },
      { id: "e1", kind: "email", at: 1 * H, label: "Email with the car", subject: "Your {vehicle} at {dealership}", body: "Hi {first_name},\n\nThanks for reaching out to {dealership}! Here are the photos, price and details: {link}\n\nWhat day works for a quick test drive? Just reply with a time and I'll have it pulled up front.\n\n{salesperson}\n{dealership} · {phone}" },
      { id: "t1", kind: "sms", at: 1 * D, label: "Day 1 text", body: "Hey {first_name}, quick one — do mornings or evenings work better for you to come see the {vehicle}?" },
      { id: "a3", kind: "ai", at: 3 * D, label: "Day 3 AI text", intent: "Friendly nudge. Send the vehicle link and mention one or two similar cars in stock as alternatives. Ask for a day to come in.", body: "Hi {first_name}, still thinking about the {vehicle}? Here it is again: {link} — we have a couple similar ones too. Want to stop by this week?" },
      { id: "t7", kind: "sms", at: 7 * D, label: "Day 7 text", body: "{first_name}, are you still shopping? We just got some new arrivals at {dealership}. Tell me what matters most (price, payment, mileage) and I'll send you the best 3." },
      { id: "t14", kind: "sms", at: 14 * D, label: "Day 14 break-up text", body: "Hi {first_name}, I don't want to bug you — should I keep an eye out for a car for you? Just reply YES and I'll send you the good ones first." },
    ],
  },
  {
    key: "appointment", group: "door", name: "Appointment — confirm, remind, show up", urgent: true,
    why: "Confirmations and reminders cut no-shows. Staff get a task after the time to mark showed or no-show, which starts the right follow-up.",
    trigger: "An appointment is booked (by staff, the website, GHL or the Phone AI)", stops: "The appointment is cancelled, marked showed or no-show",
    steps: [
      { id: "c0", kind: "sms", at: 0, label: "Confirmation", body: "You're all set, {first_name}! {appt_time} at {dealership}, {address}. Reply YES to confirm or tell me a better time." },
      { id: "r24", kind: "sms", at: -24 * H, anchor: "appointment", minLead: 26 * H, label: "Day-before reminder", body: "Reminder: see you tomorrow at {appt_clock}, {first_name}! We'll have the {vehicle} ready. Need to move it? Just reply." },
      { id: "r2", kind: "sms", at: -2 * H, anchor: "appointment", minLead: 3 * H, label: "2-hour reminder", body: "See you at {appt_clock} today, {first_name}! {dealership} — {address}. Ask for {salesperson}." },
      { id: "mk", kind: "task", at: 90 * M, anchor: "appointment", assign: "owner", label: "Mark showed / no-show", body: "Did {customer} show for their {appt_clock} appointment? Mark it Showed or No-show (it starts the right follow-up)" },
    ],
  },
  {
    key: "no_show", group: "door", name: "No-show — rebook",
    why: "Most no-shows still want the car — life got in the way. A friendly text and a call usually rebook them.",
    trigger: "An appointment is marked No-show", stops: "They reply, book again, or buy",
    steps: [
      { id: "t0", kind: "sms", at: 0, label: "Sorry we missed you", body: "Hi {first_name}, sorry we missed you today! No worries at all. Want to pick another time to see the {vehicle}? Just reply with a day." },
      { id: "c1", kind: "task", at: 2 * H, assign: "owner", label: "Call to rebook", body: "Call {customer} to rebook (no-show)" },
      { id: "t2", kind: "sms", at: 2 * D, label: "Day 2 text", body: "{first_name}, the {vehicle} is still here: {link} — want me to hold it for you this week?" },
      { id: "a6", kind: "ai", at: 6 * D, label: "Day 6 AI text", intent: "Last friendly rebook attempt. Mention the car is still available (or similar ones), offer an easy time, no pressure.", body: "Hi {first_name}, just checking in — still interested in the {vehicle}? I can make it quick, 20 minutes. What day works?" },
    ],
  },
  // ── Deal rescue ──
  {
    key: "stalled_deal", group: "rescue", name: "Stalled deal — manager save",
    why: "A working deal with no activity for 3 days is about to die. The manager gets it first, then the customer gets a save text.",
    trigger: "A working / pending / approved deal has no activity for 3 days", stops: "The deal is worked or changes status, they reply, book or buy",
    steps: [
      { id: "m0", kind: "task", at: 0, assign: "manager", label: "Manager rescue task", body: "Rescue deal: {customer} on the {vehicle} — no activity 3 days. Re-desk it (more down? longer term? different car?) and call today." },
      { id: "a1", kind: "ai", at: 2 * H, label: "AI save text", intent: "The customer worked a deal but hasn't come back. Re-open the conversation warmly; say the manager took another look at the numbers and has a couple of options; ask for a quick call or visit. Do not quote a payment, rate or approval.", body: "Hi {first_name}, {salesperson} here from {dealership}. My manager took another look at your numbers on the {vehicle} and we have a couple of options. Do you have 5 minutes today?" },
      { id: "t3", kind: "sms", at: 3 * D, label: "Day 3 text", body: "{first_name}, is the {vehicle} still the one? If something got in the way (payment, trade, timing) tell me and I'll work on it." },
      { id: "m5", kind: "task", at: 5 * D, assign: "manager", label: "Last call or mark dead", body: "Last call on {customer}'s deal — save it or mark it dead" },
    ],
  },
  {
    key: "lost_lead", group: "rescue", name: "Lost lead — second look",
    why: "A lot of \"lost\" leads didn't buy anywhere. A manager review plus a few texts brings some back.",
    trigger: "A lead is marked Lost", stops: "They reply, book or buy",
    steps: [
      { id: "m0", kind: "task", at: 1 * H, assign: "manager", label: "Manager review", body: "Review lost lead: {customer} — was it price, credit, trade or timing? Can we save it?" },
      { id: "t2", kind: "sms", at: 2 * D, label: "Day 2 text", body: "Hi {first_name}, did you end up finding a car? If not, I'd love another shot — what would make it a yes?" },
      { id: "a21", kind: "ai", at: 21 * D, label: "Week 3 AI text", intent: "Re-engage a lead that went quiet. Mention 1–2 cars in stock that fit what they looked at, with the link, and ask if they're still shopping.", body: "{first_name}, we've had some new arrivals at {dealership} that fit what you were looking for. Still shopping?" },
      { id: "t60", kind: "sms", at: 60 * D, label: "Day 60 text", body: "Hi {first_name}, checking in from {dealership}. If you're still in the market, reply and I'll send you our best options this week." },
    ],
  },
  {
    key: "be_back", group: "rescue", name: "Be-back — came in, didn't buy",
    why: "They test drove but left. The next 24 hours decide if they come back.",
    trigger: "An appointment is marked Showed and no deal is delivered", stops: "They reply, book again or buy",
    steps: [
      { id: "t0", kind: "sms", at: 0, label: "Thanks for coming in", body: "Thanks for coming in yesterday, {first_name}! Here's the {vehicle} again: {link}. Any questions I can answer?" },
      { id: "c0", kind: "task", at: 0, assign: "owner", label: "Be-back call", body: "Call {customer} (be-back) — what stopped them from buying?" },
      { id: "t3", kind: "sms", at: 3 * D, label: "Day 3 text", body: "{first_name}, still thinking it over? If it's the payment or the trade, tell me — I'll have my manager look again." },
      { id: "a10", kind: "ai", at: 10 * D, label: "Day 10 AI text", intent: "They visited but didn't buy 10 days ago. Ask if they're still deciding; mention the car or a similar one is available; invite them back. No payment promises.", body: "Hi {first_name}, is the {vehicle} still on your mind? Happy to set up another look whenever you're ready." },
    ],
  },
  {
    key: "dead_deal", group: "rescue", name: "Dead deal / credit decline — try again",
    why: "Declined today isn't declined forever: another lender, more down, a co-signer or a different car can work.",
    trigger: "A deal is marked Dead", stops: "They reply, book or buy",
    steps: [
      { id: "m0", kind: "task", at: 1 * H, assign: "manager", label: "Manager options review", body: "Dead deal: {customer} on the {vehicle} — check other lenders, more down, a co-signer or a lower-priced car" },
      { id: "t5", kind: "sms", at: 5 * D, label: "Day 5 text", body: "Hi {first_name}, {salesperson} at {dealership}. We may have a few other ways to make a car work for you. Want me to take another look?" },
      { id: "a30", kind: "ai", at: 30 * D, label: "Day 30 AI text", intent: "Friendly check-in a month after a deal fell through. Offer to look again (things change: more down, a trade, different car). Do not promise approval.", body: "{first_name}, it's been a month — if anything's changed, I'd be glad to take another look at options for you." },
    ],
  },
  // ── Long-term nurture ──
  {
    key: "aged_lead", group: "nurture", name: "Aged leads — monthly check-in with matching cars",
    why: "Most buyers take 30–90 days. A monthly, useful text keeps you top of mind until they're ready.",
    trigger: "An open lead has had no activity for 30 days (checked daily)", stops: "They reply, book or buy",
    steps: [
      { id: "a0", kind: "ai", at: 0, label: "Monthly AI check-in", intent: "Monthly check-in to a lead who went quiet. Suggest 2 cars in stock that fit what they wanted (with links). Short and useful, no pressure.", body: "Hi {first_name}, {dealership} here — still looking for a car? We've had new arrivals; reply and I'll send the best matches." },
      { id: "a30", kind: "ai", at: 30 * D, label: "Month 2 AI check-in", intent: "Second monthly check-in. Different angle: a new arrival or a price drop that fits. Ask one easy question.", body: "{first_name}, quick check-in from {dealership} — want me to keep sending you the best new arrivals?" },
      { id: "a60", kind: "ai", at: 60 * D, label: "Month 3 AI check-in", intent: "Third monthly check-in. Mention trade-in values are strong right now and ask if they'd like a quick appraisal.", body: "Hi {first_name}, trade values are still strong — want a quick no-pressure appraisal on yours?" },
      { id: "t90", kind: "sms", at: 90 * D, label: "Month 4 last text", body: "{first_name}, I'll stop checking in for now. Whenever you're ready for a car, just reply here and I'll take care of you." },
    ],
  },
  {
    key: "new_arrival", group: "nurture", name: "New arrival / price drop match",
    why: "The best follow-up is the exact car they wanted. When a match arrives or drops in price, interested customers hear first.",
    trigger: "A vehicle arrives or drops in price that matches what a customer looked at (same make & model or make & body style) in the last year", stops: "One text per customer every 14 days",
    steps: [
      { id: "t0", kind: "sms", at: 0, label: "Match text", body: "{first_name}, we just {arrival_reason} {arrival} at {dealership}{arrival_price}: {arrival_link} Want first look?" },
    ],
  },
  // ── After the sale ──
  {
    key: "sold", group: "after", name: "Sold — thank you, review, referral, service, trade-up",
    why: "Reviews and referrals come in the first month; service and trade-up keep them for life.",
    trigger: "A deal is funded or delivered", stops: "They opt out (replies don't stop it)",
    steps: [
      { id: "t0", kind: "sms", at: 2 * H, label: "Thank you", body: "Congrats on your {vehicle}, {first_name}! Thank you for choosing {dealership}. If anything comes up, text me here anytime. — {salesperson}" },
      { id: "rv", kind: "sms", at: 3 * D, label: "Review request", body: "Hi {first_name}! How's the {vehicle}? If we earned it, a quick review would mean a lot to our team: {review_link}" },
      { id: "rf", kind: "sms", at: 14 * D, label: "Referral ask", body: "{first_name}, know anyone shopping for a car? Send them my way — we'll take great care of them (and thank you for it!)." },
      { id: "c30", kind: "sms", at: 30 * D, label: "30-day check-in", body: "Hi {first_name}, it's been a month with the {vehicle}! Everything running great? Any questions about the car or paperwork?" },
      { id: "sv", kind: "task", at: 150 * D, assign: "owner", label: "Service reminder", body: "Service reminder: {customer}'s {vehicle} — first service check (oil change / inspection)" },
      { id: "eq", kind: "ai", at: 540 * D, label: "18-month equity check", intent: "18 months after purchase. Let them know used-car values are strong and their car may be worth more than they think; offer a free appraisal toward an upgrade. No payment or rate promises.", body: "Hi {first_name}! Your {vehicle} may be worth more than you think right now. Want a free appraisal toward an upgrade?" },
      { id: "tu", kind: "ai", at: 900 * D, label: "30-month trade-up", intent: "About 2.5 years after purchase. Friendly trade-up offer with a new arrival that fits them. No payment promises.", body: "{first_name}, ready for something newer? We'd love to put you in your next car — want me to send a few options?" },
    ],
  },
];

export const PLAY_GROUPS: { key: PlayGroup; name: string; blurb: string }[] = [
  { key: "door", name: "Get them in the door", blurb: "Answer in seconds, follow up for 14 days, confirm and remind appointments, rebook no-shows." },
  { key: "rescue", name: "Deal rescue", blurb: "Save stalled deals, lost leads, be-backs and declines — manager first, then the customer." },
  { key: "nurture", name: "Long-term nurture", blurb: "Stay top of mind for 30–120 days with useful texts and the exact cars they want." },
  { key: "after", name: "After the sale", blurb: "Thank you, reviews, referrals, service and the next car." },
];

/** Dealership settings stored in tenants.automations */
export interface AutomationSettings {
  plays?: Record<string, { enabled?: boolean; steps?: Record<string, { off?: boolean; body?: string; subject?: string }> }>;
  reviewLink?: string;
  /** max automated texts per customer per day across all plays (urgent plays exempt) — default 1 */
  dailyCap?: number;
}
export const RECOMMENDED = ["new_lead", "appointment", "no_show", "stalled_deal", "lost_lead", "be_back", "dead_deal", "aged_lead", "new_arrival", "sold"];

/** Play with the dealership's edits applied. */
export function playFor(key: string, s?: AutomationSettings | null): (Omit<Play, "steps"> & { enabled: boolean; steps: (PlayStep & { off: boolean })[] }) | null {
  const p = PLAYS.find((x) => x.key === key); if (!p) return null;
  const o = s?.plays?.[key] ?? {};
  return { ...p, enabled: !!o.enabled, steps: p.steps.map((st) => ({ ...st, ...(o.steps?.[st.id]?.body ? { body: o.steps[st.id].body! } : {}), ...(o.steps?.[st.id]?.subject ? { subject: o.steps[st.id].subject! } : {}), off: !!o.steps?.[st.id]?.off })) };
}

export const fmtAt = (st: PlayStep) => {
  const a = Math.abs(st.at);
  const t = a < H ? `${a} min` : a < D ? `${Math.round(a / H)} h` : `${Math.round(a / D)} days`;
  if (st.anchor === "appointment") return a === 0 ? "At the appointment" : `${t} ${st.at < 0 ? "before" : "after"} the appointment`;
  if (a === 0) return "Right away";
  return a < D ? `After ${t}` : `Day ${Math.round(a / D)}`;
};
