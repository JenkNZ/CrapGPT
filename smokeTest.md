# 🔥 CrapGPT Connection Wizard Smoke Test

## ✅ Prerequisites

1. **Environment Variables** (.env file):
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_KEY=eyJ...
   OPENOPS_API_URL=https://api.openops.com
   OPENOPS_API_KEY=your-openops-key
   ```

2. **Supabase Schema Applied**:
   - Run the `supabase_schema.sql` in Supabase SQL Editor
   - Confirm `crapgpt_connections` table exists
   - Enable realtime for `crapgpt_jobs` and `crapgpt_messages`

## 🚀 Step-by-Step Test

### 1. Start App & Sign In
```bash
npm start
```
- Navigate to `http://localhost:3000`
- Sign in with Google/GitHub
- Reach the main chat screen

### 2. Check Connections Link
- ✅ Verify chat header shows **"Connections"** link in neon green (#39FF14)
- ✅ Link should be in top-right of chat interface
- ✅ Click opens `/connections` in new tab

### 3. Connection Wizard Test
**On `/connections` page:**

#### Step 1: Provider Selection
- ✅ See "Connection Wizard" heading with punk green styling
- ✅ Grid of provider cards: OpenOps, Arcade, HexStrike, MCPJungle, ToolHive, Custom
- ✅ Select **OpenOps**
- ✅ Enter connection name: "Test OpenOps"
- ✅ Select scope: **read-only**
- ✅ Click "Next"

#### Step 2: Configuration
- ✅ Form shows OpenOps-specific fields:
  - API URL: `https://api.openops.com` (or your OpenOps instance)
  - API Key: [your key]
  - Default Account: [optional]
- ✅ Fill in credentials
- ✅ Click **"Test connectivity"**
- ✅ Should show green "✅ OpenOps reachable" (if valid) or red error
- ✅ Click **"Save connection"** (only enabled after successful test)

#### Step 3: Success
- ✅ "All set" message with connection ID
- ✅ Shows saved connection details

### 4. Connection Manager Test
**Below the wizard on same page:**

- ✅ "Your connections" section appears
- ✅ Shows the newly created OpenOps connection:
  - Name: "Test OpenOps"
  - Type badge: "openops"  
  - Scope: "read-only"
  - Status: Green "Active" badge
  - Created timestamp
- ✅ "Deactivate" button available

### 5. Agent Connection Test
**Back in chat (`/`):**

- ✅ Try to trigger an agent that needs connections
- ✅ Should see connection picker UI if agent requires connections
- ✅ Select your OpenOps connection from dropdown
- ✅ Run the agent
- ✅ Check browser network tab - should see calls to Supabase
- ✅ Connection should be used securely (no secrets in logs/network)

### 6. Data Validation

**Supabase Dashboard:**
- ✅ Navigate to Table Editor → `crapgpt_connections`
- ✅ Verify your connection row exists:
  - `user_id` matches your user
  - `type` = "openops"
  - `name` = "Test OpenOps"
  - `scope` = "read-only"
  - `active` = true
  - `config` is encrypted JSON (not readable)

**If agent jobs run:**
- ✅ Check `crapgpt_jobs` table for job entries
- ✅ Status should progress: pending → running → succeeded
- ✅ `connection_id` should reference your connection

**R2 Storage (if configured):**
- ✅ Agent artifacts stored in R2, not on VPS
- ✅ Access via pre-signed URLs only

## 🐛 Common Issues & Fixes

### Connection Page 404
```bash
# Rebuild after editing main.wasp
wasp build
# Or restart dev server
npm start
```

### OpenOps Test Fails
- ✅ Verify `OPENOPS_API_URL` and `OPENOPS_API_KEY` in server .env
- ✅ Check if your OpenOps tenant has `/health` endpoint
- ✅ Try replacing test call with a harmless list operation

### Connection Not Visible in Manager
- ✅ Check browser dev console for errors
- ✅ Verify Supabase RLS policies allow user access
- ✅ Check `ctx.user.id` matches `user_id` in database
- ✅ Confirm `active = true` in database row

### Agent Can't See Connections
- ✅ Check agent metadata in `src/client/agentMetadata.ts`
- ✅ Verify agent lists correct `required` or `optional` connection types
- ✅ Connection picker should filter by `type` and `active = true`
- ✅ Scope hierarchy: connection scope ≥ required scope

## 🎯 Success Criteria

✅ **Navigation**: Connections link works and opens wizard  
✅ **Creation**: Can create OpenOps connection with read-only scope  
✅ **Testing**: Connection test validates credentials before save  
✅ **Security**: Secrets never appear in browser or logs  
✅ **Management**: Enhanced manager shows connection as active  
✅ **Integration**: Agents can select and use saved connections  
✅ **Storage**: All artifacts go to R2/Supabase, not VPS disk  
✅ **Real-time**: Job status updates stream via Supabase  

## 🎸 Punk Architecture Validated

- **VPS stays light**: Only orchestration and routing
- **Supabase handles scale**: Auth, data, real-time, jobs
- **Secrets stay secure**: Server-side only, encrypted at rest
- **UI stays punk**: Neon green, dark theme, clean UX
- **Users stay happy**: Simple workflow, no complex setup

**Ready to rock!** 🚀⚡

## Next Steps After Smoke Test

1. **Add nav shortcuts**: `g + c` hotkey for connections
2. **Scope badges**: Yellow (read-only), Green (change-safe), Red (admin)  
3. **Empty state prompts**: "Create connection" banner when agent needs one
4. **Audit logging**: Connection creation/usage events
5. **Rate limiting**: Per-user job quotas to prevent cost blowouts