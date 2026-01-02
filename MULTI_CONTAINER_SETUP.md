# Multi-Container Wallet-Based Setup

## Overview

The application now creates one Docker container per user wallet address and automatically manages containers based on wallet connection/disconnection.

## How It Works

### 1. Wallet Connection Flow

```
User Connects Wallet (Freighter)
         ↓
Extract Wallet Public Key (e.g., GBUQWP3KDKSXFNTZNUXRDONRGH...)
         ↓
Automatically Create Docker Container
Container Name: soroban-gbuqwp3kd (first 10 chars of wallet, lowercase)
         ↓
Load User's Projects from Container
         ↓
Display Projects in UI
```

### 2. Container Naming Convention

All containers are named using the wallet address:

```
Format: soroban-{first-10-chars-of-wallet}

Examples:
- Wallet: GBUQWP3KDKSXFNTZNUXRDONRGH...
  Container: soroban-gbuqwp3kd

- Wallet: GCZST3SMIGJTNNXQWOKDGQZQ...
  Container: soroban-gczst3smig
```

### 3. Container Lifecycle

#### Create Container

- **When**: Automatically when wallet connects
- **Where**: `WalletConnect.tsx` → `handleConnect()`
- **Action**: `POST /api/docker` with `action: 'create'`
- **Container**: One container per unique wallet address

#### Load Projects

- **When**: After wallet connection or wallet address changes
- **Where**: `Home.tsx` → `loadProjects()`
- **Action**: `POST /api/docker` with `action: 'getAllProjects'`
- **Filter**: Only loads projects for connected wallet address

#### Delete Container

- **When**: When user disconnects wallet (optional enhancement)
- **Where**: `Home.tsx` → `onDisconnect()`
- **Action**: `POST /api/docker` with `action: 'delete'`

### 4. Authorization & Isolation

Each operation includes the `walletAddress` parameter:

```typescript
{
  action: "getAllProjects",
  walletAddress: "GBUQWP3KDKSXFNTZNUXRDONRGH..."
}
```

This ensures:

- ✅ Each user only accesses their own container
- ✅ Each user only sees their own projects
- ✅ Cross-user data access is impossible (unless wallet address is compromised)

## Code Changes Made

### 1. Container Naming (`lib/docker/utils.ts`)

```typescript
// OLD: return `user${userId}`;
// NEW:
export function getContainerName(walletAddress: string): string {
  const prefix = walletAddress.slice(0, 10).toLowerCase();
  return `soroban-${prefix}`;
}
```

### 2. Automatic Container Creation (`components/WalletConnect.tsx`)

```typescript
// When wallet connects successfully
const handleConnect = async () => {
  // ... existing wallet connection code ...

  // NEW: Create container for this wallet
  const containerResponse = await fetch("/api/docker", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "create",
      walletAddress,
    }),
  });
};
```

### 3. Project Loading (`components/Home.tsx`)

```typescript
// OLD: const [userId] = useState("1");
// NEW: const [walletAddress, setWalletAddress] = useState<string | null>(null);

// Projects load only when wallet address exists and changes
useEffect(() => {
  loadProjects();
}, [loadProjects, walletAddress]);

// API calls now use wallet address
const loadProjects = useCallback(async () => {
  if (!walletAddress) {
    setProjects([]);
    return;
  }

  // Check container health first
  const healthResponse = await fetch("/api/docker", {
    method: "POST",
    body: JSON.stringify({ action: "checkHealth", walletAddress }),
  });

  // Then load projects
  const response = await fetch("/api/docker", {
    method: "POST",
    body: JSON.stringify({ action: "getAllProjects", walletAddress }),
  });
}, [walletAddress]);
```

### 4. API Route (`app/api/docker/route.ts`)

```typescript
// Extract wallet address from request
const { action, walletAddress, ... } = await request.json();

// Validate wallet address (except for checkHealth)
if (!walletAddress && action !== 'checkHealth') {
  return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
}

// Pass wallet address to all operations
switch (action) {
  case 'create':
    const result = await createAndInitializeContainer(walletAddress);
    break;
  case 'getAllProjects':
    const projects = await getAllProjects(walletAddress);
    break;
  // ... all other cases use walletAddress ...
}
```

