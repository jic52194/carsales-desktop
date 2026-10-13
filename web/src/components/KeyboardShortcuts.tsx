import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { modulesFor } from "@/lib/modules";

const GO: Record<string, { path: string; label: string }> = {
  d: { path: "/", label: "Dashboard" },
  c: { path: "/customers", label: "Customers" },
  l: { path: "/leads", label: "Leads" },
  i: { path: "/inventory", label: "Inventory" },
  k: { path: "/desking", label: "Desking" },
  t: { path: "/tasks", label: "My Tasks" },
};
const OPEN_EVT = "cso:open-shortcuts";
export const openShortcuts = () => window.dispatchEvent(new Event(OPEN_EVT));

function typing(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable || !!el.closest?.("[cmdk-root]");
}

const Kbd = ({ children }: { children: React.ReactNode }) => <kbd className="inline-flex items-center justify-center min-w-[22px] h-6 px-1.5 rounded border bg-muted font-mono text-[11px] font-semibold">{children}</kbd>;

export function KeyboardShortcuts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const pending = useRef<number | null>(null);
  const allowed = new Set(modulesFor(user?.role).map((m) => m.path));
  const allowedRef = useRef(allowed);
  allowedRef.current = allowed;

  useEffect(() => {
    const openIt = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      if (e.key === "?") { e.preventDefault(); setOpen((o) => !o); return; }
      const key = e.key.toLowerCase();
      if (pending.current !== null) {
        window.clearTimeout(pending.current); pending.current = null;
        const dest = GO[key];
        if (dest && allowedRef.current.has(dest.path)) { e.preventDefault(); setOpen(false); navigate(dest.path); }
        return;
      }
      if (key === "g") pending.current = window.setTimeout(() => { pending.current = null; }, 1200);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVT, openIt);
    return () => { document.removeEventListener("keydown", onKey); window.removeEventListener(OPEN_EVT, openIt); };
  }, [navigate]);

  const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  const rows: { keys: string[]; label: string; combo?: boolean }[] = [
    { keys: [mac ? "⌘" : "Ctrl", "K"], label: "Search / command palette", combo: true },
    { keys: ["?"], label: "Show this list" },
    ...Object.entries(GO).filter(([, v]) => allowed.has(v.path)).map(([k, v]) => ({ keys: ["g", k], label: `Go to ${v.label}` })),
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Shortcuts are ignored while you're typing in a field. For "g" shortcuts, press g then the letter.</DialogDescription>
        </DialogHeader>
        <ul className="divide-y">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between py-2 text-sm">
              <span>{r.label}</span>
              <span className="flex items-center gap-1">{r.keys.map((k, i) => <span key={i} className="flex items-center gap-1">{i > 0 && <span className="text-xs text-muted-foreground">{r.combo ? "+" : "then"}</span>}<Kbd>{k}</Kbd></span>)}</span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
