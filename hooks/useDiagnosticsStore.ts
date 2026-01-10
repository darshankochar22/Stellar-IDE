/**
 * Diagnostics Store Hook
 * Manages collection of all diagnostics from LSP
 */

import { useState, useCallback } from "react";
import type { Diagnostic } from "../lib/lsp/types";

export interface DiagnosticItem extends Diagnostic {
  uri: string;
  id: string; // Unique ID for the diagnostic
}

interface UseDiagnosticsStoreReturn {
  diagnostics: DiagnosticItem[];
  getDiagnosticsBySeverity: (severity: number) => DiagnosticItem[];
  addDiagnostics: (uri: string, diagnostics: Diagnostic[]) => void;
  clearDiagnostics: (uri?: string) => void;
  totalCount: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

/**
 * Hook to manage diagnostics collection
 */
export function useDiagnosticsStore(): UseDiagnosticsStoreReturn {
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);

  // Add diagnostics for a file (replaces existing ones for that file)
  const addDiagnostics = useCallback((uri: string, newDiagnostics: Diagnostic[]) => {
    setDiagnostics((prev) => {
      // Remove existing diagnostics for this URI
      const filtered = prev.filter((d) => d.uri !== uri);
      
      // Add new diagnostics with unique IDs
      const newItems: DiagnosticItem[] = newDiagnostics.map((diag, index) => ({
        ...diag,
        uri,
        id: `${uri}-${diag.range.start.line}-${diag.range.start.character}-${index}`,
      }));

      return [...filtered, ...newItems];
    });
  }, []);

  // Clear diagnostics (all or for a specific file)
  const clearDiagnostics = useCallback((uri?: string) => {
    if (uri) {
      setDiagnostics((prev) => prev.filter((d) => d.uri !== uri));
    } else {
      setDiagnostics([]);
    }
  }, []);

  // Get diagnostics by severity
  const getDiagnosticsBySeverity = useCallback(
    (severity: number) => {
      return diagnostics.filter((d) => d.severity === severity);
    },
    [diagnostics]
  );

  // Calculate counts
  const errorCount = diagnostics.filter((d) => d.severity === 1).length; // Error
  const warningCount = diagnostics.filter((d) => d.severity === 2).length; // Warning
  const infoCount = diagnostics.filter((d) => d.severity === 3 || d.severity === 4).length; // Info/Hint

  return {
    diagnostics,
    getDiagnosticsBySeverity,
    addDiagnostics,
    clearDiagnostics,
    totalCount: diagnostics.length,
    errorCount,
    warningCount,
    infoCount,
  };
}
