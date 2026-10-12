import React, { useState } from 'react';
import { Bot, Check, X, Edit2, Send, Clock, AlertTriangle, MessageSquare, Mail, User, Phone, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Suggestion {
  id: string;
  customerName: string;
  vehicleOfInterest: string;
  reason: string;
  type: 'sms' | 'email';
  draft: string;
  confidence: number;
  lastContact: string;
  status: 'pending' | 'approved' | 'skipped' | 'edited';
}

const INITIAL_SUGGESTIONS: Suggestion[] = [
  {
    id: '1',
    customerName: 'Sarah Jenkins',
    vehicleOfInterest: '2024 Honda CR-V',
    reason: 'Missed Appointment (Test Drive)',
    type: 'sms',
    draft: "Hi Sarah, it's Mike from Premier Auto. I noticed we missed you for your CR-V test drive today. Is everything okay? Let me know if you'd like to reschedule for tomorrow or later this week.",
    confidence: 95,
    lastContact: 'Yesterday',
    status: 'pending',
  },
  {
    id: '2',
    customerName: 'David Chen',
    vehicleOfInterest: '2023 Toyota Tacoma',
    reason: 'Cold Lead (No contact in 7 days)',
    type: 'email',
    draft: "Subject: Still looking for a Tacoma, David?\n\nHi David,\n\nI'm reaching out because we just got a fresh 2023 Tacoma TRD Off-Road in stock that matches what you were looking for last week. It hasn't hit the website yet.\n\nWould you like me to send over a quick video walkaround?\n\nBest,\nMike",
    confidence: 88,
    lastContact: '7 days ago',
    status: 'pending',
  },
  {
    id: '3',
    customerName: 'Amanda Rodriguez',
    vehicleOfInterest: '2021 Ford Explorer',
    reason: 'Price Drop Alert',
    type: 'sms',
    draft: "Hi Amanda! The 2021 Ford Explorer you looked at just had a price drop of $1,000. It's now right in your target budget. Want to come take another look before the weekend?",
    confidence: 92,
    lastContact: '3 days ago',
    status: 'pending',
  },
  {
    id: '4',
    customerName: 'Marcus Johnson',
    vehicleOfInterest: '2024 Honda Accord',
    reason: 'Objection Detected: Price too high',
    type: 'sms',
    draft: "Hi Marcus, I completely understand the price is a bit higher than expected. We do have some flexibility, and I'd love to see if we can make the numbers work. Are you open to looking at leasing options or a slightly longer term to get the payment down to your target?",
    confidence: 96,
    lastContact: '1 hour ago',
    status: 'pending',
  },
  {
    id: '5',
    customerName: 'Lisa Wong',
    vehicleOfInterest: '2021 Toyota Camry',
    reason: 'Predictive Maintenance (Brakes)',
    type: 'sms',
    draft: "Hi Lisa, based on your driving habits, your Camry's brake pads might be getting low. Tap here to book a quick free inspection this week.",
    confidence: 95,
    lastContact: '4 months ago',
    status: 'pending',
  }
];

export default function AIFollowUp() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>(INITIAL_SUGGESTIONS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const pendingCount = suggestions.filter(s => s.status === 'pending').length;

  const handleApprove = (id: string) => {
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'approved' } : s));
    toast.success('Message sent successfully!', {
      icon: <Send className="h-4 w-4" />
    });
  };

  const handleSkip = (id: string) => {
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'skipped' } : s));
    toast.info('Suggestion skipped. AI will learn from this.', {
      icon: <AlertTriangle className="h-4 w-4" />
    });
  };

  const startEdit = (suggestion: Suggestion) => {
    setEditingId(suggestion.id);
    setEditDraft(suggestion.draft);
  };

  const saveEdit = (id: string) => {
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, draft: editDraft, status: 'edited' } : s));
    setEditingId(null);
    toast.success('Draft updated and sent!', {
      icon: <Check className="h-4 w-4" />
    });
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Follow-Up Assistant</h2>
          <p className="text-muted-foreground mt-1">
            Review and approve AI-drafted messages for cold leads and missed opportunities.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full font-medium">
          <Sparkles className="h-5 w-5" />
          <span>{pendingCount} Pending Suggestions</span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {suggestions.filter(s => s.status === 'pending').map(suggestion => (
          <Card key={suggestion.id} className="flex flex-col relative overflow-hidden group border-primary/10">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start mb-2">
                <Badge variant="outline" className={
                  suggestion.confidence >= 90 ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" :
                  "bg-amber-500/10 text-amber-600 border-amber-200"
                }>
                  {suggestion.confidence}% Confidence
                </Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                  {suggestion.type === 'sms' ? <MessageSquare className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                  {suggestion.type.toUpperCase()}
                </div>
              </div>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                {suggestion.customerName}
              </CardTitle>
              <CardDescription className="flex flex-col gap-1 mt-2">
                <span className="flex items-center gap-2 text-foreground font-medium">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  {suggestion.reason}
                </span>
                <span className="flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  {suggestion.vehicleOfInterest}
                </span>
                <span className="flex items-center gap-2 text-xs">
                  <Clock className="h-3 w-3" />
                  Last Contact: {suggestion.lastContact}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="bg-muted/50 rounded-lg p-3 text-sm relative">
                {editingId === suggestion.id ? (
                  <Textarea 
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    className="min-h-[120px] bg-background text-sm resize-none"
                    autoFocus
                  />
                ) : (
                  <div className="whitespace-pre-wrap">{suggestion.draft}</div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2 pt-0">
              {editingId === suggestion.id ? (
                <div className="flex w-full gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setEditingId(null)}>Cancel</Button>
                  <Button className="flex-1" onClick={() => saveEdit(suggestion.id)}>
                    <Send className="w-4 h-4 mr-2" /> Send
                  </Button>
                </div>
              ) : (
                <>
                  <Button 
                    variant="default" 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleApprove(suggestion.id)}
                  >
                    <Check className="w-4 h-4 mr-2" /> Approve & Send
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => startEdit(suggestion)}
                    title="Edit Draft"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleSkip(suggestion.id)}
                    title="Skip"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>
        ))}

        {pendingCount === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center bg-card rounded-xl border border-dashed">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
            <p className="text-muted-foreground max-w-md">
              The AI assistant has no pending follow-ups at the moment. It is continuously monitoring your leads and will suggest messages when needed.
            </p>
          </div>
        )}
      </div>
      
      {suggestions.filter(s => s.status !== 'pending').length > 0 && (
        <div className="mt-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
            <h3 className="text-xl font-semibold">Recent Follow-Up Activity</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => toast.success("Ghost Lead Reviver Enabled", { description: "AI will now automatically send SMS drip campaigns to leads dead for > 90 days." })}>
                <Sparkles className="h-4 w-4 mr-2 text-indigo-500" />
                Ghost Lead Reviver
              </Button>
              <Button variant="outline" size="sm" onClick={() => toast.success("AI Inventory Matchmaker Enabled", { description: "AI will auto-email customers when a car matching their exact past search hits the lot." })}>
                <Car className="h-4 w-4 mr-2 text-emerald-500" />
                Inventory Matchmaker
              </Button>
              <Button variant="outline" size="sm" onClick={() => toast.success("Omnichannel Cart Abandonment Enabled", { description: "Retargeting VDP drop-offs via SMS and email automatically." })}>
                <Sparkles className="h-4 w-4 mr-2 text-rose-500" />
                Cart Abandonment
              </Button>
              <Button variant="outline" size="sm" onClick={() => toast.success("Birthday & Anniversary Campaigns Enabled", { description: "AI will now automatically send personalized videos and Starbucks gift cards on 1-year purchase anniversaries." })}>
                <Sparkles className="h-4 w-4 mr-2 text-amber-500" />
                Anniversary Campaigns
              </Button>
            </div>
          </div>
          <div className="bg-card border rounded-lg overflow-hidden">
            <div className="divide-y">
              {suggestions.filter(s => s.status !== 'pending').map(suggestion => (
                <div key={suggestion.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${
                      suggestion.status === 'approved' || suggestion.status === 'edited' 
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {suggestion.status === 'skipped' ? <X className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium">{suggestion.customerName}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        {suggestion.type === 'sms' ? <MessageSquare className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                        {suggestion.reason}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {suggestion.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Need to import Car for the icon
import { Car } from 'lucide-react';
