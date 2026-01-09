/**
 * Editor Module Exports
 */

// Main component
export { default as EditorPanel } from "./EditorPanel";
export { default } from "./EditorPanel";

// Sub-components
export { default as MonacoEditor } from "./MonacoEditor";
export { default as EmptyState } from "./EmptyState";

// Hooks
export { useEditorZoom } from "./useEditorZoom";
export { useLSPSync } from "./useLSPSync";

// Utilities & Providers
export { registerInlayHintsProvider, invalidateHintsCache } from "./inlayHints";
export { registerCompletionProvider } from "./completionProvider";
export { registerHoverProvider } from "./hoverProvider";
export { registerDefinitionProvider } from "./definitionProvider";
export { registerReferenceProvider } from "./referenceProvider";
export { registerRenameProvider } from "./renameProvider";
export { registerFormatProvider } from "./formatProvider";
export { registerCodeActionProvider } from "./codeActionProvider";
export { getLanguageFromFilename, getEditorOptions, LANGUAGE_MAP } from "./constants";

// Types
export type {
  FileNode,
  EditorPanelProps,
  MonacoType,
  MonacoEditor as MonacoEditorType,
  InlayHint,
} from "./types";
