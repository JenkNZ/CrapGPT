# 🕹️ CrapGPT Mega Setup Guide
## AI Orchestration Hub with All Frameworks

This guide will help you set up the ultimate CrapGPT system that integrates:
- **Hexstrike-AI** for low-latency inference
- **Toolhive** for tool orchestration
- **OpenOps** for workflow automation  
- **Arcade** for infrastructure management
- **MCPJungle** for agent communication
- **Multi-provider AI** (OpenRouter, FAL, ModelsLab)

---

## 🚀 Quick Start

```bash
# Clone and setup
git clone your-repo
cd gpt-clone-wasp

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Fill in your API keys (see sections below)

# Initialize database
npm run db:migrate-dev

# Start the beast
npm run start
```

---

## 📋 Prerequisites

### Required Software
- **Node.js** 18+ 
- **PostgreSQL** 14+
- **Redis** (optional, for caching)
- **Docker** (optional, for orchestration services)

### API Keys Needed
You'll need to sign up for these services and get API keys:

1. **AI Providers**
   - [OpenRouter](https://openrouter.ai) - Multi-model access
   - [FAL](https://fal.run) - Fast AI inference
   - [ModelsLab](https://modelslab.com) - Specialized models

2. **Orchestration Frameworks**
   - [Hexstrike-AI](https://github.com/0x4m4/hexstrike-ai) - Self-hosted or API
   - [Toolhive](https://github.com/stacklok/toolhive) - Tool registry
   - [OpenOps](https://github.com/openops-cloud/openops) - Workflow automation
   - [Arcade](https://docs.arcade.dev) - Infrastructure orchestration
   - [MCPJungle](https://github.com/mcpjungle/MCPJungle) - Agent communication

---

## 🔧 Detailed Setup

### 1. Database Setup

```sql
-- Create the database
CREATE DATABASE crapgpt_db;
CREATE USER crapgpt_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE crapgpt_db TO crapgpt_user;
```

Update your `.env`:
```env
DATABASE_URL=postgresql://crapgpt_user:your_secure_password@localhost:5432/crapgpt_db
```

### 2. AI Provider Setup

#### OpenRouter Setup
1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Get your API key from the dashboard
3. Add to `.env`:
```env
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

#### FAL Setup
1. Sign up at [fal.run](https://fal.run)
2. Get your API key
3. Add to `.env`:
```env
FAL_API_KEY=your-fal-key-here
```

#### ModelsLab Setup
1. Sign up at [modelslab.com](https://modelslab.com)
2. Get your API key from account settings
3. Add to `.env`:
```env
MODELSLAB_API_KEY=your-modelslab-key-here
```

### 3. Orchestration Framework Setup

#### Hexstrike-AI
Two options: self-hosted or API

**Option A: Self-hosted**
```bash
# Clone and run Hexstrike-AI
git clone https://github.com/0x4m4/hexstrike-ai
cd hexstrike-ai
docker-compose up -d

# Add to .env
HEXSTRIKE_API_KEY=your-local-key
HEXSTRIKE_ENDPOINT=http://localhost:8080
```

**Option B: API (if available)**
```env
HEXSTRIKE_API_KEY=your-hosted-key
HEXSTRIKE_ENDPOINT=https://api.hexstrike.ai
```

#### Toolhive Setup
```bash
# Install Toolhive CLI
npm install -g @toolhive/cli

# Initialize project
toolhive init crapgpt-tools

# Add to .env
TOOLHIVE_API_KEY=your-toolhive-key
TOOLHIVE_REGISTRY=crapgpt-tools
```

#### OpenOps Setup
1. Sign up at OpenOps cloud
2. Create a workspace named `crapgpt-workspace`
3. Add to `.env`:
```env
OPENOPS_API_KEY=your-openops-key
OPENOPS_WORKSPACE=crapgpt-workspace
```

#### Arcade Setup
1. Sign up at [arcade.dev](https://arcade.dev)
2. Create project `crapgpt`
3. Add to `.env`:
```env
ARCADE_API_KEY=your-arcade-key
ARCADE_PROJECT=crapgpt
```

#### MCPJungle Setup
1. Sign up at MCPJungle
2. Create hub `crapgpt-hub`
3. Add to `.env`:
```env
MCPJUNGLE_API_KEY=your-mcp-key
MCPJUNGLE_HUB=crapgpt-hub
```

### 4. Authentication Setup

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create/select project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3001/auth/google/callback`
   - `https://yourdomain.com/auth/google/callback`

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

#### GitHub OAuth
1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create new OAuth App
3. Set Authorization callback URL: `http://localhost:3001/auth/github/callback`

```env
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

---

## 🎯 Configuration

### Environment Variables

Your complete `.env` file should look like this:

```env
# CrapGPT Mega Configuration
DATABASE_URL=postgresql://crapgpt_user:password@localhost:5432/crapgpt_db
JWT_SECRET=your-super-secret-jwt-key-32-chars
WASP_WEB_CLIENT_URL=http://localhost:3000
WASP_SERVER_URL=http://localhost:3001

# Authentication
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# AI Providers
OPENROUTER_API_KEY=sk-or-v1-your-key-here
FAL_API_KEY=your-fal-key-here
MODELSLAB_API_KEY=your-modelslab-key-here

# Orchestration Frameworks
HEXSTRIKE_API_KEY=your-hexstrike-key
HEXSTRIKE_ENDPOINT=http://localhost:8080
TOOLHIVE_API_KEY=your-toolhive-key
TOOLHIVE_REGISTRY=crapgpt-tools
OPENOPS_API_KEY=your-openops-key
OPENOPS_WORKSPACE=crapgpt-workspace
ARCADE_API_KEY=your-arcade-key
ARCADE_PROJECT=crapgpt
MCPJUNGLE_API_KEY=your-mcp-key
MCPJUNGLE_HUB=crapgpt-hub

# Optional Services
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-key
REDIS_URL=redis://localhost:6379

# Configuration
NODE_ENV=development
LOG_LEVEL=debug
ORCHESTRATION_MODE=enabled
MAX_CONCURRENT_AGENTS=10
```

---

## 🔥 Running CrapGPT

### Development Mode
```bash
# Install dependencies
npm install

# Run database migrations
npm run db:migrate-dev

# Seed the database with mega agents
npm run db:seed

# Start development server
npm run start
```

Your app will be available at:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001

### Production Mode
```bash
# Build the application
npm run build

# Start production server
npm run start:prod
```

---

## 🤖 Mega Agents

CrapGPT comes with 5 mega agents pre-configured:

### 1. OrchestratorPrime
- **Role**: Master orchestrator and workflow conductor
- **Capabilities**: Delegation, multi-provider routing, resource management
- **Provider**: Hexstrike-AI (fast) + MCPJungle (delegation)

### 2. CodeCrusher  
- **Role**: Extreme programming and infrastructure automation
- **Capabilities**: Code generation, infrastructure automation, tool orchestration
- **Providers**: OpenRouter + Toolhive + OpenOps + Arcade

### 3. MediaMaestro
- **Role**: Multi-modal content generation powerhouse
- **Capabilities**: Image, video, audio generation
- **Providers**: FAL (fast) + ModelsLab (quality)

### 4. DataDestroyer
- **Role**: Extreme data processing and analysis
- **Capabilities**: Data analysis, visualization, statistical computing
- **Providers**: OpenRouter + Arcade (scaling)

### 5. OpsOverlord
- **Role**: Infrastructure and operations domination
- **Capabilities**: Infrastructure management, deployment automation, monitoring
- **Providers**: Hexstrike (real-time) + OpenOps + Arcade

---

## 🧪 Testing the Setup

### Health Check
```bash
# Test orchestration health
curl http://localhost:3001/api/orchestration/health

# Expected response:
{
  "success": true,
  "timestamp": "2024-01-XX...",
  "services": {
    "hexstrike": "healthy",
    "toolhive": "healthy",
    "openops": "healthy",
    "arcade": "healthy",
    "mcpHub": "healthy",
    "openrouter": "healthy",
    "fal": "healthy"
  }
}
```

### Test Mega Agents
```bash
# Test OrchestratorPrime
curl -X POST http://localhost:3001/api/agents/run-mega \
  -H "Content-Type: application/json" \
  -d '{"agentName": "OrchestratorPrime", "input": "Analyze system status", "orchestrationMode": true}'

# Test CodeCrusher
curl -X POST http://localhost:3001/api/agents/run-mega \
  -H "Content-Type: application/json" \
  -d '{"agentName": "CodeCrusher", "input": "Write a Python function to sort a list", "orchestrationMode": true}'

# Test MediaMaestro
curl -X POST http://localhost:3001/api/agents/run-mega \
  -H "Content-Type: application/json" \
  -d '{"agentName": "MediaMaestro", "input": "Generate an image of a cyberpunk city", "orchestrationMode": true}'
```

---

## 🛠️ Advanced Configuration

### Custom Tool Registration
Add your own tools to Toolhive:

```javascript
// In src/orchestration/customTools.js
export const customTools = [
  {
    name: 'myCustomTool',
    description: 'Does something awesome',
    parameters: {
      input: { type: 'string', required: true }
    },
    execute: async (params) => {
      // Your tool logic here
      return { result: 'Tool executed successfully' }
    }
  }
]
```

### Custom Workflows
Create OpenOps workflows:

```yaml
# workflows/data-processing.yml
name: Data Processing Pipeline
triggers:
  - api
steps:
  - name: fetch-data
    action: http-request
    params:
      url: "{{ inputs.dataSource }}"
  - name: process-data
    action: arcade-compute
    params:
      script: "python process.py"
  - name: store-results
    action: database-insert
    params:
      table: results
```

### Infrastructure Templates
Create Arcade deployment templates:

```yaml
# templates/ai-compute.yml
name: AI Compute Cluster
resources:
  - type: compute-instance
    count: "{{ inputs.instances || 3 }}"
    specs:
      cpu: "{{ inputs.cpu || 4 }}"
      memory: "{{ inputs.memory || 16 }}GB"
      gpu: "{{ inputs.gpu || 'T4' }}"
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -h localhost -U crapgpt_user -d crapgpt_db

# Reset database
npm run db:reset
```

#### 2. API Key Issues
- Double-check all API keys are valid
- Ensure no trailing spaces in .env file
- Check API rate limits and quotas

#### 3. Orchestration Services Not Responding
```bash
# Check service status
curl http://localhost:8080/health  # Hexstrike
curl https://api.toolhive.com/health  # Toolhive
curl https://api.openops.cloud/health  # OpenOps
```

#### 4. Agent Delegation Failing
- Check MCPJungle hub configuration
- Verify agent capabilities are properly set
- Check delegation depth limits

### Debugging Mode
Enable debug logging:

```env
LOG_LEVEL=debug
NODE_ENV=development
```

View logs:
```bash
# Application logs
tail -f logs/crapgpt.log

# Orchestration logs
tail -f logs/orchestration.log
```

---

## 🔒 Security Considerations

### Production Security
1. **Environment Variables**: Never commit `.env` to version control
2. **API Keys**: Rotate keys regularly, use environment-specific keys
3. **Database**: Use strong passwords, enable SSL
4. **CORS**: Configure proper CORS origins
5. **Rate Limiting**: Enable API rate limiting
6. **Monitoring**: Set up error tracking and monitoring

### Recommended Security Settings
```env
# Security
JWT_SECRET=your-super-secure-32-char-key-here
ENCRYPTION_KEY=another-32-char-encryption-key
CORS_ORIGIN=https://yourdomain.com
API_SECURITY_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=900000
```

---

## 📈 Scaling & Performance

### Horizontal Scaling
- Use Redis for session storage
- Deploy multiple server instances
- Use load balancer (nginx, HAProxy)
- Scale database with read replicas

### Optimization Settings
```env
# Performance
MAX_CONCURRENT_AGENTS=50
ORCHESTRATION_CACHE_TTL=300
API_TIMEOUT=30000
MEMORY_LIMIT=4GB
```

### Monitoring
Set up monitoring for:
- API response times
- Agent execution times
- Orchestration service health
- Database performance
- Memory/CPU usage

---

## 🚀 Deployment

### Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "run", "start:prod"]
```

### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'
services:
  crapgpt:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis
      
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: crapgpt_db
      POSTGRES_USER: crapgpt_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      
  redis:
    image: redis:7-alpine
    
volumes:
  postgres_data:
```

### Deploy to Cloud
```bash
# Build and deploy
docker build -t crapgpt .
docker push your-registry/crapgpt:latest

# Kubernetes deployment
kubectl apply -f k8s/
```

---

## 🎉 You're Ready!

Your CrapGPT Mega AI Orchestration Hub is now ready to dominate! 

### What You Can Do:
- ✅ Multi-provider AI inference
- ✅ Low-latency responses via Hexstrike
- ✅ Tool orchestration via Toolhive  
- ✅ Workflow automation via OpenOps
- ✅ Infrastructure scaling via Arcade
- ✅ Agent delegation via MCPJungle
- ✅ Real-time chat with mega agents
- ✅ Media generation (images, video, audio)
- ✅ Code execution and deployment
- ✅ Data analysis and visualization

### Next Steps:
1. Customize your agents in `agents.md`
2. Add custom tools and workflows
3. Configure monitoring and analytics
4. Scale horizontally as needed
5. **Dominate the AI landscape** 🔥

---

**Need help?** Check the [troubleshooting](#troubleshooting) section or open an issue on GitHub.

**Ready to deploy?** See the [deployment](#deployment) section for cloud deployment options.

**🚀 Welcome to the future of AI orchestration with CrapGPT!**