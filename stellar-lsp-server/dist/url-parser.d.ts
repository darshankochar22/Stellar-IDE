/**
 * URL Parameter Parser
 */
import { IncomingMessage } from 'http';
import { ConnectionParams } from './types';
/**
 * Parse connection parameters from WebSocket request
 */
export declare function parseConnectionParams(request: IncomingMessage): ConnectionParams | null;
