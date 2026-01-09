/**
 * LSP Refactoring Requests
 * Code refactoring features (rename, code actions)
 */

import { createRequestId, TextEdit } from './utils';

/**
 * Request prepare rename (check if rename is possible)
 */
export function requestPrepareRename(
  ws: WebSocket,
  uri: string,
  position: { line: number; character: number },
  timeout = 3000
): Promise<{ range: { start: { line: number; character: number }; end: { line: number; character: number } }; placeholder?: string } | null> {
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
          if (message.error) {
            resolve(null);
            return;
          }
          const result = message.result;
          if (!result) {
            resolve(null);
            return;
          }
          // Result can be { range, placeholder } or just { range }
          resolve(result);
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
      method: 'textDocument/prepareRename',
      params: {
        textDocument: { uri },
        position,
      },
      id: requestId,
    }));
  });
}

/**
 * Request rename symbol
 */
export function requestRename(
  ws: WebSocket,
  uri: string,
  position: { line: number; character: number },
  newName: string,
  timeout = 5000
): Promise<{ changes?: Record<string, TextEdit[]> } | null> {
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
          if (message.error) {
            console.error('[Rename] Error:', message.error);
            resolve(null);
            return;
          }
          const result = message.result;
          resolve(result || null);
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
      method: 'textDocument/rename',
      params: {
        textDocument: { uri },
        position,
        newName,
      },
      id: requestId,
    }));
  });
}

/**
 * Request code actions from LSP
 */
export function requestCodeAction(
  ws: WebSocket,
  uri: string,
  range: { start: { line: number; character: number }; end: { line: number; character: number } },
  context: { diagnostics: Array<{ range: { start: { line: number; character: number }; end: { line: number; character: number } }; severity: number; code?: string | number }> },
  timeout = 5000
): Promise<CodeAction[]> {
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
          // Handle both array and {commands: []} or {codeActions: []} formats
          if (Array.isArray(result)) {
            resolve(result);
          } else if (result?.commands) {
            resolve(result.commands);
          } else if (result?.codeActions) {
            resolve(result.codeActions);
          } else {
            resolve([]);
          }
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
      method: 'textDocument/codeAction',
      params: {
        textDocument: { uri },
        range,
        context,
      },
      id: requestId,
    }));
  });
}

// CodeAction interface
export interface CodeAction {
  title: string;
  kind?: string;
  diagnostics?: Array<{
    range: { start: { line: number; character: number }; end: { line: number; character: number } };
    severity: number;
    code?: string | number;
    message: string;
  }>;
  edit?: {
    changes?: Record<string, TextEdit[]>;
  };
  command?: {
    command: string;
    title: string;
    arguments?: unknown[];
  };
  isPreferred?: boolean;
}
