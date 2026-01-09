/**
 * File Delete Operations
 * Deleting files and folders
 */

import {
  execAsync,
  getContainerName,
  getWorkspacePath,
  escapeFilePath,
} from '../utils';

/**
 * Delete a file from the container
 * @param walletAddress The Stellar wallet public key
 * @param filePath The relative file path
 * @param projectName Optional specific project
 * @returns Deletion result
 */
export async function deleteFile(walletAddress: string, filePath: string, projectName?: string) {
  try {
    const containerName = getContainerName(walletAddress);
    const safePath = escapeFilePath(filePath);
    console.log(`Deleting file: ${safePath} from container: ${containerName}`);

    if (!projectName) {
      throw new Error('Project name is required');
    }

    const workspacePath = getWorkspacePath();
    const basePath = `${workspacePath}/${projectName}`;
    const fullPath = `${basePath}/${safePath}`;

    // Verify file exists
    const { stdout: fileCheck } = await execAsync(
      `docker exec ${containerName} test -f ${fullPath} && echo "exists" || echo "missing"`
    );

    if (fileCheck.trim() !== 'exists') {
      throw new Error(`File does not exist: ${fullPath}`);
    }

    // Delete file
    await execAsync(`docker exec -u developer ${containerName} rm ${fullPath}`);

    console.log(`File deleted: ${fullPath}`);
    return {
      success: true,
      message: `File ${filePath} deleted`,
    };
  } catch (error) {
    const err = error as { message?: string };
    console.error('Docker error:', err);
    return {
      success: false,
      error: err.message || 'Failed to delete file',
    };
  }
}

/**
 * Delete a folder from the container
 * @param walletAddress The Stellar wallet public key
 * @param folderPath The relative folder path
 * @param projectName Optional specific project
 * @returns Deletion result
 */
export async function deleteFolder(walletAddress: string, folderPath: string, projectName?: string) {
  try {
    const containerName = getContainerName(walletAddress);
    const safePath = escapeFilePath(folderPath);
    console.log(`Deleting folder: ${safePath} from container: ${containerName}`);

    if (!projectName) {
      throw new Error('Project name is required');
    }

    const workspacePath = getWorkspacePath();
    const basePath = `${workspacePath}/${projectName}`;
    const fullPath = `${basePath}/${safePath}`;

    // Verify folder exists
    const { stdout: folderCheck } = await execAsync(
      `docker exec ${containerName} test -d ${fullPath} && echo "exists" || echo "missing"`
    );

    if (folderCheck.trim() !== 'exists') {
      throw new Error(`Folder does not exist: ${fullPath}`);
    }

    // Delete folder recursively
    await execAsync(`docker exec -u developer ${containerName} rm -rf ${fullPath}`);

    console.log(`Folder deleted: ${fullPath}`);
    return {
      success: true,
      message: `Folder ${folderPath} deleted`,
    };
  } catch (error) {
    const err = error as { message?: string };
    console.error('Docker error:', err);
    return {
      success: false,
      error: err.message || 'Failed to delete folder',
    };
  }
}
