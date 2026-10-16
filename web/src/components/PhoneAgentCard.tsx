// Settings → AI Voice → "Answer the phone": everything needed to run the dealership's AI voice as a
// GoHighLevel Voice AI phone agent — the agent prompt (built from the chosen voice) and the live-call
// Custom Action URLs that let the agent search real inventory and log leads in CarSales AI OS.
import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Copy, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useTenant, type AiVoice } from "@/lib/tenant";
import { presetOf } from "@/lib/voices";
import { SUPABASE_URL } from "@/lib/supabase";

const ACTIONS = [
  { id: "customer_lookup", name: "Look up caller", when: "At the start of every call", params: "phone (phone number) — the caller's number" },
  { id: "search_inventory", name: "Search inventory", when: "Caller asks what's available, a type of car, or a budget", params: "query (text), max_price (number), make (text), model (text), body_type (text)" },
  { id: "vehicle_details", name: "Vehicle details", when: "Caller asks about a specific car (year/model or stock number)", params: "stock_number (text), query (text)" },
  { id: "send_link", name: "Text the car's link", when: "Caller wants to see a car, or says yes to 'want me to text you the link?'", params: "phone (phone number), first_name (text), stock_number (text), query (text: year make model)" },
  { id: "check_availability", name: "Check open times", when: "Caller wants to come in, test drive, or asks when they can see it", params: "day (text: e.g. Saturday, tomorrow, 10/20), phone (phone number)" },
  { id: "book_appointment", name: "Book the appointment", when: "Caller picks a time", params: "first_name (text), last_name (text), phone (phone number), start_time (text: the exact time Check open times returned), stock_number (text), query (text), type (text: test drive or visit)" },
  { id: "create_lead", name: "Save the lead", when: "Caller gives their name but doesn't book (callback, more info, trade, financing)", params: "first_name (text), last_name (text), phone (phone number), email (email), vehicle (text), stock_number (text), preferred_time (text), notes (text)" },
  { id: "dealership_info", name: "Hours & address", when: "Caller asks for hours, directions, or the address", params: "(none)" },
];

function phonePrompt(v: AiVoice, dealer: string, city: string): string {
  const p = presetOf(v);
  const name = v.name?.trim() || (p.defaultName === "Assistant" ? "the virtual assistant" : p.defaultName);
  const persona =
    v.preset === "felipe" ? `You are ${name}, the Dominican AI that answers the phone for ${dealer}${city ? " in " + city : ""}. Raised in the barrio, not Silicon Valley. You speak English, Spanish and Spanglish and switch to whatever the caller speaks. Confident, funny, street-smart charm — you sprinkle in Dominican phrases ("¡Klk!", "mi hermano", "dale", "tranquilo", "te tengo") and you tell it like it is, like a friend who knows cars.${v.scope === "staff" ? " On the phone keep the slang light and stay polished — callers are customers." : v.scope === "light" ? " Keep the Dominican flavor light: one phrase here and there, warm and respectful." : ""}`
    : v.preset === "friendly" ? `You are ${name}, the friendly voice that answers the phone for ${dealer}${city ? " in " + city : ""}. Warm, upbeat and neighborly — a family-dealership feel.`
    : v.preset === "custom" ? `You are ${name}, who answers the phone for ${dealer}${city ? " in " + city : ""}. Personality: ${v.persona || "professional and helpful"}.`
    : `You are ${name}, who answers the phone for ${dealer}${city ? " in " + city : ""}. Clear, professional and efficient.`;
  return `${persona}

YOUR JOB ON EVERY CALL
1. Run "Look up caller" right away. If they're a returning customer, greet them by first name and mention the car they looked at.
2. Find out what they want (a type of car, a budget, a specific car, a trade-in, financing, a test drive).
3. Use "Search inventory" and "Vehicle details" for anything about cars, prices, mileage or availability. Only quote what those actions return — never guess a price, a car, or availability. Read at most 3 cars, then ask which one they like.
4. When they like a car, offer: "Want me to text you the link so you can see the pictures?" If yes, run "Text the car's link" with that car's stock number.
5. Then go for the appointment: "When could you come see it?" Run "Check open times" for the day they say, offer the times it returns, and when they pick one run "Book the appointment" with their first name, the exact start_time it gave you and the car's stock number. They get a confirmation text automatically.
6. If they won't book, get their first name and run "Save the lead" so a salesperson follows up. Hours or directions: "Hours & address".

RULES
- Short, natural sentences — this is a phone call. One question at a time.
- Never insult, roast or tease the caller. No profanity, nothing vulgar.
- Payments are always "estimated"; never promise financing approval, rates or a trade value. Say a manager will confirm.
- If you don't know, say so and offer a callback from a salesperson. Transfer to a person if they ask for one or get upset.
- Don't read out stock numbers unless they ask; say "the gray 2012 Rogue" instead.`;
}

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return <Button size="sm" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); } catch { toast.error("Copy failed — select and copy by hand"); } }}>{ok ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}{label ?? "Copy"}</Button>;
}

