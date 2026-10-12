import React, { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Building2, Search, Plus, FileText, Truck, Wrench, DollarSign, CheckCircle2, Clock, AlertCircle, ScanLine, Upload, Sparkles, BrainCircuit } from "lucide-react";
import { formatCurrency } from "@/lib/calculations";
import { toast } from "sonner";

const MOCK_VENDORS = [
  { id: "v1", name: "Elite Auto Transport", type: "Transport", status: "Active", balance: 4500, lastPayment: "2024-05-10" },
  { id: "v2", name: "Precision Dent Repair", type: "Recon", status: "Active", balance: 1250, lastPayment: "2024-05-15" },
  { id: "v3", name: "Sparkle Detailers", type: "Detailing", status: "Active", balance: 800, lastPayment: "2024-05-20" },
  { id: "v4", name: "City Glass & Windshield", type: "Recon", status: "Inactive", balance: 0, lastPayment: "2024-04-01" },
];

const MOCK_INVOICES = [
  { id: "INV-1042", vendor: "Elite Auto Transport", amount: 1500, date: "2024-05-22", dueDate: "2024-06-22", status: "Pending" },
  { id: "INV-1043", vendor: "Precision Dent Repair", amount: 450, date: "2024-05-23", dueDate: "2024-06-07", status: "Approved" },
  { id: "INV-1044", vendor: "Sparkle Detailers", amount: 800, date: "2024-05-20", dueDate: "2024-06-05", status: "Paid" },
  { id: "INV-1045", vendor: "Elite Auto Transport", amount: 3000, date: "2024-05-18", dueDate: "2024-06-18", status: "Overdue" },
];

