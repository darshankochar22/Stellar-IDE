/**
 * LSP Inlay Hints Request
 * Inlay hints for type information
 */

import { InlayHint } from '../types';
import { createRequestId } from './utils';

/**
 * Request inlay hints from LSP
 */
export function requestInlayHints(
  ws: WebSocket,
  uri: string,
  range: { startLine: number; endLine: number },
  timeout = 5000
): Promise<InlayHint[]> {
  return new Promise((resolve) => {
    if (ws.readyState !== WebSocket.OPEN) {
      resolve([]);
      return;
    }

    const requestId = createRequestId();

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (message.id === requestId) {
          ws.removeEventListener('message', handleMessage);
          resolve(message.result || []);
        }
      } catch {
        // Ignore parse errors
      }
    };

    ws.addEventListener('message', handleMessage);

    // Timeout
    setTimeout(() => {
      ws.removeEventListener('message', handleMessage);
      resolve([]);
    }, timeout);

    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      method: 'textDocument/inlayHint',
      params: {
        textDocument: { uri },
        range: {
          start: { line: range.startLine, character: 0 },
          end: { line: range.endLine, character: 0 },
        },
      },
      id: requestId,
    }));
  });
}
