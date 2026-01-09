/**
 * Editor Constants and Configuration
 */

import type { editor } from "monaco-editor";

/**
 * Language mapping from file extension to Monaco language ID
 */
export const LANGUAGE_MAP: Record<string, string> = {
  rs: "rust",
  toml: "toml",
  json: "json",
  md: "markdown",
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  html: "html",
  css: "css",
  scss: "scss",
  yaml: "yaml",
  yml: "yaml",
  sh: "shell",
  py: "python",
};

/**
 * Get language ID from filename
 */
export function getLanguageFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  return LANGUAGE_MAP[ext || ""] || "plaintext";
}

/**
 * Default editor options
 */
export function getEditorOptions(fontSize: number): editor.IStandaloneEditorConstructionOptions {
  return {
    fontSize,
    fontFamily:
      "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'Monaco', monospace",
    minimap: { enabled: true },
    lineNumbers: "on",
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    wordWrap: "on",
    formatOnPaste: true,
    formatOnType: true,
    insertSpaces: true,
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: "on",
    quickSuggestions: true,
    parameterHints: { enabled: true },
    folding: true,
    renderWhitespace: "selection",
    cursorBlinking: "smooth",
    cursorSmoothCaretAnimation: "on",
    smoothScrolling: true,
    padding: { top: 16 },
    scrollbar: {
      vertical: "visible",
      horizontal: "visible",
      useShadows: true,
      verticalSliderSize: 12,
      horizontalSliderSize: 12,
    },
    renderLineHighlight: "gutter",
    overviewRulerBorder: false,
    hideCursorInOverviewRuler: false,
    inlayHints: {
      enabled: "on",
      fontSize: 18,
      fontFamily: "'JetBrains Mono', monospace",
      padding: true,
    },
  };
}

/**
 * Inlay hints cache TTL in milliseconds
 */
export const HINTS_CACHE_TTL = 2000;

/**
 * Debounce delay for LSP document changes
 */
export const LSP_CHANGE_DEBOUNCE_MS = 300;
