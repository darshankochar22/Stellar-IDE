/**
 * Monaco Editor Wrapper Component
 */

"use client";

import { useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";
import type {
  MonacoType,
  MonacoEditor as MonacoEditorType,
  FileNode,
  LSPFunctionsRef,
} from "./types";
import { getLanguageFromFilename, getEditorOptions } from "./constants";
import { registerInlayHintsProvider } from "./inlayHints";
import { registerCompletionProvider } from "./completionProvider";
import { registerHoverProvider } from "./hoverProvider";
import { registerDefinitionProvider } from "./definitionProvider";
import { registerReferenceProvider } from "./referenceProvider";
import { registerRenameProvider } from "./renameProvider";
import { registerFormatProvider } from "./formatProvider";
import { registerCodeActionProvider } from "./codeActionProvider";
import { useEditorZoom } from "./useEditorZoom";

interface MonacoEditorProps {
  file: FileNode;
  fileUri: string;
  content: string;
  fontSize: number;
  requestInlayHints: LSPFunctionsRef["requestInlayHints"];
  requestCompletion?: LSPFunctionsRef["requestCompletion"];
  requestHover?: LSPFunctionsRef["requestHover"];
  requestDefinition?: LSPFunctionsRef["requestDefinition"];
  requestReferences?: LSPFunctionsRef["requestReferences"];
  requestPrepareRename?: LSPFunctionsRef["requestPrepareRename"];
  requestRename?: LSPFunctionsRef["requestRename"];
  requestFormatting?: LSPFunctionsRef["requestFormatting"];
  requestCodeAction?: LSPFunctionsRef["requestCodeAction"];
  onChange: (value: string | undefined) => void;
  onMount: (editor: MonacoEditorType, monaco: MonacoType) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export default function MonacoEditorWrapper({
  file,
  fileUri,
  content,
  fontSize,
  requestInlayHints,
  requestCompletion,
  requestHover,
  requestDefinition,
  requestReferences,
  requestPrepareRename,
  requestRename,
  requestFormatting,
  requestCodeAction,
  onChange,
  onMount,
  containerRef,
}: MonacoEditorProps) {
  const editorRef = useRef<MonacoEditorType | null>(null);
  const { handleMouseWheel, cleanup } = useEditorZoom(editorRef);

  const handleEditorDidMount = useCallback(
    (editorInstance: MonacoEditorType, monaco: MonacoType) => {
      editorRef.current = editorInstance;
      editorInstance.focus();

      // Store Monaco instance globally for LSP client
      window.monacoInstance = monaco;
      console.log("[MonacoEditor] Monaco instance stored globally");

      // Store LSP functions for providers
      window.lspFunctions = {
        requestInlayHints,
        requestCompletion,
        requestHover,
        requestDefinition,
        requestReferences,
        requestPrepareRename,
        requestRename,
        requestFormatting,
        requestCodeAction,
      };

      // Register language providers (only once each)
      registerInlayHintsProvider(monaco);
      registerCompletionProvider(monaco);
      registerHoverProvider(monaco);
      registerDefinitionProvider(monaco);
      registerReferenceProvider(monaco);
      registerRenameProvider(monaco);
      registerFormatProvider(monaco);
      registerCodeActionProvider(monaco);

      // Add wheel zoom handler
      if (containerRef.current) {
        containerRef.current.addEventListener("wheel", handleMouseWheel, {
          passive: false,
        });
      }

      // Call parent mount handler
      onMount(editorInstance, monaco);

      // Cleanup function
      return () => {
        if (containerRef.current) {
          containerRef.current.removeEventListener("wheel", handleMouseWheel);
        }
        cleanup();
      };
    },
    [
      requestInlayHints,
      requestCompletion,
      requestHover,
      requestDefinition,
      requestReferences,
      requestPrepareRename,
      requestRename,
      requestFormatting,
      requestCodeAction,
      onMount,
      containerRef,
      handleMouseWheel,
      cleanup,
    ]
  );

  return (
    <Editor
      height="100%"
      path={fileUri}
      language={getLanguageFromFilename(file.name)}
      theme="vs-dark"
      value={content}
      onChange={onChange}
      onMount={handleEditorDidMount}
      options={getEditorOptions(fontSize)}
    />
  );
}
