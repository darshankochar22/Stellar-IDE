# Docker Container Management Setup

This document describes how the Docker container management system works.

## Architecture

### Backend Files

#### 1. `lib/docker.ts`
Contains utility functions for Docker operations:
- **createAndInitializeContainer(userId)**: Creates a Docker container with unique name and initializes Soroban contract
- **deleteContainer(userId)**: Stops and removes the container
- **getContainerFiles(userId)**: Lists files in the container
- **getFileContent(userId, filePath)**: Reads file content from container
- **saveFileContent(userId, filePath, content)**: Writes content to file in container

#### 2. `app/api/docker/route.ts`
API endpoint that handles Docker operations via POST requests.

**Actions:**
- `create`: Create container and initialize contract
- `delete`: Delete container
- `getFiles`: Get list of files
- `getFileContent`: Get file content
- `saveFileContent`: Save file content

### Frontend Files

#### 1. `components/Home.tsx`
Updated home page with Docker container management UI.

**Features:**
- Input field for User ID (default: "1")
- "Create Container" button - creates container with name `user{userId}`
- "Delete Container" button - removes the container
- Status display showing success/error messages
- Auto-increment userId after container creation

## Docker Commands Reference

```bash
# Create container (handled by API)
docker run -d --name user1 stellar-sandbox:v2 tail -f /dev/null

# Initialize Soroban contract (handled by API)
docker exec user1 stellar contract init soroban-hello-world

# Delete container (handled by API)
docker stop user1 && docker rm user1
```

## Usage Flow

1. **User opens home page** - sees container management UI
2. **User enters User ID** (e.g., "1")
3. **User clicks "Create Container"** - API:
   - Creates Docker container named `user1`
   - Runs `stellar contract init soroban-hello-world` inside
   - Returns success/error status
   - Auto-increments to `user2` for next creation
4. **User can click "Delete Container"** - API:
   - Stops container
   - Removes container
   - Decrements userId
5. **Files are ready** to be loaded into the editor

## Next Steps

To integrate with the editor:
1. After container creation, fetch files using `getContainerFiles` action
2. Load files into the editor sidebar
3. Edit files using `saveFileContent` action
4. Update the editor to use Docker container paths instead of local paths

## Deployment

When pushing to VM:
1. Ensure Docker is installed on the VM
2. Pre-build the `stellar-sandbox:v2` image
3. Run the Next.js server
4. Make sure Docker daemon is accessible from Node.js process

## Notes

- Each container name must be unique (handled by userId)
- Containers run in daemon mode with `tail -f /dev/null` to keep them alive
- File operations use `docker exec` to run commands inside container
- The system is designed to work with the pre-built `stellar-sandbox:v2` image

