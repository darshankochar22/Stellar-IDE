/**
 * LSP Capabilities Configuration
 * Defines what features the client supports
 */

import { LSPCapabilities } from './types';

export const LSP_CAPABILITIES: LSPCapabilities = {
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
};

export function createInitializeRequest(id: number) {
  return {
    jsonrpc: '2.0' as const,
    method: 'initialize',
    params: {
      processId: null,
      rootUri: 'file:///home/developer/workspace',
      capabilities: LSP_CAPABILITIES,
      workspaceFolders: [
        {
          uri: 'file:///home/developer/workspace',
          name: 'workspace',
        },
      ],
    },
    id,
  };
}
