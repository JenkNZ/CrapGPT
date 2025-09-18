-- CrapGPT Supabase Schema
-- Mirrors Wasp entities for seamless integration
-- Includes RLS (Row Level Security) for multi-tenant isolation

-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- USERS & AUTH (handled by Supabase Auth, but we need profiles)
-- ============================================================================

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  avatar text,
  preferences jsonb default '{}',
  is_email_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for user profiles
alter table public.user_profiles enable row level security;
create policy "Users can view own profile" on public.user_profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.user_profiles
  for update using (auth.uid() = id);

-- ============================================================================
-- AGENTS & CONVERSATIONS
-- ============================================================================

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  personality text not null,
  personality_traits text[] default '{}',
  default_provider text default 'openrouter',
  default_model text default 'openai/gpt-4o',
  memory_settings jsonb default '{"shortTermLimit": 10, "longTermLimit": 100, "contextWindow": 8000}',
  tool_access jsonb default '{}',
  tools text[] default '{}',
  capabilities jsonb default '{}',
  is_active boolean default true,
  can_delegate boolean default false,
  connection_requirements jsonb default '{}', -- Required/optional connections
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Public agents - no RLS needed, all users can see
create policy "Anyone can view active agents" on public.agents
  for select using (is_active = true);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  title text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.conversations enable row level security;
create policy "Users can manage own conversations" on public.conversations
  for all using (auth.uid() = user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;
create policy "Users can manage messages in own conversations" on public.messages
  for all using (
    conversation_id in (
      select id from public.conversations where user_id = auth.uid()
    )
  );

-- ============================================================================
-- CHAT SESSIONS (enhanced chat system)
-- ============================================================================

create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  title text default 'New Chat',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.chat_sessions enable row level security;
create policy "Users can manage own chat sessions" on public.chat_sessions
  for all using (auth.uid() = user_id);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  agent_id uuid references public.agents(id),
  role text not null check (role in ('user', 'agent', 'system')),
  content text not null,
  images text[] default '{}',
  is_streaming boolean default false,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.chat_messages enable row level security;
create policy "Users can manage messages in own sessions" on public.chat_messages
  for all using (
    session_id in (
      select id from public.chat_sessions where user_id = auth.uid()
    )
  );

-- ============================================================================
-- CONNECTIONS SYSTEM
-- ============================================================================

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  type text not null, -- "openops", "arcade", "hexstrike", etc.
  name text not null,
  description text,
  config text not null, -- encrypted JSON string
  scopes text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'failed', 'revoked', 'testing')),
  is_active boolean default true,
  is_deleted boolean default false,
  last_used timestamptz,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.connections enable row level security;
create policy "Users can manage own connections" on public.connections
  for all using (auth.uid() = user_id);

-- Connection audit logs
create table public.connection_logs (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid references public.connections(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  action text not null,
  context jsonb default '{}',
  ip_address inet,
  user_agent text,
  success boolean not null,
  error text,
  created_at timestamptz default now()
);

alter table public.connection_logs enable row level security;
create policy "Users can view own connection logs" on public.connection_logs
  for select using (auth.uid() = user_id);

-- Agent-Connection linking
create table public.agent_connections (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  connection_id uuid not null references public.connections(id) on delete cascade,
  permissions text[] default '{}',
  is_required boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(agent_id, connection_id)
);

alter table public.agent_connections enable row level security;
create policy "Users can manage agent connections for own connections" on public.agent_connections
  for all using (
    connection_id in (
      select id from public.connections where user_id = auth.uid()
    )
  );

-- ============================================================================
-- AGENT MEMORY SYSTEM
-- ============================================================================

create table public.agent_memories (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  input text not null,
  output text not null,
  context jsonb,
  structured_data jsonb,
  memory_type text not null default 'short_term' check (memory_type in ('short_term', 'long_term', 'structured', 'task', 'episodic')),
  importance integer default 1 check (importance >= 0 and importance <= 10),
  tags text[] default '{}',
  related_task_id uuid,
  created_at timestamptz default now()
);

alter table public.agent_memories enable row level security;
create policy "Users can manage memories for own sessions" on public.agent_memories
  for all using (auth.uid() = user_id);

-- Index for efficient memory retrieval
create index agent_memories_agent_user_type_idx on public.agent_memories(agent_id, user_id, memory_type, importance desc, created_at desc);

-- ============================================================================
-- TASK & JOB ORCHESTRATION
-- ============================================================================

create table public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  delegating_agent_id uuid references public.agents(id),
  executing_agent_id uuid references public.agents(id),
  parent_task_id uuid references public.agent_tasks(id),
  title text not null,
  description text,
  input jsonb,
  output jsonb,
  metadata jsonb default '{}',
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed', 'cancelled')),
  priority integer default 5 check (priority >= 1 and priority <= 10),
  created_at timestamptz default now(),
  completed_at timestamptz
);

