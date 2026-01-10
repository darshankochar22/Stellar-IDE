/**
 * File Tree Item Component
 * Individual file/folder item in the tree
 */

import { FilePlus, FolderPlus, Trash2 } from "lucide-react";
import type { FileNode, CreationState } from "./types";
import CreationInput from "./CreationInput";

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
  openFile: FileNode | null;
  expandedFolders: Set<string>;
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
}

export default function FileTreeItem({
  node,
  depth,
  openFile,
  expandedFolders,
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
}: FileTreeItemProps) {
  const isExpanded = expandedFolders.has(node.path);
  const isActive = openFile?.path === node.path;

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-[#252525] group ${
          isActive ? "bg-[#252525]" : ""
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
            {isExpanded ? "▼" : "▶"}
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

      {/* Creation Input - Show when creating item in this folder */}
      {node.type === "folder" &&
        creatingItem &&
        creatingItem.parentPath === node.path &&
        isExpanded && (
          <CreationInput
            creatingItem={creatingItem}
            newItemName={newItemName}
            depth={depth}
            onSetNewItemName={onSetNewItemName}
            onConfirmCreateItem={onConfirmCreateItem}
            onCancelCreateItem={onCancelCreateItem}
          />
        )}

      {/* Render children if folder is expanded */}
      {node.type === "folder" && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
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
          ))}
        </div>
      )}
    </div>
  );
}
