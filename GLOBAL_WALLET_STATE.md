# Global Wallet State Management

## Overview

The wallet address is now managed globally using React Context, ensuring it's available throughout the entire application without losing state during navigation or component re-renders.

## Architecture

```
┌─────────────────────────────────────────────┐
│         Root Layout (app/layout.tsx)        │
│          └─ WalletProvider                  │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   Home.tsx            Other Pages
   useWallet()         useWallet()
   ├─ wallet.walletAddress
   ├─ wallet.isConnected
   ├─ wallet.containerName
   └─ wallet.setContainerReady()
```

## Setup

### 1. WalletContext Created

**File**: `context/WalletContext.tsx`

```typescript
export interface WalletContextType {
  // State
  walletAddress: string | null;
  walletBalance: string;
  isConnected: boolean;
  isConnecting: boolean;
  containerName: string | null;
  isContainerReady: boolean;

  // Setters
  setWalletAddress: (address: string | null) => void;
  setWalletBalance: (balance: string) => void;
  setIsConnected: (connected: boolean) => void;
  setIsConnecting: (connecting: boolean) => void;
  setContainerReady: (ready: boolean) => void;

  // Methods
  connect: (address: string, balance: string) => void;
  disconnect: () => void;
  getContainerName: () => string | null;
}
```

### 2. WalletProvider Wraps App

**File**: `app/layout.tsx`

```typescript
import { WalletProvider } from "@/context/WalletContext";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
```

### 3. Components Use useWallet Hook

**File**: `components/Home.tsx` / `components/WalletConnect.tsx`

```typescript
import { useWallet } from "@/context/WalletContext";

function MyComponent() {
  const wallet = useWallet();

  // Access global wallet state
  console.log(wallet.walletAddress);
  console.log(wallet.isConnected);
  console.log(wallet.containerName);

  // Update wallet state
  wallet.connect(address, balance);
  wallet.disconnect();
  wallet.setContainerReady(true);
}
```

## Data Flow

### Wallet Connection Flow

```
1. User Clicks "Connect Wallet"
         ↓
2. WalletConnect.tsx → handleConnect()
         ↓
3. Get wallet address from Freighter API
         ↓
4. Create Docker container for wallet
         ↓
5. Update Global Wallet Context
   - wallet.connect(address, balance)
   - Sets walletAddress, isConnected, containerName
         ↓
6. All Components Re-render with New State
   - Home.tsx uses wallet.walletAddress
   - loadProjects() runs automatically
   - UI displays user's projects
         ↓
7. Wallet State Persists Across
   - Page navigations
   - Component re-renders
   - Network requests
   - All child components
```

### API Calls Include Wallet Address

```typescript
// All API calls access from global context
const wallet = useWallet();

const response = await fetch("/api/docker", {
  method: "POST",
  body: JSON.stringify({
    action: "getAllProjects",
    walletAddress: wallet.walletAddress, // From context
  }),
});
```

## Key Benefits

### 1. Single Source of Truth

- Wallet address defined once in WalletContext
- All components read from context, not props
- No prop drilling needed

### 2. Persistent State

```typescript
// Component A
const wallet = useWallet();
wallet.connect(address, balance);

// Component B (on different page)
const wallet = useWallet();
console.log(wallet.walletAddress); // Same address from Component A
```

### 3. Automatic Re-renders

```typescript
// When wallet.connect() is called
// ↓
// WalletContext updates
// ↓
// All components using useWallet() re-render
// ↓
// Home.tsx loadProjects() runs
// ↓
// Projects display updates
```

### 4. No Data Loss

```
Old Way (Prop-based):
Home.tsx state → WalletConnect → update → navigate → lost

New Way (Context-based):
WalletContext (global) → all components access → navigate → preserved
```

### 5. Easy Access Everywhere

```typescript
// Instead of passing walletAddress through 10 levels of props
<Home walletAddress={address}>
  <Sidebar walletAddress={address}>
    <Projects walletAddress={address}>
      <Project walletAddress={address}>
        <Editor walletAddress={address} />

// Now just:
function Editor() {
  const wallet = useWallet();
  return <div>{wallet.walletAddress}</div>;
}
```

## Container Management

### Automatic Container Tracking

