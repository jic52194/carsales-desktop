import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { hapticFeedback } from '@/lib/haptics';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const pullDistance = Math.max(0, currentY - startY);
  const maxPull = 80;
  const isPulling = pullDistance > 0 && !isRefreshing;
  const pullPercentage = Math.min(pullDistance / maxPull, 1);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      setStartY(e.touches[0].clientY);
    } else {
      setStartY(0);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY > 0 && !isRefreshing) {
      const y = e.touches[0].clientY;
      if (y > startY) {
        setCurrentY(y);
        // Prevent default scrolling when pulling down
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= maxPull && !isRefreshing) {
      setIsRefreshing(true);
      hapticFeedback();
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setStartY(0);
    setCurrentY(0);
  };

  return (
    <div 
      className="relative w-full h-full overflow-y-auto overscroll-y-none"
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="absolute top-0 left-0 right-0 flex items-center justify-center overflow-hidden transition-all duration-200 ease-out"
        style={{ 
          height: isRefreshing ? '60px' : `${Math.min(pullDistance, maxPull)}px`,
          opacity: isRefreshing ? 1 : pullPercentage
        }}
      >
        <RefreshCw 
          className={`w-6 h-6 text-primary ${isRefreshing ? 'animate-spin' : ''}`}
          style={{ transform: `rotate(${pullPercentage * 180}deg)` }}
        />
      </div>
      <div 
        className="transition-transform duration-200 ease-out min-h-full"
        style={{ transform: `translateY(${isRefreshing ? '60px' : Math.min(pullDistance, maxPull) + 'px'})` }}
      >
        {children}
      </div>
    </div>
  );
}