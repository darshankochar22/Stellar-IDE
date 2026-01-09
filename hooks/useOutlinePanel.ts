"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface UseOutlinePanelProps {
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

/**
 * Hook to manage outline panel visibility and resizing
 * Similar to useSidebarResize but for the right-side outline panel
 */
export function useOutlinePanel({
  initialWidth = 280,
  minWidth = 200,
  maxWidth = 500,
}: UseOutlinePanelProps = {}) {
  const [outlineVisible, setOutlineVisible] = useState(false);
  const [outlineWidth, setOutlineWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(initialWidth);

  /**
   * Start resizing when mouse down on resize handle
   */
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = outlineWidth;
  }, [outlineWidth]);

  /**
   * Handle mouse move and mouse up events for resizing
   */
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = startXRef.current - e.clientX; // Inverted for right-side panel
      const newWidth = startWidthRef.current + delta;

      // Constrain width between min and max
      const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setOutlineWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    };

    // Set cursor for resizing
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    
    // Attach event listeners
    document.addEventListener("mousemove", handleMouseMove, { passive: false });
    document.addEventListener("mouseup", handleMouseUp, { passive: false });

    // Cleanup
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth]);

  /**
   * Toggle outline panel visibility
   */
  const toggleOutline = useCallback(() => {
    setOutlineVisible((prev) => !prev);
  }, []);

  return {
    outlineVisible,
    setOutlineVisible,
    outlineWidth,
    setOutlineWidth,
    isResizing,
    handleMouseDown,
    toggleOutline,
  };
}
