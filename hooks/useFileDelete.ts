/**
 * File Delete Hook
 * Handles deletion of files and folders
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

interface UseFileDeleteProps {
  userId: string;
  onLog: LogFunction;
  onError: (error: string | null) => void;
  onSetTerminalOpen: (open: boolean) => void;
  projectName?: string;
}

interface UseFileDeleteReturn {
  handleDeleteFile: (
    filePath: string,
    openFile: FileNode | null,
    onLoadFiles: () => Promise<void>,
    onSetOpenFile: (file: FileNode | null) => void,
    onSetFileContents: (cb: (prev: Map<string, string>) => Map<string, string>) => void
  ) => Promise<void>;
  handleDeleteFolder: (
    folderPath: string,
    openFile: FileNode | null,
    onLoadFiles: () => Promise<void>,
    onSetOpenFile: (file: FileNode | null) => void,
    onSetExpandedFolders: (cb: (prev: Set<string>) => Set<string>) => void
  ) => Promise<void>;
}

/**
 * Hook to manage file and folder deletion operations
 */
export function useFileDelete({
  userId,
  onLog,
  onError,
  onSetTerminalOpen,
  projectName,
}: UseFileDeleteProps): UseFileDeleteReturn {
  /**
   * Delete a file from container
   * @param filePath Path of the file to delete
   * @param openFile Currently open file (to check if we need to close it)
   * @param onLoadFiles Callback to reload files after deletion
   * @param onSetOpenFile Callback to update open file
   * @param onSetFileContents Callback to update file contents cache
   */
  const handleDeleteFile = useCallback(
    async (
      filePath: string,
      openFile: FileNode | null,
      onLoadFiles: () => Promise<void>,
      onSetOpenFile: (file: FileNode | null) => void,
      onSetFileContents: (cb: (prev: Map<string, string>) => Map<string, string>) => void
    ) => {
      console.log("[Delete] handleDeleteFile called with:", { filePath, userId, projectName });
      
      if (!confirm(`Delete file: ${filePath}?`)) {
        console.log("[Delete] User cancelled file deletion");
        return;
      }

      onSetTerminalOpen(true);
      onLog(`Deleting ${filePath}...`, "info");

      try {
        console.log("[Delete] Sending delete request for file:", filePath);
        const response = await fetch("/api/docker", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "deleteFile",
            walletAddress: userId,
            filePath,
            projectName,
          }),
        });

        const data = await response.json();
        console.log("[Delete] File delete response:", data);

        if (data.success) {
          onLog(`✓ File deleted: ${filePath}`, "log");
          if (openFile?.path === filePath) {
            onSetOpenFile(null);
          }
          onSetFileContents((prev) => {
            const newContents = new Map(prev);
            newContents.delete(filePath);
            return newContents;
          });
          await onLoadFiles();
        } else {
          onLog(`✗ Failed to delete file: ${data.error}`, "error");
          onError(`Failed to delete file: ${data.error}`);
        }
      } catch (error) {
        console.error("[Delete] File deletion error:", error);
        onLog(`✗ Failed to delete file: ${error}`, "error");
        onError("Failed to delete file");
      }
    },
    [userId, onLog, onError, onSetTerminalOpen, projectName]
  );

  /**
   * Delete a folder and all its contents from container
   * @param folderPath Path of the folder to delete
   * @param openFile Currently open file (to check if it's in the folder)
   * @param onLoadFiles Callback to reload files after deletion
   * @param onSetOpenFile Callback to update open file
   * @param onSetExpandedFolders Callback to update expanded folders
   */
  const handleDeleteFolder = useCallback(
    async (
      folderPath: string,
      openFile: FileNode | null,
      onLoadFiles: () => Promise<void>,
      onSetOpenFile: (file: FileNode | null) => void,
      onSetExpandedFolders: (cb: (prev: Set<string>) => Set<string>) => void
    ) => {
      console.log("[Delete] handleDeleteFolder called with:", { folderPath, userId, projectName });
      
      if (!confirm(`Delete folder and all contents: ${folderPath}?`)) {
        console.log("[Delete] User cancelled folder deletion");
        return;
      }

      onSetTerminalOpen(true);
      onLog(`Deleting folder ${folderPath}...`, "info");

      try {
        console.log("[Delete] Sending delete request for folder:", folderPath);
        const response = await fetch("/api/docker", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "deleteFolder",
            walletAddress: userId,
            filePath: folderPath,
            projectName,
          }),
        });

        const data = await response.json();
        console.log("[Delete] Folder delete response:", data);

        if (data.success) {
          onLog(`✓ Folder deleted: ${folderPath}`, "log");
          if (openFile?.path.startsWith(folderPath)) {
            onSetOpenFile(null);
          }
          onSetExpandedFolders((prev) => {
            const newExpanded = new Set(prev);
            newExpanded.delete(folderPath);
            return newExpanded;
          });
          await onLoadFiles();
        } else {
          onLog(`✗ Failed to delete folder: ${data.error}`, "error");
          onError(`Failed to delete folder: ${data.error}`);
        }
      } catch (error) {
        console.error("[Delete] Folder deletion error:", error);
        onLog(`✗ Failed to delete folder: ${error}`, "error");
        onError("Failed to delete folder");
      }
    },
    [userId, onLog, onError, onSetTerminalOpen, projectName]
  );

  return {
    handleDeleteFile,
    handleDeleteFolder,
  };
}
