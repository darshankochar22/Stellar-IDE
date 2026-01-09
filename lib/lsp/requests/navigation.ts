/**
 * LSP Navigation Requests
 * Code navigation features (definition, references, hover)
 */

import { createRequestId } from './utils';

/**
 * Request go to definition
 */
export function requestDefinition(
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
          resolve(Array.isArray(result) ? result : result ? [result] : []);
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
      method: 'textDocument/definition',
      params: {
        textDocument: { uri },
        position,
      },
      id: requestId,
    }));
  });
}

/**
 * Request find all references
 */
export function requestReferences(
  ws: WebSocket,
  uri: string,
  position: { line: number; character: number },
  context?: { includeDeclaration?: boolean },
  timeout = 5000
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
          resolve(Array.isArray(result) ? result : []);
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
      method: 'textDocument/references',
      params: {
        textDocument: { uri },
        position,
        context: context || { includeDeclaration: true },
      },
      id: requestId,
    }));
  });
}

/**
 * Request hover information
 */
export function requestHover(
  ws: WebSocket,
  uri: string,
  position: { line: number; character: number },
  timeout = 3000
): Promise<{ contents: string } | null> {
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
      method: 'textDocument/hover',
      params: {
        textDocument: { uri },
        position,
      },
      id: requestId,
    }));
  });
}

/**
 * Document Symbol Types
 */
export interface DocumentSymbol {
  name: string;
  detail?: string;
  kind: number; // SymbolKind enum
  deprecated?: boolean;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  selectionRange: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  children?: DocumentSymbol[];
}

/**
 * Request document symbols (outline view)
 */
export function requestDocumentSymbols(
  ws: WebSocket,
  uri: string,
  timeout = 5000
): Promise<DocumentSymbol[]> {
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
          resolve(Array.isArray(result) ? result : []);
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
      method: 'textDocument/documentSymbol',
      params: {
        textDocument: { uri },
      },
      id: requestId,
    }));
  });
}
