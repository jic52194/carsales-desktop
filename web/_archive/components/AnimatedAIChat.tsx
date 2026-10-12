import React, { useState, useEffect, useRef } from 'react';
import { Badge } from './ui/badge';
import { Bot, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CONVERSATION = [
  {
    type: 'customer',
    text: 'Hi, I saw the 2021 F-150 on your site. Is it still available? And what would payments look like with 5k down?',
    delay: 1000,
  },
  {
    type: 'ai',
    text: 'Hi there! Yes, the 2021 F-150 XLT is still available and ready for a test drive. With $5,000 down, payments would be roughly $580-$620/mo depending on approved credit.',
    delay: 2500,
  },
  {
    type: 'ai',
    text: 'Would you like to come in and see it today? We have openings at 2:15 PM or 4:30 PM.',
    delay: 1500,
  },
  {
    type: 'customer',
    text: '4:30 works for me',
    delay: 2000,
  },
  {
    type: 'ai',
    text: 'Perfect! You are scheduled for 4:30 PM today. I\'ve sent a calendar invite and directions to your phone. See you soon!',
    delay: 2000,
  },
  {
    type: 'system',
    text: 'CRM Updated: Appointment Set & Lead Scored (Hot)',
    delay: 1500,
  }
];

export const AnimatedAIChat = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const runSequence = () => {
      if (currentStep >= CONVERSATION.length) {
        // Loop after a delay
        timeoutId = setTimeout(() => {
          setMessages([]);
          setCurrentStep(0);
        }, 5000);
        return;
      }

      const nextMessage = CONVERSATION[currentStep];

      if (nextMessage.type === 'ai') {
        setIsTyping(true);
      }

      timeoutId = setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, nextMessage]);
        setCurrentStep(prev => prev + 1);
      }, nextMessage.delay);
    };

    runSequence();

    return () => clearTimeout(timeoutId);
  }, [currentStep]);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col h-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative">
      {/* Header */}
      <div className="bg-slate-900 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center border-2 border-slate-700">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">AI BDC Agent</h3>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-400 text-xs font-medium">Online & Active</span>
            </div>
          </div>
        </div>
        <Badge variant="outline" className="bg-white/10 text-white border-white/20">
          Auto-Pilot
        </Badge>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto bg-slate-50 space-y-4 flex flex-col justify-end min-h-[350px] scroll-smooth">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`flex w-full ${msg.type === 'customer' ? 'justify-end' : msg.type === 'system' ? 'justify-center' : 'justify-start'}`}
            >
              {msg.type === 'system' ? (
                <div className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {msg.text}
                </div>
              ) : (
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${msg.type === 'customer' ? 'bg-slate-900 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'}`}>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
              )}
            </motion.div>
          ))}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex justify-start"
            >
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Footer Caption */}
      <div className="bg-white border-t border-slate-100 p-4 text-center">
        <p className="text-sm font-bold text-slate-800 flex items-center justify-center gap-2">
          <SparklesIcon /> Your AI BDC never sleeps.
        </p>
      </div>
    </div>
  );
};

const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    <path d="M5 3v4"/>
    <path d="M19 17v4"/>
    <path d="M3 5h4"/>
    <path d="M17 19h4"/>
  </svg>
);