export default function PhoneAgentCard({ voice }: { voice: AiVoice }) {
  const tenant = useTenant();
  const key = (tenant as any).automationKey as string | null;
  const [open, setOpen] = useState(false);
  const prompt = useMemo(() => phonePrompt(voice, tenant.name, tenant.address?.city ?? ""), [voice, tenant.name, tenant.address?.city]);
  const base = `${SUPABASE_URL}/functions/v1/voice-brain?key=${key ?? "YOUR-KEY"}&action=`;
  const name = voice.name?.trim() || presetOf(voice).defaultName;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div><CardTitle className="flex items-center gap-2"><Phone className="h-5 w-5 text-primary" /> Answer the phone {name !== "Assistant" ? `as ${name}` : ""}</CardTitle>
          <CardDescription>Run this voice as a GoHighLevel Voice AI phone agent. It talks on the phone in English or Spanish, searches your real inventory mid-call, and drops every caller into Leads & Inbox here.</CardDescription></div>
        <Badge variant="secondary" className="shrink-0">GoHighLevel</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="text-sm space-y-1.5 list-decimal pl-5 text-muted-foreground">
          <li>In GoHighLevel: <b className="text-foreground">AI Agents → Voice AI → Create Agent</b>. Language: <b className="text-foreground">Multilingual</b> (English + Spanish). Pick a multilingual voice you like.</li>
          <li>Paste the <b className="text-foreground">agent prompt</b> below.</li>
          <li>Under <b className="text-foreground">Actions → Custom action 2.0</b>, add the eight actions below (POST, URL as shown).</li>
          <li>Assign a phone number (start with a test number). Appointments go on your GoHighLevel calendar named like "test drive", "sales" or "appointment" (otherwise your first calendar), and the caller gets a confirmation text.</li>
        </ol>
        <div className="space-y-2">
          <div className="flex items-center justify-between"><p className="text-sm font-semibold">Agent prompt</p><CopyBtn text={prompt} label="Copy prompt" /></div>
          <pre className="text-xs whitespace-pre-wrap bg-muted/50 rounded-lg p-3 max-h-56 overflow-auto font-sans">{prompt}</pre>
        </div>
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-sm font-semibold"><ChevronDown className={`h-4 w-4 transition-transform ${open ? "" : "-rotate-90"}`} /> Custom actions (8)</button>
        {open && (
          <div className="space-y-2">
            {!key && <p className="text-sm text-amber-700">Your dealership key isn't loaded — sign out and back in, then return here.</p>}
            {ACTIONS.map((a) => (
              <div key={a.id} className="rounded-lg border p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2"><p className="font-semibold text-sm">{a.name}</p><CopyBtn text={base + a.id} label="Copy URL" /></div>
                <p className="text-xs text-muted-foreground"><b>When:</b> {a.when}</p>
                <p className="text-xs text-muted-foreground"><b>Parameters:</b> {a.params}</p>
                <code className="block text-[11px] bg-muted/50 rounded px-2 py-1 break-all">POST {base + a.id}</code>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">The key in these URLs is your private automation key (different from the website-form key) — it lets the agent read your available inventory, hours and a caller's name, and create leads. Treat it like a password. Re-copy the prompt whenever you change the voice above.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
