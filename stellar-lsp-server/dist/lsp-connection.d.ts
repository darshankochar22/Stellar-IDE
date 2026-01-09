/**
 * LSP Connection Management
 */
import { WebSocket } from 'ws';
import { PassThrough } from 'stream';
import { MessageConnection } from 'vscode-languageserver/node';
import { ConnectionState } from './types';
/**
 * Create LSP message connection from Docker exec stream
 */
export declare function createLSPConnection(execStream: NodeJS.ReadWriteStream): {
    connection: MessageConnection;
    stdout: PassThrough;
    stderr: PassThrough;
    stdinStream: PassThrough;
};
/**
 * Set up LSP notification handlers
 */
export declare function setupNotificationHandlers(connection: MessageConnection, ws: WebSocket, state: ConnectionState, containerId: string): void;
/**
 * Set up stream error handlers
 */
export declare function setupStreamHandlers(execStream: NodeJS.ReadWriteStream, stderr: PassThrough, ws: WebSocket, state: ConnectionState, containerId: string): void;
/**
 * Cleanup function for connection resources
 */
export declare function createCleanup(state: ConnectionState): () => void;
