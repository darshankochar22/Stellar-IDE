/**
 * Editor Type Definitions
 */

import type { editor } from "monaco-editor";
import type { Monaco } from "@monaco-editor/react";
import type { LogMessage } from "../Terminal";
import type { OpenFile } from "../TabBar";

export type MonacoType = Monaco;
export type MonacoEditor = editor.IStandaloneCodeEditor;
export type MonacoTextModel = editor.ITextModel;

export interface FileNode {
  name: string;
  type: "file" | "folder";
  path: string;
  content?: string;
  children?: FileNode[];
}

export interface EditorPanelProps {
  openFile: FileNode | null;
  containerId?: string;
  projectName?: string;
  openFiles: OpenFile[];
  fileContents: Map<string, string>;
  fontSize: number;
  terminalOpen: boolean;
  terminalHeight: number;
  logs: LogMessage[];
  onFileSelect: (path: string) => void;
  onFileClose: (path: string) => void;
  onEditorChange: (value: string | undefined) => void;
  onEditorMount: (editorInstance: MonacoEditor, monaco: MonacoType) => void;
  onSave: () => void;
  onTerminalClose: () => void;
  onTerminalHeightChange: (height: number) => void;
}

export interface LSPFunctionsRef {
  requestInlayHints: (
    uri: string,
    range: { startLine: number; endLine: number }
  ) => Promise<InlayHint[]>;
  requestCompletion?: (
    uri: string,
    position: { line: number; character: number }
  ) => Promise<unknown[]>;
  requestHover?: (
    uri: string,
    position: { line: number; character: number }
  ) => Promise<unknown | null>;
  requestDefinition?: (
    uri: string,
    position: { line: number; character: number }
  ) => Promise<unknown[]>;
  requestReferences?: (
    uri: string,
    position: { line: number; character: number },
    context?: { includeDeclaration?: boolean }
  ) => Promise<unknown[]>;
  requestPrepareRename?: (
    uri: string,
    position: { line: number; character: number }
  ) => Promise<{ range: { start: { line: number; character: number }; end: { line: number; character: number } }; placeholder?: string } | null>;
  requestRename?: (
    uri: string,
    position: { line: number; character: number },
    newName: string
  ) => Promise<unknown>;
  requestFormatting?: (uri: string) => Promise<unknown[]>;
  requestCodeAction?: (
    uri: string,
    range: { start: { line: number; character: number }; end: { line: number; character: number } },
    context: { diagnostics: Array<{ range: { start: { line: number; character: number }; end: { line: number; character: number } }; severity: number; code?: string | number }> }
  ) => Promise<unknown[]>;
}

export interface InlayHint {
  position: { line: number; character: number };
  label: string | { value: string }[];
  kind?: number;
  paddingLeft?: boolean;
  paddingRight?: boolean;
}

export interface InlayHintsCache {
  uri: string;
  hints: InlayHint[];
  timestamp: number;
}

// Window extensions for global state
declare global {
  interface Window {
    monacoInstance?: MonacoType;
    lspFunctions?: LSPFunctionsRef;
  }
}
