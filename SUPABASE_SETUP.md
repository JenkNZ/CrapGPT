# CrapGPT + Supabase Setup Guide

This guide walks you through setting up Supabase as your data backbone for CrapGPT's "cheap VPS as control plane" architecture.

## Quick Start

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project (free tier is fine)
   - Note your project URL and anon key

2. **Deploy Schema**
   ```sql
   -- Run this in Supabase SQL Editor
   -- Copy from schema.sql file
   ```

3. **Configure Environment**
   ```bash
   cp .env.template .env
   # Fill in your Supabase credentials
   ```

4. **Test Connection**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

## Architecture Overview

### Data Flow
```
Wasp Frontend <-> Supabase <-> Your VPS Workers
       |              |              |
   User Auth    Durable State    AI Processing
   Real-time    Job Queue       File Storage
```

### Key Benefits
- **Durable State**: Supabase handles persistence, your VPS can be stateless
- **Real-time**: Built-in websockets for live updates
- **Auth**: Row Level Security (RLS) for multi-tenant isolation
- **Scalability**: Supabase scales automatically

## Schema Deployment

### 1. Run Migration SQL

Copy the entire contents of `schema.sql` into Supabase SQL Editor and execute:

```sql
-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Your full schema here...
```

### 2. Verify Tables Created

Check that these tables exist in Supabase dashboard:
- `users`
- `agents` 
- `connections`
- `conversations`
- `messages`
- `jobs`
- `audit_logs`

### 3. Enable Realtime

In Supabase Dashboard > Database > Replication:
- Enable realtime for: `jobs`, `messages`, `connections`

## Row Level Security (RLS) Configuration

### Understanding RLS

RLS ensures users can only access their own data. Our schema includes policies like:

```sql
-- Users can only see their own records
create policy "Users can view own profile" on users
  for select using (auth.uid() = id);

-- Users can only see their own connections
create policy "Users can view own connections" on connections
  for select using (auth.uid() = user_id);
```

### Testing RLS

1. Create test user in Supabase Auth
2. Use Supabase client with user JWT
3. Verify data isolation works

## Environment Configuration

### Required Variables

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Storage (Cloudflare R2)
R2_ENDPOINT=https://...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=crapgpt-storage

# Security
ENCRYPTION_KEY=your-32-char-encryption-key
JWT_SECRET=your-jwt-secret
```

### Getting Supabase Keys

1. **Project URL**: `https://your-project.supabase.co`
2. **Anon Key**: Settings > API > Project API keys > anon public
3. **Service Key**: Settings > API > Project API keys > service_role (keep secret!)

## Wasp Integration

### Update main.wasp

Your `main.wasp` should include:

```wasp
app CrapGPT {
  wasp: {
    version: "^0.11.0"
  },
  title: "CrapGPT",
  db: {
    system: PostgreSQL
  },
  dependencies: [
    ("@supabase/supabase-js", "^2.38.0"),
    ("@supabase/realtime-js", "^2.8.4")
  ]
}
```

### Prisma Entities

Entities should match Supabase schema:

```wasp
entity User {
=}

entity Agent {
=}

// ... other entities
```

## Database Seeds

### Create Seed Data

Create `src/server/dbSeeds.ts`:

```typescript
import type { PrismaClient } from '@prisma/client'

export const seedDevData = async (prisma: PrismaClient) => {
  console.log('Seeding development data...')
  
  // Create default agent
  const defaultAgent = await prisma.agent.create({
    data: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Default Assistant',
      description: 'A helpful AI assistant',
      model: 'gpt-4',
      provider: 'openai',
      systemPrompt: 'You are a helpful AI assistant.',
      isActive: true
    }
  })
  
  console.log('✅ Created default agent:', defaultAgent.name)
}
```

### Run Seeds

```bash
npm run db:seed
```

## Testing the Integration

### 1. Connection Test

Create `test-supabase.js`:

```javascript
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

async function test() {
  const { data, error } = await supabase.from('agents').select('*')
  console.log('Agents:', data)
  if (error) console.error('Error:', error)
}

test()
```

### 2. Real-time Test

```javascript
// Subscribe to job updates
supabase
  .channel('jobs')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'jobs'
  }, (payload) => {
    console.log('Job update:', payload)
  })
  .subscribe()
```

## Deployment

### Production Setup

1. **Supabase Production Project**
   - Create separate project for production
   - Configure custom domain if needed
   - Set up backups

