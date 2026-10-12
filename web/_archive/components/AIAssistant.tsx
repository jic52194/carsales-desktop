import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { MessageCircle, X, Sparkles, Send } from "lucide-react";

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hi! I'm your AI Desking Assistant. I can analyze credit, suggest deal structures, or answer inventory questions." }
  ]);
  const [input, setInput] = useState("");

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-ai-assistant', handleOpen);
    return () => window.removeEventListener('open-ai-assistant', handleOpen);
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = input;
    setMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setInput("");
    
    try {
      const savedWebhooks = localStorage.getItem("system_webhooks");
      const webhooks = savedWebhooks ? JSON.parse(savedWebhooks) : {};
      const aiWebhookUrl = webhooks["ai.prompt"];

      if (aiWebhookUrl) {
        // Send to configured webhook
        setMessages(prev => [...prev, { role: "ai", text: "..." }]); // Loading indicator
        
        await fetch(aiWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "ai.prompt",
            message: userMessage,
            timestamp: new Date().toISOString(),
          }),
        });

        // Replace loading indicator with success message
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages.pop(); // Remove loading
          return [...newMessages, { 
            role: "ai", 
            text: "Message sent to your webhook! Your workflow should process it shortly." 
          }];
        });
      } else {
        // Fallback mock response if no webhook is configured
        setTimeout(() => {
          setMessages(prev => [...prev, { 
            role: "ai", 
            text: "Please configure your AI Webhook URL in Settings -> Webhooks (event: ai.prompt) to connect this assistant to your real workflows (e.g. GHL, Make, Zapier)." 
          }]);
        }, 1000);
      }
    } catch (error) {
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop(); // Remove loading if it was added
        return [...newMessages, { 
          role: "ai", 
          text: "Error sending to webhook. Please check your URL configuration." 
        }];
      });
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Button
          data-tour-id="tour-ai-text"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-[0_10px_40px_-10px_rgba(var(--primary),0.5)] p-0 flex items-center justify-center bg-primary hover:bg-primary/90 z-50 transition-transform hover:scale-105 active:scale-95"
        >
          <Sparkles className="h-6 w-6 text-white" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[calc(100vw-3rem)] sm:w-96 h-[500px] max-h-[calc(100vh-6rem)] shadow-2xl flex flex-col z-50 border-primary/20 overflow-hidden">
          <CardHeader className="p-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground flex flex-row items-center justify-between rounded-t-xl shrink-0">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary-foreground/80" /> AI Dealership Copilot
              </CardTitle>
              <p className="text-[10px] text-primary-foreground/70 font-medium uppercase tracking-wider mt-0.5">Powered by LeadConnector</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary/20 rounded-full" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 p-0 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "ai" ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                      msg.role === "ai" 
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-tl-sm shadow-sm" 
                        : "bg-primary text-primary-foreground rounded-tr-sm shadow-sm"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="p-3 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3">
              {messages.length === 1 && (
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setInput("Write a follow-up email for Sarah Jenkins")} className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded border border-primary/20 hover:bg-primary/20 text-left">Write follow-up email</button>
                  <button onClick={() => setInput("Analyze my active deals pipeline")} className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded border border-primary/20 hover:bg-primary/20 text-left">Analyze pipeline</button>
                  <button onClick={() => setInput("Identify aged inventory > 60 days")} className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded border border-primary/20 hover:bg-primary/20 text-left">Find aged inventory</button>
                </div>
              )}
              <div className="flex gap-2">
                <Input 
                  placeholder="Ask the AI Copilot..." 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="bg-slate-50 dark:bg-slate-900 focus-visible:ring-primary h-10"
                />
                <Button size="icon" onClick={handleSend} className="bg-primary hover:bg-primary/90 h-10 w-10 shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
