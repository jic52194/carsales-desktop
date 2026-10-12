import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Megaphone as Icon, Plus, Users, MousePointer2, TrendingUp, Mail, MessageSquare, Calendar, MoreVertical, DollarSign, BrainCircuit, Target, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { hapticFeedback } from "@/lib/haptics";

const campaigns = [
  { 
    id: 1, 
    name: "Summer Sales Event", 
    type: "Email/SMS", 
    status: "Active", 
    audience: "Previous Customers", 
    reach: 4500, 
    engagement: 12.5, 
    conversions: 42,
    progress: 75,
    predictedRoi: "315%"
  },
  { 
    id: 2, 
    name: "Equity Mining - Lease End", 
    type: "Direct Mail", 
    status: "Active", 
    audience: "Lease Holders (6mo out)", 
    reach: 850, 
    engagement: 34.2, 
    conversions: 15,
    progress: 45,
    predictedRoi: "480%"
  },
  { 
    id: 3, 
    name: "Service Recall Outreach", 
    type: "Automated Call", 
    status: "Paused", 
    audience: "Open Recall Units", 
    reach: 1200, 
    engagement: 8.1, 
    conversions: 89,
    progress: 100,
    predictedRoi: "210%"
  },
  { 
    id: 4, 
    name: "Trade-In Appraisal Special", 
    type: "Social Media", 
    status: "Scheduled", 
    audience: "Local Radius (25mi)", 
    reach: 0, 
    engagement: 0, 
    conversions: 0,
    progress: 0,
    predictedRoi: "185%"
  },
  { 
    id: 5, 
    name: "Aging Leads Revival", 
    type: "Ringless Voicemail", 
    status: "Active", 
    audience: "Lost/Cold (>90 days)", 
    reach: 3200, 
    engagement: 4.5, 
    conversions: 12,
    progress: 60,
    predictedRoi: "420%"
  },
  { 
    id: 6, 
    name: "Predictive Service Reminders", 
    type: "AI Auto-Text", 
    status: "Active", 
    audience: "Due for Oil Change", 
    reach: 145, 
    engagement: 42.1, 
    conversions: 38,
    progress: 100,
    predictedRoi: "N/A"
  },
  { 
    id: 7, 
    name: "Declined Service Recovery", 
    type: "AI Auto-Text", 
    status: "Active", 
    audience: "Declined MPI (>30 days)", 
    reach: 312, 
    engagement: 28.4, 
    conversions: 45,
    progress: 100,
    predictedRoi: "N/A"
  },
];

export default function Campaigns() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Icon className="h-7 w-7 text-primary" />
            Marketing Campaigns
          </h1>
          <p className="text-slate-500">Manage outbound marketing, equity mining, and automated service outreach.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" onClick={() => {
            toast.success("AI generating ad copy and creatives...");
            hapticFeedback();
          }}>
            <Sparkles className="mr-2 h-4 w-4" /> AI Ad Generator
          </Button>
          <Button variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 hover:bg-purple-500/20" onClick={() => {
            toast.success("AI Audience Segmentation engine launched.");
            hapticFeedback();
          }}>
            <Target className="mr-2 h-4 w-4" /> AI Audience Builder
          </Button>
          <Button variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20" onClick={() => {
            toast.success("Anniversary Auto-Mailer Enabled", { description: "Auto-triggers postcards & emails exactly 1/2/3 years after purchase." });
            hapticFeedback();
          }}>
            <Calendar className="mr-2 h-4 w-4" /> Auto-Mailer
          </Button>
          <Button className="bg-primary text-white">
            <Plus className="mr-2 h-4 w-4" /> Create Campaign
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Users className="h-5 w-5" />
              </div>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">+18%</Badge>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">Total Reach</p>
              <h3 className="text-2xl font-bold">12,450</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                <MousePointer2 className="h-5 w-5" />
              </div>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">+5.2%</Badge>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">Engagement Rate</p>
              <h3 className="text-2xl font-bold">14.8%</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                <TrendingUp className="h-5 w-5" />
              </div>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">+8 units</Badge>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">Conversions</p>
              <h3 className="text-2xl font-bold">146</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                <TrendingUp className="h-5 w-5" />
              </div>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">$450</Badge>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">Cost Per Lead</p>
              <h3 className="text-2xl font-bold">$12.40</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {campaigns.map((campaign) => (
          <Card key={campaign.id} className="border-slate-200 dark:border-slate-800 overflow-hidden group hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl">{campaign.name}</CardTitle>
                  <Badge variant={campaign.status === "Active" ? "default" : "outline"} className={campaign.status === "Active" ? "bg-emerald-500" : ""}>
                    {campaign.status}
                  </Badge>
                  {campaign.predictedRoi && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 hidden sm:flex">
                      <BrainCircuit className="h-3 w-3 mr-1" /> ROI: {campaign.predictedRoi}
                    </Badge>
                  )}
                </div>
                <CardDescription className="flex items-center gap-2">
                  {campaign.type === "Email/SMS" && <Mail className="h-3 w-3" />}
                  {campaign.type === "Direct Mail" && <Calendar className="h-3 w-3" />}
                  {campaign.type === "Social Media" && <MessageSquare className="h-3 w-3" />}
                  {campaign.type} • {campaign.audience}
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase font-bold">Reach</p>
                  <p className="text-lg font-bold">{campaign.reach.toLocaleString()}</p>
                </div>
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase font-bold">Eng.</p>
                  <p className="text-lg font-bold text-primary">{campaign.engagement}%</p>
                </div>
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase font-bold">Conv.</p>
                  <p className="text-lg font-bold text-emerald-600">{campaign.conversions}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span>Campaign Progress</span>
                  <span>{campaign.progress}%</span>
                </div>
                <Progress value={campaign.progress} className="h-2" />
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 p-3 flex justify-end gap-2">
              <Button variant="ghost" size="sm">View Analytics</Button>
              <Button variant="outline" size="sm" className="bg-white dark:bg-slate-950">Manage</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
