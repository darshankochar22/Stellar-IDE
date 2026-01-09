/**
 * LSP Request Functions
 * Handles sending requests to the LSP server
 */

import { InlayHint } from './types';

/**
 * Create a unique request ID
 */
export function createRequestId(): number {
  return Date.now() + Math.floor(Math.random() * 1000);
}

/**
 * Send a textDocument/didOpen notification
 */
export function sendDidOpen(
  ws: WebSocket,
  uri: string,
  text: string,
  version: number
): void {
  ws.send(JSON.stringify({
    jsonrpc: '2.0',
    method: 'textDocument/didOpen',
    params: {
      textDocument: {
        uri,
        languageId: 'rust',
        version,
        text,
      },
    },
  }));
}

/**
 * Send a textDocument/didChange notification
 */
export function sendDidChange(
  ws: WebSocket,
  uri: string,
  text: string,
  version: number
): void {
  ws.send(JSON.stringify({
    jsonrpc: '2.0',
    method: 'textDocument/didChange',
    params: {
      textDocument: {
        uri,
        version,
      },
      contentChanges: [{ text }],
    },
  }));
}

/**
 * Send initialized notification
 */
export function sendInitialized(ws: WebSocket): void {
  ws.send(JSON.stringify({
    jsonrpc: '2.0',
    method: 'initialized',
    params: {},
  }));
}

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

// TextEdit interface for formatting
interface TextEdit {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  newText: string;
}
