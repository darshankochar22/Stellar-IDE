"use client";

import { memo, useState, useCallback } from "react";
import {
  FilePlus,
  FolderPlus,
  X,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import OutlineView from "./Editor/OutlineView";

type FileNode = {
  name: string;
  type: "file" | "folder";
  path: string;
  content?: string;
  children?: FileNode[];
};

type CreationState = {
  parentPath: string;
  type: "file" | "folder";
} | null;

interface SidebarProps {
  sidebarWidth: number;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  files: FileNode[];
  isLoading: boolean;
  expandedFolders: Set<string>;
  openFile: FileNode | null;
  creatingItem: CreationState;
  newItemName: string;
  onToggleFolder: (path: string) => void;
  onFileClick: (file: FileNode) => void;
  onCreateFile: (parentPath: string) => void;
  onCreateFolder: (parentPath: string) => void;
  onDeleteFile: (filePath: string) => void;
  onDeleteFolder: (folderPath: string) => void;
  onSetNewItemName: (name: string) => void;
  onConfirmCreateItem: () => void;
  onCancelCreateItem: () => void;
  onCreateFileRoot: () => void;
  onCreateFolderRoot: () => void;
  projectName?: string;
}

function SidebarContent({
  sidebarWidth,
  onMouseDown,
  files,
  isLoading,
  expandedFolders,
  openFile,
  creatingItem,
  newItemName,
  onToggleFolder,
  onFileClick,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onDeleteFolder,
  onSetNewItemName,
  onConfirmCreateItem,
  onCancelCreateItem,
  onCreateFileRoot,
  onCreateFolderRoot,
  projectName,
}: SidebarProps) {
  // Local outline visibility state - only for Rust files
  const isRustFile = openFile?.name.endsWith(".rs") || false;
  const [outlineExpanded, setOutlineExpanded] = useState(true);

  // Memoize requestDocumentSymbols to prevent unnecessary re-renders
  const requestDocumentSymbols = useCallback(async (uri: string) => {
    // Use global LSP functions set by MonacoEditor
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
    // Use global editor instance set by EditorPanel
    const editor = window.currentEditorInstance;
    if (editor) {
      editor.setPosition({ lineNumber: line, column });
      editor.revealLineInCenter(line);
      editor.focus();
    } else {
      console.warn("[Sidebar] Editor instance not available");
    }
  }, []);
  function renderFileTree(nodes: FileNode[], depth = 0, parentPath = "") {
    return (
      <>
        {nodes.map((node) => (
          <div key={node.path}>
            <div
              className={`flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-[#252525] group ${
                openFile?.path === node.path ? "bg-[#252525]" : ""
              }`}
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
              onClick={() => {
                if (node.type === "folder") {
                  onToggleFolder(node.path);
                } else {
                  onFileClick(node);
                }
              }}
            >
              {node.type === "folder" && (
                <span className="text-gray-400 text-xs">
                  {expandedFolders.has(node.path) ? "▼" : "▶"}
                </span>
              )}
              <span className="text-gray-300 text-sm flex-1">{node.name}</span>

              <div className="hidden group-hover:flex items-center gap-1">
                {node.type === "folder" && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateFile(node.path);
                      }}
                      className="p-1 hover:bg-[#333] rounded transition-colors"
                      title="New File"
                    >
                      <FilePlus className="w-3 h-3 text-gray-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateFolder(node.path);
                      }}
                      className="p-1 hover:bg-[#333] rounded transition-colors"
                      title="New Folder"
                    >
                      <FolderPlus className="w-3 h-3 text-gray-400" />
                    </button>
                  </>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (node.type === "file") {
                      onDeleteFile(node.path);
                    } else {
                      onDeleteFolder(node.path);
                    }
                  }}
                  className="p-1 hover:bg-[#17171717] rounded transition-colors"
                  title={`Delete ${node.type}`}
                >
                  <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-400" />
                </button>
              </div>
            </div>

            {node.type === "folder" &&
              creatingItem &&
              creatingItem.parentPath === node.path &&
              expandedFolders.has(node.path) && (
                <div
                  className="flex items-center gap-2 px-2 py-1 bg-[#1e1e1e]"
                  style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
                >
                  <span className="text-gray-400 text-xs">
                    {creatingItem.type === "file" ? "📄" : ""}
                  </span>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => onSetNewItemName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        onConfirmCreateItem();
                      } else if (e.key === "Escape") {
                        onCancelCreateItem();
                      }
                    }}
                    onBlur={onConfirmCreateItem}
                    autoFocus
                    placeholder={
                      creatingItem.type === "file"
                        ? "filename.rs"
                        : "foldername"
                    }
                    className="flex-1 bg-[#252525] text-white text-sm px-2 py-0.5 rounded outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={onCancelCreateItem}
                    className="p-1 hover:bg-[#333] rounded transition-colors"
                  >
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
              )}

            {node.type === "folder" &&
              expandedFolders.has(node.path) &&
              node.children && (
                <div>{renderFileTree(node.children, depth + 1, node.path)}</div>
              )}
          </div>
        ))}

        {depth === 0 &&
          creatingItem &&
          creatingItem.parentPath === parentPath && (
            <div
              className="flex items-center gap-2 px-2 py-1 bg-[#1e1e1e]"
              style={{ paddingLeft: "8px" }}
            >
              <span className="text-gray-400 text-xs">
                {creatingItem.type === "file" ? "📄" : ""}
              </span>
              <input
                type="text"
                value={newItemName}
                onChange={(e) => onSetNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onConfirmCreateItem();
                  } else if (e.key === "Escape") {
                    onCancelCreateItem();
                  }
                }}
                onBlur={onConfirmCreateItem}
                autoFocus
                placeholder={
                  creatingItem.type === "file" ? "filename.rs" : "foldername"
                }
                className="flex-1 bg-[#252525] text-white text-sm px-2 py-0.5 rounded outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={onCancelCreateItem}
                className="p-1 hover:bg-[#333] rounded transition-colors"
              >
                <X className="w-3 h-3 text-gray-400" />
              </button>
            </div>
          )}
      </>
    );
  }

  return (
    <>
      <div
        style={{ width: `${sidebarWidth}px`, minWidth: `${sidebarWidth}px` }}
        className="bg-[#171717] border-r border-[#252525] flex flex-col sidebar-scrollbar h-full overflow-hidden"
      >
        {/* Sidebar Header with Create Buttons */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#252525] shrink-0">
          <span className="text-xs text-gray-400 font-semibold uppercase">
            Explorer
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={onCreateFileRoot}
              className="p-1 hover:bg-[#252525] rounded transition-colors"
              title="New File"
              disabled={files.length === 0}
            >
              <FilePlus className="w-4 h-4 text-gray-400" />
            </button>
            <button
              onClick={onCreateFolderRoot}
              className="p-1 hover:bg-[#252525] rounded transition-colors"
              title="New Folder"
              disabled={files.length === 0}
            >
              <FolderPlus className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* File Tree - Takes remaining space */}
        <div
          className={`py-2 overflow-y-auto ${
            isRustFile && outlineExpanded ? "flex-1 min-h-0" : "flex-1"
          }`}
        >
          {isLoading ? (
            <div className="px-4 py-2 text-gray-500 text-sm">
              Loading files...
            </div>
          ) : files.length === 0 ? (
            <div className="px-4 py-2 text-gray-500 text-sm">
              No files. Create a container first.
            </div>
          ) : (
            renderFileTree(files)
          )}
        </div>

        {/* Outline View at Bottom - Header always visible for Rust files, content toggleable */}
        {isRustFile && (
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
            {outlineExpanded && (
              <div
                className="flex flex-col shrink-0 overflow-hidden"
                style={{
                  height: "250px",
                  minHeight: "200px",
                  maxHeight: "40%",
                }}
              >
                {isRustFile && openFile ? (
                  <OutlineView
                    fileUri={`file:///home/developer/workspace/${
                      projectName || "soroban-hello-world"
                    }/${openFile.path}`}
                    openFile={openFile}
                    requestDocumentSymbols={requestDocumentSymbols}
                    onSymbolClick={handleSymbolClick}
                    hideHeader={true}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                    No Rust file selected
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resize Handle - Full height, easy to grab */}
      <div
        onMouseDown={onMouseDown}
        className="w-1 h-full bg-[#252525] cursor-col-resize transition-colors shrink-0"
        title="Drag to resize sidebar"
        style={{ userSelect: "none" }}
      />
    </>
  );
}

/**
 * Memoized Sidebar component to prevent unnecessary re-renders
 * Only re-renders when its props actually change, not when parent re-renders
 */
export default memo(SidebarContent);
