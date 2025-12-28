"use client";

import { useState, useRef, useEffect } from "react";

interface UseSidebarResizeProps {
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

export function useSidebarResize({
  initialWidth = 256,
  minWidth = 200,
  maxWidth = 600,
}: UseSidebarResizeProps = {}) {
  const [sidebarWidth, setSidebarWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(initialWidth);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const delta = e.clientX - startXRef.current;
      const newWidth = startWidthRef.current + delta;

      // Constrain width
      const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setSidebarWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    };

    if (isResizing) {
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing, sidebarWidth, minWidth, maxWidth]);

  return {
    sidebarWidth,
    setSidebarWidth,
    isResizing,
    handleMouseDown,
  };
}

