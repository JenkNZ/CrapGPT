-- CrapGPT Simplified Supabase Schema
-- Clean, focused schema for core functionality

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================

create table if not exists crapgpt_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  avatar text,
  preferences text, -- JSON string
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for users
alter table crapgpt_users enable row level security;
create policy "Users can view own profile" on crapgpt_users
  for select using (auth.uid() = id);
create policy "Users can update own profile" on crapgpt_users
  for update using (auth.uid() = id);

-- ============================================================================
-- CONNECTIONS TABLE
-- ============================================================================

create table if not exists crapgpt_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references crapgpt_users(id) on delete cascade,
  type text not null, -- "openops", "arcade", "hexstrike", etc.
  name text not null,
  scope text not null, -- JSON string of scopes/permissions
  config text, -- Encrypted JSON string or vault reference
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for connections
alter table crapgpt_connections enable row level security;
create policy "Users can manage own connections" on crapgpt_connections
  for all using (auth.uid() = user_id);

-- Index for efficient lookups
create index crapgpt_connections_user_active_idx on crapgpt_connections(user_id, active);
create index crapgpt_connections_type_idx on crapgpt_connections(type);

-- ============================================================================
-- JOBS TABLE
-- ============================================================================

create table if not exists crapgpt_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references crapgpt_users(id) on delete cascade,
  agent text not null, -- Agent name/identifier
  connection_id uuid references crapgpt_connections(id) on delete set null,
  priority text not null default 'normal', -- "low", "normal", "high", "urgent"
  status text not null default 'pending', -- "pending", "running", "completed", "failed"
  result text, -- JSON result string
  meta text, -- JSON metadata string
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for jobs
alter table crapgpt_jobs enable row level security;
create policy "Users can manage own jobs" on crapgpt_jobs
  for all using (auth.uid() = user_id);
create policy "Service role can manage all jobs" on crapgpt_jobs
  for all using (current_setting('role') = 'service_role');

-- Indexes for job queue processing
create index crapgpt_jobs_user_status_idx on crapgpt_jobs(user_id, status);
create index crapgpt_jobs_status_priority_created_idx on crapgpt_jobs(status, priority, created_at) 
  where status in ('pending', 'running');
create index crapgpt_jobs_connection_idx on crapgpt_jobs(connection_id);

-- ============================================================================
-- SESSIONS TABLE
-- ============================================================================

create table if not exists crapgpt_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references crapgpt_users(id) on delete cascade,
  title text not null,
  created_at timestamptz default now()
);

-- RLS for sessions
alter table crapgpt_sessions enable row level security;
create policy "Users can manage own sessions" on crapgpt_sessions
  for all using (auth.uid() = user_id);

-- Index for efficient lookups
create index crapgpt_sessions_user_created_idx on crapgpt_sessions(user_id, created_at desc);

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================

create table if not exists crapgpt_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references crapgpt_sessions(id) on delete cascade,
  user_id uuid not null references crapgpt_users(id) on delete cascade,
  role text not null, -- "user", "assistant", "system"
  content text not null,
  metadata text, -- JSON metadata string
  created_at timestamptz default now()
);

-- RLS for messages
alter table crapgpt_messages enable row level security;
create policy "Users can manage messages in own sessions" on crapgpt_messages
  for all using (
    session_id in (
      select id from crapgpt_sessions where user_id = auth.uid()
    )
  );

-- Index for efficient message retrieval
create index crapgpt_messages_session_created_idx on crapgpt_messages(session_id, created_at);
create index crapgpt_messages_user_idx on crapgpt_messages(user_id);

-- ============================================================================
-- REALTIME SETUP
-- ============================================================================

-- Enable realtime for job updates and chat streaming
alter publication supabase_realtime add table crapgpt_jobs;
alter publication supabase_realtime add table crapgpt_messages;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply triggers to tables with updated_at
create trigger update_crapgpt_users_updated_at 
  before update on crapgpt_users 
  for each row execute function update_updated_at_column();

create trigger update_crapgpt_connections_updated_at 
  before update on crapgpt_connections 
  for each row execute function update_updated_at_column();

create trigger update_crapgpt_jobs_updated_at 
  before update on crapgpt_jobs 
  for each row execute function update_updated_at_column();

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to get active connections for a user
create or replace function get_user_active_connections(user_uuid uuid)
returns table(
  id uuid,
  type text,
  name text,
  scope text,
  created_at timestamptz
) as $$
begin
  return query
  select c.id, c.type, c.name, c.scope, c.created_at
  from crapgpt_connections c
  where c.user_id = user_uuid and c.active = true
  order by c.created_at desc;
end;
$$ language plpgsql security definer;

-- Function to get pending jobs (for workers)
create or replace function get_pending_jobs(limit_count integer default 10)
returns table(
  id uuid,
  user_id uuid,
  agent text,
  connection_id uuid,
  priority text,
  meta text,
  created_at timestamptz
) as $$
begin
  return query
  select j.id, j.user_id, j.agent, j.connection_id, j.priority, j.meta, j.created_at
  from crapgpt_jobs j
  where j.status = 'pending'
  order by 
    case j.priority 
      when 'urgent' then 1
      when 'high' then 2
      when 'normal' then 3
      when 'low' then 4
    end,
    j.created_at
  limit limit_count;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- SEED DATA (Optional)
-- ============================================================================

-- Insert a test user for development (remove in production)
-- insert into crapgpt_users (id, email, name) 
-- values ('00000000-0000-0000-0000-000000000001', 'test@example.com', 'Test User')
-- on conflict (id) do nothing;