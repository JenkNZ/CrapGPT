// src/server/supabaseConfig.js
// Simplified Supabase integration for CrapGPT

import { createClient } from '@supabase/supabase-js'

// User client with RLS - respects row level security
export const supabaseUser = (accessToken) =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
    },
    auth: { persistSession: false, autoRefreshToken: false }
  })

// Service client - bypasses RLS for server operations
export const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

// ============================================================================
// CONNECTION HELPERS
// ============================================================================

export async function getUserConnections(userId, accessToken) {
  const sb = supabaseUser(accessToken)
  const { data, error } = await sb
    .from('crapgpt_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function createConnection(userId, type, name, scope, config, accessToken) {
  const sb = supabaseUser(accessToken)
  const { data, error } = await sb
    .from('crapgpt_connections')
    .insert({
      user_id: userId,
      type,
      name,
      scope,
      config,
      active: true
    })
    .select('*')
    .single()
  
  if (error) throw error
  return data
}

export async function updateConnection(connectionId, updates, accessToken) {
  const sb = supabaseUser(accessToken)
  const { data, error } = await sb
    .from('crapgpt_connections')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', connectionId)
    .select('*')
    .single()
  
  if (error) throw error
  return data
}

export async function deleteConnection(connectionId, accessToken) {
  const sb = supabaseUser(accessToken)
  const { data, error } = await sb
    .from('crapgpt_connections')
    .update({ active: false })
    .eq('id', connectionId)
    .select('*')
    .single()
  
  if (error) throw error
  return data
}

// ============================================================================
// JOB QUEUE HELPERS
// ============================================================================

export async function createJob(userId, agent, payload, accessToken, connectionId = null, priority = 'normal') {
  const sb = supabaseUser(accessToken)
  const { data, error } = await sb
    .from('crapgpt_jobs')
    .insert({
      user_id: userId,
      agent,
      connection_id: connectionId,
      status: 'pending',
      meta: JSON.stringify(payload),
      priority
    })
    .select('*')
    .single()
  
  if (error) throw error
  return data
}

export async function updateJobStatus(jobId, status, result = null, meta = null) {
  // Use service client for job updates (workers may not have user token)
  const sb = supabaseService
  const updates = { 
    status,
    updated_at: new Date().toISOString()
  }
  
  if (result) updates.result = JSON.stringify(result)
  if (meta) updates.meta = JSON.stringify(meta)
  
  const { data, error } = await sb
    .from('crapgpt_jobs')
    .update(updates)
    .eq('id', jobId)
    .select('*')
    .single()
  
  if (error) throw error
  return data
}

export async function getUserJobs(userId, accessToken, limit = 50) {
  const sb = supabaseUser(accessToken)
  const { data, error } = await sb
    .from('crapgpt_jobs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data
}

// ============================================================================
// CHAT/SESSION HELPERS
// ============================================================================

export async function createSession(userId, title, accessToken) {
  const sb = supabaseUser(accessToken)
  const { data, error } = await sb
    .from('crapgpt_sessions')
    .insert({
      user_id: userId,
      title
    })
    .select('*')
    .single()
  
  if (error) throw error
  return data
}

export async function getUserSessions(userId, accessToken) {
  const sb = supabaseUser(accessToken)
  const { data, error } = await sb
    .from('crapgpt_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function addMessage(sessionId, userId, role, content, metadata, accessToken) {
  const sb = supabaseUser(accessToken)
  const { data, error } = await sb
    .from('crapgpt_messages')
    .insert({
      session_id: sessionId,
      user_id: userId,
      role,
      content,
      metadata: metadata ? JSON.stringify(metadata) : null
    })
    .select('*')
    .single()
  
  if (error) throw error
  return data
}

export async function getSessionMessages(sessionId, accessToken) {
  const sb = supabaseUser(accessToken)
  const { data, error } = await sb
    .from('crapgpt_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
  
  if (error) throw error
  return data
}

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

export function subscribeJob(jobId, callback) {
  const sb = supabaseService // Service client for subscriptions
  return sb
    .channel(`public:crapgpt_jobs:id=eq.${jobId}`)
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'crapgpt_jobs', 
      filter: `id=eq.${jobId}` 
    }, (payload) => {
      callback(payload.new || payload.old)
    })
    .subscribe()
}

export function subscribeUserJobs(userId, callback) {
  const sb = supabaseService
  return sb
    .channel(`public:crapgpt_jobs:user_id=eq.${userId}`)
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'crapgpt_jobs', 
      filter: `user_id=eq.${userId}` 
    }, (payload) => {
      callback(payload.new || payload.old)
    })
    .subscribe()
}

export function subscribeSessionMessages(sessionId, callback) {
  const sb = supabaseService
  return sb
    .channel(`public:crapgpt_messages:session_id=eq.${sessionId}`)
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'crapgpt_messages', 
      filter: `session_id=eq.${sessionId}` 
    }, (payload) => {
      callback(payload.new || payload.old)
    })
    .subscribe()
}

// ============================================================================
// UTILITIES
// ============================================================================

export async function healthCheck() {
  try {
    const { data, error } = await supabaseService
      .from('crapgpt_connections')
      .select('count')
      .limit(1)
    
    if (error) throw error
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      connected: true
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      connected: false
    }
  }
}

export default {
  supabaseUser,
  supabaseService,
  getUserConnections,
  createConnection,
  updateConnection,
  deleteConnection,
  createJob,
  updateJobStatus,
  getUserJobs,
  createSession,
  getUserSessions,
  addMessage,
  getSessionMessages,
  subscribeJob,
  subscribeUserJobs,
  subscribeSessionMessages,
  healthCheck
}