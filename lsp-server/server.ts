import { WebSocketServer } from 'ws';
import * as server from 'vscode-ws-jsonrpc/server';
import { execSync } from 'child_process';

const PORT = 3001;

console.log('Starting LSP WebSocket Server...');

// Find running Soroban container
function findContainer(): string | null {
    try {
        const result = execSync(
            'docker ps --filter "ancestor=stellar-sandbox:v1" --format "{{.Names}}"',
            { encoding: 'utf-8' }
        ).trim();

        const containers = result.split('\n').filter(name => name.startsWith('soroban-'));

        if (containers.length > 0) {
            console.log(`Found container: ${containers[0]}`);
            return containers[0];
        }

        console.warn('No Soroban containers found');
        return null;
    } catch (error) {
        console.error('Error finding container:', error);
        return null;
    }
}

// Verify rust-analyzer exists in container
function verifyRustAnalyzer(containerId: string): boolean {
    try {
        execSync(`docker exec ${containerId} which rust-analyzer`, { encoding: 'utf-8' });
        console.log('rust-analyzer verified');
        return true;
    } catch {
        console.error('rust-analyzer not found in container');
        return false;
    }
}

// Start WebSocket server
const wss = new WebSocketServer({ port: PORT });
console.log(`WebSocket server running on port ${PORT}`);
console.log('LSP server ready and waiting for connections');

wss.on('connection', (ws) => {
    console.log('Client connected');

    let serverProcess: any = null;
    let socketConnection: any = null;

    // Find and verify container
    const containerId = findContainer();
    if (!containerId || !verifyRustAnalyzer(containerId)) {
        console.error('Cannot start rust-analyzer');
        ws.close();
        return;
    }

    // Create WebSocket connection handler
    socketConnection = server.createWebSocketConnection({
        send: (content) => {
            if (ws.readyState === ws.OPEN) {
                try {
                    ws.send(content);
                } catch (error) {
                    console.error('Error sending message:', error);
                }
            }
        },
        onMessage: (cb) => ws.on('message', cb),
        onError: (cb) => ws.on('error', cb),
        onClose: (cb) => ws.on('close', cb),
        dispose: () => {
            if (ws.readyState === ws.OPEN || ws.readyState === ws.CONNECTING) {
                ws.close();
            }
        }
    });

    // Create the rust-analyzer process first
    try {
        console.log(`Starting rust-analyzer in container: ${containerId}`);
        serverProcess = server.createServerProcess(
            'JSON',
            'docker',
            ['exec', '-i', '-w', '/home/developer/workspace', containerId, 'rust-analyzer']
        );

        if (!serverProcess) {
            throw new Error('Failed to create server process');
        }
        console.log('rust-analyzer process started');
    } catch (error) {
        console.error('Error starting rust-analyzer:', error);
        ws.close();
        return;
    }

    // Forward messages between the established process and connection
    try {
        server.forward(socketConnection, serverProcess, (message) => {
            if (message && typeof message === 'object' && 'method' in message) {
                const msg = message as any;

                if (msg.method === 'initialize' && msg.params) {
                    msg.params.processId = process.pid;

                    if (!msg.params.workspaceFolders) {
                        msg.params.workspaceFolders = [{
                            uri: 'file:///home/developer/workspace',
                            name: 'workspace'
                        }];
                    }

                    console.log('Initialize message processed');
                }
            }

            return message;
        });
        console.log('Message forwarding active');
    } catch (error) {
        console.error('Critical error setting up message forwarding:', error);
        if (serverProcess) {
            serverProcess.dispose?.();
        }
        ws.close();
        return;
    }

    // Keep connection alive
    const pingInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
            ws.ping();
        } else {
            clearInterval(pingInterval);
        }
    }, 30000);

    // Handle disconnection
    ws.on('close', () => {
        console.log('Client disconnected');
        clearInterval(pingInterval);
        if (serverProcess) {
            try {
                serverProcess.dispose?.();
            } catch (e) {
                console.error('Error disposing server process:', e);
            }
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        if (serverProcess) {
            try {
                serverProcess.dispose?.();
            } catch (e) {
                console.error('Error disposing server process:', e);
            }
        }
    });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down...');
    wss.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
});