export default function AccountsPayable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [invoices, setInvoices] = useState(MOCK_INVOICES);
  
  // OCR State
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedData, setScannedData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      simulateOCR();
    }
  };

  const simulateOCR = () => {
    setIsScanning(true);
    setScanProgress(0);
    setScannedData(null);
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        clearInterval(interval);
        setScanProgress(100);
        setTimeout(() => {
          setIsScanning(false);
          setScannedData({
            vendor: "Sparkle Detailers",
            amount: 425.50,
            date: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            invoiceNumber: `INV-${Math.floor(Math.random() * 10000)}`
          });
          toast.success("Invoice scanned successfully using AI OCR");
        }, 500);
      } else {
        setScanProgress(progress);
      }
    }, 200);
  };

  const handleSaveScannedInvoice = () => {
    if (scannedData) {
      setInvoices(prev => [{
        id: scannedData.invoiceNumber,
        vendor: scannedData.vendor,
        amount: scannedData.amount,
        date: scannedData.date,
        dueDate: scannedData.dueDate,
        status: "Pending"
      }, ...prev]);
      setIsScanOpen(false);
      setScannedData(null);
      toast.success("Invoice added to pending approvals");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Paid</Badge>;
      case "Approved":
        return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "Pending":
        return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case "Overdue":
        return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20"><AlertCircle className="w-3 h-3 mr-1" /> Overdue</Badge>;
      case "Active":
        return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20">Active</Badge>;
      case "Inactive":
        return <Badge variant="secondary" className="text-slate-500">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getVendorIcon = (type: string) => {
    switch (type) {
      case "Transport": return <Truck className="w-4 h-4 text-blue-500" />;
      case "Recon": return <Wrench className="w-4 h-4 text-amber-500" />;
      case "Detailing": return <Sparkles className="w-4 h-4 text-cyan-500" />;
      default: return <Building2 className="w-4 h-4 text-slate-500" />;
    }
  };
  
  // Sparkles is imported from lucide-react

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-8 h-8 text-primary" />
            Vendor & Accounts Payable
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage recon vendors, transport companies, and invoices</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><FileText className="w-4 h-4 mr-2" /> Export Report</Button>
          <Button 
            variant="secondary" 
            className="bg-primary/10 text-primary hover:bg-primary/20"
            onClick={() => setIsScanOpen(true)}
          >
            <ScanLine className="w-4 h-4 mr-2" /> 
            AI Scan Invoice
          </Button>
          <Button><Plus className="w-4 h-4 mr-2" /> Add Vendor</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Outstanding</p>
                <h3 className="text-2xl font-bold mt-1">$6,550.00</h3>
              </div>
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Overdue Invoices</p>
                <h3 className="text-2xl font-bold mt-1 text-destructive">1</h3>
              </div>
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Active Vendors</p>
                <h3 className="text-2xl font-bold mt-1">3</h3>
              </div>
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Building2 className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Pending Approvals</p>
                <h3 className="text-2xl font-bold mt-1">1</h3>
              </div>
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices" className="w-full">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle>Recent Invoices</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input 
                    placeholder="Search invoices..." 
                    className="pl-8" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.filter(i => i.vendor.toLowerCase().includes(searchTerm.toLowerCase()) || i.id.toLowerCase().includes(searchTerm.toLowerCase())).map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.id}</TableCell>
                      <TableCell>{invoice.vendor}</TableCell>
                      <TableCell>{invoice.date}</TableCell>
                      <TableCell>{invoice.dueDate}</TableCell>
                      <TableCell className="font-bold">{formatCurrency(invoice.amount)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right">
                        {invoice.status === 'Pending' ? (
                          <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50">Approve</Button>
                        ) : invoice.status === 'Approved' || invoice.status === 'Overdue' ? (
                          <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white">Pay Now</Button>
                        ) : (
                          <Button size="sm" variant="ghost">View</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle>Vendor Directory</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input 
                    placeholder="Search vendors..." 
                    className="pl-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Outstanding Balance</TableHead>
                    <TableHead>Last Payment</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_VENDORS.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          {getVendorIcon(vendor.type)}
                        </div>
                        {vendor.name}
                      </TableCell>
                      <TableCell>{vendor.type}</TableCell>
                      <TableCell>{getStatusBadge(vendor.status)}</TableCell>
                      <TableCell className="font-bold">{formatCurrency(vendor.balance)}</TableCell>
                      <TableCell>{vendor.lastPayment}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost">Manage</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AI OCR Scanner Dialog */}
      <Dialog open={isScanOpen} onOpenChange={(open) => {
        setIsScanOpen(open);
        if (!open) {
          setIsScanning(false);
          setScannedData(null);
          setScanProgress(0);
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-primary" />
              AI Invoice Scanner
            </DialogTitle>
            <DialogDescription>
              Upload a photo or PDF of an invoice. Our AI will automatically extract the vendor, amount, and dates.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {!isScanning && !scannedData ? (
              <div 
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-10 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                />
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Click to Upload</h3>
                <p className="text-sm text-slate-500">Supports JPG, PNG, and PDF</p>
              </div>
            ) : isScanning ? (
              <div className="space-y-6 py-8 text-center">
                <div className="relative w-24 h-24 mx-auto">
                  <div className="absolute inset-0 border-4 border-primary/20 rounded-xl animate-pulse"></div>
                  <div 
                    className="absolute inset-0 border-t-4 border-primary rounded-xl animate-spin"
                    style={{ animationDuration: '3s' }}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ScanLine className="w-10 h-10 text-primary animate-pulse" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">AI is analyzing document...</h3>
                  <p className="text-sm text-slate-500">Extracting line items, vendor details, and amounts.</p>
                </div>
                <Progress value={scanProgress} className="h-2 w-full max-w-xs mx-auto" />
              </div>
            ) : scannedData ? (
              <div className="space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-start gap-3 mb-6">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Data Extracted Successfully</h4>
                    <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">Please verify the extracted information below.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Vendor Name</Label>
                    <Input value={scannedData.vendor} onChange={(e) => setScannedData({...scannedData, vendor: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <Label>Invoice Number</Label>
                    <Input value={scannedData.invoiceNumber} onChange={(e) => setScannedData({...scannedData, invoiceNumber: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <Label>Amount</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2.5 text-slate-500">$</span>
                      <Input type="number" className="pl-7" value={scannedData.amount} onChange={(e) => setScannedData({...scannedData, amount: parseFloat(e.target.value)})} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Invoice Date</Label>
                    <Input type="date" value={scannedData.date} onChange={(e) => setScannedData({...scannedData, date: e.target.value})} />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScanOpen(false)}>Cancel</Button>
            {scannedData && (
              <Button onClick={handleSaveScannedInvoice}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Save Invoice
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
