// AI brand voices a dealership can pick in Settings → AI Voice.
// The prompt text lives server-side in the ai-assist Edge Function; this file is the UI catalog.
import { useTenant, type AiVoice, type AiVoicePreset, type AiVoiceScope } from "@/lib/tenant";

export interface VoicePreset { id: AiVoicePreset; label: string; badge: string; defaultName: string; blurb: string; sample: { q: string; a: string } }

export const VOICE_PRESETS: VoicePreset[] = [
  { id: "professional", label: "Professional", badge: "💼", defaultName: "Assistant", blurb: "Clear, polished and efficient — like a sharp sales manager.",
    sample: { q: "Which units need a price move?", a: "The 2017 Infiniti QX60 has been in stock 95 days. I recommend a $500 reduction this week to bring it in line with the market." } },
  { id: "friendly", label: "Friendly local", badge: "😊", defaultName: "Assistant", blurb: "Warm, upbeat and neighborly — a family-dealership feel.",
    sample: { q: "Which units need a price move?", a: "Good news, only three! The QX60 has been hanging around 95 days — a small drop should get it moving this weekend." } },
  { id: "felipe", label: "Felipe", badge: "🇩🇴", defaultName: "Felipe", blurb: "The world's first Dominican AI — straight from the barrio. English, Spanish, Spanglish and fluent street. Gives you the info AND tells you what's really going on.",
    sample: { q: "Felipe, which units need a price move?", a: "Loco, that QX60 been sitting 95 days — that car got more seniority than you, campeón. Drop it $500 today y dale, it moves by Saturday." } },
  { id: "custom", label: "Custom", badge: "✍️", defaultName: "Assistant", blurb: "Describe your own personality — your owner's style, your brand, your market.",
    sample: { q: "", a: "" } },
];

export const VOICE_SCOPES: { id: AiVoiceScope; label: string; detail: string }[] = [
  { id: "staff", label: "Team only", detail: "The voice talks to your staff (AI chat, morning brief, coaching). Everything customers see stays professional." },
  { id: "light", label: "Team + a light touch for customers", detail: "Full voice for the team. Customer texts, emails and listings get a warm, light hint of it — never teasing." },
  { id: "everywhere", label: "Everywhere", detail: "The voice shows up in customer texts, emails, campaigns and website listings too. It never insults customers and keeps compliance language." },
];

export const DEFAULT_VOICE: AiVoice = { preset: "professional", scope: "staff" };

export function presetOf(v?: AiVoice | null): VoicePreset { return VOICE_PRESETS.find((p) => p.id === v?.preset) ?? VOICE_PRESETS[0]; }

/** The assistant's display name + badge for this dealership (e.g. "Felipe 🇩🇴", or "AI assistant"). */
export function useAiVoice() {
  const tenant = useTenant();
  const v = tenant.aiVoice ?? DEFAULT_VOICE;
  const p = presetOf(v);
  const name = (v.name?.trim() || p.defaultName);
  const named = name !== "Assistant";
  return { voice: v, preset: p, name, named, title: named ? `${name}${p.badge && p.id !== "custom" ? " " + p.badge : ""}` : "AI assistant" };
}
