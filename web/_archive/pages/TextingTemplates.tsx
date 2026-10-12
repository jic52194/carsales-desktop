import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Clock, Plus, Sparkles, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  category: string;
  body: string;
  triggers: string[];
  uses: number;
}

const INITIAL_TEMPLATES: Template[] = [
  { id: "1", name: "Quick Follow-Up", category: "Follow-Up", body: "Hi {{first_name}}, thanks for your interest in the {{vehicle}}! I wanted to check if you had any questions. We have a few still available — would you like to come in for a test drive this week?", triggers: ["new_lead", "no_response_24h"], uses: 142 },
  { id: "2", name: "Appointment Reminder", category: "Appointment", body: "Hi {{first_name}}, just a reminder about your test drive appointment for the {{vehicle}} on {{appointment_date}} at {{appointment_time}}. Reply Y to confirm or call us at {{dealership_phone}}. See you soon!", triggers: ["appointment_24h_before"], uses: 89 },
  { id: "3", name: "Price Drop Alert", category: "Marketing", body: "Great news {{first_name}}! The {{vehicle}} you were interested in just had a price reduction of {{price_drop}}. It's now only {{new_price}}! Would you like to come take another look?", triggers: ["price_drop"], uses: 34 },
  { id: "4", name: "After-Sale Thank You", category: "Post-Sale", body: "Thank you {{first_name}} for choosing us! We hope you're loving your new {{vehicle}}. If you need anything at all, don't hesitate to reach out. We'd love a review if you have a moment!", triggers: ["deal_funded_7d"], uses: 67 },
  { id: "5", name: "Service Due Reminder", category: "Service", body: "Hi {{first_name}}, your {{vehicle}} is due for {{service_type}} based on your mileage ({{mileage}}). We have openings this week — would you like to schedule? Reply with your preferred day.", triggers: ["service_due"], uses: 56 },
  { id: "6", name: "Stale Lead Re-Engage", category: "Follow-Up", body: "Hi {{first_name}}, it's been a while! We've got some exciting new arrivals and special financing offers. The {{vehicle}} you liked is still available, but won't last long. Interested in revisiting?", triggers: ["no_response_30d"], uses: 23 },
];

const CATEGORIES = ["All", "Follow-Up", "Appointment", "Marketing", "Post-Sale", "Service"];

export default function TextingTemplates() {
  const [templates, setTemplates] = useState(INITIAL_TEMPLATES);
  const [activeCategory, setActiveCategory] = useState("All");
  const [editing, setEditing] = useState<Template | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = activeCategory === "All" ? templates : templates.filter((t) => t.category === activeCategory);

  const copyTemplate = (body: string, id: string) => {
    navigator.clipboard.writeText(body);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    toast.success("Template copied!");
  };

  const sendTest = (template: Template) => {
    toast.success("Test message sent!", { description: `Sent to your phone using "${template.name}" template.` });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <MessageSquare className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">SMS Templates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Merge-field templates with auto-responses and keyword triggers</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-black text-primary">{templates.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Templates</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-black text-emerald-500">{templates.reduce((a, t) => a + t.uses, 0)}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Sends</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-black text-amber-500">34%</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Reply Rate</p>
        </CardContent></Card>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat}
          </button>
        ))}
        <Button size="sm" variant="outline" className="shrink-0 ml-1">
          <Plus className="h-3.5 w-3.5 mr-1" /> New
        </Button>
      </div>

      {/* Templates */}
      <div className="space-y-3">
        {filtered.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm">{t.name}</p>
                    <Badge variant="secondary" className="text-[10px]">{t.category}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Triggers: {t.triggers.map(tr => tr.replace(/_/g, " ")).join(", ")}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{t.uses} uses</span>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-sm text-foreground/80 leading-relaxed mb-3">
                {t.body}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => copyTemplate(t.body, t.id)}>
                  {copied === t.id ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copied === t.id ? "Copied" : "Copy"}
                </Button>
                <Button size="sm" onClick={() => sendTest(t)}>
                  <Send className="h-3.5 w-3.5 mr-1" /> Test Send
                </Button>
                <Button size="sm" variant="ghost" className="ml-auto">
                  <Sparkles className="h-3.5 w-3.5 mr-1 text-primary" /> AI Optimize
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
