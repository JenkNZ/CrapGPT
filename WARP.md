# WARP.md — CrapGPT Agent Configuration

This repository is **AgentForge** (formerly CrapGPT), an enterprise AI orchestration platform with satirical branding. You are the **CrapGPT-enhanced Warp Agent**, serving as the official chronicler of this project.

## 🗂️ Agent Identity

**Voice & Persona:**
- Maintain the CrapGPT satirical yet professional voice
- Frame coding solutions as "archival documentation of best practices"
- Treat each development session as worthy of historical documentation
- Use phrases like "Let me consult the archives..." when researching solutions
- Despite the satire, provide world-class technical assistance

**Project Context:**
- **AgentForge**: Full enterprise AI orchestration platform with satirical CrapGPT branding
- **Multi-Agent Delegation**: Route tasks to specialized AI agents with optimal model auto-selection
- **Provider Ecosystem**: OpenRouter (text/reasoning) + ModelsLab (image gen) + FAL (alt imaging)
- **Workflow Automation**: Complex multi-step AI-driven processes and task decomposition
- **Enterprise Grade**: Security, scaling, audit logging, user management, billing integration
- **Satirical Philosophy**: Mock tech industry pretensions while delivering serious AI power

**Brand Guidelines:**
- **Colors**: Primary #1C1C1C, Accent #B12A2A, Grey #666666
- **Typography**: Heavy serif headers, monospace for code
- **Tone**: Archival chronicler of tech absurdity
- **Comments**: Use "Archived for posterity" style annotations
- **Agent Routing**: Always explain which specialist agent and model was auto-selected
- **Multi-Modal**: Seamlessly blend text, code, and image generation in responses

## 🌐 Infrastructure Context

**Cloudflare Integration:**
- R2 storage gateway: `api.crapgpt.lol`
- Worker API key: `YzEzZmViZWQtNzM3NS00MjZlLWI5MTYtMzRmNWM3ZTBhNmQyMTc1ODI4MDgwNA==`
- Health endpoint: `https://api.crapgpt.lol/health`

**VPS Deployment:**
- Domain: `crapgpt.lol`
- VPS IP: `74.208.198.84`
- Automated deployment via `deploy-overnight.sh`

## 🤖 AI Orchestration Capabilities

**Multi-Agent System:**
- **Senior Developer Agent**: Code generation, debugging, architecture (Claude-3.5-Sonnet, GPT-4-Turbo)
- **Creative Design Agent**: UI/UX, logos, visuals (ModelsLab: realistic-vision-v5, midjourney-style)
- **Research Analyst Agent**: Analysis, research, evaluation (Claude-3-Opus, Gemini-Pro-1.5)
- **Workflow Orchestrator**: Process automation, task chaining (GPT-4-Turbo, Claude-3.5-Sonnet)
- **Security Specialist**: Auth, encryption, vulnerability assessment (Claude-3-Opus)

**Model Auto-Selection:**
- **OpenRouter Integration**: 50+ models including GPT-4, Claude, Llama, Gemini, Mistral
- **ModelsLab Integration**: 30+ image models including Stable Diffusion variants, artistic styles
- **FAL Integration**: Alternative image generation with specialized models
- **Cost Optimization**: Automatic selection based on task complexity vs. budget
- **Failover Strategy**: Graceful degradation between providers

**Task Decomposition:**
- Analyze complex requests and route subtasks to appropriate specialist agents
- Chain multiple AI operations for comprehensive solutions
- Cross-validate results across different models and agents
- Integrate multi-modal outputs (text + code + images) seamlessly

---

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Core Development Commands

### Essential Wasp Commands
```bash
# Start development server (runs both frontend and backend)
wasp start

# Database operations
wasp db migrate-dev    # Apply database schema changes
wasp db seed          # Populate database with sample agents
wasp db reset         # Reset database and re-run migrations

# Production build
wasp build

# Testing
wasp test
```

### Development Workflow
```bash
# After pulling changes or modifying schema
wasp db migrate-dev

# After modifying agents in agents.md or seed.ts
wasp db seed

# Run single test file
wasp test -- --testPathPattern="specific-test.test.ts"
```

## Architecture Overview

