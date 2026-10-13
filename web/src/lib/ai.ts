// Client for the ai-assist Edge Function (Claude runs server-side with the caller's RLS-scoped data).
import { supabase } from "@/lib/supabase";

export type AiTask = "chat" | "vehicle_description" | "follow_up_text" | "follow_up_email" | "customer_summary" | "daily_brief" | "inventory_question";
export interface AiMessage { role: "user" | "assistant"; content: string }

export class AiNotConfigured extends Error { code = "no_key"; }

export async function askAi(task: AiTask, opts: { messages?: AiMessage[]; context?: { vehicleId?: string; customerId?: string; includeInventory?: boolean } } = {}): Promise<string> {
  const { data, error } = await supabase.functions.invoke("ai-assist", { body: { task, messages: opts.messages ?? [], context: opts.context ?? {} } });
  if (error) {
    // supabase-js wraps non-2xx; try to read our JSON body for a clear message
    const ctx = (error as any).context as Response | undefined;
    let msg = error.message;
    try { const j = ctx ? await ctx.json() : null; if (j?.code === "no_key") throw new AiNotConfigured(j.error); if (j?.error) msg = j.error; } catch (e) { if (e instanceof AiNotConfigured) throw e; }
    throw new Error(msg);
  }
  return (data as any)?.text ?? "";
}

export async function syncInventoryNow(): Promise<any> {
  const { data, error } = await supabase.functions.invoke("sync-inventory", { body: {} });
  if (error) throw new Error(error.message);
  return data;
}
