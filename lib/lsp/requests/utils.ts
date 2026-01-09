/**
 * LSP Request Utilities
 * Shared utilities for LSP requests
 */

/**
 * Create a unique request ID
 */
export function createRequestId(): number {
  return Date.now() + Math.floor(Math.random() * 1000);
}

/**
 * Shared TextEdit interface
 */
export interface TextEdit {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  newText: string;
}
