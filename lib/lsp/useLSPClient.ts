/**
 * LSP Client Hook
 * Main hook for managing LSP WebSocket connection
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Diagnostic, InlayHint } from './types';
import { createInitializeRequest } from './capabilities';
import { handleDiagnostics } from './diagnostics';
import {
  sendDidOpen,
  sendDidChange,
  sendInitialized,
  requestInlayHints as sendInlayHintsRequest,
  requestHover as sendHoverRequest,
  requestCompletion as sendCompletionRequest,
  requestDefinition as sendDefinitionRequest,
  requestSignatureHelp as sendSignatureHelpRequest,
  requestFormatting as sendFormattingRequest,
} from './requests';

interface UseLSPClientReturn {
  isConnected: boolean;
  connectionError: string | null;
  diagnosticsCount: number;
  openTextDocument: (text: string, uri?: string) => void;
  changeTextDocument: (text: string, uri?: string) => void;
  requestInlayHints: (uri: string, range: { startLine: number; endLine: number }) => Promise<InlayHint[]>;
  requestHover: (uri: string, position: { line: number; character: number }) => Promise<{ contents: string } | null>;
  requestCompletion: (uri: string, position: { line: number; character: number }) => Promise<unknown[]>;
  requestDefinition: (uri: string, position: { line: number; character: number }) => Promise<unknown[]>;
  requestSignatureHelp: (uri: string, position: { line: number; character: number }) => Promise<unknown | null>;
  requestFormatting: (uri: string) => Promise<unknown[]>;
  wsRef: React.RefObject<WebSocket | null>;
}

export function useLSPClient(
  containerId: string | undefined,
  fileUri: string
): UseLSPClientReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [diagnosticsCount, setDiagnosticsCount] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const versionRef = useRef(1);
  const isInitializedRef = useRef(false);
  const currentFileUriRef = useRef<string>('');
  const openedFilesRef = useRef<Set<string>>(new Set());

  // Main connection effect
  useEffect(() => {
    if (!containerId) {
      console.log('[LSP Client] No containerId, skipping connection');
      return;
    }

    // Prevent duplicate connections
    if (wsRef.current) {
      const state = wsRef.current.readyState;
      if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
        console.log('[LSP Client] Already connected/connecting, skipping');
        return;
      }
    }

    console.log(`[LSP Client] Connecting to container: ${containerId}`);

    const wsUrl = `ws://localhost:3001?containerId=${containerId}&workspace=/home/developer/workspace`;
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      console.log('[LSP Client] ✓ WebSocket connected');
      setConnectionError(null);
      setIsConnected(true);

      // Send initialize request
      const initRequest = createInitializeRequest(1);
      socket.send(JSON.stringify(initRequest));
      console.log('[LSP Client] Sent initialize request');
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        // Handle initialize response
        if (message.id === 1 && !message.error) {
          console.log('[LSP Client] ✓ LSP initialized');
          isInitializedRef.current = true;
          sendInitialized(socket);

          if (currentFileUriRef.current) {
            console.log('[LSP Client] Opening pending file after init:', currentFileUriRef.current);
          }
        } else if (message.id === 1 && message.error) {
          console.error('[LSP Client] Initialize failed:', message.error);
          setConnectionError(`LSP init failed: ${message.error.message}`);
        }

        // Handle diagnostics
        if (message.method === 'textDocument/publishDiagnostics') {
          const { uri, diagnostics } = message.params as { uri: string; diagnostics: Diagnostic[] };
          handleDiagnostics(uri, diagnostics, setDiagnosticsCount);
        }
      } catch (error) {
        console.error('[LSP Client] Message parse error:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('[LSP Client] WebSocket error:', error);
      setConnectionError('WebSocket connection error');
    };

    socket.onclose = (event) => {
      console.log(`[LSP Client] WebSocket closed (code: ${event.code})`);
      setIsConnected(false);
      isInitializedRef.current = false;
      openedFilesRef.current.clear();
      wsRef.current = null;
    };

    const openedFiles = openedFilesRef.current;

    return () => {
      console.log('[LSP Client] Cleanup: closing connection');
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
      wsRef.current = null;
      isInitializedRef.current = false;
      openedFiles.clear();
    };
  }, [containerId]);

  // Update current file URI ref
  useEffect(() => {
    currentFileUriRef.current = fileUri;
  }, [fileUri]);

  // Open text document
  const openTextDocument = useCallback((text: string, uri?: string) => {
    const ws = wsRef.current;
    const effectiveUri = uri || currentFileUriRef.current;

    if (!ws || ws.readyState !== WebSocket.OPEN || !effectiveUri) {
      console.log('[LSP Client] Cannot open doc - not connected or no URI');
      return;
    }

    if (!isInitializedRef.current) {
      console.log('[LSP Client] Cannot open doc - not initialized yet');
      return;
    }

    if (openedFilesRef.current.has(effectiveUri)) {
      console.log('[LSP Client] File already opened:', effectiveUri);
      return;
    }

    console.log(`[LSP Client] 📤 Opening document: ${effectiveUri}`);
    versionRef.current = 1;

    sendDidOpen(ws, effectiveUri, text, versionRef.current);
    openedFilesRef.current.add(effectiveUri);
  }, []);

  // Change text document
  const changeTextDocument = useCallback((text: string, uri?: string) => {
    const ws = wsRef.current;
    const effectiveUri = uri || currentFileUriRef.current;

    if (!ws || ws.readyState !== WebSocket.OPEN || !effectiveUri) {
      return;
    }

    if (!isInitializedRef.current) {
      return;
    }

    if (!openedFilesRef.current.has(effectiveUri)) {
      return;
    }

    versionRef.current += 1;
    console.log(`[LSP Client] 📤 Sending change for ${effectiveUri}, version ${versionRef.current}`);

    sendDidChange(ws, effectiveUri, text, versionRef.current);
  }, []);

  // Request inlay hints
  const requestInlayHints = useCallback(
    (uri: string, range: { startLine: number; endLine: number }): Promise<InlayHint[]> => {
      const ws = wsRef.current;
      if (!ws || !isInitializedRef.current) {
        return Promise.resolve([]);
      }
      return sendInlayHintsRequest(ws, uri, range);
    },
    []
  );

  // Request hover
  const requestHover = useCallback(
    (uri: string, position: { line: number; character: number }): Promise<{ contents: string } | null> => {
      const ws = wsRef.current;
      if (!ws || !isInitializedRef.current) {
        return Promise.resolve(null);
      }
      return sendHoverRequest(ws, uri, position);
    },
    []
  );

  // Request completion
  const requestCompletion = useCallback(
    (uri: string, position: { line: number; character: number }): Promise<unknown[]> => {
      const ws = wsRef.current;
      if (!ws || !isInitializedRef.current) {
        return Promise.resolve([]);
      }
      return sendCompletionRequest(ws, uri, position);
    },
    []
  );

  // Request definition
  const requestDefinition = useCallback(
    (uri: string, position: { line: number; character: number }): Promise<unknown[]> => {
      const ws = wsRef.current;
      if (!ws || !isInitializedRef.current) {
        return Promise.resolve([]);
      }
      return sendDefinitionRequest(ws, uri, position);
    },
    []
  );

  // Request signature help
  const requestSignatureHelp = useCallback(
    (uri: string, position: { line: number; character: number }): Promise<unknown | null> => {
      const ws = wsRef.current;
      if (!ws || !isInitializedRef.current) {
        return Promise.resolve(null);
      }
      return sendSignatureHelpRequest(ws, uri, position);
    },
    []
  );

  // Request document formatting
  const requestFormatting = useCallback(
    (uri: string): Promise<unknown[]> => {
      const ws = wsRef.current;
      if (!ws || !isInitializedRef.current) {
        return Promise.resolve([]);
      }
      return sendFormattingRequest(ws, uri);
    },
    []
  );

  return {
    isConnected,
    connectionError,
    diagnosticsCount,
    openTextDocument,
    changeTextDocument,
    requestInlayHints,
    requestHover,
    requestCompletion,
    requestDefinition,
    requestSignatureHelp,
    requestFormatting,
    wsRef,
  };
}
