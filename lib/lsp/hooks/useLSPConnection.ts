/**
 * LSP Connection Hook
 * Manages WebSocket connection lifecycle
 */

import { useState, useEffect, useRef } from 'react';
import { createInitializeRequest } from '../capabilities';
import { sendInitialized } from '../requests';

interface UseLSPConnectionProps {
  containerId: string | undefined;
  onDiagnostics?: (uri: string, diagnostics: unknown[]) => void;
}

interface UseLSPConnectionReturn {
  isConnected: boolean;
  connectionError: string | null;
  isInitialized: boolean;
  wsRef: React.RefObject<WebSocket | null>;
}

/**
 * Hook to manage LSP WebSocket connection
 */
export function useLSPConnection({
  containerId,
  onDiagnostics,
}: UseLSPConnectionProps): UseLSPConnectionReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const isInitializedRef = useRef(false);
  const onDiagnosticsRef = useRef(onDiagnostics);
  
  // Update ref when callback changes (but don't trigger reconnection)
  useEffect(() => {
    onDiagnosticsRef.current = onDiagnostics;
  }, [onDiagnostics]);

  // Main connection effect
  useEffect(() => {
    if (!containerId) {
      console.log('[LSP Connection] No containerId, skipping connection');
      return;
    }

    // Prevent duplicate connections
    if (wsRef.current) {
      const state = wsRef.current.readyState;
      if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
        console.log('[LSP Connection] Already connected/connecting, skipping');
        return;
      }
    }

    console.log(`[LSP Connection] Connecting to container: ${containerId}`);

    const wsUrl = `ws://localhost:3001?containerId=${containerId}&workspace=/home/developer/workspace`;
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      console.log('[LSP Connection] ✓ WebSocket connected');
      setConnectionError(null);
      setIsConnected(true);

      // Send initialize request
      const initRequest = createInitializeRequest(1);
      socket.send(JSON.stringify(initRequest));
      console.log('[LSP Connection] Sent initialize request');
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        // Handle initialize response
        if (message.id === 1 && !message.error) {
          console.log('[LSP Connection] ✓ LSP initialized');
          isInitializedRef.current = true;
          setIsInitialized(true);
          sendInitialized(socket);
        } else if (message.id === 1 && message.error) {
          console.error('[LSP Connection] Initialize failed:', message.error);
          setConnectionError(`LSP init failed: ${message.error.message}`);
        }

        // Handle diagnostics
        if (message.method === 'textDocument/publishDiagnostics' && onDiagnosticsRef.current) {
          const { uri, diagnostics } = message.params as { uri: string; diagnostics: unknown[] };
          onDiagnosticsRef.current(uri, diagnostics);
        }
      } catch (error) {
        console.error('[LSP Connection] Message parse error:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('[LSP Connection] WebSocket error:', error);
      setConnectionError('WebSocket connection error');
    };

    socket.onclose = (event) => {
      console.log(`[LSP Connection] WebSocket closed (code: ${event.code})`);
      setIsConnected(false);
      isInitializedRef.current = false;
      setIsInitialized(false);
      wsRef.current = null;
    };

    return () => {
      console.log('[LSP Connection] Cleanup: closing connection');
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
      wsRef.current = null;
      isInitializedRef.current = false;
      setIsInitialized(false);
    };
  }, [containerId]); // Removed onDiagnostics from dependencies - use ref instead

  return {
    isConnected,
    connectionError,
    isInitialized,
    wsRef,
  };
}