alter table public.agent_tasks enable row level security;
create policy "Users can manage own tasks" on public.agent_tasks
  for all using (auth.uid() = user_id);

-- Job queue for remote execution
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  agent_id uuid references public.agents(id),
  connection_id uuid references public.connections(id),
  task_id uuid references public.agent_tasks(id),
  job_type text not null, -- "llm-inference", "infrastructure-deployment", "media-generation"
  input jsonb not null,
  result jsonb,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed', 'cancelled')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  execution_location text, -- "local", "worker", "provider"
  provider text, -- "openrouter", "arcade", "fal", etc.
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz,
  retry_count integer default 0,
  max_retries integer default 3
);

alter table public.jobs enable row level security;
create policy "Users can view own jobs" on public.jobs
  for select using (auth.uid() = user_id);
create policy "System can manage all jobs" on public.jobs
  for all using (current_setting('role') = 'service_role');

-- Index for job queue processing
create index jobs_status_priority_created_idx on public.jobs(status, priority, created_at) where status in ('pending', 'running');

-- ============================================================================
-- TOOL EXECUTION TRACKING
-- ============================================================================

create table public.tool_executions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  agent_id uuid references public.agents(id),
  task_id uuid references public.agent_tasks(id),
  tool_name text not null,
  input jsonb not null,
  output jsonb,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  execution_time_ms integer,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  completed_at timestamptz
);

alter table public.tool_executions enable row level security;
create policy "Users can manage own tool executions" on public.tool_executions
  for all using (auth.uid() = user_id);

-- ============================================================================
-- SECURITY & AUDIT
-- ============================================================================

create table public.connection_audits (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.connections(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  event_type text not null,
  details jsonb default '{}',
  ip_address inet,
  user_agent text,
  timestamp timestamptz default now()
);

alter table public.connection_audits enable row level security;
create policy "Users can view own connection audits" on public.connection_audits
  for select using (auth.uid() = user_id);

-- Security events table
create table public.security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.user_profiles(id) on delete cascade,
  connection_id uuid references public.connections(id) on delete cascade,
  event_type text not null,
  details jsonb not null default '{}',
  severity text not null default 'info' check (severity in ('info', 'warning', 'error', 'critical')),
  ip_address inet,
  user_agent text,
  timestamp timestamptz default now()
);

-- Security events are system-managed
alter table public.security_events enable row level security;
create policy "Users can view own security events" on public.security_events
  for select using (auth.uid() = user_id);
create policy "System can manage security events" on public.security_events
  for all using (current_setting('role') = 'service_role');

-- ============================================================================
-- REALTIME SUBSCRIPTIONS (for job updates, chat streaming)
-- ============================================================================

-- Enable realtime for key tables
alter publication supabase_realtime add table public.jobs;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.agent_tasks;
alter publication supabase_realtime add table public.tool_executions;

-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- Update updated_at timestamp automatically
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply to all tables with updated_at
create trigger update_user_profiles_updated_at before update on public.user_profiles for each row execute function update_updated_at_column();
create trigger update_agents_updated_at before update on public.agents for each row execute function update_updated_at_column();
create trigger update_conversations_updated_at before update on public.conversations for each row execute function update_updated_at_column();
create trigger update_chat_sessions_updated_at before update on public.chat_sessions for each row execute function update_updated_at_column();
create trigger update_chat_messages_updated_at before update on public.chat_messages for each row execute function update_updated_at_column();
create trigger update_connections_updated_at before update on public.connections for each row execute function update_updated_at_column();
create trigger update_agent_connections_updated_at before update on public.agent_connections for each row execute function update_updated_at_column();

