/**
 * Message Handler for LSP Protocol
 */

import { WebSocket } from 'ws';
import { ConnectionState } from './types';

/**
 * Process a single LSP message
 */
export function processMessage(
  dataStr: string,
  ws: WebSocket,
  state: ConnectionState
): void {
  if (!state.connectionActive || !state.lspConnection) return;

  try {
    const message = JSON.parse(dataStr);
    console.log(`[WS→LSP] ${message.method || 'response'} (id: ${message.id || 'none'})`);

    if (message.id !== undefined && message.id !== null) {
      // Request - send and wait for response
      state.lspConnection
        .sendRequest(message.method, message.params)
        .then((result) => {
          if (state.connectionActive && ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                jsonrpc: '2.0',
                id: message.id,
                result,
              })
            );
          }
        })
        .catch((error) => {
          if (state.connectionActive && ws.readyState === WebSocket.OPEN) {
            console.error(`Request error: ${error.message}`);
            ws.send(
              JSON.stringify({
                jsonrpc: '2.0',
                id: message.id,
                error: { code: -32603, message: error.message || 'Internal error' },
              })
            );
          }
        });
    } else {
      // Notification - fire and forget
      try {
        state.lspConnection.sendNotification(message.method, message.params);
      } catch {
        // Ignore notification errors
      }
    }
  } catch (error) {
    console.error('[ERROR] Failed to process message:', error);
  }
}

/**
 * Create a message handler for WebSocket
 */
export function createMessageHandler(
  ws: WebSocket,
  state: ConnectionState
): (data: Buffer | string) => void {
  return (data: Buffer | string) => {
    const dataStr = typeof data === 'string' ? data : data.toString();

    if (!state.isLspReady) {
      console.log(`[Buffer] Buffering message until LSP ready`);
      state.messageBuffer.push(dataStr);
      return;
    }

    processMessage(dataStr, ws, state);
  };
}

/**
 * Process all buffered messages
 */
export function processBufferedMessages(ws: WebSocket, state: ConnectionState): void {
  console.log(`[LSP] Ready! Processing ${state.messageBuffer.length} buffered messages`);
  for (const bufferedMsg of state.messageBuffer) {
    processMessage(bufferedMsg, ws, state);
  }
  state.messageBuffer.length = 0;
}