2. **Environment Variables**
   - Update production `.env`
   - Use service key for server-side operations
   - Rotate keys periodically

3. **Monitoring**
   - Set up Supabase monitoring
   - Configure alerts for errors
   - Monitor usage quotas

## Migration from Current Setup

### Data Migration

1. **Export Current Data**
   ```bash
   # Export your current database
   pg_dump your_current_db > backup.sql
   ```

2. **Transform to Supabase Schema**
   ```bash
   # Adapt your data to new schema
   node migrate-data.js
   ```

3. **Import to Supabase**
   ```bash
   # Use Supabase CLI or SQL editor
   ```

### Code Migration

1. Replace database calls with Supabase client
2. Update auth to use Supabase Auth
3. Replace WebSocket with Supabase Realtime
4. Update file storage to use Supabase Storage or R2

## Troubleshooting

### Common Issues

**Connection Failed**
- Check SUPABASE_URL format
- Verify API keys are correct
- Ensure network access to Supabase

**RLS Blocking Queries**
- Check if user is authenticated
- Verify RLS policies are correct
- Use service key for admin operations

**Realtime Not Working**
- Enable realtime on tables in Supabase dashboard
- Check subscription channels match table names
- Verify network allows websockets

**Migration Errors**
- Run migrations in correct order
- Check for naming conflicts
- Verify PostgreSQL version compatibility

### Debug Commands

```bash
# Check Supabase connection
npm run test:supabase

# View database logs
supabase logs

# Reset database
supabase db reset
```

## Next Steps

1. ✅ Deploy schema to Supabase
2. ✅ Configure environment variables
3. ✅ Test connection and RLS
4. 🔄 Create seed data
5. ⏳ Update frontend to use Supabase
6. ⏳ Migrate existing data
7. ⏳ Deploy to production

With Supabase as your backbone, CrapGPT will be more reliable, scalable, and easier to manage!

## 🎯 Architecture Overview

**Your Setup:**
- **VPS (1GB)**: Control plane, orchestrator, presign URL service
- **Supabase**: Auth + Database + Realtime + Storage (small files)
- **R2**: Large artifact storage (images, models, backups)
- **Providers**: OpenRouter, FAL, Arcade, OpenOps, etc. for heavy lifting

## 📋 Prerequisites

