import { useState, useEffect, useCallback, useRef } from 'react';

interface Diagnostic {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  message: string;
  severity: number;
}

interface MonacoModel {
  uri?: { toString: () => string };
}

interface MonacoEditor {
  getModels: () => MonacoModel[];
  setModelMarkers: (model: MonacoModel, owner: string, markers: MonacoMarker[]) => void;
}

interface MonacoMarker {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  message: string;
  severity: number;
}

interface MonacoInstance {
  editor: MonacoEditor;
}

interface WindowWithMonaco {
  monacoInstance?: MonacoInstance;
}

export function useLSPClient(containerId: string | undefined, fileUri: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [diagnosticsCount, setDiagnosticsCount] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const versionRef = useRef(1);
  const isInitializedRef = useRef(false);
  const currentFileUriRef = useRef<string>('');
  const openedFilesRef = useRef<Set<string>>(new Set());

  // Stable connection function - only depends on containerId
  useEffect(() => {
    if (!containerId) {
      console.log('[LSP Client] No containerId, skipping connection');
      return;
    }

    // Prevent duplicate connections - check for OPEN or CONNECTING states
    if (wsRef.current) {
      const state = wsRef.current.readyState;
      if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
        console.log('[LSP Client] Already connected/connecting, skipping');
        return;
      }
    }

    console.log(`[LSP Client] Connecting to container: ${containerId}`);

    const wsUrl = `ws://localhost:3001?containerId=${containerId}&workspace=/home/developer/workspace`;
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      console.log('[LSP Client] ✓ WebSocket connected');
      setConnectionError(null);
      setIsConnected(true);
      
      // Send initialize request
      // processId: null is valid for browser clients per LSP spec
      const initRequest = {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          processId: null,
          rootUri: 'file:///home/developer/workspace',
          capabilities: {
            textDocument: {
              publishDiagnostics: {
                relatedInformation: true,
                versionSupport: true,
                tagSupport: { valueSet: [1, 2] },
                codeDescriptionSupport: true,
                dataSupport: true,
              },
              synchronization: {
                didSave: true,
                didOpen: true,
                didClose: true,
                didChange: true,
                willSave: true,
                willSaveWaitUntil: true,
              },
              completion: {
                completionItem: {
                  snippetSupport: true,
                  commitCharactersSupport: true,
                  documentationFormat: ['markdown', 'plaintext'],
                  deprecatedSupport: true,
                  preselectSupport: true,
                },
                contextSupport: true,
              },
              hover: {
                contentFormat: ['markdown', 'plaintext'],
              },
              signatureHelp: {
                signatureInformation: {
                  documentationFormat: ['markdown', 'plaintext'],
                  parameterInformation: { labelOffsetSupport: true },
                },
              },
              definition: { linkSupport: true },
              references: {},
              documentHighlight: {},
              documentSymbol: {
                hierarchicalDocumentSymbolSupport: true,
              },
              codeAction: {
                codeActionLiteralSupport: {
                  codeActionKind: {
                    valueSet: ['quickfix', 'refactor', 'source'],
                  },
                },
              },
              formatting: {},
              rangeFormatting: {},
              rename: { prepareSupport: true },
              inlayHint: {},
            },
            workspace: {
              workspaceFolders: true,
              didChangeConfiguration: { dynamicRegistration: true },
              symbol: {},
            },
          },
          workspaceFolders: [
            {
              uri: 'file:///home/developer/workspace',
              name: 'workspace',
            },
          ],
        },
        id: 1
      };
      
      socket.send(JSON.stringify(initRequest));
      console.log('[LSP Client] Sent initialize request');
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Handle initialize response
        if (message.id === 1 && !message.error) {
          console.log('[LSP Client] ✓ LSP initialized');
          isInitializedRef.current = true;
          
          // Send initialized notification
          socket.send(JSON.stringify({
            jsonrpc: '2.0',
            method: 'initialized',
            params: {}
          }));
          
          // If we have a pending file to open, open it now
          if (currentFileUriRef.current) {
            console.log('[LSP Client] Opening pending file after init:', currentFileUriRef.current);
          }
        } else if (message.id === 1 && message.error) {
          console.error('[LSP Client] Initialize failed:', message.error);
          setConnectionError(`LSP init failed: ${message.error.message}`);
        }
        
        // Handle diagnostics
        if (message.method === 'textDocument/publishDiagnostics') {
          const { uri, diagnostics } = message.params;
          console.log(`[LSP Client] 📋 Received ${diagnostics.length} diagnostics for ${uri}`);
          
          setDiagnosticsCount(diagnostics.length);
          
          if (diagnostics.length === 0) {
            console.log('[LSP Client] No diagnostics to display');
          }
          
          // Convert to Monaco markers - severity: 8=Error, 4=Warning, 2=Info, 1=Hint
          const markers: MonacoMarker[] = diagnostics.map((diag: Diagnostic) => ({
            startLineNumber: diag.range.start.line + 1,
            startColumn: diag.range.start.character + 1,
            endLineNumber: diag.range.end.line + 1,
            endColumn: diag.range.end.character + 1,
            message: diag.message,
            severity: diag.severity === 1 ? 8 : diag.severity === 2 ? 4 : 2
          }));
          
          console.log('[LSP Client] Converted markers:', markers);
          
          // Set markers on Monaco model
          const windowWithMonaco = window as WindowWithMonaco;
          
          if (!windowWithMonaco.monacoInstance) {
            console.warn('[LSP Client] Monaco not available yet, queuing diagnostics...');
            // Store diagnostics to apply later
            setTimeout(() => {
              const retry = window as WindowWithMonaco;
              if (retry.monacoInstance?.editor) {
                const retryModels = retry.monacoInstance.editor.getModels() || [];
                const rsModel = retryModels.find(m => m.uri?.toString().endsWith('.rs'));
                if (rsModel) {
                  retry.monacoInstance.editor.setModelMarkers(rsModel, 'rust-analyzer', markers);
                  console.log('[LSP Client] ✓ Delayed: Set markers after Monaco ready');
                }
              }
            }, 1000);
            return;
          }
          
          if (!windowWithMonaco.monacoInstance.editor) {
            console.error('[LSP Client] Monaco editor not available!');
            return;
          }
          
          const models = windowWithMonaco.monacoInstance.editor.getModels() || [];
          const modelUris = models.map(m => m.uri?.toString());
          console.log('[LSP Client] Available models:', modelUris);
          console.log('[LSP Client] Diagnostic URI:', uri);
          
          // Extract just the filename from the diagnostic URI
          const diagnosticFilename = uri.split('/').pop() || '';
          
          // Try to find model by multiple matching strategies
          let model = null;
          
          for (const m of models) {
            const modelUri = m.uri?.toString() || '';
            
            // Strategy 1: Exact match
            if (modelUri === uri) {
              model = m;
              console.log('[LSP Client] ✓ Exact URI match');
              break;
            }
            
            // Strategy 2: Both URIs contain same filename
            const modelFilename = modelUri.split('/').pop() || '';
            if (modelFilename === diagnosticFilename && diagnosticFilename.endsWith('.rs')) {
              model = m;
              console.log('[LSP Client] ✓ Filename match:', diagnosticFilename);
              break;
            }
            
            // Strategy 3: Path contains the other
            const uriPath = uri.replace('file://', '');
            if (modelUri.includes(uriPath) || uriPath.includes(modelUri.replace('file://', ''))) {
              model = m;
              console.log('[LSP Client] ✓ Path contains match');
              break;
            }
          }
          
          if (model && windowWithMonaco.monacoInstance.editor) {
            // Clear existing markers first, then set new ones
            windowWithMonaco.monacoInstance.editor.setModelMarkers(model, 'rust-analyzer', []);
            windowWithMonaco.monacoInstance.editor.setModelMarkers(model, 'rust-analyzer', markers);
            console.log(`[LSP Client] ✓ Set ${markers.length} markers on model`);
            console.log('[LSP Client] Markers:', JSON.stringify(markers, null, 2));
          } else {
            console.error('[LSP Client] ❌ Model not found for URI:', uri);
            console.log('[LSP Client] Available URIs:', modelUris);
            console.log('[LSP Client] Looking for filename:', diagnosticFilename);
            
            // If no model found but we have models, try setting on the first .rs model
            const rsModel = models.find(m => m.uri?.toString().endsWith('.rs'));
            if (rsModel && windowWithMonaco.monacoInstance.editor) {
              windowWithMonaco.monacoInstance.editor.setModelMarkers(rsModel, 'rust-analyzer', markers);
              console.log(`[LSP Client] ⚠️ Fallback: Set ${markers.length} markers on first .rs model`);
            }
          }
        }
      } catch (error) {
        console.error('[LSP Client] Message parse error:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('[LSP Client] WebSocket error:', error);
      setConnectionError('WebSocket connection error');
    };

    socket.onclose = (event) => {
      console.log(`[LSP Client] WebSocket closed (code: ${event.code})`);
      setIsConnected(false);
      isInitializedRef.current = false;
      openedFilesRef.current.clear();
      wsRef.current = null;
    };

    // Capture ref values for cleanup
    const openedFiles = openedFilesRef.current;
    
    return () => {
      console.log('[LSP Client] Cleanup: closing connection');
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
      wsRef.current = null;
      isInitializedRef.current = false;
      openedFiles.clear();
    };
  }, [containerId]); // Only depend on containerId

  // Update current file URI ref when it changes
  useEffect(() => {
    currentFileUriRef.current = fileUri;
  }, [fileUri]);

  // Open text document - uri passed directly to avoid stale ref issues
  const openTextDocument = useCallback((text: string, uri?: string) => {
    const ws = wsRef.current;
    const effectiveUri = uri || currentFileUriRef.current;
    
    if (!ws || ws.readyState !== WebSocket.OPEN || !effectiveUri) {
      console.log('[LSP Client] Cannot open doc - not connected or no URI');
      console.log(`[LSP Client] ws: ${!!ws}, readyState: ${ws?.readyState}, uri: ${effectiveUri}`);
      return;
    }

    if (!isInitializedRef.current) {
      console.log('[LSP Client] Cannot open doc - not initialized yet');
      return;
    }

    // Don't reopen already opened files
    if (openedFilesRef.current.has(effectiveUri)) {
      console.log('[LSP Client] File already opened:', effectiveUri);
      return;
    }

    console.log(`[LSP Client] 📤 Opening document: ${effectiveUri}`);
    versionRef.current = 1;
    
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri: effectiveUri,
          languageId: 'rust',
          version: versionRef.current,
          text
        }
      }
    }));
    
    openedFilesRef.current.add(effectiveUri);
  }, []);

  // Change text document - uri passed directly to avoid stale ref issues
  const changeTextDocument = useCallback((text: string, uri?: string) => {
    const ws = wsRef.current;
    const effectiveUri = uri || currentFileUriRef.current;
    
    if (!ws || ws.readyState !== WebSocket.OPEN || !effectiveUri) {
      return;
    }

    if (!isInitializedRef.current) {
      return;
    }

    // Only send changes for opened files
    if (!openedFilesRef.current.has(effectiveUri)) {
      return;
    }

    versionRef.current += 1;
    console.log(`[LSP Client] 📤 Sending change for ${effectiveUri}, version ${versionRef.current}`);
    
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      method: 'textDocument/didChange',
      params: {
        textDocument: {
          uri: effectiveUri,
          version: versionRef.current
        },
        contentChanges: [{ text }]
      }
    }));
  }, []);

  // Request inlay hints from LSP
  const requestInlayHints = useCallback((uri: string, range: { startLine: number; endLine: number }): Promise<InlayHint[]> => {
    return new Promise((resolve) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN || !isInitializedRef.current) {
        resolve([]);
        return;
      }

      const requestId = Date.now();
      
      const handleMessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          if (message.id === requestId) {
            ws.removeEventListener('message', handleMessage);
            resolve(message.result || []);
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.addEventListener('message', handleMessage);

      // Timeout after 5 seconds
      setTimeout(() => {
        ws.removeEventListener('message', handleMessage);
        resolve([]);
      }, 5000);

      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        method: 'textDocument/inlayHint',
        params: {
          textDocument: { uri },
          range: {
            start: { line: range.startLine, character: 0 },
            end: { line: range.endLine, character: 0 }
          }
        },
        id: requestId
      }));
    });
  }, []);

  return {
    isConnected,
    connectionError,
    diagnosticsCount,
    openTextDocument,
    changeTextDocument,
    requestInlayHints,
    wsRef
  };
}

// Inlay hint interface
export interface InlayHint {
  position: { line: number; character: number };
  label: string | { value: string }[];
  kind?: number; // 1 = Type, 2 = Parameter
  paddingLeft?: boolean;
  paddingRight?: boolean;
}
