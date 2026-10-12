import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimation, useMotionValue, PanInfo } from 'framer-motion';
import { hapticFeedback } from '@/lib/haptics';

interface SwipeActionProps {
  children: React.ReactNode;
  rightActions?: {
    icon: React.ReactNode;
    label: string;
    color: string;
    onClick: () => void;
  }[];
  leftActions?: {
    icon: React.ReactNode;
    label: string;
    color: string;
    onClick: () => void;
  }[];
}

export function SwipeAction({ children, rightActions, leftActions }: SwipeActionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  const [actionTriggered, setActionTriggered] = useState(false);

  const actionWidth = 80; // Width of each action button
  const maxRightSwipe = leftActions ? leftActions.length * actionWidth : 0;
  const maxLeftSwipe = rightActions ? -(rightActions.length * actionWidth) : 0;
  const triggerThreshold = 60; // How far to swipe to trigger first action

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    
    // Snap to open or closed state
    if (info.offset.x < maxLeftSwipe / 2) {
      controls.start({ x: maxLeftSwipe, transition: { type: 'spring', stiffness: 400, damping: 30 } });
      hapticFeedback();
    } else if (info.offset.x > maxRightSwipe / 2) {
      controls.start({ x: maxRightSwipe, transition: { type: 'spring', stiffness: 400, damping: 30 } });
      hapticFeedback();
    } else {
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 500, damping: 40 } });
    }
  };

  return (
    <div className="relative overflow-hidden w-full touch-pan-y" ref={containerRef}>
      {/* Background Actions */}
      <div className="absolute inset-0 flex justify-between items-center z-0">
        {/* Left Actions (revealed when swiping right) */}
        <div className="flex h-full">
          {leftActions?.map((action, i) => (
            <button
              key={i}
              onClick={() => {
                action.onClick();
                controls.start({ x: 0 });
              }}
              className={`h-full flex flex-col items-center justify-center text-white w-[80px] ${action.color}`}
            >
              {action.icon}
              <span className="text-[10px] font-bold mt-1">{action.label}</span>
            </button>
          ))}
        </div>
        
        {/* Right Actions (revealed when swiping left) */}
        <div className="flex h-full">
          {rightActions?.map((action, i) => (
            <button
              key={i}
              onClick={() => {
                action.onClick();
                controls.start({ x: 0 });
              }}
              className={`h-full flex flex-col items-center justify-center text-white w-[80px] ${action.color}`}
            >
              {action.icon}
              <span className="text-[10px] font-bold mt-1">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Foreground Content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: maxLeftSwipe, right: maxRightSwipe }}
        dragElastic={0.1}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className="relative z-10 bg-background w-full shadow-[0_0_10px_rgba(0,0,0,0.05)]"
      >
        {/* Prevent clicks on children while dragging */}
        <div className={isDragging ? "pointer-events-none" : ""}>
          {children}
        </div>
      </motion.div>
    </div>
  );
}