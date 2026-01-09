/**
 * LSP Connection Management
 */

import { WebSocket } from 'ws';
import { PassThrough } from 'stream';
import {
  createMessageConnection,
  StreamMessageReader,
  StreamMessageWriter,
  MessageConnection,
} from 'vscode-languageserver/node';
import { docker, destroyStream } from './docker';
import { ConnectionState } from './types';

/**
 * Create LSP message connection from Docker exec stream
 */
export function createLSPConnection(
  execStream: NodeJS.ReadWriteStream
): {
  connection: MessageConnection;
  stdout: PassThrough;
  stderr: PassThrough;
  stdinStream: PassThrough;
} {
  // Demultiplex Docker stream (stdout/stderr have 8-byte headers)
  const stdout = new PassThrough();
  const stderr = new PassThrough();

  // Use Docker's demuxStream to separate stdout and stderr
  docker.modem.demuxStream(execStream, stdout, stderr);

  // Create a writable stream that writes to the raw Docker stream
  // (stdin doesn't need demuxing)
  const stdinStream = new PassThrough();
  stdinStream.pipe(execStream);

  // Create LSP message connection using demuxed streams
  const connection = createMessageConnection(
    new StreamMessageReader(stdout),
    new StreamMessageWriter(stdinStream)
  );

  return { connection, stdout, stderr, stdinStream };
}

/**
 * Set up LSP notification handlers
 */
export function setupNotificationHandlers(
  connection: MessageConnection,
  ws: WebSocket,
  state: ConnectionState,
  containerId: string
): void {
  // Forward diagnostics from rust-analyzer to WebSocket
  connection.onNotification('textDocument/publishDiagnostics', (params: unknown) => {
    if (state.connectionActive && ws.readyState === WebSocket.OPEN) {
      console.log(`[LSP→WS] publishDiagnostics`);
      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          method: 'textDocument/publishDiagnostics',
          params,
        })
      );
    }
  });

  // Forward other notifications
  connection.onNotification((method: string, params: unknown) => {
    if (
      method !== 'textDocument/publishDiagnostics' &&
      state.connectionActive &&
      ws.readyState === WebSocket.OPEN
    ) {
      console.log(`[LSP→WS] ${method}`);
      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          method,
          params,
        })
      );
    }
  });

  // Handle LSP requests from rust-analyzer
  connection.onRequest((method: string) => {
    console.log(`[LSP Request] ${method}`);
    return Promise.resolve(null);
  });
}

/**
 * Set up stream error handlers
 */
export function setupStreamHandlers(
  execStream: NodeJS.ReadWriteStream,
  stderr: PassThrough,
  ws: WebSocket,
  state: ConnectionState,
  containerId: string
): void {
  // Log stderr for debugging
  stderr.on('data', (data: Buffer) => {
    console.log(`[rust-analyzer stderr] ${data.toString()}`);
  });

  // Handle stream errors
  execStream.on('error', (error: Error) => {
    console.error(`[ERROR] Stream error: ${error.message}`);
    if (state.connectionActive && ws.readyState === WebSocket.OPEN) {
      ws.close(1011, 'Stream error');
    }
  });

  execStream.on('close', () => {
    console.log(`Stream closed for ${containerId}`);
  });
}

/**
 * Cleanup function for connection resources
 */
export function createCleanup(state: ConnectionState): () => void {
  return () => {
    state.connectionActive = false;

    if (state.lspConnection) {
      try {
        state.lspConnection.dispose();
      } catch {
        // Ignore disposal errors
      }
      state.lspConnection = null;
    }

    if (state.execStream) {
      try {
        if (state.execStream.writable) {
          state.execStream.end();
        }
        destroyStream(state.execStream);
      } catch {
        // Ignore cleanup errors
      }
      state.execStream = null;
    }
  };
}
