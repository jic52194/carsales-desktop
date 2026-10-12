import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Globe, Layout, Image, MousePointer2, Eye, TrendingUp, Users, Star,
  Edit, Plus, CheckCircle2, ExternalLink, ChevronRight, Settings,
  Megaphone, BarChart3, Clock, Car, Phone, Mail, MapPin, Search,
  PlusCircle
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const pages = [
  { name: "Home Page", status: "Published", visits: 3420, lastEdit: "2 days ago", seo: 94 },
  { name: "New Inventory", status: "Published", visits: 5810, lastEdit: "Today", seo: 91 },
  { name: "Used Inventory", status: "Published", visits: 4290, lastEdit: "Today", seo: 89 },
  { name: "Finance / Apply", status: "Published", visits: 1870, lastEdit: "1 week ago", seo: 82 },
  { name: "Service & Parts", status: "Published", visits: 1240, lastEdit: "3 days ago", seo: 78 },
  { name: "About Us", status: "Published", visits: 680, lastEdit: "2 weeks ago", seo: 85 },
  { name: "Contact Us", status: "Published", visits: 910, lastEdit: "5 days ago", seo: 88 },
  { name: "Trade-In Value", status: "Draft", visits: 0, lastEdit: "Yesterday", seo: 70 },
];

const staff = [
  { name: "James Thornton", title: "General Manager", phone: "(813) 555-0101", email: "j.thornton@dealer.com", initials: "JT", color: "bg-blue-600", bio: "15+ years in automotive leadership. Committed to an exceptional buying experience.", featured: true },
  { name: "Maria Santos", title: "Sales Manager", phone: "(813) 555-0102", email: "m.santos@dealer.com", initials: "MS", color: "bg-emerald-600", bio: "Award-winning manager with a passion for helping customers find the right vehicle.", featured: true },
  { name: "Derek Williams", title: "F&I Manager", phone: "(813) 555-0103", email: "d.williams@dealer.com", initials: "DW", color: "bg-amber-600", bio: "Specializes in competitive financing options and protecting your investment.", featured: true },
  { name: "Keisha Brown", title: "Sales Consultant", phone: "(813) 555-0104", email: "k.brown@dealer.com", initials: "KB", color: "bg-purple-600", bio: "Knowledgeable and patient — here to find the perfect fit for your lifestyle.", featured: true },
  { name: "Tom Nguyen", title: "Service Director", phone: "(813) 555-0105", email: "t.nguyen@dealer.com", initials: "TN", color: "bg-rose-600", bio: "ASE-certified with 12 years of service excellence keeping your vehicle road-ready.", featured: false },
  { name: "Ashley Reed", title: "BDC Manager", phone: "(813) 555-0106", email: "a.reed@dealer.com", initials: "AR", color: "bg-cyan-600", bio: "Fast response, no games. Here to schedule your visit and answer every question.", featured: false },
];

const reviews = [
  { name: "Robert C.", rating: 5, text: "Best car buying experience I've ever had. James and the team made everything easy and stress-free.", date: "2 days ago", source: "Google" },
  { name: "Jennifer M.", rating: 5, text: "Maria found us the perfect SUV within our budget. No pressure at all. Highly recommend!", date: "4 days ago", source: "Google" },
  { name: "David K.", rating: 5, text: "Derek walked me through all my financing options. Got a rate I didn't think was possible.", date: "1 week ago", source: "DealerRater" },
  { name: "Sandra L.", rating: 4, text: "Great service department. Tom had my car back to me ahead of schedule.", date: "1 week ago", source: "Google" },
];

const ads = [
  { platform: "Google Ads", status: "Active", spend: "$1,420", leads: 38, cpl: "$37.40", impressions: "42,800" },
  { platform: "Facebook Ads", status: "Active", spend: "$880", leads: 22, cpl: "$40.00", impressions: "28,500" },
  { platform: "Cars.com", status: "Active", spend: "$650", leads: 15, cpl: "$43.30", impressions: "18,200" },
  { platform: "CarGurus", status: "Active", spend: "$550", leads: 19, cpl: "$28.90", impressions: "22,100" },
  { platform: "AutoTrader", status: "Paused", spend: "$0", leads: 0, cpl: "–", impressions: "0" },
];