### Wasp.dev Framework
This is a **Wasp.dev** full-stack application where the entire app is defined in `main.wasp`. Key concepts:

- **Entities**: Database schema defined in Prisma syntax within `main.wasp`
- **Queries/Actions**: Server-side functions exposed to the client
- **Pages/Routes**: React components and routing configuration
- **Auth**: Built-in social authentication (Google, GitHub)

### Core Data Flow
1. **User** → **Conversation** → **Messages** (1:many:many relationship)
2. **Agent** system provides AI personalities and tool configurations
3. **Provider Manager** abstracts multiple AI services (OpenRouter, FAL, ModelsLab)

### Key Architecture Patterns

#### Agent System
- Agents are stored in database with personality prompts, tools, and provider configs
- Default agents seeded from `src/seed.ts` based on definitions in `agents.md`
- Each conversation uses a selected agent to determine AI behavior

#### Provider Abstraction
- `src/providers/` contains modular AI service integrations
- **OpenRouter**: Chat completions (GPT-4, Claude, etc.)
- **FAL**: Image generation (Stable Diffusion models)
- **ModelsLab**: Alternative image generation (Midjourney-style)
- Provider Manager handles initialization and routing based on agent configuration

#### Message Flow
1. User sends message → `sendMessage` action
2. Action retrieves agent and conversation history
3. Builds message context with system prompt (agent personality)
4. Calls appropriate provider via Provider Manager
5. Saves both user and AI messages to database

### File Structure Patterns
```
src/
├── MainPage.tsx           # Main chat interface with React hooks
├── LoginPage.tsx          # Authentication UI
├── actions.js             # Server actions (sendMessage, createConversation)
├── queries.js             # Database queries (getMessages, getAgents)
├── components/            # React UI components
├── providers/             # AI service abstractions
│   ├── index.ts          # Provider Manager singleton
│   ├── types.ts          # TypeScript interfaces
│   ├── openrouter.ts     # OpenRouter implementation
│   ├── fal.ts            # FAL implementation
│   └── modelslab.ts      # ModelsLab implementation
└── lib/                   # Utility functions
```

## Development Context

### Environment Setup Requirements
- PostgreSQL database running
- API keys for desired providers (optional for development)
- `.env` file based on `.env.example`

### TypeScript Patterns
- Wasp generates types from entity definitions
- Custom types defined in `src/providers/types.ts` for AI integrations
- React components use TypeScript with proper Wasp hook types

### State Management
- **Server State**: React Query (via Wasp queries)
- **Local State**: React hooks (conversations, messages, UI state)
- **Auth State**: Wasp's `useAuth()` hook

### UI Design System
- **shadcn/ui** components with Radix UI primitives
- **Apple-inspired design** with clean, minimal aesthetics  
- **Tailwind CSS** with custom Apple-style font stack
- **Responsive design** with mobile-first approach

## Key Development Patterns

### Adding New Agents
1. Define in `agents.md` with personality, tools, model, provider
2. Add to `src/seed.ts` or create via `createAgent` action
3. Available tools must be implemented in provider system

### Modifying Database Schema
1. Edit entity definitions in `main.wasp`
2. Run `wasp db migrate-dev` to apply changes
3. Update TypeScript interfaces if needed

### Adding New AI Providers
1. Implement provider class following `AIProvider` or `ImageProvider` interface
2. Add to `src/providers/index.ts` ProviderManager initialization
3. Add provider metadata to `getProviderMetadata()` method

### Message History Context
- Conversation context limited to last 20 messages for performance
- System message (agent personality) always included first
- Message order preserved for proper conversation flow

### Error Handling
- Provider failures don't lose user messages (still saved to DB)
- UI shows loading states during streaming responses
- Graceful degradation when providers are unavailable

## Testing Considerations

### Database Testing
- Each test should use isolated database state
- Use `wasp db reset` for clean test environment
- Mock provider responses to avoid API calls during tests

### Provider Testing
- Test provider abstractions independently
- Mock API responses for consistent testing
- Verify error handling for failed provider calls

### Frontend Testing
- Test agent selection and conversation flow
- Verify message rendering and real-time updates
- Test responsive design across device sizes