/**
 * Editor Panel Component
 * Main editor container with tabs, Monaco editor, terminal, and status bar
 */

"use client";

import { useRef, useEffect } from "react";
import Terminal from "../Terminal";
import TabBar from "../TabBar";
import BottomBar from "../BottomBar";
import MonacoEditorWrapper from "./MonacoEditor";
import EmptyState from "./EmptyState";
import OutlineView from "./OutlineView";
import { useLSPSync } from "./useLSPSync";
import { useLSPClient } from "../../lib/useLSPClient";
import { useOutlinePanel } from "../../hooks/useOutlinePanel";
import { X } from "lucide-react";
import type { EditorPanelProps, MonacoEditor, MonacoType } from "./types";

export default function EditorPanel({
  openFile,
  openFiles,
  fileContents,
  containerId,
  projectName,
  fontSize,
  terminalOpen,
  terminalHeight,
  logs,
  onFileSelect,
  onFileClose,
  onEditorChange,
  onEditorMount,
  onTerminalClose,
  onTerminalHeightChange,
}: EditorPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<MonacoEditor | null>(null);

  // Outline panel state
  const {
    outlineVisible,
    outlineWidth,
    handleMouseDown: handleOutlineResize,
    toggleOutline,
  } = useOutlinePanel({
    initialWidth: 280,
    minWidth: 200,
    maxWidth: 500,
  });

  // Check if current file is Rust file
  const isRustFile = openFile?.path.endsWith(".rs") || false;

  // Build file URI for LSP
  const effectiveProjectName = projectName || "soroban-hello-world";
  const fileUri = openFile
    ? `file:///home/developer/workspace/${effectiveProjectName}/${openFile.path}`
    : "";

  // LSP client connection
  const {
    isConnected,
    connectionError,
    diagnosticsCount,
    openTextDocument,
    changeTextDocument,
    requestInlayHints,
    requestCompletion,
    requestHover,
    requestDefinition,
    requestReferences,
    requestPrepareRename,
    requestRename,
    requestFormatting,
    requestCodeAction,
    requestDocumentSymbols,
  } = useLSPClient(containerId, fileUri);

  // Debug logging
  useEffect(() => {
    console.log(
      `[EditorPanel] LSP Status - Connected: ${isConnected}, Container: ${containerId}`
    );
    if (connectionError) {
      console.error(`[EditorPanel] Connection Error: ${connectionError}`);
    }
  }, [isConnected, containerId, connectionError]);

  // LSP sync hook
  useLSPSync({
    isConnected,
    openFile,
    fileUri,
    fileContents,
    openTextDocument,
    changeTextDocument,
  });

  // Get file content
  const getFileContent = (path: string): string => {
    return fileContents.get(path) ?? "";
  };

  // Handle editor mount - store editor instance for navigation
  const handleEditorMount = (editor: MonacoEditor, monaco: MonacoType) => {
    editorInstanceRef.current = editor;
    onEditorMount(editor, monaco);
  };

  // Handle symbol click - navigate to symbol location
  const handleSymbolClick = (line: number, column: number) => {
    if (editorInstanceRef.current) {
      editorInstanceRef.current.setPosition({ lineNumber: line, column });
      editorInstanceRef.current.revealLineInCenter(line);
      editorInstanceRef.current.focus();
    }
  };

  return (
    <div className="flex-1 bg-[#171717] flex flex-col" ref={containerRef}>
      {/* Tab Bar */}
      <TabBar
        openFiles={openFiles}
        activeFile={openFile?.path || null}
        onSelectFile={onFileSelect}
        onCloseFile={onFileClose}
        onToggleOutline={toggleOutline}
        outlineVisible={outlineVisible}
        showOutlineButton={isRustFile}
      />

      {/* Editor Area with Terminal and Outline */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-hidden flex">
          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            {openFile ? (
              <MonacoEditorWrapper
                file={openFile}
                fileUri={fileUri}
                content={getFileContent(openFile.path)}
                fontSize={fontSize}
                requestInlayHints={requestInlayHints}
                requestCompletion={requestCompletion}
                requestHover={requestHover}
                requestDefinition={requestDefinition}
                requestReferences={requestReferences}
                requestPrepareRename={requestPrepareRename}
                requestRename={requestRename}
                requestFormatting={requestFormatting}
                requestCodeAction={requestCodeAction}
                requestDocumentSymbols={requestDocumentSymbols}
                onChange={onEditorChange}
                onMount={handleEditorMount}
                containerRef={containerRef}
              />
            ) : (
              <EmptyState />
            )}
          </div>

          {/* Outline Panel - Only show for Rust files */}
          {isRustFile && outlineVisible && (
            <>
              {/* Resize Handle - Left side of outline panel */}
              <div
                onMouseDown={handleOutlineResize}
                className="w-1 h-full bg-[#252525] cursor-col-resize transition-colors shrink-0 hover:bg-[#333]"
                title="Drag to resize outline"
                style={{ userSelect: "none" }}
              />
              {/* Outline Panel */}
              <div
                style={{
                  width: `${outlineWidth}px`,
                  minWidth: `${outlineWidth}px`,
                }}
                className="bg-[#171717] border-l border-[#252525] overflow-hidden flex flex-col"
              >
                {/* Outline Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#252525] shrink-0">
                  <span className="text-xs text-gray-400 font-semibold uppercase">
                    Outline
                  </span>
                  <button
                    onClick={toggleOutline}
                    className="p-1 hover:bg-[#252525] rounded transition-colors"
                    title="Close Outline"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                {/* Outline Content */}
                <div className="flex-1 overflow-hidden">
                  <OutlineView
                    fileUri={fileUri}
                    openFile={openFile}
                    requestDocumentSymbols={requestDocumentSymbols}
                    onSymbolClick={handleSymbolClick}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Terminal */}
        {terminalOpen && (
          <Terminal
            isOpen={terminalOpen}
            onClose={onTerminalClose}
            logs={logs}
            height={terminalHeight}
            onHeightChange={onTerminalHeightChange}
          />
        )}
      </div>

      <BottomBar
        openFile={openFile}
        lspConnected={isConnected}
        lspError={connectionError}
        diagnosticsCount={diagnosticsCount}
      />
    </div>
  );
}
