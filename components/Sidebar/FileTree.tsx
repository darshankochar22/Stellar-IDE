/**
 * File Tree Component
 * Renders the file/folder tree structure
 */

import type { FileNode, CreationState } from "./types";
import FileTreeItem from "./FileTreeItem";
import CreationInput from "./CreationInput";

interface FileTreeProps {
  files: FileNode[];
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

export default function FileTree({
  files,
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
}: FileTreeProps) {
  return (
    <>
      {files.map((node) => (
        <FileTreeItem
          key={node.path}
          node={node}
          depth={0}
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

      {/* Root-level creation input */}
      {creatingItem && creatingItem.parentPath === "" && (
        <CreationInput
          creatingItem={creatingItem}
          newItemName={newItemName}
          depth={-1}
          onSetNewItemName={onSetNewItemName}
          onConfirmCreateItem={onConfirmCreateItem}
          onCancelCreateItem={onCancelCreateItem}
        />
      )}
    </>
  );
}
