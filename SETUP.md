# GPT Clone Setup Guide

This guide will help you set up and run the GPT Clone application with authentication and multi-agent chat functionality.

## Prerequisites

- **Node.js** (v16 or later)
- **PostgreSQL** (v12 or later)
- **Wasp CLI** (`curl -sSL https://get.wasp-lang.dev/installer.sh | sh`)

## Environment Setup

### 1. Database Setup

1. Install PostgreSQL and create a database:
   ```bash
   createdb gpt_clone_db
   ```

2. Update your `DATABASE_URL` in `.env.server`:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/gpt_clone_db
   ```

### 2. OAuth Configuration

#### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:3001/auth/google/callback` (development)
   - `https://yourdomain.com/auth/google/callback` (production)
7. Copy the Client ID and Client Secret to your `.env.server`:
   ```
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

#### GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: GPT Clone
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3001/auth/github/callback`
4. Copy the Client ID and Client Secret to your `.env.server`:
   ```
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   ```

### 3. AI Provider Configuration

#### OpenRouter (Recommended)

1. Sign up at [OpenRouter](https://openrouter.ai/)
2. Get your API key from the dashboard
3. Add to `.env.server`:
   ```
   OPENROUTER_API_KEY=your_openrouter_api_key
   ```

#### FAL AI (Optional)

1. Sign up at [FAL AI](https://fal.ai/)
2. Get your API key
3. Add to `.env.server`:
   ```
   FAL_API_KEY=your_fal_api_key
   ```

#### ModelsLab (Optional)

1. Sign up at [ModelsLab](https://modelslab.com/)
2. Get your API key
3. Add to `.env.server`:
   ```
   MODELSLAB_API_KEY=your_modelslab_api_key
   ```

### 4. Environment Files

Create the following environment files:

#### `.env.server`
```bash
# Copy from .env.example and fill in your values
cp .env.example .env.server
```

#### `.env.client` (optional)
```bash
# If you need client-side environment variables
REACT_APP_SOMETHING=value
```

## Installation and Running

### 1. Install Dependencies

```bash
wasp install
```

### 2. Database Migration

```bash
wasp db migrate-dev
```

### 3. Seed the Database (Optional)

The application will automatically create default agents on first run. You can also manually seed:

```bash
wasp db seed
```

### 4. Start Development Server

```bash
wasp start
```

This will start:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`

## Default Agents

The application comes with several pre-configured agents:

1. **Assistant** - General-purpose conversational AI
2. **Creative Writer** - Creative writing and storytelling
3. **Code Helper** - Programming assistance
4. **Research Assistant** - Research and analysis tasks

## Features

### Authentication
- Google OAuth login
- GitHub OAuth login
- Guest/demo mode
- User profiles and preferences

### Chat System
- Multi-agent conversations
- Persistent chat history
- Real-time streaming responses
- Image and text support
- Agent memory system

### User Management
- Profile customization
- Avatar support
- Preference settings
- Theme selection

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL format
   - Verify database exists

2. **OAuth Redirect Errors**
   - Check redirect URIs in OAuth apps
   - Ensure ports match (3001 for backend)
   - Verify CLIENT_ID and CLIENT_SECRET

3. **AI Provider Errors**
   - Check API keys are valid
   - Verify provider endpoints are accessible
   - Check rate limits and quotas

### Development Tips

1. **Database Reset**
   ```bash
   wasp db reset
   ```

2. **Clear Build Cache**
   ```bash
   wasp clean
   ```

3. **View Logs**
   - Backend logs: Check terminal running wasp start
   - Frontend logs: Check browser console

## Production Deployment

1. Set production environment variables
2. Update OAuth redirect URIs for your domain
3. Configure PostgreSQL for production
4. Deploy using Wasp's deployment options:
   ```bash
   wasp deploy
   ```

## Support

- Check the [Wasp documentation](https://wasp-lang.dev/docs)
- Review provider API documentation
- Check GitHub issues for common problems

## Security Notes

- Never commit `.env.server` files to version control
- Use strong JWT secrets in production
- Configure proper CORS settings
- Enable HTTPS in production
- Regularly update dependencies