import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, X, Send, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { askAi, AiNotConfigured, type AiMessage, type AiTask } from "@/lib/ai";
import { useAuth } from "@/lib/auth";

/** Floating assistant. Quick actions pick up the vehicle/customer from the current page. */
export function AiPanel() {
  const { user, hasPermission } = useAuth();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<AiMessage[]>([]);
  const [notConfigured, setNotConfigured] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

  const vehicleId = loc.pathname.match(/^\/inventory\/([^/]+)/)?.[1];
  const customerId = new URLSearchParams(loc.search).get("customer") ?? undefined;

  const run = async (task: AiTask, text?: string) => {
    if (busy) return;
    const userMsg: AiMessage | null = text ? { role: "user", content: text } : null;
    const history = userMsg ? [...msgs, userMsg] : msgs;
    if (userMsg) setMsgs(history);
    setBusy(true);
    try {
      const out = await askAi(task, { messages: task === "chat" ? history : [], context: { vehicleId, customerId, includeInventory: task === "chat" || task === "inventory_question" } });
      setMsgs([...history, { role: "assistant", content: out }]);
    } catch (e: any) {
      if (e instanceof AiNotConfigured) { setNotConfigured(true); setMsgs([...history, { role: "assistant", content: "The AI assistant isn't switched on yet. An administrator needs to add the Anthropic API key in the Supabase project (Edge Functions → Secrets → ANTHROPIC_API_KEY)." }]); }
      else toast.error(e.message || "AI request failed");
    } finally { setBusy(false); }
  };

  if (!user) return null;
  const quick: { label: string; task: AiTask; show: boolean }[] = [
    { label: "Describe this vehicle", task: "vehicle_description", show: !!vehicleId },
    { label: "Follow-up text", task: "follow_up_text", show: !!customerId },
    { label: "Follow-up email", task: "follow_up_email", show: !!customerId },
    { label: "Customer summary", task: "customer_summary", show: !!customerId },
    { label: "Morning brief", task: "daily_brief", show: hasPermission(["manager"]) },
  ];
  if (loc.pathname.startsWith("/onboarding")) return null; // wizard is full-screen; the assistant comes back after setup

  return (
    <>
      <button onClick={() => setOpen((o) => !o)} className="fixed bottom-5 right-5 z-[80] h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform" title="AI assistant">
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>
      {open && (
        <div className="fixed bottom-20 right-5 z-[80] w-[380px] max-w-[calc(100vw-2.5rem)] h-[520px] max-h-[75vh] bg-background border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><p className="font-semibold text-sm">AI assistant</p><span className="ml-auto text-[10px] text-muted-foreground">uses only your dealership's data</span></div>
          <div className="px-3 py-2 flex flex-wrap gap-1.5 border-b">
            {quick.filter((q) => q.show).map((q) => <Button key={q.task} size="sm" variant="outline" className="h-7 text-xs" disabled={busy} onClick={() => run(q.task)}>{q.label}</Button>)}
            {!quick.some((q) => q.show) && <p className="text-xs text-muted-foreground">Open a vehicle or customer for quick actions, or ask about inventory below.</p>}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
            {msgs.length === 0 && <p className="text-muted-foreground">Try: "Which SUVs under $20k have AWD?" or "What came in this week?"</p>}
            {msgs.map((m, i) => (
              <div key={i} className={`rounded-xl px-3 py-2 whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground ml-8" : "bg-muted mr-4"}`}>
                {m.content}
                {m.role === "assistant" && <button className="block mt-1 text-[10px] opacity-60 hover:opacity-100 inline-flex items-center gap-1" onClick={() => { navigator.clipboard.writeText(m.content); toast.success("Copied"); }}><Copy className="h-3 w-3" /> copy</button>}
              </div>
            ))}
            {busy && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> thinking…</div>}
            <div ref={endRef} />
          </div>
          <form className="p-3 border-t flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!input.trim()) return; const t = input; setInput(""); run("chat", t); }}>
            <Textarea rows={1} value={input} onChange={(e) => setInput(e.target.value)} placeholder={notConfigured ? "AI not configured yet" : "Ask about inventory, customers, next steps…"} disabled={busy || notConfigured} className="min-h-[38px] resize-none" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement).requestSubmit(); } }} />
            <Button type="submit" size="icon" disabled={busy || notConfigured || !input.trim()}><Send className="h-4 w-4" /></Button>
          </form>
        </div>
      )}
    </>
  );
}
