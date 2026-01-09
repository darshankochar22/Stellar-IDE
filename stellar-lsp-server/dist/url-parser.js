"use strict";
/**
 * URL Parameter Parser
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseConnectionParams = parseConnectionParams;
/**
 * Parse connection parameters from WebSocket request
 */
function parseConnectionParams(request) {
    const baseUrl = `http://${request.headers.host || 'localhost'}`;
    const requestUrl = request.url || '/';
    try {
        const url = new URL(requestUrl, baseUrl);
        const urlParams = url.searchParams;
        const containerId = urlParams.get('containerId')?.trim();
        const workspacePath = urlParams.get('workspace')?.trim() || '/home/developer/workspace';
        if (!containerId) {
            return null;
        }
        return { containerId, workspacePath };
    }
    catch (error) {
        console.error('[ERROR] Failed to parse WebSocket URL:', error);
        return null;
    }
}
//# sourceMappingURL=url-parser.js.map