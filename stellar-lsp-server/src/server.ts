import { WebSocketServer, WebSocket } from 'ws';
import Docker from 'dockerode';
import { PassThrough } from 'stream';
import {
    createMessageConnection,
    StreamMessageReader,
    StreamMessageWriter,
    MessageConnection
} from 'vscode-languageserver/node';

// Dockerode type interfaces
interface ContainerInspectInfo {
    State: {
        Running: boolean;
        Status?: string;
    };
    Config?: {
        WorkingDir?: string;
    };
}

interface ExecStartOptions {
    hijack: boolean;
    stdin: boolean;
}

const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const wss = new WebSocketServer({ port: 3001 });

console.log('🚀 LSP Server listening on port 3001');

// Server error handling
wss.on('error', (error: Error) => {
    console.error('[LSP] WebSocket server error:', error);
});

wss.on('listening', () => {
    console.log('WebSocket server is ready');
});

wss.on('connection', (ws: WebSocket, request) => {
    // Parse connection parameters
    const baseUrl = `http://${request.headers.host || 'localhost'}`;
    const requestUrl = request.url || '/';
    
    let connectionActive = true;
    let lspConnection: MessageConnection | null = null;
    let execStream: NodeJS.ReadWriteStream | null = null;
    
    // Buffer messages until LSP connection is ready
    const messageBuffer: string[] = [];
    let isLspReady = false;
    
    // Set up message handler IMMEDIATELY to buffer early messages
    ws.on('message', (data: Buffer | string) => {
        const dataStr = typeof data === 'string' ? data : data.toString();
        
        if (!isLspReady) {
            console.log(`[Buffer] Buffering message until LSP ready`);
            messageBuffer.push(dataStr);
            return;
        }
        
        processMessage(dataStr);
    });
    
    // Process a single message
    function processMessage(dataStr: string) {
        if (!connectionActive || !lspConnection) return;
        
        try {
            const message = JSON.parse(dataStr);
            console.log(`[WS→LSP] ${message.method || 'response'} (id: ${message.id || 'none'})`);
            
            if (message.id !== undefined && message.id !== null) {
                lspConnection.sendRequest(message.method, message.params)
                    .then(result => {
                        if (connectionActive && ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                jsonrpc: '2.0',
                                id: message.id,
                                result
                            }));
                        }
                    })
                    .catch(error => {
                        if (connectionActive && ws.readyState === WebSocket.OPEN) {
                            console.error(`Request error: ${error.message}`);
                            ws.send(JSON.stringify({
                                jsonrpc: '2.0',
                                id: message.id,
                                error: { code: -32603, message: error.message || 'Internal error' }
                            }));
                        }
                    });
            } else {
                try {
                    lspConnection.sendNotification(message.method, message.params);
                } catch (error) {
                    // Ignore notification errors
                }
            }
        } catch (error) {
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
                } catch (e) {
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
                } catch (e) {
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

        ws.on('error', (error: Error) => {
            console.error(`[ERROR] WebSocket error for ${containerId}:`, error.message);
            cleanup();
        });

        // Inspect container
        container.inspect(async (inspectErr: Error | null, inspectData?: ContainerInspectInfo) => {
            if (!connectionActive) return;
            
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
                const exec = await new Promise<Docker.Exec>((resolve, reject) => {
                    container.exec({
                        Cmd: ['rust-analyzer'],
                        AttachStdin: true,
                        AttachStdout: true,
                        AttachStderr: true,
                        Tty: false,
                        WorkingDir: workspacePath,
                        Env: ['RUST_BACKTRACE=1']
                    }, (execErr: Error | null, execInstance?: Docker.Exec) => {
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

                if (!connectionActive) return;
                console.log(`Created exec instance for rust-analyzer`);

                // Start the exec to get a stream
                const stream = await new Promise<NodeJS.ReadWriteStream>((resolve, reject) => {
                    exec.start({ hijack: true, stdin: true } as ExecStartOptions, 
                        (startErr: Error | null, streamResult?: NodeJS.ReadWriteStream) => {
                            if (startErr) {
                                reject(new Error(`Exec start failed: ${startErr.message}`));
                                return;
                            }
                            if (!streamResult) {
                                reject(new Error('Exec stream is undefined'));
                                return;
                            }
                            resolve(streamResult);
                        }
                    );
                });

                if (!connectionActive) {
                    if ('destroy' in stream && typeof (stream as any).destroy === 'function') {
                        (stream as any).destroy();
                    }
                    return;
                }
                
                execStream = stream;
                console.log(`Started rust-analyzer process`);

                // Demultiplex Docker stream (stdout/stderr have 8-byte headers)
                const stdout = new PassThrough();
                const stderr = new PassThrough();
                
                // Use Docker's demuxStream to separate stdout and stderr
                docker.modem.demuxStream(stream, stdout, stderr);
                
                // Log stderr for debugging
                stderr.on('data', (data: Buffer) => {
                    console.log(`[rust-analyzer stderr] ${data.toString()}`);
                });

                // Create a writable stream that writes to the raw Docker stream
                // (stdin doesn't need demuxing)
                const stdinStream = new PassThrough();
                stdinStream.pipe(stream);

                // Create LSP message connection using demuxed streams
                const connection = createMessageConnection(
                    new StreamMessageReader(stdout),
                    new StreamMessageWriter(stdinStream)
                );
                lspConnection = connection;

                // Forward diagnostics from rust-analyzer to WebSocket
                connection.onNotification('textDocument/publishDiagnostics', (params: unknown) => {
                    if (connectionActive && ws.readyState === WebSocket.OPEN) {
                        console.log(`[LSP→WS] publishDiagnostics`);
                        ws.send(JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'textDocument/publishDiagnostics',
                            params
                        }));
                    }
                });

                // Forward other notifications
                connection.onNotification((method: string, params: unknown) => {
                    if (method !== 'textDocument/publishDiagnostics' && connectionActive && ws.readyState === WebSocket.OPEN) {
                        console.log(`[LSP→WS] ${method}`);
                        ws.send(JSON.stringify({
                            jsonrpc: '2.0',
                            method,
                            params
                        }));
                    }
                });

                // Handle LSP requests from rust-analyzer
                connection.onRequest((method: string) => {
                    console.log(`[LSP Request] ${method}`);
                    return Promise.resolve(null);
                });

                // Handle stream errors
                stream.on('error', (error: Error) => {
                    console.error(`[ERROR] Stream error: ${error.message}`);
                    if (connectionActive && ws.readyState === WebSocket.OPEN) {
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

            } catch (error) {
                console.error(`[ERROR] Failed to set up LSP:`, error);
                if (connectionActive && ws.readyState === WebSocket.OPEN) {
                    ws.close(1011, `Failed to start language server: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
                cleanup();
            }
        });
    } catch (error) {
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
