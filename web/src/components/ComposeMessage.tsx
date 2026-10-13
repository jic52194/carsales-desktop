// Text or email one customer. Sends through GoHighLevel (from the dealership's number/address) when it's
// connected; otherwise opens the device's Messages / Mail app and logs the outbound message.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { MessageSquare, Mail, Sparkles, Loader2, Send, Plug } from "lucide-react";
import { toast } from "sonner";
import { fullName, logActivity, type Customer } from "@/lib/store";
import { addRecord } from "@/lib/records";
import { useAuth } from "@/lib/auth";
import { askAi, aiErrorMessage, type AiConversationMessage } from "@/lib/ai";
import { useGhlStatus, ghlSend, ghlErrorMessage, refreshGhlStatus, isGhlNotConnected, type GhlChannel, type MessageRecord } from "@/lib/ghl";
import { smsHref, mailtoHref } from "@/pages/TextingTemplates";

/**
 * Send one message to a customer. GoHighLevel connected → sends from the dealership (the ghl function logs it).
 * Otherwise (or if GHL turns out to be disconnected) → logs an outbound record and opens the device's Messages/Mail app.
 * Throws on GHL errors other than "not connected" so callers can show them.
 */
export async function deliverMessage(p: { customer: Customer; channel: GhlChannel; body: string; subject?: string; ghlConnected: boolean; userId?: string; activity?: { entity: string; id: string } }): Promise<"ghl" | "device"> {
  const text = p.body.trim();
  if (p.ghlConnected) {
    try {
      await ghlSend({ customerId: p.customer.id, channel: p.channel, body: text, subject: p.channel === "email" ? p.subject?.trim() || undefined : undefined });
      if (p.activity) logActivity(p.channel, p.activity.entity, p.activity.id, text.slice(0, 140), p.userId);
      return "ghl";
    } catch (e) {
      if (!isGhlNotConnected(e)) throw e;
      refreshGhlStatus(true).catch(() => {});
      toast.message("GoHighLevel isn't connected — opening your device's app instead.");
    }
  }
  const rec: MessageRecord = { customerId: p.customer.id, channel: p.channel, direction: "out", body: text, subject: p.channel === "email" ? p.subject?.trim() || undefined : undefined, at: new Date().toISOString(), by: p.userId, via: "device" };
  await addRecord<MessageRecord>("message", rec, p.userId);
  logActivity(p.channel, p.activity?.entity ?? "customer", p.activity?.id ?? p.customer.id, text.slice(0, 140), p.userId);
  window.location.href = p.channel === "sms" ? smsHref(p.customer.phone, text) : mailtoHref(p.customer.email, p.subject?.trim() ?? "", text);
  return "device";
}

export interface ComposeMessageProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  customer?: Customer | null;
  defaultChannel?: GhlChannel;
  defaultBody?: string;
  defaultSubject?: string;
  /** Vehicle of interest — handed to the AI drafter. */
  vehicleId?: string;
  /** Recent conversation (oldest first). When present, "AI draft" writes a reply to it. */
  conversation?: AiConversationMessage[];
  /** Extra activity entry, e.g. { entity: "lead", id } so the lead shows the touch. */
  activity?: { entity: string; id: string };
  title?: string;
  onSent?: (info: { channel: GhlChannel; body: string; viaGhl: boolean }) => void;
}

