'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';

interface ResizablePanelProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  defaultLeftWidth?: number;
}

export default function ResizablePanel({
  leftPanel,
  rightPanel,
  defaultLeftWidth = 50,
}: ResizablePanelProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Constrain between 20% and 80%
      if (newLeftWidth >= 20 && newLeftWidth <= 80) {
        setLeftWidth(newLeftWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  return (
    <div ref={containerRef} className="flex flex-1 overflow-hidden relative">
      <div style={{ width: `${leftWidth}%` }} className="flex overflow-hidden h-full">
        {leftPanel}
      </div>
      
      <div
        className="w-1 bg-gray-300 dark:bg-gray-700 hover:bg-primary hover:w-1.5 cursor-col-resize transition-all flex-shrink-0"
        onMouseDown={handleMouseDown}
        style={{ zIndex: 10 }}
      />
      
      <div style={{ width: `${100 - leftWidth}%` }} className="flex overflow-hidden h-full">
        {rightPanel}
      </div>
    </div>
  );
}
