/**
 * Right Component Handlers
 * Manages all event handlers and refs for the Right component
 */

import { useEffect, useRef, useMemo } from "react";

type FileNode = {
  name: string;
  type: "file" | "folder";
  path: string;
  content?: string;
  children?: FileNode[];
};

interface UseRightHandlersProps {
  handleFileClick: (file: FileNode) => Promise<void>;
  addOpenFile: (file: FileNode) => void;
  handleCreateFile: (parentPath: string) => void;
  handleCreateFolder: (parentPath: string) => void;
}

interface UseRightHandlersReturn {
  handleFileClickWrapper: (file: FileNode) => Promise<void>;
  handleCreateFileRoot: () => void;
  handleCreateFolderRoot: () => void;
}

export function useRightHandlers({
  handleFileClick,
  addOpenFile,
  handleCreateFile,
  handleCreateFolder,
}: UseRightHandlersProps): UseRightHandlersReturn {
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

  return {
    handleFileClickWrapper,
    handleCreateFileRoot,
    handleCreateFolderRoot,
  };
}
