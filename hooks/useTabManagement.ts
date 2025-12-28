"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { OpenFile } from "@/components/TabBar";

type FileNode = {
  name: string;
  type: "file" | "folder";
  path: string;
  content?: string;
  children?: FileNode[];
};

interface UseTabManagementProps {
  files: FileNode[];
  onFileSelect: (file: FileNode) => void;
  onOpenFilesChange: (files: OpenFile[]) => void;
}

export function useTabManagement({
  files,
  onFileSelect,
  onOpenFilesChange,
}: UseTabManagementProps) {
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [currentOpenFile, setCurrentOpenFile] = useState<FileNode | null>(null);

  // Use ref to store callback without creating dependency
  const onOpenFilesChangeRef = useRef(onOpenFilesChange);

  // Update ref when callback changes
  useEffect(() => {
    onOpenFilesChangeRef.current = onOpenFilesChange;
  }, [onOpenFilesChange]);

  // Find file node in tree
  const findFileNode = useCallback(
    (path: string): FileNode | null => {
      const search = (nodes: FileNode[]): FileNode | null => {
        for (const node of nodes) {
          if (node.path === path) return node;
          if (node.children) {
            const found = search(node.children);
            if (found) return found;
          }
        }
        return null;
      };
      return search(files);
    },
    [files]
  );

  // Add file to open files - no dependencies on callbacks
  const addOpenFile = useCallback(
    (file: FileNode) => {
      setOpenFiles((prev) => {
        const exists = prev.find((f) => f.path === file.path);
        if (!exists && file.type === "file") {
          const newFiles = [
            ...prev,
            { path: file.path, name: file.name, isDirty: false },
          ];
          onOpenFilesChangeRef.current(newFiles);
          return newFiles;
        }
        onOpenFilesChangeRef.current(prev);
        return prev;
      });
    },
    []
  );

  // Store onFileSelect in ref to avoid dependency
  const onFileSelectRef = useRef(onFileSelect);

  useEffect(() => {
    onFileSelectRef.current = onFileSelect;
  }, [onFileSelect]);

  // Select tab - use ref instead of direct dependency
  const handleSelectTab = useCallback(
    (path: string) => {
      setOpenFiles((prev) => {
        const file = prev.find((f) => f.path === path);
        if (file) {
          const fileNode = findFileNode(path);
          if (fileNode) {
            setCurrentOpenFile(fileNode);
            onFileSelectRef.current(fileNode);
          }
        }
        return prev;
      });
    },
    [findFileNode]
  );

  // Close tab - use ref and state setter to avoid dependencies
  const handleCloseTab = useCallback(
    (path: string) => {
      setOpenFiles((prev) => {
        const filtered = prev.filter((f) => f.path !== path);
        onOpenFilesChangeRef.current(filtered);

        // If the closed file was active, switch to another file
        if (currentOpenFile?.path === path) {
          if (filtered.length > 0) {
            const nextFile = findFileNode(
              filtered[filtered.length - 1].path
            );
            if (nextFile) {
              setCurrentOpenFile(nextFile);
              onFileSelectRef.current(nextFile);
            }
          } else {
            setCurrentOpenFile(null);
          }
        }

        return filtered;
      });
    },
    [findFileNode, currentOpenFile?.path]
  );

  return {
    openFiles,
    setOpenFiles,
    currentOpenFile,
    setCurrentOpenFile,
    addOpenFile,
    handleSelectTab,
    handleCloseTab,
    findFileNode,
  };
}

