import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useEffect, useState } from "react";

export function BookDemoModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-book-demo', handleOpen);
    return () => window.removeEventListener('open-book-demo', handleOpen);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[800px] min-h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Book Your Demo</DialogTitle>
          <DialogDescription>
            Choose a time below to see the CarSales AI OS in action.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 w-full bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 flex items-center justify-center p-4">
          <div className="text-muted-foreground animate-pulse text-sm font-medium">Loading calendar...</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
