/**
 * Sidebar Types
 */

export type FileNode = {
  name: string;
  type: "file" | "folder";
  path: string;
  content?: string;
  children?: FileNode[];
};

export type CreationState = {
  parentPath: string;
  type: "file" | "folder";
} | null;
