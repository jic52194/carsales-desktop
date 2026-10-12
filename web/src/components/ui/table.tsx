import * as React from "react";
import { RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement> & { onRefresh?: () => Promise<void> }>(
  ({ className, onRefresh, ...props }, ref) => {
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const [pullDistance, setPullDistance] = React.useState(0);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const touchStartY = React.useRef(0);
    const hasVibrated = React.useRef(false);

    const handleTouchStart = (e: React.TouchEvent) => {
      if (!onRefresh) return;
      if (containerRef.current && containerRef.current.scrollTop === 0) {
        touchStartY.current = e.targetTouches[0].clientY;
        hasVibrated.current = false;
      } else {
        touchStartY.current = 0;
      }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (!onRefresh || touchStartY.current === 0 || isRefreshing) return;
      
      const touchY = e.targetTouches[0].clientY;
      const distance = touchY - touchStartY.current;
      
      if (distance > 0 && containerRef.current && containerRef.current.scrollTop === 0) {
        const newDistance = Math.min(distance * 0.4, 80);
        setPullDistance(newDistance);
        
        if (newDistance >= 50 && !hasVibrated.current) {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(15);
          }
          hasVibrated.current = true;
        } else if (newDistance < 50) {
          hasVibrated.current = false;
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!onRefresh || touchStartY.current === 0 || isRefreshing) return;
      
      if (pullDistance > 50) {
        setIsRefreshing(true);
        setPullDistance(50);
        try {
          await onRefresh();
        } catch (error) {
          console.error(error);
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
      touchStartY.current = 0;
    };

    return (
      <div 
        ref={containerRef}
        className="relative w-full overflow-auto touch-pan-x touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {onRefresh && (
          <div 
            className="absolute top-0 left-0 right-0 flex justify-center items-center overflow-hidden z-10 pointer-events-none"
            style={{ 
              height: `${pullDistance}px`,
              opacity: pullDistance / 50,
              transition: isRefreshing || pullDistance === 0 ? 'all 0.3s ease-out' : 'none'
            }}
          >
            <div className={cn("bg-background border shadow-sm rounded-full p-2 text-primary", isRefreshing && "animate-spin")}>
              <RefreshCw className="h-4 w-4" />
            </div>
          </div>
        )}
        <div 
          style={{ 
            transform: `translateY(${pullDistance}px)`, 
            transition: isRefreshing || pullDistance === 0 ? 'transform 0.3s ease-out' : 'none' 
          }}
        >
          <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
        </div>
      </div>
    );
  },
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />,
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  ),
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)} {...props} />
  ),
);
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn("border-b transition-all duration-200 data-[state=selected]:bg-muted hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-default", className)}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)} {...props} />
  ),
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
  ),
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
