/**
 * URL Parameter Parser
 */

import { IncomingMessage } from 'http';
import { ConnectionParams } from './types';

/**
 * Parse connection parameters from WebSocket request
 */
export function parseConnectionParams(request: IncomingMessage): ConnectionParams | null {
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
  } catch (error) {
    console.error('[ERROR] Failed to parse WebSocket URL:', error);
    return null;
  }
}
