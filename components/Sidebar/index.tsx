/**
 * Sidebar Component
 * Main sidebar with file tree and outline
 */

"use client";

import { memo } from "react";
import SidebarHeader from "./SidebarHeader";
import FileTree from "./FileTree";
import OutlineSection from "./OutlineSection";
import type { FileNode, CreationState } from "./types";

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
  const isRustFile = openFile?.name.endsWith(".rs") || false;
  const hasOutline = isRustFile;

  return (
    <>
      <div
        style={{ width: `${sidebarWidth}px`, minWidth: `${sidebarWidth}px` }}
        className="bg-[#171717] border-r border-[#252525] flex flex-col sidebar-scrollbar h-full overflow-hidden"
      >
        {/* Sidebar Header */}
        <SidebarHeader
          onCreateFileRoot={onCreateFileRoot}
          onCreateFolderRoot={onCreateFolderRoot}
          hasFiles={files.length > 0}
        />

        {/* File Tree */}
        <div
          className={`py-2 overflow-y-auto ${
            hasOutline ? "flex-1 min-h-0" : "flex-1"
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
            <FileTree
              files={files}
              openFile={openFile}
              expandedFolders={expandedFolders}
              creatingItem={creatingItem}
              newItemName={newItemName}
              onToggleFolder={onToggleFolder}
              onFileClick={onFileClick}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
              onDeleteFile={onDeleteFile}
              onDeleteFolder={onDeleteFolder}
              onSetNewItemName={onSetNewItemName}
              onConfirmCreateItem={onConfirmCreateItem}
              onCancelCreateItem={onCancelCreateItem}
            />
          )}
        </div>

        {/* Outline Section */}
        <OutlineSection openFile={openFile} projectName={projectName} />
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={onMouseDown}
        className="w-1 h-full bg-[#252525] cursor-col-resize transition-colors shrink-0"
        title="Drag to resize sidebar"
        style={{ userSelect: "none" }}
      />
    </>
  );
}

export default memo(SidebarContent);
export type { FileNode, CreationState } from "./types";
