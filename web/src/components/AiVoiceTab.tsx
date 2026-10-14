// Settings → AI Voice: the dealership picks the personality of its AI assistant and where customers hear it.
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, Loader2, Sparkles, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useTenant, saveTenantOverrides, type AiVoice } from "@/lib/tenant";
import { VOICE_PRESETS, VOICE_SCOPES, DEFAULT_VOICE, presetOf } from "@/lib/voices";
import { askAi, aiErrorMessage } from "@/lib/ai";
import PhoneAgentCard from "@/components/PhoneAgentCard";

const TRY_STAFF = "Give me a two-sentence status on the store today and the one thing I should do next.";
const TRY_CUSTOMER = "Write a short text to a customer named Maria thanking her for stopping by and inviting her back for a test drive.";

export default function AiVoiceTab({ canEdit }: { canEdit: boolean }) {
  const tenant = useTenant();
  const saved = tenant.aiVoice ?? DEFAULT_VOICE;
  const [v, setV] = useState<AiVoice>(saved);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ who: "team" | "customer"; text: string } | null>(null);
  const [trying, setTrying] = useState<"team" | "customer" | null>(null);
  useEffect(() => { setV(tenant.aiVoice ?? DEFAULT_VOICE); }, [tenant.aiVoice]);

  const p = presetOf(v);
  const dirty = JSON.stringify(v) !== JSON.stringify(saved);
  const pick = (id: AiVoice["preset"]) => setV((cur) => ({ ...cur, preset: id, name: id === "custom" ? cur.name : undefined }));

  const save = async () => {
    if (v.preset === "custom" && !(v.persona ?? "").trim()) return toast.error("Describe the custom voice first");
    setBusy(true);
    try { await saveTenantOverrides({ aiVoice: { ...v, name: v.name?.trim() || undefined, persona: v.preset === "custom" ? v.persona?.trim() : undefined } }); toast.success(`AI voice saved — ${v.name?.trim() || (p.defaultName === "Assistant" ? p.label : p.defaultName)} is live`); }
    catch (e: any) { toast.error(e.message || "Could not save"); }
    finally { setBusy(false); }
  };
  const tryIt = async (who: "team" | "customer") => {
    setTrying(who); setPreview(null);
    try {
      const text = who === "team" ? await askAi("chat", { messages: [{ role: "user", content: TRY_STAFF }], voice: v })
        : await askAi("follow_up_text", { messages: [{ role: "user", content: TRY_CUSTOMER }], voice: v });
      setPreview({ who, text });
    } catch (e) { setPreview({ who, text: "⚠ " + aiErrorMessage(e) }); }
    finally { setTrying(null); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> AI voice</CardTitle>
          <CardDescription>Pick the personality of your dealership's AI assistant. It applies to the AI chat, morning brief, coaching, follow-up texts and emails, listings and campaigns. Facts always come from your real data.</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-3">
            {VOICE_PRESETS.map((o) => {
              const on = v.preset === o.id;
              return (
                <button key={o.id} type="button" disabled={!canEdit} onClick={() => pick(o.id)} aria-pressed={on}
                  className={`flex flex-col justify-start text-left rounded-xl border-2 p-4 transition-all ${on ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"} disabled:opacity-70 disabled:cursor-not-allowed`}>
                  <div className="flex items-center gap-2"><span className="text-2xl leading-none">{o.badge}</span><p className="font-bold">{o.label}</p>{on && <Check className="h-4 w-4 text-primary ml-auto" />}</div>
                  <p className="text-sm text-muted-foreground mt-1.5">{o.blurb}</p>
                  {o.sample.a && <div className="mt-3 rounded-lg bg-muted/60 p-2.5 text-xs space-y-1"><p className="text-muted-foreground">“{o.sample.q}”</p><p className="font-medium">{o.sample.a}</p></div>}
                </button>
              );
            })}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Assistant name</Label><Input disabled={!canEdit} value={v.name ?? ""} placeholder={p.defaultName === "Assistant" ? "e.g. Max (optional)" : p.defaultName} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={40} />
              <p className="text-xs text-muted-foreground">Shown on the AI button and chat — "Ask {v.name?.trim() || (p.defaultName === "Assistant" ? "AI" : p.defaultName)}".</p></div>
          </div>
          {v.preset === "custom" && (
            <div className="space-y-1.5"><Label>Describe the voice</Label>
              <Textarea disabled={!canEdit} rows={4} value={v.persona ?? ""} onChange={(e) => setV({ ...v, persona: e.target.value })} maxLength={2000} placeholder="e.g. A laid-back New England guy, dry humor, says 'wicked', always honest about the car's condition, never pushy." />
              <p className="text-xs text-muted-foreground">Write it like you'd brief a new salesperson. Keep it respectful — the AI won't insult customers in any voice.</p></div>
          )}

          <div className="space-y-2">
            <Label>Where customers hear it</Label>
            <div className="grid gap-2">
              {VOICE_SCOPES.map((s) => {
                const on = v.scope === s.id;
                return (
                  <button key={s.id} type="button" disabled={!canEdit} onClick={() => setV({ ...v, scope: s.id })} aria-pressed={on}
                    className={`flex items-start gap-3 text-left rounded-lg border p-3 transition-colors ${on ? "border-primary bg-primary/5" : "hover:bg-muted/40"} disabled:cursor-not-allowed`}>
                    <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 grid place-items-center ${on ? "border-primary" : "border-muted-foreground/40"}`}>{on && <span className="h-2 w-2 rounded-full bg-primary" />}</span>
                    <span><span className="font-semibold text-sm block">{s.label}</span><span className="text-xs text-muted-foreground">{s.detail}</span></span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {canEdit ? <Button onClick={save} disabled={busy || !dirty}>{busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} {dirty ? "Save voice" : "Saved"}</Button>
              : <p className="text-sm text-muted-foreground">Only an admin or owner can change the AI voice.</p>}
            {dirty && canEdit && <Button variant="ghost" onClick={() => setV(saved)}>Undo changes</Button>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary" /> Try it</CardTitle>
          <CardDescription>Hear the voice on your real data before you save. Nothing is sent to customers.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => tryIt("team")} disabled={!!trying}>{trying === "team" && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} How it talks to the team</Button>
            <Button variant="outline" onClick={() => tryIt("customer")} disabled={!!trying}>{trying === "customer" && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} How it texts a customer</Button>
          </div>
          {preview && <div className="rounded-lg border bg-muted/40 p-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{preview.who === "team" ? "To the team" : "Customer text (draft only)"}</p><p className="text-sm whitespace-pre-wrap">{preview.text}</p></div>}
        </CardContent>
      </Card>
      {canEdit && <PhoneAgentCard voice={v} />}
    </div>
  );
}
