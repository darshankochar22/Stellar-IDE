"use strict";
/**
 * LSP WebSocket Server
 * Main entry point for the stellar LSP server
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const docker_1 = require("./docker");
const lsp_connection_1 = require("./lsp-connection");
const message_handler_1 = require("./message-handler");
const url_parser_1 = require("./url-parser");
const PORT = 3001;
const wss = new ws_1.WebSocketServer({ port: PORT });
console.log(`LSP Server listening on port ${PORT}`);
// Server error handling
wss.on("error", (error) => {
  console.error("[LSP] WebSocket server error:", error);
});
wss.on("listening", () => {
  console.log("WebSocket server is ready");
});
wss.on("connection", (ws, request) => {
  // Parse connection parameters
  const params = (0, url_parser_1.parseConnectionParams)(request);
  if (!params) {
    console.error("[ERROR] Missing containerId parameter");
    ws.close(1008, "Missing containerId parameter");
    return;
  }
  const { containerId, workspacePath } = params;
  // Initialize connection state
  const state = {
    connectionActive: true,
    lspConnection: null,
    execStream: null,
    messageBuffer: [],
    isLspReady: false,
  };
  // Create cleanup function
  const cleanup = (0, lsp_connection_1.createCleanup)(state);
  // Set up message handler IMMEDIATELY to buffer early messages
  ws.on("message", (0, message_handler_1.createMessageHandler)(ws, state));
  // Set up WebSocket close handler
  ws.on("close", () => {
    console.log(`🔌 WebSocket closed for container ${containerId}`);
    cleanup();
  });
  ws.on("error", (error) => {
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
  ws,
  state,
  containerId,
  workspacePath,
  cleanup
) {
  try {
    // Inspect container
    const inspectData = await (0, docker_1.inspectContainer)(containerId);
    if (!state.connectionActive) return;
    if (!inspectData.State.Running) {
      console.error(`[ERROR] Container ${containerId} not running`);
      ws.close(1008, "Container not running");
      return;
    }
    console.log(`Container ${containerId} is running`);
    // Create exec instance for rust-analyzer
    const exec = await (0, docker_1.createRustAnalyzerExec)(
      containerId,
      workspacePath
    );
    if (!state.connectionActive) return;
    console.log(`Created exec instance for rust-analyzer`);
    // Start the exec to get a stream
    const execStream = await (0, docker_1.startExec)(exec);
    if (!state.connectionActive) {
      (0, docker_1.destroyStream)(execStream);
      return;
    }
    state.execStream = execStream;
    console.log(`Started rust-analyzer process`);
    // Create LSP connection from Docker stream
    const { connection, stderr } = (0, lsp_connection_1.createLSPConnection)(
      execStream
    );
    state.lspConnection = connection;
    // Set up notification handlers
    (0, lsp_connection_1.setupNotificationHandlers)(
      connection,
      ws,
      state,
      containerId
    );
    // Set up stream handlers
    (0, lsp_connection_1.setupStreamHandlers)(
      execStream,
      stderr,
      ws,
      state,
      containerId
    );
    // START LISTENING FIRST before processing messages
    connection.listen();
    console.log(`LSP connection established for container ${containerId}`);
    // NOW mark LSP as ready and process buffered messages
    state.isLspReady = true;
    (0, message_handler_1.processBufferedMessages)(ws, state);
  } catch (error) {
    console.error(`[ERROR] Failed to set up LSP:`, error);
    if (state.connectionActive && ws.readyState === ws_1.WebSocket.OPEN) {
      ws.close(
        1011,
        `Failed to start language server: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
    cleanup();
  }
}
// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[LSP] Shutting down...");
  wss.close(() => {
    console.log("[LSP] Server closed");
    process.exit(0);
  });
});
process.on("SIGTERM", () => {
  console.log("\n[LSP] Shutting down...");
  wss.close(() => {
    console.log("[LSP] Server closed");
    process.exit(0);
  });
});
//# sourceMappingURL=server.js.map
