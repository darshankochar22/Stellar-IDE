"use strict";
/**
 * Docker Operations for LSP Server
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.docker = void 0;
exports.inspectContainer = inspectContainer;
exports.createRustAnalyzerExec = createRustAnalyzerExec;
exports.startExec = startExec;
exports.destroyStream = destroyStream;
const dockerode_1 = __importDefault(require("dockerode"));
exports.docker = new dockerode_1.default({ socketPath: '/var/run/docker.sock' });
/**
 * Inspect a Docker container
 */
function inspectContainer(containerId) {
    return new Promise((resolve, reject) => {
        const container = exports.docker.getContainer(containerId);
        container.inspect((err, data) => {
            if (err) {
                reject(new Error(`Container inspect error: ${err.message}`));
                return;
            }
            if (!data) {
                reject(new Error('Container data is undefined'));
                return;
            }
            resolve(data);
        });
    });
}
/**
 * Create an exec instance for rust-analyzer
 */
function createRustAnalyzerExec(containerId, workspacePath) {
    return new Promise((resolve, reject) => {
        const container = exports.docker.getContainer(containerId);
        container.exec({
            Cmd: ['rust-analyzer'],
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            Tty: false,
            WorkingDir: workspacePath,
            Env: ['RUST_BACKTRACE=1'],
        }, (err, exec) => {
            if (err) {
                reject(new Error(`Exec creation failed: ${err.message}`));
                return;
            }
            if (!exec) {
                reject(new Error('Exec instance is undefined'));
                return;
            }
            resolve(exec);
        });
    });
}
/**
 * Start an exec instance and get the stream
 */
function startExec(exec) {
    return new Promise((resolve, reject) => {
        exec.start({ hijack: true, stdin: true }, (err, stream) => {
            if (err) {
                reject(new Error(`Exec start failed: ${err.message}`));
                return;
            }
            if (!stream) {
                reject(new Error('Exec stream is undefined'));
                return;
            }
            resolve(stream);
        });
    });
}
/**
 * Destroy a stream safely
 */
function destroyStream(stream) {
    if ('destroy' in stream && typeof stream.destroy === 'function') {
        stream.destroy();
    }
}
//# sourceMappingURL=docker.js.map