export default function Website() {
  const [selectedPage, setSelectedPage] = useState(0);
  const [activeStaff, setActiveStaff] = useState<number | null>(null);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Globe className="h-7 w-7 text-primary" /> Website CMS
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your dealership website, team profiles, listings, and digital ads.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ExternalLink className="h-4 w-4" /> View Live Site
          </Button>
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Page
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Monthly Visitors", val: "18,240", icon: Users, delta: "+12%", color: "text-primary" },
          { label: "Avg. Session Time", val: "2m 48s", icon: Clock, delta: "+0:18", color: "text-emerald-600" },
          { label: "Inventory Views", val: "11,890", icon: Car, delta: "+8%", color: "text-amber-600" },
          { label: "Lead Forms Sent", val: "312", icon: TrendingUp, delta: "+24%", color: "text-purple-600" },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-1.5 rounded-lg bg-muted`}><Icon className={`h-4 w-4 ${kpi.color}`} /></div>
                  <Badge variant="secondary" className="text-emerald-700 bg-emerald-50 text-[10px]">{kpi.delta}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-xl font-bold">{kpi.val}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="pages">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="pages" className="flex-1 md:flex-none"><Layout className="h-3.5 w-3.5 mr-1.5" />Pages</TabsTrigger>
          <TabsTrigger value="team" className="flex-1 md:flex-none"><Users className="h-3.5 w-3.5 mr-1.5" />Meet the Team</TabsTrigger>
          <TabsTrigger value="reviews" className="flex-1 md:flex-none"><Star className="h-3.5 w-3.5 mr-1.5" />Reviews</TabsTrigger>
          <TabsTrigger value="ads" className="flex-1 md:flex-none"><Megaphone className="h-3.5 w-3.5 mr-1.5" />Ad Manager</TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="space-y-2">
              {pages.map((page, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedPage(i)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all ${selectedPage === i ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{page.name}</span>
                    <Badge variant={page.status === "Published" ? "default" : "outline"} className={`text-[10px] ${page.status === "Published" ? "bg-emerald-600" : ""}`}>
                      {page.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                    <span><Eye className="h-3 w-3 inline mr-0.5" />{page.visits.toLocaleString()} visits</span>
                    <span>SEO: {page.seo}/100</span>
                    <span>{page.lastEdit}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="lg:col-span-2">
              <Card className="overflow-hidden">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{pages[selectedPage].name}</CardTitle>
                    <CardDescription>Live preview — click Edit to make changes</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1.5"><Edit className="h-3.5 w-3.5" /> Edit Page</Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="bg-muted border-t border-b border-border px-3 py-2 flex items-center gap-2">
                    <div className="flex gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-destructive/60" /><div className="h-2.5 w-2.5 rounded-full bg-amber-400/60" /><div className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" /></div>
                    <div className="flex-1 bg-background rounded px-2 py-0.5 text-[11px] text-muted-foreground border border-border truncate">
                      www.carsalessoftware.com/{pages[selectedPage].name.toLowerCase().replace(/ /g, '-')}
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </div>

                  <div className="bg-slate-900 px-6 py-10 text-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'repeating-linear-gradient(45deg, hsl(var(--primary)) 0, hsl(var(--primary)) 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px'}} />
                    <p className="text-xs text-primary font-bold uppercase tracking-widest mb-2 relative">CarSales AI OS Dealership</p>
                    <h2 className="text-white text-xl font-bold mb-1 relative">Drive Your Dream Vehicle Today</h2>
                    <p className="text-slate-400 text-xs mb-4 relative">300+ New & Pre-Owned Vehicles In Stock. Financing for All Credit Types.</p>
                    <div className="flex justify-center gap-2 relative">
                      <div className="bg-primary text-white text-xs px-4 py-2 rounded-full font-semibold">Shop Inventory</div>
                      <div className="border border-white/30 text-white text-xs px-4 py-2 rounded-full">Get Pre-Approved</div>
                    </div>
                  </div>

                  <div className="bg-background px-4 py-3 border-t border-border">
                    <div className="bg-muted rounded-lg flex items-center gap-2 px-3 py-2">
                      <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground">Search by make, model, or keyword...</span>
                    </div>
                  </div>

                  <div className="p-4 grid grid-cols-3 gap-3">
                    {[
                      { year: "2024", make: "Toyota", model: "Camry", price: "$29,988", img: "🚗" },
                      { year: "2023", make: "Ford", model: "F-150", price: "$44,500", img: "🛻" },
                      { year: "2024", make: "Honda", model: "CR-V", price: "$33,200", img: "🚙" },
                    ].map((v, i) => (
                      <div key={i} className="border border-border rounded-lg overflow-hidden bg-card">
                        <div className="bg-muted h-14 flex items-center justify-center text-2xl">{v.img}</div>
                        <div className="p-2">
                          <p className="text-[10px] font-bold text-foreground truncate">{v.year} {v.make} {v.model}</p>
                          <p className="text-[10px] text-primary font-bold">{v.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border p-3 flex items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs font-medium">SEO Score</span>
                    </div>
                    <div className="flex items-center gap-2 w-32">
                      <Progress value={pages[selectedPage].seo} className="h-2 flex-1" />
                      <span className="text-xs font-bold">{pages[selectedPage].seo}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Manage your team profiles displayed on the website's "Meet Our Team" page.</p>
            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Add Team Member</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.map((member, i) => (
              <Card key={i} className={`overflow-hidden transition-all hover:shadow-md ${activeStaff === i ? 'border-primary' : ''}`}>
                <CardContent className="p-0">
                  <div className={`${member.color} h-28 flex flex-col items-center justify-end pb-3 relative`}>
                    {member.featured && (
                      <Badge className="absolute top-2 right-2 bg-amber-500 text-white text-[10px]">Featured</Badge>
                    )}
                    <Avatar className="h-16 w-16 border-4 border-background shadow-lg">
                      <AvatarFallback className={`${member.color} text-white text-xl font-bold`}>{member.initials}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="text-center">
                      <p className="font-bold text-foreground">{member.name}</p>
                      <p className="text-xs text-primary font-semibold">{member.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground text-center leading-relaxed">{member.bio}</p>
                    <div className="space-y-1 pt-1 border-t border-border">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Phone className="h-3 w-3 shrink-0" />{member.phone}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                        <Mail className="h-3 w-3 shrink-0" />{member.email}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm" className="flex-1 text-xs h-7">Edit Profile</Button>
                      <Button variant="ghost" size="sm" className="flex-1 text-xs h-7 text-muted-foreground">
                        {member.featured ? "Unfeature" : "Feature"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card className="border-2 border-dashed border-border hover:border-primary/40 transition-colors cursor-pointer">
              <CardContent className="p-6 flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Plus className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium">Add Team Member</p>
                <p className="text-xs text-center">Add their photo, bio, and contact info to your website.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5 text-center">
                <p className="text-4xl font-bold text-amber-500">4.8</p>
                <div className="flex justify-center gap-0.5 my-1">
                  {[1,2,3,4,5].map(s => <Star key={s} className={`h-4 w-4 ${s <= 4 ? 'fill-amber-400 text-amber-400' : 'fill-amber-200 text-amber-200'}`} />)}
                </div>
                <p className="text-xs text-muted-foreground">Based on 284 reviews</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <p className="text-4xl font-bold text-primary">284</p>
                <p className="text-sm font-medium mt-1">Total Reviews</p>
                <p className="text-xs text-muted-foreground">Google • DealerRater • Cars.com</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <p className="text-4xl font-bold text-emerald-600">94%</p>
                <p className="text-sm font-medium mt-1">Would Recommend</p>
                <p className="text-xs text-muted-foreground">Across all platforms</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((r, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">{r.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold">{r.name}</p>
                        <p className="text-[10px] text-muted-foreground">{r.source} · {r.date}</p>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-muted'}`} />)}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">"{r.text}"</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-sm">Respond to Reviews</p>
                <p className="text-xs text-muted-foreground">3 reviews awaiting your response. Quick replies improve your ranking.</p>
              </div>
              <Button size="sm">View Pending</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ads" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Monitor all digital ad campaigns and spending from one dashboard.</p>
            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Add Platform</Button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Total Ad Spend", val: "$3,500", icon: BarChart3, color: "text-primary" },
              { label: "Total Leads", val: "94", icon: Users, color: "text-emerald-600" },
              { label: "Blended CPL", val: "$37.20", icon: TrendingUp, color: "text-amber-600" },
              { label: "Avg. Impressions", val: "111K", icon: Eye, color: "text-purple-600" },
            ].map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Icon className={`h-4 w-4 ${kpi.color} mb-2`} />
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-xl font-bold">{kpi.val}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ad Platform Performance</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Platform</th>
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Status</th>
                      <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Spend</th>
                      <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Leads</th>
                      <th className="text-right p-3 text-xs font-semibold text-muted-foreground">CPL</th>
                      <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Impressions</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ads.map((ad, i) => (
                      <tr key={i} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-semibold">{ad.platform}</td>
                        <td className="p-3">
                          <Badge className={`text-[10px] ${ad.status === 'Active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-muted text-muted-foreground'}`}>
                            {ad.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-medium">{ad.spend}</td>
                        <td className="p-3 text-right font-bold text-primary">{ad.leads}</td>
                        <td className="p-3 text-right">{ad.cpl}</td>
                        <td className="p-3 text-right text-muted-foreground">{ad.impressions}</td>
                        <td className="p-3">
                          <Button variant="ghost" size="sm" className="h-7 text-xs">View</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
