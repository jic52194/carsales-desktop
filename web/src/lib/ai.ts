// Client for the ai-assist Edge Function (Claude runs server-side with the caller's RLS-scoped data).
import { supabase } from "@/lib/supabase";

export type AiTask =
  | "chat" | "vehicle_description" | "follow_up_text" | "follow_up_email" | "customer_summary" | "daily_brief" | "inventory_question"
  | "reply_suggestion" | "deal_coach" | "appraisal_notes" | "campaign_copy";
export interface AiConversationMessage { direction: "inbound" | "outbound"; channel?: string; body: string; at?: string }
export interface AiContext { vehicleId?: string; customerId?: string; dealId?: string; includeInventory?: boolean; conversation?: AiConversationMessage[] }
/** Shown wherever an AI button runs while no Anthropic key is configured. */
export const AI_NOT_CONFIGURED_MSG = "AI isn't set up yet — an admin can add the Anthropic key in Settings → Connections.";
export interface AiMessage { role: "user" | "assistant"; content: string }

export class AiNotConfigured extends Error { code = "no_key"; constructor(msg?: string) { super(msg || AI_NOT_CONFIGURED_MSG); } }

export async function askAi(task: AiTask, opts: { messages?: AiMessage[]; context?: AiContext; voice?: unknown } = {}): Promise<string> {
  const { data, error } = await supabase.functions.invoke("ai-assist", { body: { task, messages: opts.messages ?? [], context: opts.context ?? {}, ...(opts.voice ? { voice: opts.voice } : {}) } });
  if (error) {
    // supabase-js wraps non-2xx; try to read our JSON body for a clear message
    const ctx = (error as any).context as Response | undefined;
    let msg = error.message;
    try { const j = ctx ? await ctx.json() : null; if (j?.code === "no_key") throw new AiNotConfigured(); if (j?.error) msg = j.error; } catch (e) { if (e instanceof AiNotConfigured) throw e; }
    throw new Error(msg);
  }
  return (data as any)?.text ?? "";
}

/** Friendly message for any AI failure (not-configured → the standard setup hint). */
export function aiErrorMessage(e: unknown): string {
  if (e instanceof AiNotConfigured) return AI_NOT_CONFIGURED_MSG;
  return (e as any)?.message || "The AI assistant couldn't finish that. Try again.";
}

export async function syncInventoryNow(): Promise<any> {
  const { data, error } = await supabase.functions.invoke("sync-inventory", { body: {} });
  if (error) throw new Error(error.message);
  return data;
}
