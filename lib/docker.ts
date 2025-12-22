import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function createAndInitializeContainer(userId: string) {
  try {
    // Create container with unique name
    const containerName = `user${userId}`;
    
    // Run container
    await execAsync(
      `docker run -d --name ${containerName} stellar-sandbox:v2 tail -f /dev/null`
    );
    
    // Initialize Soroban contract
    await execAsync(
      `docker exec ${containerName} stellar contract init soroban-hello-world`
    );
    
    return {
      success: true,
      containerName,
      message: `Container ${containerName} created and contract initialized`
    };
  } catch (error) {
    console.error('Docker error:', error);
    throw error;
  }
}

export async function deleteContainer(userId: string) {
  try {
    const containerName = `user${userId}`;
    
    // Stop and remove container
    await execAsync(`docker stop ${containerName}`);
    await execAsync(`docker rm ${containerName}`);
    
    return {
      success: true,
      containerName,
      message: `Container ${containerName} deleted`
    };
  } catch (error) {
    console.error('Docker error:', error);
    throw error;
  }
}

export async function getContainerFiles(userId: string) {
  try {
    const containerName = `user${userId}`;
    
    // Get files from container
    const { stdout } = await execAsync(
      `docker exec ${containerName} find soroban-hello-world -type f`
    );
    
    const files = stdout.trim().split('\n');
    return { success: true, files };
  } catch (error) {
    console.error('Docker error:', error);
    throw error;
  }
}

export async function getFileContent(userId: string, filePath: string) {
  try {
    const containerName = `user${userId}`;
    
    // Read file from container
    const { stdout } = await execAsync(
      `docker exec ${containerName} cat ${filePath}`
    );
    
    return { success: true, content: stdout };
  } catch (error) {
    console.error('Docker error:', error);
    throw error;
  }
}

export async function saveFileContent(userId: string, filePath: string, content: string) {
  try {
    const containerName = `user${userId}`;
    
    // Write file to container (using echo and redirection)
    const escapedContent = content.replace(/"/g, '\\"').replace(/\$/g, '\\$');
    
    await execAsync(
      `docker exec ${containerName} bash -c "echo \\"${escapedContent}\\" > ${filePath}"`
    );
    
    return { success: true, message: 'File saved' };
  } catch (error) {
    console.error('Docker error:', error);
    throw error;
  }
}