-- Function to notify job status changes via realtime
create or replace function notify_job_status_change()
returns trigger as $$
begin
  -- Notify via realtime channel
  perform pg_notify('job_status_change', 
    json_build_object(
      'job_id', new.id,
      'user_id', new.user_id,
      'status', new.status,
      'updated_at', new.completed_at
    )::text
  );
  return new;
end;
$$ language plpgsql;

create trigger job_status_change_trigger
  after update of status on public.jobs
  for each row execute function notify_job_status_change();

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User-based lookups
create index connections_user_id_active_idx on public.connections(user_id, is_active, is_deleted) where is_deleted = false;
create index chat_sessions_user_id_updated_idx on public.chat_sessions(user_id, updated_at desc);
create index agent_tasks_user_id_status_idx on public.agent_tasks(user_id, status, created_at desc);

-- Agent memory efficient retrieval
create index agent_memories_search_idx on public.agent_memories using gin(tags, structured_data);
create index agent_memories_context_idx on public.agent_memories using gin(context);

-- Connection audit trail
create index connection_logs_connection_created_idx on public.connection_logs(connection_id, created_at desc);
create index security_events_timestamp_severity_idx on public.security_events(timestamp desc, severity);

-- Tool execution tracking
create index tool_executions_agent_user_idx on public.tool_executions(agent_id, user_id, created_at desc);

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert default agents
insert into public.agents (name, description, personality, personality_traits, capabilities) values
('Assistant', 'General-purpose AI assistant', 'You are a helpful and knowledgeable assistant. Provide accurate, concise, and helpful responses.', 
 array['helpful', 'knowledgeable', 'concise'], '{"text_generation": true}'),
('Creative Writer', 'Creative writing specialist', 'You are a creative writing assistant. Help users with storytelling, poetry, and creative content.', 
 array['creative', 'imaginative', 'expressive'], '{"text_generation": true, "creative_writing": true}'),
('Code Expert', 'Programming and development specialist', 'You are an expert programmer. Help with coding, debugging, and software architecture.', 
 array['technical', 'analytical', 'detail-oriented'], '{"code_generation": true, "debugging": true}'),
('Researcher', 'Research and analysis specialist', 'You are a research assistant. Help with information gathering, analysis, and fact-checking.', 
 array['analytical', 'thorough', 'objective'], '{"research": true, "analysis": true}'),
('OrchestratorPrime', 'Task delegation and coordination', 'You are the master coordinator. Delegate tasks and orchestrate complex workflows.', 
 array['leadership', 'strategic', 'efficient'], '{"delegation": true, "orchestration": true}'),
('MediaMaestro', 'Image and media generation', 'You are a creative media specialist. Generate images, videos, and visual content.', 
 array['creative', 'visual', 'artistic'], '{"image_generation": true, "media_generation": true}'),
('CodeCrusher', 'Infrastructure and deployment', 'You are a DevOps specialist. Handle infrastructure, deployments, and system automation.', 
 array['technical', 'systematic', 'reliable'], '{"infrastructure_automation": true, "deployment": true}'),
('HexStrike AI', 'Penetration testing and security', 'You are a cybersecurity expert. Perform security analysis and penetration testing.', 
 array['security_focused', 'analytical', 'thorough'], '{"security_analysis": true, "penetration_testing": true});

-- ============================================================================
-- FUNCTIONS FOR WASP INTEGRATION
-- ============================================================================

-- Function to get available connection types (for the wizard)
create or replace function get_connection_types()
returns jsonb as $$
begin
  return '[
    {"type": "openops", "name": "OpenOps", "category": "automation"},
    {"type": "arcade", "name": "Arcade", "category": "compute"},
    {"type": "hexstrike", "name": "HexStrike", "category": "security"},
    {"type": "mcpjungle", "name": "MCP Jungle", "category": "ai"},
    {"type": "toolhive", "name": "ToolHive", "category": "tools"},
    {"type": "aws", "name": "AWS", "category": "cloud"},
    {"type": "azure", "name": "Azure", "category": "cloud"},
    {"type": "gcp", "name": "Google Cloud", "category": "cloud"}
  ]'::jsonb;
end;
$$ language plpgsql;