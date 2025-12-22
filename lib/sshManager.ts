import { Client, ConnectConfig } from 'ssh2';
import { Server } from 'net';
import fs from 'fs';

export interface VMConfig {
  host: string;
  port: number;
  username: string;
  privateKey?: string;
  privateKeyPath?: string;
  passphrase?: string;
  password?: string;
}

export interface SSHCommandResult {
  stdout: string;
  stderr: string;
  code: number | null;
  signal?: string;
}

export class SSHManager {
  private client: Client;
  private config: VMConfig;
  private isConnected: boolean = false;
  private connectionPromise: Promise<Client> | null = null;

  constructor(config: VMConfig) {
    this.config = config;
    this.client = new Client();
  }

  /**
   * Establish SSH connection (on-demand)
   * Returns existing connection if already connected
   */
  async connect(): Promise<Client> {
    if (this.isConnected) {
      return this.client;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      const connectConfig: ConnectConfig = {
        host: this.config.host,
        port: this.config.port || 22,
        username: this.config.username,
        readyTimeout: 30000,
        keepaliveInterval: 10000,
        keepaliveCountMax: 3
      };

      // Add authentication
      if (this.config.privateKey) {
        connectConfig.privateKey = this.config.privateKey;
        if (this.config.passphrase) {
          connectConfig.passphrase = this.config.passphrase;
        }
      } else if (this.config.privateKeyPath) {
        connectConfig.privateKey = fs.readFileSync(this.config.privateKeyPath);
        if (this.config.passphrase) {
          connectConfig.passphrase = this.config.passphrase;
        }
      } else if (this.config.password) {
        connectConfig.password = this.config.password;
      } else {
        // Try agent if no explicit auth provided
        connectConfig.agent = process.env.SSH_AUTH_SOCK;
      }

      this.client
        .on('ready', () => {
          console.log('SSH Connection established');
          this.isConnected = true;
          resolve(this.client);
        })
        .on('error', (err) => {
          console.error('SSH Connection error:', err);
          this.isConnected = false;
          this.connectionPromise = null;
          reject(err);
        })
        .on('end', () => {
          console.log('SSH Connection ended');
          this.isConnected = false;
          this.connectionPromise = null;
        })
        .on('close', (hadError) => {
          console.log('SSH Connection closed', hadError ? 'with error' : 'cleanly');
          this.isConnected = false;
          this.connectionPromise = null;
        })
        .connect(connectConfig);
    });

    return this.connectionPromise;
  }

  /**
   * Execute a single command on the VM
   */
  async executeCommand(command: string): Promise<SSHCommandResult> {
    await this.connect();
    
    return new Promise((resolve, reject) => {
      this.client.exec(command, { pty: true }, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let stdout = '';
        let stderr = '';

        stream
          .on('close', (code: number | null, signal?: string) => {
            resolve({ stdout, stderr, code, signal });
          })
          .on('data', (data: Buffer) => {
            stdout += data.toString();
          })
          .stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
          });
      });
    });
  }

  /**
   * Execute multiple commands sequentially
   */
  async executeCommands(commands: string[]): Promise<SSHCommandResult[]> {
    const results: SSHCommandResult[] = [];
    
    for (const command of commands) {
      try {
        const result = await this.executeCommand(command);
        results.push(result);
        
        // If command failed, optionally stop execution
        if (result.code !== 0) {
          console.warn(`Command failed: ${command}`, result);
          // You can throw here if you want to stop on first error
          // throw new Error(`Command failed: ${command}`);
        }
      } catch (error) {
        console.error(`Error executing command: ${command}`, error);
        results.push({
          stdout: '',
          stderr: error instanceof Error ? error.message : 'Unknown error',
          code: 1
        });
        break; // Stop on error
      }
    }
    
    return results;
  }

  /**
   * Open an interactive shell session
   * Useful for running Docker with interactive TTY
   */
  async openShell(): Promise<{ stream: Server; destroy: () => void }> {
    await this.connect();
    
    return new Promise((resolve, reject) => {
      this.client.shell({ term: 'xterm-256color' }, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        const destroy = () => {
          stream.end();
          this.client.end();
        };

        resolve({ stream, destroy });
      });
    });
  }

  /**
   * Upload file to VM via SCP
   */
  async uploadFile(localPath: string, remotePath: string): Promise<void> {
    await this.connect();
    
    return new Promise((resolve, reject) => {
      this.client.sftp((err, sftp) => {
        if (err) {
          reject(err);
          return;
        }

        sftp.fastPut(localPath, remotePath, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  }

  /**
   * Download file from VM via SCP
   */
  async downloadFile(remotePath: string, localPath: string): Promise<void> {
    await this.connect();
    
    return new Promise((resolve, reject) => {
      this.client.sftp((err, sftp) => {
        if (err) {
          reject(err);
          return;
        }

        sftp.fastGet(remotePath, localPath, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  }

  /**
   * Close SSH connection
   */
  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isConnected) {
        this.client.end();
        this.client.once('close', () => {
          this.isConnected = false;
          this.connectionPromise = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Health check - test connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.executeCommand('echo "healthcheck"');
      return result.code === 0;
    } catch {
      return false;
    }
  }
}