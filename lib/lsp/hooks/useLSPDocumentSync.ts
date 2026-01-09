/**
 * LSP Document Sync Hook
 * Handles document synchronization (didOpen, didChange)
 */

import { useCallback, useRef } from 'react';
import { sendDidOpen, sendDidChange } from '../requests';

interface UseLSPDocumentSyncProps {
  wsRef: React.RefObject<WebSocket | null>;
  isInitialized: boolean;
  currentFileUri: string;
}

interface UseLSPDocumentSyncReturn {
  openTextDocument: (text: string, uri?: string) => void;
  changeTextDocument: (text: string, uri?: string) => void;
}

/**
 * Hook to manage document synchronization with LSP
 */
export function useLSPDocumentSync({
  wsRef,
  isInitialized,
  currentFileUri,
}: UseLSPDocumentSyncProps): UseLSPDocumentSyncReturn {
  const versionRef = useRef(1);
  const openedFilesRef = useRef<Set<string>>(new Set());
  const currentFileUriRef = useRef<string>('');

  // Update current file URI ref
  currentFileUriRef.current = currentFileUri;

  // Open text document
  const openTextDocument = useCallback((text: string, uri?: string) => {
    const ws = wsRef.current;
    const effectiveUri = uri || currentFileUriRef.current;

    if (!ws || ws.readyState !== WebSocket.OPEN || !effectiveUri) {
      console.log('[LSP DocumentSync] Cannot open doc - not connected or no URI');
      return;
    }

    if (!isInitialized) {
      console.log('[LSP DocumentSync] Cannot open doc - not initialized yet');
      return;
    }

    if (openedFilesRef.current.has(effectiveUri)) {
      console.log('[LSP DocumentSync] File already opened:', effectiveUri);
      return;
    }

    console.log(`[LSP DocumentSync] 📤 Opening document: ${effectiveUri}`);
    versionRef.current = 1;

    sendDidOpen(ws, effectiveUri, text, versionRef.current);
    openedFilesRef.current.add(effectiveUri);
  }, [wsRef, isInitialized]);

  // Change text document
  const changeTextDocument = useCallback((text: string, uri?: string) => {
    const ws = wsRef.current;
    const effectiveUri = uri || currentFileUriRef.current;

    if (!ws || ws.readyState !== WebSocket.OPEN || !effectiveUri) {
      return;
    }

    if (!isInitialized) {
      return;
    }

    if (!openedFilesRef.current.has(effectiveUri)) {
      return;
    }

    versionRef.current += 1;
    console.log(`[LSP DocumentSync] 📤 Sending change for ${effectiveUri}, version ${versionRef.current}`);

    sendDidChange(ws, effectiveUri, text, versionRef.current);
  }, [wsRef, isInitialized]);

  return {
    openTextDocument,
    changeTextDocument,
  };
}
