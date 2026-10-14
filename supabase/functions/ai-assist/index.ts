// ai-assist — dealership AI assistant. Runs Claude server-side with the caller's own tenant data.
// Auth: signed-in user JWT (verified). Anthropic key: the dealership's own key saved in Settings → Connections
// (integration_secrets, service-role only), else the platform ANTHROPIC_API_KEY secret. Never sent to the browser.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PLATFORM_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
async function tenantKey(tenantId: string): Promise<string | null> {
  const { data: row } = await admin.from("integrations").select("id,status").eq("tenant_id", tenantId).eq("provider", "anthropic").maybeSingle();
  if (!row || row.status !== "connected") return null;
  const { data: sec } = await admin.from("integration_secrets").select("secret").eq("integration_id", row.id).maybeSingle();
  return sec?.secret ?? null;
}
const MODEL = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-4-5";

const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type, apikey, x-client-info", "content-type": "application/json" };
// feed text can carry broken emoji (lone surrogates) that Anthropic rejects with a 400
const wf = (t: string) => (typeof (t as any).toWellFormed === "function" ? (t as any).toWellFormed() : t.replace(/[\uD800-\uDFFF]/g, ""));

// ── Brand voice (Settings → AI Voice). Staff tasks always get the full voice; customer-facing tasks follow the scope. ──
const CUSTOMER_TASKS = new Set(["follow_up_text", "follow_up_email", "vehicle_description", "reply_suggestion", "campaign_copy"]);
const VOICES: Record<string, { name: string; staff: string; light: string; full: string }> = {
  professional: { name: "Assistant",
    staff: "Voice: clear, professional and efficient — like a sharp sales manager.",
    light: "Voice: professional, warm and clear.", full: "Voice: professional, warm and clear." },
  friendly: { name: "Assistant",
    staff: "Voice: upbeat, casual and encouraging, like a friendly teammate on the floor. Light humor is fine.",
    light: "Voice: warm, upbeat and neighborly — like a local family dealership.",
    full: "Voice: warm, upbeat, casual and neighborly with a touch of humor — like a local family dealership." },
  felipe: { name: "Felipe",
    staff: `You are FELIPE 🇩🇴 — the world's first Dominican AI, raised in the barrio, not Silicon Valley. You speak English, Spanish, Spanglish and fluent street, and you switch naturally (mostly English so everyone follows, with Spanish/Dominican phrases sprinkled in: "loco", "mi hermano", "campeón", "klk", "tranquilo", "dale", "vamo' allá", "qué lo que"). You don't just give information — you tell people what's REALLY going on, with blunt, funny, tough-love honesty ("ChatGPT tiene los libros. Yo tengo la calle."). Roast the team lightly when they slack (missed follow-ups, aging units, unworked leads), then give the real answer and the next move. Keep it short and punchy. Never vulgar or crude, no slurs, nothing sexual, never mean about anyone's background — the attitude is love, not disrespect. Facts, numbers and names must still be 100% accurate from the data.`,
    light: `Voice: Felipe 🇩🇴 — warm, confident and friendly with a light Dominican/Spanglish touch (one short phrase like "¡Saludos!", "mi amigo", "dale" at most). Respectful and welcoming; no teasing or slang toward the customer.`,
    full: `Voice: FELIPE 🇩🇴 — confident, funny, street-smart Dominican charm with Spanglish sprinkled in ("¡Klk!", "mi hermano", "dale", "vamo' allá", "te tengo"). Make it fun and memorable, like a friend who knows cars. NEVER insult, roast or tease the customer, no slang that could read as rude, nothing vulgar. Stay accurate and compliant: real data only, payments are "estimated", no approval promises, keep required opt-out text.` },
};
function voiceFor(v: any, task: string): { name: string; text: string } {
  const preset = v?.preset && (VOICES[v.preset] || v.preset === "custom") ? v.preset : "professional";
  const scope = ["staff", "light", "everywhere"].includes(v?.scope) ? v.scope : "staff";
  const custom = typeof v?.persona === "string" ? v.persona.slice(0, 2000) : "";
  const base = preset === "custom" ? { name: v?.name || "Assistant", staff: `Voice / personality (set by the dealership): ${custom}`, light: `Voice: professional, with a light touch of this personality: ${custom}`, full: `Voice / personality (set by the dealership): ${custom}. Never insult the customer; stay accurate and compliant.` } : VOICES[preset];
  const name = (typeof v?.name === "string" && v.name.trim()) ? v.name.trim().slice(0, 40) : base.name;
  if (!CUSTOMER_TASKS.has(task)) return { name, text: base.staff };
  if (scope === "staff") return { name, text: VOICES.professional.full + " (Customer-facing: keep it professional.)" };
  return { name, text: scope === "light" ? base.light : base.full };
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "unauthorized" }, 401);
  // RLS-scoped client as the caller: every read below is limited to their dealership automatically
  const asUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false } });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ error: "unauthorized" }, 401);
  const body = await req.json().catch(() => ({}));
  const task: string = body.task || "chat";
  const messages: { role: "user" | "assistant"; content: string }[] = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  const ctx: Record<string, unknown> = body.context || {};

  const { data: me } = await asUser.rpc("me");
  const tenant = me?.tenant ?? {}; const profile = me?.profile ?? {};
  const ANTHROPIC_KEY = (profile.tenant_id ? await tenantKey(profile.tenant_id) : null) || PLATFORM_KEY;
  if (!ANTHROPIC_KEY) return json({ error: "AI isn't set up yet — an admin can add the Anthropic API key in Settings → Connections.", code: "no_key" }, 503);

  // Pull the pieces of dealership data the task needs (all through RLS)
  let dataBlock = "";
  if (ctx.vehicleId) { const { data: v } = await asUser.from("vehicles").select("*").eq("id", ctx.vehicleId).single(); if (v) dataBlock += `\nVEHICLE: ${JSON.stringify({ ...v, images: undefined })}`; }
  if (ctx.customerId) {
    const { data: c } = await asUser.from("customers").select("*").eq("id", ctx.customerId).single();
    const { data: ls } = await asUser.from("leads").select("stage,source,notes,created_at,vehicle_id").eq("customer_id", ctx.customerId);
    if (c) dataBlock += `\nCUSTOMER: ${JSON.stringify(c)}\nLEADS: ${JSON.stringify(ls ?? [])}`;
  }
  if (task === "inventory_question" || ctx.includeInventory) {
    const { data: inv } = await asUser.from("vehicles").select("stock_number,year,make,model,trim,mileage,price,exterior_color,status,drivetrain,fuel_type").eq("status", "Available").order("price", { ascending: true }).limit(300);
    dataBlock += `\nAVAILABLE INVENTORY (${inv?.length ?? 0} units): ${JSON.stringify(inv ?? [])}`;
  }
  if (Array.isArray(ctx.conversation) && ctx.conversation.length) {
    const conv = (ctx.conversation as any[]).slice(-20).map((m) => `${m.direction === "inbound" ? "CUSTOMER" : "DEALERSHIP"} (${m.channel ?? "sms"}, ${m.at ?? ""}): ${String(m.body ?? "").slice(0, 600)}`).join("\n");
    dataBlock += `\nRECENT CONVERSATION (oldest first):\n${conv}`;
  }
  if (ctx.dealId) { const { data: d } = await asUser.from("deals").select("*").eq("id", ctx.dealId).single(); if (d) dataBlock += `\nDEAL: ${JSON.stringify(d)}`; }
  if (task === "daily_brief") {
    const since = new Date(Date.now() - 7 * 86400e3).toISOString();
    const [{ data: leads }, { data: deals }, { data: appts }, { data: tasks }] = await Promise.all([
      asUser.from("leads").select("stage,source,created_at").gte("created_at", since),
      asUser.from("deals").select("status,sale_price,monthly_payment,updated_at").gte("updated_at", since),
      asUser.from("appointments").select("type,starts_at,status").gte("starts_at", new Date().toISOString()).limit(30),
      asUser.from("tasks").select("title,due_at,status,priority").eq("status", "open").limit(50),
    ]);
    dataBlock += `\nLAST 7 DAYS — LEADS: ${JSON.stringify(leads)}\nDEALS: ${JSON.stringify(deals)}\nUPCOMING APPOINTMENTS: ${JSON.stringify(appts)}\nOPEN TASKS: ${JSON.stringify(tasks)}`;
  }

  const voice = voiceFor(body.voice && typeof body.voice === "object" ? body.voice : tenant.ai_voice, task);
  const system = `You are ${voice.name === "Assistant" ? "the AI assistant" : voice.name + ", the AI assistant"} inside CarSales AI OS for ${tenant.name ?? "a car dealership"} (${tenant.address?.city ?? ""}, ${tenant.address?.state ?? ""}). You are talking to ${profile.full_name ?? "a team member"} (role: ${profile.role ?? "staff"}).
Be concise, practical and specific to this dealership. Only use the dealership data provided below; never invent vehicles, prices, customers or history. If data needed isn't provided, say so.
Tasks you help with: writing follow-up texts/emails to customers (short, friendly, compliant — no payment promises, say "estimated" for payments), vehicle descriptions for listings, answering questions about available inventory, summarizing a customer's history, suggesting next steps on a lead, and a morning brief.
Dealership facts: phone ${tenant.phone ?? ""}, website ${tenant.website ?? ""}, hours ${JSON.stringify(tenant.hours ?? {})}. Disclaimers: ${(tenant.disclaimers ?? []).join(" ")}
${voice.text}
${dataBlock}`;

  const prompts: Record<string, string> = {
    vehicle_description: "Write a 90-130 word listing description for this vehicle for the dealership website. Plain, honest, no hype words like 'stunning'. Mention 3-5 concrete features from the data. End with a call to action to call or visit.",
    follow_up_text: "Write a short SMS (under 320 characters) to this customer from their salesperson, referencing their vehicle of interest and inviting them to a test drive. Friendly, no pressure, one question at the end.",
    follow_up_email: "Write a brief follow-up email (subject line + 4-6 sentences) to this customer about their vehicle of interest.",
    customer_summary: "Summarize this customer's history and suggest the single best next step.",
    daily_brief: "Give a morning brief for this dealership in 6-10 bullet-free sentences: what came in, what's hot, what's overdue, and the 3 things to do today.",
    reply_suggestion: "Read the recent conversation and write the dealership's next reply to the customer as a short SMS (under 320 characters). Answer what they asked using only the data provided; if something isn't in the data (price, availability), say you'll confirm. Move toward an appointment. Output only the message text.",
    deal_coach: "Look at this deal and give the salesperson 3 concrete, compliant ideas to structure it better (down payment, term, products, trade) in plain sentences. Never promise approval or rates.",
    appraisal_notes: "Write short, factual appraisal notes for this trade-in from the data provided: condition summary, reconditioning to expect, and questions to ask the customer.",
    campaign_copy: "Write a short SMS campaign message (under 300 characters) and a matching email (subject + 4 sentences) for the dealership, based on the request. Include an opt-out line in the SMS ('Reply STOP to opt out').",
  };
  // a task with the user's own words (e.g. "campaign for AWD SUVs") → the task instruction rides in the system prompt
  const sys = messages.length && prompts[task] ? `${system}\n\nTASK: ${prompts[task]}` : system;
  const userMsgs = messages.length ? messages : [{ role: "user" as const, content: prompts[task] ?? "How can you help?" }];

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 1024, system: wf(sys), messages: userMsgs.map((m) => ({ role: m.role, content: wf(String(m.content ?? "")) || "…" })) }),
  });
  if (!r.ok) {
    const t = await r.text();
    let apiMsg = ""; try { apiMsg = JSON.parse(t)?.error?.message ?? ""; } catch { apiMsg = t.slice(0, 200); }
    console.error("anthropic_error", r.status, task, apiMsg);
    const friendly = /credit balance/i.test(apiMsg) ? "Your Anthropic account is out of credits. Add credits at console.anthropic.com → Settings → Billing, then try again."
      : r.status === 401 ? "Anthropic rejected the API key. Paste a new key in Settings → Connections."
      : r.status === 429 || r.status === 529 ? "The AI is busy right now — try again in a minute."
      : `AI request failed (${r.status})${apiMsg ? ": " + apiMsg : ""}`;
    return json({ error: friendly, detail: apiMsg.slice(0, 300) }, 502);
  }
  const out = await r.json();
  const textOut = (out.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim();
  // audit (service role; RLS insert policy would also allow the user, but keep it server-side)
  await createClient(SUPABASE_URL, SERVICE_KEY).from("audit_log").insert({ tenant_id: profile.tenant_id, user_id: user.id, action: "ai_assist", entity: task, entity_id: (ctx.vehicleId || ctx.customerId || null) as any, details: { chars: textOut.length, model: MODEL, voice: voice.name } });
  return json({ text: textOut, model: MODEL, voice: voice.name });
});
