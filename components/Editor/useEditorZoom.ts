/**
 * Hook for handling editor zoom via mouse wheel
 */

import { useRef, useCallback } from "react";
import type { MonacoEditor } from "./types";

interface UseEditorZoomReturn {
  handleMouseWheel: (event: WheelEvent) => void;
  cleanup: () => void;
}

export function useEditorZoom(
  editorRef: React.RefObject<MonacoEditor | null>
): UseEditorZoomReturn {
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedDeltaRef = useRef(0);

  const handleMouseWheel = useCallback(
    (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        
        if (editorRef.current) {
          accumulatedDeltaRef.current += event.deltaY;

          if (wheelTimeoutRef.current) {
            clearTimeout(wheelTimeoutRef.current);
          }

          wheelTimeoutRef.current = setTimeout(() => {
            const editor = editorRef.current;
            if (!editor) return;

            const currentFontSize = (editor.getOption(55) as unknown as number) || 14;
            const normalizedDelta = accumulatedDeltaRef.current / 100;
            const zoomDelta = Math.round(normalizedDelta);

            if (zoomDelta !== 0) {
              const newFontSize = Math.max(8, Math.min(40, currentFontSize - zoomDelta));
              if (newFontSize !== currentFontSize) {
                editorRef.current?.updateOptions({ fontSize: newFontSize });
              }
            }

            accumulatedDeltaRef.current = 0;
          }, 50);
        }
      }
    },
    [editorRef]
  );

  const cleanup = useCallback(() => {
    if (wheelTimeoutRef.current) {
      clearTimeout(wheelTimeoutRef.current);
    }
  }, []);

  return { handleMouseWheel, cleanup };
}
