"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const dockerode_1 = __importDefault(require("dockerode"));
const node_1 = require("vscode-languageserver/node");
const docker = new dockerode_1.default({ socketPath: "/var/run/docker.sock" });
const wss = new ws_1.WebSocketServer({ port: 3001 });
console.log("🚀 LSP Server listening on port 3001");
wss.on("connection", (ws, request) => {
  // Parse connection parameters
  const baseUrl = `http://${request.headers.host || "localhost"}`;
  const requestUrl = request.url || "/";
  const urlParams = new URL(requestUrl, baseUrl).searchParams;
  const containerId = urlParams.get("containerId");
  const workspacePath = urlParams.get("workspace") || "/workspace";
  if (!containerId) {
    console.error("Missing containerId parameter");
    ws.close(1008, "Missing containerId parameter");
    return;
  }
  console.log(`🔗 New connection for container: ${containerId}`);
  // Get Docker container reference
  const container = docker.getContainer(containerId);
  // Step 1: Inspect container to check if it exists and is running
  container.inspect(async (inspectErr, inspectData) => {
    if (inspectErr) {
      console.error(`Container inspect error: ${inspectErr.message}`);
      ws.close(1008, `Container not found: ${inspectErr.message}`);
      return;
    }
    if (!inspectData || !inspectData.State.Running) {
      console.error(`Container ${containerId} not running or not found`);
      ws.close(1008, "Container not running");
      return;
    }
    console.log(`Container ${containerId} is running`);
    try {
      // Step 2: Create exec instance for rust-analyzer
      const exec = await new Promise((resolve, reject) => {
        container.exec(
          {
            Cmd: ["rust-analyzer"],
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            Tty: false,
            WorkingDir: workspacePath,
            Env: ["RUST_BACKTRACE=1"],
          },
          (execErr, execInstance) => {
            if (execErr) {
              reject(new Error(`Exec creation failed: ${execErr.message}`));
              return;
            }
            if (!execInstance) {
              reject(new Error("Exec instance is undefined"));
              return;
            }
            resolve(execInstance);
          }
        );
      });
      console.log(`Created exec instance for rust-analyzer`);
      // Step 3: Start the exec to get a stream
      const stream = await new Promise((resolve, reject) => {
        exec.start({ hijack: true, stdin: true }, (startErr, execStream) => {
          if (startErr) {
            reject(new Error(`Exec start failed: ${startErr.message}`));
            return;
          }
          if (!execStream) {
            reject(new Error("Exec stream is undefined"));
            return;
          }
          resolve(execStream);
        });
      });
      console.log(`Started rust-analyzer process`);
      // Step 4: Create LSP message connection
      const connection = (0, node_1.createMessageConnection)(
        new node_1.StreamMessageReader(stream),
        new node_1.StreamMessageWriter(stream)
      );
      // Step 5: Set up message forwarding from WebSocket to rust-analyzer
      ws.on("message", (data) => {
        try {
          const dataStr = typeof data === "string" ? data : data.toString();
          const message = JSON.parse(dataStr);
          if (message.id !== undefined && message.id !== null) {
            // This is a request (has an id)
            connection
              .sendRequest(message.method, message.params)
              .then((result) => {
                // Send response back to client
                if (ws.readyState === ws_1.WebSocket.OPEN) {
                  ws.send(
                    JSON.stringify({
                      jsonrpc: "2.0",
                      id: message.id,
                      result,
                    })
                  );
                }
              })
              .catch((error) => {
                console.error("Request error:", error);
                if (ws.readyState === ws_1.WebSocket.OPEN) {
                  ws.send(
                    JSON.stringify({
                      jsonrpc: "2.0",
                      id: message.id,
                      error: { code: -32603, message: "Internal error" },
                    })
                  );
                }
              });
          } else {
            // This is a notification (no id)
            connection.sendNotification(message.method, message.params);
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      });
      // Step 6: Forward diagnostics and notifications from rust-analyzer to WebSocket
      connection.onNotification("textDocument/publishDiagnostics", (params) => {
        if (ws.readyState === ws_1.WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              jsonrpc: "2.0",
              method: "textDocument/publishDiagnostics",
              params,
            })
          );
        }
      });
      // Forward other notifications
      connection.onNotification((method, params) => {
        if (
          method !== "textDocument/publishDiagnostics" &&
          ws.readyState === ws_1.WebSocket.OPEN
        ) {
          ws.send(
            JSON.stringify({
              jsonrpc: "2.0",
              method,
              params,
            })
          );
        }
      });
      // Handle LSP requests from rust-analyzer (if any)
      connection.onRequest((method, params) => {
        console.log(`Received LSP request: ${method}`);
        // For now, return null for all requests
        return Promise.resolve(null);
      });
      // Step 7: Listen for LSP connection
      connection.listen();
      console.log(`LSP connection established for container ${containerId}`);
      // Step 8: Set up cleanup handlers
      ws.on("close", () => {
        console.log(`🔌 WebSocket closed for container ${containerId}`);
        connection.dispose();
        try {
          // End the stream if writable
          if (stream.writable) {
            stream.end();
          }
          // Force close any remaining connections
          if ("destroy" in stream && typeof stream.destroy === "function") {
            stream.destroy();
          }
        } catch (error) {
          // Ignore cleanup errors
          console.debug("Stream cleanup error (non-critical):", error);
        }
      });
      // Handle stream errors
      stream.on("error", (error) => {
        console.error(`Stream error for ${containerId}:`, error);
        if (ws.readyState === ws_1.WebSocket.OPEN) {
          ws.close(1011, "Stream error");
        }
      });
    } catch (error) {
      console.error(`Failed to set up LSP for ${containerId}:`, error);
      if (ws.readyState === ws_1.WebSocket.OPEN) {
        ws.close(
          1011,
          `Failed to start language server: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }
  });
});
// Server error handling
wss.on("error", (error) => {
  console.error("WebSocket server error:", error);
});
wss.on("listening", () => {
  console.log("WebSocket server is ready");
});
// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down LSP server...");
  wss.close(() => {
    console.log("WebSocket server closed");
    process.exit(0);
  });
});
//# sourceMappingURL=server.js.map
