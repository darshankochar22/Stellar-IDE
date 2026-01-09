"use strict";
/**
 * Message Handler for LSP Protocol
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.processMessage = processMessage;
exports.createMessageHandler = createMessageHandler;
exports.processBufferedMessages = processBufferedMessages;
const ws_1 = require("ws");
/**
 * Process a single LSP message
 */
function processMessage(dataStr, ws, state) {
    if (!state.connectionActive || !state.lspConnection)
        return;
    try {
        const message = JSON.parse(dataStr);
        console.log(`[WS→LSP] ${message.method || 'response'} (id: ${message.id || 'none'})`);
        if (message.id !== undefined && message.id !== null) {
            // Request - send and wait for response
            state.lspConnection
                .sendRequest(message.method, message.params)
                .then((result) => {
                if (state.connectionActive && ws.readyState === ws_1.WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        jsonrpc: '2.0',
                        id: message.id,
                        result,
                    }));
                }
            })
                .catch((error) => {
                if (state.connectionActive && ws.readyState === ws_1.WebSocket.OPEN) {
                    console.error(`Request error: ${error.message}`);
                    ws.send(JSON.stringify({
                        jsonrpc: '2.0',
                        id: message.id,
                        error: { code: -32603, message: error.message || 'Internal error' },
                    }));
                }
            });
        }
        else {
            // Notification - fire and forget
            try {
                state.lspConnection.sendNotification(message.method, message.params);
            }
            catch {
                // Ignore notification errors
            }
        }
    }
    catch (error) {
        console.error('[ERROR] Failed to process message:', error);
    }
}
/**
 * Create a message handler for WebSocket
 */
function createMessageHandler(ws, state) {
    return (data) => {
        const dataStr = typeof data === 'string' ? data : data.toString();
        if (!state.isLspReady) {
            console.log(`[Buffer] Buffering message until LSP ready`);
            state.messageBuffer.push(dataStr);
            return;
        }
        processMessage(dataStr, ws, state);
    };
}
/**
 * Process all buffered messages
 */
function processBufferedMessages(ws, state) {
    console.log(`[LSP] Ready! Processing ${state.messageBuffer.length} buffered messages`);
    for (const bufferedMsg of state.messageBuffer) {
        processMessage(bufferedMsg, ws, state);
    }
    state.messageBuffer.length = 0;
}
//# sourceMappingURL=message-handler.js.map