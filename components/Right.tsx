"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { type LogMessage } from "./Terminal";
import type { OpenFile } from "./TabBar";
import Sidebar from "./Sidebar";
import EditorPanel from "./EditorPanel";
import TopBar from "./TopBar";
import ErrorBanner from "./ErrorBanner";
import { useWallet } from "../hooks/useWallet";
import { useFileManager } from "../hooks/useFileManager";
import { useMonacoSetup } from "../hooks/useMonacoSetup";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useContainerManagement } from "../hooks/useContainerManagement";

type FileNode = {
  name: string;
  type: "file" | "folder";
  path: string;
  content?: string;
  children?: FileNode[];
};

interface RightProps {
  sidebarVisible?: boolean;
  terminalVisible?: boolean;
  onToggleSidebar?: () => void;
  onToggleTerminal?: () => void;
  onToggleLeftComponent?: () => void;
  leftComponentVisible?: boolean;
}

export default function Right({
  sidebarVisible = true,
  terminalVisible = false,
  onToggleSidebar,
  onToggleTerminal,
  onToggleLeftComponent,
  leftComponentVisible = false,
}: RightProps) {
  const [fontSize, setFontSize] = useState(14);
  const [containerLoading, setContainerLoading] = useState(false);
  const [userId] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(terminalVisible);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const messageCountRef = useRef(0);
  const [terminalHeight, setTerminalHeight] = useState(250);
  const [sidebarWidth, setSidebarWidth] = useState(256); // 256px = w-64
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(256);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  //const [accountLoading, setAccountLoading] = useState(false);
  //const [contractLoading, setContractLoading] = useState(false);

  // ============================================================================
  // HELPER FUNCTION: Log to Terminal
  // ============================================================================
  const logToTerminal = useCallback(
    (message: string, type: "log" | "error" | "warn" | "info" = "log") => {
      const now = new Date();
      const timestamp = now.toLocaleTimeString();
      setLogs((prev) => [
        ...prev,
        {
          id: messageCountRef.current++,
          message,
          timestamp,
          type,
        },
      ]);
    },
    []
  );

  // Wallet hook
  const { connected, publicKey, connectWallet, disconnectWallet } =
    useWallet(logToTerminal);

  // File Manager hook
  const {
    files,
    openFile,
    fileContents,
    expandedFolders,
    creatingItem,
    newItemName,
    isLoading,
    isSaving,
    loadFiles,
    handleFileClick,
    handleSave,
    handleCreateFile,
    handleCreateFolder,
    confirmCreateItem,
    cancelCreateItem,
    handleDeleteFile,
    handleDeleteFolder,
    toggleFolder,
    setNewItemName,
    setOpenFile,
    setFileContents,
    setFiles,
  } = useFileManager(userId, logToTerminal, setError, setTerminalOpen);

  // Monaco Editor Setup hook
  const { editorRef, handleEditorDidMount } = useMonacoSetup({
    onFontSizeChange: setFontSize,
    containerRef,
  });

  // Keyboard Shortcuts hook
  useKeyboardShortcuts({
    onSave: handleSave,
    fontSize,
    onFontSizeChange: setFontSize,
    editorRef,
  });

  // Container Management hook
  const { handleCreateContainer, handleDeleteContainer } =
    useContainerManagement({
      userId,
      logToTerminal,
      onContainerLoading: setContainerLoading,
      onError: setError,
      onTerminalOpen: setTerminalOpen,
      onLoadFiles: loadFiles,
      onClearFiles: () => {
        setFiles([]);
        setOpenFile(null);
        setFileContents(new Map());
      },
    });

  // ============================================================================
  // SIDEBAR RESIZING
  // ============================================================================
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizingSidebar(true);
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingSidebar) return;

      const delta = e.clientX - startXRef.current;
      const newWidth = startWidthRef.current + delta;

      // Constrain width between 200px and 600px
      const constrainedWidth = Math.max(200, Math.min(600, newWidth));
      setSidebarWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    };

    if (isResizingSidebar) {
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizingSidebar, sidebarWidth]);

  // ============================================================================
  // FILE CLICK WRAPPER - Sync with openFiles TabBar state
  // ============================================================================
  const handleFileClickWrapper = useCallback(
    async (file: FileNode) => {
      await handleFileClick(file);
      // Update openFiles for TabBar
      setOpenFiles((prev) => {
        const exists = prev.find((f) => f.path === file.path);
        if (!exists && file.type === "file") {
          return [
            ...prev,
            { path: file.path, name: file.name, isDirty: false },
          ];
        }
        return prev;
      });
    },
    [handleFileClick]
  );

  // ============================================================================
  // TAB BAR HANDLERS
  // ============================================================================
  const handleSelectTab = (path: string) => {
    const file = openFiles.find((f) => f.path === path);
    if (file) {
      // Find the actual FileNode from the file tree
      const findFileNode = (nodes: FileNode[]): FileNode | null => {
        for (const node of nodes) {
          if (node.path === path) return node;
          if (node.children) {
            const found = findFileNode(node.children);
            if (found) return found;
          }
        }
        return null;
      };
      const fileNode = findFileNode(files);
      if (fileNode) {
        setOpenFile(fileNode);
      }
    }
  };

  const handleCloseTab = (path: string) => {
    setOpenFiles((prev) => prev.filter((f) => f.path !== path));
    // If the closed file was active, switch to another file
    if (openFile?.path === path) {
      const remainingFiles = openFiles.filter((f) => f.path !== path);
      if (remainingFiles.length > 0) {
        handleSelectTab(remainingFiles[remainingFiles.length - 1].path);
      } else {
        setOpenFile(null);
      }
    }
  };

  // ============================================================================
  // Update terminal visibility based on prop
  // ============================================================================
  useEffect(() => {
    setTerminalOpen(terminalVisible);
  }, [terminalVisible]);

  // ============================================================================
  // Intercept console methods (KEEP THIS - logs browser console to terminal)
  // ============================================================================
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    const addLog = (
      message: unknown,
      type: "log" | "error" | "warn" | "info"
    ) => {
      const now = new Date();
      const timestamp = now.toLocaleTimeString();
      const formattedMessage =
        typeof message === "string"
          ? message
          : JSON.stringify(message, null, 2);

      setLogs((prev) => [
        ...prev,
        {
          id: messageCountRef.current++,
          message: formattedMessage,
          timestamp,
          type,
        },
      ]);
    };

    console.log = (...args) => {
      addLog(args.length === 1 ? args[0] : args.join(" "), "log");
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      addLog(args.length === 1 ? args[0] : args.join(" "), "error");
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      addLog(args.length === 1 ? args[0] : args.join(" "), "warn");
      originalWarn.apply(console, args);
    };

    console.info = (...args) => {
      addLog(args.length === 1 ? args[0] : args.join(" "), "info");
      originalInfo.apply(console, args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
    };
  }, []);

  // ============================================================================
  // DEPLOY CONTRACT (ARCHIVED)
  // ============================================================================
  // Moved to: hooks/archived/useContractDeployment.ts
  // Status: Disabled - Awaiting backend API support
  // To enable: Import useContractDeployment hook and call it with userId, publicKey, etc.
  // Reference: See hooks/archived/README.md for implementation details

  function handleEditorChange(value: string | undefined) {
    if (openFile && value !== undefined) {
      const newContents = new Map(fileContents);
      newContents.set(openFile.path, value);
      setFileContents(newContents);
      // Mark file as dirty in the tab bar
      setOpenFiles((prev) =>
        prev.map((f) =>
          f.path === openFile.path ? { ...f, isDirty: true } : f
        )
      );
    }
  }

  // ============================================================================
  // CREATE ACCOUNT (ARCHIVED)
  // ============================================================================
  // Moved to: hooks/archived/useAccountCreation.ts
  // Status: Disabled - Awaiting backend API support
  // To enable: Import useAccountCreation hook and call it with userId, logToTerminal, etc.
  // Reference: See hooks/archived/README.md for implementation details

  return (
    <div className="flex flex-col h-full bg-[#171717] overflow-hidden">
      <TopBar
        userId={userId}
        connected={connected}
        publicKey={publicKey}
        isSaving={isSaving}
        containerLoading={containerLoading}
        openFile={openFile}
        sidebarVisible={sidebarVisible}
        terminalVisible={terminalVisible}
        leftComponentVisible={leftComponentVisible}
        onConnectWallet={connectWallet}
        onDisconnectWallet={disconnectWallet}
        onSave={handleSave}
        onCreateContainer={handleCreateContainer}
        onDeleteContainer={handleDeleteContainer}
        onToggleSidebar={() => onToggleSidebar?.()}
        onToggleTerminal={() => onToggleTerminal?.()}
        onToggleLeftComponent={() => onToggleLeftComponent?.()}
        onLog={logToTerminal}
      />

      <ErrorBanner error={error} />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarVisible && (
          <Sidebar
            sidebarWidth={sidebarWidth}
            onMouseDown={handleMouseDown}
            files={files}
            isLoading={isLoading}
            expandedFolders={expandedFolders}
            openFile={openFile}
            creatingItem={creatingItem}
            newItemName={newItemName}
            onToggleFolder={toggleFolder}
            onFileClick={handleFileClickWrapper}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onDeleteFile={handleDeleteFile}
            onDeleteFolder={handleDeleteFolder}
            onSetNewItemName={setNewItemName}
            onConfirmCreateItem={confirmCreateItem}
            onCancelCreateItem={cancelCreateItem}
            onCreateFileRoot={() => handleCreateFile("")}
            onCreateFolderRoot={() => handleCreateFolder("")}
          />
        )}

        {/* Editor */}
        <EditorPanel
          openFile={openFile}
          openFiles={openFiles}
          fileContents={fileContents}
          fontSize={fontSize}
          terminalOpen={terminalOpen}
          terminalHeight={terminalHeight}
          logs={logs}
          onFileSelect={handleSelectTab}
          onFileClose={handleCloseTab}
          onEditorChange={handleEditorChange}
          onEditorMount={handleEditorDidMount}
          onSave={handleSave}
          onTerminalClose={() => setTerminalOpen(false)}
          onTerminalHeightChange={setTerminalHeight}
        />
      </div>
    </div>
  );
}
