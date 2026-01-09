/**
 * LSP Module Exports
 */

// Main hook
export { useLSPClient } from './useLSPClient';

// Types
export type {
  Diagnostic,
  MonacoModel,
  MonacoEditor,
  MonacoMarker,
  MonacoInstance,
  WindowWithMonaco,
  InlayHint,
  LSPCapabilities,
  LSPInitializeParams,
  LSPMessage,
} from './types';

// Capabilities
export { LSP_CAPABILITIES, createInitializeRequest } from './capabilities';

// Diagnostics
export {
  convertToMonacoMarkers,
  findMatchingModel,
  applyMarkersToEditor,
  handleDiagnostics,
} from './diagnostics';

// Requests
export {
  createRequestId,
  sendDidOpen,
  sendDidChange,
  sendInitialized,
  requestInlayHints,
  requestHover,
  requestCompletion,
  requestDefinition,
  requestSignatureHelp,
  requestFormatting,
} from './requests';
