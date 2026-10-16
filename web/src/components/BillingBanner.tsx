// Red bar across the app when the dealership's CarSalesSoftware.com payment failed (set by the Stripe webhook).
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useTenant } from "@/lib/tenant";
import { useAuth } from "@/lib/auth";

export default function BillingBanner() {
  const t = useTenant() as any;
  const { user } = useAuth();
  if (t?.isDemo || !["past_due", "unpaid"].includes(t?.billingStatus)) return null;
  const admin = !!user && ["owner", "admin", "super_admin"].includes(user.role);
  return (
    <div className="shrink-0 z-40 flex flex-wrap items-center gap-x-3 gap-y-1 px-3 md:px-5 py-1.5 bg-red-600 text-white text-sm">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="font-semibold">Payment failed</span>
      <span className="text-white/85">{admin ? "Update your card to keep CarSales AI OS running." : "Ask your owner or admin to update the card in Settings → Billing."}</span>
      {admin && <Link to="/settings?tab=billing" className="ml-auto rounded-md bg-white text-red-700 px-2.5 py-0.5 font-semibold hover:bg-white/90">Update card</Link>}
    </div>
  );
}
