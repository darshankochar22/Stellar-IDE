/**
 * Outline View Component
 * Displays document symbols (functions, structs, traits, etc.) in a tree view
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  Code,
  Package,
  Type,
  Variable,
  FileCode,
} from "lucide-react";
import type { DocumentSymbol } from "../../lib/lsp/requests";
import type { FileNode } from "./types";

interface OutlineViewProps {
  fileUri: string;
  openFile: FileNode | null;
  requestDocumentSymbols: (uri: string) => Promise<DocumentSymbol[]>;
  onSymbolClick: (line: number, column: number) => void;
}

// Symbol kind icons mapping (LSP SymbolKind enum values)
const getSymbolIcon = (kind: number) => {
  switch (kind) {
    case 1: // File
      return <FileCode className="w-3.5 h-3.5 text-blue-400" />;
    case 2: // Module
    case 3: // Namespace
      return <Package className="w-3.5 h-3.5 text-purple-400" />;
    case 5: // Class
    case 6: // Struct
      return <Type className="w-3.5 h-3.5 text-yellow-400" />;
    case 11: // Interface/Trait
      return <Type className="w-3.5 h-3.5 text-cyan-400" />;
    case 12: // Function
    case 13: // Method
      return <Code className="w-3.5 h-3.5 text-green-400" />;
    case 14: // Variable
    case 15: // Constant
      return <Variable className="w-3.5 h-3.5 text-orange-400" />;
    default:
      return <FileCode className="w-3.5 h-3.5 text-gray-400" />;
  }
};

export default function OutlineView({
  fileUri,
  openFile,
  requestDocumentSymbols,
  onSymbolClick,
}: OutlineViewProps) {
  const [symbols, setSymbols] = useState<DocumentSymbol[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(
    new Set()
  );

  // Load symbols when file changes
  useEffect(() => {
    if (!fileUri || !openFile) {
      setSymbols([]);
      return;
    }

    const loadSymbols = async () => {
      setLoading(true);
      try {
        const result = await requestDocumentSymbols(fileUri);
        setSymbols(result || []);
        // Auto-expand top-level symbols
        const topLevelIds = result?.map((_, index) => `symbol-${index}`) || [];
        setExpandedSymbols(new Set(topLevelIds));
      } catch (error) {
        console.error("[OutlineView] Error loading symbols:", error);
        setSymbols([]);
      } finally {
        setLoading(false);
      }
    };

    loadSymbols();
  }, [fileUri, openFile, requestDocumentSymbols]);

  const toggleExpand = useCallback((symbolId: string) => {
    setExpandedSymbols((prev) => {
      const next = new Set(prev);
      if (next.has(symbolId)) {
        next.delete(symbolId);
      } else {
        next.add(symbolId);
      }
      return next;
    });
  }, []);

  const handleSymbolClick = useCallback(
    (symbol: DocumentSymbol) => {
      const line = symbol.selectionRange.start.line;
      const column = symbol.selectionRange.start.character;
      onSymbolClick(line + 1, column + 1); // Convert 0-based to 1-based for Monaco
    },
    [onSymbolClick]
  );

  const renderSymbol = (
    symbol: DocumentSymbol,
    level: number = 0,
    index: number = 0
  ): React.ReactElement => {
    const symbolId = `symbol-${level}-${index}`;
    const hasChildren = symbol.children && symbol.children.length > 0;
    const isExpanded = expandedSymbols.has(symbolId);
    const indent = level * 16;

    return (
      <div key={symbolId}>
        <div
          className={`flex items-center gap-2 px-2 py-1 hover:bg-[#252525] cursor-pointer group ${
            false ? "bg-[#252525]" : ""
          }`}
          style={{ paddingLeft: `${8 + indent}px` }}
          onClick={() => handleSymbolClick(symbol)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(symbolId);
              }}
              className="flex items-center justify-center w-4 h-4 hover:bg-[#333] rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-gray-400" />
              ) : (
                <ChevronRight className="w-3 h-3 text-gray-400" />
              )}
            </button>
          ) : (
            <div className="w-4 h-4" />
          )}
          {getSymbolIcon(symbol.kind)}
          <span className="flex-1 text-sm text-gray-300 group-hover:text-white truncate">
            {symbol.name}
          </span>
          {symbol.detail && (
            <span className="text-xs text-gray-500 truncate max-w-[100px] hidden group-hover:inline">
              {symbol.detail}
            </span>
          )}
          <span className="text-xs text-gray-500 ml-auto">
            {symbol.range.start.line + 1}
          </span>
        </div>
        {hasChildren && isExpanded && symbol.children && (
          <div>
            {symbol.children.map((child, childIndex) =>
              renderSymbol(child, level + 1, childIndex)
            )}
          </div>
        )}
      </div>
    );
  };

  if (!openFile) {
    return (
      <div className="h-full flex items-center justify-center bg-[#171717]">
        <div className="px-4 py-2 text-gray-500 text-sm text-center">
          Open a file to see outline
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#171717]">
        <div className="px-4 py-2 text-gray-500 text-sm">
          Loading outline...
        </div>
      </div>
    );
  }

  if (symbols.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-[#171717]">
        <div className="px-4 py-2 text-gray-500 text-sm text-center">
          No symbols found
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#171717] sidebar-scrollbar">
      <div className="px-3 py-2 border-b border-[#252525] shrink-0">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Outline
        </h3>
      </div>
      <div className="py-2">
        {symbols.map((symbol, index) => renderSymbol(symbol, 0, index))}
      </div>
    </div>
  );
}
