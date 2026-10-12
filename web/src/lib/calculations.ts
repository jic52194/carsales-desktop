export interface DealParameters {
  // Vehicle Details
  sellingPrice: number;
  vehicleCost: number;
  pack: number; // Dealership overhead per car
  nadaRetail: number;
  
  // Trade-in
  tradeAllowance: number;
  tradePayoff: number;
  tradeActualCashValue: number; // ACV - what it's actually worth
  nadaTrade: number;
  
  // Customer Cash & Rebates
  cashDown: number;
  
  // Fees & Taxes
  docFee: number;
  taxRate: number; // Percentage, e.g., 6.25
  nonTaxableFees: number;
  
  // Back-end Products (Add-ons)
  warrantyRetail: number;
  warrantyCost: number;
  gapRetail: number;
  gapCost: number;
  maintenanceRetail: number;
  maintenanceCost: number;
  
  // Financing
  termMonths: number;
  apr: number; // Percentage, e.g., 5.99
  bankFee: number;
  dealerReserve: number; // Profit made on the rate markup
}

export interface DealCalculations {
  amountFinanced: number;
  monthlyPayment: number;
  frontEndGross: number;
  backEndGross: number;
  totalGross: number;
  totalTaxes: number;
  ltv: number;
}

export function calculateDeal(params: DealParameters): DealCalculations {
  // 1. Calculate Front-End Gross
  // Pack is added to the vehicle cost at time of purchase.
  // Total Cost = Vehicle Cost + Pack
  const tradeEquity = params.tradeActualCashValue - params.tradeAllowance;
  const totalVehicleCost = params.vehicleCost + params.pack;
  const frontEndGross = params.sellingPrice - totalVehicleCost + tradeEquity;

  // 2. Calculate Back-End Gross
  const warrantyProfit = params.warrantyRetail - params.warrantyCost;
  const gapProfit = params.gapRetail - params.gapCost;
  const maintenanceProfit = params.maintenanceRetail - params.maintenanceCost;
  const backEndGross = warrantyProfit + gapProfit + maintenanceProfit + params.dealerReserve - params.bankFee;

  // 3. Total Gross
  const totalGross = frontEndGross + backEndGross;

  // 4. Calculate Taxes (Simplified: Taxable amount = Selling Price + Doc Fee + Products - Trade Allowance - Rebates)
  // Note: Tax laws vary wildly by state. This is a generalized calculation.
  const taxableAmount = Math.max(0, 
    params.sellingPrice + 
    params.docFee + 
    params.warrantyRetail + 
    params.gapRetail + 
    params.maintenanceRetail - 
    params.tradeAllowance
  );
  const totalTaxes = taxableAmount * (params.taxRate / 100);

  // 5. Amount Financed
  // Selling Price + Products + Fees + Taxes + Trade Payoff - Trade Allowance - Cash Down - Rebates
  const amountFinanced = 
    params.sellingPrice +
    params.warrantyRetail +
    params.gapRetail +
    params.maintenanceRetail +
    params.docFee +
    params.nonTaxableFees +
    totalTaxes +
    params.tradePayoff -
    params.tradeAllowance -
    params.cashDown;

  // 6. Monthly Payment (Standard Amortization)
  let monthlyPayment = 0;
  if (amountFinanced > 0 && params.termMonths > 0) {
    if (params.apr > 0) {
      const monthlyRate = (params.apr / 100) / 12;
      monthlyPayment = 
        (amountFinanced * monthlyRate) / 
        (1 - Math.pow(1 + monthlyRate, -params.termMonths));
    } else {
      monthlyPayment = amountFinanced / params.termMonths;
    }
  }

  // 7. LTV (Loan to Value)
  const ltv = params.nadaRetail > 0 ? (amountFinanced / params.nadaRetail) * 100 : 0;

  return {
    amountFinanced,
    monthlyPayment,
    frontEndGross,
    backEndGross,
    totalGross,
    totalTaxes,
    ltv,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount || 0);
}