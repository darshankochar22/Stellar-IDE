/**
 * LSP Server Type Definitions
 */
import { WebSocket } from 'ws';
import { MessageConnection } from 'vscode-languageserver/node';
export interface ContainerInspectInfo {
    State: {
        Running: boolean;
        Status?: string;
    };
    Config?: {
        WorkingDir?: string;
    };
}
export interface ExecStartOptions {
    hijack: boolean;
    stdin: boolean;
}
export interface ConnectionState {
    connectionActive: boolean;
    lspConnection: MessageConnection | null;
    execStream: NodeJS.ReadWriteStream | null;
    messageBuffer: string[];
    isLspReady: boolean;
}
export interface ConnectionParams {
    containerId: string;
    workspacePath: string;
}
export interface WSMessageHandler {
    ws: WebSocket;
    state: ConnectionState;
    processMessage: (dataStr: string) => void;
}
