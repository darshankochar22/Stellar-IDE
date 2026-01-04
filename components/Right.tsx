"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { type LogMessage } from "./Terminal";
import Sidebar from "./Sidebar";
import EditorPanel from "./EditorPanel";
import TopBar from "./TopBar";
import ErrorBanner from "./ErrorBanner";
import { useWallet as useWalletContext } from "../context/WalletContext";
import { useFileManager } from "../hooks/useFileManager";
import { useMonacoSetup } from "../hooks/useMonacoSetup";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useContainerManagement } from "../hooks/useContainerManagement";
import { useTerminalLogging } from "../hooks/useTerminalLogging";
import { useSidebarResize } from "../hooks/useSidebarResize";
import { useTabManagement } from "../hooks/useTabManagement";
import { useEditorState } from "../hooks/useEditorState";

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
  projectName?: string;
}

export default function Right({
  sidebarVisible = true,
  terminalVisible = false,
  onToggleSidebar,
  onToggleTerminal,
  onToggleLeftComponent,
  leftComponentVisible = false,
  projectName,
}: RightProps) {
  const [fontSize, setFontSize] = useState(14);
  const [containerLoading, setContainerLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(terminalVisible);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [terminalHeight, setTerminalHeight] = useState(250);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { logToTerminal } = useTerminalLogging({
    onLogsUpdate: (newLogs) => {
      setLogs((prev) => [...prev, ...newLogs]);
    },
  });

  const { sidebarWidth, handleMouseDown } = useSidebarResize({
    initialWidth: 256,
    minWidth: 200,
    maxWidth: 600,
  });

  // Get wallet from global context
  const wallet = useWalletContext();

  // File Manager hook - only initialize if wallet is connected
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
  } = useFileManager(
    wallet.walletAddress || "not-connected",
    logToTerminal,
    setError,
    setTerminalOpen,
    projectName
  );

  // Files auto-load via useFileManager when wallet is connected

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

  // Tab Management hook
  const { openFiles, addOpenFile, handleSelectTab, handleCloseTab } =
    useTabManagement({
      files,
      onFileSelect: setOpenFile,
      onOpenFilesChange: () => {}, // Will be updated inline
    });

  // Editor State hook
  const { handleEditorChange } = useEditorState({
    openFile,
    fileContents,
    onFileContentsChange: setFileContents,
    onOpenFilesChange: () => {
      // This will be handled by tab management
    },
  });

  // Container Management hook
  const { handleCreateContainer, handleDeleteContainer } =
    useContainerManagement({
      userId: wallet.walletAddress || "not-connected",
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

  // Store callbacks in refs to avoid dependency chains
  const handleFileClickRef = useRef(handleFileClick);
  const addOpenFileRef = useRef(addOpenFile);

  useEffect(() => {
    handleFileClickRef.current = handleFileClick;
    addOpenFileRef.current = addOpenFile;
  }, [handleFileClick, addOpenFile]);

  // FILE CLICK WRAPPER - Sync with openFiles TabBar state
  // Memoized without dependencies to prevent callback redefinition
  const handleFileClickWrapper = useMemo(
    () => async (file: FileNode) => {
      await handleFileClickRef.current(file);
      addOpenFileRef.current(file);
    },
    []
  );

  // Memoize root file/folder creation handlers to prevent Sidebar re-renders
  // Use refs to avoid dependencies
  const handleCreateFileRef = useRef(handleCreateFile);
  const handleCreateFolderRef = useRef(handleCreateFolder);

  useEffect(() => {
    handleCreateFileRef.current = handleCreateFile;
    handleCreateFolderRef.current = handleCreateFolder;
  }, [handleCreateFile, handleCreateFolder]);

  const handleCreateFileRoot = useMemo(
    () => () => handleCreateFileRef.current(""),
    []
  );

  const handleCreateFolderRoot = useMemo(
    () => () => handleCreateFolderRef.current(""),
    []
  );

  useEffect(() => {
    setTerminalOpen(terminalVisible);
  }, [terminalVisible]);

  // Deploy Contract: hooks/archived/useContractDeployment.ts
  // Create Account: hooks/archived/useAccountCreation.ts

  return (
    <div className="flex flex-col h-full bg-[#171717] overflow-hidden">
      {!wallet.isConnected && (
        <div className="bg-red-900/20 border-b border-red-500/30 p-3 text-red-300 text-sm">
          Please connect your wallet to access the editor
        </div>
      )}
      <TopBar
        userId={wallet.walletAddress || ""}
        connected={wallet.isConnected}
        publicKey={wallet.walletAddress}
        isSaving={isSaving}
        containerLoading={containerLoading}
        openFile={openFile}
        sidebarVisible={sidebarVisible}
        terminalVisible={terminalVisible}
        leftComponentVisible={leftComponentVisible}
        projectName={projectName}
        onConnectWallet={async () => {}}
        onDisconnectWallet={() => wallet.disconnect()}
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
      <div className="flex flex-1 overflow-hidden relative">
        {/* Loading overlay when files are loading */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-white/30 border-t-white rounded-full mx-auto mb-3"></div>
              <p className="text-white text-sm">Loading project files...</p>
            </div>
          </div>
        )}

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
            onCreateFileRoot={handleCreateFileRoot}
            onCreateFolderRoot={handleCreateFolderRoot}
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
          projectName={projectName}
        />
      </div>
    </div>
  );
}
