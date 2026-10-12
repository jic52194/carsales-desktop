import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileBarChart, Plus, Trash2, Download, Save, BarChart3, TrendingUp, Users, DollarSign, Calendar, Car, Zap, Layout } from "lucide-react";
import { toast } from "sonner";

interface ReportField {
  id: string;
  label: string;
  icon: any;
  category: string;
}

const AVAILABLE_FIELDS: ReportField[] = [
  { id: "sales", label: "Total Sales", icon: DollarSign, category: "Sales" },
  { id: "units", label: "Units Sold", icon: Car, category: "Sales" },
  { id: "gross", label: "Front-End Gross", icon: TrendingUp, category: "Sales" },
  { id: "backend", label: "Back-End Gross", icon: DollarSign, category: "Sales" },
  { id: "leads", label: "Lead Count", icon: Users, category: "CRM" },
  { id: "close_rate", label: "Close Rate", icon: BarChart3, category: "CRM" },
  { id: "response_time", label: "Avg Response Time", icon: Calendar, category: "CRM" },
  { id: "appts", label: "Appointments", icon: Calendar, category: "CRM" },
  { id: "inventory_turn", label: "Inventory Turn Rate", icon: Zap, category: "Inventory" },
  { id: "days_on_lot", label: "Avg Days on Lot", icon: Calendar, category: "Inventory" },
];

export default function ReportBuilder() {
  const [selectedFields, setSelectedFields] = useState<string[]>(["sales", "units", "gross"]);
  const [reportName, setReportName] = useState("My Custom Report");
  const [timeRange, setTimeRange] = useState("30d");

  const addField = (id: string) => {
    if (!selectedFields.includes(id)) setSelectedFields([...selectedFields, id]);
  };

  const removeField = (id: string) => {
    setSelectedFields(selectedFields.filter((f) => f !== id));
  };

  const generateReport = () => {
    toast.success("Report generated!", { description: `${reportName} with ${selectedFields.length} metrics for the last ${timeRange}.` });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <FileBarChart className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Custom Report Builder</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Drag-and-drop report creation — build the exact views you need</p>
        </div>
      </div>

      {/* Config */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Report Name</label>
              <input
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Time Range</label>
              <div className="flex gap-1.5">
                {["7d", "30d", "90d", "ytd"].map((r) => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold uppercase transition-all ${
                      timeRange === r ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Available Fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Layout className="h-4 w-4 text-primary" /> Available Metrics</CardTitle>
            <CardDescription>Click to add to your report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {AVAILABLE_FIELDS.map((field) => (
              <button
                key={field.id}
                onClick={() => addField(field.id)}
                disabled={selectedFields.includes(field.id)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left ${
                  selectedFields.includes(field.id)
                    ? "opacity-40 border-border/50 bg-muted/30"
                    : "border-border/50 hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
                }`}
              >
                <div className="p-1.5 rounded-lg bg-muted/50">
                  <field.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{field.label}</p>
                  <p className="text-[10px] text-muted-foreground">{field.category}</p>
                </div>
                {!selectedFields.includes(field.id) && <Plus className="h-4 w-4 text-muted-foreground" />}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Selected Fields / Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-emerald-500" /> Report Preview</CardTitle>
            <CardDescription>{selectedFields.length} metrics selected</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedFields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Layout className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Add metrics to build your report
              </div>
            ) : (
              selectedFields.map((id) => {
                const field = AVAILABLE_FIELDS.find((f) => f.id === id)!;
                return (
                  <div key={id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <field.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-semibold flex-1">{field.label}</span>
                    <button onClick={() => removeField(id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
            {selectedFields.length > 0 && (
              <div className="pt-2 space-y-2">
                <div className="rounded-xl bg-gradient-to-br from-primary/5 to-transparent p-3 border border-primary/10">
                  <p className="text-xs text-muted-foreground mb-2">Sample Output</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedFields.slice(0, 4).map((id) => {
                      const field = AVAILABLE_FIELDS.find((f) => f.id === id)!;
                      return (
                        <div key={id} className="bg-background rounded-lg p-2 text-center">
                          <p className="text-[10px] text-muted-foreground">{field.label}</p>
                          <p className="text-lg font-black text-primary">${(Math.random() * 50000 + 10000).toFixed(0)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button onClick={generateReport} className="flex-1 h-11">
          <BarChart3 className="h-4 w-4 mr-2" /> Generate Report
        </Button>
        <Button variant="outline" className="h-11" onClick={() => toast.success("Report saved!")}>
          <Save className="h-4 w-4 mr-2" /> Save
        </Button>
        <Button variant="outline" className="h-11" onClick={() => toast.success("Exporting to PDF...")}>
          <Download className="h-4 w-4 mr-2" /> Export
        </Button>
      </div>
    </div>
  );
}
