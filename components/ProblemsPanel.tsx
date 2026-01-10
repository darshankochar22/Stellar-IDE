/**
 * Problems Panel Component
 * Displays all diagnostics (errors, warnings, info) from LSP
 */

"use client";

import { useMemo } from "react";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { DiagnosticItem } from "../hooks/useDiagnosticsStore";

interface ProblemsPanelProps {
  diagnostics: DiagnosticItem[];
  onDiagnosticClick: (uri: string, line: number, column: number) => void;
  onFileOpen?: (filePath: string) => Promise<void>;
  projectName?: string;
}

interface DiagnosticGroup {
  severity: number;
  label: string;
  icon: React.ReactNode;
  color: string;
  items: DiagnosticItem[];
}

export default function ProblemsPanel({
  diagnostics,
  onDiagnosticClick,
  onFileOpen,
  projectName,
}: ProblemsPanelProps) {
  // Group diagnostics by severity
  const groupedDiagnostics = useMemo(() => {
    const groups: DiagnosticGroup[] = [
      {
        severity: 1,
        label: "Errors",
        icon: <AlertCircle className="w-4 h-4" />,
        color: "text-red-400",
        items: diagnostics.filter((d) => d.severity === 1),
      },
      {
        severity: 2,
        label: "Warnings",
        icon: <AlertTriangle className="w-4 h-4" />,
        color: "text-yellow-400",
        items: diagnostics.filter((d) => d.severity === 2),
      },
      {
        severity: 3,
        label: "Info",
        icon: <Info className="w-4 h-4" />,
        color: "text-blue-400",
        items: diagnostics.filter((d) => d.severity === 3 || d.severity === 4),
      },
    ].filter((group) => group.items.length > 0);

    return groups;
  }, [diagnostics]);

  // Format file path for display
  const formatFilePath = (uri: string): string => {
    try {
      // Remove file:// prefix and workspace path
      const workspacePath = `/home/developer/workspace/${
        projectName || "soroban-hello-world"
      }/`;
      const path = uri.replace("file://", "").replace(workspacePath, "");
      return path || uri.split("/").pop() || uri;
    } catch {
      return uri.split("/").pop() || uri;
    }
  };

  // Extract relative file path from URI
  const getFilePathFromUri = (uri: string): string => {
    try {
      const workspacePath = `/home/developer/workspace/${
        projectName || "soroban-hello-world"
      }/`;
      const fullPath = uri.replace("file://", "");
      return fullPath.replace(workspacePath, "");
    } catch {
      return uri.split("/").pop() || "";
    }
  };

  // Handle diagnostic click - try to open file if not already open
  const handleDiagnosticClick = async (
    diagnostic: DiagnosticItem,
    line: number,
    column: number
  ) => {
    const filePath = getFilePathFromUri(diagnostic.uri);

    // Try to open file if callback provided and file path exists
    if (onFileOpen && filePath) {
      try {
        await onFileOpen(filePath);
        // Small delay to allow file to open before navigating
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error("[ProblemsPanel] Failed to open file:", error);
        // Continue anyway to navigate if file is already open
      }
    }

    // Navigate to location (will work if file is already open)
    onDiagnosticClick(diagnostic.uri, line, column);
  };

  if (diagnostics.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-[#171717]">
        <div className="text-center">
          <div className="text-gray-500 text-sm mb-2">No Problems</div>
          <div className="text-gray-600 text-xs">
            All diagnostics will appear here
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#171717] sidebar-scrollbar">
      {groupedDiagnostics.map((group) => (
        <div key={group.severity} className="border-b border-[#252525]">
          {/* Group Header */}
          <div className="flex items-center gap-2 px-4 py-2 bg-[#1e1e1e] border-b border-[#252525] shrink-0">
            <div className={group.color}>{group.icon}</div>
            <span className="text-xs font-semibold text-gray-300">
              {group.label}
            </span>
            <span className="text-xs text-gray-500">
              ({group.items.length})
            </span>
          </div>

          {/* Diagnostic Items */}
          <div>
            {group.items.map((diagnostic) => {
              const line = diagnostic.range.start.line + 1;
              const column = diagnostic.range.start.character + 1;
              const filePath = formatFilePath(diagnostic.uri);

              return (
                <div
                  key={diagnostic.id}
                  className="flex items-start gap-3 px-4 py-2 hover:bg-[#252525] cursor-pointer group border-b border-[#252525]/50 transition-colors"
                  onClick={() =>
                    handleDiagnosticClick(diagnostic, line, column)
                  }
                >
                  <div className={`mt-0.5 shrink-0 ${group.color}`}>
                    {group.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400 font-mono truncate">
                        {filePath}
                      </span>
                      <span className="text-xs text-gray-500 shrink-0">
                        {line}:{column}
                      </span>
                    </div>
                    <div className="text-sm text-gray-300 group-hover:text-white transition-colors">
                      {diagnostic.message}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
