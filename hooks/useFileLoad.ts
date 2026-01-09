/**
 * File Load Hook
 * Handles loading file tree from container
 */

import { useCallback } from "react";

type FileNode = {
  name: string;
  type: "file" | "folder";
  path: string;
  content?: string;
  children?: FileNode[];
};

type LogFunction = (
  message: string,
  type: "log" | "error" | "warn" | "info"
) => void;

interface UseFileLoadProps {
  userId: string;
  onError: (error: string | null) => void;
  buildFileTree: (flatFiles: string[]) => FileNode[];
  projectName?: string;
}

interface UseFileLoadReturn {
  loadFiles: (
    preserveExpanded: boolean,
    onSetFiles: (files: FileNode[]) => void,
    onSetExpandedFolders: (cb: (prev: Set<string>) => Set<string>) => void,
    projectNameParam?: string
  ) => Promise<void>;
}

/**
 * Hook to load files from container and build tree
 */
export function useFileLoad({
  userId,
  onError,
  buildFileTree,
  projectName,
}: UseFileLoadProps): UseFileLoadReturn {
  /**
   * Load files from container and build tree
   * @param preserveExpanded Whether to preserve current expanded folders
   * @param onSetFiles Callback to update files state
   * @param onSetExpandedFolders Callback to update expanded folders state
   */
  const loadFiles = useCallback(
    async (
      preserveExpanded: boolean,
      onSetFiles: (files: FileNode[]) => void,
      onSetExpandedFolders: (cb: (prev: Set<string>) => Set<string>) => void,
      projectNameParam?: string
    ) => {
      onError(null);
      try {
        const response = await fetch("/api/docker", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            action: "getFiles", 
            walletAddress: userId, // userId parameter contains wallet address
            projectName: projectNameParam || projectName
          }),
        });
        const data = await response.json();

        if (data.success && data.files) {
          const tree = buildFileTree(data.files);
          onSetFiles(tree);

          if (!preserveExpanded) {
            const commonFolders = ["src", "contracts", "soroban-hello-world"];
            onSetExpandedFolders(() => new Set(commonFolders));
          }
        } else {
          onError(data.error || "Failed to load files");
          onSetFiles([]);
        }
      } catch (error) {
        console.error("Failed to load files:", error);
        onError("Failed to connect to server");
        onSetFiles([]);
      }
    },
    [userId, onError, buildFileTree, projectName]
  );

  return { loadFiles };
}
