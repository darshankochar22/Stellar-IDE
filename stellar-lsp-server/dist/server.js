"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const dockerode_1 = __importDefault(require("dockerode"));
const stream_1 = require("stream");
const node_1 = require("vscode-languageserver/node");
const docker = new dockerode_1.default({ socketPath: '/var/run/docker.sock' });
const wss = new ws_1.WebSocketServer({ port: 3001 });
console.log('🚀 LSP Server listening on port 3001');
// Server error handling
wss.on('error', (error) => {
    console.error('[LSP] WebSocket server error:', error);
});
wss.on('listening', () => {
    console.log('WebSocket server is ready');
});
wss.on('connection', (ws, request) => {
    // Parse connection parameters
    const baseUrl = `http://${request.headers.host || 'localhost'}`;
    const requestUrl = request.url || '/';
    let connectionActive = true;
    let lspConnection = null;
    let execStream = null;
    // Buffer messages until LSP connection is ready
    const messageBuffer = [];
    let isLspReady = false;
    // Set up message handler IMMEDIATELY to buffer early messages
    ws.on('message', (data) => {
        const dataStr = typeof data === 'string' ? data : data.toString();
        if (!isLspReady) {
            console.log(`[Buffer] Buffering message until LSP ready`);
            messageBuffer.push(dataStr);
            return;
        }
        processMessage(dataStr);
    });
    // Process a single message
    function processMessage(dataStr) {
        if (!connectionActive || !lspConnection)
            return;
        try {
            const message = JSON.parse(dataStr);
            console.log(`[WS→LSP] ${message.method || 'response'} (id: ${message.id || 'none'})`);
            if (message.id !== undefined && message.id !== null) {
                lspConnection.sendRequest(message.method, message.params)
                    .then(result => {
                    if (connectionActive && ws.readyState === ws_1.WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            jsonrpc: '2.0',
                            id: message.id,
                            result
                        }));
                    }
                })
                    .catch(error => {
                    if (connectionActive && ws.readyState === ws_1.WebSocket.OPEN) {
                        console.error(`Request error: ${error.message}`);
                        ws.send(JSON.stringify({
                            jsonrpc: '2.0',
                            id: message.id,
                            error: { code: -32603, message: error.message || 'Internal error' }
                        }));
                    }
                });
            }
            else {
                try {
                    lspConnection.sendNotification(message.method, message.params);
                }
                catch (error) {
                    // Ignore notification errors
                }
            }
        }
        catch (error) {
            console.error('[ERROR] Failed to process message:', error);
        }
    }
    try {
        const url = new URL(requestUrl, baseUrl);
        const urlParams = url.searchParams;
        const containerId = urlParams.get('containerId')?.trim();
        const workspacePath = urlParams.get('workspace')?.trim() || '/home/developer/workspace';
        if (!containerId) {
            console.error('[ERROR] Missing containerId parameter');
            ws.close(1008, 'Missing containerId parameter');
            return;
        }
        console.log(`🔗 New connection for container: ${containerId}`);
        const container = docker.getContainer(containerId);
        // Cleanup function
        const cleanup = () => {
            connectionActive = false;
            if (lspConnection) {
                try {
                    lspConnection.dispose();
                }
                catch (e) {
                    // Ignore disposal errors
                }
                lspConnection = null;
            }
            if (execStream) {
                try {
                    if (execStream.writable) {
                        execStream.end();
                    }
                    if ('destroy' in execStream && typeof execStream.destroy === 'function') {
                        execStream.destroy();
                    }
                }
                catch (e) {
                    // Ignore cleanup errors
                }
                execStream = null;
            }
        };
        // Set up WebSocket close handler early
        ws.on('close', () => {
            console.log(`🔌 WebSocket closed for container ${containerId}`);
            cleanup();
        });
        ws.on('error', (error) => {
            console.error(`[ERROR] WebSocket error for ${containerId}:`, error.message);
            cleanup();
        });
        // Inspect container
        container.inspect(async (inspectErr, inspectData) => {
            if (!connectionActive)
                return;
            if (inspectErr) {
                console.error(`[ERROR] Container inspect error: ${inspectErr.message}`);
                ws.close(1008, `Container not found: ${inspectErr.message}`);
                return;
            }
            if (!inspectData || !inspectData.State.Running) {
                console.error(`[ERROR] Container ${containerId} not running`);
                ws.close(1008, 'Container not running');
                return;
            }
            console.log(`Container ${containerId} is running`);
            try {
                // Create exec instance for rust-analyzer
                const exec = await new Promise((resolve, reject) => {
                    container.exec({
                        Cmd: ['rust-analyzer'],
                        AttachStdin: true,
                        AttachStdout: true,
                        AttachStderr: true,
                        Tty: false,
                        WorkingDir: workspacePath,
                        Env: ['RUST_BACKTRACE=1']
                    }, (execErr, execInstance) => {
                        if (execErr) {
                            reject(new Error(`Exec creation failed: ${execErr.message}`));
                            return;
                        }
                        if (!execInstance) {
                            reject(new Error('Exec instance is undefined'));
                            return;
                        }
                        resolve(execInstance);
                    });
                });
                if (!connectionActive)
                    return;
                console.log(`Created exec instance for rust-analyzer`);
                // Start the exec to get a stream
                const stream = await new Promise((resolve, reject) => {
                    exec.start({ hijack: true, stdin: true }, (startErr, streamResult) => {
                        if (startErr) {
                            reject(new Error(`Exec start failed: ${startErr.message}`));
                            return;
                        }
                        if (!streamResult) {
                            reject(new Error('Exec stream is undefined'));
                            return;
                        }
                        resolve(streamResult);
                    });
                });
                if (!connectionActive) {
                    if ('destroy' in stream && typeof stream.destroy === 'function') {
                        stream.destroy();
                    }
                    return;
                }
                execStream = stream;
                console.log(`Started rust-analyzer process`);
                // Demultiplex Docker stream (stdout/stderr have 8-byte headers)
                const stdout = new stream_1.PassThrough();
                const stderr = new stream_1.PassThrough();
                // Use Docker's demuxStream to separate stdout and stderr
                docker.modem.demuxStream(stream, stdout, stderr);
                // Log stderr for debugging
                stderr.on('data', (data) => {
                    console.log(`[rust-analyzer stderr] ${data.toString()}`);
                });
                // Create a writable stream that writes to the raw Docker stream
                // (stdin doesn't need demuxing)
                const stdinStream = new stream_1.PassThrough();
                stdinStream.pipe(stream);
                // Create LSP message connection using demuxed streams
                const connection = (0, node_1.createMessageConnection)(new node_1.StreamMessageReader(stdout), new node_1.StreamMessageWriter(stdinStream));
                lspConnection = connection;
                // Forward diagnostics from rust-analyzer to WebSocket
                connection.onNotification('textDocument/publishDiagnostics', (params) => {
                    if (connectionActive && ws.readyState === ws_1.WebSocket.OPEN) {
                        console.log(`[LSP→WS] publishDiagnostics`);
                        ws.send(JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'textDocument/publishDiagnostics',
                            params
                        }));
                    }
                });
                // Forward other notifications
                connection.onNotification((method, params) => {
                    if (method !== 'textDocument/publishDiagnostics' && connectionActive && ws.readyState === ws_1.WebSocket.OPEN) {
                        console.log(`[LSP→WS] ${method}`);
                        ws.send(JSON.stringify({
                            jsonrpc: '2.0',
                            method,
                            params
                        }));
                    }
                });
                // Handle LSP requests from rust-analyzer
                connection.onRequest((method) => {
                    console.log(`[LSP Request] ${method}`);
                    return Promise.resolve(null);
                });
                // Handle stream errors
                stream.on('error', (error) => {
                    console.error(`[ERROR] Stream error: ${error.message}`);
                    if (connectionActive && ws.readyState === ws_1.WebSocket.OPEN) {
                        ws.close(1011, 'Stream error');
                    }
                });
                stream.on('close', () => {
                    console.log(`Stream closed for ${containerId}`);
                });
                // START LISTENING FIRST before processing messages
                connection.listen();
                console.log(`LSP connection established for container ${containerId}`);
                // NOW mark LSP as ready and process buffered messages
                isLspReady = true;
                console.log(`[LSP] Ready! Processing ${messageBuffer.length} buffered messages`);
                for (const bufferedMsg of messageBuffer) {
                    processMessage(bufferedMsg);
                }
                messageBuffer.length = 0;
            }
            catch (error) {
                console.error(`[ERROR] Failed to set up LSP:`, error);
                if (connectionActive && ws.readyState === ws_1.WebSocket.OPEN) {
                    ws.close(1011, `Failed to start language server: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
                cleanup();
            }
        });
    }
    catch (error) {
        console.error('[ERROR] Failed to parse WebSocket URL:', error);
        ws.close(1008, 'Invalid connection parameters');
    }
});
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
//# sourceMappingURL=server.js.map