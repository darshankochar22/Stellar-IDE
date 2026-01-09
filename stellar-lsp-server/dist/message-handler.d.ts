/**
 * Message Handler for LSP Protocol
 */
import { WebSocket } from 'ws';
import { ConnectionState } from './types';
/**
 * Process a single LSP message
 */
export declare function processMessage(dataStr: string, ws: WebSocket, state: ConnectionState): void;
/**
 * Create a message handler for WebSocket
 */
export declare function createMessageHandler(ws: WebSocket, state: ConnectionState): (data: Buffer | string) => void;
/**
 * Process all buffered messages
 */
export declare function processBufferedMessages(ws: WebSocket, state: ConnectionState): void;
