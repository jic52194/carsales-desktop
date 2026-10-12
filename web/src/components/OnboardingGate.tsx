import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isOnboarded, hasPreviewedOnboarding } from "@/lib/tenant";
import { useAuth } from "@/lib/auth";

/**
 * Until a dealership owner/admin confirms the dealership's information, every owner/admin login
 * (and the platform super-admin, once, as a preview) lands in the onboarding wizard.
 * Staff roles (sales, service, …) are never blocked by it.
 */
export function OnboardingGate() {
  const nav = useNavigate();
  const loc = useLocation();
  const { user } = useAuth();
  useEffect(() => {
    if (!user || loc.pathname === "/onboarding") return;
    const mustConfirm = ["owner", "admin"].includes(user.role) && !isOnboarded();
    const superPreview = user.role === "super_admin" && !isOnboarded() && !hasPreviewedOnboarding(user.id);
    if (mustConfirm || superPreview) nav("/onboarding", { replace: true });
  }, [loc.pathname, nav, user]);
  return null;
}
