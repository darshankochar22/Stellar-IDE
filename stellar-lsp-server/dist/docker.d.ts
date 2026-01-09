/**
 * Docker Operations for LSP Server
 */
import Docker from 'dockerode';
import { ContainerInspectInfo } from './types';
export declare const docker: Docker;
/**
 * Inspect a Docker container
 */
export declare function inspectContainer(containerId: string): Promise<ContainerInspectInfo>;
/**
 * Create an exec instance for rust-analyzer
 */
export declare function createRustAnalyzerExec(containerId: string, workspacePath: string): Promise<Docker.Exec>;
/**
 * Start an exec instance and get the stream
 */
export declare function startExec(exec: Docker.Exec): Promise<NodeJS.ReadWriteStream>;
/**
 * Destroy a stream safely
 */
export declare function destroyStream(stream: NodeJS.ReadWriteStream): void;