```typescript
// In context, containerName is auto-generated
const containerName = wallet.containerName;
// Returns: "soroban-gbuqwp3kd" (from wallet address)

// In API calls
const response = await fetch("/api/docker", {
  body: JSON.stringify({
    walletAddress: wallet.walletAddress, // Sends wallet
    // Backend generates container name automatically
  }),
});
```

### Container Health Check

```typescript
// Check if container is ready
const isHealthy = wallet.isContainerReady;

// Set container as ready
wallet.setContainerReady(true);

// Use in loadProjects
if (!wallet.isContainerReady) {
  // Container not ready, attempt recreate
  await fetch("/api/docker", {
    body: JSON.stringify({ action: "create", walletAddress }),
  });
}
```

## Usage Examples

### Example 1: Getting Wallet Address in Any Component

```typescript
import { useWallet } from "@/context/WalletContext";

export function MyComponent() {
  const wallet = useWallet();

  return (
    <div>
      {wallet.isConnected ? (
        <>
          <p>Connected: {wallet.walletAddress}</p>
          <p>Balance: {wallet.walletBalance} XLM</p>
          <p>Container: {wallet.containerName}</p>
        </>
      ) : (
        <p>Not connected</p>
      )}
    </div>
  );
}
```

### Example 2: API Call with Wallet Address

```typescript
async function loadUserData() {
  const wallet = useWallet();

  if (!wallet.walletAddress) {
    throw new Error("Wallet not connected");
  }

  const response = await fetch("/api/docker", {
    method: "POST",
    body: JSON.stringify({
      action: "getAllProjects",
      walletAddress: wallet.walletAddress,
    }),
  });

  return response.json();
}
```

### Example 3: Update Wallet State

```typescript
async function connectWallet() {
  const wallet = useWallet();
  const address = await getAddressFromFreighter();
  const balance = await fetchBalance(address);

  // Update global state
  wallet.connect(address, balance);

  // All components using useWallet() now see:
  // - wallet.walletAddress = address
  // - wallet.isConnected = true
  // - wallet.containerName = "soroban-..."
}
```

## File Changes Summary

| File                           | Change                                      |
| ------------------------------ | ------------------------------------------- |
| `context/WalletContext.tsx`    | NEW: Created React Context for wallet state |
| `app/layout.tsx`               | Added WalletProvider wrapper                |
| `components/Home.tsx`          | Use useWallet() instead of useState         |
| `components/WalletConnect.tsx` | Use useWallet() and context.connect()       |

## Error Handling

### Missing Wallet Address

```typescript
// Always check before API calls
if (!wallet.walletAddress) {
  alert("Please connect wallet first");
  return;
}
```

### Context Not Available

```typescript
// The hook throws error if used outside WalletProvider
const wallet = useWallet();
// Error: useWallet must be used within a WalletProvider

// Solution: Ensure component is wrapped in WalletProvider
// (already done in app/layout.tsx)
```

## Navigation & State Persistence

### Before (Without Context)

```
Page 1: wallet connected → navigate → Page 2: wallet lost
```

### After (With Context)

```
Page 1: wallet connected → navigate → Page 2: wallet persists
```

All pages that use `useWallet()` get the same wallet state.

## Performance Considerations

### Efficient Re-renders

- Only components using `useWallet()` re-render on state change
- Other components unaffected
- Minimal performance impact

### Memoization Available

```typescript
const containerName = useMemo(
  () => wallet.getContainerName(),
  [wallet.walletAddress]
);
```

## Testing

```typescript
// Mock the context in tests
const mockWallet = {
  walletAddress: "GBUQWP3K...",
  isConnected: true,
  containerName: "soroban-gbuqwp3k",
  // ... other properties
};

// Wrap component with WalletProvider in tests
render(
  <WalletProvider>
    <MyComponent />
  </WalletProvider>
);
```

## Future Enhancements

1. **Persist to LocalStorage**

   - Save wallet address to localStorage
   - Restore on app reload

2. **Multiple Wallets**

   - Support switching between wallets
   - Store history of connected wallets

3. **Wallet Events**

   - Subscribe to wallet change events
   - Auto-reconnect on wallet unlock

4. **Transaction History**
   - Track recent transactions
   - Store in context or database

---

**Key Takeaway**: Wallet address is now globally available through React Context, eliminating the need for prop drilling and ensuring state persists throughout the application.
