import { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";

interface ChatMessage {
  id: string;
  sender: string;
  initials: string;
  role: string;
  text: string;
  time: string;
  color: string;
}

const MOCK_MESSAGES: ChatMessage[] = [
  { id: "1", sender: "Mike Ross", initials: "MR", role: "Sales", text: "Hey, I've got a customer interested in the 2024 Luxury SUV. Can you desk it?", time: "10:42 AM", color: "bg-blue-500" },
  { id: "2", sender: "Sarah Jenkins", initials: "SJ", role: "Sales Mgr", text: "On it. What's their credit like?", time: "10:43 AM", color: "bg-emerald-500" },
  { id: "3", sender: "Mike Ross", initials: "MR", role: "Sales", text: "680 FICO, $5k down. They want to stay under $600/mo.", time: "10:44 AM", color: "bg-blue-500" },
  { id: "4", sender: "David Chen", initials: "DC", role: "F&I", text: "I can make that work with a 72-month term at 5.99%. Sending you a deal jacket now.", time: "10:45 AM", color: "bg-violet-500" },
];

export function TeamChat() {
  const { role } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [input, setInput] = useState("");
  const [unread, setUnread] = useState(2);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }, 100);
    }
  }, [open, messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "You",
      initials: "You",
      role: role,
      text: input,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      color: "bg-primary",
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");

    // Simulate a reply
    setTimeout(() => {
      const reply: ChatMessage = {
        id: Date.now().toString() + "r",
        sender: "Sarah Jenkins",
        initials: "SJ",
        role: "Sales Mgr",
        text: "Got it. I'll review and get back to you in a few minutes.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        color: "bg-emerald-500",
      };
      setMessages((prev) => [...prev, reply]);
      if (!open) setUnread((u) => u + 1);
    }, 2500);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-24 md:bottom-4 right-4 z-[55] h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
        title="Team Chat"
      >
        {open ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-destructive rounded-full flex items-center justify-center text-[10px] font-bold text-destructive-foreground">
            {unread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-40 md:bottom-20 right-4 z-[55] w-[calc(100vw-2rem)] max-w-sm bg-background border border-border/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
          {/* Header */}
          <div className="flex items-center gap-2 p-3 border-b bg-primary/5">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-bold text-sm">Team Chat</span>
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <div className="flex -space-x-1.5">
                <div className="h-5 w-5 rounded-full ring-2 ring-background bg-blue-500 flex items-center justify-center text-[8px] font-bold text-white">MR</div>
                <div className="h-5 w-5 rounded-full ring-2 ring-background bg-emerald-500 flex items-center justify-center text-[8px] font-bold text-white">SJ</div>
                <div className="h-5 w-5 rounded-full ring-2 ring-background bg-violet-500 flex items-center justify-center text-[8px] font-bold text-white">DC</div>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">3 online</span>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[300px] min-h-[200px]">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.sender === "You" ? "flex-row-reverse" : ""}`}>
                <div className={`h-7 w-7 rounded-full ${msg.color} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                  {msg.initials}
                </div>
                <div className={`max-w-[75%] ${msg.sender === "You" ? "items-end" : ""}`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-bold">{msg.sender}</span>
                    <span className="text-[9px] text-muted-foreground">{msg.time}</span>
                  </div>
                  <div className={`rounded-2xl px-3 py-2 text-sm ${msg.sender === "You" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"}`}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 h-9 px-3 rounded-lg bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <Button size="icon" className="h-9 w-9 shrink-0" onClick={sendMessage}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
