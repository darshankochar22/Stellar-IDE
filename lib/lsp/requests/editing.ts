/**
 * LSP Editing Requests
 * Code editing features (completion, signature help, formatting)
 */

import { createRequestId, TextEdit } from './utils';

/**
 * Request code completion
 */
export function requestCompletion(
  ws: WebSocket,
  uri: string,
  position: { line: number; character: number },
  timeout = 3000
): Promise<unknown[]> {
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
          const result = message.result;
          // Handle both array and {items: []} formats
          resolve(Array.isArray(result) ? result : result?.items || []);
        }
      } catch {
        // Ignore parse errors
      }
    };

    ws.addEventListener('message', handleMessage);

    setTimeout(() => {
      ws.removeEventListener('message', handleMessage);
      resolve([]);
    }, timeout);

    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      method: 'textDocument/completion',
      params: {
        textDocument: { uri },
        position,
      },
      id: requestId,
    }));
  });
}

/**
 * Request signature help
 */
export function requestSignatureHelp(
  ws: WebSocket,
  uri: string,
  position: { line: number; character: number },
  timeout = 3000
): Promise<unknown | null> {
  return new Promise((resolve) => {
    if (ws.readyState !== WebSocket.OPEN) {
      resolve(null);
      return;
    }

    const requestId = createRequestId();

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (message.id === requestId) {
          ws.removeEventListener('message', handleMessage);
          resolve(message.result || null);
        }
      } catch {
        // Ignore parse errors
      }
    };

    ws.addEventListener('message', handleMessage);

    setTimeout(() => {
      ws.removeEventListener('message', handleMessage);
      resolve(null);
    }, timeout);

    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      method: 'textDocument/signatureHelp',
      params: {
        textDocument: { uri },
        position,
      },
      id: requestId,
    }));
  });
}

/**
 * Request document formatting
 */
export function requestFormatting(
  ws: WebSocket,
  uri: string,
  timeout = 5000
): Promise<TextEdit[]> {
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

    setTimeout(() => {
      ws.removeEventListener('message', handleMessage);
      resolve([]);
    }, timeout);

    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      method: 'textDocument/formatting',
      params: {
        textDocument: { uri },
        options: {
          tabSize: 4,
          insertSpaces: true,
        },
      },
      id: requestId,
    }));
  });
}