export function ComposeMessage({ open, onOpenChange, customer, defaultChannel, defaultBody, defaultSubject, vehicleId, conversation, activity, title, onSent }: ComposeMessageProps) {
  const { user } = useAuth();
  const ghl = useGhlStatus();
  const hasPhone = !!customer?.phone; const hasEmail = !!customer?.email;
  const pickChannel = (): GhlChannel => { const want = defaultChannel ?? "sms"; if (want === "sms" && !hasPhone && hasEmail) return "email"; if (want === "email" && !hasEmail && hasPhone) return "sms"; return want; };
  const [channel, setChannel] = useState<GhlChannel>(pickChannel);
  const [subject, setSubject] = useState(defaultSubject ?? "");
  const [body, setBody] = useState(defaultBody ?? "");
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setChannel(pickChannel()); setSubject(defaultSubject ?? ""); setBody(defaultBody ?? ""); setAiNote(null);
  }, [open, customer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!customer) return null;
  const canUse = channel === "sms" ? hasPhone : hasEmail;
  const reason = channel === "sms" && !hasPhone ? "No phone number on file" : channel === "email" && !hasEmail ? "No email on file" : null;

  const draft = async () => {
    setDrafting(true); setAiNote(null);
    try {
      const task = conversation?.length ? "reply_suggestion" : channel === "email" ? "follow_up_email" : "follow_up_text";
      let text = await askAi(task, { context: { customerId: customer.id, vehicleId, conversation } });
      if (channel === "email") {
        const m = text.match(/^\s*subject:\s*(.+)$/im);
        if (m) { if (!subject.trim()) setSubject(m[1].trim()); text = text.replace(m[0], "").trim(); }
      }
      if (!text) setAiNote("The assistant returned an empty draft — write it yourself below.");
      else setBody(text);
    } catch (e) { setAiNote(aiErrorMessage(e)); } finally { setDrafting(false); }
  };

  const send = async () => {
    const text = body.trim();
    if (!text || !canUse) return;
    setSending(true);
    try {
      const via = await deliverMessage({ customer, channel, body: text, subject, ghlConnected: ghl.connected, userId: user?.id, activity });
      if (via === "ghl") toast.success(channel === "sms" ? `Text sent to ${fullName(customer)}` : `Email sent to ${fullName(customer)}`);
      onSent?.({ channel, body: text, viaGhl: via === "ghl" }); onOpenChange(false);
    } catch (e) { toast.error(ghlErrorMessage(e)); } finally { setSending(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title ?? `Message ${fullName(customer)}`}</DialogTitle>
          <DialogDescription>{channel === "sms" ? customer.phone || "No phone on file" : customer.email || "No email on file"}{ghl.connected ? " · sends from the dealership via GoHighLevel" : ""}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant={channel === "sms" ? "default" : "outline"} disabled={!hasPhone} title={hasPhone ? "" : "No phone number on file"} onClick={() => setChannel("sms")}><MessageSquare className="h-4 w-4 mr-1" /> Text</Button>
            <Button type="button" size="sm" variant={channel === "email" ? "default" : "outline"} disabled={!hasEmail} title={hasEmail ? "" : "No email on file"} onClick={() => setChannel("email")}><Mail className="h-4 w-4 mr-1" /> Email</Button>
            <Button type="button" size="sm" variant="secondary" onClick={draft} disabled={drafting} className="ml-auto">{drafting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />} {conversation?.length ? "AI reply" : "AI draft"}</Button>
          </div>
          {(!hasPhone || !hasEmail) && <p className="text-xs text-muted-foreground">{!hasPhone && !hasEmail ? "This customer has no phone or email — add one on their profile first." : !hasPhone ? "Texting is off: no phone number on file." : "Email is off: no email on file."}</p>}
          {aiNote && <p className="text-sm rounded-md border border-amber-300 bg-amber-50 text-amber-900 p-2">{aiNote}</p>}
          {channel === "email" && <div className="space-y-1"><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Following up" /></div>}
          <div className="space-y-1"><Label>Message</Label><Textarea rows={channel === "sms" ? 5 : 8} value={body} onChange={(e) => setBody(e.target.value)} placeholder={drafting ? "Drafting…" : "Type your message, or use AI draft."} />{channel === "sms" && <p className="text-[11px] text-muted-foreground text-right">{body.length} characters{body.length > 160 ? ` · ${Math.ceil(body.length / 153)} segments` : ""}</p>}</div>
          {!ghl.loading && !ghl.connected && <p className="text-xs flex items-start gap-1.5 text-muted-foreground"><Plug className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span>Send opens your device's {channel === "sms" ? "Messages" : "Mail"} app and logs the message here. <Link to="/settings" className="underline text-primary">Connect GoHighLevel</Link> to send from the dealership number.</span></p>}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={sending || !body.trim() || !canUse} title={reason ?? ""}>{sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />} {ghl.connected ? "Send" : channel === "sms" ? "Open Messages" : "Open Mail"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
