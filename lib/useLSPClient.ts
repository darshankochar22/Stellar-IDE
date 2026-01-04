import { useState, useEffect, useCallback, useRef } from 'react';

interface Diagnostic {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  message: string;
  severity: number;
}

export function useLSPClient(containerId: string | undefined, fileUri: string) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const messageQueue = useRef<any[]>([]);
  const versionRef = useRef(1);

  // Connect to LSP server
  const connect = useCallback(() => {
    if (!containerId) return null;

    const socket = new WebSocket(
      `ws://localhost:3001?containerId=${containerId}&workspace=/home/developer/workspace`
    );

    socket.onopen = () => {
      console.log('LSP WebSocket connected');
      setIsConnected(true);
      setWs(socket);
      
      // Send initialize request
      socket.send(JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          processId: 12345,
          rootUri: `file:///home/developer/workspace`,
          capabilities: {}
        },
        id: 1
      }));
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Handle initialize response
        if (message.id === 1) {
          console.log(' LSP initialized');
          // Send initialized notification
          socket.send(JSON.stringify({
            jsonrpc: '2.0',
            method: 'initialized',
            params: {}
          }));
        }
        
        // Handle diagnostics
        if (message.method === 'textDocument/publishDiagnostics') {
          const { uri, diagnostics } = message.params;
          
          // Convert diagnostics to Monaco markers format
          const markers = diagnostics.map((diag: Diagnostic) => ({
            startLineNumber: diag.range.start.line + 1,
            startColumn: diag.range.start.character + 1,
            endLineNumber: diag.range.end.line + 1,
            endColumn: diag.range.end.character + 1,
            message: diag.message,
            severity: diag.severity === 1 ? 8 :  // Monaco.MarkerSeverity.Error
                     diag.severity === 2 ? 4 :   // Monaco.MarkerSeverity.Warning
                     2                          // Monaco.MarkerSeverity.Info
          }));
          
          // Find the Monaco model and set markers
          const models = (window as any).monaco?.editor?.getModels() || [];
          const model = models.find((m: any) => m.uri?.toString() === uri);
          
          if (model && (window as any).monaco?.editor) {
            (window as any).monaco.editor.setModelMarkers(
              model,
              'rust-analyzer',
              markers
            );
            console.log(`📝 Set ${markers.length} markers for ${uri}`);
          }
        }
      } catch (error) {
        console.error('Failed to process LSP message:', error);
      }
    };

    socket.onclose = () => {
      console.log('🔌 LSP WebSocket disconnected');
      setIsConnected(false);
      setWs(null);
    };

    return socket;
  }, [containerId]);

  // Send text document open
  const openTextDocument = useCallback((text: string) => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !fileUri) return;

    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri: fileUri,
          languageId: 'rust',
          version: versionRef.current,
          text
        }
      }
    }));
  }, [ws, fileUri]);

  // Send text document change
  const changeTextDocument = useCallback((text: string) => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !fileUri) return;

    versionRef.current += 1;
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      method: 'textDocument/didChange',
      params: {
        textDocument: {
          uri: fileUri,
          version: versionRef.current
        },
        contentChanges: [{ text }]
      }
    }));
  }, [ws, fileUri]);

  useEffect(() => {
    if (containerId) {
      const socket = connect();
      return () => {
        if (socket) socket.close();
      };
    }
  }, [connect, containerId]);

  return {
    isConnected,
    openTextDocument,
    changeTextDocument
  };
}