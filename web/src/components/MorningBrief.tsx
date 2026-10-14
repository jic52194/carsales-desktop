// Manager's morning brief: Claude reads the last 7 days of leads/deals, upcoming appointments and open tasks.
// One run per day is cached in this browser; "Refresh" asks again.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { askAi, AiNotConfigured, AI_NOT_CONFIGURED_MSG, aiErrorMessage } from "@/lib/ai";
import { getTenantId } from "@/lib/tenant";
import { useAuth } from "@/lib/auth";

interface Cached { day: string; text: string; at: string }
const today = () => new Date().toDateString();

export function MorningBrief() {
  const { user } = useAuth();
  const key = `cso:${getTenantId()}:brief:${user?.id ?? "anon"}`;
  const [brief, setBrief] = useState<Cached | null>(() => { try { const c = JSON.parse(localStorage.getItem(key) || "null") as Cached | null; return c && c.day === today() ? c : null; } catch { return null; } });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  const run = async () => {
    setBusy(true); setNote(null);
    try {
      const text = await askAi("daily_brief");
      if (!text) { setNote("The assistant returned an empty brief. Try again in a minute."); return; }
      const c: Cached = { day: today(), text, at: new Date().toISOString() };
      setBrief(c); try { localStorage.setItem(key, JSON.stringify(c)); } catch {}
    } catch (e) {
      if (e instanceof AiNotConfigured) setNotConfigured(true);
      setNote(aiErrorMessage(e));
    } finally { setBusy(false); }
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 space-y-0 pb-3">
        <div><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Morning brief</CardTitle><CardDescription>{brief ? `Generated ${new Date(brief.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} from your live leads, deals, appointments and tasks` : "What came in, what's hot, what's overdue — written from your real data in about 10 seconds."}</CardDescription></div>
        {!notConfigured && <Button size="sm" variant={brief ? "outline" : "default"} onClick={run} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : brief ? <RefreshCw className="h-4 w-4 mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />} {brief ? "Refresh" : "Get today's brief"}</Button>}
      </CardHeader>
      <CardContent className={!brief && !busy && !note && !notConfigured ? "hidden" : undefined}>
        {notConfigured ? <p className="text-sm text-muted-foreground">{AI_NOT_CONFIGURED_MSG}</p> : (
          <>
            {note && <p className="text-sm rounded-md border border-amber-300 bg-amber-50 text-amber-900 p-2 mb-2">{note}</p>}
            {brief ? <p className="text-sm whitespace-pre-wrap leading-relaxed">{brief.text}</p> : null}
            {busy && !brief && <p className="text-sm text-muted-foreground">Reading today's numbers…</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