1. **Supabase Account**: [supabase.com](https://supabase.com)
2. **Cloudflare Account**: For R2 storage
3. **VPS**: 1GB+ with Node.js
4. **Provider API Keys**: OpenRouter, FAL, etc.

---

## 🚀 Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a region close to your VPS
3. Wait for project to initialize (2-3 minutes)
4. Note your project URL and keys:
   - `Project URL`: `https://[project-id].supabase.co`
   - `Anon Key`: For client operations (with RLS)
   - `Service Role Key`: For system operations (bypasses RLS)

---

## 🗃️ Step 2: Run Database Schema

### Option A: Supabase Dashboard
1. Go to your project dashboard → SQL Editor
2. Create a new query
3. Paste the contents of `supabase_schema.sql`
4. Run the query

### Option B: CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref your-project-id

# Run migrations
supabase db push
```

### Option C: Direct Connection
```bash
# Connect via psql
psql "postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres"

# Run schema file
\\i supabase_schema.sql
```

---

## 🔐 Step 3: Configure Row Level Security (RLS)

The schema includes RLS policies, but verify they're active:

1. Go to **Authentication** → **Policies**
2. Confirm these tables have policies enabled:
   - `user_profiles`
   - `connections` 
   - `chat_sessions`
   - `chat_messages`
   - `agent_memories`
   - `agent_tasks`
   - `jobs`
   - `connection_logs`
   - `connection_audits`
   - `security_events`

**Key Policies:**
- **Users can only see their own data** (connections, chats, tasks, etc.)
- **System service role can manage all data** (for worker processes)
- **Agents are public** (all users can see active agents)

---

## 🔄 Step 4: Enable Realtime

1. Go to **Database** → **Replication**
2. Enable replication for these tables:
   - `jobs` (for job status updates)
   - `chat_messages` (for streaming chat)
   - `agent_tasks` (for task progress)
   - `tool_executions` (for tool status)

---

## 🔑 Step 5: Configure Environment

Copy `.env.template` to `.env` and fill in values:

```bash
# Copy template
cp .env.template .env

# Edit with your values
nano .env
```

**Required Supabase Values:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres
```

---

## 🔧 Step 6: Update Wasp Configuration

### A. Update `main.wasp`

```wasp
app CrapGPT {
  wasp: {
    version: "^0.14.0"
  },
  title: "CrapGPT",
  
  // Use Supabase as database
  db: {
    system: PostgreSQL,
    seeds: [
      import { seedAgents } from "@src/dbSeeds.js"
    ]
  },
  
  // Supabase handles auth, but keep Wasp structure
  auth: {
    userEntity: User,
    methods: {
      usernameAndPassword: {}
    },
    onAuthFailedRedirectTo: "/login"
  }
}

// Import entities from separate file
```

### B. Add Entities to Wasp

Copy the entities from `wasp_entities.wasp` to your main wasp file, or import them:

```wasp
// In main.wasp, add each entity
entity User {=psl ... psl=}
entity Agent {=psl ... psl=}
entity Connection {=psl ... psl=}
// ... etc
```

---

## 📦 Step 7: Install Dependencies

```bash
# Install Supabase client
npm install @supabase/supabase-js

# Install other dependencies
npm install uuid crypto-js
```

---

## 🧪 Step 8: Test Connection

Create a simple test script:

```bash
# Create test file
cat > test-supabase.js << 'EOF'
import { healthCheck } from './src/server/supabaseConfig.js'

async function test() {
  const health = await healthCheck()
  console.log('Supabase Health:', health)
  
  if (health.status === 'healthy') {
    console.log('✅ Supabase connection successful!')
  } else {
    console.log('❌ Supabase connection failed:', health.error)
  }
}

test()
EOF

# Run test
node test-supabase.js
```

---

## 🔄 Step 9: Data Migration (if needed)

If you have existing data in local SQLite:

```bash
# Export from SQLite
sqlite3 your-database.db ".dump" > data-export.sql

# Convert SQLite to PostgreSQL format (manual process)
# Then import to Supabase via SQL Editor
```

---

## 🚀 Step 10: Deploy & Verify

1. **Deploy your Wasp app** pointing to Supabase
2. **Test key flows:**
   - User registration/login
   - Connection creation via wizard
   - Agent execution with connections
   - Chat sessions with realtime
   - Job queue operations

3. **Monitor in Supabase Dashboard:**
   - Database activity
   - Auth logs  
   - Realtime connections
   - API usage

---

## 🛠️ Architecture Benefits

With this setup, you get:

✅ **Ephemeral VPS**: Can crash and restart without losing data  
✅ **Scalable Auth**: Supabase handles Google/GitHub login  
✅ **Realtime Updates**: Job status, chat streaming via Supabase  
✅ **Strong Security**: Row Level Security + encrypted connections  
✅ **Global CDN**: Fast database access worldwide  
✅ **Backup/Recovery**: Supabase handles database backups  
✅ **Developer Experience**: Great dashboard, logs, and tooling  

---

## 🔍 Troubleshooting

### Connection Issues
```bash
# Test direct database connection
psql "postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres"

# Check if RLS is blocking queries
SELECT * FROM pg_policies WHERE tablename = 'connections';
```

### Auth Context Issues
```javascript
// In your actions, make sure to set auth context
import { setSupabaseAuthContext } from '@src/server/supabaseConfig.js'

export const myAction = async (args, context) => {
  await setSupabaseAuthContext(context.user.id)
  // Now your Supabase queries will respect RLS
}
```

### Realtime Issues
```javascript
// Check channel subscription
const subscription = supabase
  .channel('test')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, 
    (payload) => console.log('Change:', payload)
  )
  .subscribe()

console.log('Subscription status:', subscription.state)
```

---

## 📈 Monitoring & Maintenance

### Dashboard Monitoring
- **Database**: Query performance, connection pools
- **Auth**: Login patterns, failed attempts  
- **API**: Request volume, error rates
- **Storage**: File uploads, bandwidth usage

### Automated Alerts
Set up alerts for:
- High database CPU usage
- Failed connection attempts
- Job queue backlog
- Storage quota approaching limits

### Scaling
When you outgrow the free tier:
- **Pro plan**: More database resources, better support
- **Multiple environments**: Staging + Production
- **Edge functions**: Move lightweight compute to Supabase
- **Read replicas**: For analytics and reporting

---

🎉 **You're all set!** Your CrapGPT now uses Supabase as its data backbone with your VPS as a lightweight control plane.