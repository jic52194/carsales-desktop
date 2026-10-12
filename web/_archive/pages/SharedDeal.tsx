import React from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { calculateDeal, formatCurrency, DealParameters } from "@/lib/calculations";
import { FileText, Printer, Download, Car } from "lucide-react";
import { Button } from "../components/ui/button";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export default function SharedDeal() {
  const { id } = useParams();
  const [dealData, setDealData] = useState<{ params: DealParameters, vehicleName: string, customer: string } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`shared_deal_${id}`);
    if (saved) {
      setDealData(JSON.parse(saved));
    }
  }, [id]);
  
  const params = dealData?.params || {
    sellingPrice: 35000,
    vehicleCost: 32000,
    pack: 2000,
    nadaRetail: 36000,
    tradeAllowance: 2500,
    tradePayoff: 0,
    tradeActualCashValue: 2000,
    nadaTrade: 2200,
    cashDown: 2000,
    docFee: 695,
    taxRate: 6.25,
    nonTaxableFees: 135,
    warrantyRetail: 0,
    warrantyCost: 0,
    gapRetail: 0,
    gapCost: 0,
    maintenanceRetail: 0,
    maintenanceCost: 0,
    termMonths: 72,
    apr: 5.99,
    bankFee: 0,
    dealerReserve: 0,
  };

  const results = calculateDeal(params);
  const selectedVehicleName = dealData?.vehicleName || "2024 Toyota Camry SE";

  const handleDownloadPDF = async () => {
    const element = document.getElementById('presentation-view-capture');
    if (!element) return;
    
    try {
      toast.info("Generating PDF...");
      
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Deal-${id || 'Proposal'}.pdf`);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate PDF");
    }
  };

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 p-4 md:p-8 font-sans print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto space-y-6 print:space-y-0 print:max-w-none print:w-full">
        
        {/* Header */}
        <header className="flex justify-between items-center gap-4 print:hidden mb-6 bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Shared Deal Proposal</h1>
            <p className="text-sm text-slate-500">Ref: {id}</p>
          </div>
          <div className="flex gap-2 items-center">
            <Button size="sm" onClick={() => window.print()} className="bg-primary hover:bg-primary/90 text-white">
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button size="sm" onClick={handleDownloadPDF} variant="outline" className="bg-white dark:bg-slate-950">
              <Download className="mr-2 h-4 w-4" /> Save PDF
            </Button>
          </div>
        </header>

        <div id="presentation-view-capture">
          <Card className="border-2 border-slate-900 dark:border-slate-700 shadow-xl print:shadow-none print:border-none print:w-full overflow-hidden">
            <div className="bg-slate-900 dark:bg-slate-800 text-white p-6 print:bg-white print:text-black print:p-0 print:pb-4 print:border-b print:border-black">
              <div className="flex justify-between items-start">
                <h2 className="text-2xl font-bold flex items-center gap-2 mt-2">
                  <FileText className="h-6 w-6 print:hidden" />
                  Purchase Proposal
                </h2>
                <div className="text-right text-slate-100 dark:text-white print:text-black">
                  <div className="h-12 mb-2 flex justify-end">
                    <div className="h-10 w-10 rounded bg-primary flex items-center justify-center ml-auto">
                      <Car className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="text-xs space-y-0.5 mt-2">
                    <p className="font-bold text-sm">Auto Sales OS Demo</p>
                    <p>123 Main Street, Anytown, USA 12345</p>
                    <p>(555) 123-4567 | demo.carsalessoftware.com</p>
                  </div>
                  <p className="text-sm mt-3 font-medium">Date: {new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-300">
                
                {/* Vehicle Info */}
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 print:bg-transparent">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Vehicle of Interest</h3>
                  <p className="text-xl text-primary font-semibold">{selectedVehicleName}</p>
                </div>

                {/* Vehicle Price Section */}
                <div className="p-6 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Selling Price</span>
                    <span className="text-lg font-semibold">{formatCurrency(params.sellingPrice)}</span>
                  </div>
                  
                  {params.tradeAllowance > 0 && (
                    <div className="flex justify-between items-center text-red-600 dark:text-red-400">
                      <span>Trade Allowance</span>
                      <span>-{formatCurrency(params.tradeAllowance)}</span>
                    </div>
                  )}
                  
                  {params.tradePayoff > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Trade Payoff</span>
                      <span>{formatCurrency(params.tradePayoff)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Taxes & Fees</span>
                    <span>{formatCurrency(results.totalTaxes + params.docFee + params.nonTaxableFees)}</span>
                  </div>

                  {(params.warrantyRetail > 0 || params.gapRetail > 0 || params.maintenanceRetail > 0) && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Selected Options</span>
                      <span>{formatCurrency(params.warrantyRetail + params.gapRetail + params.maintenanceRetail)}</span>
                    </div>
                  )}
                </div>

                {/* Summary Section */}
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 print:bg-transparent space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Total Amount Financed</span>
                    <span className="text-xl font-bold">{formatCurrency(results.amountFinanced)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Cash Down</span>
                    <span className="text-lg font-semibold text-primary">{formatCurrency(params.cashDown)}</span>
                  </div>
                </div>

                {/* Payment Section */}
                <div className="p-8 bg-primary/5 dark:bg-primary/10 print:bg-slate-100 print:border-t-4 print:border-black text-center space-y-2">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Estimated Monthly Payment</p>
                  <div className="text-5xl font-extrabold text-slate-900 dark:text-white print:text-black">
                    {formatCurrency(results.monthlyPayment)}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Based on {params.termMonths} months @ {params.apr}% APR
                  </p>
                </div>

              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
