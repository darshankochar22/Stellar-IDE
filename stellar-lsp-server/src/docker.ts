/**
 * Docker Operations for LSP Server
 */

import Docker from 'dockerode';
import { ContainerInspectInfo, ExecStartOptions } from './types';

export const docker = new Docker({ socketPath: '/var/run/docker.sock' });

/**
 * Inspect a Docker container
 */
export function inspectContainer(
  containerId: string
): Promise<ContainerInspectInfo> {
  return new Promise((resolve, reject) => {
    const container = docker.getContainer(containerId);
    container.inspect((err: Error | null, data?: ContainerInspectInfo) => {
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
export function createRustAnalyzerExec(
  containerId: string,
  workspacePath: string
): Promise<Docker.Exec> {
  return new Promise((resolve, reject) => {
    const container = docker.getContainer(containerId);
    container.exec(
      {
        Cmd: ['rust-analyzer'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
        WorkingDir: workspacePath,
        Env: ['RUST_BACKTRACE=1'],
      },
      (err: Error | null, exec?: Docker.Exec) => {
        if (err) {
          reject(new Error(`Exec creation failed: ${err.message}`));
          return;
        }
        if (!exec) {
          reject(new Error('Exec instance is undefined'));
          return;
        }
        resolve(exec);
      }
    );
  });
}

/**
 * Start an exec instance and get the stream
 */
export function startExec(exec: Docker.Exec): Promise<NodeJS.ReadWriteStream> {
  return new Promise((resolve, reject) => {
    exec.start(
      { hijack: true, stdin: true } as ExecStartOptions,
      (err: Error | null, stream?: NodeJS.ReadWriteStream) => {
        if (err) {
          reject(new Error(`Exec start failed: ${err.message}`));
          return;
        }
        if (!stream) {
          reject(new Error('Exec stream is undefined'));
          return;
        }
        resolve(stream);
      }
    );
  });
}

/**
 * Destroy a stream safely
 */
export function destroyStream(stream: NodeJS.ReadWriteStream): void {
  if ('destroy' in stream && typeof (stream as { destroy?: () => void }).destroy === 'function') {
    (stream as { destroy: () => void }).destroy();
  }
}
