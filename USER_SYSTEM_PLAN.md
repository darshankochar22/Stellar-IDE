# User System Implementation Plan

## Current State Analysis

### Issues with Current Setup

1. **Hardcoded userId** - Currently using fixed `userId = "1"` in Home.tsx
2. **No User Authentication** - No validation of users
3. **No Persistence** - User data not stored anywhere
4. **Docker Container Naming** - Uses userId directly (e.g., `user1`, `user2`)
5. **Multi-User Conflict** - Multiple users can't share the same wallet address

---

## Proposed Solution: Wallet-Based User System

### Architecture Overview

```
Freighter Wallet (Public Key)
         ↓
   User Connects
         ↓
   Extract Wallet Address
         ↓
   Register/Login User
         ↓
PostgreSQL Database
         ↓
   Create Docker Container per User
         ↓
   Manage Projects per User
```

---

## Do We Need a Database? YES - Here's Why

### Why PostgreSQL is Essential

| Requirement              | Solution                                       |
| ------------------------ | ---------------------------------------------- |
| **Persistent User Data** | Store wallet address → username mapping        |
| **User Profiles**        | Store user metadata (created_at, profile info) |
| **Multi-User Isolation** | Track which projects belong to which user      |
| **Wallet Verification**  | Log blockchain transactions and user sessions  |
| **Audit Trail**          | Track user actions for security/recovery       |
| **Session Management**   | Store auth tokens and session data             |
| **Project Ownership**    | Link projects to specific wallet addresses     |
| **Scalability**          | Handle growing user base efficiently           |

### Alternatives We're NOT Using

❌ **File-Based Storage** - Breaks with multiple concurrent users  
❌ **In-Memory Storage** - Lost on server restart  
❌ **Browser LocalStorage** - Not accessible by backend  
❌ **Just Docker Containers** - No cross-user data tracking

---

## Implementation Plan

### Step 1: Database Schema (PostgreSQL)

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(60) UNIQUE NOT NULL,  -- Stellar public key
  username VARCHAR(100),                         -- Optional display name
  email VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB,  -- Store additional user data
  last_login TIMESTAMP
);

-- User sessions/auth tokens
CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(60),
  auth_token VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- Docker containers mapping
CREATE TABLE user_containers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(60),
  container_id VARCHAR(100),
  container_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- Projects (enhanced)
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(60),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  contract_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);
```

### Step 2: Environment Setup

```bash
# Create .env.local file
DATABASE_URL="postgresql://user:password@localhost:5432/soroban_editor"
JWT_SECRET="your-secret-key-here"
NEXT_PUBLIC_STELLAR_NETWORK="testnet"  # testnet or public
```

### Step 3: File Structure

```
lib/
├── db/
│   ├── client.ts          # PostgreSQL connection setup
│   ├── users.ts           # User operations
│   ├── auth.ts            # Authentication logic
│   └── projects.ts        # Project operations
├── auth/
│   ├── wallet.ts          # Wallet verification
│   └── tokens.ts          # JWT token handling
└── docker/
    └── containerOps.ts    # (update for wallet addresses)

app/api/
├── auth/
│   ├── login/route.ts     # Wallet-based login
│   ├── register/route.ts  # User registration
│   └── verify/route.ts    # Token verification
└── docker/
    └── route.ts           # (update to use wallet address)
```

### Step 4: Database Libraries (Update package.json)

```json
{
  "dependencies": {
    "pg": "^8.11.0",
    "jsonwebtoken": "^9.1.2",
    "next-auth": "^5.0.0",
    "@stellar/freighter-api": "^6.0.1"
  },
  "devDependencies": {
    "@types/pg": "^8.11.0",
    "@types/jsonwebtoken": "^9.0.7"
  }
}
```

---

## Implementation Steps (Detailed)

### Step 1A: Database Connection

Create `lib/db/client.ts`:

```typescript
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;
```

### Step 1B: User Management

Create `lib/db/users.ts`:

```typescript
import pool from "./client";

export async function registerUser(walletAddress: string) {
  const query =
    "INSERT INTO users (wallet_address, username) VALUES ($1, $2) RETURNING *";
  const result = await pool.query(query, [
    walletAddress,
    walletAddress.slice(0, 10),
  ]);
  return result.rows[0];
}

export async function getUserByWalletAddress(walletAddress: string) {
  const query = "SELECT * FROM users WHERE wallet_address = $1";
  const result = await pool.query(query, [walletAddress]);
  return result.rows[0];
}

export async function getUserProjects(walletAddress: string) {
  const query =
    "SELECT * FROM projects WHERE wallet_address = $1 ORDER BY created_at DESC";
  const result = await pool.query(query, [walletAddress]);
  return result.rows;
}
```

### Step 1C: Authentication API

Create `app/api/auth/login/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getUserByWalletAddress, registerUser } from "@/lib/db/users";

