/**
 * LSP WebSocket Server
 * Main entry point for the stellar LSP server
 */

import { WebSocketServer, WebSocket } from 'ws';
import { ConnectionState } from './types';
import { inspectContainer, createRustAnalyzerExec, startExec, destroyStream } from './docker';
import {
  createLSPConnection,
  setupNotificationHandlers,
  setupStreamHandlers,
  createCleanup,
} from './lsp-connection';
import { createMessageHandler, processBufferedMessages } from './message-handler';
import { parseConnectionParams } from './url-parser';

const PORT = 3001;
const wss = new WebSocketServer({ port: PORT });

console.log(`LSP Server listening on port ${PORT}`);

// Server error handling
wss.on('error', (error: Error) => {
    console.error('[LSP] WebSocket server error:', error);
});

wss.on('listening', () => {
  console.log('WebSocket server is ready');
});

wss.on('connection', (ws: WebSocket, request) => {
    // Parse connection parameters
  const params = parseConnectionParams(request);
  
  if (!params) {
    console.error('[ERROR] Missing containerId parameter');
            ws.close(1008, 'Missing containerId parameter');
            return;
        }

  const { containerId, workspacePath } = params;

  // Initialize connection state
  const state: ConnectionState = {
    connectionActive: true,
    lspConnection: null,
    execStream: null,
    messageBuffer: [],
    isLspReady: false,
  };

  // Create cleanup function
  const cleanup = createCleanup(state);

  // Set up message handler IMMEDIATELY to buffer early messages
  ws.on('message', createMessageHandler(ws, state));

  // Set up WebSocket close handler
  ws.on('close', () => {
    console.log(`🔌 WebSocket closed for container ${containerId}`);
    cleanup();
  });

  ws.on('error', (error: Error) => {
    console.error(`[ERROR] WebSocket error for ${containerId}:`, error.message);
    cleanup();
  });

  console.log(` New connection for container: ${containerId}`);

  // Start LSP connection process
  initializeLSPConnection(ws, state, containerId, workspacePath, cleanup);
});

/**
 * Initialize the LSP connection to rust-analyzer
 */
async function initializeLSPConnection(
  ws: WebSocket,
  state: ConnectionState,
  containerId: string,
  workspacePath: string,
  cleanup: () => void
): Promise<void> {
  try {
    // Inspect container
    const inspectData = await inspectContainer(containerId);

    if (!state.connectionActive) return;

    if (!inspectData.State.Running) {
      console.error(`[ERROR] Container ${containerId} not running`);
                ws.close(1008, 'Container not running');
                return;
            }

    console.log(`Container ${containerId} is running`);

    // Create exec instance for rust-analyzer
    const exec = await createRustAnalyzerExec(containerId, workspacePath);

    if (!state.connectionActive) return;
    console.log(`Created exec instance for rust-analyzer`);

    // Start the exec to get a stream
    const execStream = await startExec(exec);

    if (!state.connectionActive) {
      destroyStream(execStream);
                                return;
                            }

    state.execStream = execStream;
    console.log(`Started rust-analyzer process`);

    // Create LSP connection from Docker stream
    const { connection, stderr } = createLSPConnection(execStream);
    state.lspConnection = connection;

    // Set up notification handlers
    setupNotificationHandlers(connection, ws, state, containerId);

    // Set up stream handlers
    setupStreamHandlers(execStream, stderr, ws, state, containerId);

    // START LISTENING FIRST before processing messages
                connection.listen();
    console.log(`LSP connection established for container ${containerId}`);

    // NOW mark LSP as ready and process buffered messages
    state.isLspReady = true;
    processBufferedMessages(ws, state);
                    } catch (error) {
    console.error(`[ERROR] Failed to set up LSP:`, error);
    if (state.connectionActive && ws.readyState === WebSocket.OPEN) {
      ws.close(
        1011,
        `Failed to start language server: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
    cleanup();
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[LSP] Shutting down...');
    wss.close(() => {
    console.log('[LSP] Server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
  console.log('\n[LSP] Shutting down...');
    wss.close(() => {
    console.log('[LSP] Server closed');
        process.exit(0);
    });
});
