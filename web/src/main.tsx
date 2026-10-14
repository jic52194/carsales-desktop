import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

document.title = "CarSales AI OS";
// Browser / phone only: offline shell + "Add to Home Screen". The desktop shell updates itself.
if (!(window as any).carsalesNative && "serviceWorker" in navigator && location.protocol.startsWith("http")) {
  import("virtual:pwa-register").then(({ registerSW }) => registerSW({ immediate: true })).catch(() => {});
}
createRoot(document.getElementById("root")!).render(<App />);

// broken vehicle photos (expired feed URLs) fall back to the placeholder instead of showing alt text
import { PLACEHOLDER_IMG } from "@/lib/inventory";
document.addEventListener("error", (e) => { const t = e.target; if (t instanceof HTMLImageElement && t.hasAttribute("data-car") && t.src !== PLACEHOLDER_IMG) t.src = PLACEHOLDER_IMG; }, true);
