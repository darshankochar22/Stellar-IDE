/**
 * LSP Type Definitions
 * All type interfaces used by the LSP client
 */

export interface Diagnostic {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  message: string;
  severity: number;
}

export interface MonacoModel {
  uri?: { toString: () => string };
}

export interface MonacoEditor {
  getModels: () => MonacoModel[];
  setModelMarkers: (model: MonacoModel, owner: string, markers: MonacoMarker[]) => void;
}

export interface MonacoMarker {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  message: string;
  severity: number;
}

export interface MonacoInstance {
  editor: MonacoEditor;
}

export interface WindowWithMonaco {
  monacoInstance?: MonacoInstance;
}

export interface InlayHint {
  position: { line: number; character: number };
  label: string | { value: string }[];
  kind?: number; // 1 = Type, 2 = Parameter
  paddingLeft?: boolean;
  paddingRight?: boolean;
}

export interface LSPCapabilities {
  textDocument: {
    publishDiagnostics: {
      relatedInformation: boolean;
      versionSupport: boolean;
      tagSupport: { valueSet: number[] };
      codeDescriptionSupport: boolean;
      dataSupport: boolean;
    };
    synchronization: {
      didSave: boolean;
      didOpen: boolean;
      didClose: boolean;
      didChange: boolean;
      willSave: boolean;
      willSaveWaitUntil: boolean;
    };
    completion: {
      completionItem: {
        snippetSupport: boolean;
        commitCharactersSupport: boolean;
        documentationFormat: string[];
        deprecatedSupport: boolean;
        preselectSupport: boolean;
      };
      contextSupport: boolean;
    };
    hover: {
      contentFormat: string[];
    };
    signatureHelp: {
      signatureInformation: {
        documentationFormat: string[];
        parameterInformation: { labelOffsetSupport: boolean };
      };
    };
    definition: { linkSupport: boolean };
    references: Record<string, never>;
    documentHighlight: Record<string, never>;
    documentSymbol: {
      hierarchicalDocumentSymbolSupport: boolean;
    };
    codeAction: {
      codeActionLiteralSupport: {
        codeActionKind: {
          valueSet: string[];
        };
      };
    };
    formatting: Record<string, never>;
    rangeFormatting: Record<string, never>;
    rename: { prepareSupport: boolean };
    inlayHint: Record<string, never>;
  };
  workspace: {
    workspaceFolders: boolean;
    didChangeConfiguration: { dynamicRegistration: boolean };
    symbol: Record<string, never>;
  };
}

export interface LSPInitializeParams {
  processId: null;
  rootUri: string;
  capabilities: LSPCapabilities;
  workspaceFolders: { uri: string; name: string }[];
}

export interface LSPMessage {
  jsonrpc: '2.0';
  id?: number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { message: string };
}
