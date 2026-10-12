import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const SHORTCUTS: { key: string; label: string; path?: string; event?: string }[] = [
  { key: "k", label: "Command Palette", event: "open-command-palette" },
  { key: "g", label: "Go to Desking", path: "/" },
  { key: "c", label: "Go to CRM", path: "/crm" },
  { key: "i", label: "Go to Inventory", path: "/inventory" },
  { key: "a", label: "Go to Appointments", path: "/appointments" },
  { key: "t", label: "Go to Tasks", path: "/tasks" },
  { key: "d", label: "Go to Deal Jacket", path: "/deal-jacket" },
  { key: "n", label: "New Lead", event: "open-new-lead" },
  { key: "s", label: "Save Deal", event: "trigger-save-deal" },
  { key: "b", label: "Book a Demo", event: "open-book-demo" },
];

export function KeyboardShortcuts() {
  const navigate = useNavigate();

  const handler = useCallback(
    (e: KeyboardEvent) => {
      // Skip if typing in an input/textarea/select
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable) {
        return;
      }

      // ⌘K / Ctrl+K handled by CommandPalette already
      if ((e.metaKey || e.ctrlKey) && e.key === "k") return;

      // Single-key shortcuts (no modifier)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();
      const shortcut = SHORTCUTS.find((s) => s.key === key);
      if (!shortcut) return;

      e.preventDefault();
      if (shortcut.event) {
        window.dispatchEvent(new CustomEvent(shortcut.event));
      } else if (shortcut.path) {
        navigate(shortcut.path);
      }
    },
    [navigate]
  );

  useEffect(() => {
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handler]);

  return null;
}
