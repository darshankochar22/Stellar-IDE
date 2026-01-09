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
import { useLSPSync } from "./useLSPSync";
import { useLSPClient } from "../../lib/useLSPClient";
import type { EditorPanelProps } from "./types";

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
    requestFormatting,
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

  return (
    <div className="flex-1 bg-[#171717] flex flex-col" ref={containerRef}>
      {/* Tab Bar */}
      <TabBar
        openFiles={openFiles}
        activeFile={openFile?.path || null}
        onSelectFile={onFileSelect}
        onCloseFile={onFileClose}
      />

      {/* Editor Area with Terminal */}
      <div className="flex-1 flex flex-col min-h-0">
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
              requestFormatting={requestFormatting}
              onChange={onEditorChange}
              onMount={onEditorMount}
              containerRef={containerRef}
            />
          ) : (
            <EmptyState />
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
