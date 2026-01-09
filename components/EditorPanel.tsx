"use client";

import { useRef, useEffect } from "react";
import Editor, { Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import Terminal, { type LogMessage } from "./Terminal";
import TabBar, { type OpenFile } from "./TabBar";
import BottomBar from "./BottomBar";
import { useLSPClient, InlayHint } from "../lib/useLSPClient";

// Monaco type from the editor package
type MonacoType = Monaco;
type FileNode = {
  name: string;
  type: "file" | "folder";
  path: string;
  content?: string;
  children?: FileNode[];
};

interface EditorPanelProps {
  openFile: FileNode | null;
  containerId?: string;
  projectName?: string;
  openFiles: OpenFile[];
  fileContents: Map<string, string>;
  fontSize: number;
  terminalOpen: boolean;
  terminalHeight: number;
  logs: LogMessage[];
  onFileSelect: (path: string) => void;
  onFileClose: (path: string) => void;
  onEditorChange: (value: string | undefined) => void;
  onEditorMount: (
    editorInstance: editor.IStandaloneCodeEditor,
    monaco: MonacoType
  ) => void;
  onSave: () => void;
  onTerminalClose: () => void;
  onTerminalHeightChange: (height: number) => void;
}

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
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedDeltaRef = useRef(0);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // Build file URI including project name for correct LSP path matching
  // Default to soroban-hello-world if no project specified
  const effectiveProjectName = projectName || "soroban-hello-world";
  const fileUri = openFile
    ? `file:///home/developer/workspace/${effectiveProjectName}/${openFile.path}`
    : "";

  const {
    isConnected,
    connectionError,
    diagnosticsCount,
    openTextDocument,
    changeTextDocument,
    requestInlayHints,
  } = useLSPClient(containerId, fileUri);

  const inlayHintsProviderRef = useRef<{ dispose: () => void } | null>(null);

  // Debug: Log connection status changes
  useEffect(() => {
    console.log(
      `[EditorPanel] LSP Status - Connected: ${isConnected}, Container: ${containerId}`
    );
    console.log(
      `[EditorPanel] Project: ${effectiveProjectName}, File: ${openFile?.path}`
    );
    console.log(`[EditorPanel] Full URI: ${fileUri}`);
    if (connectionError) {
      console.error(`[EditorPanel] Connection Error: ${connectionError}`);
    }
  }, [
    isConnected,
    containerId,
    connectionError,
    effectiveProjectName,
    fileUri,
    openFile?.path,
  ]);

  // Open file in LSP when connected (only for Rust files)
  useEffect(() => {
    if (
      isConnected &&
      openFile &&
      openFile.name.endsWith(".rs") &&
      fileContents.has(openFile.path) &&
      fileUri // Make sure URI is ready
    ) {
      const content = fileContents.get(openFile.path) || "";
      console.log(`[EditorPanel] Opening Rust file in LSP: ${fileUri}`);
      console.log(`[EditorPanel] Content length: ${content.length} chars`);
      // Pass URI directly to avoid stale ref
      openTextDocument(content, fileUri);
    }
  }, [isConnected, openFile, fileContents, openTextDocument, fileUri]);

  // Sync content changes to LSP (debounced)
  const lastContentRef = useRef<string>("");
  useEffect(() => {
    if (
      !isConnected ||
      !openFile ||
      !openFile.name.endsWith(".rs") ||
      !fileUri
    ) {
      return;
    }

    const content = fileContents.get(openFile.path) || "";

    // Only send if content actually changed
    if (content === lastContentRef.current) {
      return;
    }

    lastContentRef.current = content;

    // Debounce changes to avoid flooding LSP
    const timeoutId = setTimeout(() => {
      changeTextDocument(content, fileUri);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [isConnected, openFile, fileContents, changeTextDocument, fileUri]);

  const handleMouseWheel = (event: WheelEvent) => {
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

          const currentFontSize =
            (editor.getOption(55) as unknown as number) || 14;
          const normalizedDelta = accumulatedDeltaRef.current / 100;
          const zoomDelta = Math.round(normalizedDelta);

          if (zoomDelta !== 0) {
            const newFontSize = Math.max(
              8,
              Math.min(40, currentFontSize - zoomDelta)
            );
            if (newFontSize !== currentFontSize) {
              editorRef.current?.updateOptions({ fontSize: newFontSize });
            }
          }

          accumulatedDeltaRef.current = 0;
        }, 50);
      }
    }
  };

  function handleEditorDidMount(
    editorInstance: editor.IStandaloneCodeEditor,
    monaco: MonacoType
  ) {
    editorRef.current = editorInstance;
    editorInstance.focus();

    // Store Monaco instance globally for LSP client to access
    // Use a proper global declaration to ensure it persists
    const win = window as Window & { monacoInstance?: MonacoType };
    win.monacoInstance = monaco;
    console.log(
      "[EditorPanel] Monaco instance stored globally as window.monacoInstance"
    );

    // Register inlay hints provider for Rust
    if (inlayHintsProviderRef.current) {
      inlayHintsProviderRef.current.dispose();
    }

    inlayHintsProviderRef.current = monaco.languages.registerInlayHintsProvider(
      "rust",
      {
        provideInlayHints: async (
          model: editor.ITextModel,
          range: { startLineNumber: number; endLineNumber: number }
        ) => {
          if (!isConnected) return { hints: [], dispose: () => {} };

          const uri = model.uri.toString();
          console.log("[InlayHints] Requesting hints for", uri);

          const hints = await requestInlayHints(uri, {
            startLine: range.startLineNumber - 1,
            endLine: range.endLineNumber - 1,
          });

          console.log("[InlayHints] Received", hints.length, "hints");

          const monacoHints = hints.map((hint: InlayHint) => {
            const label =
              typeof hint.label === "string"
                ? hint.label
                : hint.label.map((l) => l.value).join("");

            return {
              position: {
                lineNumber: hint.position.line + 1,
                column: hint.position.character + 1,
              },
              label: `: ${label}`,
              kind:
                hint.kind === 1
                  ? monaco.languages.InlayHintKind.Type
                  : monaco.languages.InlayHintKind.Parameter,
              paddingLeft: hint.paddingLeft,
              paddingRight: hint.paddingRight,
            };
          });

          return {
            hints: monacoHints,
            dispose: () => {},
          };
        },
      }
    );

    console.log("[EditorPanel] Inlay hints provider registered for Rust");

    if (containerRef.current) {
      containerRef.current.addEventListener("wheel", handleMouseWheel, {
        passive: false,
      });
    }

    onEditorMount(editorInstance, monaco);

    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener("wheel", handleMouseWheel);
      }
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
      if (inlayHintsProviderRef.current) {
        inlayHintsProviderRef.current.dispose();
      }
    };
  }

  function getFileContent(file: FileNode | null): string {
    if (!file) return "";
    return fileContents.get(file.path) ?? "";
  }

  function getLanguage(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      rs: "rust",
      toml: "toml",
      json: "json",
      md: "markdown",
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      html: "html",
      css: "css",
      scss: "scss",
      yaml: "yaml",
      yml: "yaml",
      sh: "shell",
      py: "python",
    };
    return languageMap[ext || ""] || "plaintext";
  }

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
            <Editor
              height="100%"
              path={fileUri}
              language={getLanguage(openFile.name)}
              theme="vs-dark"
              value={getFileContent(openFile)}
              onChange={onEditorChange}
              onMount={handleEditorDidMount}
              options={{
                fontSize: fontSize,
                fontFamily:
                  "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'Monaco', monospace",
                minimap: { enabled: true },
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: "on",
                formatOnPaste: true,
                formatOnType: true,
                insertSpaces: true,
                suggestOnTriggerCharacters: true,
                acceptSuggestionOnEnter: "on",
                quickSuggestions: true,
                parameterHints: { enabled: true },
                folding: true,
                renderWhitespace: "selection",
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                smoothScrolling: true,
                padding: { top: 16 },
                scrollbar: {
                  vertical: "visible",
                  horizontal: "visible",
                  useShadows: true,
                  verticalSliderSize: 12,
                  horizontalSliderSize: 12,
                },
                renderLineHighlight: "gutter",
                overviewRulerBorder: false,
                hideCursorInOverviewRuler: false,
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <div className="text-6xl mb-4">📁</div>
                <p className="text-lg mb-2">No file selected</p>
                <p className="text-sm">
                  Open a file from the sidebar to start editing
                </p>
              </div>
            </div>
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