export async function POST(request: NextRequest) {
  const { walletAddress } = await request.json();

  if (!walletAddress) {
    return NextResponse.json(
      { error: "Wallet address required" },
      { status: 400 }
    );
  }

  try {
    let user = await getUserByWalletAddress(walletAddress);

    if (!user) {
      user = await registerUser(walletAddress);
    }

    // Generate JWT token
    const token = jwt.sign(
      { walletAddress, userId: user.id },
      process.env.JWT_SECRET!
    );

    return NextResponse.json({
      success: true,
      user,
      token,
      message: user ? "Logged in" : "Account created and logged in",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
```

### Step 2: Update Home.tsx

Replace:

```typescript
const [userId] = useState("1");
```

With:

```typescript
const [walletAddress, setWalletAddress] = useState<string | null>(null);
const [authToken, setAuthToken] = useState<string | null>(null);

// When wallet connects
const handleWalletConnect = async (address: string) => {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ walletAddress: address }),
  });
  const data = await response.json();
  setWalletAddress(address);
  setAuthToken(data.token);
  localStorage.setItem("authToken", data.token);
  loadProjects(address);
};

// Update all API calls to use walletAddress
const loadProjects = useCallback(
  async (address: string) => {
    const response = await fetch("/api/docker", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        action: "getAllProjects",
        walletAddress: address,
      }),
    });
    // ...
  },
  [authToken]
);
```

### Step 3: Update Docker Container Naming

Change container names from `user1`, `user2` to `soroban-{walletAddress.slice(0,10)}`

```typescript
function getContainerName(walletAddress: string): string {
  return `soroban-${walletAddress.slice(0, 10)}`; // Use shorter wallet prefix
}
```

### Step 4: Update API Routes

Modify `app/api/docker/route.ts` to use walletAddress instead of userId:

```typescript
export async function POST(request: Request) {
  const { action, walletAddress, filePath, content, projectName, description } =
    await request.json();

  // Verify auth token
  const authToken = request.headers.get("Authorization")?.split(" ")[1];
  const user = await verifyToken(authToken); // Implement token verification

  if (!user || user.walletAddress !== walletAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Proceed with walletAddress instead of userId
  switch (action) {
    case "getAllProjects":
      const projects = await getUserProjects(walletAddress);
      return NextResponse.json({ success: true, projects });
    // ... other cases
  }
}
```

---

## Data Flow with Database

```
1. User Opens App
   ↓
2. Connects Freighter Wallet
   ↓
3. Frontend Extracts Public Key
   ↓
4. Sends to /api/auth/login
   ↓
5. Backend Checks Database
   ├─ If Not Found → Create New User
   └─ If Found → Login User
   ↓
6. Return Auth Token
   ↓
7. Store Token in LocalStorage
   ↓
8. Load User's Projects from Database
   ↓
9. Create/Manage Docker Container per User
   ↓
10. Store Project Metadata in Database
```

---

## Benefits of This Approach

✅ **Multi-User Support** - Each user isolated by wallet address  
✅ **Persistent Data** - Projects saved permanently  
✅ **Scalability** - Database can handle thousands of users  
✅ **Security** - JWT tokens for session management  
✅ **Audit Trail** - Track all user actions  
✅ **Easy Recovery** - User can log in from any device with their wallet  
✅ **No Passwords** - Uses blockchain wallet authentication

---

## Migration Path

### Phase 1: Database Setup

- Create PostgreSQL database
- Create schema
- Set up connection

### Phase 2: Authentication

- Implement login/register APIs
- Add JWT token handling
- Update WalletConnect component

### Phase 3: User Management

- Migrate home page to use wallet address
- Update API endpoints
- Store projects in database

### Phase 4: Docker Integration

- Update container naming
- Link containers to users in database
- Add container cleanup on user deletion

### Phase 5: Testing & Deployment

- Test multi-user scenarios
- Load testing
- Production deployment

---

## Example: Complete User Flow

```typescript
// User connects wallet
const address = "GBUQWP3K..."; // From Freighter API

// Backend creates/retrieves user
const user = {
  id: 1,
  wallet_address: "GBUQWP3K...",
  username: "GBUQWP3K...",
  created_at: "2024-01-15",
};

// Docker container created
const container = `soroban-GBUQWP3K`; // Named after wallet

// Projects stored in database
const projects = [
  {
    id: 1,
    user_id: 1,
    wallet_address: "GBUQWP3K...",
    name: "my-contract",
    created_at: "2024-01-15",
  },
];

// Next login - instant restore
// User connects wallet → Finds user in DB → Loads projects → Resumes work
```

---

## Summary

| Aspect               | Current        | Proposed          |
| -------------------- | -------------- | ----------------- |
| **User ID**          | Hardcoded "1"  | Wallet address    |
| **User Storage**     | None           | PostgreSQL        |
| **Multi-User**       | Not supported  | Fully supported   |
| **Data Persistence** | Only in Docker | Database + Docker |
| **Authentication**   | None           | JWT tokens        |
| **Scalability**      | Limited        | Enterprise-grade  |

**YES, you definitely need PostgreSQL for a proper multi-user wallet-based system.**

---

## Next Steps

1. Set up PostgreSQL database locally (or use managed service like AWS RDS)
2. Create schema from SQL above
3. Install required npm packages
4. Implement database connection
5. Create auth APIs
6. Update frontend components
7. Update Docker operations
8. Test thoroughly

Ready to implement? Let me know which phase you'd like to start with!
