# GPT Clone - Wasp.dev Project

A modern GPT clone built with Wasp.dev, featuring multiple AI agents, social authentication, and Apple-inspired design.

## Features

- 🤖 **Multiple AI Agents**: Pre-configured agents for different use cases (Assistant, Creative Writer, Code Assistant, Data Analyst)
- 🔐 **Social Authentication**: Google and GitHub login support
- 💬 **Real-time Chat**: Streaming responses from AI providers
- 🎨 **Apple-inspired Design**: Clean, modern UI with Tailwind CSS and shadcn/ui
- 🔄 **Modular Provider System**: Support for OpenRouter, FAL, and ModelsLab
- 💾 **Persistent Storage**: PostgreSQL database for conversations and messages
- 📱 **Responsive Design**: Works on desktop and mobile

## Tech Stack

- **Framework**: [Wasp.dev](https://wasp-lang.dev/) - Full-stack React/Node.js framework
- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: Wasp Auth (Google, GitHub)
- **AI Providers**: OpenRouter, FAL, ModelsLab

## Project Structure

```
gpt-clone-wasp/
├── main.wasp              # Wasp configuration
├── src/
│   ├── MainPage.tsx       # Main chat interface
│   ├── LoginPage.tsx      # Authentication page
│   ├── queries.js         # Database queries
│   ├── actions.js         # Server actions
│   ├── seed.ts            # Database seed data
│   ├── components/        # React components
│   ├── providers/         # AI provider abstractions
│   └── lib/               # Utility functions
├── agents.md              # Agent definitions and documentation
├── package.json           # Dependencies
└── README.md             # This file
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- API keys for AI providers (optional but recommended)

### Installation

1. **Install Wasp CLI** (if not already installed):
   ```bash
   curl -sSL https://get.wasp-lang.dev/installer.sh | sh
   ```

2. **Clone and setup**:
   ```bash
   cd gpt-clone-wasp
   wasp db migrate-dev
   wasp db seed
   ```

3. **Environment Setup**:
   Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```

4. **Start the development server**:
   ```bash
   wasp start
   ```

The app will be available at `http://localhost:3000`.

## Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/gpt_clone_db

# Authentication
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id  
GITHUB_CLIENT_SECRET=your_github_client_secret

# AI Providers
OPENROUTER_API_KEY=your_openrouter_api_key
FAL_API_KEY=your_fal_api_key
MODELSLAB_API_KEY=your_modelslab_api_key

# Application
JWT_SECRET=your_jwt_secret_key
WASP_WEB_CLIENT_URL=http://localhost:3000
WASP_SERVER_URL=http://localhost:3001
```

## AI Providers Setup

### OpenRouter (Recommended for Chat)
1. Sign up at [OpenRouter](https://openrouter.ai/)
2. Get your API key
3. Add to `.env` as `OPENROUTER_API_KEY`

### FAL (For Image Generation)
1. Sign up at [FAL](https://fal.ai/)
2. Get your API key
3. Add to `.env` as `FAL_API_KEY`

### ModelsLab (Alternative Image Generation)
1. Sign up at [ModelsLab](https://modelslab.com/)
2. Get your API key
3. Add to `.env` as `MODELSLAB_API_KEY`

## Agent System

The project includes a flexible agent system defined in `agents.md`. Each agent has:

- **Personality**: System prompt defining behavior
- **Tools**: Available functions (search, calculator, etc.)
- **Model**: Preferred LLM model
- **Provider**: AI service (OpenRouter, FAL, etc.)

### Default Agents

1. **Assistant**: General-purpose helpful AI
2. **Creative Writer**: Specialized in storytelling and creative writing
3. **Code Assistant**: Expert programmer and software architect
4. **Data Analyst**: Specialized in data analysis and visualization

### Adding Custom Agents

1. Define the agent in `agents.md`
2. Add to database via seed file or admin interface
3. Implement any new tools in the provider system

## Database Schema

The project uses these main entities:

- **User**: Authentication and user data
- **Conversation**: Chat sessions
- **Message**: Individual chat messages
- **Agent**: AI agent configurations

## Development

### Available Scripts

```bash
wasp start          # Start development server
wasp db migrate-dev # Run database migrations
wasp db seed        # Seed database with sample data
wasp build          # Build for production
wasp test           # Run tests
```

### Code Structure

- **Frontend**: React components with TypeScript
- **Backend**: Node.js with Prisma ORM
- **Styling**: Tailwind CSS with custom design tokens
- **State**: React Query for server state, React hooks for local state

## Production Deployment

1. **Build the project**:
   ```bash
   wasp build
   ```

2. **Deploy database**:
   - Set up PostgreSQL instance
   - Run migrations: `wasp db deploy`

3. **Deploy application**:
   - Configure environment variables
   - Deploy to your preferred platform (Railway, Fly.io, etc.)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Architecture Decisions

### Why Wasp.dev?
- **Full-stack simplicity**: One config file defines the entire app
- **Built-in auth**: Social login out of the box
- **Type safety**: Generated TypeScript types
- **Modern stack**: React + Node.js + Prisma

### Design Philosophy
- **Apple-inspired**: Clean, minimal, functional design
- **Component-first**: Reusable shadcn/ui components
- **Mobile-first**: Responsive design from the start
- **Performance**: Optimized for speed and user experience

## License

MIT License - see LICENSE file for details.

## Support

For questions and support:
1. Check the [Wasp.dev documentation](https://wasp-lang.dev/docs)
2. Review the `agents.md` file for agent system details
3. Open an issue on this repository

---

Built with ❤️ using [Wasp.dev](https://wasp-lang.dev/)