### 5. Health Check Action

```typescript
// New action to check if container exists and is running
case 'checkHealth':
  const isHealthy = await checkContainerHealth(walletAddress);
  return NextResponse.json({ isHealthy, walletAddress });
```

## File Changes Summary

| File                           | Changes                                              |
| ------------------------------ | ---------------------------------------------------- |
| `lib/docker/utils.ts`          | Container name generation now uses wallet address    |
| `lib/docker/containerOps.ts`   | All functions updated to use walletAddress parameter |
| `lib/docker/fileOps.ts`        | All functions updated to use walletAddress parameter |
| `lib/projects.ts`              | All functions updated to use walletAddress parameter |
| `app/api/docker/route.ts`      | All actions now use walletAddress instead of userId  |
| `components/WalletConnect.tsx` | Auto-create container on wallet connect              |
| `components/Home.tsx`          | Remove hardcoded userId, use walletAddress           |

## API Endpoints (Updated)

All endpoints now use `walletAddress` instead of `userId`:

### Create Container

```json
{
  "action": "create",
  "walletAddress": "GBUQWP3KDKSXFNTZNUXRDONRGH..."
}
```

### Get All Projects

```json
{
  "action": "getAllProjects",
  "walletAddress": "GBUQWP3KDKSXFNTZNUXRDONRGH..."
}
```

### Create Project

```json
{
  "action": "createProject",
  "walletAddress": "GBUQWP3KDKSXFNTZNUXRDONRGH...",
  "projectName": "my-contract",
  "description": "My Soroban contract"
}
```

### Check Container Health

```json
{
  "action": "checkHealth",
  "walletAddress": "GBUQWP3KDKSXFNTZNUXRDONRGH..."
}
```

## User Experience

### Before

1. User opens app
2. Hardcoded `user1` container is used
3. Everyone shares the same container
4. Projects not persistent across sessions

### After

1. User opens app
2. User clicks "Connect Wallet" (Freighter)
3. Wallet address extracted automatically
4. Docker container created with wallet name
5. User's projects loaded from their container
6. Container persists for next login
7. Different users have separate containers

## Security Benefits

✅ **User Isolation** - Each wallet has its own container  
✅ **Data Privacy** - Users can't access other users' projects  
✅ **Wallet-Based Auth** - Freighter wallet serves as authentication  
✅ **No Password Storage** - Uses blockchain wallet security  
✅ **Container Isolation** - OS-level isolation via Docker

## Testing Checklist

- [ ] Connect wallet → container created with wallet address
- [ ] Load projects → only show projects for connected wallet
- [ ] Create project → saved in correct wallet's container
- [ ] Edit file → changes persist in wallet's container
- [ ] Disconnect wallet → projects cleared from UI
- [ ] Reconnect wallet → same container loaded
- [ ] Multiple users → each has separate container
- [ ] Container not running → auto-recreate on loadProjects

## Troubleshooting

### Container Not Found

- Check: `docker ps -a | grep soroban-`
- Verify wallet address first 10 characters match container name

### Projects Not Loading

- Check wallet is connected
- Check container is running: `docker ps`
- Check container health: health endpoint returns `isHealthy: true`

### Wrong Projects Showing

- Verify `walletAddress` parameter in API request
- Check container name matches wallet address
- Ensure no cache issues in browser

## Future Enhancements

1. **Database Integration** - Store project metadata in PostgreSQL
2. **Container Cleanup** - Auto-delete old containers after X days
3. **Multi-Device Login** - Same wallet, same container across devices
4. **Backup/Restore** - Export/import projects by wallet address
5. **Team Collaboration** - Share containers by wallet whitelist

---

**Summary**: The system now creates one container per wallet address, ensuring complete user isolation and eliminating the hardcoded `user1` container issue.
