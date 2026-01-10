/**
 * Outline Section Component
 * Outline view for Rust files
 */

import { useState, useCallback } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import OutlineView from "../Editor/OutlineView";
import type { FileNode } from "./types";

interface OutlineSectionProps {
  openFile: FileNode | null;
  projectName?: string;
}

export default function OutlineSection({
  openFile,
  projectName,
}: OutlineSectionProps) {
  const isRustFile = openFile?.name.endsWith(".rs") || false;
  const [outlineExpanded, setOutlineExpanded] = useState(true);

  // Memoize requestDocumentSymbols to prevent unnecessary re-renders
  const requestDocumentSymbols = useCallback(async (uri: string) => {
    const lspFn = window.lspFunctions;
    if (!lspFn?.requestDocumentSymbols) {
      console.warn("[Sidebar] LSP functions not available yet");
      return [];
    }
    try {
      const result = await lspFn.requestDocumentSymbols(uri);
      console.log("[Sidebar] Document symbols result:", result);
      return result;
    } catch (error) {
      console.error("[Sidebar] Error requesting document symbols:", error);
      return [];
    }
  }, []);

  // Memoize onSymbolClick to prevent unnecessary re-renders
  const handleSymbolClick = useCallback((line: number, column: number) => {
    const editor = window.currentEditorInstance;
    if (editor) {
      editor.setPosition({ lineNumber: line, column });
      editor.revealLineInCenter(line);
      editor.focus();
    } else {
      console.warn("[Sidebar] Editor instance not available");
    }
  }, []);

  if (!isRustFile) return null;

  return (
    <div className="border-t border-[#252525] flex flex-col shrink-0">
      {/* Outline Header - Always visible and clickable */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-[#252525] shrink-0 cursor-pointer hover:bg-[#252525] transition-colors"
        onClick={() => setOutlineExpanded(!outlineExpanded)}
        title={outlineExpanded ? "Collapse Outline" : "Expand Outline"}
      >
        <div className="flex items-center gap-2">
          {outlineExpanded ? (
            <ChevronDown className="w-3 h-3 text-gray-400" />
          ) : (
            <ChevronRight className="w-3 h-3 text-gray-400" />
          )}
          <span className="text-xs text-gray-400 font-semibold uppercase">
            Outline
          </span>
        </div>
      </div>

      {/* Outline Content - Only show when expanded */}
      {outlineExpanded && openFile && (
        <div
          className="flex flex-col shrink-0 overflow-hidden"
          style={{
            height: "250px",
            minHeight: "200px",
            maxHeight: "40%",
          }}
        >
          <OutlineView
            fileUri={`file:///home/developer/workspace/${
              projectName || "soroban-hello-world"
            }/${openFile.path}`}
            openFile={openFile}
            requestDocumentSymbols={requestDocumentSymbols}
            onSymbolClick={handleSymbolClick}
            hideHeader={true}
          />
        </div>
      )}
    </div>
  );
}
