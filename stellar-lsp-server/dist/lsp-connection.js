"use strict";
/**
 * LSP Connection Management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLSPConnection = createLSPConnection;
exports.setupNotificationHandlers = setupNotificationHandlers;
exports.setupStreamHandlers = setupStreamHandlers;
exports.createCleanup = createCleanup;
const ws_1 = require("ws");
const stream_1 = require("stream");
const node_1 = require("vscode-languageserver/node");
const docker_1 = require("./docker");
/**
 * Create LSP message connection from Docker exec stream
 */
function createLSPConnection(execStream) {
    // Demultiplex Docker stream (stdout/stderr have 8-byte headers)
    const stdout = new stream_1.PassThrough();
    const stderr = new stream_1.PassThrough();
    // Use Docker's demuxStream to separate stdout and stderr
    docker_1.docker.modem.demuxStream(execStream, stdout, stderr);
    // Create a writable stream that writes to the raw Docker stream
    // (stdin doesn't need demuxing)
    const stdinStream = new stream_1.PassThrough();
    stdinStream.pipe(execStream);
    // Create LSP message connection using demuxed streams
    const connection = (0, node_1.createMessageConnection)(new node_1.StreamMessageReader(stdout), new node_1.StreamMessageWriter(stdinStream));
    return { connection, stdout, stderr, stdinStream };
}
/**
 * Set up LSP notification handlers
 */
function setupNotificationHandlers(connection, ws, state, containerId) {
    // Forward diagnostics from rust-analyzer to WebSocket
    connection.onNotification('textDocument/publishDiagnostics', (params) => {
        if (state.connectionActive && ws.readyState === ws_1.WebSocket.OPEN) {
            console.log(`[LSP→WS] publishDiagnostics`);
            ws.send(JSON.stringify({
                jsonrpc: '2.0',
                method: 'textDocument/publishDiagnostics',
                params,
            }));
        }
    });
    // Forward other notifications
    connection.onNotification((method, params) => {
        if (method !== 'textDocument/publishDiagnostics' &&
            state.connectionActive &&
            ws.readyState === ws_1.WebSocket.OPEN) {
            console.log(`[LSP→WS] ${method}`);
            ws.send(JSON.stringify({
                jsonrpc: '2.0',
                method,
                params,
            }));
        }
    });
    // Handle LSP requests from rust-analyzer
    connection.onRequest((method) => {
        console.log(`[LSP Request] ${method}`);
        return Promise.resolve(null);
    });
}
/**
 * Set up stream error handlers
 */
function setupStreamHandlers(execStream, stderr, ws, state, containerId) {
    // Log stderr for debugging
    stderr.on('data', (data) => {
        console.log(`[rust-analyzer stderr] ${data.toString()}`);
    });
    // Handle stream errors
    execStream.on('error', (error) => {
        console.error(`[ERROR] Stream error: ${error.message}`);
        if (state.connectionActive && ws.readyState === ws_1.WebSocket.OPEN) {
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
function createCleanup(state) {
    return () => {
        state.connectionActive = false;
        if (state.lspConnection) {
            try {
                state.lspConnection.dispose();
            }
            catch {
                // Ignore disposal errors
            }
            state.lspConnection = null;
        }
        if (state.execStream) {
            try {
                if (state.execStream.writable) {
                    state.execStream.end();
                }
                (0, docker_1.destroyStream)(state.execStream);
            }
            catch {
                // Ignore cleanup errors
            }
            state.execStream = null;
        }
    };
}
//# sourceMappingURL=lsp-connection.js.map