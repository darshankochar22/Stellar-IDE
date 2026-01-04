import { WebSocketServer, WebSocket } from 'ws';
import Docker from 'dockerode';
import {
    createMessageConnection,
    StreamMessageReader,
    StreamMessageWriter
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

type DockerCallback<T> = (err: Error | null, result?: T) => void;

const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const wss = new WebSocketServer({ port: 3001 });

console.log('[LSP] Server listening on port 3001');

// Server error handling
wss.on('error', (error: Error) => {
    console.error('[LSP] WebSocket server error:', error);
});

wss.on('listening', () => {
    console.log('[LSP] WebSocket server is ready');
});

wss.on('connection', (ws: WebSocket, request) => {
    console.log('[DEBUG] New WebSocket connection received');
    
    // Parse connection parameters
    const baseUrl = `http://${request.headers.host || 'localhost'}`;
    const requestUrl = request.url || '/';
    
    console.log(`[DEBUG] Raw URL: ${requestUrl}`);
    
    try {
        const url = new URL(requestUrl, baseUrl);
        const urlParams = url.searchParams;
        
        // Get and TRIM containerId to remove any leading/trailing spaces
        const containerId = urlParams.get('containerId')?.trim();
        const workspacePath = urlParams.get('workspace')?.trim() || '/home/developer/workspace';

        console.log(`[DEBUG] Parsed containerId: "${containerId}"`);
        console.log(`[DEBUG] Workspace path: "${workspacePath}"`);

        if (!containerId) {
            console.error('[ERROR] Missing or invalid containerId parameter');
            ws.close(1008, 'Missing containerId parameter');
            return;
        }

        console.log(`[LSP] New connection for container: "${containerId}"`);

        // Get Docker container reference
        const container = docker.getContainer(containerId);
        console.log(`[DEBUG] Got container reference for ID: ${containerId}`);

        // Step 1: Inspect container to check if it exists and is running
        console.log('[DEBUG] Calling container.inspect()...');
        container.inspect(async (inspectErr: Error | null, inspectData?: ContainerInspectInfo) => {
            console.log('[DEBUG] Container.inspect callback called');
            console.log('[DEBUG] Inspection error:', inspectErr?.message || 'none');
            console.log('[DEBUG] Data exists:', !!inspectData);
            console.log('[DEBUG] Container running:', inspectData?.State?.Running);
            
            if (inspectErr) {
                console.error(`[ERROR] Container inspect error: ${inspectErr.message}`);
                ws.close(1008, `Container not found: ${inspectErr.message}`);
                return;
            }

            if (!inspectData || !inspectData.State.Running) {
                console.error(`[ERROR] Container ${containerId} not running or not found`);
                ws.close(1008, 'Container not running');
                return;
            }

            console.log(`[LSP] Container ${containerId} is running`);

            try {
                // Step 2: Create exec instance for rust-analyzer
                console.log('[DEBUG] Creating Docker exec instance for rust-analyzer...');
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
                        console.log('[DEBUG] Docker.exec callback called');
                        console.log('[DEBUG] Exec error:', execErr?.message || 'none');
                        console.log('[DEBUG] Exec object exists:', !!execInstance);
                        
                        if (execErr) {
                            console.error('[ERROR] Exec creation failed:', execErr.message);
                            reject(new Error(`Exec creation failed: ${execErr.message}`));
                            return;
                        }
                        if (!execInstance) {
                            console.error('[ERROR] Exec instance is undefined');
                            reject(new Error('Exec instance is undefined'));
                            return;
                        }
                        console.log('[LSP] Exec instance created');
                        resolve(execInstance);
                    });
                });

                console.log(`[LSP] Created exec instance for rust-analyzer`);

                // Step 3: Start the exec to get a stream
                console.log('[DEBUG] Starting exec instance...');
                const stream = await new Promise<NodeJS.ReadWriteStream>((resolve, reject) => {
                    exec.start({ hijack: true, stdin: true } as ExecStartOptions, 
                        (startErr: Error | null, execStream?: NodeJS.ReadWriteStream) => {
                            console.log('[DEBUG] Exec.start callback called');
                            console.log('[DEBUG] Start error:', startErr?.message || 'none');
                            console.log('[DEBUG] Stream exists:', !!execStream);
                            
                            if (startErr) {
                                console.error('[ERROR] Exec start failed:', startErr.message);
                                reject(new Error(`Exec start failed: ${startErr.message}`));
                                return;
                            }
                            if (!execStream) {
                                console.error('[ERROR] Exec stream is undefined');
                                reject(new Error('Exec stream is undefined'));
                                return;
                            }
                            console.log('[LSP] Exec started successfully, got stream');
                            resolve(execStream);
                        }
                    );
                });

                console.log(`[LSP] Started rust-analyzer process`);

                // Step 4: Create LSP message connection
                console.log('[DEBUG] Creating LSP message connection...');
                const connection = createMessageConnection(
                    new StreamMessageReader(stream),
                    new StreamMessageWriter(stream)
                );
                console.log('[LSP] LSP message connection created');

                // Step 5: Set up message forwarding from WebSocket to rust-analyzer
                console.log('[DEBUG] Setting up WebSocket message handler...');
                ws.on('message', (data: Buffer | string) => {
                    console.log('[DEBUG] WebSocket message received');
                    
                    try {
                        const dataStr = typeof data === 'string' ? data : data.toString();
                        console.log('[DEBUG] Raw message:', dataStr.substring(0, 200));
                        
                        const message = JSON.parse(dataStr);
                        console.log('[DEBUG] Parsed message:', {
                            method: message.method,
                            id: message.id,
                            hasParams: !!message.params
                        });
                        
                        if (message.id !== undefined && message.id !== null) {
                            // This is a request (has an id)
                            console.log(`[DEBUG] Sending LSP request: ${message.method}`);
                            connection.sendRequest(message.method, message.params)
                                .then(result => {
                                    console.log(`[DEBUG] LSP request ${message.method} succeeded`);
                                    // Send response back to client
                                    if (ws.readyState === WebSocket.OPEN) {
                                        ws.send(JSON.stringify({
                                            jsonrpc: '2.0',
                                            id: message.id,
                                            result
                                        }));
                                        console.log(`[DEBUG] Sent response for request ID ${message.id}`);
                                    }
                                })
                                .catch(error => {
                                    console.error(`[ERROR] Request error for ${message.method}:`, error);
                                    if (ws.readyState === WebSocket.OPEN) {
                                        ws.send(JSON.stringify({
                                            jsonrpc: '2.0',
                                            id: message.id,
                                            error: { code: -32603, message: 'Internal error' }
                                        }));
                                    }
                                });
                        } else {
                            // This is a notification (no id)
                            console.log(`[DEBUG] Sending LSP notification: ${message.method}`);
                            connection.sendNotification(message.method, message.params);
                        }
                    } catch (error) {
                        console.error('[ERROR] Failed to parse WebSocket message:', error);
                    }
                });

                // Step 6: Forward diagnostics and notifications from rust-analyzer to WebSocket
                console.log('[DEBUG] Setting up LSP notification handlers...');
                connection.onNotification('textDocument/publishDiagnostics', (params: any) => {
                    console.log('[DEBUG] Received diagnostics notification');
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'textDocument/publishDiagnostics',
                            params
                        }));
                        console.log('[DEBUG] Forwarded diagnostics to WebSocket');
                    }
                });

                // Forward other notifications
                connection.onNotification((method: string, params: any) => {
                    if (method !== 'textDocument/publishDiagnostics' && ws.readyState === WebSocket.OPEN) {
                        console.log(`[DEBUG] Received LSP notification: ${method}`);
                        ws.send(JSON.stringify({
                            jsonrpc: '2.0',
                            method,
                            params
                        }));
                    }
                });

                // Handle LSP requests from rust-analyzer (if any)
                connection.onRequest((method: string, params: any) => {
                    console.log(`[DEBUG] Received LSP request from rust-analyzer: ${method}`);
                    // For now, return null for all requests
                    return Promise.resolve(null);
                });

                // Step 7: Listen for LSP connection
                console.log('[DEBUG] Starting to listen on LSP connection...');
                connection.listen();
                console.log(`[LSP] LSP connection established for container ${containerId}`);

                // Step 8: Set up cleanup handlers
                ws.on('close', () => {
                    console.log(`[LSP] WebSocket closed for container ${containerId}`);
                    connection.dispose();
                    console.log('[DEBUG] Connection disposed');
                    try {
                        // End the stream if writable
                        if (stream.writable) {
                            stream.end();
                            console.log('[DEBUG] Stream ended');
                        }
                        
                        // Force close any remaining connections
                        if ('destroy' in stream && typeof stream.destroy === 'function') {
                            stream.destroy();
                            console.log('[DEBUG] Stream destroyed');
                        }
                    } catch (error) {
                        // Ignore cleanup errors
                        console.debug('[DEBUG] Stream cleanup error (non-critical):', error);
                    }
                });

                ws.on('error', (error: Error) => {
                    console.error(`[ERROR] WebSocket error for ${containerId}:`, error);
                    connection.dispose();
                });

                // Handle stream errors
                stream.on('error', (error: Error) => {
                    console.error(`[ERROR] Stream error for ${containerId}:`, error);
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.close(1011, 'Stream error');
                    }
                });

                stream.on('close', () => {
                    console.log(`[DEBUG] Stream closed for container ${containerId}`);
                });

                // Log successful setup
                console.log(`[LSP] Setup complete for container ${containerId}. Ready for messages.`);

            } catch (error) {
                console.error(`[ERROR] Failed to set up LSP for ${containerId}:`, error);
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close(1011, `Failed to start language server: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
        });
    } catch (error) {
        console.error('[ERROR] Failed to parse WebSocket URL:', error);
        ws.close(1008, 'Invalid connection parameters');
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[LSP] Shutting down LSP server...');
    wss.close(() => {
        console.log('[LSP] WebSocket server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n[LSP] Received SIGTERM, shutting down LSP server...');
    wss.close(() => {
        console.log('[LSP] WebSocket server closed');
        process.exit(0);
    });
});